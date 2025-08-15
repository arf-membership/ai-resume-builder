/**
 * Demo component for ChatInterface
 * Shows the chat interface in action with mock data
 */

import React, { useState } from 'react';
import { ChatInterface } from './ChatInterface';
import type { ChatMessage } from '../types';

export const ChatInterfaceDemo: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [completedContent, setCompletedContent] = useState<string>('');

  const initialMessages: ChatMessage[] = [
    {
      id: 'ai-1',
      role: 'assistant',
      content: 'What specific achievements or metrics can you share from your work experience?',
      timestamp: new Date()
    }
  ];

  const handleComplete = (updatedContent: string) => {
    setCompletedContent(updatedContent);
    console.log('Chat completed with content:', updatedContent);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Chat Interface Demo
        </h1>
        
        <div className="space-y-4">
          <p className="text-gray-600">
            This demo shows the ChatInterface component that allows users to have 
            interactive conversations with AI to improve their CV sections.
          </p>

          <div className="flex space-x-4">
            <button
              onClick={() => setIsOpen(true)}
              className="bg-green-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
            >
              Open Chat Interface
            </button>
          </div>

          {completedContent && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="text-lg font-semibold text-green-900 mb-2">
                Updated Content:
              </h3>
              <p className="text-green-800 whitespace-pre-wrap">
                {completedContent}
              </p>
            </div>
          )}
        </div>
      </div>

      <ChatInterface
        isOpen={isOpen}
        sectionName="work_experience"
        resumeId="demo-resume-123"
        onClose={() => setIsOpen(false)}
        onComplete={handleComplete}
        initialMessages={initialMessages}
      />
    </div>
  );
};