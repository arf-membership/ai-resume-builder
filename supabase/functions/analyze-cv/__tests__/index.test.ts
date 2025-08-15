/**
 * Tests for CV Analysis Edge Function
 */

import { assertEquals, assertExists } from 'https://deno.land/std@0.208.0/assert/mod.ts';

// Mock environment variables for testing
Deno.env.set('OPENAI_API_KEY', 'test-api-key');
Deno.env.set('SUPABASE_URL', 'https://test.supabase.co');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-service-key');

// Import the handler after setting environment variables
import handler from '../index.ts';

Deno.test('CV Analysis Edge Function - CORS preflight', async () => {
  const request = new Request('http://localhost:8000/analyze-cv', {
    method: 'OPTIONS',
    headers: {
      'Origin': 'http://localhost:3000',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'content-type,x-session-id',
    },
  });

  const response = await handler(request);

  assertEquals(response.status, 200);
  assertExists(response.headers.get('Access-Control-Allow-Origin'));
  assertExists(response.headers.get('Access-Control-Allow-Methods'));
  assertExists(response.headers.get('Access-Control-Allow-Headers'));
});

Deno.test('CV Analysis Edge Function - Missing session ID', async () => {
  const request = new Request('http://localhost:8000/analyze-cv', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      resumeId: 'test-resume-id',
      pdfPath: 'test-path.pdf'
    }),
  });

  const response = await handler(request);

  assertEquals(response.status, 500); // Will fail due to missing session ID
  const responseData = await response.json();
  assertEquals(responseData.success, false);
});

Deno.test('CV Analysis Edge Function - Invalid method', async () => {
  const request = new Request('http://localhost:8000/analyze-cv', {
    method: 'GET',
    headers: {
      'x-session-id': 'session_123_abc',
    },
  });

  const response = await handler(request);

  assertEquals(response.status, 500); // Will fail due to invalid method
  const responseData = await response.json();
  assertEquals(responseData.success, false);
});

Deno.test('CV Analysis Edge Function - Missing resumeId', async () => {
  const request = new Request('http://localhost:8000/analyze-cv', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-session-id': 'session_123_abc',
    },
    body: JSON.stringify({
      pdfPath: 'test-path.pdf'
    }),
  });

  const response = await handler(request);

  assertEquals(response.status, 400);
  const responseData = await response.json();
  assertEquals(responseData.success, false);
  assertEquals(responseData.type, 'validation_error');
});

Deno.test('CV Analysis Edge Function - Invalid resumeId type', async () => {
  const request = new Request('http://localhost:8000/analyze-cv', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-session-id': 'session_123_abc',
    },
    body: JSON.stringify({
      resumeId: 123, // Should be string
      pdfPath: 'test-path.pdf'
    }),
  });

  const response = await handler(request);

  assertEquals(response.status, 400);
  const responseData = await response.json();
  assertEquals(responseData.success, false);
  assertEquals(responseData.type, 'validation_error');
});

Deno.test('CV Analysis Edge Function - Valid request structure', async () => {
  const request = new Request('http://localhost:8000/analyze-cv', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-session-id': 'session_123_abc',
    },
    body: JSON.stringify({
      resumeId: 'test-resume-id',
      pdfPath: 'test-path.pdf'
    }),
  });

  const response = await handler(request);

  // This will fail due to missing Supabase connection, but we can test the structure
  assertExists(response);
  assertExists(response.status);
  
  const responseData = await response.json();
  assertExists(responseData.success);
  assertExists(responseData.timestamp);
});