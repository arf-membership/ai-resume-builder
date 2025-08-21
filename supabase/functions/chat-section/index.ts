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
  error?: string;
  details?: string;
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-session-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Handle CV improvement chat with streaming
async function handleCVImprovementChatStream({
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

Please provide a helpful conversational response and any specific CV section updates.`
      }
    ];

    console.log('🚀 Sending streaming request to OpenAI for CV improvement');

    // Get AI response with streaming using our service
    const openaiStream = await openaiService.createStreamingChatCompletion(messages, {
      model: 'gpt-4o-mini',
      temperature: 0.5,
      max_tokens: 800,
    });

    // Create a readable stream for server-sent events
    const readable = new ReadableStream({
      async start(controller) {
        let fullResponse = '';
        let lastCvUpdateSent = '';
        const reader = openaiStream.getReader();
        const decoder = new TextDecoder();
        
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const dataStr = line.slice(6);
                if (dataStr === '[DONE]') continue;
                
                try {
                  const data = JSON.parse(dataStr);
                  const content = data.choices?.[0]?.delta?.content || '';
                  
                  if (content) {
                    fullResponse += content;
                    
                    // Send chunk as server-sent event
                    const sseData = JSON.stringify({
                      type: 'chunk',
                      content: content
                    });
                    
                    controller.enqueue(new TextEncoder().encode(`data: ${sseData}\n\n`));

                    // ✨ AGGRESSIVELY DETECT AND SEND CV UPDATES
                    if (fullResponse.length > 100) { // Only try when we have some content
                      
                      // Try to send immediate updates for specific sections as they appear
                      const sectionPatterns = [
                        { name: 'Professional Summary', pattern: /(?:Professional Summary|PROFESSIONAL SUMMARY)[:\s]*([^}]{50,}?)(?="|\n\n|,\s*"|\})/i },
                        { name: 'Work Experience', pattern: /(?:Work Experience|WORK EXPERIENCE|Experience)[:\s]*([^}]{50,}?)(?="|\n\n|,\s*"|\})/i },
                        { name: 'Skills', pattern: /(?:Skills|SKILLS)[:\s]*([^}]{30,}?)(?="|\n\n|,\s*"|\})/i },
                        { name: 'Education', pattern: /(?:Education|EDUCATION)[:\s]*([^}]{30,}?)(?="|\n\n|,\s*"|\})/i },
                      ];

                      sectionPatterns.forEach(({ name, pattern }) => {
                        const match = fullResponse.match(pattern);
                        if (match && match[1]) {
                          const content = match[1].trim().replace(/^["']|["']$/g, ''); // Remove quotes
                          
                          // Only send if content is substantial and hasn't been sent before
                          if (content.length > 30 && !lastCvUpdateSent.includes(content.substring(0, 50))) {
                            console.log(`🌊 Detected ${name} update:`, content.substring(0, 100) + '...');
                            
                            const immediateUpdate = {
                              [name]: content
                            };
                            
                            const streamingUpdateData = JSON.stringify({
                              type: 'cv_update_stream',
                              cv_updates: immediateUpdate
                            });
                            
                            controller.enqueue(new TextEncoder().encode(`data: ${streamingUpdateData}\n\n`));
                            lastCvUpdateSent += content.substring(0, 50); // Track what we've sent
                          }
                        }
                      });
                    }
                  }
                } catch (parseError) {
                  // Ignore parsing errors for individual chunks
                  console.warn('Could not parse streaming chunk:', line);
                }
              }
            }
          }

          // Process the complete response to extract cv_updates
          console.log('✅ OpenAI streaming complete, processing final response');
          
          let cvUpdates = {};
          try {
            const parsedResponse = parseGlobalChatResponse(fullResponse);
            cvUpdates = parsedResponse.cv_updates;
          } catch (parseError) {
            console.warn('⚠️ Could not parse cv_updates from stream, using empty object');
          }

          // Send final message with cv_updates
          const finalData = JSON.stringify({
            type: 'complete',
            cv_updates: cvUpdates,
            full_response: fullResponse
          });
          
          controller.enqueue(new TextEncoder().encode(`data: ${finalData}\n\n`));
          controller.close();
          
        } catch (error) {
          console.error('❌ Streaming error:', error);
          const errorData = JSON.stringify({
            type: 'error',
            error: error.message
          });
          controller.enqueue(new TextEncoder().encode(`data: ${errorData}\n\n`));
          controller.close();
        }
      }
    });

    return new Response(readable, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

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

    console.log('✅ Analysis data found, processing CV improvement request with streaming');

    // Handle CV improvement chat with streaming
    return await handleCVImprovementChatStream({
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

