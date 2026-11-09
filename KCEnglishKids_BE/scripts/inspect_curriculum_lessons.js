const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb://localhost:27017/kcenglishkids');
  const { Lesson, CurriculumBook, CurriculumUnit, Schedule, ClassRoom } = require('../src/models');

  const books = await CurriculumBook.find().lean();
  console.log('Books count:', books.length);
  for (const b of books) {
    console.log(`\nBook ${b.bookNumber}: ${b.title} (Age ${b.ageGroup})`);
    const units = await CurriculumUnit.find({ bookNumber: b.bookNumber }).sort({ unitNumber: 1 }).lean();
    console.log(`  Units count: ${units.length}`);
    for (const u of units) {
      const lessons = await Lesson.find({ curriculumUnits: u._id }).sort({ displayOrder: 1 }).lean();
      console.log(`    Unit ${u.unitNumber} (${u.bigQuestion}): ${lessons.length} lessons`);
      lessons.forEach((l, i) => {
        console.log(`      L${i+1}: [${l._id}] ${l.title} (${l.vietnameseTitle || ''})`);
      });
    }
  }

  console.log('\n--- Classrooms and current schedules ---');
  const classes = await ClassRoom.find().populate('teacher', 'name').lean();
  for (const c of classes) {
    const sch = await Schedule.findOne({ classroom: c._id }).lean();
    console.log(`Class: ${c.name} (${c.ageGroupCode}) | Teacher: ${c.teacher?.name} | Active: ${c.status}`);
    console.log(`  Schedule ID: ${sch?._id} | Active: ${sch?.isActive} | Slots: ${sch?.weeklySlots?.length || 0}`);
    if (sch?.weeklySlots) {
      sch.weeklySlots.forEach((s, idx) => {
        console.log(`    Slot ${idx+1}: Day ${s.dayOfWeek} ${s.startTime}-${s.endTime} | Room: ${s.room} | Lesson: ${s.lessonNumber} - ${s.lessonTitle}`);
      });
    }
  }

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});

