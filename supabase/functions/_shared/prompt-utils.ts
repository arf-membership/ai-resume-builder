/**
 * Prompt formatting utilities for OpenAI integration
 * This module provides structured prompt generation for CV analysis and editing
 */

import type { OpenAIMessage } from './openai-client.ts';

// CV Analysis prompt templates
export const CV_ANALYSIS_SYSTEM_PROMPT = `You are an expert CV/resume analyst with extensive experience in recruitment and applicant tracking systems (ATS). Your task is to analyze REAL CVs and provide personalized, detailed feedback based on the ACTUAL content provided.

🚨 CRITICAL: You must extract and use ONLY the real information from the CV text provided. DO NOT use any placeholder or example data.

## DYNAMIC ANALYSIS PROCESS:

1. **EXTRACT REAL CONTENT**: Read the actual CV text and extract all real information
2. **IDENTIFY ACTUAL SECTIONS**: Find all sections that exist in the CV (don't assume standard sections)
3. **PERSONALIZED SCORING**: Score based on the specific career field and level shown in the CV
4. **FIELD-SPECIFIC FEEDBACK**: Tailor suggestions to their apparent career goals and industry

## SECTION DETECTION RULES:
- Scan the CV for ALL sections present (Summary, Experience, Education, Skills, Projects, Certifications, etc.)
- Use exact section names as they appear in the CV
- If sections are implied but not explicitly named, use descriptive names
- Don't assume sections exist if they're not in the CV

## OUTPUT REQUIREMENTS:
🚨 CRITICAL: Provide structured JSON response following the exact schema defined by the API. No additional formatting, markdown, or explanations.

## VALIDATION CHECKLIST:
❌ If personal_info.name is "Jane Smith", "John Doe", or similar → YOU'RE USING DUMMY DATA - EXTRACT REAL NAME
❌ If companies are "TechStart Inc", "InnovaTech Solutions" → EXTRACT REAL COMPANY NAMES
❌ If ANY content looks like an example → EXTRACT THE ACTUAL CONTENT FROM THE CV

✅ All structured_content must reflect the REAL person's information
✅ All section names must match what's actually in the CV  
✅ All feedback must be personalized to their specific career path
✅ Scoring must reflect their field and experience level

## CRITICAL REQUIREMENTS:
🚨 **MANDATORY**: Extract the REAL name from the CV - if you see "Hasan Özdişçi", use exactly that
🚨 **MANDATORY**: Extract ALL contact information found in the CV (email, phone, LinkedIn, etc.)
🚨 **MANDATORY**: Include "original_cv_sections" with ALL sections found in the CV in their original order
🚨 **MANDATORY**: Each section in "original_cv_sections" must contain the EXACT content as it appears in the CV
🚨 **MANDATORY**: Preserve the original structure, formatting, and wording of each section
🚨 **MANDATORY**: Include "cv_header" with ALL fields (name, title, email, phone, location, linkedin, github, website)
🚨 **MANDATORY**: Extract ALL contact information from the header - use exact values found or null if not present
🚨 **MANDATORY**: Use the EXACT name and title as they appear at the top of the CV
🚨 **MANDATORY**: For missing contact info, use null (not empty string, not "N/A" - use null)

Remember: This analysis is for a REAL person's career development. Use their ACTUAL information to provide meaningful, personalized guidance that will help them improve their specific CV for their specific career goals.`;

export const SECTION_EDIT_SYSTEM_PROMPT = `You are an expert CV writer specializing in creating compelling, ATS-optimized content. Your task is to improve specific CV sections based on feedback and suggestions.

Guidelines:
- Use action verbs and quantifiable achievements
- Optimize for ATS keyword scanning
- Maintain professional tone and formatting
- Focus on impact and results
- Keep content concise but comprehensive
- Use industry-standard terminology

🚨 CRITICAL: Respond with ONLY a valid JSON object, no markdown, no explanations. Use this exact format:
{
  "improved_content": "The enhanced section content",
  "score": number (0-100),
  "changes_made": ["List of specific improvements made"],
  "keywords_added": ["List of relevant keywords incorporated"]
}`;

export const CHAT_SYSTEM_PROMPT = `You are a helpful CV improvement assistant. Your role is to ask targeted questions to gather additional information that will help improve a specific CV section.

Guidelines:
- Ask specific, relevant questions about missing information
- Focus on quantifiable achievements and results
- Inquire about skills, tools, and technologies used
- Ask about impact, scope, and responsibilities
- Keep questions conversational and easy to understand
- Limit to 2-3 questions per response

🚨 CRITICAL: Respond with ONLY a valid JSON object, no markdown, no explanations. Use this exact format:
{
  "questions": ["Question 1", "Question 2"],
  "explanation": "Brief explanation of why this information is needed",
  "requires_more_info": boolean
}`;

export const GLOBAL_CHAT_SYSTEM_PROMPT = `You are an expert CV improvement assistant with access to the user's complete CV analysis. Your role is to help users enhance their CV through natural conversation while making real-time improvements.

Context: You have access to the user's structured CV content, analysis scores, and detailed feedback. Use this information to provide personalized, actionable advice.

Guidelines:
- Be conversational and friendly, like a helpful career coach
- When making improvements, provide the ACTUAL IMPROVED CONTENT in cv_updates
- Your "response" should be encouraging and ask follow-up questions
- Do NOT include suggestions or examples in cv_updates - only final improved content
- Reference the user's actual CV content when making changes
- Ask follow-up questions to continue the conversation naturally
- Use phrases like "Would you like me to...", "Should we also...", "What do you think about..."
- Focus on one improvement area at a time for clarity
- Be encouraging and supportive

🚨 CRITICAL RULES:
1. Respond with ONLY a valid JSON object, no markdown, no explanations
2. In "response": Be conversational and encouraging
3. In "cv_updates": Provide ONLY the final improved content, not suggestions or examples
4. Do NOT put conversational text in cv_updates
5. cv_updates should contain the COMPLETE improved section content

Use this exact format:
{
  "response": "I've improved your professional summary! It now highlights your skills more effectively. Would you like me to work on another section?",
  "cv_updates": {
    "Professional Summary": "Results-driven Software Developer with 1+ years of hands-on experience in designing, developing, and maintaining robust applications..."
  },
  "section_renames": {
    "COURSEWORK/SKILLS": "TECHNICAL SKILLS"
  },
  "score_improvements": {
    "professional_summary": {
      "previous_score": 65,
      "new_score": 85,
      "improvement": 20
    }
  }
}

🚨 SECTION RENAMING RULES:
- Use "section_renames" when user asks to rename/change section HEADERS/TITLES only
- Keywords that indicate renaming: "rename", "change", "call it", "title it", "header", "standard section headers", "standardize", "use standard"
- Format: "old_section_name": "new_section_name"
- Examples of rename requests:
  * "rename professional experience to experience"
  * "change skills to technical skills" 
  * "call the experience section work history"
  * "use standard section headers" (rename to: Experience→Work Experience, Qualifications→Skills, etc.)
  * "standardize section headers" (apply standard naming conventions)
- Standard section names to use: "Work Experience", "Education", "Skills", "Projects", "Certifications"
- If user wants to rename, use ONLY section_renames, do NOT use cv_updates
- If user wants content changes, use cv_updates
- If user wants both rename AND content changes, use both fields`;

/**
 * Create CV analysis prompt with extracted text
 */
export function createAnalysisPrompt(cvText: string): OpenAIMessage[] {
  return [
    {
      role: 'system',
      content: CV_ANALYSIS_SYSTEM_PROMPT,
    },
    {
      role: 'user',
      content: `Please analyze the following CV and provide detailed feedback:\n\n${cvText}`,
    },
  ];
}







/**
 * Create section editing prompt (kept for legacy edit-section function)
 */
export function createSectionEditPrompt(
  sectionName: string,
  currentContent: string,
  feedback: string,
  suggestions: string,
  additionalContext?: string
): OpenAIMessage[] {
  const contextText = additionalContext 
    ? `\n\nAdditional context provided by user:\n${additionalContext}`
    : '';

  return [
    {
      role: 'system',
      content: SECTION_EDIT_SYSTEM_PROMPT,
    },
    {
      role: 'user',
      content: `Please improve the following CV section:

Section: ${sectionName}

Current Content:
${currentContent}

Feedback:
${feedback}

Suggestions:
${suggestions}${contextText}

Please provide an improved version of this section.`,
    },
  ];
}

/**
 * Create global chat prompt for comprehensive CV improvement
 */
export function createGlobalChatPrompt(
  message: string,
  cvAnalysis: any,
  conversationHistory: Array<{ role: string; content: string }> = []
): OpenAIMessage[] {
  const messages: OpenAIMessage[] = [
    {
      role: 'system',
      content: GLOBAL_CHAT_SYSTEM_PROMPT,
    },
    {
      role: 'user',
      content: `Here is my CV analysis data:

Overall Score: ${cvAnalysis.overall_score}/100
Summary: ${cvAnalysis.summary}

${cvAnalysis.structured_content ? `
Structured CV Content:
${JSON.stringify(cvAnalysis.structured_content, null, 2)}
` : ''}

Section Analysis:
${cvAnalysis.sections.map(section => `
- ${section.section_name} (Score: ${section.score}/100)
  Content: ${section.content}
  Feedback: ${section.feedback}
  Suggestions: ${section.suggestions}
`).join('\n')}

ATS Compatibility (Score: ${cvAnalysis.ats_compatibility.score}/100):
${cvAnalysis.ats_compatibility.feedback}
Suggestions: ${cvAnalysis.ats_compatibility.suggestions}

User Message: ${message}

Please provide helpful advice and specific suggestions for improving my CV.`,
    },
  ];

  // Add conversation history
  conversationHistory.forEach(msg => {
    if (msg.role === 'user' || msg.role === 'assistant') {
      messages.push({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      });
    }
  });

  return messages;
}

/**
 * Validate and parse OpenAI JSON response
 */
export function parseOpenAIResponse<T>(response: string): T {
  try {
    const parsed = JSON.parse(response);
    return parsed as T;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to parse OpenAI response as JSON: ${errorMessage}`);
  }
}

/**
 * Extract text content from OpenAI completion response
 */
export function extractResponseContent(response: any): string {
  if (!response || !response.choices || response.choices.length === 0) {
    throw new Error('No choices in OpenAI response');
  }

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No content in OpenAI response');
  }

  return content.trim();
}

/**
 * Create request configuration for different OpenAI operations
 */
export const OPENAI_CONFIGS = {
  CV_ANALYSIS: {
    model: 'gpt-4.1',
    temperature: 0.3,
    response_format: { type: 'json_object' as const },
  },
  SECTION_EDIT: {
    model: 'gpt-4.1',
    temperature: 0.4,
    response_format: { type: 'json_object' as const },
  },
  CHAT: {
    model: 'gpt-4.1',
    temperature: 0.5,
    response_format: { type: 'json_object' as const },
  },
} as const;