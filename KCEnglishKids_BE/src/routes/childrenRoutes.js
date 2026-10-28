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
const { Assignment, User, ClassRoom, Schedule } = require('../models');

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
      classRoom: child.assignedClass || null,
      $and: [
        { $or: [{ student: childId }, { assignedToType: 'CLASS' }] },
        { $or: [{ recipients: { $exists: false } }, { recipients: childId }] },
        { $or: [{ startDate: null }, { startDate: { $lte: new Date() } }] }
      ]
    };
    const assignments = await Assignment.find(q)
      .populate({ path: 'lesson', select: 'title vietnameseTitle', match: { status: 'ACTIVE' } })
      .populate('activity', 'title activityType instructions passingScore maxScore')
      .populate('teacher', 'name')
      .sort({ createdAt: -1 });

    const dataWithStatus = await Promise.all(assignments.filter(a => a.lesson).map(async a => {
      const aObj = a.toObject();
      const { data } = await require('../services/teacherAssignments').submissions(a, [{ _id: childId }]);
      aObj.isCompleted = data[0]?.hasSubmitted || false;
      aObj.result = data[0]?.submission || null;
      return aObj;
    }));

    res.json({ success: true, count: dataWithStatus.length, data: dataWithStatus });
  } catch (e) {
    next(e);
  }
});

// Child school schedule (Thời khóa biểu trên lớp)
router.get('/:childId/schedule', protect, ownChildOr403(), async (req, res, next) => {
  try {
    const { childId } = req.params;
    const child = await User.findById(childId).select('assignedClass name');
    if (!child) return res.status(404).json({ success: false, message: 'Child not found' });

    if (!child.assignedClass) {
      return res.json({
        success: true,
        data: {
          classroom: null,
          schedule: null
        }
      });
    }

    const classroom = await ClassRoom.findById(child.assignedClass)
      .populate('teacher', 'name email avatar')
      .lean();

    const schedule = await Schedule.findOne({ classroom: child.assignedClass, isActive: true })
      .populate('teacher', 'name email avatar')
      .populate('classroom', 'name room academicYear ageGroup')
      .lean();

    return res.json({
      success: true,
      data: {
        classroom,
        schedule
      }
    });
  } catch (e) {
    next(e);
  }
});

// Daily Streak for child (Chuỗi ngày học)
const { getChildStreak, testChildStreakLevel } = require('../controllers/streakController');
router.get('/:childId/streak', protect, ownChildOr403(), getChildStreak);
router.post('/:childId/streak/test-level', protect, ownChildOr403(), testChildStreakLevel);

module.exports = router;

