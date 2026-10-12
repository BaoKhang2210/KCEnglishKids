const express = require('express');
const router = express.Router();
const {
  getChildProgress,
  getLessonProgress,
  updateStageProgress
} = require('../controllers/progressController');
const vocabMasteryController = require('../controllers/vocabMasteryController');
const { getChildRewards, revealChildChest } = require('../controllers/rewardController');
const { protect, ownChildOr403 } = require('../middlewares/authMiddleware');

/**
 * §3.1.2/§3.1.11/§3.1.12 — every :childId route is `protect` + `ownChildOr403`.
 * (Previously /api/children was mounted twice with no auth at all → IDOR.)
 *
 * Order matters: static segments (rewards, vocabulary-mastery) are declared
 * after `/:childId/progress`, which is fine — Express matches exact paths.
 */

// Progress summary + weak vocabulary
router.get('/:childId/progress', protect, ownChildOr403(), getChildProgress);

// §1.3.1 — 3-stage pipeline: per-lesson stage state (server is source of truth)
router.get('/:childId/progress/:lessonId', protect, ownChildOr403(), getLessonProgress);
router.put('/:childId/progress/:lessonId/stage', protect, ownChildOr403(), updateStageProgress);

// Vocabulary mastery (Phase 5)
router.get('/:childId/vocabulary-mastery', protect, ownChildOr403(), vocabMasteryController.getChildMastery);
router.post('/:childId/vocabulary-mastery', protect, ownChildOr403(), vocabMasteryController.syncMastery);
router.post('/:childId/vocabulary-mastery/:vocabId/record', protect, ownChildOr403(), vocabMasteryController.recordPractice);

// §1.2 — rewards (stars + chests + stickers)
router.get('/:childId/rewards', protect, ownChildOr403(), getChildRewards);
router.post('/:childId/rewards/chests/:unitId/reveal', protect, ownChildOr403(), revealChildChest);

// Parent communications & feedback exchange (Sổ liên lạc phụ huynh)
const pn = require('../controllers/parentNotificationController');
const { Assignment, User, ActivityResult } = require('../models');

router.get('/:childId/parent-notifications', protect, ownChildOr403(), pn.getChildNotificationsForParent);
router.post('/:childId/parent-notifications/:id/reply', protect, ownChildOr403(), pn.replyAsParent);
router.patch('/:childId/parent-notifications/:id/read', protect, ownChildOr403(), pn.markAsReadByParent);

// Child assignments (Bài cô giáo giao)
router.get('/:childId/assignments', protect, ownChildOr403(), async (req, res, next) => {
  try {
    const { childId } = req.params;
    const child = await User.findById(childId).select('assignedClass');
    if (!child) return res.status(404).json({ success: false, message: 'Child not found' });
    const q = {
      status: { $in: ['ASSIGNED', 'IN_PROGRESS'] },
      $or: [
        { student: childId },
        ...(child.assignedClass ? [{ classRoom: child.assignedClass, assignedToType: 'CLASS' }] : [])
      ]
    };
    const assignments = await Assignment.find(q)
      .populate('lesson', 'title vietnameseTitle')
      .populate('activity', 'title activityType instructions passingScore maxScore')
      .populate('teacher', 'name')
      .sort({ createdAt: -1 });

    const dataWithStatus = await Promise.all(assignments.map(async (a) => {
      const aObj = a.toObject();
      const resQuery = {
        child: childId,
        ...(a.activity ? { activity: a.activity._id } : { lesson: a.lesson._id })
      };
      const result = await ActivityResult.findOne(resQuery)
        .select('score stars duration completed createdAt teacherFeedback')
        .sort({ createdAt: -1 });

      aObj.isCompleted = !!result;
      aObj.result = result || null;
      return aObj;
    }));

    res.json({ success: true, count: dataWithStatus.length, data: dataWithStatus });
  } catch (e) {
    next(e);
  }
});

// Daily Streak for child (Chuỗi ngày học)
const { getChildStreak, testChildStreakLevel } = require('../controllers/streakController');
router.get('/:childId/streak', protect, ownChildOr403(), getChildStreak);
router.post('/:childId/streak/test-level', protect, ownChildOr403(), testChildStreakLevel);

module.exports = router;

