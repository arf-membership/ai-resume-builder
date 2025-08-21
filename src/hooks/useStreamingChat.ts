import { useState, useCallback } from 'react';
import { useCVStore } from '../store';
import { useSession } from '../contexts/SessionContext';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface StreamingChatHook {
  messages: ChatMessage[];
  isStreaming: boolean;
  sendMessage: (message: string) => void;
  clearMessages: () => void;
}

export function useStreamingChat(): StreamingChatHook {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: "Hi! I'm here to help you improve your CV. What would you like to enhance?",
      timestamp: new Date()
    }
  ]);
  const [isStreaming, setIsStreaming] = useState(false);
  
  const { sessionId } = useSession();
  const currentResume = useCVStore(state => state.currentResume);
  const analysisResult = useCVStore(state => state.analysisResult);
  const { updateSectionContent } = useCVStore();

  // Function to aggressively try updating CV from streaming content
  const tryUpdateCVFromStream = useCallback((streamingContent: string) => {
    console.log('🔍 Trying to extract CV updates from stream:', streamingContent.substring(0, 200) + '...');
    
    try {
      // Pattern 1: Look for complete JSON with "cv_updates"
      let jsonMatch = streamingContent.match(/\{[\s\S]*?"cv_updates"[\s\S]*?\{[\s\S]*?\}[\s\S]*?\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.cv_updates && typeof parsed.cv_updates === 'object') {
            console.log('🌊 Found cv_updates object:', Object.keys(parsed.cv_updates));
            Object.entries(parsed.cv_updates).forEach(([sectionName, content]) => {
              if (typeof content === 'string' && content.length > 30) {
                console.log(`🌊 Applying streaming update for: ${sectionName}`);
                updateSectionContent(sectionName, content);
              }
            });
            return; // Success, exit early
          }
        } catch (e) { 
          console.warn('JSON parse error (likely incomplete):', e.message);
        }
      }

      // Pattern 2: Look for individual section updates in quotes (more lenient)
      const quotedSectionPattern = /"([^"]+)":\s*"([^"]{30,})"/g;
      let match;
      const foundUpdates = new Set();
      
      while ((match = quotedSectionPattern.exec(streamingContent)) !== null) {
        const [, sectionName, content] = match;
        if (content && content.length > 30 && !foundUpdates.has(sectionName)) {
          console.log(`🌊 Found individual section update: ${sectionName} (${content.length} chars)`);
          updateSectionContent(sectionName, content);
          foundUpdates.add(sectionName);
        }
      }

    } catch (error) {
      console.warn('Error extracting CV updates from stream:', error);
    }
  }, [updateSectionContent]);

  const sendMessage = useCallback(async (message: string) => {
    if (!currentResume || !analysisResult || !sessionId) {
      console.error('Missing required data for chat');
      return;
    }

    // Add user message
    const userMessage: ChatMessage = {
      role: 'user',
      content: message,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsStreaming(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-section`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          resumeId: currentResume.id,
          sessionId,
          message,
          conversationHistory: messages.map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      let assistantContent = '';
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: '',
        timestamp: new Date()
      };

      // Add empty assistant message that we'll update
      setMessages(prev => [...prev, assistantMessage]);

      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'chunk') {
                assistantContent += data.content;
                
                // Show a simple static response in chat after we get enough content
                if (assistantContent.length > 100) {
                  setMessages(prev => prev.map((msg, index) => 
                    index === prev.length - 1 
                      ? { ...msg, content: "I'm updating your CV sections in real-time! Watch the right panel for changes ✨" }
                      : msg
                  ));
                }

                // ✨ IMMEDIATELY TRY TO UPDATE CV FROM STREAMING CONTENT
                tryUpdateCVFromStream(assistantContent);
                
              } else if (data.type === 'cv_update_stream') {
                // ✨ Handle real-time CV updates sent from backend
                console.log('🌊 Received streaming CV updates:', data.cv_updates);
                if (data.cv_updates && Object.keys(data.cv_updates).length > 0) {
                  Object.entries(data.cv_updates).forEach(([sectionName, content]) => {
                    console.log(`🔄 Streaming update for: ${sectionName}`);
                    updateSectionContent(sectionName, content as string);
                  });
                }
                
              } else if (data.type === 'complete') {
                console.log('✅ Streaming complete, applying final CV updates:', data.cv_updates);
                
                // Apply final CV updates to the store
                if (data.cv_updates && Object.keys(data.cv_updates).length > 0) {
                  Object.entries(data.cv_updates).forEach(([sectionName, content]) => {
                    console.log(`🔄 Updating section: ${sectionName}`);
                    updateSectionContent(sectionName, content as string);
                  });
                }
              } else if (data.type === 'error') {
                console.error('❌ Streaming error:', data.error);
                throw new Error(data.error);
              }
            } catch (parseError) {
              console.warn('Could not parse SSE data:', line);
            }
          }
        }
      }

    } catch (error) {
      console.error('❌ Chat error:', error);
      
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error.message}. Please try again.`,
        timestamp: new Date()
      };

      setMessages(prev => [...prev.slice(0, -1), errorMessage]);
    } finally {
      setIsStreaming(false);
    }
  }, [currentResume, analysisResult, sessionId, messages, updateSectionContent]);

  const clearMessages = useCallback(() => {
    setMessages([{
      role: 'assistant',
      content: "Hi! I'm here to help you improve your CV. What would you like to enhance?",
      timestamp: new Date()
    }]);
  }, []);

  return {
    messages,
    isStreaming,
    sendMessage,
    clearMessages
  };
}
