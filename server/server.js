const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const config = require('./config');
const db = require('./database');
const mongo = require('./mongo');

// Import routes
const authRoutes = require('./routes/auth');
const gameRoutes = require('./routes/games');
const reviewRoutes = require('./routes/reviews');
const siteRoutes = require('./routes/site');

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for development
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: false  // Allow cross-origin images
}));

// CORS configuration
app.use(cors({
  origin: ['http://127.0.0.1:5500', 'http://localhost:5500', 'http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:8000', 'http://127.0.0.1:8000', 'http://localhost:8080', 'http://127.0.0.1:8080'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files (uploads)
app.use('/uploads', (req, res, next) => {
  console.log('Static file request:', req.url);
  console.log('Upload directory:', config.uploadDir);
  
  const filePath = path.join(config.uploadDir, req.url);
  
  if (fs.existsSync(filePath)) {
    console.log('File exists:', filePath);
    const stats = fs.statSync(filePath);
    console.log('File size:', stats.size, 'bytes');
  } else {
    console.log('File not found:', filePath);
  }
  
  next();
}, express.static(config.uploadDir, {
  fallthrough: false,
  setHeaders: (res, filePath) => {
    // Content-Type headers only (rely on global CORS middleware)
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.jpg' || ext === '.jpeg') {
      res.set('Content-Type', 'image/jpeg');
    } else if (ext === '.png') {
      res.set('Content-Type', 'image/png');
    } else if (ext === '.gif') {
      res.set('Content-Type', 'image/gif');
    } else if (ext === '.webp') {
      res.set('Content-Type', 'image/webp');
    }
  }
}));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/site', siteRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv
  });
});

// Expose server config (such as default model) to clients
app.get('/api/config', (req, res) => {
  res.json({ defaultModel: config.defaultModel, useMongo: !!config.useMongo });
});

// Debug all requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Debug endpoint to check uploads directory
app.get('/api/debug/uploads', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  
  try {
    const uploadsPath = path.resolve(config.uploadDir);
    const files = fs.readdirSync(uploadsPath);
    res.json({
      uploadsPath,
      configUploadDir: config.uploadDir,
      files: files.map(file => ({
        name: file,
        url: `${config.baseUrl}/uploads/${file}`,
        fullPath: path.join(uploadsPath, file)
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test route to serve a specific file
app.get('/api/test-image/:filename', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  
  try {
    const filename = req.params.filename;
    const filePath = path.join(config.uploadDir, filename);
    
    if (fs.existsSync(filePath)) {
      res.sendFile(path.resolve(filePath));
    } else {
      res.status(404).json({ error: 'File not found', filePath });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Alternative image serving route
app.get('/image/:filename', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  
  try {
    const filename = req.params.filename;
    const filePath = path.join(config.uploadDir, filename);
    
    if (fs.existsSync(filePath)) {
      const ext = path.extname(filename).toLowerCase();
      let contentType = 'application/octet-stream';
      
      if (ext === '.jpg' || ext === '.jpeg') {
        contentType = 'image/jpeg';
      } else if (ext === '.png') {
        contentType = 'image/png';
      } else if (ext === '.gif') {
        contentType = 'image/gif';
      }
      
      res.set('Content-Type', contentType);
      res.set('Access-Control-Allow-Origin', 'http://127.0.0.1:5500');
      res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type');
      res.set('Access-Control-Allow-Credentials', 'true');
      res.sendFile(path.resolve(filePath));
    } else {
      res.status(404).json({ error: 'File not found', filePath });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Error:', error);
  
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON in request body' });
  }
  
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File too large' });
  }
  
  res.status(500).json({ 
    error: config.nodeEnv === 'development' ? error.message : 'Internal server error'
  });
});

// Serve index.html for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// 404 handler for API routes
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Initialize database and start server
async function startServer() {
  try {
    // Initialize database
    await db.init();

    // If configured to use MongoDB, the database init (MongoDatabase.init)
    // will have initialized the mongo wrapper. Expose the db on app.locals.
    if (config.useMongo) {
      try {
        app.locals.mongoDb = mongo.getDb();
      } catch (err) {
        console.error('Warning: Mongo not available on app.locals:', err);
      }
    }
    
    // Start server
    const server = app.listen(config.port, () => {
      console.log(`🚀 Server running on port ${config.port}`);
      console.log(`📊 Environment: ${config.nodeEnv}`);
      console.log(`🗄️  Database: ${config.useMongo ? config.mongoUri : config.dbPath}`);
      console.log(`📁 Upload directory: ${config.uploadDir}`);
      console.log(`🔗 API Base URL: http://localhost:${config.port}/api`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down gracefully');
      server.close(() => {
        console.log('Process terminated');
        db.close();
        if (config.useMongo) mongo.close();
      });
    });

    process.on('SIGINT', () => {
      console.log('SIGINT received, shutting down gracefully');
      server.close(() => {
        console.log('Process terminated');
        db.close();
        if (config.useMongo) mongo.close();
      });
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

// Global error handlers to prevent server crashes
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit the process, just log the error
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process, just log the error
});