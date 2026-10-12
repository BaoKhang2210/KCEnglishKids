const { computeRewards, revealChest } = require('../services/rewardService');
const { UnitCompletion } = require('../models');

// @desc    Get full reward state for a child (stars, chests, stickers)
// @route   GET /api/children/:childId/rewards
// @access  Private (own child / TEACHER / ADMIN via ownChildOr403)
const getChildRewards = async (req, res, next) => {
  try {
    const { childId } = req.params;
    const rewards = await computeRewards(childId);

    res.status(200).json({
      success: true,
      data: rewards
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reveal (open) a chest for a completed unit — COSMETIC, idempotent
// @route   POST /api/children/:childId/rewards/chests/:unitId/reveal
// @access  Private (own child)
const revealChildChest = async (req, res, next) => {
  try {
    const { childId, unitId } = req.params;
    const { found, doc } = await revealChest(childId, unitId);

    if (!found) {
      return res.status(404).json({
        success: false,
        message: 'No chest found for this unit yet. Complete all lessons of the unit first!'
      });
    }

    const stickerReward = (doc.rewards || []).find((r) => r.type === 'STICKER');
    const starReward = (doc.rewards || []).find((r) => r.type === 'STAR');

    res.status(200).json({
      success: true,
      data: {
        chestId: doc._id,
        unitId: doc.unit,
        unitCode: doc.unitCode,
        revealedAt: doc.revealedAt,
        rewards: {
          stars: starReward ? starReward.amount || 0 : 0,
          stickerId: stickerReward ? stickerReward.refId : null
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin overview of the reward system
// @route   GET /api/admin/rewards/summary
// @access  Private / ADMIN
const getRewardsSummary = async (req, res, next) => {
  try {
    const completions = await UnitCompletion.find()
      .populate('child', 'name avatar avatarUrl')
      .populate('unit', 'bookNumber unitNumber bigQuestion')
      .sort({ completedAt: -1 });

    let totalStarsGranted = 0;
    let totalStickersGranted = 0;
    let totalRevealed = 0;
    const byUnitMap = {};
    const childSet = new Set();

    const recentGrants = [];

    for (const c of completions) {
      childSet.add(String(c.child ? c.child._id : c._id));

      for (const r of c.rewards || []) {
        if (r.type === 'STAR') totalStarsGranted += r.amount || 0;
        if (r.type === 'STICKER') totalStickersGranted += 1;
      }
      if (c.revealedAt) totalRevealed++;

      const unitKey = c.unitCode || 'UNKNOWN';
      if (!byUnitMap[unitKey]) {
        byUnitMap[unitKey] = {
          unitCode: unitKey,
          title: c.unit ? c.unit.bigQuestion : null,
          completions: 0
        };
      }
      byUnitMap[unitKey].completions += 1;

      if (recentGrants.length < 10) {
        recentGrants.push({
          childName: c.child ? c.child.name : 'Unknown',
          childAvatar: c.child ? c.child.avatarUrl || c.child.avatar : null,
          unitCode: c.unitCode,
          completedAt: c.completedAt,
          revealed: Boolean(c.revealedAt)
        });
      }
    }

    res.status(200).json({
      success: true,
      data: {
        totalCompletions: completions.length,
        totalChildrenWithRewards: childSet.size,
        totalStarsGranted,
        totalStickersGranted,
        totalRevealed,
        revealRate: completions.length > 0 ? Math.round((totalRevealed / completions.length) * 100) : 0,
        byUnit: Object.values(byUnitMap).sort((a, b) => a.unitCode.localeCompare(b.unitCode)),
        recentGrants
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getChildRewards,
  revealChildChest,
  getRewardsSummary
};
