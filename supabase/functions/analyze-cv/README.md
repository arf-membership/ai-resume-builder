# CV Analysis Edge Function

This Supabase Edge Function processes uploaded CVs, extracts text from PDFs, analyzes them using OpenAI, and stores the results in the database.

## Features

- **PDF Text Extraction**: Extracts text content from uploaded PDF files
- **AI Analysis**: Uses OpenAI to analyze CV content and provide structured feedback
- **Database Integration**: Stores analysis results in Supabase database
- **Error Handling**: Comprehensive error handling with retry logic
- **Validation**: Input validation and security measures
- **Performance Monitoring**: Execution time tracking and logging

## Requirements

This function addresses the following requirements:
- **2.3**: AI provider integration with OpenAI API
- **2.4**: Structured JSON output with CV analysis
- **2.5**: Error handling and retry mechanisms
- **9.2**: User-friendly error messages and feedback

## API Endpoint

```
POST /analyze-cv
```

### Headers

- `Content-Type: application/json`
- `x-session-id: string` (required) - Session ID in format `session_<timestamp>_<random>`

### Request Body

```json
{
  "resumeId": "string", // UUID of the resume record
  "pdfPath": "string"   // Optional: PDF path in storage (will be fetched from DB if not provided)
}
```

### Response

#### Success Response (200)

```json
{
  "success": true,
  "data": {
    "resumeId": "string",
    "analysis": {
      "overall_score": 85,
      "summary": "Overall assessment of the CV",
      "sections": [
        {
          "section_name": "Professional Summary",
          "score": 90,
          "content": "Extracted section content",
          "feedback": "Specific feedback about this section",
          "suggestions": "Actionable improvement suggestions"
        }
      ],
      "ats_compatibility": {
        "score": 80,
        "feedback": "ATS compatibility assessment",
        "suggestions": "Specific ATS optimization recommendations"
      }
    }
  },
  "message": "CV analysis completed successfully",
  "timestamp": "2025-08-15T06:39:23.150Z"
}
```

#### Error Response (400/500)

```json
{
  "success": false,
  "error": "Error message",
  "type": "error_type",
  "timestamp": "2025-08-15T06:39:23.150Z"
}
```

## Error Types

- `validation_error` (400): Invalid input data
- `extraction_error` (400): PDF text extraction failed
- `rate_limit_error` (429): OpenAI rate limit exceeded
- `timeout_error` (408): Request timeout
- `ai_service_error` (503): AI service unavailable
- `internal_error` (500): Unexpected server error

## Environment Variables

Required environment variables:

```bash
OPENAI_API_KEY=your_openai_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

Optional environment variables:

```bash
CORS_ORIGINS=http://localhost:3000,https://yourdomain.com
MAX_FILE_SIZE=10485760  # 10MB default
MAX_REQUEST_TIMEOUT=300000  # 5 minutes default
```

## Database Schema

The function interacts with the `resumes` table:

```sql
CREATE TABLE resumes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_session_id TEXT NOT NULL,
    original_pdf_path TEXT NOT NULL,
    generated_pdf_path TEXT,
    analysis_json JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Processing Flow

1. **Request Validation**: Validates session ID and request body
2. **Resume Verification**: Verifies resume exists and belongs to session
3. **PDF Download**: Downloads PDF from Supabase Storage
4. **Text Extraction**: Extracts text content from PDF
5. **AI Analysis**: Sends text to OpenAI for structured analysis
6. **Result Storage**: Stores analysis results in database
7. **Response**: Returns structured analysis data

## PDF Processing

The function uses a modular PDF processor that:

- Validates PDF format and file size
- Extracts text content (currently simulated for demo)
- Cleans and normalizes extracted text
- Handles various PDF formats and edge cases

## OpenAI Integration

The function leverages shared OpenAI utilities:

- **Structured Prompts**: Uses predefined prompts for consistent analysis
- **Response Parsing**: Validates and parses JSON responses
- **Error Handling**: Handles rate limits, timeouts, and API errors
- **Retry Logic**: Implements exponential backoff for failed requests

## Security Features

- **Input Validation**: Validates all input parameters
- **Session Verification**: Ensures users can only access their own data
- **File Size Limits**: Prevents processing of oversized files
- **CORS Protection**: Configurable CORS origins
- **Error Sanitization**: Prevents sensitive information leakage

## Performance Considerations

- **Execution Tracking**: Monitors processing time for each step
- **Memory Management**: Efficient handling of PDF buffers
- **Database Optimization**: Minimal database queries
- **Caching**: Leverages browser and CDN caching where appropriate

## Testing

Run the test suite:

```bash
# Unit tests
deno test supabase/functions/analyze-cv/__tests__/index.test.ts --allow-env --no-check

# Integration tests
deno run --allow-env --no-check supabase/functions/analyze-cv/test-integration.ts
```

## Deployment

Deploy to Supabase:

```bash
supabase functions deploy analyze-cv
```

## Usage Example

```javascript
const response = await fetch('/functions/v1/analyze-cv', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-session-id': 'session_1692086400_abc123',
    'Authorization': `Bearer ${supabaseAnonKey}`
  },
  body: JSON.stringify({
    resumeId: 'resume-uuid-here',
    pdfPath: 'path/to/resume.pdf'
  })
});

const result = await response.json();
console.log('Analysis result:', result.data.analysis);
```

## Monitoring and Logging

The function provides comprehensive logging:

- Request processing start/end
- PDF extraction progress
- OpenAI API calls and responses
- Error details and stack traces
- Performance metrics

All logs are structured JSON for easy parsing and monitoring.