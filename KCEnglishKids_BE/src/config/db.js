const mongoose = require('mongoose');
const dns = require('dns');

// Tránh lỗi Node.js SRV ECONNREFUSED trên Windows khi kết nối Mongo Atlas
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // ignore
}

const connectDB = async () => {
  const candidates = [
    process.env.MONGODB_URI,
    'mongodb://127.0.0.1:27017/kcenglishkids',
    'mongodb://localhost:27017/kcenglishkids'
  ].filter(Boolean);

  for (const uri of candidates) {
    try {
      const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 3000 });
      console.log(`[MongoDB Connected]: ${conn.connection.host} (DB: ${conn.connection.name})`);
      return conn;
    } catch (err) {
      const safeUri = uri.includes('@') ? uri.split('@')[1] : uri;
      console.warn(`[MongoDB Warning]: Ket noi den ${safeUri} khong thanh cong: ${err.message}. Dang thu ket noi tiep theo...`);
    }
  }
  console.error('[MongoDB Connection Error]: Tat ca cac dia chi MongoDB deu khong the ket noi.');
  process.exit(1);
};

module.exports = connectDB;
