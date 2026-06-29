const jwt = require('jsonwebtoken');
const User = require('../Models/user');
const logger = require('../utils/logger');
const { isBlacklisted } = require('../utils/tokenBlacklist');

exports.protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    logger.warn('Auth: no token in request headers', { path: req.path, method: req.method });
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  // ── Token blacklist check (logout / revocation) ──────────────────────────
  try {
    const revoked = await isBlacklisted(token);
    if (revoked) {
      logger.warn('Auth: blacklisted token used', { path: req.path });
      return res.status(401).json({ message: 'Not authorized, token has been revoked' });
    }
  } catch (blacklistErr) {
    // Non-fatal — log and continue; do not block the request on store errors
    logger.error('Auth: blacklist check error', { message: blacklistErr.message });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) {
      logger.warn('Auth: user not found for decoded token', { path: req.path });
      return res.status(401).json({ message: 'User not found' });
    }
    // ✅ Safe to log — no PII (no email, no token, no role value)
    logger.info('Auth: request authenticated', { path: req.path, method: req.method });
    next();
  } catch (error) {
    logger.error('Auth: token verification failed', { message: error.message, path: req.path });
    res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      logger.warn('Auth: role restriction failed', { path: req.path, method: req.method });
      return res.status(403).json({ message: 'You do not have permission to perform this action' });
    }
    next();
  };
};
