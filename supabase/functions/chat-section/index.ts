/**
 * Chat Section Edge Function
 * Handles AI-powered chat interactions for CV improvement
 */

/// <reference types="https://deno.land/x/deno@1.37.0/types.d.ts" />

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { GLOBAL_CHAT_SYSTEM_PROMPT } from '../_shared/prompt-utils.ts';
import { parseGlobalChatResponse } from '../_shared/response-parser.ts';
import { createOpenAIService } from '../_shared/openai-service.ts';



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
  section_renames?: Record<string, string>;
  error?: string;
  details?: string;
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-session-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Handle CV improvement chat with JSON response
async function handleCVImprovementChat({
  resumeId,
  sessionId,
  message,
  conversationHistory,
  currentCV,
  openaiService,
  supabaseClient
}: {
  resumeId: string;
  sessionId?: string;
  message: string;
  conversationHistory: ChatMessage[];
  currentCV: any;
  openaiService: any;
  supabaseClient: any;
}): Promise<Response> {
  try {
    console.log('🔍 Processing CV improvement request with streaming:', { 
      message: message.substring(0, 100) + '...', 
      historyLength: conversationHistory.length,
      resumeId 
    });

    // Build conversation context - exclude conversation history to prevent confusion
    const messages = [
      {
        role: 'system' as const,
        content: GLOBAL_CHAT_SYSTEM_PROMPT
      },
      {
        role: 'user' as const,
        content: `Current CV Analysis Data:
${JSON.stringify(currentCV, null, 2)}

USER REQUEST: ${message}

CRITICAL INSTRUCTIONS:
1. Analyze the user's request to identify which CV section they want to modify
2. If they mention "certification" or "certifications", update the CERTIFICATIONS section
3. If they mention "skills" or "technical skills", update the SKILLS or TECHNICAL SKILLS section
4. If they mention "experience" or "work", update the EXPERIENCE section
5. Return cv_updates with the EXACT section name that matches their request
6. Do NOT use conversation history - focus only on this current request

Please provide a conversational response and update the specific CV section mentioned in the user's request.`
      }
    ];

    console.log('🚀 Sending streaming request to OpenAI for CV improvement');

    // Get AI response using regular chat completion (no streaming)
    const openaiResponse = await openaiService.createChatCompletion(messages, {
      model: 'gpt-4o-mini',
      temperature: 0.5,
    });

    const fullResponse = openaiResponse.choices[0]?.message?.content || '';
    console.log('✅ OpenAI response received, processing response');
    
    // Process the complete response to extract cv_updates, section_renames and score improvements
    let cvUpdates = {};
    let sectionRenames = {};
    let scoreImprovements = {};
    let conversationalResponse = fullResponse;
    
    try {
      const parsedResponse = parseGlobalChatResponse(fullResponse);
      cvUpdates = parsedResponse.cv_updates || {};
      sectionRenames = parsedResponse.section_renames || {};
      scoreImprovements = parsedResponse.score_improvements || {};
      conversationalResponse = parsedResponse.response || fullResponse;
    } catch (parseError) {
      console.warn('⚠️ Could not parse response, using raw response');
    }

    // Return complete JSON response with all sections and updated sections
    const responseData = {
      success: true,
      response: conversationalResponse,
      cv_updates: cvUpdates,
      section_renames: sectionRenames,
      score_improvements: scoreImprovements,
      all_sections: currentCV.original_cv_sections || currentCV.sections || [],
      updated_sections: Object.keys(cvUpdates)
    };

    return new Response(
      JSON.stringify(responseData),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );

  } catch (error) {
    console.error('❌ CV improvement streaming error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to process chat message',
        details: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
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

    // Initialize OpenAI service
    const openaiService = await createOpenAIService();
    if (!openaiService) {
      throw new Error('Failed to initialize OpenAI service');
    }

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
    return await handleCVImprovementChat({
      resumeId,
      sessionId: effectiveSessionId,
      message,
      conversationHistory,
      currentCV: analysisData,
      openaiService,
      supabaseClient
    });

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

