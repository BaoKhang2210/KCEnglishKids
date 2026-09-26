const jwt = require('jsonwebtoken');
const { User, AgeGroup } = require('../models');

const generateToken = (id, role, extra = {}) => {
  return jwt.sign(
    { id, role, ...extra },
    process.env.JWT_SECRET || 'kcenglishkids_jwt_secret_key_2026',
    { expiresIn: '30d' }
  );
};

// @desc    Get child avatars list for visual login
// @route   GET /api/auth/children-avatars
// @access  Public
const getChildAvatars = async (req, res, next) => {
  try {
    const children = await User.find({ role: 'CHILD', status: 'ACTIVE' })
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
          message: 'Tài khoản Gmail hoặc Số điện thoại chưa được đăng ký.'
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
          message: 'Mật khẩu không chính xác. Vui lòng thử lại!'
        });
      }

      child.lastLogin = new Date();
      await child.save();

      const token = generateToken(child._id, child.role, {
        name: child.name,
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

    const isMatch = await child.matchPin(pin);
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

    const token = generateToken(user._id, user.role, { name: user.name, email: user.email });

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

    const token = generateToken(user._id, user.role, { name: user.name, email: user.email });

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
      pin: pin || '1234',
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

    // Validate inputs
    if (!currentPin || !newPin) {
      return res.status(400).json({
        success: false,
        message: 'Current PIN and new PIN are required.'
      });
    }
    const newPinStr = String(newPin).trim();
    if (!/^\d{4}$/.test(newPinStr)) {
      return res.status(400).json({
        success: false,
        message: 'New PIN must be exactly 4 digits.'
      });
    }

    const child = await User.findById(req.user._id);
    if (!child || child.role !== 'CHILD') {
      return res.status(403).json({
        success: false,
        message: 'Only children can change their PIN.'
      });
    }

    // Verify current PIN
    const isMatch = await child.matchPin(String(currentPin).trim());
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current PIN is incorrect. Please try again.'
      });
    }

    // Set new PIN and password (pre-save hook will hash them)
    child.pin = newPinStr;
    child.password = newPinStr;
    await child.save();

    res.json({
      success: true,
      message: 'Đổi mã PIN và mật khẩu học tập thành công! 🎉'
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
      status: 'ACTIVE',
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
        message: 'Không tìm thấy tài khoản bé nào gắn với Số điện thoại này. Bố mẹ vui lòng liên hệ giáo viên chủ nhiệm để được cấp lại tài khoản nhé!'
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

module.exports = {
  getChildAvatars,
  childLogin,
  childRegister,
  adminLogin,
  teacherLogin,
  getMe,
  changePin,
  lookupStudent
};


