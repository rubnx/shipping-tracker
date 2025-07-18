import dotenv from 'dotenv';

dotenv.config();

export const config = {
  server: {
    port: parseInt(process.env.PORT || '3001', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173'
  },
  
  apiKeys: {
    maersk: process.env.MAERSK_API_KEY || '',
    hapagLloyd: process.env.HAPAG_LLOYD_API_KEY || '',
    msc: process.env.MSC_API_KEY || '',
    cmaCgm: process.env.CMA_CGM_API_KEY || ''
  },
  
  database: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/shipping_tracker'
  },
  
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  },
  
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10)
  },
  
  security: {
    jwtSecret: process.env.JWT_SECRET || 'fallback-secret-key',
    apiSecretKey: process.env.API_SECRET_KEY || 'fallback-api-secret'
  }
};

// Validate required environment variables
export const validateEnvironment = (): void => {
  const requiredVars = ['NODE_ENV'];
  
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.warn(`Warning: Missing environment variables: ${missingVars.join(', ')}`);
  }
  
  // Log configuration in development
  if (config.server.nodeEnv === 'development') {
    console.log('🔧 Configuration loaded:', {
      port: config.server.port,
      nodeEnv: config.server.nodeEnv,
      frontendUrl: config.server.frontendUrl,
      hasApiKeys: {
        maersk: !!config.apiKeys.maersk,
        hapagLloyd: !!config.apiKeys.hapagLloyd,
        msc: !!config.apiKeys.msc,
        cmaCgm: !!config.apiKeys.cmaCgm
      }
    });
  }
};