const dotenv = require('dotenv');

const config = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 5000,
  
  database: {
    uri: process.env.MONGO_URI,
  },
  
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  },
  
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'production' ? 100 : 1000,
    message: {
      error: 'Too many requests from this IP, please try again later.',
    },
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback-secret-change-in-production',
    expiresIn: '7d',
  },
};

dotenv.config();

// Validation des variables obligatoires
const requiredEnvVars = ['MONGO_URI'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars.join(', '));
  if (config.env === 'production') {
    process.exit(1);
  } else {
    console.warn('⚠️ Running in development mode with missing environment variables');
  }
}

module.exports = config;
