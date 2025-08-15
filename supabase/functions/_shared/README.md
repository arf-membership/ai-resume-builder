# OpenAI Integration Utilities for Supabase Edge Functions

This directory contains shared utilities for integrating OpenAI API with Supabase Edge Functions for the AI CV Improvement Platform.

## Files Overview

### `openai-client.ts`
- OpenAI API client with retry logic and error handling
- Custom error classes for different types of failures
- Timeout and rate limiting support
- Secure API key management

### `prompt-utils.ts`
- Structured prompt templates for CV analysis, section editing, and chat
- Prompt formatting functions with proper context
- OpenAI request configuration presets
- Response content extraction utilities

### `response-parser.ts`
- Type-safe parsing and validation of OpenAI responses
- Custom validation error handling
- Input sanitization functions
- Standard API response creators

### `openai-service.ts`
- High-level service class combining all OpenAI operations
- CV analysis, section editing, and chat functionality
- Comprehensive error handling and HTTP response mapping
- Input validation and sanitization

### `config.ts`
- Environment configuration management
- CORS handling for Edge Functions
- Request validation utilities
- Logging and performance measurement tools

## Usage Example

```typescript
// In an Edge Function
import { createOpenAIService, handleOpenAIError } from '../_shared/openai-service.ts';
import { loadConfig, addCorsHeaders, createSuccessResponse } from '../_shared/config.ts';

export default async function handler(req: Request): Promise<Response> {
  try {
    // Handle CORS
    if (req.method === 'OPTIONS') {
      return handleCorsPreflightRequest(req);
    }

    // Create OpenAI service
    const openaiService = await createOpenAIService();

    // Parse request
    const { cvText } = await req.json();

    // Analyze CV
    const analysis = await openaiService.analyzeCVText(cvText);

    // Return response
    const response = createSuccessResponse(analysis);
    return addCorsHeaders(response, req);

  } catch (error) {
    const errorResponse = handleOpenAIError(error);
    return addCorsHeaders(errorResponse, req);
  }
}
```

## Environment Variables Required

- `OPENAI_API_KEY`: OpenAI API key
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key
- `CORS_ORIGINS`: Comma-separated list of allowed origins (optional, defaults to '*')
- `MAX_FILE_SIZE`: Maximum file size in bytes (optional, defaults to 10MB)
- `MAX_REQUEST_TIMEOUT`: Maximum request timeout in milliseconds (optional, defaults to 5 minutes)

## Error Handling

The utilities provide comprehensive error handling for:
- OpenAI API errors (rate limits, timeouts, authentication)
- Validation errors (input sanitization, response parsing)
- Network errors (connectivity, timeouts)
- Configuration errors (missing environment variables)

## Security Features

- Input sanitization and validation
- Secure API key management through environment variables
- CORS configuration
- Request method validation
- Session ID validation
- Rate limiting and timeout handling

## Performance Features

- Retry logic with exponential backoff
- Request timeout management
- Execution time measurement
- Structured logging
- Response caching support (can be added)

## Type Safety

All utilities are fully typed with TypeScript interfaces for:
- OpenAI API requests and responses
- CV analysis data structures
- Error types and validation
- Configuration objects
- API response formats