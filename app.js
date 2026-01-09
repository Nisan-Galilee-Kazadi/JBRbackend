const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const config = require('./config');
const database = require('./config/database');
const logger = require('./middleware/logger');
const errorHandler = require('./middleware/errorHandler');

// Routes
const postRoutes = require('./routes/posts');
const newsRoutes = require('./routes/news');
const visitorRoutes = require('./routes/visitors');
const messageRoutes = require('./routes/messages');
const partnerRoutes = require('./routes/partners');
const adminRoutes = require('./routes/admin');
const healthController = require('./controllers/healthController');

const app = express();

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Rate limiting
const limiter = rateLimit(config.rateLimit);
app.use('/api/', limiter);

// CORS
app.use(cors(config.cors));

// Logging
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.get('/health', healthController.getHealthStatus);

app.use('/api/posts', postRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/visitors', visitorRoutes);
app.use('/api/partners', partnerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', messageRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.originalUrl} not found`
  });
});

// Global error handler
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await database.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await database.disconnect();
  process.exit(0);
});

// Unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Promise Rejection:', err);
  process.exit(1);
});

// Uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

// Start server with database connection
const startServer = async () => {
  try {
    // Connect to database
    await database.connect();
    
    // Start server
    app.listen(config.port, () => {
      logger.info(`🚀 Server running on port ${config.port} in ${config.env} mode`);
      logger.info(`📊 Health check available at https://localhost:${config.port}/health`);
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

// Start the server
startServer();

module.exports = app;
