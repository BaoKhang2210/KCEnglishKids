const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

async function checkLiveDB() {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/kcenglishkids');
    const db = mongoose.connection.db;

    console.log('=== THONG TIN KET NOI MONGODB THUC TE ===');
    console.log('Database Name:', db.databaseName);
    console.log('Host/Port:', `${conn.connection.host}:${conn.connection.port}`);
    console.log('ReadyState:', conn.connection.readyState === 1 ? '1 (CONNECTED THANH CONG)' : conn.connection.readyState);

    console.log('\n=== DANH SACH COLLECTIONS VA SO LUONG BAN GHI TRONG MONGODB ===');
    const collections = await db.listCollections().toArray();
    for (const col of collections) {
      const count = await db.collection(col.name).countDocuments();
      console.log(`- ${col.name.padEnd(20)}: ${count} ban ghi`);
    }

    console.log('\n=== BAN GHI KET QUA CHOI THAT TU TRINH DUYET (ActivityResult) ===');
    const latestResult = await db.collection('activityresults').find().sort({ createdAt: -1 }).limit(1).toArray();
    if (latestResult.length > 0) {
      console.log(JSON.stringify(latestResult[0], null, 2));
    }

    console.log('\n=== TIEN DO HOC CUA BE LEO TRONG MONGODB (Progress) ===');
    const leoProgress = await db.collection('progresses').find().toArray();
    if (leoProgress.length > 0) {
      console.log(JSON.stringify(leoProgress[0], null, 2));
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Loi ket noi:', err);
    process.exit(1);
  }
}

checkLiveDB();
