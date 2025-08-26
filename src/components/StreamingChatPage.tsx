import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CVStructuredView } from './CVStructuredView';
import { useCVStore } from '../store';
import { useSession } from '../contexts/SessionContext';
import { useSectionEdit } from '../hooks/useSectionEdit';
import { useNotifications } from '../store/notificationStore';
import { useStreamingChat } from '../hooks/useStreamingChat';
import { generateChatSuggestions, type ChatSuggestion } from '../utils/chatSuggestions';


export const StreamingChatPage: React.FC = () => {
  const navigate = useNavigate();
  const { sessionId } = useSession();
  const { showSuccess } = useNotifications();
  
  // Get CV data from store
  const analysisResult = useCVStore(state => state.analysisResult);
  const currentResume = useCVStore(state => state.currentResume);
  
  // Generate suggestions from analysis data
  const suggestions = analysisResult ? generateChatSuggestions(analysisResult as any) : [];
  const hasProblematicIssues = suggestions.length > 0;
  
  // Track used suggestions per message to show remaining ones
  const [usedSuggestions, setUsedSuggestions] = useState<Set<string>>(new Set());
  const [suggestionsByMessage, setSuggestionsByMessage] = useState<{[messageIndex: number]: ChatSuggestion[]}>({});
  
  // Initialize suggestions for the first message
  React.useEffect(() => {
    if (hasProblematicIssues && suggestions.length > 0 && !suggestionsByMessage[0]) {
      setSuggestionsByMessage(prev => ({
        ...prev,
        0: suggestions.slice(0, 4)
      }));
    }
  }, [hasProblematicIssues, suggestions.length]); // Use suggestions.length instead of suggestions array


  // Use streaming chat hook
  const { messages, isStreaming, sendMessage } = useStreamingChat();
  
  // Override the first message content if we have problematic issues
  const displayMessages = useMemo(() => {
    if (messages.length > 0 && hasProblematicIssues) {
      const firstMessage = messages[0];
      if (firstMessage.role === 'assistant') {
        return [
          {
            ...firstMessage,
            content: `Hi! I've analyzed your CV and found ${suggestions.length} areas that need improvement. Here are my top recommendations to enhance your CV:`
          },
          ...messages.slice(1)
        ];
      }
    }
    return messages;
  }, [messages, hasProblematicIssues, suggestions.length]);
  
  
  
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
          {displayMessages.map((message, index) => (
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
                
                {/* Show suggestions for first AI message if there are problematic issues */}
                {message.role === 'assistant' && index === 0 && hasProblematicIssues && suggestionsByMessage[0] && (
                  <div className="mt-3 space-y-2">
                    <div className="text-sm text-gray-400 mb-2">Click a suggestion to get started:</div>
                    {suggestionsByMessage[0].map((suggestion: ChatSuggestion, suggestionIndex: number) => (
                      <button
                        key={suggestionIndex}
                        onClick={() => {
                          sendMessage(suggestion.text);
                          setUsedSuggestions(prev => new Set([...prev, suggestion.text]));
                          // Store remaining suggestions for next AI message (after user + AI response)
                          const nextAIMessageIndex = displayMessages.length + 1; // +1 for user message, +1 for AI response
                          const remaining = suggestionsByMessage[0].filter(s => s.text !== suggestion.text);
                          setSuggestionsByMessage(prev => ({
                            ...prev,
                            [nextAIMessageIndex]: remaining.slice(0, 3)
                          }));
                        }}
                        disabled={isStreaming}
                        className={`w-full text-left p-3 rounded-lg border transition-all hover:scale-[1.02] disabled:opacity-50 ${
                          suggestion.priority === 'high'
                            ? 'bg-red-900/20 border-red-500/30 text-red-300 hover:bg-red-900/30'
                            : suggestion.priority === 'medium'
                              ? 'bg-yellow-900/20 border-yellow-500/30 text-yellow-300 hover:bg-yellow-900/30'
                              : 'bg-blue-900/20 border-blue-500/30 text-blue-300 hover:bg-blue-900/30'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-sm">{suggestion.section}</div>
                            <div className="text-xs opacity-75 mt-1">{suggestion.text}</div>
                          </div>
                          <div className="flex items-center space-x-2 ml-3">
                            <div className="text-xs">
                              <span className="opacity-75">Score: </span>
                              <span className="font-medium">{suggestion.currentScore}/100</span>
                            </div>
                            {suggestion.priority === 'high' && (
                              <span className="text-red-400">🔥</span>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                
                {/* Show remaining suggestions for AI responses after user interactions */}
                {message.role === 'assistant' && index > 0 && suggestionsByMessage[index] && suggestionsByMessage[index].length > 0 && (
                  <div className="mt-3 space-y-2">
                    <div className="text-sm text-gray-400 mb-2">More suggestions to improve your CV:</div>
                    {suggestionsByMessage[index].map((suggestion: ChatSuggestion, suggestionIndex: number) => (
                      <button
                        key={suggestionIndex}
                        onClick={() => {
                          sendMessage(suggestion.text);
                          setUsedSuggestions(prev => new Set([...prev, suggestion.text]));
                          // Store remaining suggestions for next AI message (after user + AI response)
                          const nextAIMessageIndex = displayMessages.length + 1; // +1 for user message, +1 for AI response
                          const currentRemaining = suggestionsByMessage[index].filter(s => s.text !== suggestion.text);
                          setSuggestionsByMessage(prev => ({
                            ...prev,
                            [nextAIMessageIndex]: currentRemaining.slice(0, 3)
                          }));
                        }}
                        disabled={isStreaming}
                        className={`w-full text-left p-3 rounded-lg border transition-all hover:scale-[1.02] disabled:opacity-50 ${
                          suggestion.priority === 'high'
                            ? 'bg-red-900/20 border-red-500/30 text-red-300 hover:bg-red-900/30'
                            : suggestion.priority === 'medium'
                              ? 'bg-yellow-900/20 border-yellow-500/30 text-yellow-300 hover:bg-yellow-900/30'
                              : 'bg-blue-900/20 border-blue-500/30 text-blue-300 hover:bg-blue-900/30'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-sm">{suggestion.section}</div>
                            <div className="text-xs opacity-75 mt-1">{suggestion.text}</div>
                          </div>
                          <div className="flex items-center space-x-2 ml-3">
                            <div className="text-xs">
                              <span className="opacity-75">Score: </span>
                              <span className="font-medium">{suggestion.currentScore}/100</span>
                            </div>
                            {suggestion.priority === 'high' && (
                              <span className="text-red-400">🔥</span>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                
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
          
          {/* Quick Suggestions - only show if no AI message suggestions are present */}
          {!hasProblematicIssues && (
            <div className="mt-3 space-y-2">
              <div className="text-xs text-gray-400 font-medium">
                💡 Quick suggestions:
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  "Make my professional summary more impactful",
                  "Improve my work experience descriptions",
                  "Optimize my skills section",
                  "Enhance my CV formatting"
                ].map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      sendMessage(suggestion);
                    }}
                    disabled={isStreaming}
                    className="px-3 py-2 text-xs bg-slate-700 hover:bg-slate-600 text-gray-300 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
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
