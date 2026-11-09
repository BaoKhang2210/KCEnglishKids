require('dotenv').config();
const mongoose = require('mongoose');
const { Schedule, ClassRoom, Lesson, ClassroomSession, Attendance, User, Activity } = require('./src/models');
const rules = require('./src/services/teacherRules');

async function main() {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/kcenglishkids';
  await mongoose.connect(uri);
  console.log('Connected to DB:', uri);

  // 1. Get teacher
  const teacher = await User.findOne({ username: 'teacher_sarah', role: 'TEACHER' });
  if (!teacher) throw new Error('Teacher teacher_sarah not found');
  console.log('Teacher:', teacher.name, `(${teacher.username})`);

  // 2. Get class
  const classroom = await ClassRoom.findOne({ teacher: teacher._id, status: 'ACTIVE' });
  if (!classroom) throw new Error('Classroom not found for teacher');
  console.log('Classroom:', classroom.name, `(ID: ${classroom._id})`);

  // 3. Get lesson 2: "People at school"
  const lesson = await Lesson.findOne({
    title: { $regex: /People at school/i },
    ageGroupCode: classroom.ageGroupCode,
    status: 'ACTIVE'
  }).populate('vocabularyItems');
  if (!lesson) throw new Error('Lesson "People at school" not found');
  console.log('Lesson:', lesson.title, `(ID: ${lesson._id}, Vocab: ${lesson.vocabularyItems?.length || 0})`);

  // 4. Get activities for this lesson
  const activities = await Activity.find({ lesson: lesson._id, status: 'ACTIVE' });
  console.log('Activities count:', activities.length);

  // 5. Ensure timetable schedule covers today (and everyday) with Lesson 2
  const now = new Date();
  const effectiveFrom = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
  const effectiveTo = new Date(now.getTime() + 365 * 24 * 3600 * 1000);

  // Build weeklySlots for all days (0 to 6)
  const weeklySlots = [0, 1, 2, 3, 4, 5, 6].map(day => ({
    dayOfWeek: day,
    startTime: '07:00',
    endTime: '22:30',
    lesson: lesson._id,
    notes: 'Demo Buổi dạy: People at school'
  }));

  await Schedule.deleteMany({ classroom: classroom._id });
  const schedule = await Schedule.create({
    classroom: classroom._id,
    teacher: teacher._id,
    effectiveFrom,
    effectiveTo,
    isActive: true,
    weeklySlots
  });
  console.log('✓ Created/Updated Schedule for all days with Lesson 2:', schedule._id);

  // 6. Ensure Attendance for today
  const vnToday = rules.vnDate();
  console.log('Vietnam Date today:', vnToday);

  const students = await User.find({ _id: { $in: classroom.students } });
  console.log(`Found ${students.length} students in class.`);

  const attendanceRecords = students.map(s => ({
    student: s._id,
    status: 'PRESENT',
    note: 'Có mặt đầy đủ'
  }));

  await Attendance.findOneAndUpdate(
    { classroom: classroom._id, date: vnToday },
    {
      classroom: classroom._id,
      date: vnToday,
      takenBy: teacher._id,
      records: attendanceRecords,
      note: 'Điểm danh đầu giờ demo'
    },
    { upsert: true, new: true }
  );
  console.log('✓ Attendance created/updated for today.');

  // 7. Check if there's any active LIVE session, mark as COMPLETED first so no conflict
  await ClassroomSession.updateMany(
    { classroom: classroom._id, status: 'LIVE' },
    { status: 'COMPLETED', endedAt: new Date() }
  );

  // 8. Create a fresh LIVE session
  const prevSessions = await ClassroomSession.find({ classroom: classroom._id });
  const sessionNumber = prevSessions.length + 1;

  const studentScores = students.map(s => ({
    student: s._id,
    stars: 0,
    correctCount: 0,
    incorrectCount: 0,
    attendance: 'PRESENT'
  }));

  const session = await ClassroomSession.create({
    classroom: classroom._id,
    teacher: teacher._id,
    lesson: lesson._id,
    title: `Buổi ${sessionNumber}: ${lesson.title} - Mọi người ở trường`,
    sessionNumber,
    plannedDuration: 25,
    includeWarmup: true,
    activities: activities.map(a => a._id),
    status: 'LIVE',
    startedAt: new Date(),
    studentScores
  });

  console.log('\n======================================================');
  console.log('BUỔI DẠY DEMO ĐÃ ĐƯỢC MỞ THÀNH CÔNG VÀ ĐANG TRỰC TIẾP (LIVE)!');
  console.log('======================================================');
  console.log(`- Mã buổi dạy (Session ID): ${session._id}`);
  console.log(`- Lớp học: ${classroom.name}`);
  console.log(`- Giáo viên: ${teacher.name} (${teacher.username})`);
  console.log(`- Bài học: ${lesson.title} (${lesson.vocabularyItems?.length || 0} từ vựng, ${activities.length} trò chơi)`);
  console.log(`- Sĩ số điểm danh: ${students.length} học sinh (tất cả có mặt)`);
  console.log('\nĐƯỜNG DẪN TRỰC TIẾP VÀO PHÒNG DẠY (LIVE):');
  console.log(`http://localhost:5173/teacher/classroom-sessions/${session._id}/live`);
  console.log('\nHOẶC TRANG CHUẨN BỊ BUỔI DẠY MỚI (SETUP):');
  console.log(`http://localhost:5173/teacher/classroom-sessions/new?classroomId=${classroom._id}`);
  console.log('\nTHÔNG TIN ĐĂNG NHẬP GIÁO VIÊN:');
  console.log('URL: http://localhost:5173/teacher/login');
  console.log('Tài khoản: teacher@kcenglishkids.com (hoặc teacher_sarah)');
  console.log('Mật khẩu: Teacher@123');
  console.log('======================================================\n');

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('ERROR:', err);
  process.exit(1);
});
