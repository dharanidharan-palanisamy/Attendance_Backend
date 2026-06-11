const jwt = require('jsonwebtoken');
const User = require('../models/User');

const jwtSecret = process.env.JWT_SECRET || 'strong-secret-key';

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const payload = jwt.verify(token, jwtSecret);
    const user = await User.findById(payload.id).select('-password');
    if (!user) {
      return res.status(401).json({ error: 'Invalid token user' });
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const permit = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};

module.exports = { authMiddleware, permit };
