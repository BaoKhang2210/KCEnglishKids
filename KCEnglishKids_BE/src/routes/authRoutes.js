const express = require('express');
const router = express.Router();
const {
  getChildAvatars,
  childLogin,
  childRegister,
  adminLogin,
  teacherLogin,
  getMe
} = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');

router.get('/children-avatars', getChildAvatars);
router.post('/child-login', childLogin);
router.post('/child-register', childRegister);
router.post('/admin-login', adminLogin);
router.post('/teacher-login', teacherLogin);
router.get('/me', protect, getMe);

module.exports = router;
