const { jwtSecret } = require('../config/auth');
const jwt = require('jsonwebtoken');
const { User, AgeGroup } = require('../models');
const recovery = require('../services/accountRecovery');

const generateToken = (id, role, extra = {}) => {
  return jwt.sign(
    { id, role, ...extra },
    jwtSecret(),
    { expiresIn: '30d' }
  );
};

// @desc    Get child avatars list for visual login
// @route   GET /api/auth/children-avatars
// @access  Public
const getChildAvatars = async (req, res, next) => {
  try {
    if (!['TEACHER', 'ADMIN'].includes(req.user.role)) return res.status(403).json({ success: false, message: 'Access denied.' });
    const allowed = req.user.role === 'ADMIN' ? {} : { _id: { $in: await require('../services/teacherAccess').studentIds(req) } };
    const children = await User.find({ role: 'CHILD', status: 'ACTIVE', ...allowed })
      .select('_id name avatar avatarUrl ageGroupCode')
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: children.length,
      data: children
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Child / Student Login (Gmail / Phone + Password OR Avatar + PIN)
// @route   POST /api/auth/child-login
// @access  Public
const childLogin = async (req, res, next) => {
  try {
    const { childId, avatar, pin, identifier, email, phone, contact, password } = req.body;

    // Mode 1: Home login using Gmail (email) OR Phone number + Password
    const loginIdentifier = (identifier || email || phone || contact || '').trim();
    if (password && /^(1234|(\d)\2{3})$/.test(password)) return res.status(401).json({success:false,message:'Thông tin đăng nhập không hợp lệ. Liên hệ giáo viên để đặt lại mật khẩu/PIN.'});
    if (loginIdentifier && password) {
      const child = await User.findOne({
        role: 'CHILD',
        status: 'ACTIVE',
        $or: [
          { email: loginIdentifier.toLowerCase() },
          { phone: loginIdentifier },
          { contact: loginIdentifier },
          { username: loginIdentifier }
        ]
      }).populate('ageGroup');

      if (!child) {
        return res.status(401).json({
          success: false,
          message: 'Thông tin đăng nhập không hợp lệ.'
        });
      }

      // Match password or pin (support both)
      let isMatch = false;
      if (child.password) {
        isMatch = await child.matchPassword(password);
      }
      if (!isMatch && child.pin) {
        isMatch = await child.matchPin(password);
      }


      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Thông tin đăng nhập không hợp lệ.'
        });
      }

      child.lastLogin = new Date();
      await child.save();

      const token = generateToken(child._id, child.role, {
        name: child.name,
        authVersion: child.authVersion || 0,
        ageGroupCode: child.ageGroupCode
      });

      return res.status(200).json({
        success: true,
        token,
        user: {
          id: child._id,
          _id: child._id,
          name: child.name,
          role: child.role,
          avatar: child.avatar,
          avatarUrl: child.avatarUrl,
          ageGroupCode: child.ageGroupCode,
          ageGroup: child.ageGroup
        }
      });
    }

    // Mode 2: Classroom quick login with Avatar + 4-digit PIN
    if (!pin || pin.length !== 4) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập mã PIN 4 chữ số hoặc đăng nhập bằng Gmail / Số điện thoại và mật khẩu.'
      });
    }

    let query = { role: 'CHILD', status: 'ACTIVE' };
    if (childId) {
      query._id = childId;
    } else if (avatar) {
      query.avatar = avatar;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng chọn nhân vật hoặc nhập tài khoản.'
      });
    }

    const child = await User.findOne(query).populate('ageGroup');

    if (!child) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy hồ sơ học sinh.'
      });
    }

    const isDisallowed = ['1234','0000','1111','2222','3333','4444','5555','6666','7777','8888','9999'].includes(String(pin));
    let isMatch = !isDisallowed && child.pin && await child.matchPin(pin);
    if (!isMatch && !isDisallowed && child.password) {
      isMatch = await child.matchPassword(pin);
    }
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Sai mã PIN rồi, bé hãy thử lại nhé!'
      });
    }

    child.lastLogin = new Date();
    await child.save();

    const token = generateToken(child._id, child.role, {
      name: child.name,
      authVersion: child.authVersion || 0,
      ageGroupCode: child.ageGroupCode
    });

    res.status(200).json({
      success: true,
      token,
      user: {
        id: child._id,
        _id: child._id,
        name: child.name,
        role: child.role,
        avatar: child.avatar,
        avatarUrl: child.avatarUrl,
        ageGroupCode: child.ageGroupCode,
        ageGroup: child.ageGroup
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin Login
// @route   POST /api/auth/admin-login
// @access  Public
const adminLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase(), role: 'ADMIN', status: 'ACTIVE' });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials or not an administrator.'
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials.'
      });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user._id, user.role, { name: user.name, email: user.email, authVersion: user.authVersion || 0 });

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Teacher Login
// @route   POST /api/auth/teacher-login
// @access  Public
const teacherLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase(), role: 'TEACHER', status: 'ACTIVE' })
      .populate('assignedClass');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials or not a teacher.'
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials.'
      });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user._id, user.role, { name: user.name, email: user.email, authVersion: user.authVersion || 0 });

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        assignedClass: user.assignedClass
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Current Logged in User Profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password -pin')
      .populate('ageGroup')
      .populate('assignedClass');

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Register a new Child account with Age Group Scoping
// @route   POST /api/auth/child-register
// @access  Public
const childRegister = async (req, res, next) => {
  try {
    const { name, identifier, email, phone, password, pin, ageGroupCode, avatar } = req.body;

    if (!name || (!email && !phone && !identifier) || (!password && !pin)) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp tên bé, email/số điện thoại và mật khẩu.'
      });
    }

    if (pin && /^(1234|(\d)\2{3})$/.test(String(pin))) return res.status(400).json({success:false,message:'Chọn PIN khó đoán hơn.'});
    if ((pin && !/^\d{4}$/.test(String(pin))) || (password && (typeof password !== 'string' || password.length < 8))) return res.status(400).json({ success: false, message: 'Mật khẩu tối thiểu 8 ký tự; PIN gồm 4 chữ số.' });
    const regIdentifier = (identifier || email || phone || '').trim();
    const isEmail = regIdentifier.includes('@');
    const userEmail = isEmail ? regIdentifier.toLowerCase() : undefined;
    const userPhone = !isEmail ? regIdentifier : undefined;

    // Check if user already exists
    const query = [];
    if (userEmail) query.push({ email: userEmail });
    if (userPhone) query.push({ phone: userPhone }, { contact: userPhone });

    const existing = await User.findOne({ role: 'CHILD', $or: query });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Tài khoản Email hoặc Số điện thoại này đã được đăng ký.'
      });
    }

    const selectedAgeGroup = ['3-4', '4-5', '5-6'].includes(ageGroupCode) ? ageGroupCode : '3-4';
    const ageGroupDoc = await AgeGroup.findOne({ code: selectedAgeGroup });

    const avatarKey = avatar || 'lion';
    const avatarEmojiMap = { lion: '🦁', panda: '🐼', rabbit: '🐰', bear: '🐻', fox: '🦊', koala: '🐨' };
    const emoji = avatarEmojiMap[avatarKey] || '🦁';

    const child = new User({
      role: 'CHILD',
      name: name.trim(),
      email: userEmail,
      phone: userPhone,
      contact: regIdentifier,
      password: password || pin,
      pin: pin || undefined,
      avatar: avatarKey,
      avatarUrl: `data:image/svg+xml;utf8,${encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200"><rect width="200" height="200" rx="40" fill="#FFE082"/><text x="100" y="125" font-size="95" text-anchor="middle" dominant-baseline="middle">${emoji}</text></svg>`
      )}`,
      ageGroupCode: selectedAgeGroup,
      ageGroup: ageGroupDoc ? ageGroupDoc._id : undefined,
      status: 'ACTIVE',
      lastLogin: new Date()
    });

    await child.save();

    const token = generateToken(child._id, child.role, {
      name: child.name,
      authVersion: child.authVersion || 0,
      ageGroupCode: child.ageGroupCode
    });

    res.status(201).json({
      success: true,
      message: 'Đăng ký tài khoản bé thành công!',
      token,
      user: {
        id: child._id,
        _id: child._id,
        name: child.name,
        role: child.role,
        avatar: child.avatar,
        avatarUrl: child.avatarUrl,
        ageGroupCode: child.ageGroupCode,
        ageGroup: child.ageGroup
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Child changes their own PIN
// @route   POST /api/auth/change-pin
// @access  Private / Child
const changePin = async (req, res, next) => {
  try {
    const { currentPin, newPin } = req.body;

    if (!newPin) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập mã PIN mới gồm 4 chữ số.'
      });
    }

    const newPinStr = String(newPin).trim();
    if (!/^\d{4}$/.test(newPinStr)) {
      return res.status(400).json({
        success: false,
        message: 'Mã PIN mới phải gồm đúng 4 chữ số (0-9).'
      });
    }

    if (/^(1234|(\d)\2{3})$/.test(newPinStr)) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng chọn mã PIN khó đoán hơn (không dùng 1234 hoặc 4 số giống nhau).'
      });
    }

    const child = await User.findById(req.user._id);
    if (!child || child.role !== 'CHILD') {
      return res.status(403).json({
        success: false,
        message: 'Chỉ tài khoản học sinh mới có thể đổi mã PIN.'
      });
    }

    // Verify current PIN if provided (supports matching either pin or password, plus default initial seeded PINs)
    if (currentPin) {
      const currentPinStr = String(currentPin).trim();
      let isMatch = false;
      if (child.pin) isMatch = await child.matchPin(currentPinStr);
      if (!isMatch && child.password) isMatch = await child.matchPassword(currentPinStr);
      if (!isMatch && (currentPinStr === '1232' || currentPinStr === '1234')) {
        const matchesDefault = (child.password && await child.matchPassword('1232')) ||
                               (child.pin && await child.matchPin('1232')) ||
                               (child.password && await child.matchPassword('1234')) ||
                               (child.pin && await child.matchPin('1234'));
        if (matchesDefault) isMatch = true;
      }
      if (!isMatch) {
        return res.status(400).json({
          success: false,
          message: 'Mã PIN hiện tại chưa chính xác. Vui lòng kiểm tra lại.'
        });
      }
    }

    // Update both child.pin and child.password to stay synchronized across home login and classroom login
    child.pin = newPinStr;
    child.password = newPinStr;
    // Optionally let the child store their two "secret friend" pictures during the same visit.
    if (req.body.recoveryPictures !== undefined) {
      child.recoverySecret = { kind: 'PICTURES', hash: await recovery.picturesHash(req.body.recoveryPictures), updatedAt: new Date() };
    }
    child.authVersion = (child.authVersion || 0) + 1;
    await child.save();

    res.json({
      success: true,
      message: 'Đổi mã PIN học tập thành công!',
      token: generateToken(child._id, child.role, {
        name: child.name,
        authVersion: child.authVersion,
        ageGroupCode: child.ageGroupCode
      })
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Change password for logged-in user (Teacher / Staff / Admin)
// @route   POST /api/auth/change-password
// @access  Private
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp mật khẩu hiện tại và mật khẩu mới.'
      });
    }

    const newPwdStr = String(newPassword).trim();
    if (newPwdStr.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu mới phải có tối thiểu 6 ký tự.'
      });
    }

    if (String(currentPassword).trim() === newPwdStr) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu mới phải khác mật khẩu hiện tại.'
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông tin tài khoản.'
      });
    }

    const isMatch = await user.matchPassword(String(currentPassword).trim());
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu hiện tại chưa chính xác. Vui lòng kiểm tra lại.'
      });
    }

    user.password = newPwdStr;
    user.authVersion = (user.authVersion || 0) + 1;
    await user.save();

    const token = generateToken(user._id, user.role, {
      name: user.name,
      email: user.email,
      authVersion: user.authVersion
    });

    res.json({
      success: true,
      message: 'Đổi mật khẩu thành công!',
      token
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Parent looks up child username/account using registered phone
// @route   POST /api/auth/lookup-student
// @access  Public
const lookupStudent = async (req, res, next) => {
  try {
    if (!['TEACHER', 'ADMIN'].includes(req.user.role)) return res.status(403).json({ success: false, message: 'Liên hệ giáo viên để khôi phục tài khoản.' });
    const allowed = req.user.role === 'ADMIN' ? {} : { _id: { $in: await require('../services/teacherAccess').studentIds(req) } };
    const { phone } = req.body;
    if (!phone || !phone.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập Số điện thoại phụ huynh đã đăng ký.'
      });
    }

    const cleanPhone = phone.trim();
    const students = await User.find({
      role: 'CHILD',
      status: 'ACTIVE', ...allowed,
      $or: [
        { phone: cleanPhone },
        { contact: cleanPhone },
        { parentContact: cleanPhone }
      ]
    })
      .select('name email phone avatar avatarUrl ageGroupCode assignedClass')
      .populate('assignedClass', 'name');

    if (!students || students.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tài khoản bé nào gắn với Số điện thoại này. Bố mẹ vui lòng liên hệ giáo viên để được cấp lại tài khoản nhé!'
      });
    }

    res.json({
      success: true,
      message: `Tìm thấy ${students.length} tài khoản bé:`,
      data: students.map(s => ({
        id: s._id,
        name: s.name,
        email: s.email,
        phone: s.phone,
        avatar: s.avatar,
        avatarUrl: s.avatarUrl,
        ageGroupCode: s.ageGroupCode,
        className: s.assignedClass ? s.assignedClass.name : 'Chưa xếp lớp'
      }))
    });
  } catch (error) {
    next(error);
  }
};

// ── Self-service account recovery ────────────────────────────────────────────
// @desc    Static picture options used for the child "secret friend" chooser
// @route   GET /api/auth/recovery-options
// @access  Public
const recoveryOptions = (req, res) => res.json({ success: true, data: recovery.PICTURES });

// @desc    Start child PIN recovery: identify the child, receive shuffled pictures
// @route   POST /api/auth/recovery-begin
// @access  Public
const recoveryBegin = async (req, res, next) => {
  try {
    res.json({ success: true, data: await recovery.beginChild(req.body.identifier) });
  } catch (error) {
    next(error);
  }
};

// @desc    Finish child PIN recovery: verify secret friends, set new PIN, sign the child in
// @route   POST /api/auth/recovery-complete
// @access  Public
const recoveryComplete = async (req, res, next) => {
  try {
    const child = await recovery.completeChild(req.body.token, req.body.pictures, req.body.newPin);
    const token = generateToken(child._id, child.role, {
      name: child.name,
      authVersion: child.authVersion || 0,
      ageGroupCode: child.ageGroupCode
    });
    res.json({
      success: true,
      token,
      message: 'Đặt lại PIN thành công. Bé vào học thôi nào!',
      user: {
        id: child._id,
        _id: child._id,
        name: child.name,
        role: child.role,
        avatar: child.avatar,
        avatarUrl: child.avatarUrl,
        ageGroupCode: child.ageGroupCode
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Start teacher password recovery with the stored recovery code
// @route   POST /api/auth/teacher-recovery-begin
// @access  Public
const teacherRecoveryBegin = async (req, res, next) => {
  try {
    res.json({ success: true, data: await recovery.beginTeacher(req.body.email) });
  } catch (error) {
    next(error);
  }
};

// @desc    Finish teacher recovery: verify code, set new password
// @route   POST /api/auth/teacher-recovery-complete
// @access  Public
const teacherRecoveryComplete = async (req, res, next) => {
  try {
    await recovery.completeTeacher(req.body.token, req.body.code, req.body.newPassword);
    res.json({ success: true, message: 'Đã đổi mật khẩu. Cô đăng nhập lại bằng mật khẩu mới nhé.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Whether the logged-in account already has a recovery secret
// @route   GET /api/auth/recovery-status
// @access  Private
const recoveryStatus = (req, res) => res.json({ success: true, data: recovery.status(req.user) });

// @desc    Child (re)sets the secret friend pair; current PIN proves identity
// @route   POST /api/auth/recovery-setup
// @access  Private
const recoverySetup = async (req, res, next) => {
  try {
    const child = await User.findById(req.user._id);
    if (!child || child.role !== 'CHILD') {
      return res.status(403).json({ success: false, message: 'Only children can set their secret friends.' });
    }
    if (!await child.matchPin(String(req.body.currentPin || '').trim())) {
      return res.status(401).json({ success: false, message: 'Mã PIN hiện tại chưa chính xác.' });
    }
    await recovery.setChildPictures(child, req.body.pictures);
    res.json({ success: true, message: 'Đã lưu hai bạn bí mật của bé.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Staff rotates their one-time recovery code (shown exactly once)
// @route   POST /api/auth/recovery-code
// @access  Private (TEACHER/ADMIN)
const recoveryCodeRotate = async (req, res, next) => {
  try {
    if (!['TEACHER', 'ADMIN'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Chỉ giáo viên hoặc quản trị viên mới có mã khôi phục.' });
    }
    const teacher = await User.findById(req.user._id);
    const code = await recovery.rotateRecoveryCode(teacher);
    res.json({ success: true, data: { code }, message: 'Mã chỉ hiển thị một lần — cô lưu lại nơi an toàn nhé.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getChildAvatars,
  childLogin,
  childRegister,
  adminLogin,
  teacherLogin,
  getMe,
  changePin,
  changePassword,
  lookupStudent,
  recoveryOptions,
  recoveryBegin,
  recoveryComplete,
  teacherRecoveryBegin,
  teacherRecoveryComplete,
  recoveryStatus,
  recoverySetup,
  recoveryCodeRotate
};


