/**
 * Security Headers and CORS Configuration
 * Provides comprehensive security headers and CORS configuration for Edge Functions
 * Requirements: 9.1, 9.2
 */

export interface SecurityHeadersConfig {
  corsOrigins: string[];
  allowCredentials: boolean;
  maxAge: number;
  contentSecurityPolicy?: string;
  enableHSTS?: boolean;
  enableXFrameOptions?: boolean;
  enableXContentTypeOptions?: boolean;
  enableReferrerPolicy?: boolean;
}

const DEFAULT_SECURITY_CONFIG: SecurityHeadersConfig = {
  corsOrigins: ['http://localhost:5173', 'https://*.vercel.app', 'https://*.netlify.app'],
  allowCredentials: false,
  maxAge: 86400, // 24 hours
  enableHSTS: true,
  enableXFrameOptions: true,
  enableXContentTypeOptions: true,
  enableReferrerPolicy: true,
  contentSecurityPolicy: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'none';",
};

/**
 * Get security headers configuration from environment
 */
export function getSecurityConfig(): SecurityHeadersConfig {
  const corsOrigins = Deno.env.get('CORS_ORIGINS')?.split(',') || DEFAULT_SECURITY_CONFIG.corsOrigins;
  const allowCredentials = Deno.env.get('CORS_ALLOW_CREDENTIALS') === 'true';
  const maxAge = parseInt(Deno.env.get('CORS_MAX_AGE') || '86400');
  const csp = Deno.env.get('CONTENT_SECURITY_POLICY') || DEFAULT_SECURITY_CONFIG.contentSecurityPolicy;
  
  return {
    ...DEFAULT_SECURITY_CONFIG,
    corsOrigins,
    allowCredentials,
    maxAge,
    contentSecurityPolicy: csp,
  };
}

/**
 * Validate origin against allowed origins
 */
export function isOriginAllowed(origin: string | null, allowedOrigins: string[]): boolean {
  if (!origin) return false;
  
  // Check for wildcard
  if (allowedOrigins.includes('*')) return true;
  
  // Check exact match
  if (allowedOrigins.includes(origin)) return true;
  
  // Check pattern match (e.g., *.example.com)
  return allowedOrigins.some(allowed => {
    if (allowed.startsWith('*.')) {
      const domain = allowed.substring(2);
      return origin.endsWith(domain);
    }
    return false;
  });
}

/**
 * Generate comprehensive security headers
 */
export function getSecurityHeaders(request: Request, config?: Partial<SecurityHeadersConfig>): Record<string, string> {
  const securityConfig = { ...getSecurityConfig(), ...config };
  const origin = request.headers.get('origin');
  const headers: Record<string, string> = {};
  
  // CORS Headers
  if (origin && isOriginAllowed(origin, securityConfig.corsOrigins)) {
    headers['Access-Control-Allow-Origin'] = origin;
  } else if (securityConfig.corsOrigins.includes('*')) {
    headers['Access-Control-Allow-Origin'] = '*';
  }
  
  if (securityConfig.allowCredentials) {
    headers['Access-Control-Allow-Credentials'] = 'true';
  }
  
  headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
  headers['Access-Control-Allow-Headers'] = 'authorization, x-client-info, apikey, content-type, x-session-id, x-request-id';
  headers['Access-Control-Max-Age'] = securityConfig.maxAge.toString();
  
  // Security Headers
  if (securityConfig.enableHSTS) {
    headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload';
  }
  
  if (securityConfig.enableXFrameOptions) {
    headers['X-Frame-Options'] = 'DENY';
  }
  
  if (securityConfig.enableXContentTypeOptions) {
    headers['X-Content-Type-Options'] = 'nosniff';
  }
  
  if (securityConfig.enableReferrerPolicy) {
    headers['Referrer-Policy'] = 'strict-origin-when-cross-origin';
  }
  
  if (securityConfig.contentSecurityPolicy) {
    headers['Content-Security-Policy'] = securityConfig.contentSecurityPolicy;
  }
  
  // Additional security headers
  headers['X-XSS-Protection'] = '1; mode=block';
  headers['X-Permitted-Cross-Domain-Policies'] = 'none';
  headers['Cross-Origin-Embedder-Policy'] = 'require-corp';
  headers['Cross-Origin-Opener-Policy'] = 'same-origin';
  headers['Cross-Origin-Resource-Policy'] = 'cross-origin';
  
  // Cache control for security
  headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, proxy-revalidate';
  headers['Pragma'] = 'no-cache';
  headers['Expires'] = '0';
  
  return headers;
}

/**
 * Handle CORS preflight requests with security headers
 */
export function handleSecureCorsPreflightRequest(request: Request, config?: Partial<SecurityHeadersConfig>): Response {
  const headers = getSecurityHeaders(request, config);
  
  return new Response(null, {
    status: 204,
    headers,
  });
}

/**
 * Add security headers to response
 */
export function addSecurityHeaders(response: Response, request: Request, config?: Partial<SecurityHeadersConfig>): Response {
  const securityHeaders = getSecurityHeaders(request, config);
  
  // Merge existing headers with security headers
  const newHeaders = new Headers(response.headers);
  Object.entries(securityHeaders).forEach(([key, value]) => {
    newHeaders.set(key, value);
  });
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

/**
 * Rate limiting headers
 */
export interface RateLimitHeaders {
  'X-RateLimit-Limit': string;
  'X-RateLimit-Remaining': string;
  'X-RateLimit-Reset': string;
  'Retry-After'?: string;
}

/**
 * Add rate limiting headers to response
 */
export function addRateLimitHeaders(
  response: Response,
  limit: number,
  remaining: number,
  resetTime: number,
  retryAfter?: number
): Response {
  const headers = new Headers(response.headers);
  
  headers.set('X-RateLimit-Limit', limit.toString());
  headers.set('X-RateLimit-Remaining', remaining.toString());
  headers.set('X-RateLimit-Reset', Math.ceil(resetTime / 1000).toString());
  
  if (retryAfter) {
    headers.set('Retry-After', Math.ceil(retryAfter / 1000).toString());
  }
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Validate request headers for security
 */
export function validateRequestHeaders(request: Request): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check Content-Type for POST requests
  if (request.method === 'POST') {
    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      errors.push('Invalid or missing Content-Type header');
    }
  }
  
  // Check for required session header
  const sessionId = request.headers.get('x-session-id');
  if (!sessionId) {
    errors.push('Missing x-session-id header');
  } else if (!/^session_\d+_[a-z0-9]+$/.test(sessionId)) {
    errors.push('Invalid session ID format');
  }
  
  // Check User-Agent (basic validation)
  const userAgent = request.headers.get('user-agent');
  if (!userAgent || userAgent.length < 10) {
    errors.push('Invalid or missing User-Agent header');
  }
  
  // Check for suspicious headers
  const suspiciousHeaders = ['x-forwarded-for', 'x-real-ip', 'x-cluster-client-ip'];
  for (const header of suspiciousHeaders) {
    const value = request.headers.get(header);
    if (value && value.includes('..')) {
      errors.push(`Suspicious value in ${header} header`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Sanitize request headers
 */
export function sanitizeRequestHeaders(request: Request): Headers {
  const sanitizedHeaders = new Headers();
  
  // Copy safe headers only
  const safeHeaders = [
    'content-type',
    'authorization',
    'x-session-id',
    'x-request-id',
    'user-agent',
    'accept',
    'accept-language',
    'accept-encoding',
  ];
  
  safeHeaders.forEach(headerName => {
    const value = request.headers.get(headerName);
    if (value) {
      // Basic sanitization
      const sanitizedValue = value
        .replace(/[\x00-\x1f\x7f-\x9f]/g, '') // Remove control characters
        .substring(0, 1000); // Limit length
      
      sanitizedHeaders.set(headerName, sanitizedValue);
    }
  });
  
  return sanitizedHeaders;
}

/**
 * Create secure error response
 */
export function createSecureErrorResponse(
  error: string,
  status: number = 500,
  request: Request,
  config?: Partial<SecurityHeadersConfig>
): Response {
  const response = new Response(
    JSON.stringify({
      success: false,
      error: error.substring(0, 500), // Limit error message length
      timestamp: new Date().toISOString(),
    }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
  
  return addSecurityHeaders(response, request, config);
}

/**
 * Create secure success response
 */
export function createSecureSuccessResponse<T>(
  data: T,
  status: number = 200,
  request: Request,
  config?: Partial<SecurityHeadersConfig>
): Response {
  const response = new Response(
    JSON.stringify({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
  
  return addSecurityHeaders(response, request, config);
}

export default {
  getSecurityConfig,
  isOriginAllowed,
  getSecurityHeaders,
  handleSecureCorsPreflightRequest,
  addSecurityHeaders,
  addRateLimitHeaders,
  validateRequestHeaders,
  sanitizeRequestHeaders,
  createSecureErrorResponse,
  createSecureSuccessResponse,
};