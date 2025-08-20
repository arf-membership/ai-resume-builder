/**
 * Production configuration and environment validation
 */

// Environment validation
export const validateEnvironment = (): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // Required environment variables
  const requiredVars = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY'
  ];
  
  for (const varName of requiredVars) {
    if (!import.meta.env[varName]) {
      errors.push(`Missing required environment variable: ${varName}`);
    }
  }
  
  // Validate Supabase URL format
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (supabaseUrl && !supabaseUrl.match(/^https:\/\/[a-z0-9]+\.supabase\.co$/)) {
    errors.push('Invalid Supabase URL format');
  }
  
  // Validate Supabase key format (basic check)
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (supabaseKey && !supabaseKey.startsWith('eyJ')) {
    errors.push('Invalid Supabase anon key format');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Production configuration
export const productionConfig = {
  // Performance settings
  performance: {
    enableServiceWorker: true,
    enableCodeSplitting: true,
    enableAssetOptimization: true,
    maxBundleSize: 1000 * 1024, // 1MB
    maxChunkSize: 500 * 1024,   // 500KB
  },
  
  // Security settings
  security: {
    enableCSP: true,
    enableSRI: true,
    enableHSTS: true,
    enableSecurityHeaders: true,
  },
  
  // Monitoring settings
  monitoring: {
    enableErrorTracking: true,
    enablePerformanceTracking: true,
    enableAnalytics: false, // No analytics for privacy
  },
  
  // Feature flags
  features: {
    enableOfflineMode: false,
    enablePWA: false,
    enableAdvancedAnalytics: true,
    enableChatInterface: true,
  },
  
  // API settings
  api: {
    timeout: 30000, // 30 seconds
    retryAttempts: 3,
    retryDelay: 1000, // 1 second
  },
  
  // File processing limits
  fileProcessing: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['application/pdf'],
    maxProcessingTime: 60000, // 60 seconds
  }
};

// Runtime environment detection
export const getEnvironment = () => {
  if (import.meta.env.PROD) return 'production';
  if (import.meta.env.DEV) return 'development';
  return 'unknown';
};

// Feature flag checker
export const isFeatureEnabled = (feature: keyof typeof productionConfig.features): boolean => {
  return productionConfig.features[feature];
};

// Performance budget checker
export const checkPerformanceBudget = (bundleSize: number, chunkSizes: number[]): {
  withinBudget: boolean;
  violations: string[];
} => {
  const violations: string[] = [];
  
  if (bundleSize > productionConfig.performance.maxBundleSize) {
    violations.push(`Bundle size (${Math.round(bundleSize / 1024)}KB) exceeds limit (${Math.round(productionConfig.performance.maxBundleSize / 1024)}KB)`);
  }
  
  chunkSizes.forEach((size, index) => {
    if (size > productionConfig.performance.maxChunkSize) {
      violations.push(`Chunk ${index} size (${Math.round(size / 1024)}KB) exceeds limit (${Math.round(productionConfig.performance.maxChunkSize / 1024)}KB)`);
    }
  });
  
  return {
    withinBudget: violations.length === 0,
    violations
  };
};

export default productionConfig;