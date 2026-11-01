const express = require('express');
const router = express.Router();
const {
  getChildAvatars,
  childLogin,
  childRegister,
  adminLogin,
  teacherLogin,
  getMe,
  changePin,
  lookupStudent,
  recoveryOptions,
  recoveryBegin,
  recoveryComplete,
  teacherRecoveryBegin,
  teacherRecoveryComplete,
  recoveryStatus,
  recoverySetup,
  recoveryCodeRotate
} = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');

router.use(require('../middlewares/authRateLimit'));
router.use((req,res,next)=>{
  for(const key of ['identifier','email','phone','contact','password','pin','currentPin','newPin','childId','avatar','name','ageGroupCode','token','code','newPassword']) {
    if(req.body?.[key]!==undefined && (typeof req.body[key]!=='string'||req.body[key].length>300)) return res.status(400).json({success:false,message:'Thông tin đăng nhập không hợp lệ.'});
  }
  if(req.body?.pictures!==undefined && (!Array.isArray(req.body.pictures)||req.body.pictures.length>8||req.body.pictures.some(p=>typeof p!=='string'||p.length>40))) return res.status(400).json({success:false,message:'Thông tin đăng nhập không hợp lệ.'});
  next();
});
router.get('/children-avatars', protect, getChildAvatars);
router.post('/child-login', childLogin);
router.post('/child-register', childRegister);
router.post('/admin-login', adminLogin);
router.post('/teacher-login', teacherLogin);
router.get('/me', protect, getMe);
router.post('/change-pin', protect, changePin);
router.post('/lookup-student', protect, lookupStudent);
router.get('/recovery-options', recoveryOptions);
router.post('/recovery-begin', recoveryBegin);
router.post('/recovery-complete', recoveryComplete);
router.post('/teacher-recovery-begin', teacherRecoveryBegin);
router.post('/teacher-recovery-complete', teacherRecoveryComplete);
router.get('/recovery-status', protect, recoveryStatus);
router.post('/recovery-setup', protect, recoverySetup);
router.post('/recovery-code', protect, recoveryCodeRotate);

module.exports = router;
