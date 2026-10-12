const express = require('express');
const c = require('../controllers/sentencePatternController');
const { protect, authorize } = require('../middlewares/authMiddleware');
const router = express.Router();

router.use(protect, authorize('TEACHER', 'ADMIN'));

// Units that actually contain teachable sentence content (drives the picker)
router.get('/units-overview', c.unitsOverview);
// Flat teaching list with filters: ageGroupCode, unitId, lessonId, topicId, contentType, search
router.get('/', c.list);

module.exports = router;
