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

module.exports = { protect, optionalProtect, authorize };
