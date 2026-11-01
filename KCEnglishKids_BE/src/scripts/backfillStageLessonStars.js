/**
 * Safely normalize stage-based Progress rows to one star per completed stage.
 * Dry-run by default; applying updates only the denormalized `Progress.stars`
 * mirror and leaves accuracy fields such as stage2Stars untouched.
 *
 * Dry run (default): node src/scripts/backfillStageLessonStars.js
 * Apply (non-production only): node src/scripts/backfillStageLessonStars.js --apply
 */
const mongoose = require('mongoose');
require('dotenv').config();
const { Progress } = require('../models');

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required; refusing to use an implicit database.');
  const apply = process.argv.includes('--apply');
  if (apply && process.env.NODE_ENV === 'production') throw new Error('Refusing to apply this backfill with NODE_ENV=production.');
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
  try {
    const stageStarExpression = { $add: [
      { $cond: [{ $eq: ['$stage1Completed', true] }, 1, 0] },
      { $cond: [{ $eq: ['$stage2Completed', true] }, 1, 0] },
      { $cond: [{ $or: [
        { $eq: ['$stage3Completed', true] },
        { $gte: [{ $size: { $ifNull: ['$stage3Games', []] } }, 2] }
      ] }, 1, 0] }
    ] };
    const query = {
      $or: [
        { 'completionSnapshot.source': 'STAGES' },
        { stage1Completed: true }, { stage2Completed: true }, { stage3Completed: true }
      ],
      $expr: { $ne: ['$stars', stageStarExpression] }
    };
    const rows = await Progress.find(query).select('child lesson stars stage1Completed stage2Completed stage3Completed stage3Games').lean();
    console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', database: mongoose.connection.name, mismatches: rows.length, sample: rows.slice(0, 20).map(row => ({ child: String(row.child), lesson: String(row.lesson), oldStars: row.stars, stage1Completed: row.stage1Completed, stage2Completed: row.stage2Completed, stage3Completed: row.stage3Completed })) }, null, 2));
    if (!apply || !rows.length) return;
    const result = await Progress.updateMany(query, [{ $set: { stars: stageStarExpression } }]);
    console.log(`Normalized ${result.modifiedCount || 0} Progress rows.`);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
