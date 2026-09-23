const mongoose = require('mongoose');
require('dotenv').config();
const { User, AgeGroup } = require('../models');

async function syncAges() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/kcenglishkids');
  const age34 = await AgeGroup.findOne({ code: '3-4' });
  const age45 = await AgeGroup.findOne({ code: '4-5' });
  const age56 = await AgeGroup.findOne({ code: '5-6' });

  const leo = await User.findOne({ email: 'leo@kcenglishkids.com' });
  if (leo) {
    leo.ageGroupCode = '3-4';
    leo.ageGroup = age34?._id;
    await leo.save();
  }

  const mia = await User.findOne({ email: 'mia@kcenglishkids.com' });
  if (mia) {
    mia.ageGroupCode = '4-5';
    mia.ageGroup = age45?._id;
    await mia.save();
  }

  const toby = await User.findOne({ email: 'toby@kcenglishkids.com' });
  if (toby) {
    toby.ageGroupCode = '5-6';
    toby.ageGroup = age56?._id;
    await toby.save();
  }

  const children = await User.find({ role: 'CHILD' }).lean();
  children.forEach(c => console.log('Child:', c.name, c.email, 'Age:', c.ageGroupCode));
  await mongoose.disconnect();
}

syncAges();
