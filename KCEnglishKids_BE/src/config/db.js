const mongoose = require('mongoose');
module.exports = async function connectDB() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required.');
  try { return await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 }); }
  catch { throw new Error('Cannot connect to the configured database.'); }
};
