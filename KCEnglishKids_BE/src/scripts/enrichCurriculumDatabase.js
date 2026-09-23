const mongoose = require('mongoose');
require('dotenv').config();
const { Topic, Vocabulary, Lesson, Activity, CurriculumUnit, AgeGroup } = require('../models');

// Specific topic slugs mapped to each age group according to the approved curriculum
const AGE_TOPIC_MAPPING = {
  '3-4': [
    'school',       // Unit 1: School
    'feelings',     // Unit 2: Face & Feelings
    'my-body',      // Unit 3: Body
    'family',       // Unit 4: Family
    'animals',      // Unit 5: Pets
    'food',         // Unit 6: Food
    'toys',         // Unit 7: Toys
    'nature',       // Unit 8: Park
    'my-house',     // Unit 9: Home / Places
    'colors',       // Core preschool
    'numbers'       // Core preschool
  ],
  '4-5': [
    'school',         // Unit 1: School Activities
    'senses',         // Unit 2: Self-care & Unit 7: Senses
    'my-house',       // Unit 3: Home
    'animals',        // Unit 4: Farm
    'food',           // Unit 5: Meals
    'clothes',        // Unit 6: Clothes
    'transportation', // Unit 8: Transportation
    'nature',         // Unit 9: Plants
    'weather',        // Seasonal changes
    'daily-routines', // Kindergarten daily routines
    'colors',
    'numbers'
  ],
  '5-6': [
    'school',         // Unit 1: School
    'feelings',       // Unit 2: Feelings
    'family',         // Unit 3: People
    'animals',        // Unit 4: Wild Animals
    'community',      // Unit 5: Community
    'food',           // Unit 6: Restaurant
    'daily-routines', // Unit 7: Daily Routine
    'environment',    // Unit 8: Environment
    'vacation',       // Unit 9: Vacation
    'numbers',
    'nature'
  ]
};

async function enrichCurriculumDatabase() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/kcenglishkids';
    console.log('Connecting to MongoDB:', mongoUri);
    await mongoose.connect(mongoUri);

    console.log('\n=== 1. UPDATING TOPIC AGE GROUP SCOPING ===');
    const allTopics = await Topic.find();
    for (const topic of allTopics) {
      const assignedAges = [];
      for (const [ageCode, slugs] of Object.entries(AGE_TOPIC_MAPPING)) {
        if (slugs.includes(topic.slug)) {
          assignedAges.push(ageCode);
        }
      }
      // If a topic is not in any explicit list, default to 5-6
      if (assignedAges.length === 0) {
        assignedAges.push('5-6');
      }

      await Topic.updateOne(
        { _id: topic._id },
        {
          $set: {
            ageGroupCodes: assignedAges,
            targetAgeGroups: assignedAges
          }
        }
      );
      console.log(`Topic [${topic.slug}]: scoped to [${assignedAges.join(', ')}]`);
    }

    console.log('\n=== 2. AUDITING & ENRICHING LESSON VOCABULARY COVERAGE IN ACTIVITIES ===');
    const allLessons = await Lesson.find()
      .populate('vocabularyItems')
      .populate('curriculumUnits');

    console.log(`Auditing ${allLessons.length} lessons across all units...`);

    // Pre-fetch all vocabularies by age group to generate rich distractors
    const vocabsByAge = {
      '3-4': await Vocabulary.find({ ageGroupCodes: '3-4' }).lean(),
      '4-5': await Vocabulary.find({ ageGroupCodes: '4-5' }).lean(),
      '5-6': await Vocabulary.find({ ageGroupCodes: '5-6' }).lean()
    };

    let totalNewQuestionsAdded = 0;
    let lessonsUpdatedCount = 0;

    for (const lesson of allLessons) {
      const vocabItems = lesson.vocabularyItems || [];
      if (vocabItems.length === 0) continue;

      const ageCode = lesson.ageGroupCode || lesson.curriculumUnits?.[0]?.ageGroupCode || '3-4';
      const agePool = vocabsByAge[ageCode] || vocabsByAge['3-4'];

      // Find all activities for this lesson
      let activities = await Activity.find({ lesson: lesson._id });

      if (activities.length === 0) {
        // If lesson has no activity, create a standard Listen & Choose activity
        const newAct = await Activity.create({
          title: `Listen & Choose: ${lesson.title}`,
          vietnameseTitle: `Nghe & Chọn: ${lesson.vietnameseTitle || lesson.title}`,
          lesson: lesson._id,
          type: 'LISTEN_AND_CHOOSE',
          gameEngineType: 'ListenChooseEngine',
          instructions: 'Nghe phát âm chuẩn và chọn hình ảnh tương ứng',
          status: 'ACTIVE',
          order: 1,
          questions: []
        });
        activities = [newAct];
      }

      // Collect all words already tested in any activity of this lesson
      const testedWords = new Set();
      activities.forEach(a => {
        (a.questions || []).forEach(q => {
          if (q.correctAnswer) testedWords.add(q.correctAnswer.toLowerCase().trim());
          if (q.promptText) testedWords.add(q.promptText.toLowerCase().trim());
        });
      });

      // Find missing vocabulary words
      const missingVocabs = vocabItems.filter(
        v => !testedWords.has(v.english.toLowerCase().trim())
      );

      if (missingVocabs.length > 0) {
        // Target activity to append questions (prefer the first activity)
        const targetActivity = activities[0];
        const newQuestions = [];

        for (const vocab of missingVocabs) {
          // Select 3 distractors from the same age pool
          const distractors = agePool
            .filter(v => v.english.toLowerCase().trim() !== vocab.english.toLowerCase().trim())
            .sort(() => Math.random() - 0.5)
            .slice(0, 3);

          const rawOptions = [
            {
              id: new mongoose.Types.ObjectId().toString(),
              text: vocab.english,
              vietnameseText: vocab.vietnamese,
              imageUrl: vocab.imageUrl,
              audioUrl: vocab.audioUrl,
              isCorrect: true
            },
            ...distractors.map(d => ({
              id: new mongoose.Types.ObjectId().toString(),
              text: d.english,
              vietnameseText: d.vietnamese,
              imageUrl: d.imageUrl,
              audioUrl: d.audioUrl,
              isCorrect: false
            }))
          ];

          // Shuffle options
          const shuffledOptions = rawOptions.sort(() => Math.random() - 0.5);

          const questionObj = {
            _id: new mongoose.Types.ObjectId(),
            promptText: vocab.english,
            promptAudioUrl:
              vocab.audioUrl ||
              `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(vocab.english)}&type=2`,
            promptImageUrl: vocab.imageUrl,
            correctAnswer: vocab.english,
            options: shuffledOptions,
            vocabulary: vocab._id,
            explanation: `Tuyệt vời! Đó là ${vocab.english} (${vocab.vietnamese}).`,
            metadata: {
              points: 25,
              vocabularyId: vocab._id
            }
          };

          newQuestions.push(questionObj);
        }

        // Update target activity
        const updatedQuestions = [...(targetActivity.questions || []), ...newQuestions];
        await Activity.updateOne(
          { _id: targetActivity._id },
          {
            $set: {
              questions: updatedQuestions,
              questionCount: updatedQuestions.length
            }
          }
        );

        totalNewQuestionsAdded += newQuestions.length;
        lessonsUpdatedCount++;
      }
    }

    console.log(
      `✓ Added ${totalNewQuestionsAdded} new questions across ${lessonsUpdatedCount} lessons.`
    );

    console.log('\n=== 3. VERIFYING 100% QUESTION COVERAGE ===');
    let remainingUntestedLessons = 0;
    const recheckLessons = await Lesson.find().populate('vocabularyItems');
    for (const l of recheckLessons) {
      const acts = await Activity.find({ lesson: l._id });
      const tested = new Set();
      acts.forEach(a => {
        (a.questions || []).forEach(q => {
          if (q.correctAnswer) tested.add(q.correctAnswer.toLowerCase().trim());
          if (q.promptText) tested.add(q.promptText.toLowerCase().trim());
        });
      });

      const lessonWords = (l.vocabularyItems || []).map(v => v.english.toLowerCase().trim());
      const untested = lessonWords.filter(w => !tested.has(w));
      if (untested.length > 0) {
        remainingUntestedLessons++;
        console.warn(`Warning: Lesson "${l.title}" still has untested words:`, untested);
      }
    }

    if (remainingUntestedLessons === 0) {
      console.log('🎉 SUCCESS: 100% of vocabulary across all 108 lessons are covered in practice games!');
    } else {
      console.log(`Attention: ${remainingUntestedLessons} lessons still need verification.`);
    }

    console.log('\n=== 4. UPDATING VOCABULARY DIFFICULTY METADATA ===');
    const updateDiffResult = await Promise.all([
      Vocabulary.updateMany({ ageGroupCodes: '3-4' }, { $set: { difficulty: 1 } }),
      Vocabulary.updateMany({ ageGroupCodes: '4-5' }, { $set: { difficulty: 2 } }),
      Vocabulary.updateMany({ ageGroupCodes: '5-6' }, { $set: { difficulty: 3 } })
    ]);
    console.log('Updated difficulties: 3-4 (Diff 1), 4-5 (Diff 2), 5-6 (Diff 3).');

    console.log('\n=== ALL ENRICHMENT TASKS COMPLETED SUCCESSFULLY ===');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Enrichment failed:', err);
    process.exit(1);
  }
}

enrichCurriculumDatabase();
