/**
 * Prompt formatting utilities for OpenAI integration
 * This module provides structured prompt generation for CV analysis and editing
 */

import type { OpenAIMessage } from './openai-client.ts';

// CV Analysis prompt templates
export const CV_ANALYSIS_SYSTEM_PROMPT = `You are an expert CV/resume analyst with extensive experience in recruitment and applicant tracking systems (ATS). Your task is to analyze CVs and provide detailed, actionable feedback.

You must respond with a valid JSON object in the following format:
{
  "overall_score": number (0-100),
  "summary": "Brief overall assessment",
  "structured_content": {
    "personal_info": {
      "name": "Full name",
      "title": "Professional title",
      "contact": {
        "email": "email@example.com",
        "phone": "+1234567890",
        "location": "City, Country",
        "linkedin": "linkedin.com/in/profile",
        "website": "website.com"
      }
    },
    "professional_summary": "Professional summary content",
    "experience": [
      {
        "title": "Job title",
        "company": "Company name",
        "location": "City, Country",
        "duration": "Start - End",
        "achievements": ["Achievement 1", "Achievement 2"],
        "skills_used": ["Skill 1", "Skill 2"]
      }
    ],
    "education": [
      {
        "degree": "Degree name",
        "institution": "Institution name",
        "location": "City, Country",
        "duration": "Start - End",
        "details": ["Detail 1", "Detail 2"]
      }
    ],
    "skills": {
      "technical": ["Skill 1", "Skill 2"],
      "soft": ["Skill 1", "Skill 2"],
      "languages": ["Language 1", "Language 2"]
    },
    "certifications": [
      {
        "name": "Certification name",
        "issuer": "Issuing organization",
        "date": "Date obtained"
      }
    ]
  },
  "sections": [
    {
      "section_name": "Section name",
      "score": number (0-100),
      "content": "Extracted content from this section",
      "feedback": "Specific feedback about this section",
      "suggestions": "Actionable improvement suggestions"
    }
  ],
  "ats_compatibility": {
    "score": number (0-100),
    "feedback": "ATS compatibility assessment",
    "suggestions": "Specific ATS optimization recommendations"
  }
}

Focus on these key areas:
- Professional summary/objective
- Work experience and achievements
- Skills and competencies
- Education and certifications
- Formatting and structure
- ATS compatibility
- Keyword optimization
- Quantifiable achievements`;

export const SECTION_EDIT_SYSTEM_PROMPT = `You are an expert CV writer specializing in creating compelling, ATS-optimized content. Your task is to improve specific CV sections based on feedback and suggestions.

Guidelines:
- Use action verbs and quantifiable achievements
- Optimize for ATS keyword scanning
- Maintain professional tone and formatting
- Focus on impact and results
- Keep content concise but comprehensive
- Use industry-standard terminology

Respond with a JSON object containing:
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

Always respond in JSON format:
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

Always respond in JSON format:
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
    max_tokens: 2000,
    response_format: { type: 'json_object' as const },
  },
  SECTION_EDIT: {
    model: 'gpt-4o-mini',
    temperature: 0.4,
    max_tokens: 1000,
    response_format: { type: 'json_object' as const },
  },
  CHAT: {
    model: 'gpt-4o-mini',
    temperature: 0.5,
    max_tokens: 500,
    response_format: { type: 'json_object' as const },
  },
} as const;