const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../database');
const mongo = require('../mongo');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    
    // Verify user still exists (use MongoDB directly)
    const dbMongo = mongo.getDb();
    const user = await dbMongo.collection('users').findOne({ id: decoded.userId }, { projection: { id: 1, email: 1, role: 1 } });
    if (!user) return res.status(401).json({ error: 'User not found' });

    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, config.jwtSecret);
      const dbMongo = mongo.getDb();
      const user = await dbMongo.collection('users').findOne({ id: decoded.userId }, { projection: { id: 1, email: 1, role: 1 } });
      if (user) req.user = user;
    } catch (error) {
      // Token is invalid, but we continue without authentication
    }
  }
  
  next();
};

module.exports = {
  authenticateToken,
  requireAdmin,
  optionalAuth
};

