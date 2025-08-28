/**
 * Configuration utilities for Supabase Edge Functions
 * This module provides environment configuration and validation
 */

// Environment configuration interface
export interface EdgeFunctionConfig {
  openaiApiKey: string;
  supabaseUrl: string;
  supabaseServiceKey: string;
  corsOrigins: string[];
  maxFileSize: number;
  maxRequestTimeout: number;
}

/**
 * Load and validate environment configuration
 */
export function loadConfig(): EdgeFunctionConfig {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const corsOrigins = Deno.env.get('CORS_ORIGINS')?.split(',') || ['*'];
  const maxFileSize = parseInt(Deno.env.get('MAX_FILE_SIZE') || '10485760'); // 10MB default
  const maxRequestTimeout = parseInt(Deno.env.get('MAX_REQUEST_TIMEOUT') || '300000'); // 5 minutes default

  // Validate required environment variables
  if (!openaiApiKey) {
    throw new Error('OPENAI_API_KEY environment variable is required');
  }

  if (!supabaseUrl) {
    throw new Error('SUPABASE_URL environment variable is required');
  }

  if (!supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  }

  return {
    openaiApiKey,
    supabaseUrl,
    supabaseServiceKey,
    corsOrigins,
    maxFileSize,
    maxRequestTimeout,
  };
}

/**
 * CORS headers for Edge Functions
 */
export function getCorsHeaders(origin?: string | null): Record<string, string> {
  const config = loadConfig();
  const allowedOrigin = config.corsOrigins.includes('*') || 
    (origin && config.corsOrigins.includes(origin)) ? 
    (origin || '*') : 
    config.corsOrigins[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-session-id',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
    'Access-Control-Max-Age': '86400',
  };
}

/**
 * Handle CORS preflight requests
 */
export function handleCorsPreflightRequest(request: Request): Response {
  const origin = request.headers.get('origin');
  const headers = getCorsHeaders(origin);

  return new Response(null, {
    status: 200,
    headers,
  });
}

/**
 * Add CORS headers to response
 */
export function addCorsHeaders(response: Response, request: Request): Response {
  const origin = request.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  // Create new response with CORS headers
  const newResponse = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: {
      ...Object.fromEntries(response.headers.entries()),
      ...corsHeaders,
    },
  });

  return newResponse;
}

/**
 * Validate request method
 */
export function validateRequestMethod(request: Request, allowedMethods: string[]): void {
  if (!allowedMethods.includes(request.method)) {
    throw new Error(`Method ${request.method} not allowed. Allowed methods: ${allowedMethods.join(', ')}`);
  }
}

/**
 * Extract and validate session ID from request
 */
export function extractSessionId(request: Request): string {
  const sessionId = request.headers.get('x-session-id');
  
  if (!sessionId) {
    throw new Error('Session ID is required in x-session-id header');
  }

  // Basic session ID validation
  if (!/^session_\d+_[a-z0-9]+$/.test(sessionId)) {
    throw new Error('Invalid session ID format');
  }

  return sessionId;
}

/**
 * Create standard error response
 */
export function createErrorResponse(
  error: string, 
  status: number = 500, 
  type: string = 'error'
): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error,
      type,
      timestamp: new Date().toISOString(),
    }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}

/**
 * Create standard success response
 */
export function createSuccessResponse<T>(
  data: T, 
  status: number = 200,
  message?: string
): Response {
  return new Response(
    JSON.stringify({
      success: true,
      data,
      ...(message && { message }),
      timestamp: new Date().toISOString(),
    }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}

/**
 * Log function for Edge Functions
 */
export function log(level: 'info' | 'warn' | 'error', message: string, data?: unknown): void {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    ...(data && { data }),
  };

  console.log(JSON.stringify(logEntry));
}

/**
 * Measure execution time
 */
export async function measureExecutionTime<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> {
  const startTime = performance.now();
  
  try {
    const result = await operation();
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    log('info', `${operationName} completed`, { duration: `${duration.toFixed(2)}ms` });
    return result;
  } catch (error) {
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    log('error', `${operationName} failed`, { 
      duration: `${duration.toFixed(2)}ms`,
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}