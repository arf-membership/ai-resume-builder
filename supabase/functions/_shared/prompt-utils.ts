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

🚨 CRITICAL: You must respond with ONLY a valid JSON object, no markdown, no explanations, no code blocks. Start directly with { and end with }. Use this exact format:
{
  "overall_score": number (0-100),
  "summary": "Personalized assessment based on their specific background and career field",
  "structured_content": {
    "personal_info": {
      "name": "EXTRACT REAL NAME from CV",
      "title": "EXTRACT REAL TITLE/ROLE from CV",
      "contact": {
        "email": "EXTRACT REAL EMAIL from CV",
        "phone": "EXTRACT REAL PHONE from CV",
        "location": "EXTRACT REAL LOCATION from CV",
        "linkedin": "EXTRACT REAL LINKEDIN from CV",
        "website": "EXTRACT REAL WEBSITE/PORTFOLIO from CV"
      }
    },
    "professional_summary": "EXTRACT COMPLETE REAL SUMMARY TEXT from CV",
    "experience": [
      {
        "title": "EXACT JOB TITLE from CV",
        "company": "EXACT COMPANY NAME from CV",
        "location": "EXACT LOCATION from CV",
        "duration": "EXACT DATES from CV",
        "achievements": ["EXACT ACHIEVEMENTS/RESPONSIBILITIES from CV"],
        "skills_used": ["EXACT SKILLS/TECHNOLOGIES mentioned for this role"]
      }
    ],
    "education": [
      {
        "degree": "EXACT DEGREE NAME from CV",
        "institution": "EXACT INSTITUTION NAME from CV",
        "location": "EXACT LOCATION from CV",
        "duration": "EXACT DATES from CV",
        "details": ["EXACT DETAILS like GPA, honors, coursework from CV"]
      }
    ],
    "skills": {
      "technical": ["ALL TECHNICAL SKILLS found in CV"],
      "soft": ["ALL SOFT SKILLS found in CV"],
      "languages": ["ALL LANGUAGES mentioned in CV"]
    },
    "certifications": [
      {
        "name": "EXACT CERTIFICATION NAME from CV",
        "issuer": "EXACT ISSUING ORGANIZATION from CV",
        "date": "EXACT DATE from CV"
      }
    ]
  },
  "sections": [
    {
      "section_name": "EXACT SECTION NAME as it appears in CV",
      "score": number (0-100),
      "content": "COMPLETE EXTRACTED CONTENT from this section",
      "feedback": "Specific feedback about this section's effectiveness for their field",
      "suggestions": "Tailored improvement suggestions for their career level/field"
    }
  ],
  "ats_compatibility": {
    "score": number (0-100),
    "feedback": "ATS assessment specific to their field and career level",
    "suggestions": "Field-specific ATS optimization recommendations"
  }
}

## VALIDATION CHECKLIST:
❌ If personal_info.name is "Jane Smith", "John Doe", or similar → YOU'RE USING DUMMY DATA - EXTRACT REAL NAME
❌ If companies are "TechStart Inc", "InnovaTech Solutions" → EXTRACT REAL COMPANY NAMES
❌ If ANY content looks like an example → EXTRACT THE ACTUAL CONTENT FROM THE CV

✅ All structured_content must reflect the REAL person's information
✅ All section names must match what's actually in the CV  
✅ All feedback must be personalized to their specific career path
✅ Scoring must reflect their field and experience level

## CRITICAL REQUIREMENTS:
🚨 **MANDATORY**: You MUST include the "structured_content" field in your JSON response
🚨 **MANDATORY**: Extract the REAL name from the CV - if you see "Hasan Özdişçi", use exactly that
🚨 **MANDATORY**: Extract ALL contact information found in the CV (email, phone, LinkedIn, etc.)
🚨 **MANDATORY**: Convert ALL sections content into structured format, don't leave any empty

## EXAMPLE FOR TURKISH CV:
If CV shows "Hasan Özdişçi" and "Software Developer", your response MUST include:
"structured_content": {
  "personal_info": {
    "name": "Hasan Özdişçi",
    "title": "Software Developer",
    "contact": {
      "email": "actual_email_from_cv",
      "phone": "actual_phone_from_cv"
    }
  }
}

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

export const GLOBAL_CHAT_SYSTEM_PROMPT = `You are an expert CV improvement assistant with access to the user's complete CV analysis. Your role is to help users enhance their CV through conversational guidance and specific suggestions.

Context: You have access to the user's structured CV content, analysis scores, and detailed feedback. Use this information to provide personalized, actionable advice.

Guidelines:
- Provide specific, actionable advice based on the CV analysis
- Suggest concrete improvements with examples
- Focus on high-impact changes that will improve scores
- Reference specific sections and current content when relevant
- Be encouraging and constructive
- Ask clarifying questions when needed to provide better advice
- Suggest updated content when appropriate

🚨 CRITICAL: Respond with ONLY a valid JSON object, no markdown, no explanations. Use this exact format:
{
  "response": "Your helpful response to the user",
  "cv_updates": {
    "section_name": "updated_content",
    "another_section": "updated_content"
  },
  "suggestions": ["Specific suggestion 1", "Specific suggestion 2"],
  "next_steps": ["Next step 1", "Next step 2"]
}`;

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
 * Create section editing prompt
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
 * Create chat prompt for gathering additional information
 */
export function createChatPrompt(
  sectionName: string,
  currentContent: string,
  suggestions: string,
  conversationHistory: Array<{ role: string; content: string }> = []
): OpenAIMessage[] {
  const messages: OpenAIMessage[] = [
    {
      role: 'system',
      content: CHAT_SYSTEM_PROMPT,
    },
    {
      role: 'user',
      content: `I need help improving the "${sectionName}" section of my CV. Here's the current content:

${currentContent}

Improvement suggestions:
${suggestions}

Please ask me specific questions to gather information that will help create a better version of this section.`,
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
 * Create follow-up section edit prompt with chat context
 */
export function createContextualEditPrompt(
  sectionName: string,
  currentContent: string,
  feedback: string,
  suggestions: string,
  chatContext: Array<{ role: string; content: string }>
): OpenAIMessage[] {
  const contextSummary = chatContext
    .map(msg => `${msg.role}: ${msg.content}`)
    .join('\n');

  return [
    {
      role: 'system',
      content: SECTION_EDIT_SYSTEM_PROMPT,
    },
    {
      role: 'user',
      content: `Please improve the following CV section using the additional context gathered from our conversation:

Section: ${sectionName}

Current Content:
${currentContent}

Original Feedback:
${feedback}

Original Suggestions:
${suggestions}

Conversation Context:
${contextSummary}

Please provide an improved version of this section incorporating the additional information gathered.`,
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
    model: 'gpt-4o-mini',
    temperature: 0.3,
    max_tokens: 4000, // Increased to prevent truncation
    response_format: { type: 'json_object' as const },
  },
  SECTION_EDIT: {
    model: 'gpt-4o-mini',
    temperature: 0.4,
    max_tokens: 1500, // Increased
    response_format: { type: 'json_object' as const },
  },
  CHAT: {
    model: 'gpt-4o-mini',
    temperature: 0.5,
    max_tokens: 800, // Increased
    response_format: { type: 'json_object' as const },
  },
} as const;