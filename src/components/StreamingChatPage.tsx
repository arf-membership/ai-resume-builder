import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CVStructuredView } from './CVStructuredView';
import { useCVStore } from '../store';
import { useSession } from '../contexts/SessionContext';
import { useSectionEdit } from '../hooks/useSectionEdit';
import { useNotifications } from '../store/notificationStore';
import { useStreamingChat } from '../hooks/useStreamingChat';
import { generateChatSuggestions, getImprovementIndicator, type ChatSuggestion } from '../utils/chatSuggestions';

export const StreamingChatPage: React.FC = () => {
  const navigate = useNavigate();
  const { sessionId } = useSession();
  const { showSuccess } = useNotifications();
  
  // Get CV data from store
  const analysisResult = useCVStore(state => state.analysisResult);
  const currentResume = useCVStore(state => state.currentResume);
  
  // Use streaming chat hook
  const { messages, isStreaming, sendMessage } = useStreamingChat();
  
  // Generate dynamic suggestions based on analysis scores
  const dynamicSuggestions = useMemo(() => {
    if (!analysisResult || !('detailed_checks' in analysisResult)) {
      return [];
    }
    return generateChatSuggestions(analysisResult as any);
  }, [analysisResult]);
  
  // Local state for input and CV update status
  const [inputMessage, setInputMessage] = useState('');
  const [isUpdatingCV, setIsUpdatingCV] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Monitor for CV updates by watching the store
  const lastUpdated = useRef<number>(Date.now());
  const analysisResultSnapshot = useCVStore(state => state.analysisResult);
  
  useEffect(() => {
    if (analysisResultSnapshot) {
      const now = Date.now();
      if (now - lastUpdated.current < 2000) { // If updated within last 2 seconds
        setIsUpdatingCV(true);
        const timer = setTimeout(() => setIsUpdatingCV(false), 1500);
        return () => clearTimeout(timer);
      }
      lastUpdated.current = now;
    }
  }, [analysisResultSnapshot]);
  
  const { sectionUpdates } = useSectionEdit({
    resumeId: currentResume?.id || '',
    sessionId: sessionId || undefined,
    initialAnalysisData: analysisResult || {} as any,
    onSectionEdit: () => {},
    onError: (error) => {
      console.error('Section editing error:', error);
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

  const handleSendMessage = () => {
    if (!inputMessage.trim() || isStreaming) return;
    sendMessage(inputMessage.trim());
    setInputMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };



  return (
    <div className="flex h-screen bg-slate-900 text-white">
      {/* Left Side - Chat Interface */}
      <div className="w-1/2 flex flex-col">
        {/* Header */}
        <div className="p-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">✨ AI CV Enhancement</h1>
            <p className="text-sm text-gray-400">Real-time CV improvements with streaming AI</p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors text-sm"
            >
              ← Back to Analysis
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] p-3 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-gray-100'
                }`}
              >
                <div className="text-sm font-medium mb-1">
                  {message.role === 'user' ? 'You' : 'AI Assistant'}
                </div>
                <div className="whitespace-pre-wrap">{message.content}</div>
                {isStreaming && index === messages.length - 1 && message.role === 'assistant' && (
                  <div className="mt-2 flex items-center text-xs text-gray-400">
                    <div className="animate-pulse mr-2">●</div>
                    Streaming response...
                  </div>
                )}
              </div>
            </div>
          ))}
          

          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-slate-800 border-t border-slate-700">
          <div className="flex space-x-3">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me to improve your CV... (e.g., 'Make my professional summary more compelling')"
              className="flex-1 p-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
              disabled={isStreaming}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isStreaming}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center space-x-2"
            >
              {isStreaming ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                  <span>Streaming...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  <span>Send</span>
                </>
              )}
            </button>
          </div>
          
          {/* Smart Suggestions - Based on Analysis Scores */}
          <div className="mt-3 space-y-2">
            <div className="text-xs text-gray-400 font-medium">
              📊 Suggested Improvements ({dynamicSuggestions.length} areas need attention)
            </div>
            <div className="flex flex-wrap gap-2">
              {dynamicSuggestions.slice(0, 4).map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setInputMessage(suggestion.text);
                    sendMessage(suggestion.text);
                  }}
                  disabled={isStreaming}
                  className={`group relative px-3 py-2 text-xs rounded-lg transition-all disabled:opacity-50 border ${
                    suggestion.priority === 'high' 
                      ? 'bg-red-900/20 border-red-500/30 text-red-300 hover:bg-red-900/30' 
                      : suggestion.priority === 'medium'
                        ? 'bg-yellow-900/20 border-yellow-500/30 text-yellow-300 hover:bg-yellow-900/30'
                        : 'bg-blue-900/20 border-blue-500/30 text-blue-300 hover:bg-blue-900/30'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span className="flex-1">{suggestion.text}</span>
                    <div className="flex items-center space-x-1">
                      <span className="text-xs opacity-75">
                        {getImprovementIndicator(suggestion.currentScore, suggestion.expectedImprovement)}
                      </span>
                      {suggestion.priority === 'high' && (
                        <span className="text-red-400">🔥</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                    <div className="font-medium">{suggestion.section}</div>
                    <div>Current: {suggestion.currentScore}/100</div>
                    <div>Expected: +{suggestion.expectedImprovement} points</div>
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                  </div>
                </button>
              ))}
              
              {dynamicSuggestions.length === 0 && (
                <div className="text-xs text-green-400 bg-green-900/20 px-3 py-2 rounded-lg border border-green-500/30">
                  🎉 Great job! All sections are scoring well (80+)
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Live CV Preview */}
      <div className="w-1/2 bg-gray-100">
        <div className="p-4 bg-slate-800 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white flex items-center">
            <div className={`w-3 h-3 rounded-full mr-2 ${
              isUpdatingCV 
                ? 'bg-orange-500 animate-bounce' 
                : isStreaming 
                  ? 'bg-blue-500 animate-pulse' 
                  : 'bg-green-500 animate-pulse'
            }`}></div>
            {isUpdatingCV ? 'Updating CV...' : isStreaming ? 'AI Thinking...' : 'Live CV Preview'}
          </h2>
          <p className="text-sm text-gray-400">
            {isUpdatingCV 
              ? 'CV sections are being updated in real-time!' 
              : 'Watch your CV improve as you chat with AI'
            }
          </p>
        </div>
        <div className="h-[calc(100%-80px)] overflow-hidden">
          <CVStructuredView
            structuredContent={analysisResult?.structured_content}
            sections={analysisResult?.sections}
            originalSections={(analysisResult as any)?.original_cv_sections || []}
            cvHeader={(analysisResult as any)?.cv_header}
            updates={{}} // We'll handle updates through direct store changes for now
          />
        </div>
      </div>
    </div>
  );
};
