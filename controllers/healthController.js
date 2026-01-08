const Post = require('../models/Post');
const News = require('../models/News');
const Partner = require('../models/Partner');
const database = require('../config/database');
const logger = require('../middleware/logger');

const healthController = {
  getHealthStatus: async (req, res) => {
    const startTime = Date.now();
    
    try {
      // Vérification de la connexion MongoDB
      const dbStatus = database.getConnectionStatus();
      
      // Vérification de la connectivité des modèles
      let modelChecks = {};
      try {
        await Post.findOne().limit(1);
        modelChecks.posts = 'OK';
      } catch (error) {
        modelChecks.posts = 'ERROR';
      }
      
      try {
        await News.findOne().limit(1);
        modelChecks.news = 'OK';
      } catch (error) {
        modelChecks.news = 'ERROR';
      }
      
      try {
        await Partner.findOne().limit(1);
        modelChecks.partners = 'OK';
      } catch (error) {
        modelChecks.partners = 'ERROR';
      }

      const responseTime = Date.now() - startTime;
      const isHealthy = dbStatus.isConnected && Object.values(modelChecks).every(status => status === 'OK');

      const healthData = {
        status: isHealthy ? 'OK' : 'ERROR',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0',
        responseTime: `${responseTime}ms`,
        database: {
          connected: dbStatus.isConnected,
          readyState: dbStatus.readyState,
          host: dbStatus.host,
          name: dbStatus.name
        },
        models: modelChecks,
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB'
        }
      };

      res.status(isHealthy ? 200 : 503).json(healthData);
      
      if (isHealthy) {
        logger.info('Health check passed');
      } else {
        logger.warn('Health check failed', healthData);
      }
    } catch (error) {
      logger.error('Health check error:', error);
      res.status(503).json({
        status: 'ERROR',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
        details: error.message
      });
    }
  }
};

module.exports = healthController;
