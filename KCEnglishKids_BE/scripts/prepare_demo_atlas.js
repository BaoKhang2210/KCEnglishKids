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

  const allUnits = await M.CurriculumUnit.find({ status: 'ACTIVE' }).lean();
  const unitNumberMap = new Map(allUnits.map(u => [String(u._id), u.unitNumber || 99]));

  const allLessons = await M.Lesson.find({ status: 'ACTIVE' })
    .populate('vocabularyItems')
    .lean();

  const sortLessonsSequentially = (list) => {
    return [...list].sort((a, b) => {
      const uIdA = Array.isArray(a.curriculumUnits) && a.curriculumUnits.length ? String(a.curriculumUnits[0]) : '';
      const uIdB = Array.isArray(b.curriculumUnits) && b.curriculumUnits.length ? String(b.curriculumUnits[0]) : '';
      const uNumA = unitNumberMap.get(uIdA) ?? 99;
      const uNumB = unitNumberMap.get(uIdB) ?? 99;
      if (uNumA !== uNumB) return uNumA - uNumB;
      return (a.displayOrder || 0) - (b.displayOrder || 0);
    });
  };

  const b1Lessons = sortLessonsSequentially(allLessons.filter(l => l.ageGroupCode === '3-4'));
  const b2Lessons = sortLessonsSequentially(allLessons.filter(l => l.ageGroupCode === '4-5'));
  const b3Lessons = sortLessonsSequentially(allLessons.filter(l => l.ageGroupCode === '5-6'));

  console.log(`📚 Active Lessons found: 3-4 (${b1Lessons.length}), 4-5 (${b2Lessons.length}), 5-6 (${b3Lessons.length})`);
  console.log('   3-4 first 5:', b1Lessons.slice(0, 5).map(l => l.key).join(', '));
  console.log('   4-5 first 5:', b2Lessons.slice(0, 5).map(l => l.key).join(', '));
  console.log('   5-6 first 5:', b3Lessons.slice(0, 5).map(l => l.key).join(', '));

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

  // Create 3 clean ACTIVE classrooms (1 per age group) with 100% consistent teachers, students & sessions
  const class1 = await M.ClassRoom.create({
    _id: new mongoose.Types.ObjectId('6af1fcff9b357c62ef641115'),
    name: 'Little Stars Class (Age 3–4)',
    teacher: teacherSarah._id,
    ageGroup: ageGroupsMap['3-4']?._id,
    ageGroupCode: '3-4',
    curriculumBook: booksMap['3-4']?._id,
    academicYear: '2026-2027',
    students: [],
    completedLessons: [b1Lessons[0]?._id, b1Lessons[1]?._id, b1Lessons[2]?._id].filter(Boolean),
    currentLesson: b1Lessons[3]?._id || b1Lessons[2]?._id || b1Lessons[0]?._id,
    status: 'ACTIVE'
  });

  const class2 = await M.ClassRoom.create({
    _id: new mongoose.Types.ObjectId('6af1fcff9b357c62ef641116'),
    name: 'Sunny Kindergarten (Age 4–5)',
    teacher: teacherEmily._id,
    ageGroup: ageGroupsMap['4-5']?._id,
    ageGroupCode: '4-5',
    curriculumBook: booksMap['4-5']?._id,
    academicYear: '2026-2027',
    students: [],
    completedLessons: [b2Lessons[0]?._id, b2Lessons[1]?._id, b2Lessons[2]?._id].filter(Boolean),
    currentLesson: b2Lessons[3]?._id || b2Lessons[2]?._id || b2Lessons[0]?._id,
    status: 'ACTIVE'
  });

  const class3 = await M.ClassRoom.create({
    _id: new mongoose.Types.ObjectId('6af1fcff9b357c62ef641117'),
    name: 'Rainbow Explorers (Age 5–6)',
    teacher: teacherDavid._id,
    ageGroup: ageGroupsMap['5-6']?._id,
    ageGroupCode: '5-6',
    curriculumBook: booksMap['5-6']?._id,
    academicYear: '2026-2027',
    students: [],
    completedLessons: [b3Lessons[0]?._id, b3Lessons[1]?._id, b3Lessons[2]?._id].filter(Boolean),
    currentLesson: b3Lessons[3]?._id || b3Lessons[2]?._id || b3Lessons[0]?._id,
    status: 'ACTIVE'
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
  const vnDateStr = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(d);
  const now = new Date();
  const todayStr = vnDateStr(now);
  const yesterdayStr = vnDateStr(new Date(now.getTime() - 1 * 86400000));
  const twoDaysAgoStr = vnDateStr(new Date(now.getTime() - 2 * 86400000));
  const threeDaysAgoStr = vnDateStr(new Date(now.getTime() - 3 * 86400000));
  const fourDaysAgoStr = vnDateStr(new Date(now.getTime() - 4 * 86400000));

  // Compute Monday of current week in VN timezone
  const todayNoon = new Date(`${todayStr}T12:00:00+07:00`);
  const dow = todayNoon.getDay(); // 0=Sun, 1=Mon...
  const diffToMon = dow === 0 ? -6 : 1 - dow;
  const monDateStr = vnDateStr(new Date(todayNoon.getTime() + diffToMon * 86400000));
  const tueDateStr = vnDateStr(new Date(todayNoon.getTime() + (diffToMon + 1) * 86400000));
  const wedDateStr = vnDateStr(new Date(todayNoon.getTime() + (diffToMon + 2) * 86400000));
  const thuDateStr = vnDateStr(new Date(todayNoon.getTime() + (diffToMon + 3) * 86400000));
  const lastMonDateStr = vnDateStr(new Date(todayNoon.getTime() + (diffToMon - 7) * 86400000));
  const lastWedDateStr = vnDateStr(new Date(todayNoon.getTime() + (diffToMon - 5) * 86400000));
  const lastFriDateStr = vnDateStr(new Date(todayNoon.getTime() + (diffToMon - 3) * 86400000));

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
  // Provide active daytime windows + evening upcoming slot on Thursday/Friday/Saturday so live teaching & report-off can be demoed anytime!
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
      { dayOfWeek: 4, startTime: '08:30', endTime: '09:15', room: 'Phòng Mầm 1', subjectNote: `Khám phá thế giới quanh bé - ${b1Lessons[2]?.title || ''}`, lesson: b1Lessons[2]?._id, lessonNumber: 3, lessonTitle: b1Lessons[2]?.title || '' },
      { dayOfWeek: 5, startTime: '07:00', endTime: '21:30', room: 'Phòng Mầm 1', subjectNote: `Ca dạy trực tiếp hôm nay - ${b1Lessons[3]?.title || ''}`, lesson: b1Lessons[3]?._id, lessonNumber: 4, lessonTitle: b1Lessons[3]?.title || '' },
      { dayOfWeek: 5, startTime: '22:00', endTime: '22:45', room: 'Phòng Mầm 1', subjectNote: `Ca phụ đạo tối - ${b1Lessons[4]?.title || ''}`, lesson: b1Lessons[4]?._id, lessonNumber: 5, lessonTitle: b1Lessons[4]?.title || '' },
      { dayOfWeek: 6, startTime: '07:00', endTime: '21:30', room: 'Phòng Mầm 1', subjectNote: `Ôn tập chủ đề cuối tuần - ${b1Lessons[4]?.title || ''}`, lesson: b1Lessons[4]?._id, lessonNumber: 5, lessonTitle: b1Lessons[4]?.title || '' }
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
      { dayOfWeek: 4, startTime: '09:30', endTime: '10:15', room: 'Phòng Chồi 2', subjectNote: `Interactive Story - ${b2Lessons[2]?.title || ''}`, lesson: b2Lessons[2]?._id, lessonNumber: 3, lessonTitle: b2Lessons[2]?.title || '' },
      { dayOfWeek: 5, startTime: '07:30', endTime: '21:30', room: 'Phòng Chồi 2', subjectNote: `Mini Games Review - ${b2Lessons[3]?.title || ''}`, lesson: b2Lessons[3]?._id, lessonNumber: 4, lessonTitle: b2Lessons[3]?.title || '' },
      { dayOfWeek: 6, startTime: '09:30', endTime: '10:15', room: 'Phòng Chồi 2', subjectNote: `Weekend Story Club - ${b2Lessons[4]?.title || ''}`, lesson: b2Lessons[4]?._id, lessonNumber: 5, lessonTitle: b2Lessons[4]?.title || '' }
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
      { dayOfWeek: 4, startTime: '10:30', endTime: '11:15', room: 'Phòng Lá 3', subjectNote: `Show & Tell - ${b3Lessons[2]?.title || ''}`, lesson: b3Lessons[2]?._id, lessonNumber: 3, lessonTitle: b3Lessons[2]?.title || '' },
      { dayOfWeek: 5, startTime: '08:00', endTime: '21:30', room: 'Phòng Lá 3', subjectNote: `Weekly Challenge - ${b3Lessons[3]?.title || ''}`, lesson: b3Lessons[3]?._id, lessonNumber: 4, lessonTitle: b3Lessons[3]?.title || '' },
      { dayOfWeek: 6, startTime: '10:30', endTime: '11:15', room: 'Phòng Lá 3', subjectNote: `Reading & Drama - ${b3Lessons[4]?.title || ''}`, lesson: b3Lessons[4]?._id, lessonNumber: 5, lessonTitle: b3Lessons[4]?.title || '' }
    ]
  });

  // 7. Create Rich Historical ClassroomSessions across current week (Mon, Tue, Thu COMPLETED; Wed CANCELLED)
  const monStart = new Date(`${monDateStr}T08:30:00.000+07:00`);
  const monEnd = new Date(`${monDateStr}T09:15:00.000+07:00`);
  const tueStart = new Date(`${tueDateStr}T08:30:00.000+07:00`);
  const tueEnd = new Date(`${tueDateStr}T09:15:00.000+07:00`);
  const wedStart = new Date(`${wedDateStr}T08:30:00.000+07:00`);
  const wedEnd = new Date(`${wedDateStr}T09:15:00.000+07:00`);
  const thuStart = new Date(`${thuDateStr}T08:30:00.000+07:00`);
  const thuEnd = new Date(`${thuDateStr}T09:15:00.000+07:00`);

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

  // Class 1 - Session 3 (Wednesday - CANCELLED session to demonstrate lesson preservation)
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
    cancellationNote: `Bài 3 (${b1Lessons[2]?.title || 'What Can You See?'}) được tự động bảo lưu sang buổi học kế tiếp.`,
    cancelledAt: new Date(`${tueDateStr}T19:00:00.000+07:00`),
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

  // Class 1 - Session 4 (Thursday - Lesson 3 COMPLETED with rich stars & accuracy)
  const b1L3Acts = b1Lessons[2] ? await M.Activity.find({ lesson: b1Lessons[2]._id }).limit(3).lean() : [];
  const c1Session3 = await M.ClassroomSession.create({
    classroom: class1._id,
    teacher: teacherSarah._id,
    lesson: b1Lessons[2]?._id,
    title: `${b1Lessons[2]?.title || 'What Can You See?'} — Bé nhìn thấy gì quanh lớp học?`,
    ageGroup: '3-4',
    status: 'COMPLETED',
    sessionNumber: 3,
    startedAt: thuStart,
    endedAt: thuEnd,
    plannedDuration: 45,
    activities: b1L3Acts.map(a => a._id),
    studentScores: [
      { student: childLeo._id, points: 50, stars: 5, correctCount: 5, incorrectCount: 0, notAnswered: 0, attendance: 'PRESENT', status: 'COMPLETED' },
      { student: class1Kids[0]._id, points: 48, stars: 5, correctCount: 5, incorrectCount: 0, notAnswered: 0, attendance: 'PRESENT', status: 'COMPLETED' },
      { student: class1Kids[1]._id, points: 44, stars: 4, correctCount: 4, incorrectCount: 1, notAnswered: 0, attendance: 'PRESENT', status: 'COMPLETED' },
      { student: class1Kids[2]._id, points: 48, stars: 5, correctCount: 5, incorrectCount: 0, notAnswered: 0, attendance: 'PRESENT', status: 'COMPLETED' },
      { student: class1Kids[3]._id, points: 42, stars: 4, correctCount: 4, incorrectCount: 1, notAnswered: 0, attendance: 'PRESENT', status: 'COMPLETED' },
      { student: class1Kids[4]._id, points: 36, stars: 3, correctCount: 3, incorrectCount: 2, notAnswered: 0, attendance: 'PRESENT', status: 'COMPLETED' },
      { student: class1Kids[5]._id, points: 40, stars: 4, correctCount: 4, incorrectCount: 1, notAnswered: 0, attendance: 'PRESENT', status: 'COMPLETED' }
    ],
    teachingOutcome: {
      coverage: 'COMPLETE',
      goalsCovered: ['Hỏi và trả lời mẫu câu What can you see?', 'Nhận diện nhanh 6 thẻ từ vựng qua trò chơi tương tác'],
      reflection: 'Cả 7 bé đi học đầy đủ và đạt độ chính xác trung bình 89%. Bé Ava đã nhớ được toàn bộ từ vựng của bài trước.',
      recordedAt: thuEnd
    },
    summary: {
      participationCount: 7,
      averageAccuracy: 89,
      totalStars: 30,
      totalPoints: 308,
      studentsNeedingPractice: [],
      topPerformers: [childLeo._id, class1Kids[0]._id, class1Kids[2]._id]
    }
  });

  // Class 2 - 3 Completed Sessions (Mon, Tue, Thu)
  await M.ClassroomSession.create({
    classroom: class2._id,
    teacher: teacherEmily._id,
    lesson: b2Lessons[0]?._id,
    title: `${b2Lessons[0]?.title || 'Lesson 1'} — Khám phá từ vựng Lớp Chồi`,
    ageGroup: '4-5',
    status: 'COMPLETED',
    sessionNumber: 1,
    startedAt: new Date(`${monDateStr}T09:30:00.000+07:00`),
    endedAt: new Date(`${monDateStr}T10:15:00.000+07:00`),
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
      recordedAt: new Date(`${monDateStr}T10:15:00.000+07:00`)
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

  const c2Session2 = await M.ClassroomSession.create({
    classroom: class2._id,
    teacher: teacherEmily._id,
    lesson: b2Lessons[1]?._id,
    title: `${b2Lessons[1]?.title || 'Lesson 2'} — Giao tiếp mẫu câu Lớp Chồi`,
    ageGroup: '4-5',
    status: 'COMPLETED',
    sessionNumber: 2,
    startedAt: new Date(`${tueDateStr}T09:30:00.000+07:00`),
    endedAt: new Date(`${tueDateStr}T10:15:00.000+07:00`),
    plannedDuration: 45,
    studentScores: [
      { student: childMia._id, points: 48, stars: 5, correctCount: 5, incorrectCount: 0, notAnswered: 0, attendance: 'PRESENT', status: 'COMPLETED' },
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
      recordedAt: new Date(`${tueDateStr}T10:15:00.000+07:00`)
    },
    summary: {
      participationCount: 6,
      averageAccuracy: 84,
      totalStars: 21,
      totalPoints: 244,
      studentsNeedingPractice: [class2Kids[3]._id],
      topPerformers: [childMia._id, class2Kids[5]._id]
    }
  });

  await M.ClassroomSession.create({
    classroom: class2._id,
    teacher: teacherEmily._id,
    lesson: b2Lessons[2]?._id,
    title: `${b2Lessons[2]?.title || 'Lesson 3'} — Kể chuyện tương tác Lớp Chồi`,
    ageGroup: '4-5',
    status: 'COMPLETED',
    sessionNumber: 3,
    startedAt: new Date(`${thuDateStr}T09:30:00.000+07:00`),
    endedAt: new Date(`${thuDateStr}T10:15:00.000+07:00`),
    plannedDuration: 45,
    studentScores: [
      { student: childMia._id, points: 50, stars: 5, correctCount: 5, incorrectCount: 0, notAnswered: 0, attendance: 'PRESENT', status: 'COMPLETED' },
      { student: class2Kids[0]._id, points: 46, stars: 4, correctCount: 5, incorrectCount: 0, notAnswered: 0, attendance: 'PRESENT', status: 'COMPLETED' },
      { student: class2Kids[1]._id, points: 42, stars: 4, correctCount: 4, incorrectCount: 1, notAnswered: 0, attendance: 'PRESENT', status: 'COMPLETED' },
      { student: class2Kids[2]._id, points: 42, stars: 4, correctCount: 4, incorrectCount: 1, notAnswered: 0, attendance: 'PRESENT', status: 'COMPLETED' },
      { student: class2Kids[3]._id, points: 36, stars: 3, correctCount: 3, incorrectCount: 2, notAnswered: 0, attendance: 'PRESENT', status: 'COMPLETED' },
      { student: class2Kids[4]._id, points: 38, stars: 3, correctCount: 4, incorrectCount: 1, notAnswered: 0, attendance: 'PRESENT', status: 'COMPLETED' },
      { student: class2Kids[5]._id, points: 48, stars: 5, correctCount: 5, incorrectCount: 0, notAnswered: 0, attendance: 'PRESENT', status: 'COMPLETED' }
    ],
    teachingOutcome: {
      coverage: 'COMPLETE',
      goalsCovered: ['Nghe hiểu cốt truyện ngắn', 'Đóng vai nhân vật nói câu thoại tiếng Anh'],
      reflection: 'Cả lớp hào hứng đóng vai nhân vật, Mia và Mason đạt 5 sao tuyệt đối.',
      recordedAt: new Date(`${thuDateStr}T10:15:00.000+07:00`)
    },
    summary: {
      participationCount: 7,
      averageAccuracy: 87,
      totalStars: 28,
      totalPoints: 302,
      studentsNeedingPractice: [],
      topPerformers: [childMia._id, class2Kids[5]._id]
    }
  });

  // Class 3 - 3 Completed Sessions (Mon, Tue, Thu)
  await M.ClassroomSession.create({
    classroom: class3._id,
    teacher: teacherDavid._id,
    lesson: b3Lessons[0]?._id,
    title: `${b3Lessons[0]?.title || 'Lesson 1'} — Thuyết trình & Từ vựng Lớp Lá`,
    ageGroup: '5-6',
    status: 'COMPLETED',
    sessionNumber: 1,
    startedAt: new Date(`${monDateStr}T10:30:00.000+07:00`),
    endedAt: new Date(`${monDateStr}T11:15:00.000+07:00`),
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
      recordedAt: new Date(`${monDateStr}T11:15:00.000+07:00`)
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

  const c3Session2 = await M.ClassroomSession.create({
    classroom: class3._id,
    teacher: teacherDavid._id,
    lesson: b3Lessons[1]?._id,
    title: `${b3Lessons[1]?.title || 'Lesson 2'} — Mẫu câu & Giao tiếp Lớp Lá`,
    ageGroup: '5-6',
    status: 'COMPLETED',
    sessionNumber: 2,
    startedAt: new Date(`${tueDateStr}T10:30:00.000+07:00`),
    endedAt: new Date(`${tueDateStr}T11:15:00.000+07:00`),
    plannedDuration: 45,
    studentScores: [
      { student: childToby._id, points: 50, stars: 5, correctCount: 5, incorrectCount: 0, notAnswered: 0, attendance: 'PRESENT', status: 'COMPLETED' },
      { student: class3Kids[0]._id, points: 46, stars: 4, correctCount: 5, incorrectCount: 0, notAnswered: 0, attendance: 'PRESENT', status: 'COMPLETED' },
      { student: class3Kids[1]._id, points: 44, stars: 4, correctCount: 4, incorrectCount: 1, notAnswered: 0, attendance: 'PRESENT', status: 'COMPLETED' },
      { student: class3Kids[2]._id, points: 40, stars: 3, correctCount: 4, incorrectCount: 1, notAnswered: 0, attendance: 'PRESENT', status: 'COMPLETED' },
      { student: class3Kids[3]._id, points: 42, stars: 4, correctCount: 4, incorrectCount: 1, notAnswered: 0, attendance: 'PRESENT', status: 'COMPLETED' },
      { student: class3Kids[4]._id, points: 32, stars: 2, correctCount: 3, incorrectCount: 2, notAnswered: 0, attendance: 'PRESENT', status: 'NEEDS_PRACTICE' },
      { student: class3Kids[5]._id, points: 42, stars: 4, correctCount: 4, incorrectCount: 1, notAnswered: 0, attendance: 'PRESENT', status: 'COMPLETED' }
    ],
    teachingOutcome: {
      coverage: 'COMPLETE',
      goalsCovered: ['Thực hành hỏi đáp các môn học ở trường', 'Ghép câu hoàn chỉnh theo nhóm'],
      reflection: 'Các bé Lớp Lá nắm vững từ vựng môn học và phản xạ câu rất tốt.',
      recordedAt: new Date(`${tueDateStr}T11:15:00.000+07:00`)
    },
    summary: {
      participationCount: 7,
      averageAccuracy: 87,
      totalStars: 26,
      totalPoints: 296,
      studentsNeedingPractice: [class3Kids[4]._id],
      topPerformers: [childToby._id, class3Kids[0]._id]
    }
  });

  await M.ClassroomSession.create({
    classroom: class3._id,
    teacher: teacherDavid._id,
    lesson: b3Lessons[2]?._id,
    title: `${b3Lessons[2]?.title || 'Lesson 3'} — Thử thách Show & Tell Lớp Lá`,
    ageGroup: '5-6',
    status: 'COMPLETED',
    sessionNumber: 3,
    startedAt: new Date(`${thuDateStr}T10:30:00.000+07:00`),
    endedAt: new Date(`${thuDateStr}T11:15:00.000+07:00`),
    plannedDuration: 45,
    studentScores: [
      { student: childToby._id, points: 50, stars: 5, correctCount: 5, incorrectCount: 0, notAnswered: 0, attendance: 'PRESENT', status: 'COMPLETED' },
      { student: class3Kids[0]._id, points: 48, stars: 5, correctCount: 5, incorrectCount: 0, notAnswered: 0, attendance: 'PRESENT', status: 'COMPLETED' },
      { student: class3Kids[1]._id, points: 44, stars: 4, correctCount: 4, incorrectCount: 1, notAnswered: 0, attendance: 'PRESENT', status: 'COMPLETED' },
      { student: class3Kids[2]._id, points: 42, stars: 4, correctCount: 4, incorrectCount: 1, notAnswered: 0, attendance: 'PRESENT', status: 'COMPLETED' },
      { student: class3Kids[3]._id, points: 46, stars: 4, correctCount: 5, incorrectCount: 0, notAnswered: 0, attendance: 'PRESENT', status: 'COMPLETED' },
      { student: class3Kids[4]._id, points: 36, stars: 3, correctCount: 3, incorrectCount: 2, notAnswered: 0, attendance: 'PRESENT', status: 'COMPLETED' },
      { student: class3Kids[5]._id, points: 44, stars: 4, correctCount: 4, incorrectCount: 1, notAnswered: 0, attendance: 'PRESENT', status: 'COMPLETED' }
    ],
    teachingOutcome: {
      coverage: 'COMPLETE',
      goalsCovered: ['Thuyết trình Show & Tell bằng câu hoàn chỉnh', 'Phát âm chuẩn âm cuối và ngữ điệu câu hỏi'],
      reflection: 'Cả lớp hoàn thành xuất sắc phần Show & Tell, bé Henry đã tiến bộ rõ rệt.',
      recordedAt: new Date(`${thuDateStr}T11:15:00.000+07:00`)
    },
    summary: {
      participationCount: 7,
      averageAccuracy: 90,
      totalStars: 29,
      totalPoints: 310,
      studentsNeedingPractice: [],
      topPerformers: [childToby._id, class3Kids[0]._id]
    }
  });

  // 8. Daily Attendance across all 3 classrooms for recent days & today
  for (const dateStr of [monDateStr, tueDateStr, thuDateStr, todayStr]) {
    await M.Attendance.findOneAndUpdate(
      { classroom: class1._id, date: dateStr },
      {
        classroom: class1._id,
        teacher: teacherSarah._id,
        date: dateStr,
        records: [
          { student: childLeo._id, status: 'PRESENT', note: 'Đi học đúng giờ, rất hào hứng phát biểu' },
          { student: class1Kids[0]._id, status: 'PRESENT', note: 'Tích cực giơ tay' },
          { student: class1Kids[1]._id, status: 'PRESENT', note: '' },
          { student: class1Kids[2]._id, status: 'PRESENT', note: 'Phát âm to rõ ràng' },
          { student: class1Kids[3]._id, status: 'PRESENT', note: '' },
          { student: class1Kids[4]._id, status: dateStr === monDateStr ? 'LATE' : 'PRESENT', note: dateStr === monDateStr ? 'Đến muộn 10 phút' : '' },
          { student: class1Kids[5]._id, status: dateStr === tueDateStr ? 'EXCUSED' : 'PRESENT', note: dateStr === tueDateStr ? 'Xin nghỉ khám răng' : '' }
        ],
        note: `Điểm danh lớp Little Stars ngày ${dateStr}`
      },
      { upsert: true }
    );

    await M.Attendance.findOneAndUpdate(
      { classroom: class2._id, date: dateStr },
      {
        classroom: class2._id,
        teacher: teacherEmily._id,
        date: dateStr,
        records: [
          { student: childMia._id, status: 'PRESENT', note: 'Phát âm mẫu câu rất tự tin' },
          { student: class2Kids[0]._id, status: 'PRESENT', note: '' },
          { student: class2Kids[1]._id, status: dateStr === tueDateStr ? 'EXCUSED' : 'PRESENT', note: '' },
          { student: class2Kids[2]._id, status: 'PRESENT', note: '' },
          { student: class2Kids[3]._id, status: dateStr === monDateStr ? 'LATE' : 'PRESENT', note: '' },
          { student: class2Kids[4]._id, status: 'PRESENT', note: '' },
          { student: class2Kids[5]._id, status: 'PRESENT', note: 'Tương tác nhóm tốt' }
        ],
        note: `Điểm danh lớp Sunny Kindergarten ngày ${dateStr}`
      },
      { upsert: true }
    );

    await M.Attendance.findOneAndUpdate(
      { classroom: class3._id, date: dateStr },
      {
        classroom: class3._id,
        teacher: teacherDavid._id,
        date: dateStr,
        records: [
          { student: childToby._id, status: 'PRESENT', note: 'Hoàn thành xuất sắc phần thuyết trình' },
          { student: class3Kids[0]._id, status: 'PRESENT', note: '' },
          { student: class3Kids[1]._id, status: 'PRESENT', note: '' },
          { student: class3Kids[2]._id, status: dateStr === monDateStr ? 'LATE' : 'PRESENT', note: '' },
          { student: class3Kids[3]._id, status: 'PRESENT', note: '' },
          { student: class3Kids[4]._id, status: 'PRESENT', note: '' },
          { student: class3Kids[5]._id, status: 'PRESENT', note: '' }
        ],
        note: `Điểm danh lớp Rainbow Explorers ngày ${dateStr}`
      },
      { upsert: true }
    );
  }

  // 9. Observations, Home Practice Plan, HomePracticeCompletion, Progress & VocabularyMastery for ALL 21 students across 3 classes!
  const allDemoKids = [childLeo, ...class1Kids, childMia, ...class2Kids, childToby, ...class3Kids];
  await M.Progress.deleteMany({ child: { $in: allDemoKids.map(k => k._id) } });
  await M.VocabularyMastery.deleteMany({ student: { $in: allDemoKids.map(k => k._id) } });

  const seedClassProgressAndVocab = async (students, lessonsList) => {
    for (let sIdx = 0; sIdx < students.length; sIdx++) {
      const student = students[sIdx];
      const isTop = sIdx === 0 || sIdx === 1 || sIdx === 3;
      const isStruggling = sIdx === 5;
      const completedCount = isStruggling ? 2 : 3;
      for (let i = 0; i < completedCount; i++) {
        const lessonDoc = lessonsList[i];
        if (!lessonDoc) continue;
        const score = isTop ? 98 : isStruggling ? 78 : 88;
        const stars = isTop ? 3 : isStruggling ? 2 : 3;
        const attemptDate = new Date(`${i === 0 ? monDateStr : i === 1 ? tueDateStr : thuDateStr}T15:30:00.000+07:00`);
        await M.Progress.create({
          child: student._id,
          topic: lessonDoc.topic,
          lesson: lessonDoc._id,
          completed: true,
          stars,
          highestScore: score,
          stage1Score: Math.min(100, score + 2),
          stage2Score: score,
          stage3Score: score,
          attempts: 2,
          stage1Completed: true,
          stage2Completed: true,
          stage3Completed: true,
          correctAnswers: isTop ? 9 : isStruggling ? 7 : 8,
          incorrectAnswers: isTop ? 1 : isStruggling ? 3 : 2,
          lastAttemptAt: attemptDate,
          completionSnapshot: {
            stars,
            highestScore: score,
            correctAnswers: isTop ? 9 : 8,
            incorrectAnswers: isTop ? 1 : 2,
            attempts: 1,
            recordedAt: attemptDate
          }
        });
      }
      // Next lesson in progress for primary demo kids (Leo, Mia, Toby)
      if (sIdx === 0 && lessonsList[3]) {
        await M.Progress.create({
          child: student._id,
          topic: lessonsList[3].topic,
          lesson: lessonsList[3]._id,
          completed: false,
          stars: 1,
          highestScore: 95,
          stage1Score: 95,
          attempts: 1,
          stage1Completed: true,
          stage2Completed: false,
          stage3Completed: false,
          correctAnswers: 4,
          incorrectAnswers: 0,
          lastAttemptAt: new Date(`${yesterdayStr}T19:30:00.000+07:00`)
        });
      }

      // Seed VocabularyMastery for lessons 1-3
      const vocabs = [
        ...(lessonsList[0]?.vocabularyItems || []),
        ...(lessonsList[1]?.vocabularyItems || []),
        ...(lessonsList[2]?.vocabularyItems || [])
      ];
      for (let vIdx = 0; vIdx < vocabs.length; vIdx++) {
        const v = vocabs[vIdx];
        if (!v?._id) continue;
        const weakWord = (isStruggling && vIdx < 4) || (!isTop && vIdx === 0);
        await M.VocabularyMastery.findOneAndUpdate(
          { student: student._id, vocabulary: v._id },
          {
            student: student._id,
            vocabulary: v._id,
            correctCount: weakWord ? 1 : isTop ? 6 : 4,
            wrongCount: weakWord ? 3 : isTop ? 0 : 1,
            attemptCount: weakWord ? 4 : isTop ? 6 : 5,
            streak: weakWord ? 0 : isTop ? 4 : 2,
            masteryLevel: weakWord ? 1 : isTop ? 4 : 3,
            lastReviewedAt: new Date(`${yesterdayStr}T16:00:00.000+07:00`)
          },
          { upsert: true }
        );
      }
    }
  };

  await seedClassProgressAndVocab([childLeo, ...class1Kids], b1Lessons);
  await seedClassProgressAndVocab([childMia, ...class2Kids], b2Lessons);
  await seedClassProgressAndVocab([childToby, ...class3Kids], b3Lessons);

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

  // HomePracticeCompletion history for Leo, Mia, Toby (recent days completed, today left open to demo 5-min review!)
  await M.HomePracticeCompletion.deleteMany({ child: { $in: [childLeo._id, childMia._id, childToby._id] } });
  for (const [demoChild, lessonsArr] of [[childLeo, b1Lessons], [childMia, b2Lessons], [childToby, b3Lessons]]) {
    await M.HomePracticeCompletion.create({
      child: demoChild._id,
      date: twoDaysAgoStr,
      lesson: lessonsArr[0]?._id,
      stars: 3,
      completedAt: new Date(`${twoDaysAgoStr}T20:00:00.000+07:00`)
    });
    await M.HomePracticeCompletion.create({
      child: demoChild._id,
      date: yesterdayStr,
      lesson: lessonsArr[1]?._id,
      stars: 3,
      completedAt: new Date(`${yesterdayStr}T20:00:00.000+07:00`)
    });
  }

  // Also create Observations & HomePracticePlans for Mia and Toby
  for (const [demoChild, demoClass, demoTeacher, demoSession, lessonsArr, ageCode] of [
    [childMia, class2, teacherEmily, c2Session2, b2Lessons, '4-5'],
    [childToby, class3, teacherDavid, c3Session2, b3Lessons, '5-6']
  ]) {
    const lessonDoc = lessonsArr[1] || lessonsArr[0];
    if (!lessonDoc) continue;
    const obsDoc = await M.LearningObservation.create({
      child: demoChild._id,
      classroom: demoClass._id,
      teacher: demoTeacher._id,
      lesson: lessonDoc._id,
      session: demoSession._id,
      skill: 'EXPRESS',
      vocabulary: (lessonDoc.vocabularyItems || []).slice(0, 3).map(v => v._id),
      unitKey: ageCode === '4-5' ? 'B2_U1' : 'B3_U1',
      unitLabel: 'Unit 1 - Welcome to Class',
      level: 'INDEPENDENT',
      evidence: `Bé ${demoChild.name} phát âm chuẩn xác, phản xạ mẫu câu tiếng Anh tự nhiên và rất tích cực tham gia hoạt động nhóm trên lớp.`,
      nextStep: 'Khuyến khích bé kể lại câu chuyện ngắn và ôn 3 từ vựng cùng ba mẹ tại nhà.',
      consentConfirmed: true,
      observedAt: new Date(`${tueDateStr}T10:10:00.000+07:00`),
      operationId: `obs_demo_${demoChild.username}_${Date.now()}`,
      payloadHash: `demo_hash_${demoChild.username}_obs_01`
    });

    await M.HomePracticePlan.create({
      child: demoChild._id,
      classroom: demoClass._id,
      teacher: demoTeacher._id,
      lesson: lessonDoc._id,
      sourceSession: demoSession._id,
      revision: 1,
      status: 'APPROVED',
      operationId: `plan_demo_${demoChild.username}_${Date.now()}`,
      payloadHash: `demo_hash_${demoChild.username}_plan_01`,
      lessonTitle: lessonDoc.title,
      ageGroupCode: ageCode,
      teacherNote: `Ba mẹ dành 5 phút buổi tối cùng bé ${demoChild.name} ôn lại các từ vựng và mẫu câu vừa học trên lớp nhé!`,
      words: (lessonDoc.vocabularyItems || []).slice(0, 3).map(v => ({
        vocabulary: v._id,
        english: v.english,
        vietnamese: v.vietnamese,
        imageUrl: v.imageUrl,
        audioUrl: v.audioUrl,
        wordType: 'noun',
        reason: 'Từ vựng trọng tâm buổi học trên lớp'
      })),
      homeActivity: {
        title: 'Thử thách 5 phút phản xạ tiếng Anh cùng ba mẹ',
        steps: [
          'Ba mẹ mở thẻ từ vựng và cùng bé đọc to 2 lần mỗi từ',
          'Bé đặt 1 câu ngắn với từ vừa học và nhận lời khen từ ba mẹ'
        ]
      },
      observations: [
        {
          observation: obsDoc._id,
          skill: obsDoc.skill,
          level: obsDoc.level,
          evidence: obsDoc.evidence,
          nextStep: obsDoc.nextStep
        }
      ]
    });
  }

  // 10. Parent Notifications (Family Notebook Inbox for Leo, Mia, Toby)
  await M.ParentNotification.create({
    teacher: teacherSarah._id,
    child: childLeo._id,
    session: c1Session3._id,
    recipientContact: '0901234567',
    childName: 'Leo',
    className: class1.name,
    sessionDate: thuEnd,
    subject: 'Báo cáo buổi học — Bé Leo đạt 5 sao xuất sắc!',
    content: 'Trong buổi học What Can You See?, bé Leo đã tham gia rất hăng say, trả lời đúng 5/5 câu hỏi tương tác và phát âm to rõ ràng.',
    teacherNote: 'Leo nhớ từ vựng rất nhanh và luôn nhiệt tình giúp đỡ các bạn trong nhóm. Ba mẹ cùng bé ôn lại 5 phút ở nhà nhé!',
    score: 100,
    vocabMastered: 5,
    vocabTotal: 5,
    stars: 5,
    accuracy: 100,
    templateType: 'SESSION_REPORT',
    status: 'SENT',
    sentAt: new Date(thuEnd.getTime() + 5 * 60000)
  });

  await M.ParentNotification.create({
    teacher: teacherSarah._id,
    child: childLeo._id,
    recipientContact: '0901234567',
    childName: 'Leo',
    className: class1.name,
    sessionDate: wedStart,
    subject: `Thông báo nghỉ học — Lớp Little Stars Class (Age 3–4) (${wedDateStr})`,
    content: `Kính gửi Quý Phụ huynh bé Leo, lớp Little Stars Class (Age 3–4) xin thông báo tạm nghỉ buổi học ngày ${wedDateStr}. Lý do: Họp hội đồng sư phạm định kỳ của nhà trường. Bài học trong lộ trình sẽ được bảo lưu sang buổi học kế tiếp.`,
    teacherNote: 'Bài 3 được bảo lưu sang Thứ Năm.',
    templateType: 'GENERAL',
    status: 'SENT',
    sentAt: new Date(`${tueDateStr}T19:00:00.000+07:00`)
  });

  await M.ParentNotification.create({
    teacher: teacherEmily._id,
    child: childMia._id,
    session: c2Session2._id,
    recipientContact: '0901234567',
    childName: 'Mia',
    className: class2.name,
    sessionDate: new Date(`${tueDateStr}T10:15:00.000+07:00`),
    subject: 'Báo cáo buổi học — Bé Mia đạt 5 sao xuất sắc!',
    content: 'Bé Mia phát âm mẫu câu rất tự tin và hoàn thành xuất sắc các hoạt động đóng vai cùng bạn.',
    teacherNote: 'Ba mẹ khuyến khích bé kể lại câu chuyện ngắn bằng tiếng Anh tối nay nhé!',
    score: 100,
    vocabMastered: 5,
    vocabTotal: 5,
    stars: 5,
    accuracy: 100,
    templateType: 'SESSION_REPORT',
    status: 'SENT',
    sentAt: new Date(`${tueDateStr}T10:20:00.000+07:00`)
  });

  await M.ParentNotification.create({
    teacher: teacherDavid._id,
    child: childToby._id,
    session: c3Session2._id,
    recipientContact: '0901234567',
    childName: 'Toby',
    className: class3.name,
    sessionDate: new Date(`${tueDateStr}T11:15:00.000+07:00`),
    subject: 'Báo cáo buổi học — Bé Toby dẫn đầu phần thuyết trình!',
    content: 'Bé Toby hoàn thành xuất sắc phần thuyết trình câu hoàn chỉnh trước lớp với 5 sao tuyệt đối.',
    teacherNote: 'Toby phát âm rất chuẩn và tự tin làm mẫu cho cả lớp.',
    score: 100,
    vocabMastered: 5,
    vocabTotal: 5,
    stars: 5,
    accuracy: 100,
    templateType: 'SESSION_REPORT',
    status: 'SENT',
    sentAt: new Date(`${tueDateStr}T11:20:00.000+07:00`)
  });

  // 11. Published ClassRecognition & SchoolRecognition for Previous Week
  const lastWeekStart = new Date(`${lastMonDateStr}T00:00:00.000+07:00`);
  const lastWeekEnd = new Date(`${monDateStr}T00:00:00.000+07:00`);

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
    { action: 'CREATE_CLASSROOM', targetType: 'ClassRoom', targetId: String(class1._id), details: { name: class1.name, ageGroupCode: '3-4', teacher: teacherSarah.name }, createdAt: new Date(`${monDateStr}T08:00:00.000+07:00`) },
    { action: 'CREATE_CLASSROOM', targetType: 'ClassRoom', targetId: String(class2._id), details: { name: class2.name, ageGroupCode: '4-5', teacher: teacherEmily.name }, createdAt: new Date(`${monDateStr}T08:05:00.000+07:00`) },
    { action: 'CREATE_CLASSROOM', targetType: 'ClassRoom', targetId: String(class3._id), details: { name: class3.name, ageGroupCode: '5-6', teacher: teacherDavid.name }, createdAt: new Date(`${monDateStr}T08:10:00.000+07:00`) },
    { action: 'UPDATE_SCHEDULE', targetType: 'Schedule', targetId: String(class1._id), details: { classroom: class1.name, slotsCount: 7, status: 'ACTIVE' }, createdAt: new Date(`${tueDateStr}T10:30:00.000+07:00`) },
    { action: 'AUTO_ASSIGN_CURRICULUM_SCHEDULES', targetType: 'Schedule', targetId: String(class1._id), details: { classroomCount: 3, assignedSlots: 17 }, createdAt: new Date(`${wedDateStr}T14:15:00.000+07:00`) },
    { action: 'EXPORT_SYSTEM_BACKUP', targetType: 'SystemBackup', targetId: admin._id, details: { collectionsCount: 38, format: 'JSON Snapshot v3.4' }, createdAt: new Date(`${thuDateStr}T21:00:00.000+07:00`) }
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
