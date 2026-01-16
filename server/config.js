require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
  dbPath: process.env.DB_PATH || './database.sqlite',
  uploadDir: process.env.UPLOAD_DIR || './uploads',
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 5242880, // 5MB
  baseUrl: process.env.BASE_URL || `http://localhost:${process.env.PORT || 3001}`,
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000  // Increased for development testing
  }
};


module.exports.mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/prg';
// Default to using MongoDB unless explicitly disabled
module.exports.useMongo = (process.env.USE_MONGO ? (process.env.USE_MONGO === 'true') : true);


module.exports.defaultModel = process.env.DEFAULT_MODEL || 'gpt-5-mini';

