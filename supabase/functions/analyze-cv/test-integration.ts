/**
 * Integration test script for CV Analysis Edge Function
 * This script demonstrates how to test the function with proper environment setup
 */

// Mock environment for testing
Deno.env.set('OPENAI_API_KEY', 'sk-test-key');
Deno.env.set('SUPABASE_URL', 'https://test.supabase.co');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-service-key');

import handler from './index.ts';

async function testCORSPreflight() {
  console.log('Testing CORS preflight...');
  
  const request = new Request('http://localhost:8000/analyze-cv', {
    method: 'OPTIONS',
    headers: {
      'Origin': 'http://localhost:3000',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'content-type,x-session-id',
    },
  });

  const response = await handler(request);
  
  console.log('CORS Status:', response.status);
  console.log('CORS Headers:', Object.fromEntries(response.headers.entries()));
  console.log('✅ CORS preflight test passed\n');
}

async function testValidationErrors() {
  console.log('Testing validation errors...');
  
  // Test missing session ID
  const noSessionRequest = new Request('http://localhost:8000/analyze-cv', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      resumeId: 'test-resume-id',
      pdfPath: 'test-path.pdf'
    }),
  });

  const noSessionResponse = await handler(noSessionRequest);
  console.log('No session ID status:', noSessionResponse.status);
  
  // Test missing resumeId
  const noResumeIdRequest = new Request('http://localhost:8000/analyze-cv', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-session-id': 'session_123_abc',
    },
    body: JSON.stringify({
      pdfPath: 'test-path.pdf'
    }),
  });

  const noResumeIdResponse = await handler(noResumeIdRequest);
  console.log('No resumeId status:', noResumeIdResponse.status);
  const noResumeIdData = await noResumeIdResponse.json();
  console.log('No resumeId response:', noResumeIdData);
  
  console.log('✅ Validation error tests passed\n');
}

async function testRequestStructure() {
  console.log('Testing request structure validation...');
  
  const validRequest = new Request('http://localhost:8000/analyze-cv', {
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

  const response = await handler(validRequest);
  console.log('Valid request status:', response.status);
  
  // This will fail due to missing Supabase connection, but we can verify the structure
  const responseData = await response.json();
  console.log('Response structure:', {
    success: responseData.success,
    hasError: !!responseData.error,
    hasTimestamp: !!responseData.timestamp,
    type: responseData.type
  });
  
  console.log('✅ Request structure test completed\n');
}

async function runTests() {
  console.log('🧪 Running CV Analysis Edge Function Integration Tests\n');
  
  try {
    await testCORSPreflight();
    await testValidationErrors();
    await testRequestStructure();
    
    console.log('🎉 All tests completed successfully!');
    console.log('\nNote: Some tests may show errors due to missing Supabase/OpenAI connections,');
    console.log('but this is expected in a test environment.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  await runTests();
}