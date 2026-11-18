const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const M = require('../src/models');
const ClassRecognition = require('../src/models/ClassRecognition');

const BG_COLORS = [
  '#FFE0B2', '#FFCDD2', '#F8BBD0', '#B3E5FC', '#C8E6C9',
  '#DCEDC8', '#FFF9C4', '#D1C4E9', '#E1BEE7', '#FFCCBC',
  '#CFD8DC', '#B2DFDB', '#D7CCC8', '#F0F4C3', '#BBDEFB'
];

const EMOJI_MAP = {
  fox: '🦊', bear: '🐻', koala: '🐨', lion: '🦁', rabbit: '🐰', panda: '🐼'
};

const createCardSvg = (text, bg, emoji) => {
  const safeText = (text || '').toUpperCase();
  const safeEmoji = emoji || '🌟';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="240" height="240">
    <rect width="240" height="240" rx="44" fill="${bg}"/>
    <circle cx="120" cy="110" r="65" fill="rgba(255,255,255,0.4)"/>
    <text x="120" y="125" font-size="70" text-anchor="middle" dominant-baseline="middle">${safeEmoji}</text>
    <rect x="20" y="186" width="200" height="38" rx="19" fill="rgba(255,255,255,0.92)"/>
    <text x="120" y="210" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif" font-size="15" font-weight="bold" fill="#2D3748" text-anchor="middle" dominant-baseline="middle">${safeText}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

async function prepareDemoAtlas() {
  await connectDB();
  console.log('✅ Connected to MongoDB Atlas:', mongoose.connection.name);

  // 1. Fetch existing AgeGroups, Books, Lessons, Activities, Vocabulary
  const ageGroups = await M.AgeGroup.find().lean();
  const ageGroupsMap = {};
  for (const ag of ageGroups) ageGroupsMap[ag.code] = ag;

  const books = await M.CurriculumBook.find().lean();
  const booksMap = {};
  for (const b of books) booksMap[b.ageGroupCode] = b;

  const allLessons = await M.Lesson.find({ status: 'ACTIVE' })
    .populate('vocabularyItems')
    .sort({ displayOrder: 1, createdAt: 1 })
    .lean();

  const b1Lessons = allLessons.filter(l => l.ageGroupCode === '3-4');
  const b2Lessons = allLessons.filter(l => l.ageGroupCode === '4-5');
  const b3Lessons = allLessons.filter(l => l.ageGroupCode === '5-6');

  console.log(`📚 Active Lessons found: 3-4 (${b1Lessons.length}), 4-5 (${b2Lessons.length}), 5-6 (${b3Lessons.length})`);

  // 2. Ensure Admin & 3 Teachers
  let admin = await M.User.findOne({ username: 'admin' });
  if (!admin) {
    admin = new M.User({
      role: 'ADMIN',
      username: 'admin',
      email: 'admin@kcenglishkids.com',
      password: process.env.SEED_ADMIN_PASSWORD || 'Admin@123',
      name: 'System Administrator',
      avatar: 'bear',
      avatarUrl: createCardSvg('Admin', '#D7CCC8', '🐻'),
      status: 'ACTIVE'
    });
    await admin.save();
  }

  const ensureTeacher = async (username, email, name, phone, avatar, bg, emoji) => {
    let t = await M.User.findOne({ username });
    if (!t) {
      t = new M.User({
        role: 'TEACHER',
        username,
        email,
        password: 'Teacher@123',
        name,
        phone,
        contact: phone,
        avatar,
        avatarUrl: createCardSvg(name, bg, emoji),
        status: 'ACTIVE'
      });
    } else {
      t.email = email;
      t.name = name;
      t.phone = phone;
      t.contact = phone;
      t.status = 'ACTIVE';
      t.password = 'Teacher@123';
    }
    await t.save();
    return t;
  };

  const teacherSarah = await ensureTeacher('teacher_sarah', 'teacher@kcenglishkids.com', 'Ms. Sarah Johnson', '0901111111', 'fox', '#FFE0B2', '🦊');
  const teacherEmily = await ensureTeacher('teacher_emily', 'emily@kcenglishkids.com', 'Ms. Emily Watson', '0902222222', 'koala', '#E1BEE7', '🐨');
  const teacherDavid = await ensureTeacher('teacher_david', 'david@kcenglishkids.com', 'Mr. David Miller', '0903333333', 'bear', '#C8E6C9', '🐻');

  // 3. Remove temporary test children created during manual tests
  const officialChildUsernames = [
    'leo', 'emma', 'liam', 'sophia', 'noah', 'ava', 'oliver',
    'mia', 'lucas', 'isabella', 'ethan', 'harper', 'chloe', 'mason',
    'toby', 'james', 'ella', 'jackson', 'lily', 'henry', 'grace'
  ];
  const removedTestKids = await M.User.deleteMany({
    role: 'CHILD',
    username: { $nin: officialChildUsernames }
  });
  console.log(`🧹 Cleaned up ${removedTestKids.deletedCount} temporary test student accounts.`);

  // 4. Reset Classrooms to a clean, comprehensive 5-classroom demo structure
  await M.ClassRoom.deleteMany({});
  await M.Schedule.deleteMany({});
  await M.ClassroomSession.deleteMany({});
  await M.Attendance.deleteMany({});
  await ClassRecognition.deleteMany({});
  await M.SchoolRecognition.deleteMany({});
  await M.ParentNotification.deleteMany({});
  await M.LearningObservation.deleteMany({});
  await M.HomePracticePlan.deleteMany({});

  // Create 3 ACTIVE classrooms + 1 COMPLETED (ready for Rollover demo) + 1 UPCOMING (ready for activation demo)
  const class1 = await M.ClassRoom.create({
    name: 'Little Stars Class (Age 3–4)',
    teacher: teacherSarah._id,
    ageGroup: ageGroupsMap['3-4']?._id,
    ageGroupCode: '3-4',
    curriculumBook: booksMap['3-4']?._id,
    academicYear: '2026-2027',
    students: [],
    completedLessons: [b1Lessons[0]?._id, b1Lessons[1]?._id].filter(Boolean),
    currentLesson: b1Lessons[2]?._id || b1Lessons[0]?._id,
    status: 'ACTIVE'
  });

  const class2 = await M.ClassRoom.create({
    name: 'Sunny Kindergarten (Age 4–5)',
    teacher: teacherEmily._id,
    ageGroup: ageGroupsMap['4-5']?._id,
    ageGroupCode: '4-5',
    curriculumBook: booksMap['4-5']?._id,
    academicYear: '2026-2027',
    students: [],
    completedLessons: [b2Lessons[0]?._id, b2Lessons[1]?._id].filter(Boolean),
    currentLesson: b2Lessons[2]?._id || b2Lessons[0]?._id,
    status: 'ACTIVE'
  });

  const class3 = await M.ClassRoom.create({
    name: 'Rainbow Explorers (Age 5–6)',
    teacher: teacherDavid._id,
    ageGroup: ageGroupsMap['5-6']?._id,
    ageGroupCode: '5-6',
    curriculumBook: booksMap['5-6']?._id,
    academicYear: '2026-2027',
    students: [],
    completedLessons: [b3Lessons[0]?._id, b3Lessons[1]?._id].filter(Boolean),
    currentLesson: b3Lessons[2]?._id || b3Lessons[0]?._id,
    status: 'ACTIVE'
  });

  const classCompletedDemo = await M.ClassRoom.create({
    name: 'Happy Seedlings (Age 3–4 - Khóa 2025)',
    teacher: teacherSarah._id,
    ageGroup: ageGroupsMap['3-4']?._id,
    ageGroupCode: '3-4',
    curriculumBook: booksMap['3-4']?._id,
    academicYear: '2025-2026',
    students: [],
    completedLessons: b1Lessons.slice(0, 12).map(l => l._id),
    currentLesson: b1Lessons[11]?._id || b1Lessons[0]?._id,
    status: 'COMPLETED',
    isRolledOver: false
  });

  const classUpcomingDemo = await M.ClassRoom.create({
    name: 'Future Buds Class (Age 4–5)',
    teacher: null,
    ageGroup: ageGroupsMap['4-5']?._id,
    ageGroupCode: '4-5',
    curriculumBook: booksMap['4-5']?._id,
    academicYear: '2026-2027',
    students: [],
    completedLessons: [],
    currentLesson: b2Lessons[0]?._id,
    status: 'UPCOMING',
    isRolledOver: false
  });

  // Update teachers' assignedClass & assignedClasses
  teacherSarah.assignedClass = class1._id;
  teacherSarah.assignedClasses = [class1._id];
  await teacherSarah.save();

  teacherEmily.assignedClass = class2._id;
  teacherEmily.assignedClasses = [class2._id];
  await teacherEmily.save();

  teacherDavid.assignedClass = class3._id;
  teacherDavid.assignedClasses = [class3._id];
  await teacherDavid.save();

  // 5. Ensure 21 Children across the 3 ACTIVE classes with proper ageGroupCode, PIN, stars, and streak
  const todayStr = '2026-11-19';
  const yesterdayStr = '2026-11-18';
  const twoDaysAgoStr = '2026-11-17';
  const threeDaysAgoStr = '2026-11-16';

  const ensureChild = async ({ username, name, pin, ageCode, classroom, avatar, bg, emoji, streak = 2, stars = 36, activeDates = [yesterdayStr, todayStr] }) => {
    let child = await M.User.findOne({ username });
    if (!child) {
      child = new M.User({
        role: 'CHILD',
        username,
        name,
        email: `${username}@kcenglishkids.com`,
        phone: '0901234567',
        contact: '0901234567',
        parentContact: `parent.${username}@example.com`,
        avatar,
        avatarUrl: createCardSvg(name, bg, emoji),
        password: pin,
        pin,
        ageGroup: ageGroupsMap[ageCode]?._id,
        ageGroupCode: ageCode,
        assignedClass: classroom._id,
        streak,
        longestStreak: Math.max(streak, 4),
        lastActiveDate: todayStr,
        activeDates,
        stars,
        status: 'ACTIVE'
      });
    } else {
      child.name = name;
      child.pin = pin;
      child.password = pin;
      child.ageGroup = ageGroupsMap[ageCode]?._id;
      child.ageGroupCode = ageCode;
      child.assignedClass = classroom._id;
      child.streak = streak;
      child.longestStreak = Math.max(streak, child.longestStreak || 4);
      child.lastActiveDate = todayStr;
      child.activeDates = activeDates;
      child.stars = stars;
      child.status = 'ACTIVE';
    }
    await child.save();
    return child;
  };

  // Primary demo children (PIN: 1232)
  const childLeo = await ensureChild({
    username: 'leo', name: 'Leo', pin: '1232', ageCode: '3-4', classroom: class1,
    avatar: 'lion', bg: '#FFE082', emoji: '🦁', streak: 4, stars: 48,
    activeDates: [threeDaysAgoStr, twoDaysAgoStr, yesterdayStr, todayStr]
  });

  const childMia = await ensureChild({
    username: 'mia', name: 'Mia', pin: '1232', ageCode: '4-5', classroom: class2,
    avatar: 'panda', bg: '#CFD8DC', emoji: '🐼', streak: 3, stars: 42,
    activeDates: [twoDaysAgoStr, yesterdayStr, todayStr]
  });

  const childToby = await ensureChild({
    username: 'toby', name: 'Toby', pin: '1232', ageCode: '5-6', classroom: class3,
    avatar: 'rabbit', bg: '#F8BBD0', emoji: '🐰', streak: 3, stars: 45,
    activeDates: [twoDaysAgoStr, yesterdayStr, todayStr]
  });

  const class1Defs = [
    { name: 'Emma', avatar: 'fox', pin: '2001', stars: 44 },
    { name: 'Liam', avatar: 'bear', pin: '2002', stars: 35 },
    { name: 'Sophia', avatar: 'koala', pin: '2003', stars: 46 },
    { name: 'Noah', avatar: 'lion', pin: '2004', stars: 38 },
    { name: 'Ava', avatar: 'rabbit', pin: '2005', stars: 29 },
    { name: 'Oliver', avatar: 'panda', pin: '2006', stars: 32 }
  ];
  const class2Defs = [
    { name: 'Lucas', avatar: 'fox', pin: '2007', stars: 40 },
    { name: 'Isabella', avatar: 'koala', pin: '2008', stars: 34 },
    { name: 'Ethan', avatar: 'bear', pin: '2009', stars: 39 },
    { name: 'Harper', avatar: 'rabbit', pin: '2010', stars: 28 },
    { name: 'Chloe', avatar: 'panda', pin: '2011', stars: 31 },
    { name: 'Mason', avatar: 'lion', pin: '2012', stars: 41 }
  ];
  const class3Defs = [
    { name: 'James', avatar: 'fox', pin: '2013', stars: 43 },
    { name: 'Ella', avatar: 'koala', pin: '2014', stars: 37 },
    { name: 'Jackson', avatar: 'bear', pin: '2015', stars: 33 },
    { name: 'Lily', avatar: 'rabbit', pin: '2016', stars: 40 },
    { name: 'Henry', avatar: 'panda', pin: '2017', stars: 30 },
    { name: 'Grace', avatar: 'fox', pin: '2018', stars: 36 }
  ];

  const class1Kids = [];
  for (let i = 0; i < class1Defs.length; i++) {
    const d = class1Defs[i];
    class1Kids.push(await ensureChild({
      username: d.name.toLowerCase(), name: d.name, pin: d.pin, ageCode: '3-4', classroom: class1,
      avatar: d.avatar, bg: BG_COLORS[i % BG_COLORS.length], emoji: EMOJI_MAP[d.avatar], streak: 2, stars: d.stars
    }));
  }

  const class2Kids = [];
  for (let i = 0; i < class2Defs.length; i++) {
    const d = class2Defs[i];
    class2Kids.push(await ensureChild({
      username: d.name.toLowerCase(), name: d.name, pin: d.pin, ageCode: '4-5', classroom: class2,
      avatar: d.avatar, bg: BG_COLORS[(i + 6) % BG_COLORS.length], emoji: EMOJI_MAP[d.avatar], streak: 2, stars: d.stars
    }));
  }

  const class3Kids = [];
  for (let i = 0; i < class3Defs.length; i++) {
    const d = class3Defs[i];
    class3Kids.push(await ensureChild({
      username: d.name.toLowerCase(), name: d.name, pin: d.pin, ageCode: '5-6', classroom: class3,
      avatar: d.avatar, bg: BG_COLORS[(i + 12) % BG_COLORS.length], emoji: EMOJI_MAP[d.avatar], streak: 2, stars: d.stars
    }));
  }

  class1.students = [childLeo._id, ...class1Kids.map(k => k._id)];
  await class1.save();

  class2.students = [childMia._id, ...class2Kids.map(k => k._id)];
  await class2.save();

  class3.students = [childToby._id, ...class3Kids.map(k => k._id)];
  await class3.save();

  // 6. Create Weekly Schedules (Timetables)
  // On Thursday (dayOfWeek: 4) and Friday (dayOfWeek: 5), we provide:
  // - Main daytime teaching window so "Vào dạy ca này ngay ➔" is ALWAYS active during demo hours (07:00 - 21:00)
  // - Plus an evening slot (22:00 - 22:45) on Thursday so the teacher can also demo "⏳ Ca hôm nay lúc 22:00 (Chưa đến giờ)" + "Báo nghỉ" button!
  const effectiveFromDate = new Date('2026-11-01T00:00:00.000+07:00');

  await M.Schedule.create({
    classroom: class1._id,
    teacher: teacherSarah._id,
    academicYear: '2026-2027',
    colorTag: 'indigo',
    effectiveFrom: effectiveFromDate,
    effectiveTo: null,
    isActive: true,
    weeklySlots: [
      { dayOfWeek: 1, startTime: '08:30', endTime: '09:15', room: 'Phòng Mầm 1', subjectNote: `Khám phá từ vựng - ${b1Lessons[0]?.title || ''}`, lesson: b1Lessons[0]?._id, lessonNumber: 1, lessonTitle: b1Lessons[0]?.title || '' },
      { dayOfWeek: 2, startTime: '08:30', endTime: '09:15', room: 'Phòng Mầm 1', subjectNote: `Thực hành mẫu câu - ${b1Lessons[1]?.title || ''}`, lesson: b1Lessons[1]?._id, lessonNumber: 2, lessonTitle: b1Lessons[1]?.title || '' },
      { dayOfWeek: 3, startTime: '08:30', endTime: '09:15', room: 'Phòng Mầm 1', subjectNote: `Tương tác & Trò chơi - ${b1Lessons[2]?.title || ''}`, lesson: b1Lessons[2]?._id, lessonNumber: 3, lessonTitle: b1Lessons[2]?.title || '' },
      { dayOfWeek: 4, startTime: '07:00', endTime: '21:00', room: 'Phòng Mầm 1', subjectNote: `Ca dạy trực tiếp hôm nay - ${b1Lessons[2]?.title || ''}`, lesson: b1Lessons[2]?._id, lessonNumber: 3, lessonTitle: b1Lessons[2]?.title || '' },
      { dayOfWeek: 4, startTime: '22:00', endTime: '22:45', room: 'Phòng Mầm 1', subjectNote: `Ca phụ đạo tối - ${b1Lessons[3]?.title || ''}`, lesson: b1Lessons[3]?._id, lessonNumber: 4, lessonTitle: b1Lessons[3]?.title || '' },
      { dayOfWeek: 5, startTime: '07:00', endTime: '21:00', room: 'Phòng Mầm 1', subjectNote: `Vui học cuối tuần - ${b1Lessons[3]?.title || ''}`, lesson: b1Lessons[3]?._id, lessonNumber: 4, lessonTitle: b1Lessons[3]?.title || '' },
      { dayOfWeek: 6, startTime: '08:30', endTime: '09:15', room: 'Phòng Mầm 1', subjectNote: `Ôn tập chủ đề tuần - ${b1Lessons[4]?.title || ''}`, lesson: b1Lessons[4]?._id, lessonNumber: 5, lessonTitle: b1Lessons[4]?.title || '' }
    ]
  });

  await M.Schedule.create({
    classroom: class2._id,
    teacher: teacherEmily._id,
    academicYear: '2026-2027',
    colorTag: 'emerald',
    effectiveFrom: effectiveFromDate,
    effectiveTo: null,
    isActive: true,
    weeklySlots: [
      { dayOfWeek: 1, startTime: '09:30', endTime: '10:15', room: 'Phòng Chồi 2', subjectNote: `Vocabulary Discovery - ${b2Lessons[0]?.title || ''}`, lesson: b2Lessons[0]?._id, lessonNumber: 1, lessonTitle: b2Lessons[0]?.title || '' },
      { dayOfWeek: 2, startTime: '09:30', endTime: '10:15', room: 'Phòng Chồi 2', subjectNote: `Speaking & TPR - ${b2Lessons[1]?.title || ''}`, lesson: b2Lessons[1]?._id, lessonNumber: 2, lessonTitle: b2Lessons[1]?.title || '' },
      { dayOfWeek: 4, startTime: '07:30', endTime: '21:00', room: 'Phòng Chồi 2', subjectNote: `Interactive Story - ${b2Lessons[2]?.title || ''}`, lesson: b2Lessons[2]?._id, lessonNumber: 3, lessonTitle: b2Lessons[2]?.title || '' },
      { dayOfWeek: 5, startTime: '09:30', endTime: '10:15', room: 'Phòng Chồi 2', subjectNote: `Mini Games Review - ${b2Lessons[3]?.title || ''}`, lesson: b2Lessons[3]?._id, lessonNumber: 4, lessonTitle: b2Lessons[3]?.title || '' }
    ]
  });

  await M.Schedule.create({
    classroom: class3._id,
    teacher: teacherDavid._id,
    academicYear: '2026-2027',
    colorTag: 'purple',
    effectiveFrom: effectiveFromDate,
    effectiveTo: null,
    isActive: true,
    weeklySlots: [
      { dayOfWeek: 1, startTime: '10:30', endTime: '11:15', room: 'Phòng Lá 3', subjectNote: `Phonics & Words - ${b3Lessons[0]?.title || ''}`, lesson: b3Lessons[0]?._id, lessonNumber: 1, lessonTitle: b3Lessons[0]?.title || '' },
      { dayOfWeek: 2, startTime: '10:30', endTime: '11:15', room: 'Phòng Lá 3', subjectNote: `Full Sentences - ${b3Lessons[1]?.title || ''}`, lesson: b3Lessons[1]?._id, lessonNumber: 2, lessonTitle: b3Lessons[1]?.title || '' },
      { dayOfWeek: 4, startTime: '08:00', endTime: '21:00', room: 'Phòng Lá 3', subjectNote: `Show & Tell - ${b3Lessons[2]?.title || ''}`, lesson: b3Lessons[2]?._id, lessonNumber: 3, lessonTitle: b3Lessons[2]?.title || '' },
      { dayOfWeek: 5, startTime: '10:30', endTime: '11:15', room: 'Phòng Lá 3', subjectNote: `Weekly Challenge - ${b3Lessons[3]?.title || ''}`, lesson: b3Lessons[3]?._id, lessonNumber: 4, lessonTitle: b3Lessons[3]?.title || '' }
    ]
  });

  // Historical schedule for COMPLETED class (ended last month)
  await M.Schedule.create({
    classroom: classCompletedDemo._id,
    teacher: teacherSarah._id,
    academicYear: '2025-2026',
    colorTag: 'amber',
    effectiveFrom: new Date('2026-08-01T00:00:00.000+07:00'),
    effectiveTo: new Date('2026-11-10T23:59:59.999+07:00'),
    isActive: true,
    weeklySlots: [
      { dayOfWeek: 2, startTime: '14:00', endTime: '14:45', room: 'Phòng Mầm 2', subjectNote: 'Khóa học Mầm 2025 đã hoàn thành' },
      { dayOfWeek: 4, startTime: '14:00', endTime: '14:45', room: 'Phòng Mầm 2', subjectNote: 'Khóa học Mầm 2025 đã hoàn thành' }
    ]
  });

  // 7. Create Rich Historical ClassroomSessions (Monday 16/11, Tuesday 17/11 COMPLETED, Wednesday 18/11 CANCELLED)
  const monStart = new Date('2026-11-16T08:30:00.000+07:00');
  const monEnd = new Date('2026-11-16T09:15:00.000+07:00');
  const tueStart = new Date('2026-11-17T08:30:00.000+07:00');
  const tueEnd = new Date('2026-11-17T09:15:00.000+07:00');
  const wedStart = new Date('2026-11-18T08:30:00.000+07:00');
  const wedEnd = new Date('2026-11-18T09:15:00.000+07:00');

  const b1L1Acts = b1Lessons[0] ? await M.Activity.find({ lesson: b1Lessons[0]._id }).limit(3).lean() : [];
  const b1L2Acts = b1Lessons[1] ? await M.Activity.find({ lesson: b1Lessons[1]._id }).limit(3).lean() : [];

  // Class 1 - Session 1 (Monday 16/11 - Lesson 1)
  const c1Session1 = await M.ClassroomSession.create({
    classroom: class1._id,
    teacher: teacherSarah._id,
    lesson: b1Lessons[0]?._id,
    title: `${b1Lessons[0]?.title || 'Things at School'} — Khám phá đồ dùng lớp học`,
    ageGroup: '3-4',
    status: 'COMPLETED',
    sessionNumber: 1,
    startedAt: monStart,
    endedAt: monEnd,
    plannedDuration: 45,
    activities: b1L1Acts.map(a => a._id),
    studentScores: [
      { student: childLeo._id, points: 50, stars: 5, correctCount: 5, incorrectCount: 0, notAnswered: 0, attendance: 'PRESENT', status: 'COMPLETED' },
      { student: class1Kids[0]._id, points: 45, stars: 4, correctCount: 4, incorrectCount: 1, notAnswered: 0, attendance: 'PRESENT', status: 'COMPLETED' },
      { student: class1Kids[1]._id, points: 40, stars: 3, correctCount: 4, incorrectCount: 1, notAnswered: 0, attendance: 'PRESENT', status: 'COMPLETED' },
      { student: class1Kids[2]._id, points: 48, stars: 5, correctCount: 5, incorrectCount: 0, notAnswered: 0, attendance: 'PRESENT', status: 'COMPLETED' },
      { student: class1Kids[3]._id, points: 38, stars: 3, correctCount: 3, incorrectCount: 2, notAnswered: 0, attendance: 'PRESENT', status: 'COMPLETED' },
      { student: class1Kids[4]._id, points: 25, stars: 2, correctCount: 2, incorrectCount: 3, notAnswered: 0, attendance: 'LATE', status: 'NEEDS_PRACTICE' },
      { student: class1Kids[5]._id, points: 35, stars: 3, correctCount: 3, incorrectCount: 1, notAnswered: 1, attendance: 'PRESENT', status: 'COMPLETED' }
    ],
    questionResults: [
      {
        key: 'q1',
        questionIndex: 1,
        promptText: 'Point to the book! (Đâu là quyển sách?)',
        studentAnswers: [
          { student: childLeo._id, result: 'CORRECT' },
          { student: class1Kids[0]._id, result: 'CORRECT' },
          { student: class1Kids[1]._id, result: 'CORRECT' },
          { student: class1Kids[2]._id, result: 'CORRECT' },
          { student: class1Kids[3]._id, result: 'CORRECT' },
          { student: class1Kids[4]._id, result: 'INCORRECT' },
          { student: class1Kids[5]._id, result: 'CORRECT' }
        ]
      },
      {
        key: 'q2',
        questionIndex: 2,
        promptText: 'Show me the crayon! (Tìm cây bút sáp màu)',
        studentAnswers: [
          { student: childLeo._id, result: 'CORRECT' },
          { student: class1Kids[0]._id, result: 'CORRECT' },
          { student: class1Kids[1]._id, result: 'INCORRECT' },
          { student: class1Kids[2]._id, result: 'CORRECT' },
          { student: class1Kids[3]._id, result: 'CORRECT' },
          { student: class1Kids[4]._id, result: 'CORRECT' },
          { student: class1Kids[5]._id, result: 'CORRECT' }
        ]
      }
    ],
    teachingOutcome: {
      coverage: 'COMPLETE',
      goalsCovered: ['Nhận biết 5 đồ vật quen thuộc trong lớp học', 'Phát âm to rõ từ book, crayon, chair, table', 'Tham gia trò chơi vận động TPR'],
      reflection: 'Các bé lớp Little Stars rất hào hứng trong buổi đầu tuần. Bé Leo và Sophia phản xạ cực nhanh, bé Ava đến muộn 10 phút nên cần ôn thêm từ book và chair.',
      recordedAt: monEnd
    },
    summary: {
      participationCount: 7,
      averageAccuracy: 82,
      totalStars: 25,
      totalPoints: 281,
      studentsNeedingPractice: [class1Kids[4]._id],
      topPerformers: [childLeo._id, class1Kids[2]._id]
    }
  });

  // Class 1 - Session 2 (Tuesday 17/11 - Lesson 2)
  const c1Session2 = await M.ClassroomSession.create({
    classroom: class1._id,
    teacher: teacherSarah._id,
    lesson: b1Lessons[1]?._id,
    title: `${b1Lessons[1]?.title || 'School Activities'} — Hoạt động vui học tại trường`,
    ageGroup: '3-4',
    status: 'COMPLETED',
    sessionNumber: 2,
    startedAt: tueStart,
    endedAt: tueEnd,
    plannedDuration: 45,
    activities: b1L2Acts.map(a => a._id),
    studentScores: [
      { student: childLeo._id, points: 50, stars: 5, correctCount: 5, incorrectCount: 0, notAnswered: 0, attendance: 'PRESENT', status: 'COMPLETED' },
      { student: class1Kids[0]._id, points: 48, stars: 4, correctCount: 5, incorrectCount: 0, notAnswered: 0, attendance: 'PRESENT', status: 'COMPLETED' },
      { student: class1Kids[1]._id, points: 42, stars: 4, correctCount: 4, incorrectCount: 1, notAnswered: 0, attendance: 'PRESENT', status: 'COMPLETED' },
      { student: class1Kids[2]._id, points: 45, stars: 4, correctCount: 4, incorrectCount: 1, notAnswered: 0, attendance: 'PRESENT', status: 'COMPLETED' },
      { student: class1Kids[3]._id, points: 40, stars: 3, correctCount: 4, incorrectCount: 1, notAnswered: 0, attendance: 'PRESENT', status: 'COMPLETED' },
      { student: class1Kids[4]._id, points: 32, stars: 2, correctCount: 3, incorrectCount: 2, notAnswered: 0, attendance: 'PRESENT', status: 'NEEDS_PRACTICE' },
      { student: class1Kids[5]._id, points: 0, stars: 0, correctCount: 0, incorrectCount: 0, notAnswered: 0, attendance: 'EXCUSED', status: 'ACTIVE' }
    ],
    teachingOutcome: {
      coverage: 'COMPLETE',
      goalsCovered: ['Thực hành mẫu câu hành động ở trường', 'Ghép tranh từ vựng với hoạt động tương ứng'],
      reflection: 'Bé Leo tiếp tục dẫn đầu lớp với 5 sao tuyệt đối. Bé Oliver xin nghỉ có phép đi khám răng. Bé Ava hôm nay đã tiến bộ hơn buổi trước.',
      recordedAt: tueEnd
    },
    summary: {
      participationCount: 6,
      averageAccuracy: 86,
      totalStars: 22,
      totalPoints: 257,
      studentsNeedingPractice: [class1Kids[4]._id],
      topPerformers: [childLeo._id, class1Kids[0]._id]
    }
  });

  // Class 1 - Session 3 (Wednesday 18/11 - CANCELLED session to demonstrate lesson preservation)
  await M.ClassroomSession.create({
    classroom: class1._id,
    teacher: teacherSarah._id,
    lesson: null,
    title: 'Buổi học báo nghỉ',
    ageGroup: '3-4',
    status: 'CANCELLED',
    sessionNumber: 3,
    startedAt: wedStart,
    endedAt: wedEnd,
    plannedDuration: 45,
    cancellationReason: 'Họp hội đồng sư phạm định kỳ của nhà trường (08:30 - 09:15)',
    cancellationNote: 'Bài 3 (Good Friends) được tự động bảo lưu sang buổi học Thứ Năm 19/11.',
    cancelledAt: new Date('2026-11-17T19:00:00.000+07:00'),
    studentScores: [],
    questionResults: [],
    summary: {
      participationCount: 0,
      averageAccuracy: 0,
      totalStars: 0,
      totalPoints: 0,
      studentsNeedingPractice: [],
      topPerformers: []
    }
  });

  // Class 2 - 2 Completed Sessions (Monday & Tuesday)
  await M.ClassroomSession.create({
    classroom: class2._id,
    teacher: teacherEmily._id,
    lesson: b2Lessons[0]?._id,
    title: `${b2Lessons[0]?.title || 'Lesson 1'} — Khám phá từ vựng Lớp Chồi`,
    ageGroup: '4-5',
    status: 'COMPLETED',
    sessionNumber: 1,
    startedAt: new Date('2026-11-16T09:30:00.000+07:00'),
    endedAt: new Date('2026-11-16T10:15:00.000+07:00'),
    plannedDuration: 45,
    studentScores: [
      { student: childMia._id, points: 50, stars: 5, correctCount: 5, incorrectCount: 0, notAnswered: 0, attendance: 'PRESENT', status: 'COMPLETED' },
      { student: class2Kids[0]._id, points: 45, stars: 4, correctCount: 4, incorrectCount: 1, notAnswered: 0, attendance: 'PRESENT', status: 'COMPLETED' },
      { student: class2Kids[1]._id, points: 42, stars: 4, correctCount: 4, incorrectCount: 1, notAnswered: 0, attendance: 'PRESENT', status: 'COMPLETED' },
      { student: class2Kids[2]._id, points: 38, stars: 3, correctCount: 4, incorrectCount: 1, notAnswered: 0, attendance: 'PRESENT', status: 'COMPLETED' },
      { student: class2Kids[3]._id, points: 25, stars: 2, correctCount: 2, incorrectCount: 3, notAnswered: 0, attendance: 'LATE', status: 'NEEDS_PRACTICE' },
      { student: class2Kids[4]._id, points: 35, stars: 3, correctCount: 3, incorrectCount: 2, notAnswered: 0, attendance: 'PRESENT', status: 'COMPLETED' },
      { student: class2Kids[5]._id, points: 44, stars: 4, correctCount: 4, incorrectCount: 1, notAnswered: 0, attendance: 'PRESENT', status: 'COMPLETED' }
    ],
    teachingOutcome: {
      coverage: 'COMPLETE',
      goalsCovered: ['Phát âm chuẩn từ vựng chủ đề trường lớp', 'Phản xạ nghe chọn hình nhanh'],
      reflection: 'Lớp Sunny Kindergarten học rất sôi nổi. Bé Mia và Mason phát âm rất tự nhiên.',
      recordedAt: new Date('2026-11-16T10:15:00.000+07:00')
    },
    summary: {
      participationCount: 7,
      averageAccuracy: 83,
      totalStars: 25,
      totalPoints: 279,
      studentsNeedingPractice: [class2Kids[3]._id],
      topPerformers: [childMia._id, class2Kids[5]._id]
    }
  });

  await M.ClassroomSession.create({
    classroom: class2._id,
    teacher: teacherEmily._id,
    lesson: b2Lessons[1]?._id,
    title: `${b2Lessons[1]?.title || 'Lesson 2'} — Giao tiếp mẫu câu Lớp Chồi`,
    ageGroup: '4-5',
    status: 'COMPLETED',
    sessionNumber: 2,
    startedAt: new Date('2026-11-17T09:30:00.000+07:00'),
    endedAt: new Date('2026-11-17T10:15:00.000+07:00'),
    plannedDuration: 45,
    studentScores: [
      { student: childMia._id, points: 48, stars: 4, correctCount: 5, incorrectCount: 0, notAnswered: 0, attendance: 'PRESENT', status: 'COMPLETED' },
      { student: class2Kids[0]._id, points: 44, stars: 4, correctCount: 4, incorrectCount: 1, notAnswered: 0, attendance: 'PRESENT', status: 'COMPLETED' },
      { student: class2Kids[1]._id, points: 0, stars: 0, correctCount: 0, incorrectCount: 0, notAnswered: 0, attendance: 'EXCUSED', status: 'ACTIVE' },
      { student: class2Kids[2]._id, points: 40, stars: 3, correctCount: 4, incorrectCount: 1, notAnswered: 0, attendance: 'PRESENT', status: 'COMPLETED' },
      { student: class2Kids[3]._id, points: 30, stars: 2, correctCount: 3, incorrectCount: 2, notAnswered: 0, attendance: 'PRESENT', status: 'NEEDS_PRACTICE' },
      { student: class2Kids[4]._id, points: 36, stars: 3, correctCount: 3, incorrectCount: 2, notAnswered: 0, attendance: 'PRESENT', status: 'COMPLETED' },
      { student: class2Kids[5]._id, points: 46, stars: 4, correctCount: 4, incorrectCount: 1, notAnswered: 0, attendance: 'PRESENT', status: 'COMPLETED' }
    ],
    teachingOutcome: {
      coverage: 'COMPLETE',
      goalsCovered: ['Hỏi đáp mẫu câu tiếng Anh theo cặp', 'Trò chơi đóng vai'],
      reflection: 'Các bé tương tác tốt, bé Isabella xin nghỉ ốm có phép.',
      recordedAt: new Date('2026-11-17T10:15:00.000+07:00')
    },
    summary: {
      participationCount: 6,
      averageAccuracy: 84,
      totalStars: 20,
      totalPoints: 244,
      studentsNeedingPractice: [class2Kids[3]._id],
      topPerformers: [childMia._id, class2Kids[5]._id]
    }
  });

  // Class 3 - 2 Completed Sessions (Monday & Tuesday)
  await M.ClassroomSession.create({
    classroom: class3._id,
    teacher: teacherDavid._id,
    lesson: b3Lessons[0]?._id,
    title: `${b3Lessons[0]?.title || 'Lesson 1'} — Thuyết trình & Từ vựng Lớp Lá`,
    ageGroup: '5-6',
    status: 'COMPLETED',
    sessionNumber: 1,
    startedAt: new Date('2026-11-16T10:30:00.000+07:00'),
    endedAt: new Date('2026-11-16T11:15:00.000+07:00'),
    plannedDuration: 45,
    studentScores: [
      { student: childToby._id, points: 50, stars: 5, correctCount: 5, incorrectCount: 0, notAnswered: 0, attendance: 'PRESENT', status: 'COMPLETED' },
      { student: class3Kids[0]._id, points: 48, stars: 4, correctCount: 5, incorrectCount: 0, notAnswered: 0, attendance: 'PRESENT', status: 'COMPLETED' },
      { student: class3Kids[1]._id, points: 42, stars: 4, correctCount: 4, incorrectCount: 1, notAnswered: 0, attendance: 'PRESENT', status: 'COMPLETED' },
      { student: class3Kids[2]._id, points: 36, stars: 3, correctCount: 3, incorrectCount: 2, notAnswered: 0, attendance: 'LATE', status: 'COMPLETED' },
      { student: class3Kids[3]._id, points: 44, stars: 4, correctCount: 4, incorrectCount: 1, notAnswered: 0, attendance: 'PRESENT', status: 'COMPLETED' },
      { student: class3Kids[4]._id, points: 28, stars: 2, correctCount: 2, incorrectCount: 3, notAnswered: 0, attendance: 'PRESENT', status: 'NEEDS_PRACTICE' },
      { student: class3Kids[5]._id, points: 40, stars: 3, correctCount: 4, incorrectCount: 1, notAnswered: 0, attendance: 'PRESENT', status: 'COMPLETED' }
    ],
    teachingOutcome: {
      coverage: 'COMPLETE',
      goalsCovered: ['Thuyết trình câu hoàn chỉnh trước lớp', 'Luyện phản xạ hỏi đáp nhanh'],
      reflection: 'Lớp Rainbow Explorers phát âm rất chuẩn. Bé Toby và James tự tin làm mẫu cho cả lớp.',
      recordedAt: new Date('2026-11-16T11:15:00.000+07:00')
    },
    summary: {
      participationCount: 7,
      averageAccuracy: 85,
      totalStars: 25,
      totalPoints: 288,
      studentsNeedingPractice: [class3Kids[4]._id],
      topPerformers: [childToby._id, class3Kids[0]._id]
    }
  });

  // Historical session for the COMPLETED class (Happy Seedlings) so its "Nhật Ký Các Buổi Dạy Gần Đây" looks great!
  await M.ClassroomSession.create({
    classroom: classCompletedDemo._id,
    teacher: teacherSarah._id,
    lesson: b1Lessons[11]?._id || b1Lessons[0]?._id,
    title: 'Buổi tổng kết khóa học & Trao giấy chứng nhận hoàn thành lộ trình 3–4 tuổi',
    ageGroup: '3-4',
    status: 'COMPLETED',
    sessionNumber: 12,
    startedAt: new Date('2026-11-10T14:00:00.000+07:00'),
    endedAt: new Date('2026-11-10T14:45:00.000+07:00'),
    plannedDuration: 45,
    studentScores: [],
    teachingOutcome: {
      coverage: 'COMPLETE',
      goalsCovered: ['Tổng kết từ vựng toàn khóa 3-4 tuổi', 'Đánh giá năng lực đầu ra để chuẩn bị lên lớp 4-5 tuổi'],
      reflection: 'Lớp đã hoàn thành xuất sắc chương trình học, đủ điều kiện thực hiện Lên lớp (Rollover) sang khối 4–5 tuổi.',
      recordedAt: new Date('2026-11-10T14:45:00.000+07:00')
    },
    summary: {
      participationCount: 6,
      averageAccuracy: 92,
      totalStars: 24,
      totalPoints: 290,
      studentsNeedingPractice: [],
      topPerformers: []
    }
  });

  // 8. Daily Attendance for Today (2026-11-19) & Recent Days
  for (const dateStr of ['2026-11-16', '2026-11-17', '2026-11-19']) {
    await M.Attendance.create({
      classroom: class1._id,
      teacher: teacherSarah._id,
      date: dateStr,
      records: [
        { student: childLeo._id, status: 'PRESENT', note: 'Đi học đúng giờ, rất hào hứng phát biểu' },
        { student: class1Kids[0]._id, status: 'PRESENT', note: '' },
        { student: class1Kids[1]._id, status: 'PRESENT', note: '' },
        { student: class1Kids[2]._id, status: 'PRESENT', note: 'Phát âm to rõ ràng' },
        { student: class1Kids[3]._id, status: 'PRESENT', note: '' },
        { student: class1Kids[4]._id, status: 'LATE', note: 'Đến muộn 10 phút' },
        { student: class1Kids[5]._id, status: 'PRESENT', note: '' }
      ],
      note: `Điểm danh lớp Little Stars ngày ${dateStr}`
    });
  }

  // 9. Observations, Home Practice Plan, HomePracticeCompletion, Progress & VocabularyMastery for Leo (and classmates)
  await M.Progress.deleteMany({ child: childLeo._id });
  for (let i = 0; i < 2; i++) {
    const lessonDoc = b1Lessons[i];
    if (!lessonDoc) continue;
    await M.Progress.create({
      child: childLeo._id,
      topic: lessonDoc.topic,
      lesson: lessonDoc._id,
      completed: true,
      stars: 3,
      highestScore: 100,
      stage1Score: 100,
      stage2Score: 95,
      stage3Score: 100,
      attempts: 2,
      stage1Completed: true,
      stage2Completed: true,
      stage3Completed: true,
      correctAnswers: 9,
      incorrectAnswers: 1,
      lastAttemptAt: new Date('2026-11-18T14:00:00.000+07:00')
    });
  }
  // Lesson 3 in progress (Stage 1 done, ready to practice Stage 2 or learn in class!)
  if (b1Lessons[2]) {
    await M.Progress.create({
      child: childLeo._id,
      topic: b1Lessons[2].topic,
      lesson: b1Lessons[2]._id,
      completed: false,
      stars: 1,
      highestScore: 100,
      stage1Score: 100,
      attempts: 1,
      stage1Completed: true,
      stage2Completed: false,
      stage3Completed: false,
      correctAnswers: 4,
      incorrectAnswers: 0,
      lastAttemptAt: new Date('2026-11-18T19:30:00.000+07:00')
    });
  }

  // Seed some vocabulary mastery gaps on Lesson 1 & Lesson 2 so "Lập kế hoạch bù kiến thức (AI Gap Remediation)" has real data to demo!
  await M.VocabularyMastery.deleteMany({ student: { $in: [childLeo._id, ...class1Kids.map(k => k._id)] } });
  const l1Vocabs = b1Lessons[0]?.vocabularyItems || [];
  const l2Vocabs = b1Lessons[1]?.vocabularyItems || [];
  for (const v of l1Vocabs) {
    // Leo masters most words
    await M.VocabularyMastery.create({
      student: childLeo._id,
      vocabulary: v._id,
      correctCount: 5,
      wrongCount: 0,
      attemptCount: 5,
      streak: 3,
      masteryLevel: 3,
      lastReviewedAt: new Date()
    });
    // Ava & Oliver struggle with the first 2 words so class gap analysis has realistic weak words!
    await M.VocabularyMastery.create({
      student: class1Kids[4]._id,
      vocabulary: v._id,
      correctCount: 1,
      wrongCount: 4,
      attemptCount: 5,
      streak: 0,
      masteryLevel: 1,
      lastReviewedAt: new Date()
    });
    await M.VocabularyMastery.create({
      student: class1Kids[5]._id,
      vocabulary: v._id,
      correctCount: 2,
      wrongCount: 3,
      attemptCount: 5,
      streak: 0,
      masteryLevel: 1,
      lastReviewedAt: new Date()
    });
  }
  for (const v of l2Vocabs.slice(0, 2)) {
    await M.VocabularyMastery.create({
      student: childLeo._id,
      vocabulary: v._id,
      correctCount: 1,
      wrongCount: 2,
      attemptCount: 3,
      streak: 0,
      masteryLevel: 1,
      lastReviewedAt: new Date()
    });
  }

  // Observations & HomePracticePlan for Leo
  const obsLeo = await M.LearningObservation.create({
    child: childLeo._id,
    classroom: class1._id,
    teacher: teacherSarah._id,
    lesson: b1Lessons[1]?._id || b1Lessons[0]?._id,
    session: c1Session2._id,
    skill: 'EXPRESS',
    vocabulary: (b1Lessons[1]?.vocabularyItems || []).slice(0, 3).map(v => v._id),
    unitKey: 'B1_U1',
    unitLabel: 'Unit 1 - At School',
    level: 'INDEPENDENT',
    evidence: 'Bé Leo phản xạ rất nhanh khi nhìn thẻ tranh đồ dùng học tập, phát âm to rõ ràng và tự tin giơ tay làm mẫu cho các bạn.',
    nextStep: 'Khuyến khích bé ghép từ vào mẫu câu ngắn cùng ba mẹ ở nhà.',
    consentConfirmed: true,
    observedAt: new Date('2026-11-17T09:10:00.000+07:00'),
    operationId: `obs_demo_leo_${Date.now()}`,
    payloadHash: 'demo_hash_leo_obs_01'
  });

  const homeWords = (b1Lessons[1]?.vocabularyItems || b1Lessons[0]?.vocabularyItems || []).slice(0, 3).map(v => ({
    vocabulary: v._id,
    english: v.english,
    vietnamese: v.vietnamese,
    imageUrl: v.imageUrl,
    audioUrl: v.audioUrl,
    wordType: 'noun',
    reason: 'Từ vựng trọng tâm buổi học trên lớp'
  }));

  await M.HomePracticePlan.create({
    child: childLeo._id,
    classroom: class1._id,
    teacher: teacherSarah._id,
    lesson: (b1Lessons[1] || b1Lessons[0])._id,
    sourceSession: c1Session2._id,
    revision: 1,
    status: 'APPROVED',
    operationId: `plan_demo_leo_${Date.now()}`,
    payloadHash: 'demo_hash_leo_plan_01',
    lessonTitle: (b1Lessons[1] || b1Lessons[0]).title,
    ageGroupCode: '3-4',
    teacherNote: 'Ba mẹ hãy dành 5 phút mỗi tối cùng bé Leo mở thẻ tranh và luyện phát âm các từ vừa học trên lớp nhé!',
    words: homeWords,
    homeActivity: {
      title: 'Thử thách 5 phút tìm đồ vật quanh nhà cùng ba mẹ',
      steps: [
        'Ba mẹ đọc to từ tiếng Anh (ví dụ: book, crayon, chair) và đố bé chỉ đúng đồ vật',
        'Bé nhắc lại từ tiếng Anh 2 lần thật to và nhận 1 cái đập tay (High-five) từ ba mẹ'
      ]
    },
    observations: [
      {
        observation: obsLeo._id,
        skill: obsLeo.skill,
        level: obsLeo.level,
        evidence: obsLeo.evidence,
        nextStep: obsLeo.nextStep
      }
    ]
  });

  // HomePracticeCompletion history for Leo (yesterday completed, today left open so user can demo completing today's 5-min review!)
  await M.HomePracticeCompletion.deleteMany({ child: childLeo._id });
  await M.HomePracticeCompletion.create({
    child: childLeo._id,
    date: '2026-11-17',
    lesson: b1Lessons[0]?._id,
    stars: 3,
    completedAt: new Date('2026-11-17T20:00:00.000+07:00')
  });
  await M.HomePracticeCompletion.create({
    child: childLeo._id,
    date: '2026-11-18',
    lesson: b1Lessons[1]?._id,
    stars: 3,
    completedAt: new Date('2026-11-18T20:00:00.000+07:00')
  });

  // 10. Parent Notifications (Family Notebook Inbox for Leo, Mia, Toby)
  await M.ParentNotification.create({
    teacher: teacherSarah._id,
    child: childLeo._id,
    session: c1Session2._id,
    recipientContact: '0901234567',
    childName: 'Leo',
    className: class1.name,
    sessionDate: new Date('2026-11-17T09:15:00.000+07:00'),
    subject: 'Báo cáo buổi học — Bé Leo đạt 5 sao xuất sắc!',
    content: 'Trong buổi học School Activities, bé Leo đã tham gia rất hăng say, trả lời đúng 5/5 câu hỏi tương tác và phát âm to rõ ràng.',
    teacherNote: 'Leo nhớ từ vựng rất nhanh và luôn nhiệt tình giúp đỡ các bạn trong nhóm. Ba mẹ cùng bé ôn lại 5 phút ở nhà nhé!',
    score: 100,
    vocabMastered: 5,
    vocabTotal: 5,
    stars: 5,
    accuracy: 100,
    templateType: 'SESSION_REPORT',
    status: 'SENT',
    sentAt: new Date('2026-11-17T09:20:00.000+07:00')
  });

  await M.ParentNotification.create({
    teacher: teacherSarah._id,
    child: childLeo._id,
    recipientContact: '0901234567',
    childName: 'Leo',
    className: class1.name,
    sessionDate: new Date('2026-11-18T08:30:00.000+07:00'),
    subject: 'Thông báo nghỉ học — Lớp Little Stars Class (Age 3–4) (18/11/2026)',
    content: 'Kính gửi Quý Phụ huynh bé Leo, lớp Little Stars Class (Age 3–4) xin thông báo tạm nghỉ buổi học ngày 18/11/2026. Lý do: Họp hội đồng sư phạm định kỳ của nhà trường. Bài học trong lộ trình sẽ được bảo lưu sang buổi học kế tiếp.',
    teacherNote: 'Bài 3 (Good Friends) được bảo lưu sang Thứ Năm 19/11.',
    templateType: 'GENERAL',
    status: 'SENT',
    sentAt: new Date('2026-11-17T19:00:00.000+07:00')
  });

  // 11. Published ClassRecognition & SchoolRecognition for Previous Week (2026-11-09 to 2026-11-15)
  // So Leo, Mia, Toby immediately have a certificate/award in their profile, while Current Week (2026-11-16) is ready to be previewed & published live during the demo!
  const lastWeekStart = new Date('2026-11-08T17:00:00.000Z'); // 2026-11-09 00:00 VN
  const lastWeekEnd = new Date('2026-11-15T17:00:00.000Z');   // 2026-11-16 00:00 VN

  await ClassRecognition.create({
    classroom: class1._id,
    className: class1.name,
    publishedBy: teacherSarah._id,
    kind: 'WEEK',
    periodStart: lastWeekStart,
    periodEnd: lastWeekEnd,
    reward: {
      title: 'Ngôi Sao Tuần',
      symbol: '🌟',
      description: 'Danh hiệu Ngôi Sao Tuần dành cho bé có thành tích học tập xuất sắc nhất tuần!',
      suggestion: 'Mời bé dẫn phần chào hỏi hoặc khởi động cùng cô trong buổi học tới.'
    },
    winners: [
      {
        child: childLeo._id,
        name: 'Leo',
        avatarUrl: childLeo.avatarUrl,
        stars: 14,
        classStars: 10,
        homeStars: 4,
        sessions: 3,
        totalStars: 48,
        awardTitle: 'Ngôi Sao Tỏa Sáng',
        awardSymbol: '👑',
        awardBadge: 'star-champion',
        awardTier: 'GOLD',
        awardCategory: 'CHAMPION',
        awardDescription: 'Thành tích xuất sắc nhất kỳ',
        readAt: null
      }
    ],
    ranking: [
      {
        child: childLeo._id,
        name: 'Leo',
        avatarUrl: childLeo.avatarUrl,
        stars: 14,
        classStars: 10,
        homeStars: 4,
        sessions: 3,
        totalStars: 48,
        rank: 1,
        winner: true,
        awardTitle: 'Ngôi Sao Tỏa Sáng',
        awardSymbol: '👑',
        awardBadge: 'star-champion',
        awardTier: 'GOLD',
        awardCategory: 'CHAMPION',
        awardDescription: 'Thành tích xuất sắc nhất kỳ'
      },
      {
        child: class1Kids[2]._id,
        name: 'Sophia',
        avatarUrl: class1Kids[2].avatarUrl,
        stars: 12,
        classStars: 10,
        homeStars: 2,
        sessions: 3,
        totalStars: 46,
        rank: 2,
        winner: false,
        awardTitle: 'Đại Sứ Chuyên Cần',
        awardSymbol: '🏆',
        awardBadge: 'perfect-attendance',
        awardTier: 'SILVER',
        awardCategory: 'ATTENDANCE',
        awardDescription: 'Đi học chuyên cần đầy đủ 100%'
      }
    ]
  });

  await M.SchoolRecognition.create({
    className: 'Toàn trường',
    publishedBy: admin._id,
    kind: 'WEEK',
    periodStart: lastWeekStart,
    periodEnd: lastWeekEnd,
    minimumSessions: 0,
    reward: {
      title: 'Ngôi Sao Toàn Trường',
      symbol: '👑',
      description: 'Danh hiệu cao quý vinh danh học sinh tiêu biểu dẫn đầu toàn trường!',
      suggestion: 'Vinh danh bé trên bảng vàng toàn trường và trao huy hiệu Ngôi Sao Toàn Trường.'
    },
    winners: [
      {
        child: childLeo._id,
        name: 'Leo',
        avatarUrl: childLeo.avatarUrl,
        className: class1.name,
        stars: 14,
        classStars: 10,
        homeStars: 4,
        sessions: 3,
        starsPerSession: 3.33,
        totalStars: 48,
        awardTitle: 'Ngôi Sao Tỏa Sáng',
        awardSymbol: '👑',
        awardBadge: 'star-champion',
        awardTier: 'GOLD',
        awardCategory: 'CHAMPION',
        awardDescription: 'Thành tích xuất sắc nhất kỳ',
        readAt: null
      }
    ],
    ranking: [
      {
        child: childLeo._id,
        name: 'Leo',
        avatarUrl: childLeo.avatarUrl,
        className: class1.name,
        stars: 14,
        classStars: 10,
        homeStars: 4,
        sessions: 3,
        starsPerSession: 3.33,
        totalStars: 48,
        eligible: true,
        rank: 1,
        winner: true,
        awardTitle: 'Ngôi Sao Tỏa Sáng',
        awardSymbol: '👑',
        awardBadge: 'star-champion',
        awardTier: 'GOLD',
        awardCategory: 'CHAMPION',
        awardDescription: 'Thành tích xuất sắc nhất kỳ'
      }
    ]
  });

  // 12. Seed Realistic Admin AuditLogs so "Nhật ký hoạt động" looks clean and active
  await M.AuditLog.deleteMany({});
  const auditEntries = [
    { action: 'CREATE_CLASSROOM', targetType: 'ClassRoom', targetId: String(class1._id), details: { name: class1.name, ageGroupCode: '3-4', teacher: teacherSarah.name }, createdAt: new Date('2026-11-16T08:00:00.000+07:00') },
    { action: 'CREATE_CLASSROOM', targetType: 'ClassRoom', targetId: String(class2._id), details: { name: class2.name, ageGroupCode: '4-5', teacher: teacherEmily.name }, createdAt: new Date('2026-11-16T08:05:00.000+07:00') },
    { action: 'CREATE_CLASSROOM', targetType: 'ClassRoom', targetId: String(class3._id), details: { name: class3.name, ageGroupCode: '5-6', teacher: teacherDavid.name }, createdAt: new Date('2026-11-16T08:10:00.000+07:00') },
    { action: 'UPDATE_SCHEDULE', targetType: 'Schedule', targetId: String(class1._id), details: { classroom: class1.name, slotsCount: 7, status: 'ACTIVE' }, createdAt: new Date('2026-11-17T10:30:00.000+07:00') },
    { action: 'EXPORT_SYSTEM_BACKUP', targetType: 'SystemBackup', targetId: admin._id, details: { collectionsCount: 38, format: 'JSON Snapshot v2.0' }, createdAt: new Date('2026-11-18T21:00:00.000+07:00') }
  ];
  for (const entry of auditEntries) {
    await M.AuditLog.create({ user: admin._id, ...entry });
  }

  console.log('🎉 Demo dataset successfully prepared and written to MongoDB Atlas!');
  await mongoose.disconnect();
}

prepareDemoAtlas().catch(err => {
  console.error('❌ Error preparing demo dataset:', err);
  process.exit(1);
});
