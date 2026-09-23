import mongoose from 'mongoose';

async function main() {
  await mongoose.connect('mongodb://localhost:27017/kcenglishkids');
  const Activity = mongoose.model('Activity', new mongoose.Schema({}, { strict: false }));
  const Lesson = mongoose.model('Lesson', new mongoose.Schema({}, { strict: false }));
  const AgeGroup = mongoose.model('AgeGroup', new mongoose.Schema({}, { strict: false }));

  const ageGroups = await AgeGroup.find();
  console.log('AgeGroups:', ageGroups.map(a => ({ code: a.code, name: a.name })));

  const agg = await Activity.aggregate([
    { $group: { _id: '$activityType', count: { $sum: 1 } } }
  ]);
  console.log('Activity count by activityType:', agg);

  for (const ag of ageGroups) {
    const lessons = await Lesson.find({ ageGroup: ag._id });
    const lessonIds = lessons.map(l => l._id);
    const actTypes = await Activity.aggregate([
      { $match: { lesson: { $in: lessonIds } } },
      { $group: { _id: '$activityType', count: { $sum: 1 } } }
    ]);
    console.log(`AgeGroup ${ag.code} (${ag.name}) activities:`, actTypes);
  }

  await mongoose.disconnect();
}

main().catch(console.error);
