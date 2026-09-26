const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const { User, ClassRoom } = require('../src/models');

const EMOJI_MAP = {
  lion: '🦁',
  panda: '🐼',
  rabbit: '🐰',
  bear: '🐻',
  fox: '🦊',
  koala: '🐨'
};

const BG_COLORS = [
  '#FFE0B2', '#FFCDD2', '#F8BBD0', '#B3E5FC', '#C8E6C9',
  '#DCEDC8', '#FFF9C4', '#D1C4E9', '#E1BEE7', '#FFCCBC'
];

function createCardSvg(name, bg, emoji) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200"><rect width="200" height="200" rx="40" fill="${bg}"/><text x="100" y="125" font-size="95" text-anchor="middle" dominant-baseline="middle">${emoji}</text></svg>`
  )}`;
}

async function addFullClass() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/kcenglishkids');
  console.log('Connected to DB');

  const demoClass = await ClassRoom.findOne({ status: 'ACTIVE' });
  if (!demoClass) {
    console.error('No active class found');
    process.exit(1);
  }

  const additionalStudents = [
    { name: 'Emma', avatar: 'fox', pin: '2001' },
    { name: 'Liam', avatar: 'bear', pin: '2002' },
    { name: 'Sophia', avatar: 'koala', pin: '2003' },
    { name: 'Noah', avatar: 'lion', pin: '2004' },
    { name: 'Ava', avatar: 'rabbit', pin: '2005' },
    { name: 'Oliver', avatar: 'panda', pin: '2006' },
    { name: 'Lucas', avatar: 'fox', pin: '2007' },
    { name: 'Isabella', avatar: 'koala', pin: '2008' },
    { name: 'Ethan', avatar: 'bear', pin: '2009' },
    { name: 'Harper', avatar: 'rabbit', pin: '2010' },
    { name: 'Chloe', avatar: 'panda', pin: '2011' },
    { name: 'Mason', avatar: 'lion', pin: '2012' },
    { name: 'James', avatar: 'fox', pin: '2013' },
    { name: 'Ella', avatar: 'koala', pin: '2014' },
    { name: 'Jackson', avatar: 'bear', pin: '2015' },
    { name: 'Lily', avatar: 'rabbit', pin: '2016' },
    { name: 'Henry', avatar: 'panda', pin: '2017' },
    { name: 'Grace', avatar: 'fox', pin: '2018' }
  ];

  const studentIds = [...demoClass.students];

  for (let i = 0; i < additionalStudents.length; i++) {
    const s = additionalStudents[i];
    const email = `${s.name.toLowerCase()}@kcenglishkids.com`;
    let user = await User.findOne({ email });
    if (!user) {
      const emoji = EMOJI_MAP[s.avatar] || '🦁';
      const bg = BG_COLORS[i % BG_COLORS.length];
      user = new User({
        role: 'CHILD',
        name: s.name,
        email,
        phone: `09000000${(i + 1).toString().padStart(2, '0')}`,
        contact: `09000000${(i + 1).toString().padStart(2, '0')}`,
        parentContact: `parent.${s.name.toLowerCase()}@example.com`,
        avatar: s.avatar,
        avatarUrl: createCardSvg(s.name, bg, emoji),
        password: '123456',
        pin: s.pin,
        ageGroup: demoClass.ageGroup,
        ageGroupCode: demoClass.ageGroupCode || '3-4',
        assignedClass: demoClass._id,
        status: 'ACTIVE'
      });
      await user.save();
      console.log(`Created child: ${s.name} (${email})`);
    }

    if (!studentIds.some(id => String(id) === String(user._id))) {
      studentIds.push(user._id);
    }
  }

  demoClass.students = studentIds;
  await demoClass.save();
  console.log(`Updated class ${demoClass.name}: now has ${studentIds.length} students!`);

  await mongoose.disconnect();
}

addFullClass().catch(e => { console.error(e); process.exit(1); });
