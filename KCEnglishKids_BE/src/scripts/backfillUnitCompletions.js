/**
 * §1.2.10 — Backfill UnitCompletion for children who finished units BEFORE the
 * reward model existed. Without this, the treasure shelf is empty on demo day.
 *
 * Rules:
 *  - A unit is complete when EVERY ACTIVE lesson attached to it has a Progress
 *    doc with completed === true.
 *  - Creates UnitCompletion with source 'SEED_BACKFILL' and revealedAt: now
 *    (plan §1.2.10 — avoid dozens of blinking red dots for past units).
 *  - Idempotent: existing (child, unit) docs are skipped.
 *
 * Run:  node src/scripts/backfillUnitCompletions.js
 * (run BEFORE the demo, AFTER progress data exists)
 */
const mongoose = require('mongoose');
require('dotenv').config();
const { Progress, Lesson, CurriculumUnit, UnitCompletion } = require('../models');
const { pickSticker, STAR_BONUS_PER_UNIT } = require('../services/rewardService');

async function backfill() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/kcenglishkids');
  console.log('Connected to', mongoose.connection.name);

  // All completed progress docs, grouped by child
  const completedProgress = await Progress.find({ completed: true }).lean();
  console.log(`Found ${completedProgress.length} completed lesson records.`);

  const byChild = new Map();
  for (const p of completedProgress) {
    const key = p.child.toString();
    if (!byChild.has(key)) byChild.set(key, new Set());
    byChild.get(key).add(p.lesson.toString());
  }

  let createdCount = 0;
  let skippedCount = 0;

  for (const [childId, completedLessonIds] of byChild.entries()) {
    // Which units do these completed lessons belong to?
    const lessons = await Lesson.find({ _id: { $in: [...completedLessonIds] } })
      .select('curriculumUnits')
      .lean();

    const unitIds = new Set();
    for (const l of lessons) {
      for (const u of l.curriculumUnits || []) unitIds.add(u.toString());
    }

    for (const unitId of unitIds) {
      const unit = await CurriculumUnit.findById(unitId);
      if (!unit || unit.status !== 'ACTIVE') continue;

      const unitLessons = await Lesson.find({ curriculumUnits: unit._id, status: 'ACTIVE' })
        .select('_id')
        .lean();
      if (unitLessons.length === 0) continue;

      const allDone = unitLessons.every((l) => completedLessonIds.has(l._id.toString()));
      if (!allDone) continue;

      const existing = await UnitCompletion.findOne({ child: childId, unit: unit._id });
      if (existing) {
        skippedCount++;
        continue;
      }

      try {
        await UnitCompletion.create({
          child: childId,
          unit: unit._id,
          unitCode: `B${unit.bookNumber}_U${unit.unitNumber}`,
          completedAt: new Date(),
          source: 'SEED_BACKFILL',
          rewards: [
            { type: 'STAR', amount: STAR_BONUS_PER_UNIT, grantedAt: new Date() },
            { type: 'STICKER', refId: pickSticker(unit), grantedAt: new Date() }
          ],
          // Already "opened" — avoids 27 blinking chests for old progress
          revealedAt: new Date()
        });
        createdCount++;
        console.log(`  + ${unit.bookNumber}.${unit.unitNumber} for child ${childId}`);
      } catch (e) {
        if (e.code === 11000) skippedCount++;
        else throw e;
      }
    }
  }

  console.log(`\nDone. Created: ${createdCount}, Skipped (already had): ${skippedCount}`);
  await mongoose.disconnect();
}

backfill().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
