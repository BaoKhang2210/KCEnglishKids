const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const uri = process.env.MONGODB_URI;

async function seedThreePillars() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  // 1. Fetch children
  const children = await db.collection('users').find({ role: 'CHILD' }).toArray();
  console.log(`Found ${children.length} children.`);

  // 2. Fetch all vocabularies
  const allVocabs = await db.collection('vocabularies').find({}).toArray();
  console.log(`Found ${allVocabs.length} vocabularies in database.`);

  // 3. Fetch lessons and topics
  const lessons = await db.collection('lessons').find({}).toArray();
  const topics = await db.collection('topics').find({}).toArray();
  console.log(`Found ${lessons.length} lessons and ${topics.length} topics.`);

  // 4. Ensure we have LISTEN_REPEAT activities
  let repeatActivities = await db.collection('activities').find({ activityType: 'LISTEN_REPEAT' }).toArray();
  if (repeatActivities.length === 0) {
    console.log('Creating LISTEN_REPEAT activities for lessons...');
    const newRepeatActivities = [];
    for (let i = 0; i < Math.min(lessons.length, 12); i++) {
      const les = lessons[i];
      newRepeatActivities.push({
        title: `Phát âm & Luyện nói: ${les.title || 'Bài học'}`,
        activityType: 'LISTEN_REPEAT',
        lesson: les._id,
        difficulty: 1,
        order: 99,
        settings: { timeLimitSec: 120, minStarsToPass: 1 },
        createdAt: new Date(),
        updatedAt: new Date(),
        __v: 0
      });
    }
    const insertRes = await db.collection('activities').insertMany(newRepeatActivities);
    console.log(`Inserted ${insertRes.insertedCount} LISTEN_REPEAT activities.`);
    repeatActivities = await db.collection('activities').find({ activityType: 'LISTEN_REPEAT' }).toArray();
  }

  const chooseActivities = await db.collection('activities').find({ activityType: 'LISTEN_CHOOSE' }).toArray();
  console.log(`Found ${chooseActivities.length} LISTEN_CHOOSE activities.`);

  const now = new Date();

  for (let idx = 0; idx < children.length; idx++) {
    const child = children[idx];
    console.log(`\nProcessing child [${idx + 1}/${children.length}]: ${child.name} (${child.username})...`);

    // Clean existing mastery and activity results to have clean, cohesive 3-pillar data
    await db.collection('vocabularymasteries').deleteMany({ student: child._id });
    await db.collection('activityresults').deleteMany({ child: child._id });
    await db.collection('learningsessions').deleteMany({ child: child._id });
    await db.collection('progresses').deleteMany({ child: child._id });

    // Pick 14-16 distinct vocabularies for this child
    const vocabStart = (idx * 7) % Math.max(1, allVocabs.length - 20);
    const childVocabs = allVocabs.slice(vocabStart, vocabStart + 15);

    // ── PILLAR 1: Vocabulary Mastery ──
    // 9-11 Mastered (level 3), 3-4 Practicing (level 2), 1-2 Needs Review (level 1)
    const masteryDocs = [];
    const weakVocabItems = [];

    childVocabs.forEach((v, vIdx) => {
      let level = 3;
      let wrongCount = 0;
      let correctCount = 5;

      if (vIdx >= 13) {
        level = 1;
        wrongCount = 2;
        correctCount = 1;
        weakVocabItems.push({
          vocabulary: v._id,
          mistakeCount: 2,
          lastMistakeAt: new Date(now.getTime() - 86400000)
        });
      } else if (vIdx >= 10) {
        level = 2;
        wrongCount = 1;
        correctCount = 3;
      }

      masteryDocs.push({
        student: child._id,
        vocabulary: v._id,
        correctCount,
        wrongCount,
        attemptCount: correctCount + wrongCount,
        streak: level === 3 ? 4 : level === 2 ? 2 : 0,
        masteryLevel: level,
        lastReviewedAt: new Date(now.getTime() - (vIdx * 3600000)),
        createdAt: new Date(now.getTime() - 7 * 86400000),
        updatedAt: new Date(now.getTime() - (vIdx * 3600000)),
        __v: 0
      });
    });

    await db.collection('vocabularymasteries').insertMany(masteryDocs);

    // ── Create Learning Sessions & Progress ──
    const childLesson = lessons[idx % lessons.length] || lessons[0];
    const childTopic = topics[0] || null;

    const sessionDoc = {
      child: child._id,
      lesson: childLesson._id,
      startedAt: new Date(now.getTime() - 3600000),
      lastActivityAt: now,
      status: 'COMPLETED',
      totalScore: 95,
      stars: 3,
      createdAt: now,
      updatedAt: now,
      __v: 0
    };
    const sessRes = await db.collection('learningsessions').insertOne(sessionDoc);
    const sessionId = sessRes.insertedId;

    // Progress
    await db.collection('progresses').insertOne({
      child: child._id,
      topic: childTopic ? childTopic._id : childLesson.topic,
      lesson: childLesson._id,
      completed: true,
      stars: 3,
      highestScore: 95,
      attempts: 2,
      stage1Completed: true,
      stage2Completed: true,
      stage2Score: 90,
      stage2Stars: 3,
      stage3Completed: true,
      stage3Stars: 3,
      weakVocabulary: weakVocabItems,
      lastActivityAt: now,
      createdAt: new Date(now.getTime() - 3 * 86400000),
      updatedAt: now,
      __v: 0
    });

    // ── PILLAR 3: Listening & Reaction (LISTEN_CHOOSE Activity Results) ──
    const chooseAct = chooseActivities[idx % chooseActivities.length] || chooseActivities[0];
    const listenAnswers = [];
    const questionCount = 6;
    let correctListening = 0;

    for (let q = 0; q < questionCount; q++) {
      // 85-95% accuracy
      const isCorrect = q !== 3; // 5 correct out of 6
      if (isCorrect) correctListening++;
      const v = childVocabs[q % childVocabs.length];
      listenAnswers.push({
        questionIndex: q + 1,
        promptText: `Listen and choose: ${v.english}`,
        selectedOptionId: String(v._id),
        isCorrect,
        vocabularyId: v._id,
        responseTimeMs: 1300 + Math.floor(Math.random() * 500) // 1.3s - 1.8s
      });
    }

    await db.collection('activityresults').insertOne({
      child: child._id,
      activity: chooseAct._id,
      lesson: childLesson._id,
      session: sessionId,
      score: Math.round((correctListening / questionCount) * 100),
      stars: 3,
      correctCount: correctListening,
      incorrectCount: questionCount - correctListening,
      attempts: 1,
      duration: 54,
      completed: true,
      answers: listenAnswers,
      teacherFeedback: { comment: 'Bé phản xạ nghe rất nhanh và nhạy!', bonusStars: 1, reviewedAt: now },
      createdAt: new Date(now.getTime() - 2 * 3600000),
      updatedAt: now,
      __v: 0
    });

    // Second listen choose activity for more reaction data
    const chooseAct2 = chooseActivities[(idx + 1) % chooseActivities.length] || chooseAct;
    const listenAnswers2 = [];
    let correctListening2 = 0;
    for (let q = 0; q < 5; q++) {
      const isCorrect = true;
      correctListening2++;
      const v = childVocabs[(q + 5) % childVocabs.length];
      listenAnswers2.push({
        questionIndex: q + 1,
        promptText: `Tap picture: ${v.english}`,
        selectedOptionId: String(v._id),
        isCorrect,
        vocabularyId: v._id,
        responseTimeMs: 1200 + Math.floor(Math.random() * 400) // 1.2s - 1.6s
      });
    }

    await db.collection('activityresults').insertOne({
      child: child._id,
      activity: chooseAct2._id,
      lesson: childLesson._id,
      session: sessionId,
      score: 100,
      stars: 3,
      correctCount: correctListening2,
      incorrectCount: 0,
      attempts: 1,
      duration: 48,
      completed: true,
      answers: listenAnswers2,
      teacherFeedback: { comment: 'Xuất sắc!', bonusStars: 0, reviewedAt: now },
      createdAt: new Date(now.getTime() - 3600000),
      updatedAt: now,
      __v: 0
    });

    // ── PILLAR 2: Pronunciation & Speaking (LISTEN_REPEAT Activity Results) ──
    const repeatAct = repeatActivities[idx % repeatActivities.length];
    // Varied pronunciation score per child (86% to 94%)
    const childPronScore = 86 + ((idx * 3) % 11); // 86, 89, 92, 87, 90...
    const pronStars = childPronScore >= 90 ? 3 : 2;

    await db.collection('activityresults').insertOne({
      child: child._id,
      activity: repeatAct._id,
      lesson: childLesson._id,
      session: sessionId,
      score: childPronScore,
      stars: pronStars,
      correctCount: 4,
      incorrectCount: 0,
      attempts: 1,
      duration: 65,
      completed: true,
      answers: [
        { questionIndex: 1, promptText: 'Repeat with Koko', isCorrect: true, responseTimeMs: 1800 },
        { questionIndex: 2, promptText: 'Repeat with Koko', isCorrect: true, responseTimeMs: 1600 },
        { questionIndex: 3, promptText: 'Repeat with Koko', isCorrect: true, responseTimeMs: 2000 },
        { questionIndex: 4, promptText: 'Repeat with Koko', isCorrect: true, responseTimeMs: 1700 }
      ],
      teacherFeedback: { comment: 'Giọng đọc to, rõ, âm đuôi tốt', bonusStars: 1, reviewedAt: now },
      createdAt: new Date(now.getTime() - 1800000),
      updatedAt: now,
      __v: 0
    });

    // Update child stars and learningTime in user record
    const totalChildStars = 95 + ((idx * 17) % 60); // 95 to 155 stars
    await db.collection('users').updateOne(
      { _id: child._id },
      {
        $set: {
          stars: totalChildStars,
          learningTime: 3600 + idx * 300
        }
      }
    );

    console.log(`  ✓ Pillar 1 (Vocab): 15 words (10 Mastered, 3 Practicing, 2 Review)`);
    console.log(`  ✓ Pillar 2 (Speaking): Score ${childPronScore}%, Stars: ${pronStars}`);
    console.log(`  ✓ Pillar 3 (Listening): 11 responses, accuracy ~91%, avg response 1.4s`);
  }

  console.log('\n=============================================');
  console.log('SUCCESS: Seeded 3 Pillars sample data for ALL 21 children!');
  console.log('=============================================');
  process.exit(0);
}

seedThreePillars().catch(err => {
  console.error('Error seeding 3 pillars:', err);
  process.exit(1);
});
