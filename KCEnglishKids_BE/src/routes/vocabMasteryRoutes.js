const express = require('express');
const router = express.Router();
const vm = require('../controllers/vocabMasteryController');
const { protect, authorize, optionalProtect } = require('../middlewares/authMiddleware');

// Child views their own mastery (or teacher/admin sees it)
router.get('/:childId/vocabulary-mastery', protect, vm.getChildMastery);

// Child (or teacher) syncs localStorage data → DB
router.post('/:childId/vocabulary-mastery', protect, vm.syncMastery);

// Record a single practice attempt (called per-answer in games)
router.post('/:childId/vocabulary-mastery/:vocabId/record', protect, vm.recordPractice);

module.exports = router;
