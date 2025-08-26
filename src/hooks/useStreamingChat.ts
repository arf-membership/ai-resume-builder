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


  const sendMessage = useCallback(async (message: string) => {
    if (!currentResume || !analysisResult || !sessionId) {
      console.error('Missing required data for chat');
      return;
    }

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

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Chat request failed');
      }

      // Parse the nested response if it's JSON
      let actualResponse = data.response;
      try {
        const parsedResponse = JSON.parse(data.response);
        if (parsedResponse.response) {
          actualResponse = parsedResponse.response;
        }
      } catch (e) {
        // If parsing fails, use the original response
        actualResponse = data.response;
      }

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: actualResponse || "Great! I've updated that section. Here are more suggestions to continue improving your CV:",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Handle CV updates with fake highlighting
      if (data.cv_updates && Object.keys(data.cv_updates).length > 0) {
        console.log('🔄 Received CV updates:', data.cv_updates);
        
        Object.entries(data.cv_updates).forEach(([sectionName, content]) => {
          console.log(`🔄 Updating section: ${sectionName}`);
          updateSectionContent(sectionName, content as string);
        });
        
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('cv-sections-updated', {
            detail: { updatedSections: data.updated_sections || Object.keys(data.cv_updates) }
          }));
        }, 100);
        
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('clear-cv-highlights'));
        }, 3100);
      }
      
      setIsStreaming(false);
    } catch (error) {
      console.error('❌ Chat error:', error);
      
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        timestamp: new Date()
      };

      setMessages(prev => [...prev.slice(0, -1), errorMessage]);
    } finally {
      console.log('🔄 Setting isStreaming to false');
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
