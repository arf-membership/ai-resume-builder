/**
 * Rate Limiting Utilities
 * Provides client-side and server-side rate limiting functionality
 * Requirements: 9.1, 9.2
 */

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (identifier: string) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

export interface RateLimitEntry {
  count: number;
  resetTime: number;
  firstRequest: number;
}

/**
 * In-memory rate limiter for client-side usage
 */
class InMemoryRateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private cleanupInterval?: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  /**
   * Check if request is allowed under rate limit
   */
  checkLimit(key: string, config: RateLimitConfig): RateLimitResult {
    const now = Date.now();
    const windowStart = now - config.windowMs;
    
    let entry = this.store.get(key);
    
    // Create new entry if doesn't exist or window has expired
    if (!entry || entry.resetTime <= now) {
      entry = {
        count: 1,
        resetTime: now + config.windowMs,
        firstRequest: now,
      };
      this.store.set(key, entry);
      
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetTime: entry.resetTime,
      };
    }
    
    // Check if within rate limit
    if (entry.count < config.maxRequests) {
      entry.count++;
      this.store.set(key, entry);
      
      return {
        allowed: true,
        remaining: config.maxRequests - entry.count,
        resetTime: entry.resetTime,
      };
    }
    
    // Rate limit exceeded
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
      retryAfter: entry.resetTime - now,
    };
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.resetTime <= now) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Destroy the rate limiter
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
    this.clear();
  }
}

/**
 * Rate limiter configurations for different endpoints
 */
export const RATE_LIMIT_CONFIGS = {
  // File upload rate limiting
  UPLOAD: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 uploads per 15 minutes
  },
  
  // CV analysis rate limiting
  ANALYSIS: {
    windowMs: 10 * 60 * 1000, // 10 minutes
    maxRequests: 3, // 3 analyses per 10 minutes
  },
  
  // Section editing rate limiting
  EDIT_SECTION: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 10, // 10 edits per 5 minutes
  },
  
  // Chat interactions rate limiting
  CHAT: {
    windowMs: 1 * 60 * 1000, // 1 minute
    maxRequests: 20, // 20 messages per minute
  },
  
  // PDF generation rate limiting
  PDF_GENERATION: {
    windowMs: 10 * 60 * 1000, // 10 minutes
    maxRequests: 5, // 5 generations per 10 minutes
  },
  
  // General API rate limiting
  API_GENERAL: {
    windowMs: 1 * 60 * 1000, // 1 minute
    maxRequests: 60, // 60 requests per minute
  },
} as const;

/**
 * Global rate limiter instance
 */
const globalRateLimiter = new InMemoryRateLimiter();

/**
 * Generate rate limit key based on session ID and endpoint
 */
function generateRateLimitKey(sessionId: string, endpoint: string): string {
  // Sanitize inputs
  const sanitizedSessionId = sessionId.replace(/[^a-zA-Z0-9_-]/g, '');
  const sanitizedEndpoint = endpoint.replace(/[^a-zA-Z0-9_-]/g, '');
  
  return `${sanitizedSessionId}:${sanitizedEndpoint}`;
}

/**
 * Check rate limit for a specific endpoint and session
 */
export function checkRateLimit(
  sessionId: string,
  endpoint: keyof typeof RATE_LIMIT_CONFIGS,
  customConfig?: Partial<RateLimitConfig>
): RateLimitResult {
  const config = {
    ...RATE_LIMIT_CONFIGS[endpoint],
    ...customConfig,
  };
  
  const key = generateRateLimitKey(sessionId, endpoint);
  return globalRateLimiter.checkLimit(key, config);
}

/**
 * Rate limiting middleware for API calls
 */
export function withRateLimit<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  sessionId: string,
  endpoint: keyof typeof RATE_LIMIT_CONFIGS,
  customConfig?: Partial<RateLimitConfig>
): T {
  return (async (...args: Parameters<T>) => {
    const rateLimitResult = checkRateLimit(sessionId, endpoint, customConfig);
    
    if (!rateLimitResult.allowed) {
      const error = new Error('Rate limit exceeded');
      (error as any).rateLimitInfo = rateLimitResult;
      (error as any).code = 'RATE_LIMIT_EXCEEDED';
      throw error;
    }
    
    try {
      const result = await fn(...args);
      return result;
    } catch (error) {
      // Don't count failed requests if configured
      if (customConfig?.skipFailedRequests) {
        // Implementation would need to decrement counter
        // For now, we'll let it count
      }
      throw error;
    }
  }) as T;
}

/**
 * React hook for rate limiting
 */
export function useRateLimit(
  sessionId: string,
  endpoint: keyof typeof RATE_LIMIT_CONFIGS,
  customConfig?: Partial<RateLimitConfig>
) {
  const checkLimit = () => {
    return checkRateLimit(sessionId, endpoint, customConfig);
  };
  
  const isAllowed = () => {
    return checkLimit().allowed;
  };
  
  const getRemainingRequests = () => {
    return checkLimit().remaining;
  };
  
  const getResetTime = () => {
    return checkLimit().resetTime;
  };
  
  return {
    checkLimit,
    isAllowed,
    getRemainingRequests,
    getResetTime,
  };
}

/**
 * Rate limit error class
 */
export class RateLimitError extends Error {
  public rateLimitInfo: RateLimitResult;
  public code = 'RATE_LIMIT_EXCEEDED';
  
  constructor(rateLimitInfo: RateLimitResult, message?: string) {
    super(message || 'Rate limit exceeded');
    this.name = 'RateLimitError';
    this.rateLimitInfo = rateLimitInfo;
  }
}

/**
 * Format rate limit error message for users
 */
export function formatRateLimitError(rateLimitInfo: RateLimitResult): string {
  const retryAfterSeconds = rateLimitInfo.retryAfter ? Math.ceil(rateLimitInfo.retryAfter / 1000) : 0;
  
  if (retryAfterSeconds > 60) {
    const minutes = Math.ceil(retryAfterSeconds / 60);
    return `Too many requests. Please try again in ${minutes} minute${minutes > 1 ? 's' : ''}.`;
  } else {
    return `Too many requests. Please try again in ${retryAfterSeconds} second${retryAfterSeconds > 1 ? 's' : ''}.`;
  }
}

/**
 * Cleanup function for rate limiter
 */
export function cleanupRateLimiter(): void {
  globalRateLimiter.destroy();
}

export default {
  checkRateLimit,
  withRateLimit,
  useRateLimit,
  RateLimitError,
  formatRateLimitError,
  cleanupRateLimiter,
  RATE_LIMIT_CONFIGS,
};