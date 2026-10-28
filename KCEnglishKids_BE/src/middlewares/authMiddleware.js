const { jwtSecret } = require('../config/auth');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, jwtSecret());
      const user = await User.findById(decoded.id).select('-password -pin');

      if (!user) {
        return res.status(401).json({ success: false, message: 'User not found or account removed.' });
      }

      if ((decoded.authVersion || 0) !== (user.authVersion || 0)) return res.status(401).json({ success: false, message: 'Mật khẩu đã thay đổi. Vui lòng đăng nhập lại.' });
      if (user.status !== 'ACTIVE') {
        return res.status(403).json({ success: false, message: 'Account is deactivated or locked.' });
      }

      req.user = user;
      return next();
    } catch (error) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authorization token required.' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access forbidden: Required role [${roles.join(', ')}]`
      });
    }
    next();
  };
};

const optionalProtect = async (req, res, next) => {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      const token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, jwtSecret());
      const user = await User.findById(decoded.id).select('-password -pin');
      if (user?.status === 'ACTIVE' && (decoded.authVersion || 0) === (user.authVersion || 0)) req.user = user;
    } catch (err) {
      // ignore invalid token in optional mode
    }
  }
  next();
};

/**
 * §3.1.11/§3.1.12 — ownership guard for routes scoped to a child.
 * Use AFTER `protect`. A CHILD may only access their own profile;
 * TEACHER/ADMIN may access any (needed for classroom/admin views).
 */
const ownChildOr403 = (paramName = 'childId') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authorization token required.' });
    }

    const targetId = req.params[paramName] || req.params.childId || req.params.id;
    if (!targetId) {
      return res.status(400).json({ success: false, message: 'Missing child id parameter.' });
    }

    if (req.user.role === 'CHILD' && String(req.user._id) !== String(targetId)) {
      return res.status(403).json({
        success: false,
        message: 'Access forbidden: you can only access your own data.'
      });
    }

    return next();
  };
};

module.exports = { protect, optionalProtect, authorize, ownChildOr403 };
