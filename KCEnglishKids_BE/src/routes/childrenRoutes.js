const express = require('express');
const router = express.Router();
const {
  getChildProgress,
  getLessonProgress,
  updateStageProgress
} = require('../controllers/progressController');
const vocabMasteryController = require('../controllers/vocabMasteryController');
const clientStateController = require('../controllers/clientStateController');
const { getChildRewards, revealChildChest } = require('../controllers/rewardController');
const { protect, ownChildOr403, childRewardReadAccess } = require('../middlewares/authMiddleware');
const early = require('../controllers/earlyLearningController');
router.get('/:childId/arcade',protect,ownChildOr403(),require('../controllers/arcadeController').library);
router.get('/:childId/home-practice',protect,ownChildOr403(),require('../controllers/homePracticeController').family);
router.post('/:childId/home-practice/complete',protect,ownChildOr403(),require('../controllers/homePracticeController').complete);
router.get('/:childId/lesson-guide/:id', protect, ownChildOr403(), early.guide);
router.get('/:childId/observations', protect, ownChildOr403(), early.familyList);
router.get('/:childId/observations/:id/media', protect, ownChildOr403(), early.media);

/**
 * §3.1.2/§3.1.11/§3.1.12 — every :childId route is `protect` + `ownChildOr403`.
 * (Previously /api/children was mounted twice with no auth at all → IDOR.)
 *
 * Order matters: static segments (rewards, vocabulary-mastery) are declared
 * after `/:childId/progress`, which is fine — Express matches exact paths.
 */

// Progress summary + weak vocabulary
router.get('/:childId/review-plan', protect, ownChildOr403(), async(req,res,next)=>{try{res.json({success:true,data:await require('../services/learningInsights').reviewPlan(req.params.childId)});}catch(error){next(error);}});
router.get('/:childId/weekly-summary', protect, ownChildOr403(), async(req,res,next)=>{try{res.json({success:true,data:await require('../services/learningInsights').weeklySummary(req.params.childId)});}catch(error){next(error);}});
router.get('/:childId/progress', protect, ownChildOr403(), getChildProgress);

// §1.3.1 — 3-stage pipeline: per-lesson stage state (server is source of truth)
router.get('/:childId/progress/:lessonId', protect, ownChildOr403(), getLessonProgress);
router.get('/:childId/progress/:lessonId/plan', protect, ownChildOr403(), async(req,res,next)=>{try{
  await require('../services/childAccess').assertChildAccess(req,req.params.childId,true);
  res.json({success:true,data:await require('../services/learningPlan').createPlan(req.params.childId,req.params.lessonId)});
}catch(error){next(error);}});
router.put('/:childId/progress/:lessonId/stage', protect, ownChildOr403(), updateStageProgress);

// Vocabulary mastery (Phase 5)
router.get('/:childId/vocabulary-mastery', protect, ownChildOr403(), vocabMasteryController.getChildMastery);
router.post('/:childId/vocabulary-mastery', protect, ownChildOr403(), vocabMasteryController.syncMastery);
router.post('/:childId/vocabulary-mastery/:vocabId/record', protect, ownChildOr403(), vocabMasteryController.recordPractice);

// Vocabulary notebook grouped by Unit → Lesson + Leitner review schedule
router.get('/:childId/vocabulary-notebook', protect, ownChildOr403(), vocabMasteryController.getNotebook);
router.get('/:childId/vocabulary-review/due', protect, ownChildOr403(), vocabMasteryController.getDueReview);
router.post('/:childId/vocabulary-review/:vocabId', protect, ownChildOr403(), vocabMasteryController.recordReview);

// §1.2 — rewards (stars + chests + stickers)
router.get('/:childId/rewards', protect, childRewardReadAccess, getChildRewards);
router.post('/:childId/rewards/chests/:unitId/reveal', protect, ownChildOr403(), revealChildChest);

// Cross-device MongoDB Client State (vocabStats, stage2Sessions, lesson checkpoints, self-marks, preferences)
router.get('/:childId/client-state', protect, ownChildOr403(), clientStateController.getClientState);
router.put('/:childId/client-state', protect, ownChildOr403(), clientStateController.updateClientState);
router.delete('/:childId/client-state/vocab-stats', protect, ownChildOr403(), clientStateController.clearVocabStats);

// Parent communications & feedback exchange (Sổ liên lạc phụ huynh)
const pn = require('../controllers/parentNotificationController');
const { User, ClassRoom, Schedule, ClassroomSession } = require('../models');

router.get('/:childId/parent-notifications', protect, ownChildOr403(), pn.getChildNotificationsForParent);
router.patch('/:childId/parent-notifications/:id/read', protect, ownChildOr403(), pn.markAsReadByParent);
router.post('/:childId/parent-notifications/:id/feedback', protect, ownChildOr403(), pn.sendParentFeedback);

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
          schedule: null,
          cancelledSessions: []
        }
      });
    }

    const [classroom, schedule, rawCancelledSessions] = await Promise.all([
      ClassRoom.findById(child.assignedClass)
        .populate('teacher', 'name email avatar')
        .lean(),
      Schedule.findOne({ classroom: child.assignedClass, isActive: true })
        .populate('teacher', 'name email avatar')
        .populate('classroom', 'name room academicYear ageGroup')
        .sort({ createdAt: -1 })
        .lean(),
      ClassroomSession.find({ classroom: child.assignedClass, status: 'CANCELLED' })
        .select('startedAt endedAt createdAt cancellationReason cancellationNote status')
        .sort({ startedAt: -1 })
        .limit(30)
        .lean()
    ]);

    const cancelledSessions = (rawCancelledSessions || []).map(sess => {
      const sDate = sess.startedAt || sess.createdAt;
      const dateStr = sDate
        ? new Date(sDate).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })
        : '';
      const dayOfWeek = sDate
        ? new Date(new Date(sDate).toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' })).getDay()
        : null;
      return {
        ...sess,
        dateString: dateStr,
        dayOfWeek
      };
    });

    return res.json({
      success: true,
      data: {
        classroom,
        schedule,
        cancelledSessions
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

