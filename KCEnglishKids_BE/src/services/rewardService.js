const { UnitCompletion, Progress, Lesson, CurriculumUnit, AuditLog, ClassroomSession } = require('../models');

/**
 * §1.2 — Server-side reward engine.
 *
 * Rules (single source of truth):
 *  - A unit is COMPLETE when every ACTIVE lesson of that unit has a
 *    Progress doc with completed === true (§4.11: completion is owned by
 *    the Progress collection, never inferred from stars).
 *  - On completion the server AUTO-grants: +5 bonus stars and 1 sticker
 *    (deterministic per unit, NOT per completion count — §1.2.21).
 *  - Idempotent: unique index {child, unit} + catch E11000.
 *  - `revealedAt` is COSMETIC only — rewards are never lost if not opened.
 */

const STAR_BONUS_PER_UNIT = 5;

// Same 15 sticker ids as client/src/data/stickers.ts
const STICKER_IDS = [
  'st_lion',
  'st_tiger',
  'st_panda',
  'st_rocket',
  'st_trophy',
  'st_rainbow',
  'st_star',
  'st_unicorn',
  'st_dino',
  'st_apple',
  'st_artist',
  'st_dolphin',
  'st_crown',
  'st_balloon',
  'st_strawberry'
];

/**
 * Deterministic sticker per unit — same unit always gives the same sticker,
 * so the chest on the home page never changes after completion (§1.2.21).
 */
const pickSticker = (unit) => {
  const bookNumber = unit.bookNumber || 1;
  const unitNumber = unit.unitNumber || 1;
  const idx = ((bookNumber - 1) * 9 + (unitNumber - 1)) % STICKER_IDS.length;
  return STICKER_IDS[idx];
};

const buildUnitCode = (unit) => `B${unit.bookNumber || '?'}_U${unit.unitNumber || '?'}`;

/**
 * Grant the completion record for (child, unit). Idempotent.
 * Returns { doc, created }.
 */
const grantUnitCompletion = async ({ childId, unit, source = 'LESSON_PROGRESS' }) => {
  const rewards = [
    { type: 'STAR', amount: STAR_BONUS_PER_UNIT, grantedAt: new Date() },
    { type: 'STICKER', refId: pickSticker(unit), grantedAt: new Date() }
  ];

  try {
    const doc = await UnitCompletion.create({
      child: childId,
      unit: unit._id,
      unitCode: buildUnitCode(unit),
      completedAt: new Date(),
      source,
      rewards
    });

    // §4.22 — audit trail (fire-and-forget; must never break the grant)
    AuditLog.create({
      user: childId,
      action: 'GRANT_REWARD',
      targetType: 'Unit',
      targetId: unit._id,
      details: { unitCode: buildUnitCode(unit), source, rewards }
    }).catch(() => {});

    return { doc, created: true };
  } catch (error) {
    if (error.code === 11000) {
      const doc = await UnitCompletion.findOne({ child: childId, unit: unit._id });
      return { doc, created: false };
    }
    throw error;
  }
};

/**
 * Check if `lessonId`'s unit(s) are now fully complete for `childId`,
 * and grant rewards for any newly completed unit.
 * Returns array of granted UnitCompletion docs (may be empty).
 */
const checkAndGrantUnitCompletion = async (childId, lessonId) => {
  const granted = [];

  const lesson = await Lesson.findById(lessonId).select('curriculumUnits');
  if (!lesson || !lesson.curriculumUnits || lesson.curriculumUnits.length === 0) {
    return granted;
  }

  for (const unitId of lesson.curriculumUnits) {
    const unit = await CurriculumUnit.findById(unitId);
    if (!unit || unit.status !== 'ACTIVE') continue;

    // All ACTIVE lessons attached to this unit
    const unitLessons = await Lesson.find({ curriculumUnits: unit._id, status: 'ACTIVE' }).select('_id');
    if (unitLessons.length === 0) continue;

    const lessonIds = unitLessons.map((l) => l._id);
    const completedCount = await Progress.countDocuments({
      child: childId,
      lesson: { $in: lessonIds },
      completed: true
    });

    if (completedCount >= lessonIds.length) {
      const { doc, created } = await grantUnitCompletion({ childId, unit });
      if (created && doc) granted.push(doc);
    }
  }

  return granted;
};

/**
 * Aggregate reward state for a child. Single source of truth for the UI:
 *   totalStars = Σ Progress.stars (earned) + Σ UnitCompletion STAR (bonus)
 */
const computeRewards = async (childId) => {
  const [progressDocs, completions, classroomSessions] = await Promise.all([
    Progress.find({ child: childId }).select('stars completed lesson'),
    UnitCompletion.find({ child: childId })
      .populate('unit', 'bookNumber unitNumber bigQuestion storyTitle status')
      .sort({ completedAt: 1 }),
    ClassroomSession.find({ 'studentScores.student': childId }).select('studentScores')
  ]);

  const earnedStars = progressDocs.reduce((sum, p) => sum + (p.stars || 0), 0);
  const completedLessons = progressDocs.filter((p) => p.completed).length;

  let classroomStars = 0;
  for (const cs of classroomSessions) {
    const row = (cs.studentScores || []).find((s) => String(s.student) === String(childId));
    if (row && row.stars) classroomStars += row.stars;
  }

  let bonusStars = 0;
  const grantedStickerIds = [];
  const chests = [];

  for (const c of completions) {
    const starReward = (c.rewards || []).find((r) => r.type === 'STAR');
    const stickerReward = (c.rewards || []).find((r) => r.type === 'STICKER');
    bonusStars += starReward ? starReward.amount || 0 : 0;
    if (stickerReward && stickerReward.refId) grantedStickerIds.push(stickerReward.refId);

    chests.push({
      id: c._id,
      unitId: c.unit ? c.unit._id : null,
      unitCode: c.unitCode,
      unitNumber: c.unit ? c.unit.unitNumber : null,
      bookNumber: c.unit ? c.unit.bookNumber : null,
      title: c.unit ? c.unit.bigQuestion : null,
      completedAt: c.completedAt,
      revealedAt: c.revealedAt,
      rewards: {
        stars: starReward ? starReward.amount || 0 : 0,
        stickerId: stickerReward ? stickerReward.refId : null
      }
    });
  }

  return {
    totalStars: earnedStars + bonusStars + classroomStars,
    earnedStars,
    bonusStars,
    classroomStars,
    completedUnits: completions.length,
    completedLessons,
    totalLessonsAttempted: progressDocs.length,
    grantedStickerIds,
    chests
  };
};

/**
 * Reveal (open) a chest — COSMETIC ONLY.
 * Idempotent: first reveal wins; rewards already granted at completion.
 */
const revealChest = async (childId, unitId) => {
  const completion = await UnitCompletion.findOne({ child: childId, unit: unitId });
  if (!completion) return { found: false, doc: null };

  if (!completion.revealedAt) {
    completion.revealedAt = new Date();
    await completion.save();

    // §4.22 — audit trail (fire-and-forget)
    AuditLog.create({
      user: childId,
      action: 'REVEAL_CHEST',
      targetType: 'Unit',
      targetId: completion.unit,
      details: { unitCode: completion.unitCode }
    }).catch(() => {});
  }
  return { found: true, doc: completion };
};

module.exports = {
  STAR_BONUS_PER_UNIT,
  STICKER_IDS,
  pickSticker,
  grantUnitCompletion,
  checkAndGrantUnitCompletion,
  computeRewards,
  revealChest
};
