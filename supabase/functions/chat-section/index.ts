/**
 * Chat Section Edge Function
 * Handles AI-powered chat interactions for CV improvement
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { GLOBAL_CHAT_SYSTEM_PROMPT, OPENAI_CONFIGS } from '../_shared/prompt-utils.ts';
import { parseGlobalChatResponse } from '../_shared/response-parser.ts';
import OpenAI from 'https://esm.sh/openai@4.20.1';



interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

interface ChatRequest {
  resumeId: string;
  sessionId?: string;
  message: string;
  conversationHistory?: ChatMessage[];
}

interface ChatResponse {
  success: boolean;
  response?: string;
  cv_updates?: Record<string, string>;
  suggestions?: string[];
  error?: string;
  details?: string;
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-session-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Handle CV improvement chat
async function handleCVImprovementChat({
  resumeId,
  sessionId,
  message,
  conversationHistory,
  currentCV,
  openai,
  supabaseClient
}: {
  resumeId: string;
  sessionId?: string;
  message: string;
  conversationHistory: ChatMessage[];
  currentCV: any;
  openai: OpenAI;
  supabaseClient: any;
}): Promise<ChatResponse> {
  try {
    console.log('🔍 Processing CV improvement request:', { 
      message: message.substring(0, 100) + '...', 
      historyLength: conversationHistory.length,
      resumeId 
    });

    // Build conversation context
    const messages = [
      {
        role: 'system' as const,
        content: GLOBAL_CHAT_SYSTEM_PROMPT
      },
      {
        role: 'user' as const,
        content: `Current CV Analysis Data:
${JSON.stringify(currentCV, null, 2)}

User Request: ${message}

Previous Conversation:
${conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')}

Please provide a helpful response and any specific CV section updates.`
      }
    ];

    console.log('🚀 Sending request to OpenAI for CV improvement');

    // Get AI response
    const completion = await openai.chat.completions.create({
      ...OPENAI_CONFIGS.CHAT,
      messages,
    });

    const aiResponseContent = completion.choices[0]?.message?.content;
    if (!aiResponseContent) {
      throw new Error('No response content from OpenAI');
    }

    console.log('✅ OpenAI response received:', aiResponseContent.substring(0, 200) + '...');

    // Parse the structured JSON response
    const parsedResponse = parseGlobalChatResponse(aiResponseContent);

    return {
      success: true,
      response: parsedResponse.response,
      cv_updates: parsedResponse.cv_updates,
      suggestions: parsedResponse.suggestions
    };

  } catch (error) {
    console.error('❌ CV improvement chat error:', error);
    return {
      success: false,
      error: 'Failed to process chat message',
      details: error.message
    };
  }
}

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('🔍 Chat section request received');

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
    const requestBody: ChatRequest = await req.json();
    const { resumeId, sessionId, message, conversationHistory = [] } = requestBody;

    console.log('📝 Request data:', { 
      resumeId, 
      sessionId, 
      messageLength: message?.length, 
      historyLength: conversationHistory.length 
    });

    // Validate required fields
    if (!resumeId || !message) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields: resumeId and message are required'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get session ID from request body or headers
    const effectiveSessionId = sessionId || req.headers.get('x-session-id');
    if (!effectiveSessionId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Session ID is required (in body or header)'
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('🔍 Fetching resume data for:', resumeId);

    // Get resume data
    const { data: resumeData, error: resumeError } = await supabaseClient
      .from('resumes')
      .select('*')
      .eq('id', resumeId)
      .eq('user_session_id', effectiveSessionId)
      .single();

    if (resumeError || !resumeData) {
      console.error('❌ Resume not found:', resumeError);
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
      console.error('❌ Analysis data not found');
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

    console.log('✅ Analysis data found, processing CV improvement request');

    // Handle CV improvement chat
    const result = await handleCVImprovementChat({
      resumeId,
      sessionId: effectiveSessionId,
      message,
      conversationHistory,
      currentCV: analysisData,
      openai,
      supabaseClient
    });

    return new Response(
      JSON.stringify(result),
      {
        status: result.success ? 200 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('❌ Chat section error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to process chat message',
        details: error instanceof Error ? error.message : 'Internal server error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

