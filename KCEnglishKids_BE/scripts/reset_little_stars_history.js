const mongoose = require('mongoose');
require('dotenv').config();
require('../src/models/User');
const Lesson = require('../src/models/Lesson');
const Activity = require('../src/models/Activity');
const ClassRoom = require('../src/models/ClassRoom');
const ClassroomSession = require('../src/models/ClassroomSession');
const Attendance = require('../src/models/Attendance');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const room = await ClassRoom.findOne({ name: /Little Stars/i }).populate('students').populate('teacher');
  const l1 = await Lesson.findOne({ key: 'B1_U1_L1' });
  const l2 = await Lesson.findOne({ key: 'B1_U1_L2' });
  const l1Activities = await Activity.find({ lesson: l1._id }).limit(3);

  console.log('Room:', room.name, 'L1:', l1.title, 'L2:', l2.title);

  // 1. Delete all existing sessions for Little Stars
  const delRes = await ClassroomSession.deleteMany({ classroom: room._id });
  console.log('Deleted existing sessions count:', delRes.deletedCount);

  // 2. Delete existing attendance for Little Stars
  const delAtt = await Attendance.deleteMany({ classroom: room._id });
  console.log('Deleted existing attendance records count:', delAtt.deletedCount);

  // 3. Create Session 1: Things at School (Completed on Monday 09/11/2026)
  const session1Date = new Date('2026-11-09T08:30:00.000+07:00');
  const session1End = new Date('2026-11-09T09:15:00.000+07:00');

  const studentScores = room.students.map((st, idx) => ({
    student: st._id,
    points: 40 + (idx % 3) * 5,
    stars: 3 - (idx === 5 ? 1 : 0),
    correctCount: 4 + (idx % 2),
    incorrectCount: idx === 5 ? 2 : 0,
    notAnswered: 0,
    attendance: idx === 6 ? 'EXCUSED' : 'PRESENT',
    status: idx === 6 ? 'ACTIVE' : 'COMPLETED'
  }));

  const session1 = await ClassroomSession.create({
    classroom: room._id,
    teacher: room.teacher._id,
    lesson: l1._id,
    title: 'Things at School - Khám phá đồ dùng học tập',
    ageGroup: '3-4',
    status: 'COMPLETED',
    sessionNumber: 1,
    startedAt: session1Date,
    endedAt: session1End,
    plannedDuration: 45,
    activities: l1Activities.map(a => a._id),
    studentScores,
    summary: {
      participationCount: room.students.length - 1,
      averageAccuracy: 92,
      totalStars: 18,
      totalPoints: 275,
      studentsNeedingPractice: [],
      topPerformers: [room.students[0]._id, room.students[1]._id]
    },
    teachingOutcome: {
      coverage: 'COMPLETE',
      goalsCovered: [
        'Nhận biết các đồ dùng học tập quen thuộc (book, crayon, pencil)',
        'Phát âm chuẩn từ vựng căn bản',
        'Hào hứng tham gia tương tác trò chơi cùng Koko'
      ],
      reflection: 'Các bé lớp Little Stars rất hứng thú với buổi học đầu tiên của giáo trình. Bé Leo và Emma phát âm to, rõ ràng.',
      recordedAt: session1End
    }
  });
  console.log('Created Session 1:', session1._id, session1.title);

  // 4. Create Attendance record for 2026-11-09
  await Attendance.create({
    classroom: room._id,
    teacher: room.teacher._id,
    date: '2026-11-09',
    records: room.students.map((st, idx) => ({
      student: st._id,
      status: idx === 6 ? 'EXCUSED' : 'PRESENT',
      note: idx === 6 ? 'Phụ huynh xin nghỉ phép' : 'Đúng giờ'
    })),
    note: 'Điểm danh buổi học đầu tiên: Things at School'
  });
  console.log('Created Attendance for 2026-11-09');

  // 5. Update Little Stars currentLesson to Lesson 2 (People at School)
  await ClassRoom.updateOne(
    { _id: room._id },
    { $set: { currentLesson: l2._id } }
  );
  console.log('Updated Little Stars currentLesson to Lesson 2:', l2.title);

  await mongoose.disconnect();
  console.log('DONE ALL SUCCESSFULLY!');
}
run().catch(console.error);
