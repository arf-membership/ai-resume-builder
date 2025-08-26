import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { CVStructuredView } from './CVStructuredView';
import { useCVStore } from '../store';
import { useSession } from '../contexts/SessionContext';
import { useSectionEdit } from '../hooks/useSectionEdit';
import { useNotifications } from '../store/notificationStore';
import { generateChatSuggestions, type ChatSuggestion } from '../utils/chatSuggestions';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: ChatSuggestion[];
}

export const ChatPage: React.FC = () => {
  const navigate = useNavigate();
  const { sessionId } = useSession();
  const { showSuccess, showError } = useNotifications();
  
  // Get CV data from store
  const analysisResult = useCVStore(state => state.analysisResult);
  const currentResume = useCVStore(state => state.currentResume);
  
  // Generate suggestions from analysis data
  const suggestions = analysisResult ? generateChatSuggestions(analysisResult as any) : [];
  const hasProblematicIssues = suggestions.length > 0;

  // Create initial AI message with suggestions if there are problematic issues
  const getInitialMessage = (): ChatMessage => {
    if (hasProblematicIssues) {
      return {
        role: 'assistant',
        content: `Hi! I've analyzed your CV and found ${suggestions.length} areas that need improvement. Here are my top recommendations to enhance your CV:`,
        timestamp: new Date(),
        suggestions: suggestions.slice(0, 4) // Show top 4 suggestions
      };
    }
    return {
      role: 'assistant',
      content: "Hi! I'm here to help you improve your CV. What specific aspect would you like to enhance?",
      timestamp: new Date()
    };
  };

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([getInitialMessage()]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { sectionUpdates } = useSectionEdit({
    resumeId: currentResume?.id || '',
    sessionId: sessionId || undefined,
    initialAnalysisData: analysisResult || {} as any,
    onSectionEdit: () => {},
    onError: (error) => {
      console.error('Section editing error:', error);
      showError('Edit Error', error);
    }
  });

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Redirect if no analysis data
  useEffect(() => {
    if (!analysisResult || !currentResume) {
      console.warn('No analysis result or resume found, redirecting to home');
      navigate('/', { replace: true });
    }
  }, [analysisResult, currentResume, navigate]);

  const handleSuggestionClick = (suggestion: ChatSuggestion) => {
    setInputMessage(suggestion.text);
    handleSendMessage(suggestion.text);
  };

  const handleSendMessage = async (messageText?: string) => {
    const messageToSend = messageText || inputMessage.trim();
    if (!messageToSend || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: messageToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Call the global chat API
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-section`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          message: userMessage.content,
          conversationHistory: messages.slice(-5), // Last 5 messages for context
          currentCV: analysisResult,
          resumeId: currentResume?.id,
          sessionId: sessionId
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();
      
      // Add AI response to messages
      const aiMessage: ChatMessage = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMessage]);

      // Apply any CV updates
      if (data.cvUpdates && Object.keys(data.cvUpdates).length > 0) {
        // Note: Section updates would be handled by the useSectionEdit hook
        showSuccess('CV Updated', 'Your CV has been enhanced with AI suggestions!');
      }

    } catch (error) {
      console.error('Chat error:', error);
      showError('Chat Error', 'Failed to get AI response. Please try again.');
      
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: "I'm sorry, I'm having trouble responding right now. Please try again in a moment.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!analysisResult || !currentResume) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading CV data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/')}
              className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Back to Analysis</span>
            </button>
            <div className="h-6 w-px bg-slate-600"></div>
            <h1 className="text-xl font-bold text-white">AI CV Enhancement Chat</h1>
          </div>
          <div className="text-sm text-gray-400">
            Enhancing: {analysisResult.structured_content?.personal_info?.name || 'Your CV'}
          </div>
        </div>
      </div>

      {/* Main Content - Split Layout */}
      <div className="flex h-[calc(100vh-80px)]">
        {/* Left Side - Chat Interface */}
        <div className="w-1/2 flex flex-col border-r border-slate-700">
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-4 ${
                    message.role === 'user'
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-700 text-gray-100'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  
                  {/* Show suggestions if this is an assistant message with suggestions */}
                  {message.role === 'assistant' && message.suggestions && (
                    <div className="mt-4 space-y-2">
                      <p className="text-sm text-gray-300 font-medium">Click on a suggestion to get started:</p>
                      <div className="grid gap-2">
                        {message.suggestions.map((suggestion, suggestionIndex) => (
                          <button
                            key={suggestionIndex}
                            onClick={() => handleSuggestionClick(suggestion)}
                            disabled={isLoading}
                            className={`text-left p-3 rounded-lg border transition-all duration-200 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed ${
                              suggestion.priority === 'high'
                                ? 'bg-red-900/30 border-red-500/50 text-red-200 hover:bg-red-900/50'
                                : suggestion.priority === 'medium'
                                ? 'bg-yellow-900/30 border-yellow-500/50 text-yellow-200 hover:bg-yellow-900/50'
                                : 'bg-blue-900/30 border-blue-500/50 text-blue-200 hover:bg-blue-900/50'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-sm">{suggestion.section}</span>
                              <div className="flex items-center space-x-2">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  suggestion.priority === 'high'
                                    ? 'bg-red-500/20 text-red-300'
                                    : suggestion.priority === 'medium'
                                    ? 'bg-yellow-500/20 text-yellow-300'
                                    : 'bg-blue-500/20 text-blue-300'
                                }`}>
                                  {suggestion.priority}
                                </span>
                                <span className="text-xs text-gray-400">
                                  {suggestion.currentScore}/100
                                </span>
                              </div>
                            </div>
                            <p className="text-xs opacity-80">{suggestion.text}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <p className="text-xs opacity-70 mt-2">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-700 text-gray-100 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <div className="animate-pulse flex space-x-1">
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    <span className="text-sm">AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input */}
          <div className="p-6 border-t border-slate-700">
            <div className="flex space-x-4">
              <div className="flex-1">
                <textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me to improve your CV... (e.g., 'Make my professional summary more impactful')"
                  className="w-full p-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  rows={3}
                  disabled={isLoading}
                />
              </div>
              <button
                onClick={() => handleSendMessage()}
                disabled={isLoading || !inputMessage.trim()}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
            
            {/* Quick Suggestions - only show if no AI message suggestions are present */}
            {!hasProblematicIssues && (
              <div className="mt-4">
                <p className="text-sm text-gray-400 mb-2">Quick suggestions:</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    "Improve my professional summary",
                    "Add more impact to my experience",
                    "Optimize for ATS systems",
                    "Enhance my skills section"
                  ].map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => setInputMessage(suggestion)}
                      className="px-3 py-1 text-xs bg-slate-700 text-gray-300 rounded-full hover:bg-slate-600 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side - CV Canvas */}
        <div className="w-1/2 bg-gray-100">
          <div className="p-4 bg-slate-800 border-b border-slate-700">
            <h2 className="text-lg font-semibold text-white">Live CV Preview</h2>
            <p className="text-sm text-gray-400">See changes in real-time as you chat</p>
          </div>
          <div className="h-[calc(100%-80px)] overflow-hidden">
            <CVStructuredView
              structuredContent={analysisResult?.structured_content}
              sections={analysisResult?.sections}
              originalSections={(analysisResult as any)?.original_cv_sections || []}
              cvHeader={(analysisResult as any)?.cv_header}
              updates={sectionUpdates ? Object.fromEntries(
                Array.from(sectionUpdates.entries()).map(([key, value]) => [
                  key, 
                  typeof value === 'string' ? value : value.content || ''
                ])
              ) : {}}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
