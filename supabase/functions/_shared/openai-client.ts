/**
 * OpenAI client configuration and utilities for Supabase Edge Functions
 * This module provides secure OpenAI integration with error handling and retry logic
 */

// OpenAI API configuration
export interface OpenAIConfig {
  apiKey: string;
  baseURL?: string;
  organization?: string;
  maxRetries?: number;
  timeout?: number;
}

// OpenAI API response types
export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenAICompletionRequest {
  model: string;
  messages: OpenAIMessage[];
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: 'json_object' };
}

// New Responses API types
export interface OpenAIResponsesRequest {
  model: string;
  instructions: string;
  temperature?: number;
  max_output_tokens?: number;
  input: OpenAIResponseInput[];
  text?: {
    format?: {
      type: 'json_schema';
      name: string;
      schema: any;
      strict?: boolean;
    };
  };
}

export interface OpenAIResponseInput {
  role: 'user';
  content: OpenAIResponseContent[];
}

export interface OpenAIResponseContent {
  type: 'input_file' | 'input_text';
  file_url?: string;
  text?: string;
}

export interface OpenAIResponsesResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  // Actual Responses API structure
  output?: {
    type: string;
    role?: string;
    content?: {
      type: string;
      text?: string;
    }[];
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface OpenAICompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Error types for OpenAI API
export class OpenAIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public type?: string,
    public code?: string
  ) {
    super(message);
    this.name = 'OpenAIError';
  }
}

export class OpenAIRateLimitError extends OpenAIError {
  constructor(message: string, public retryAfter?: number) {
    super(message, 429, 'rate_limit_exceeded');
    this.name = 'OpenAIRateLimitError';
  }
}

export class OpenAITimeoutError extends OpenAIError {
  constructor(message: string) {
    super(message, 408, 'timeout');
    this.name = 'OpenAITimeoutError';
  }
}

/**
 * OpenAI client class with retry logic and error handling
 */
export class OpenAIClient {
  private config: Required<Omit<OpenAIConfig, 'organization'>> & { organization?: string };

  constructor(config: OpenAIConfig) {
    this.config = {
      baseURL: 'https://api.openai.com/v1',
      organization: undefined,
      maxRetries: 3,
      timeout: 60000, // 60 seconds
      ...config,
    };
  }

  /**
   * Create a response using the new Responses API (for PDF files)
   */
  async createResponse(
    request: OpenAIResponsesRequest
  ): Promise<OpenAIResponsesResponse> {
    let lastError: Error;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        const response = await this.makeRequest('/responses', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
            ...(this.config.organization && {
              'OpenAI-Organization': this.config.organization,
            }),
          },
          body: JSON.stringify(request),
          signal: AbortSignal.timeout(this.config.timeout),
        });

        if (!response.ok) {
          await this.handleErrorResponse(response);
        }

        return await response.json();
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on certain errors
        if (
          error instanceof OpenAIError && 
          error.statusCode && 
          [400, 401, 403, 404].includes(error.statusCode)
        ) {
          throw error;
        }

        // Wait before retry (exponential backoff)
        if (attempt < this.config.maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError!;
  }

  /**
   * Create a chat completion with retry logic
   */
  async createChatCompletion(
    request: OpenAICompletionRequest
  ): Promise<OpenAICompletionResponse> {
    let lastError: Error;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        const response = await this.makeRequest('/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
            ...(this.config.organization && {
              'OpenAI-Organization': this.config.organization,
            }),
          },
          body: JSON.stringify(request),
          signal: AbortSignal.timeout(this.config.timeout),
        });

        if (!response.ok) {
          await this.handleErrorResponse(response);
        }

        return await response.json();
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on certain errors
        if (
          error instanceof OpenAIError && 
          error.statusCode && 
          [400, 401, 403, 404].includes(error.statusCode)
        ) {
          throw error;
        }

        // Wait before retry (exponential backoff)
        if (attempt < this.config.maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError!;
  }

  /**
   * Make HTTP request with timeout
   */
  private async makeRequest(endpoint: string, options: RequestInit): Promise<Response> {
    const url = `${this.config.baseURL}${endpoint}`;
    return fetch(url, options);
  }

  /**
   * Handle error responses from OpenAI API
   */
  private async handleErrorResponse(response: Response): Promise<never> {
    let errorData: unknown;
    
    try {
      errorData = await response.json();
    } catch {
      errorData = { error: { message: 'Unknown error occurred' } };
    }

    const message = (errorData as any)?.error?.message || `HTTP ${response.status}`;
    const type = (errorData as any)?.error?.type;
    const code = (errorData as any)?.error?.code;

    switch (response.status) {
      case 429:
        const retryAfter = response.headers.get('retry-after');
        throw new OpenAIRateLimitError(
          message,
          retryAfter ? parseInt(retryAfter) : undefined
        );
      case 408:
        throw new OpenAITimeoutError(message);
      default:
        throw new OpenAIError(message, response.status, type, code);
    }
  }
}

/**
 * Create OpenAI client instance with API key from Supabase Secrets
 */
export async function createOpenAIClient(): Promise<OpenAIClient> {
  // In Edge Functions, we'll get the API key from Supabase Secrets
  const apiKey = (globalThis as any).Deno?.env?.get('OPENAI_API_KEY');
  
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not found in environment variables');
  }

  return new OpenAIClient({
    apiKey,
    maxRetries: 3,
    timeout: 60000,
  });
}