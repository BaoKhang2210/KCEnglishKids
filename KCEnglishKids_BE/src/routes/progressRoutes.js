const express = require('express');
const router = express.Router();
const { getChildProgress, exportChildData } = require('../controllers/progressController');
const { protect, authorize } = require('../middlewares/authMiddleware');

// GET /api/children/:id/progress
router.get('/:id/progress', getChildProgress);

// GET /api/children/:id/export?format=json|csv
// CHILD may only export their own data (enforced in controller).
// TEACHER and ADMIN may export any child's data.
router.get(
  '/:id/export',
  protect,
  authorize('CHILD', 'TEACHER', 'ADMIN'),
  exportChildData
);

module.exports = router;
