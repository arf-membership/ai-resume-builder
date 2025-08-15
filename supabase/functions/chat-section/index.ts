/**
 * Chat Section Edge Function
 * Handles AI-powered chat interactions for gathering additional information during section editing
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import OpenAI from 'https://esm.sh/openai@4.20.1';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface ChatRequest {
  action: 'initialize' | 'send' | 'complete';
  resumeId: string;
  sectionName: string;
  messages?: ChatMessage[];
}

interface ChatResponse {
  message?: ChatMessage;
  requiresMoreInfo: boolean;
  suggestedQuestions?: string[];
  updatedContent?: string;
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-session-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Initialize OpenAI client
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const openai = new OpenAI({
      apiKey: openaiApiKey,
    });

    // Parse request
    const { action, resumeId, sectionName, messages }: ChatRequest = await req.json();

    // Validate request
    if (!action || !resumeId || !sectionName) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields: action, resumeId, sectionName'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get session ID from headers
    const sessionId = req.headers.get('x-session-id');
    if (!sessionId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Session ID is required'
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get resume data
    const { data: resumeData, error: resumeError } = await supabaseClient
      .from('resumes')
      .select('*')
      .eq('id', resumeId)
      .eq('user_session_id', sessionId)
      .single();

    if (resumeError || !resumeData) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Resume not found or access denied'
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get analysis data
    const analysisData = resumeData.analysis_json;
    if (!analysisData) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Resume analysis not found'
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Find the section
    const section = analysisData.sections.find((s: any) => s.section_name === sectionName);
    if (!section) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Section "${sectionName}" not found`
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    let response: ChatResponse;

    switch (action) {
      case 'initialize':
        response = await initializeChat(openai, section);
        break;
      case 'send':
        if (!messages || messages.length === 0) {
          throw new Error('Messages are required for send action');
        }
        response = await sendMessage(openai, section, messages);
        break;
      case 'complete':
        if (!messages || messages.length === 0) {
          throw new Error('Messages are required for complete action');
        }
        response = await completeChat(openai, section, messages);
        break;
      default:
        throw new Error(`Invalid action: ${action}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: response
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Chat section error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

/**
 * Initialize chat with AI question
 */
async function initializeChat(openai: OpenAI, section: any): Promise<ChatResponse> {
  const prompt = `You are an AI assistant helping to improve a CV section. 

Section: ${section.section_name}
Current Content: ${section.content}
Current Feedback: ${section.feedback}
Suggestions: ${section.suggestions}

Your task is to ask ONE specific question to gather additional information that would help improve this section. The question should be:
1. Specific and actionable
2. Related to missing information that would strengthen the section
3. Professional and encouraging
4. Easy to answer

Examples of good questions:
- "What specific achievements or metrics can you share from your experience at [company]?"
- "Can you tell me about any certifications or training you've completed in this area?"
- "What technologies or tools did you use in your most successful project?"

Respond with just the question, no additional text.`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      {
        role: 'system',
        content: prompt
      }
    ],
    max_tokens: 150,
    temperature: 0.7,
  });

  const aiResponse = completion.choices[0]?.message?.content?.trim();
  if (!aiResponse) {
    throw new Error('Failed to generate initial question');
  }

  const message: ChatMessage = {
    id: `assistant-${Date.now()}`,
    role: 'assistant',
    content: aiResponse,
    timestamp: new Date().toISOString()
  };

  return {
    message,
    requiresMoreInfo: true
  };
}

/**
 * Send message and get AI response
 */
async function sendMessage(openai: OpenAI, section: any, messages: ChatMessage[]): Promise<ChatResponse> {
  // Build conversation context
  const conversationHistory = messages.map(msg => ({
    role: msg.role,
    content: msg.content
  }));

  const systemPrompt = `You are an AI assistant helping to improve a CV section through conversation.

Section: ${section.section_name}
Current Content: ${section.content}
Current Feedback: ${section.feedback}
Suggestions: ${section.suggestions}

Based on the conversation so far, either:
1. Ask a follow-up question to gather more specific information
2. If you have enough information, acknowledge that you're ready to improve the section

Guidelines:
- Keep responses conversational and encouraging
- Ask specific, actionable questions
- If the user has provided good information, acknowledge it and ask if there's anything else
- Don't ask more than 3-4 questions total
- Focus on information that will directly improve the CV section

Respond naturally as if having a conversation.`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      {
        role: 'system',
        content: systemPrompt
      },
      ...conversationHistory
    ],
    max_tokens: 200,
    temperature: 0.7,
  });

  const aiResponse = completion.choices[0]?.message?.content?.trim();
  if (!aiResponse) {
    throw new Error('Failed to generate response');
  }

  const message: ChatMessage = {
    id: `assistant-${Date.now()}`,
    role: 'assistant',
    content: aiResponse,
    timestamp: new Date().toISOString()
  };

  // Determine if more info is needed based on conversation length and content
  const userMessages = messages.filter(msg => msg.role === 'user');
  const requiresMoreInfo = userMessages.length < 3 && !aiResponse.toLowerCase().includes('ready') && !aiResponse.toLowerCase().includes('enough');

  return {
    message,
    requiresMoreInfo
  };
}

/**
 * Complete chat and generate updated content
 */
async function completeChat(openai: OpenAI, section: any, messages: ChatMessage[]): Promise<ChatResponse> {
  // Extract user responses
  const userResponses = messages
    .filter(msg => msg.role === 'user')
    .map(msg => msg.content)
    .join('\n\n');

  const prompt = `You are an AI assistant helping to improve a CV section based on additional information gathered through conversation.

Original Section: ${section.section_name}
Original Content: ${section.content}
Original Feedback: ${section.feedback}
Suggestions: ${section.suggestions}

Additional Information from User:
${userResponses}

Task: Rewrite the section content incorporating the new information. The improved content should:
1. Address the original feedback and suggestions
2. Incorporate the additional information provided by the user
3. Be professional and well-formatted
4. Use strong action verbs and quantifiable achievements where possible
5. Be appropriate for the section type (experience, skills, education, etc.)

Respond with ONLY the improved section content, no additional text or explanations.`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      {
        role: 'system',
        content: prompt
      }
    ],
    max_tokens: 500,
    temperature: 0.7,
  });

  const updatedContent = completion.choices[0]?.message?.content?.trim();
  if (!updatedContent) {
    throw new Error('Failed to generate updated content');
  }

  return {
    requiresMoreInfo: false,
    updatedContent
  };
}