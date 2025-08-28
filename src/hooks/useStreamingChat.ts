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
  const { updateSectionContent, renameSections, addScoreToHistory } = useCVStore();


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

    // Add processing message immediately
    const processingMessage: ChatMessage = {
      role: 'assistant',
      content: '✨ Analyzing your request...',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, processingMessage]);

    // Get current scores from analysis result - handle both schema formats
    const currentOverallScore = ('overall_summary' in analysisResult) 
      ? (analysisResult as any).overall_summary?.overall_score || 0
      : analysisResult.overall_score || 0;
    const currentSectionScores: Record<string, number> = {};
    
    // Extract section scores from either format
    if ((analysisResult as any).original_cv_sections) {
      // For new format, we need to calculate scores from sections if available
      if (analysisResult.sections) {
        analysisResult.sections.forEach(section => {
          currentSectionScores[section.section_name] = section.score;
        });
      }
    } else if (analysisResult.sections) {
      // For legacy format
      analysisResult.sections.forEach(section => {
        currentSectionScores[section.section_name] = section.score;
      });
    }

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
          })),
          currentOverallScore,
          currentSectionScores
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

      // Replace the thinking message with the actual response
      setMessages(prev => {
        const newMessages = [...prev];
        // Find and replace the last processing message
        for (let i = newMessages.length - 1; i >= 0; i--) {
          if (newMessages[i].role === 'assistant' && newMessages[i].content === '✨ Analyzing your request...') {
            newMessages[i] = assistantMessage;
            break;
          }
        }
        return newMessages;
      });

      // Handle section renames first
      if (data.section_renames && Object.keys(data.section_renames).length > 0) {
        console.log('🔄 Received section renames:', data.section_renames);
        renameSections(data.section_renames);
      }

      // Handle score improvements first
      if (data.score_improvements || data.overall_score_improvement) {
        console.log('🔄 Received score improvements:', data.score_improvements);
        console.log('🔄 Overall score improvement:', data.overall_score_improvement);
        
        // Calculate new section scores
        const newSectionScores = { ...currentSectionScores };
        if (data.score_improvements) {
          Object.entries(data.score_improvements).forEach(([sectionName, improvement]: [string, any]) => {
            newSectionScores[sectionName] = improvement.new_score;
          });
        }
        
        // Use the overall score improvement if provided, otherwise keep current
        const newOverallScore = data.overall_score_improvement 
          ? data.overall_score_improvement.new_score 
          : currentOverallScore;
        
        // Add to score history
        addScoreToHistory(
          newOverallScore,
          newSectionScores,
          `Chat improvement: ${message.substring(0, 50)}...`
        );
      }

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

      // Replace the processing message with the error message
      setMessages(prev => {
        const newMessages = [...prev];
        // Find and replace the last processing message
        for (let i = newMessages.length - 1; i >= 0; i--) {
          if (newMessages[i].role === 'assistant' && newMessages[i].content === '✨ Analyzing your request...') {
            newMessages[i] = errorMessage;
            break;
          }
        }
        return newMessages;
      });
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
