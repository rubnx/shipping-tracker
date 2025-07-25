/**
 * Deployment automation utilities
 * Implements CI/CD pipeline support and deployment strategies
 */

// Environment configuration
export const getEnvironmentConfig = () => {
  const env = process.env.NODE_ENV || 'development';
  
  const configs = {
    development: {
      apiUrl: 'http://localhost:3001',
      enableDevTools: true,
      logLevel: 'debug',
      enableMocking: true,
    },
    staging: {
      apiUrl: process.env.VITE_STAGING_API_URL || 'https://staging-api.example.com',
      enableDevTools: false,
      logLevel: 'info',
      enableMocking: false,
    },
    production: {
      apiUrl: process.env.VITE_PRODUCTION_API_URL || 'https://api.example.com',
      enableDevTools: false,
      logLevel: 'error',
      enableMocking: false,
    },
  };
  
  return configs[env as keyof typeof configs] || configs.development;
};

// Health check utilities
export const healthCheck = async () => {
  const config = getEnvironmentConfig();
  
  try {
    const response = await fetch(`${config.apiUrl}/health`);
    const data = await response.json();
    
    return {
      status: response.ok ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.VITE_APP_VERSION || 'unknown',
      environment: process.env.NODE_ENV,
      api: data,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.VITE_APP_VERSION || 'unknown',
      environment: process.env.NODE_ENV,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

// Feature flags
export const featureFlags = {
  enableAdvancedSearch: process.env.VITE_ENABLE_ADVANCED_SEARCH === 'true',
  enableRealTimeUpdates: process.env.VITE_ENABLE_REAL_TIME === 'true',
  enableAnalytics: process.env.VITE_ENABLE_ANALYTICS === 'true',
  enableNotifications: process.env.VITE_ENABLE_NOTIFICATIONS === 'true',
};

// Deployment validation
export const validateDeployment = async () => {
  const checks = [];
  
  // Check API connectivity
  try {
    const health = await healthCheck();
    checks.push({
      name: 'API Health',
      status: health.status === 'healthy' ? 'pass' : 'fail',
      details: health,
    });
  } catch (error) {
    checks.push({
      name: 'API Health',
      status: 'fail',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
  
  // Check environment variables
  const requiredEnvVars = ['VITE_APP_VERSION'];
  const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  checks.push({
    name: 'Environment Variables',
    status: missingEnvVars.length === 0 ? 'pass' : 'fail',
    details: { missing: missingEnvVars },
  });
  
  // Check feature flags
  checks.push({
    name: 'Feature Flags',
    status: 'pass',
    details: featureFlags,
  });
  
  return {
    overall: checks.every(check => check.status === 'pass') ? 'pass' : 'fail',
    checks,
    timestamp: new Date().toISOString(),
  };
};