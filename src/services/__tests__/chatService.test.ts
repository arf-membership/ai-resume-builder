/**
 * Tests for ChatService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChatService } from '../chatService';
import { supabase } from '../../lib/supabase';
import type { ChatMessage } from '../../types/api';

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    functions: {
      invoke: vi.fn()
    }
  }
}));

const mockSupabase = vi.mocked(supabase);

describe('ChatService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initializeChat', () => {
    it('successfully initializes chat', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            message: {
              id: 'ai-1',
              role: 'assistant',
              content: 'What specific achievements can you share?',
              timestamp: '2024-01-01T00:00:00.000Z'
            },
            requiresMoreInfo: true
          }
        },
        error: null
      };

      mockSupabase.functions.invoke.mockResolvedValue(mockResponse);

      const result = await ChatService.initializeChat(
        'resume-123',
        'work_experience',
        'session-456'
      );

      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('chat-section', {
        body: {
          action: 'initialize',
          resumeId: 'resume-123',
          sectionName: 'work_experience'
        },
        headers: {
          'x-session-id': 'session-456',
          'Content-Type': 'application/json'
        }
      });

      expect(result).toEqual({
        message: mockResponse.data.data.message,
        requiresMoreInfo: true
      });
    });

    it('handles initialization errors', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: null,
        error: { message: 'Network error' }
      });

      await expect(
        ChatService.initializeChat('resume-123', 'work_experience', 'session-456')
      ).rejects.toThrow('Chat initialization failed: Network error');
    });

    it('validates required parameters', async () => {
      await expect(
        ChatService.initializeChat('', 'work_experience', 'session-456')
      ).rejects.toThrow('Resume ID is required and must be a string');

      await expect(
        ChatService.initializeChat('resume-123', '', 'session-456')
      ).rejects.toThrow('Section name is required and must be a string');

      await expect(
        ChatService.initializeChat('resume-123', 'work_experience', '')
      ).rejects.toThrow('Session ID is required and must be a string');
    });
  });

  describe('sendMessage', () => {
    const mockMessages: ChatMessage[] = [
      {
        id: 'user-1',
        role: 'user',
        content: 'I increased sales by 25%',
        timestamp: new Date('2024-01-01T00:00:00.000Z')
      }
    ];

    it('successfully sends message', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            message: {
              id: 'ai-2',
              role: 'assistant',
              content: 'That\'s great! Any other achievements?',
              timestamp: '2024-01-01T00:01:00.000Z'
            },
            requiresMoreInfo: true,
            suggestedQuestions: ['What technologies did you use?']
          }
        },
        error: null
      };

      mockSupabase.functions.invoke.mockResolvedValue(mockResponse);

      const result = await ChatService.sendMessage(
        'resume-123',
        'work_experience',
        mockMessages,
        'session-456'
      );

      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('chat-section', {
        body: {
          action: 'send',
          resumeId: 'resume-123',
          sectionName: 'work_experience',
          messages: mockMessages
        },
        headers: {
          'x-session-id': 'session-456',
          'Content-Type': 'application/json'
        }
      });

      expect(result).toEqual({
        message: mockResponse.data.data.message,
        requiresMoreInfo: true,
        suggestedQuestions: ['What technologies did you use?']
      });
    });

    it('validates messages parameter', async () => {
      await expect(
        ChatService.sendMessage('resume-123', 'work_experience', [], 'session-456')
      ).rejects.toThrow('Messages are required');
    });
  });

  describe('generateUpdatedContent', () => {
    const mockMessages: ChatMessage[] = [
      {
        id: 'user-1',
        role: 'user',
        content: 'I increased sales by 25%',
        timestamp: new Date('2024-01-01T00:00:00.000Z')
      },
      {
        id: 'ai-1',
        role: 'assistant',
        content: 'That\'s great! Any other achievements?',
        timestamp: new Date('2024-01-01T00:01:00.000Z')
      }
    ];

    it('successfully generates updated content', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            updatedContent: 'Senior Sales Manager with proven track record of increasing sales by 25%...',
            message: 'Content updated successfully'
          }
        },
        error: null
      };

      mockSupabase.functions.invoke.mockResolvedValue(mockResponse);

      const result = await ChatService.generateUpdatedContent(
        'resume-123',
        'work_experience',
        mockMessages,
        'session-456'
      );

      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('chat-section', {
        body: {
          action: 'complete',
          resumeId: 'resume-123',
          sectionName: 'work_experience',
          messages: mockMessages
        },
        headers: {
          'x-session-id': 'session-456',
          'Content-Type': 'application/json'
        }
      });

      expect(result).toEqual({
        updatedContent: mockResponse.data.data.updatedContent,
        message: mockResponse.data.data.message
      });
    });

    it('validates messages parameter', async () => {
      await expect(
        ChatService.generateUpdatedContent('resume-123', 'work_experience', [], 'session-456')
      ).rejects.toThrow('Messages are required for content generation');
    });
  });

  describe('checkAvailability', () => {
    it('returns true when service is available', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: null,
        error: null
      });

      const result = await ChatService.checkAvailability();
      expect(result).toBe(true);
    });

    it('returns false when service is unavailable', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: null,
        error: { message: 'Service unavailable' }
      });

      const result = await ChatService.checkAvailability();
      expect(result).toBe(false);
    });
  });

  describe('utility methods', () => {
    it('formats messages for display', () => {
      const message: ChatMessage = {
        id: 'test-1',
        role: 'user',
        content: 'Hello world',
        timestamp: new Date('2024-01-01T12:30:00.000Z')
      };

      const formatted = ChatService.formatMessageForDisplay(message);
      expect(formatted).toContain('You: Hello world');
      expect(formatted).toMatch(/\[\d{1,2}:\d{2}.*\] You: Hello world/);
    });

    it('creates new messages', () => {
      const message = ChatService.createMessage('user', 'Test content');
      
      expect(message.role).toBe('user');
      expect(message.content).toBe('Test content');
      expect(message.id).toMatch(/^user-/);
      expect(message.timestamp).toBeInstanceOf(Date);
    });

    it('extracts user info from messages', () => {
      const messages: ChatMessage[] = [
        {
          id: 'ai-1',
          role: 'assistant',
          content: 'What is your name?',
          timestamp: new Date()
        },
        {
          id: 'user-1',
          role: 'user',
          content: 'John Doe',
          timestamp: new Date()
        },
        {
          id: 'ai-2',
          role: 'assistant',
          content: 'What is your experience?',
          timestamp: new Date()
        },
        {
          id: 'user-2',
          role: 'user',
          content: '5 years in software development',
          timestamp: new Date()
        }
      ];

      const userInfo = ChatService.extractUserInfo(messages);
      
      expect(userInfo).toEqual({
        response_1: 'John Doe',
        response_2: '5 years in software development'
      });
    });
  });
});