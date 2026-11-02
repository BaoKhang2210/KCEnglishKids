const mongoose = require('../KCEnglishKids_BE/node_modules/mongoose');
const {
  User,
  ClassRoom,
  ClassroomSession,
  CurriculumUnit,
  Lesson,
  Vocabulary,
  VocabularyMastery,
  ParentNotification,
  Attendance,
  Schedule,
  LanguageContent,
  Progress,
  HomePracticePlan
} = require('../KCEnglishKids_BE/src/models');

async function prepareDemoData() {
  await mongoose.connect('mongodb://localhost:27017/kcenglishkids');
  console.log('✅ Connected to MongoDB: mongodb://localhost:27017/kcenglishkids');

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. GET KEY USERS & LESSONS
  // ─────────────────────────────────────────────────────────────────────────────
  const leo = await User.findOne({ username: 'leo' });
  const mia = await User.findOne({ username: 'mia' });
  const toby = await User.findOne({ username: 'toby' });
  const teacherSarah = await User.findOne({ username: 'teacher_sarah' });
  const teacherEmily = await User.findOne({ username: 'teacher_emily' });
  const teacherDavid = await User.findOne({ username: 'teacher_david' });

  if (!leo || !teacherSarah) {
    console.error('❌ Leo or Teacher Sarah not found!');
    process.exit(1);
  }
  console.log(`👤 Found Leo (${leo._id}), Teacher Sarah (${teacherSarah._id})`);

  // Lessons for 3-4 (Book 1 Unit 1)
  const lesson1_34 = await Lesson.findOne({ key: 'B1_U1_L1' }); // Things at School
  const lesson2_34 = await Lesson.findOne({ key: 'B1_U1_L2' }); // People at School
  console.log(`📚 3-4 Lessons: L1="${lesson1_34?.title}" (${lesson1_34?._id}), L2="${lesson2_34?.title}" (${lesson2_34?._id})`);

  // Lessons for 4-5 (Book 2 Unit 1)
  const lesson1_45 = await Lesson.findOne({ ageGroupCode: '4-5', displayOrder: 1 });
  const lesson2_45 = await Lesson.findOne({ ageGroupCode: '4-5', displayOrder: 2 });
  console.log(`📚 4-5 Lessons: L1="${lesson1_45?.title}", L2="${lesson2_45?.title}"`);

  // Lessons for 5-6 (Book 3 Unit 1)
  const lesson1_56 = await Lesson.findOne({ ageGroupCode: '5-6', displayOrder: 1 });
  const lesson2_56 = await Lesson.findOne({ ageGroupCode: '5-6', displayOrder: 2 });
  console.log(`📚 5-6 Lessons: L1="${lesson1_56?.title}", L2="${lesson2_56?.title}"`);

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. UPDATE CLASSROOMS (CURRICULUM ADVANCE: TODAY 03/11 IS LESSON 2)
  // ─────────────────────────────────────────────────────────────────────────────
  const class34 = await ClassRoom.findOne({ ageGroupCode: '3-4' });
  const class45 = await ClassRoom.findOne({ ageGroupCode: '4-5' });
  const class56 = await ClassRoom.findOne({ ageGroupCode: '5-6' });

  if (class34) {
    class34.currentLesson = lesson2_34?._id;
    const completed = new Set((class34.completedLessons || []).map(String));
    if (lesson1_34) completed.add(String(lesson1_34._id));
    if (lesson2_34) completed.delete(String(lesson2_34._id));
    class34.completedLessons = Array.from(completed).map(id => new mongoose.Types.ObjectId(id));
    class34.teacher = teacherSarah._id;
    class34.room = 'Phòng Hoa Hướng Dương';
    await class34.save();
    console.log(`🏫 Updated Class 3-4 (${class34.name}): currentLesson is Lesson 2 (${lesson2_34?.title})`);
  }

  if (class45) {
    class45.currentLesson = lesson2_45?._id;
    const completed = new Set((class45.completedLessons || []).map(String));
    if (lesson1_45) completed.add(String(lesson1_45._id));
    if (lesson2_45) completed.delete(String(lesson2_45._id));
    class45.completedLessons = Array.from(completed).map(id => new mongoose.Types.ObjectId(id));
    if (teacherEmily) class45.teacher = teacherEmily._id;
    class45.room = 'Phòng Cầu Vồng';
    await class45.save();
    console.log(`🏫 Updated Class 4-5 (${class45.name}): currentLesson is Lesson 2 (${lesson2_45?.title})`);
  }

  if (class56) {
    class56.currentLesson = lesson2_56?._id;
    const completed = new Set((class56.completedLessons || []).map(String));
    if (lesson1_56) completed.add(String(lesson1_56._id));
    if (lesson2_56) completed.delete(String(lesson2_56._id));
    class56.completedLessons = Array.from(completed).map(id => new mongoose.Types.ObjectId(id));
    if (teacherDavid) class56.teacher = teacherDavid._id;
    class56.room = 'Phòng Thám Hiểm';
    await class56.save();
    console.log(`🏫 Updated Class 5-6 (${class56.name}): currentLesson is Lesson 2 (${lesson2_56?.title})`);
  }

  // Ensure students are assigned to their classes
  if (leo && class34) {
    leo.assignedClass = class34._id;
    await leo.save();
  }
  if (mia && class45) {
    mia.assignedClass = class45._id;
    await mia.save();
  }
  if (toby && class56) {
    toby.assignedClass = class56._id;
    await toby.save();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. SCHEDULE FOR TUESDAY 03/11/2026
  // ─────────────────────────────────────────────────────────────────────────────
  // Tuesday is dayOfWeek: 2. Ensure weeklySlots include day 2
  if (class34) {
    await Schedule.findOneAndUpdate(
      { classroom: class34._id },
      {
        classroom: class34._id,
        teacher: teacherSarah._id,
        academicYear: '2026-2027',
        colorTag: 'indigo',
        weeklySlots: [
          {
            dayOfWeek: 1, // Thứ 2 (yesterday)
            startTime: '08:30',
            endTime: '09:15',
            subjectNote: 'Unit 1 - Lesson 1: Things at School',
            room: 'Phòng Hoa Hướng Dương'
          },
          {
            dayOfWeek: 2, // Thứ 3 (today)
            startTime: '08:30',
            endTime: '09:15',
            subjectNote: 'Unit 1 - Lesson 2: People at School',
            room: 'Phòng Hoa Hướng Dương'
          },
          {
            dayOfWeek: 4, // Thứ 5
            startTime: '08:30',
            endTime: '09:15',
            subjectNote: 'Unit 1 - Lesson 3: Colors around School',
            room: 'Phòng Hoa Hướng Dương'
          }
        ]
      },
      { upsert: true, returnDocument: 'after' }
    );
    console.log(`📅 Updated Schedule for Class 3-4 (includes Tuesday 08:30 - 09:15)`);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. COMPLETED SESSION ON MONDAY 02/11/2026 (Things at School)
  // ─────────────────────────────────────────────────────────────────────────────
  if (class34 && lesson1_34) {
    const studentsInClass = await User.find({ assignedClass: class34._id, role: 'CHILD' });
    const studentScores = studentsInClass.map(s => ({
      student: s._id,
      attendance: 'PRESENT',
      score: String(s._id) === String(leo._id) ? 100 : 90,
      stars: 3,
      activitiesDone: 3,
      correctCount: 5,
      wrongCount: 0
    }));

    await ClassroomSession.findOneAndUpdate(
      {
        classroom: class34._id,
        lesson: lesson1_34._id,
        status: 'COMPLETED'
      },
      {
        classroom: class34._id,
        lesson: lesson1_34._id,
        teacher: teacherSarah._id,
        title: 'Buổi học: Things at School',
        room: 'Phòng Hoa Hướng Dương',
        status: 'COMPLETED',
        startedAt: new Date('2026-11-02T08:30:00.000Z'),
        endedAt: new Date('2026-11-02T09:15:00.000Z'),
        studentScores
      },
      { upsert: true, returnDocument: 'after' }
    );
    console.log(`✅ Session on 02/11/2026 (Things at School) completed with full attendance!`);

    // Attendance records for 2026-11-02
    await Attendance.findOneAndUpdate(
      {
        classroom: class34._id,
        date: '2026-11-02'
      },
      {
        classroom: class34._id,
        teacher: teacherSarah._id,
        date: '2026-11-02',
        records: studentsInClass.map(s => ({
          student: s._id,
          status: 'PRESENT',
          note: 'Tham gia học tập hăng hái'
        })),
        note: 'Tiết học sôi nổi, các bé ghi nhớ tốt'
      },
      { upsert: true, returnDocument: 'after' }
    );
    console.log(`📋 Attendance recorded for 2026-11-02`);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. FIX LEO'S VOCABULARY MASTERY: ACCURATE 5 WORDS ACCUMULATED FROM LESSON 1
  // ─────────────────────────────────────────────────────────────────────────────
  // 5 core words from Unit 1 Lesson 1: book, crayon, chair, table, school
  const schoolWords = ['book', 'crayon', 'chair', 'table', 'school'];
  const schoolVocabs = await Vocabulary.find({ english: { $in: schoolWords } });
  console.log(`📝 Found ${schoolVocabs.length} school vocabularies for Lesson 1:`, schoolVocabs.map(v => v.english));

  // Clean up any unrelated animal words from Leo's records
  const animalWords = ['bird', 'cat', 'dog', 'fish', 'rabbit'];
  const animalVocabs = await Vocabulary.find({ english: { $in: animalWords } });
  if (animalVocabs.length > 0) {
    const deleted = await VocabularyMastery.deleteMany({
      student: leo._id,
      vocabulary: { $in: animalVocabs.map(v => v._id) }
    });
    console.log(`🧹 Cleaned up ${deleted.deletedCount} animal vocabulary records from Leo's mastery`);
  }

  // Set the 5 school words to Level 3 (Mastered) with perfect score
  for (const v of schoolVocabs) {
    await VocabularyMastery.findOneAndUpdate(
      { student: leo._id, vocabulary: v._id },
      {
        student: leo._id,
        vocabulary: v._id,
        correctCount: 5,
        wrongCount: 0,
        attemptCount: 5,
        streak: 3,
        masteryLevel: 3,
        lastReviewedAt: new Date('2026-11-02T09:15:00.000Z')
      },
      { upsert: true, returnDocument: 'after' }
    );
  }
  console.log(`⭐ Set 5 school words (book, crayon, chair, table, school) to Level 3 (Mastered) for Leo!`);

  // Words for Lesson 2 / Remediation (Learning Gaps): 'girl' and 'teacher'
  const gapWords = ['girl', 'teacher'];
  const gapVocabs = await Vocabulary.find({ english: { $in: gapWords } });
  for (const v of gapVocabs) {
    await VocabularyMastery.findOneAndUpdate(
      { student: leo._id, vocabulary: v._id },
      {
        student: leo._id,
        vocabulary: v._id,
        correctCount: 1,
        wrongCount: 3,
        attemptCount: 4,
        streak: 1,
        masteryLevel: 2,
        lastReviewedAt: new Date('2026-11-02T16:00:00.000Z')
      },
      { upsert: true, returnDocument: 'after' }
    );
  }
  console.log(`⚠️ Set learning gap words ('girl', 'teacher') with wrongCount=3 for remediation demo!`);

  // Also update Progress weakVocabulary for Leo
  if (lesson1_34) {
    await Progress.findOneAndUpdate(
      { child: leo._id, lesson: lesson1_34._id },
      {
        child: leo._id,
        topic: lesson1_34.topic,
        lesson: lesson1_34._id,
        completed: true,
        completedAt: new Date('2026-11-02T09:15:00.000Z'),
        score: 100,
        starsEarned: 3,
        weakVocabulary: gapVocabs.map(gv => ({
          vocabulary: gv._id,
          mistakeCount: 3
        }))
      },
      { upsert: true, returnDocument: 'after' }
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. PARENT NOTIFICATION IN SỔ LIÊN LẠC
  // ─────────────────────────────────────────────────────────────────────────────
  await ParentNotification.deleteMany({ child: leo._id });
  const notif = await ParentNotification.create({
    child: leo._id,
    teacher: teacherSarah._id,
    subject: 'Nhận xét buổi học: Things at School (02/11/2026)',
    content: 'Hôm nay bé Leo tham gia buổi học rất tích cực, nhận diện và phát âm chuẩn xác các đồ vật trong lớp học như Book, Crayon, Chair, Table, School. Cô gửi lời khen ngợi bé và tặng bé 3 sao thưởng! Bố mẹ tối nay cùng bé mở phần "5 Phút Ôn Tập Ở Nhà" để cùng con đố vui và nhận thưởng nhé!',
    teacherNote: 'Bé hào hứng giơ tay phát biểu và phản xạ rất nhanh.',
    stars: 3,
    score: 100,
    vocabMastered: 5,
    vocabTotal: 5,
    status: 'SENT',
    sentAt: new Date('2026-11-02T09:30:00.000Z'),
    readAt: new Date('2026-11-02T19:00:00.000Z'), // Read by parent, no annoying stuck red badge!
    parentFeedback: {
      message: 'Dạ gia đình cảm ơn cô Sarah nhiều ạ! Bé về nhà khoe được 3 sao rất vui, tối nay bố mẹ đã cùng con ôn tập 5 phút theo dặn dò của cô.',
      senderName: 'Phụ huynh bé Leo',
      createdAt: new Date('2026-11-02T19:45:00.000Z')
    },
    replies: [
      {
        senderRole: 'PARENT',
        senderName: 'Phụ huynh bé Leo',
        message: 'Dạ gia đình cảm ơn cô Sarah nhiều ạ! Bé về nhà khoe được 3 sao rất vui, tối nay bố mẹ đã cùng con ôn tập 5 phút theo dặn dò của cô.',
        createdAt: new Date('2026-11-02T19:45:00.000Z')
      }
    ]
  });
  console.log(`💌 Created official Parent Notification for Leo with parent reply`);

  // ─────────────────────────────────────────────────────────────────────────────
  // 7. VERIFY FINAL DATA FOR LEO
  // ─────────────────────────────────────────────────────────────────────────────
  const finalMasteries = await VocabularyMastery.find({ student: leo._id }).populate('vocabulary');
  const mastered = finalMasteries.filter(m => m.masteryLevel === 3);
  const gaps = finalMasteries.filter(m => m.wrongCount > 0);
  console.log('\n================ DEMO VERIFICATION SUMMARY ================');
  console.log(`👤 Student: Leo (${leo.name})`);
  console.log(`⭐ Accumulated Vocab Count (masteryLevel === 3): ${mastered.length}`);
  console.log(`📖 Mastered Words: [${mastered.map(m => m.vocabulary?.english).join(', ')}]`);
  console.log(`⚠️ Learning Gap Words (wrongCount > 0): [${gaps.map(m => m.vocabulary?.english + ' (wrong:' + m.wrongCount + ')').join(', ')}]`);
  console.log(`🏫 Current Class Lesson: ${class34?.name} -> Lesson 2: ${lesson2_34?.title}`);
  console.log('===========================================================\n');

  process.exit(0);
}

prepareDemoData().catch(err => {
  console.error('❌ Error preparing demo data:', err);
  process.exit(1);
});
