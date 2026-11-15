const mongoose = require('mongoose');
const dns = require('dns');

// Fix lỗi Windows Node.js querySrv ECONNREFUSED khi phân giải domain mongodb+srv
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (_) {}

module.exports = async function connectDB() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required.');
  try {
    return await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
  } catch (err) {
    if (err.message && (err.message.includes('querySrv') || err.message.includes('ECONNREFUSED'))) {
      const fallbackDirectUri = process.env.ATLAS_DIRECT_URI || 'mongodb://baokhang8a1_db_user:baokhang2210@ac-nrzyhhf-shard-00-00.c6kcrc6.mongodb.net:27017,ac-nrzyhhf-shard-00-01.c6kcrc6.mongodb.net:27017,ac-nrzyhhf-shard-00-02.c6kcrc6.mongodb.net:27017/kcenglishkids?ssl=true&authSource=admin&retryWrites=true&w=majority';
      try {
        console.warn('[DB] SRV lookup bi chan, tu dong chuyen sang ket noi Atlas truc tiep...');
        return await mongoose.connect(fallbackDirectUri, { serverSelectionTimeoutMS: 10000 });
      } catch (directErr) {
        throw new Error('Cannot connect to the configured database: ' + directErr.message);
      }
    }
    throw new Error('Cannot connect to the configured database: ' + err.message);
  }
};
