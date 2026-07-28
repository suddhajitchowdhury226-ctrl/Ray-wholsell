const jwt = require('jsonwebtoken');
const User = require('../Models/user');

exports.protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Support both formats:
    //   New: { id: "mongoIdString" }
    //   Old: { id: { _id: "...", name: "...", ... } }
    let userId = decoded.id;
    if (typeof userId === 'object' && userId !== null) {
      userId = userId._id; // extract _id from old object token
    }

    req.user = await User.findById(userId).select('-password');
    if (!req.user) {
      return res.status(401).json({ message: 'User not found' });
    }
    next();
  } catch (error) {
    console.error('Token verification error:', error.message);
    res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to perform this action' });
    }
    next();
  };
};
