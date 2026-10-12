const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'kcenglishkids_jwt_secret_key_2026');
      const user = await User.findById(decoded.id).select('-password -pin');

      if (!user) {
        return res.status(401).json({ success: false, message: 'User not found or account removed.' });
      }

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
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'kcenglishkids_jwt_secret_key_2026');
      req.user = await User.findById(decoded.id).select('-password -pin');
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
