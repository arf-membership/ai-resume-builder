/**
 * Server-side Rate Limiter for Edge Functions
 * Provides rate limiting functionality using Supabase as storage backend
 * Requirements: 9.1, 9.2
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyPrefix?: string; // Prefix for rate limit keys
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
  totalRequests: number;
}

export interface RateLimitEntry {
  key: string;
  count: number;
  window_start: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

/**
 * Rate limiter configurations for different endpoints
 */
export const SERVER_RATE_LIMITS = {
  // File upload analysis
  ANALYZE_CV: {
    windowMs: 10 * 60 * 1000, // 10 minutes
    maxRequests: 3, // 3 analyses per 10 minutes per session
  },
  
  // Section editing
  EDIT_SECTION: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 15, // 15 edits per 5 minutes per session
  },
  
  // Chat interactions
  CHAT_SECTION: {
    windowMs: 1 * 60 * 1000, // 1 minute
    maxRequests: 30, // 30 messages per minute per session
  },
  
  // PDF generation
  GENERATE_PDF: {
    windowMs: 10 * 60 * 1000, // 10 minutes
    maxRequests: 5, // 5 generations per 10 minutes per session
  },
  
  // General API rate limiting (per IP)
  API_GENERAL: {
    windowMs: 1 * 60 * 1000, // 1 minute
    maxRequests: 100, // 100 requests per minute per IP
  },
} as const;

/**
 * Server-side rate limiter class
 */
export class ServerRateLimiter {
  private supabaseClient: any;
  private tableName = 'rate_limits';

  constructor(supabaseUrl: string, supabaseServiceKey: string) {
    this.supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
  }

  /**
   * Check rate limit for a given key and configuration
   */
  async checkRateLimit(
    key: string,
    config: RateLimitConfig,
    clientIP?: string
  ): Promise<RateLimitResult> {
    const now = new Date();
    const windowStart = new Date(now.getTime() - config.windowMs);
    const rateLimitKey = this.generateRateLimitKey(key, config.keyPrefix);

    try {
      // Clean up expired entries first
      await this.cleanupExpiredEntries();

      // Get current rate limit entry
      const { data: existingEntry, error: fetchError } = await this.supabaseClient
        .from(this.tableName)
        .select('*')
        .eq('key', rateLimitKey)
        .gte('expires_at', now.toISOString())
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw new Error(`Rate limit check failed: ${fetchError.message}`);
      }

      let currentEntry: RateLimitEntry | null = existingEntry;

      // If no entry exists or window has expired, create new one
      if (!currentEntry || new Date(currentEntry.window_start) < windowStart) {
        const newEntry = {
          key: rateLimitKey,
          count: 1,
          window_start: windowStart.toISOString(),
          expires_at: new Date(now.getTime() + config.windowMs).toISOString(),
          client_ip: clientIP || null,
        };

        const { data: insertedEntry, error: insertError } = await this.supabaseClient
          .from(this.tableName)
          .upsert(newEntry, { onConflict: 'key' })
          .select()
          .single();

        if (insertError) {
          throw new Error(`Failed to create rate limit entry: ${insertError.message}`);
        }

        currentEntry = insertedEntry;
      }

      // Check if within rate limit
      if (currentEntry.count <= config.maxRequests) {
        // Increment counter if not at limit
        if (currentEntry.count < config.maxRequests) {
          const { error: updateError } = await this.supabaseClient
            .from(this.tableName)
            .update({ 
              count: currentEntry.count + 1,
              updated_at: now.toISOString(),
            })
            .eq('key', rateLimitKey);

          if (updateError) {
            console.error('Failed to update rate limit counter:', updateError);
          }
        }

        return {
          allowed: true,
          remaining: Math.max(0, config.maxRequests - currentEntry.count),
          resetTime: new Date(currentEntry.expires_at).getTime(),
          totalRequests: currentEntry.count,
        };
      }

      // Rate limit exceeded
      const resetTime = new Date(currentEntry.expires_at).getTime();
      return {
        allowed: false,
        remaining: 0,
        resetTime,
        retryAfter: resetTime - now.getTime(),
        totalRequests: currentEntry.count,
      };

    } catch (error) {
      console.error('Rate limiter error:', error);
      // In case of error, allow the request but log the issue
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetTime: now.getTime() + config.windowMs,
        totalRequests: 1,
      };
    }
  }

  /**
   * Generate rate limit key
   */
  private generateRateLimitKey(key: string, prefix?: string): string {
    const sanitizedKey = key.replace(/[^a-zA-Z0-9_-]/g, '_');
    return prefix ? `${prefix}:${sanitizedKey}` : sanitizedKey;
  }

  /**
   * Clean up expired rate limit entries
   */
  private async cleanupExpiredEntries(): Promise<void> {
    try {
      const now = new Date().toISOString();
      
      const { error } = await this.supabaseClient
        .from(this.tableName)
        .delete()
        .lt('expires_at', now);

      if (error) {
        console.error('Failed to cleanup expired rate limit entries:', error);
      }
    } catch (error) {
      console.error('Rate limit cleanup error:', error);
    }
  }

  /**
   * Get rate limit statistics for monitoring
   */
  async getRateLimitStats(keyPattern?: string): Promise<{
    totalEntries: number;
    activeEntries: number;
    topKeys: Array<{ key: string; count: number; expires_at: string }>;
  }> {
    try {
      const now = new Date().toISOString();
      
      // Get total entries
      const { count: totalEntries } = await this.supabaseClient
        .from(this.tableName)
        .select('*', { count: 'exact', head: true });

      // Get active entries
      const { count: activeEntries } = await this.supabaseClient
        .from(this.tableName)
        .select('*', { count: 'exact', head: true })
        .gte('expires_at', now);

      // Get top keys by request count
      let query = this.supabaseClient
        .from(this.tableName)
        .select('key, count, expires_at')
        .gte('expires_at', now)
        .order('count', { ascending: false })
        .limit(10);

      if (keyPattern) {
        query = query.like('key', `%${keyPattern}%`);
      }

      const { data: topKeys } = await query;

      return {
        totalEntries: totalEntries || 0,
        activeEntries: activeEntries || 0,
        topKeys: topKeys || [],
      };
    } catch (error) {
      console.error('Failed to get rate limit stats:', error);
      return {
        totalEntries: 0,
        activeEntries: 0,
        topKeys: [],
      };
    }
  }

  /**
   * Reset rate limit for a specific key
   */
  async resetRateLimit(key: string, prefix?: string): Promise<void> {
    try {
      const rateLimitKey = this.generateRateLimitKey(key, prefix);
      
      const { error } = await this.supabaseClient
        .from(this.tableName)
        .delete()
        .eq('key', rateLimitKey);

      if (error) {
        throw new Error(`Failed to reset rate limit: ${error.message}`);
      }
    } catch (error) {
      console.error('Failed to reset rate limit:', error);
      throw error;
    }
  }
}

/**
 * Extract client IP from request
 */
export function extractClientIP(request: Request): string {
  // Check various headers for client IP
  const headers = [
    'cf-connecting-ip', // Cloudflare
    'x-forwarded-for',
    'x-real-ip',
    'x-client-ip',
    'x-cluster-client-ip',
  ];

  for (const header of headers) {
    const value = request.headers.get(header);
    if (value) {
      // Take the first IP if comma-separated
      const ip = value.split(',')[0].trim();
      if (isValidIP(ip)) {
        return ip;
      }
    }
  }

  return 'unknown';
}

/**
 * Validate IP address format
 */
function isValidIP(ip: string): boolean {
  // Basic IPv4 validation
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Regex.test(ip)) {
    const parts = ip.split('.');
    return parts.every(part => {
      const num = parseInt(part, 10);
      return num >= 0 && num <= 255;
    });
  }

  // Basic IPv6 validation
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  return ipv6Regex.test(ip);
}

/**
 * Rate limiting middleware for Edge Functions
 */
export async function withServerRateLimit<T>(
  rateLimiter: ServerRateLimiter,
  request: Request,
  sessionId: string,
  endpoint: keyof typeof SERVER_RATE_LIMITS,
  handler: () => Promise<T>
): Promise<{ result?: T; rateLimitResult: RateLimitResult }> {
  const config = SERVER_RATE_LIMITS[endpoint];
  const clientIP = extractClientIP(request);
  
  // Use session ID as the primary key, with IP as fallback
  const rateLimitKey = sessionId || clientIP;
  
  const rateLimitResult = await rateLimiter.checkRateLimit(
    rateLimitKey,
    { ...config, keyPrefix: endpoint },
    clientIP
  );

  if (!rateLimitResult.allowed) {
    return { rateLimitResult };
  }

  try {
    const result = await handler();
    return { result, rateLimitResult };
  } catch (error) {
    // Don't count failed requests if configured
    if (config.skipFailedRequests) {
      // Implementation would need to decrement counter
      // For now, we'll let it count
    }
    throw error;
  }
}

export default {
  ServerRateLimiter,
  SERVER_RATE_LIMITS,
  extractClientIP,
  withServerRateLimit,
};