/**
 * Chat service for AI-powered conversation during section editing
 * Handles communication with the chat Edge Function
 */

import { supabase } from '../lib/supabase';
import { CacheService } from './cacheService';
import { trackOperation } from './performanceMonitoringService';
import type { ChatMessage } from '../types/api';

export interface ChatInitializeResponse {
  message: ChatMessage;
  requiresMoreInfo: boolean;
}

export interface ChatSendResponse {
  message: ChatMessage;
  requiresMoreInfo: boolean;
  suggestedQuestions?: string[];
}

export interface ChatCompleteResponse {
  updatedContent: string;
  message: string;
}

/**
 * Chat service class for managing AI conversations
 */
export class ChatService {
  /**
   * Initialize a chat session for a specific section
   */
  static async initializeChat(
    resumeId: string,
    sectionName: string,
    sessionId: string
  ): Promise<ChatInitializeResponse> {
    try {
      this.validateChatRequest(resumeId, sectionName, sessionId);

      const { data, error } = await supabase.functions.invoke('chat-section', {
        body: {
          action: 'initialize',
          resumeId,
          sectionName
        },
        headers: {
          'x-session-id': sessionId,
          'Content-Type': 'application/json'
        }
      });

      if (error) {
        throw new Error(`Chat initialization failed: ${error.message}`);
      }

      if (!data || !data.success) {
        throw new Error(data?.error || 'Chat initialization failed');
      }

      return {
        message: data.data.message,
        requiresMoreInfo: data.data.requiresMoreInfo
      };

    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred during chat initialization');
    }
  }

  /**
   * Send a message in the chat conversation
   */
  static async sendMessage(
    resumeId: string,
    sectionName: string,
    messages: ChatMessage[],
    sessionId: string
  ): Promise<ChatSendResponse> {
    return trackOperation(
      'chat_send_message',
      async () => {
        try {
          this.validateChatRequest(resumeId, sectionName, sessionId);

          if (!messages || messages.length === 0) {
            throw new Error('Messages are required');
          }

          // Cache conversation
          CacheService.cacheChatConversation(resumeId, sectionName, messages);

          const { data, error } = await supabase.functions.invoke('chat-section', {
            body: {
              action: 'send',
              resumeId,
              sectionName,
              messages
            },
            headers: {
              'x-session-id': sessionId,
              'Content-Type': 'application/json'
            }
          });

          if (error) {
            throw new Error(`Message sending failed: ${error.message}`);
          }

          if (!data || !data.success) {
            throw new Error(data?.error || 'Message sending failed');
          }

          const response = {
            message: data.data.message,
            requiresMoreInfo: data.data.requiresMoreInfo,
            suggestedQuestions: data.data.suggestedQuestions
          };

          // Update cached conversation with response
          const updatedMessages = [...messages, response.message];
          CacheService.cacheChatConversation(resumeId, sectionName, updatedMessages);

          return response;

        } catch (error) {
          if (error instanceof Error) {
            throw error;
          }
          throw new Error('An unexpected error occurred while sending message');
        }
      },
      {
        resumeId,
        sectionName,
        messageCount: messages.length,
      }
    );
  }

  /**
   * Generate updated content based on chat conversation
   */
  static async generateUpdatedContent(
    resumeId: string,
    sectionName: string,
    messages: ChatMessage[],
    sessionId: string
  ): Promise<ChatCompleteResponse> {
    try {
      this.validateChatRequest(resumeId, sectionName, sessionId);

      if (!messages || messages.length === 0) {
        throw new Error('Messages are required for content generation');
      }

      const { data, error } = await supabase.functions.invoke('chat-section', {
        body: {
          action: 'complete',
          resumeId,
          sectionName,
          messages
        },
        headers: {
          'x-session-id': sessionId,
          'Content-Type': 'application/json'
        }
      });

      if (error) {
        throw new Error(`Content generation failed: ${error.message}`);
      }

      if (!data || !data.success) {
        throw new Error(data?.error || 'Content generation failed');
      }

      return {
        updatedContent: data.data.updatedContent,
        message: data.data.message
      };

    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred during content generation');
    }
  }

  /**
   * Validate chat request parameters
   */
  private static validateChatRequest(
    resumeId: string,
    sectionName: string,
    sessionId: string
  ): void {
    if (!resumeId || typeof resumeId !== 'string') {
      throw new Error('Resume ID is required and must be a string');
    }

    if (!sectionName || typeof sectionName !== 'string') {
      throw new Error('Section name is required and must be a string');
    }

    if (!sessionId || typeof sessionId !== 'string') {
      throw new Error('Session ID is required and must be a string');
    }
  }

  /**
   * Check if chat service is available
   */
  static async checkAvailability(): Promise<boolean> {
    try {
      // Simple availability check - we'll assume it's available
      // In a real implementation, you might want to make a lightweight test call
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Format messages for display
   */
  static formatMessageForDisplay(message: ChatMessage): string {
    const timestamp = message.timestamp.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
    
    return `[${timestamp}] ${message.role === 'user' ? 'You' : 'AI'}: ${message.content}`;
  }

  /**
   * Create a new chat message
   */
  static createMessage(
    role: 'user' | 'assistant',
    content: string,
    id?: string
  ): ChatMessage {
    return {
      id: id || `${role}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      role,
      content,
      timestamp: new Date()
    };
  }

  /**
   * Extract user information from chat messages
   */
  static extractUserInfo(messages: ChatMessage[]): Record<string, string> {
    const userInfo: Record<string, string> = {};
    
    messages
      .filter(msg => msg.role === 'user')
      .forEach((msg, index) => {
        userInfo[`response_${index + 1}`] = msg.content;
      });

    return userInfo;
  }
}