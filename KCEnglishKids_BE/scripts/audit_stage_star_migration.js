// Read-only dry run. It intentionally never writes or alters existing stars.
require('dotenv').config();
const mongoose = require('mongoose');
const { Progress } = require('../src/models');
const { completedStageCount } = require('../src/services/stageStarPolicy');

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required for the read-only audit.');
  await mongoose.connect(process.env.MONGODB_URI);
  const cursor = Progress.find({ $or: [{ 'completionSnapshot.source': 'STAGES' }, { stars: { $gt: 0 } }, { stage2Stars: { $gt: 0 } }, { stage1Completed: true }, { stage2Completed: true }, { stage3Completed: true }, { stage3Games: { $exists: true, $ne: [] } }] })
    .select('child lesson stars stage2Stars stage1Completed stage2Completed stage3Completed stage3Games')
    .lean().cursor();
  let rows = 0;
  let children = new Set();
  let childrenWithLegacyExcess = new Set();
  let lessonsWouldDecrease = 0;
  let lessonsWithLegacyStage2Stars = 0;
  let wouldIncrease = 0;
  let oldTotal = 0;
  let proposedTotal = 0;
  for await (const row of cursor) {
    rows += 1;
    children.add(String(row.child));
    const oldStars = Math.max(0, Math.min(3, Number(row.stars) || 0));
    // Preserve the current visible total until an explicit migration approval.
    const canonicalStars = Math.min(3, completedStageCount(row));
    const proposed = Math.max(oldStars, canonicalStars);
    if (oldStars > canonicalStars) { lessonsWouldDecrease += 1; childrenWithLegacyExcess.add(String(row.child)); }
    if (Number(row.stage2Stars) > 0) lessonsWithLegacyStage2Stars += 1;
    if (proposed > oldStars) wouldIncrease += 1;
    oldTotal += oldStars;
    proposedTotal += proposed;
  }
  console.log(JSON.stringify({ mode: 'DRY_RUN_READ_ONLY', records: rows, children: children.size, childrenWithLegacyExcess: childrenWithLegacyExcess.size, lessonsWithLegacyStage2Stars, lessonsWouldIncrease: wouldIncrease, lessonsWouldDecreaseUnderCanonicalRules: lessonsWouldDecrease, lessonsPreservedForNoDecreasePolicy: lessonsWouldDecrease, currentVisibleStars: oldTotal, visibleStarsWithNoDecreasePolicy: proposedTotal, migrationApplied: false, writesPerformed: 0 }, null, 2));
  await mongoose.disconnect();
}

main().catch(async error => { console.error(error); await mongoose.disconnect(); process.exitCode = 1; });
