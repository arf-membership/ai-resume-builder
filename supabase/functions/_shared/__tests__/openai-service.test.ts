/**
 * Tests for OpenAI service utilities
 * Note: These tests are designed to run in a Deno environment
 */

import { assertEquals, assertThrows } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { 
  parseCVAnalysisResponse, 
  parseSectionEditResponse, 
  parseChatResponse,
  ValidationError 
} from '../response-parser.ts';

// Mock CV analysis response
const mockCVAnalysisResponse = JSON.stringify({
  overall_score: 85,
  summary: "Strong CV with good technical skills but needs better formatting",
  sections: [
    {
      section_name: "Professional Summary",
      score: 80,
      content: "Experienced software developer with 5 years in web development",
      feedback: "Good technical background mentioned",
      suggestions: "Add more specific achievements and metrics"
    },
    {
      section_name: "Work Experience", 
      score: 90,
      content: "Senior Developer at TechCorp (2020-2024)",
      feedback: "Strong work history with clear progression",
      suggestions: "Quantify achievements with specific numbers"
    }
  ],
  ats_compatibility: {
    score: 75,
    feedback: "Good keyword usage but formatting could be improved",
    suggestions: "Use standard section headers and bullet points"
  }
});

// Mock section edit response
const mockSectionEditResponse = JSON.stringify({
  improved_content: "Results-driven software developer with 5+ years of experience building scalable web applications, leading cross-functional teams of 8+ developers, and delivering projects that increased user engagement by 40%.",
  score: 92,
  changes_made: [
    "Added quantifiable achievements",
    "Improved action verbs",
    "Enhanced technical keywords"
  ],
  keywords_added: [
    "scalable",
    "cross-functional",
    "user engagement"
  ]
});

// Mock chat response
const mockChatResponse = JSON.stringify({
  questions: [
    "What specific technologies did you use in your recent projects?",
    "Can you provide metrics on the impact of your work?"
  ],
  explanation: "I need more details about your technical skills and achievements to improve this section",
  requires_more_info: true
});

Deno.test("parseCVAnalysisResponse - valid response", () => {
  const result = parseCVAnalysisResponse(mockCVAnalysisResponse);
  
  assertEquals(result.overall_score, 85);
  assertEquals(result.summary, "Strong CV with good technical skills but needs better formatting");
  assertEquals(result.sections.length, 2);
  assertEquals(result.sections[0].section_name, "Professional Summary");
  assertEquals(result.sections[0].score, 80);
  assertEquals(result.ats_compatibility.score, 75);
});

Deno.test("parseCVAnalysisResponse - invalid JSON", () => {
  assertThrows(
    () => parseCVAnalysisResponse("invalid json"),
    ValidationError,
    "Invalid JSON response from OpenAI"
  );
});

Deno.test("parseCVAnalysisResponse - missing overall_score", () => {
  const invalidResponse = JSON.stringify({
    summary: "Test summary",
    sections: [],
    ats_compatibility: { score: 80, feedback: "test", suggestions: "test" }
  });
  
  assertThrows(
    () => parseCVAnalysisResponse(invalidResponse),
    ValidationError,
    "overall_score must be a number between 0 and 100"
  );
});

Deno.test("parseCVAnalysisResponse - invalid score range", () => {
  const invalidResponse = JSON.stringify({
    overall_score: 150, // Invalid score > 100
    summary: "Test summary",
    sections: [],
    ats_compatibility: { score: 80, feedback: "test", suggestions: "test" }
  });
  
  assertThrows(
    () => parseCVAnalysisResponse(invalidResponse),
    ValidationError,
    "overall_score must be a number between 0 and 100"
  );
});

Deno.test("parseSectionEditResponse - valid response", () => {
  const result = parseSectionEditResponse(mockSectionEditResponse);
  
  assertEquals(result.score, 92);
  assertEquals(result.changes_made.length, 3);
  assertEquals(result.keywords_added.length, 3);
  assertEquals(result.changes_made[0], "Added quantifiable achievements");
});

Deno.test("parseSectionEditResponse - invalid score", () => {
  const invalidResponse = JSON.stringify({
    improved_content: "Test content",
    score: -10, // Invalid negative score
    changes_made: [],
    keywords_added: []
  });
  
  assertThrows(
    () => parseSectionEditResponse(invalidResponse),
    ValidationError,
    "score must be a number between 0 and 100"
  );
});

Deno.test("parseChatResponse - valid response", () => {
  const result = parseChatResponse(mockChatResponse);
  
  assertEquals(result.questions.length, 2);
  assertEquals(result.requires_more_info, true);
  assertEquals(result.questions[0], "What specific technologies did you use in your recent projects?");
});

Deno.test("parseChatResponse - invalid questions array", () => {
  const invalidResponse = JSON.stringify({
    questions: "not an array", // Should be array
    explanation: "Test explanation",
    requires_more_info: true
  });
  
  assertThrows(
    () => parseChatResponse(invalidResponse),
    ValidationError,
    "questions must be an array"
  );
});

Deno.test("parseChatResponse - empty question in array", () => {
  const invalidResponse = JSON.stringify({
    questions: ["Valid question", ""], // Empty string not allowed
    explanation: "Test explanation", 
    requires_more_info: true
  });
  
  assertThrows(
    () => parseChatResponse(invalidResponse),
    ValidationError,
    "questions[1] must be a non-empty string"
  );
});

// Test prompt formatting
Deno.test("createAnalysisPrompt - basic functionality", async () => {
  const { createAnalysisPrompt } = await import('../prompt-utils.ts');
  
  const cvText = "John Doe\nSoftware Developer\nExperience: 5 years";
  const messages = createAnalysisPrompt(cvText);
  
  assertEquals(messages.length, 2);
  assertEquals(messages[0].role, 'system');
  assertEquals(messages[1].role, 'user');
  assertEquals(messages[1].content.includes(cvText), true);
});

// Test input sanitization
Deno.test("sanitizeTextInput - valid input", async () => {
  const { sanitizeTextInput } = await import('../response-parser.ts');
  
  const input = "  Valid input text  ";
  const result = sanitizeTextInput(input);
  
  assertEquals(result, "Valid input text");
});

Deno.test("sanitizeTextInput - empty input", async () => {
  const { sanitizeTextInput } = await import('../response-parser.ts');
  
  assertThrows(
    () => sanitizeTextInput("   "),
    ValidationError,
    "Input cannot be empty"
  );
});

Deno.test("sanitizeTextInput - too long input", async () => {
  const { sanitizeTextInput } = await import('../response-parser.ts');
  
  const longInput = "a".repeat(10001);
  
  assertThrows(
    () => sanitizeTextInput(longInput),
    ValidationError,
    "Input exceeds maximum length of 10000 characters"
  );
});