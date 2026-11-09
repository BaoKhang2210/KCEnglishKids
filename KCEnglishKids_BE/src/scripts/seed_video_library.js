require('dotenv').config({ path: require('node:path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const { seedVideoLibrary } = require('../services/videoSeed');

async function main() {
  await connectDB();
  const result = await seedVideoLibrary({ log: true });
  console.log(`[VideoSeed] done (series ${result.seriesCreated}, episodes ${result.episodesCreated}).`);
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(`[VideoSeed] ${error.message}`);
  process.exitCode = 1;
});
