/**
 * ChatInterface component for interactive AI communication
 * Provides modal popup for gathering additional information during section editing
 */

import React, { useState, useRef, useEffect } from 'react';
import type { ChatInterfaceProps, ChatMessage } from '../types';
import { ChatService } from '../services/chatService';
import { SessionStorageService } from '../services/sessionStorage';

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  isOpen,
  sectionName,
  resumeId,
  onClose,
  onComplete,
  initialMessages = []
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Initialize chat with AI question when opened
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      initializeChat();
    }
  }, [isOpen, sectionName]);

  const initializeChat = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const sessionData = SessionStorageService.getCurrentSession();
      if (!sessionData?.sessionId) {
        throw new Error('Session not found');
      }

      const response = await ChatService.initializeChat(
        resumeId,
        sectionName,
        sessionData.sessionId
      );

      if (response.message) {
        setMessages([response.message]);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize chat';
      setError(errorMessage);
      console.error('Chat initialization failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    };

    // Add user message immediately
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setError(null);

    try {
      const sessionData = SessionStorageService.getCurrentSession();
      if (!sessionData?.sessionId) {
        throw new Error('Session not found');
      }

      const response = await ChatService.sendMessage(
        resumeId,
        sectionName,
        [...messages, userMessage],
        sessionData.sessionId
      );

      // Add AI response
      if (response.message) {
        setMessages(prev => [...prev, response.message]);
      }

      // Check if we have enough information to complete
      if (!response.requiresMoreInfo) {
        // Wait a moment for user to see the final message
        setTimeout(() => {
          handleComplete();
        }, 1500);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
      setError(errorMessage);
      console.error('Chat message failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = async () => {
    try {
      setIsLoading(true);
      
      const sessionData = SessionStorageService.getCurrentSession();
      if (!sessionData?.sessionId) {
        throw new Error('Session not found');
      }

      const response = await ChatService.generateUpdatedContent(
        resumeId,
        sectionName,
        messages,
        sessionData.sessionId
      );

      onComplete(response.updatedContent);
      handleClose();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate updated content';
      setError(errorMessage);
      console.error('Content generation failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setMessages([]);
    setInputValue('');
    setError(null);
    setIsLoading(false);
    onClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Improve {sectionName.replace(/_/g, ' ')} Section
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Let's gather some additional information to make your section even better
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isLoading}
            aria-label="Close chat"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                <p className={`text-xs mt-1 ${
                  message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  {message.timestamp.toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </p>
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg px-4 py-2">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span className="text-sm text-gray-600">AI is thinking...</span>
                </div>
              </div>
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <svg className="h-5 w-5 text-red-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-gray-200 p-6">
          <div className="flex space-x-3">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your response..."
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Send
            </button>
          </div>
          
          {/* Helper text */}
          <p className="text-xs text-gray-500 mt-2">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
};