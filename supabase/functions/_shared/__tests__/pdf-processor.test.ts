/**
 * Tests for PDF processor utilities
 */

import { assertEquals, assertThrows } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import {
  validatePDFFormat,
  validatePDFSize,
  cleanExtractedText,
  getPDFSize,
  extractAndValidatePDFText
} from '../pdf-processor.ts';

Deno.test('PDF Processor - validatePDFFormat with valid PDF header', () => {
  const validPDFBuffer = new TextEncoder().encode('%PDF-1.4\n%âãÏÓ\n');
  const arrayBuffer = validPDFBuffer.buffer.slice(0);
  
  assertEquals(validatePDFFormat(arrayBuffer), true);
});

Deno.test('PDF Processor - validatePDFFormat with invalid header', () => {
  const invalidBuffer = new TextEncoder().encode('Not a PDF file');
  const arrayBuffer = invalidBuffer.buffer.slice(0);
  
  assertEquals(validatePDFFormat(arrayBuffer), false);
});

Deno.test('PDF Processor - validatePDFSize within limit', () => {
  const smallBuffer = new ArrayBuffer(1024); // 1KB
  const maxSize = 10 * 1024 * 1024; // 10MB
  
  assertEquals(validatePDFSize(smallBuffer, maxSize), true);
});

Deno.test('PDF Processor - validatePDFSize exceeds limit', () => {
  const largeBuffer = new ArrayBuffer(15 * 1024 * 1024); // 15MB
  const maxSize = 10 * 1024 * 1024; // 10MB
  
  assertEquals(validatePDFSize(largeBuffer, maxSize), false);
});

Deno.test('PDF Processor - getPDFSize returns correct size', () => {
  const buffer = new ArrayBuffer(2048);
  
  assertEquals(getPDFSize(buffer), 2048);
});

Deno.test('PDF Processor - cleanExtractedText removes excessive whitespace', () => {
  const messyText = '  This   is    a   test   with   lots   of   spaces  ';
  const cleaned = cleanExtractedText(messyText);
  
  assertEquals(cleaned, 'This is a test with lots of spaces');
});

Deno.test('PDF Processor - cleanExtractedText removes special characters', () => {
  const textWithSpecialChars = 'Hello™ World® Test© Document';
  const cleaned = cleanExtractedText(textWithSpecialChars);
  
  assertEquals(cleaned, 'Hello World Test Document');
});

Deno.test('PDF Processor - cleanExtractedText preserves normal punctuation', () => {
  const normalText = 'Hello, world! This is a test. Email: test@example.com (123) 456-7890.';
  const cleaned = cleanExtractedText(normalText);
  
  assertEquals(cleaned, 'Hello, world! This is a test. Email: test@example.com (123) 456-7890.');
});

Deno.test('PDF Processor - extractAndValidatePDFText throws on invalid format', async () => {
  const invalidBuffer = new TextEncoder().encode('Not a PDF').buffer.slice(0);
  
  try {
    await extractAndValidatePDFText(invalidBuffer);
    throw new Error('Should have thrown an error');
  } catch (error) {
    assertEquals(error.message, 'Invalid PDF format');
  }
});

Deno.test('PDF Processor - extractAndValidatePDFText throws on oversized file', async () => {
  // Create a valid PDF header but oversized buffer
  const validPDFHeader = new TextEncoder().encode('%PDF-1.4\n');
  const largeBuffer = new ArrayBuffer(15 * 1024 * 1024); // 15MB
  const view = new Uint8Array(largeBuffer);
  view.set(validPDFHeader);
  
  const maxSize = 10 * 1024 * 1024; // 10MB
  
  try {
    await extractAndValidatePDFText(largeBuffer, maxSize);
    throw new Error('Should have thrown an error');
  } catch (error) {
    assertEquals(error.message.includes('PDF file too large'), true);
  }
});

Deno.test('PDF Processor - extractAndValidatePDFText succeeds with valid PDF', async () => {
  // Create a minimal valid PDF buffer
  const validPDFHeader = new TextEncoder().encode('%PDF-1.4\n');
  const buffer = new ArrayBuffer(1024);
  const view = new Uint8Array(buffer);
  view.set(validPDFHeader);
  
  const result = await extractAndValidatePDFText(buffer);
  
  // Should return the simulated text
  assertEquals(typeof result, 'string');
  assertEquals(result.length > 50, true); // Should have substantial content
});