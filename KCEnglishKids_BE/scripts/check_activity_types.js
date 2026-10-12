const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb://localhost:27017/kcenglishkids');
  const db = mongoose.connection.db;
  const acts = await db.collection('activities').aggregate([
    { $group: { _id: '$activityType', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]).toArray();
  console.log('Activity Types in DB:', JSON.stringify(acts, null, 2));
  await mongoose.disconnect();
}

run();
