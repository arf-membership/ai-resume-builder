/**
 * Tests for ChatInterface component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock the services before importing the component
vi.mock('../../lib/supabase', () => ({
  supabase: {
    functions: {
      invoke: vi.fn()
    }
  }
}));

vi.mock('../../services/chatService', () => ({
  ChatService: {
    initializeChat: vi.fn(),
    sendMessage: vi.fn(),
    generateUpdatedContent: vi.fn(),
    checkAvailability: vi.fn()
  }
}));

vi.mock('../../services/sessionStorage', () => ({
  SessionStorageService: {
    getSessionData: vi.fn(),
    setSessionData: vi.fn(),
    clearSessionData: vi.fn()
  }
}));

import { ChatInterface } from '../ChatInterface';
import { ChatService } from '../../services/chatService';
import { SessionStorageService } from '../../services/sessionStorage';

const mockChatService = vi.mocked(ChatService);
const mockSessionStorageService = vi.mocked(SessionStorageService);

describe('ChatInterface', () => {
  const defaultProps = {
    isOpen: true,
    sectionName: 'work_experience',
    resumeId: 'test-resume-id',
    onClose: vi.fn(),
    onComplete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock session storage
    mockSessionStorageService.getSessionData.mockReturnValue({
      sessionId: 'test-session-id',
      timestamp: Date.now()
    });
  });

  it('renders when open', () => {
    render(<ChatInterface {...defaultProps} />);
    
    expect(screen.getByText('Improve work experience Section')).toBeInTheDocument();
    expect(screen.getByText('Let\'s gather some additional information to make your section even better')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<ChatInterface {...defaultProps} isOpen={false} />);
    
    expect(screen.queryByText('Improve work experience Section')).not.toBeInTheDocument();
  });

  it('initializes chat on mount', async () => {
    const mockMessage = {
      id: 'ai-1',
      role: 'assistant' as const,
      content: 'What specific achievements can you share?',
      timestamp: new Date()
    };

    mockChatService.initializeChat.mockResolvedValue({
      message: mockMessage,
      requiresMoreInfo: true
    });

    render(<ChatInterface {...defaultProps} />);

    await waitFor(() => {
      expect(mockChatService.initializeChat).toHaveBeenCalledWith(
        'test-resume-id',
        'work_experience',
        'test-session-id'
      );
    });

    expect(screen.getByText('What specific achievements can you share?')).toBeInTheDocument();
  });

  it('sends user messages', async () => {
    const mockInitMessage = {
      id: 'ai-1',
      role: 'assistant' as const,
      content: 'What specific achievements can you share?',
      timestamp: new Date()
    };

    const mockResponseMessage = {
      id: 'ai-2',
      role: 'assistant' as const,
      content: 'Thanks for that information!',
      timestamp: new Date()
    };

    mockChatService.initializeChat.mockResolvedValue({
      message: mockInitMessage,
      requiresMoreInfo: true
    });

    mockChatService.sendMessage.mockResolvedValue({
      message: mockResponseMessage,
      requiresMoreInfo: false
    });

    render(<ChatInterface {...defaultProps} />);

    // Wait for initialization
    await waitFor(() => {
      expect(screen.getByText('What specific achievements can you share?')).toBeInTheDocument();
    });

    // Type and send a message
    const input = screen.getByPlaceholderText('Type your response...');
    const sendButton = screen.getByText('Send');

    fireEvent.change(input, { target: { value: 'I increased sales by 25%' } });
    fireEvent.click(sendButton);

    // Check user message appears
    expect(screen.getByText('I increased sales by 25%')).toBeInTheDocument();

    // Wait for AI response
    await waitFor(() => {
      expect(mockChatService.sendMessage).toHaveBeenCalled();
    });
  });

  it('handles keyboard input', async () => {
    const mockMessage = {
      id: 'ai-1',
      role: 'assistant' as const,
      content: 'What specific achievements can you share?',
      timestamp: new Date()
    };

    mockChatService.initializeChat.mockResolvedValue({
      message: mockMessage,
      requiresMoreInfo: true
    });

    mockChatService.sendMessage.mockResolvedValue({
      message: mockMessage,
      requiresMoreInfo: false
    });

    render(<ChatInterface {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('What specific achievements can you share?')).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText('Type your response...');
    
    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.keyPress(input, { key: 'Enter', code: 'Enter' });

    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('closes when close button is clicked', () => {
    render(<ChatInterface {...defaultProps} />);
    
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('completes chat when no more info is needed', async () => {
    const mockInitMessage = {
      id: 'ai-1',
      role: 'assistant' as const,
      content: 'What specific achievements can you share?',
      timestamp: new Date()
    };

    const mockFinalMessage = {
      id: 'ai-2',
      role: 'assistant' as const,
      content: 'Perfect! I have enough information now.',
      timestamp: new Date()
    };

    mockChatService.initializeChat.mockResolvedValue({
      message: mockInitMessage,
      requiresMoreInfo: true
    });

    mockChatService.sendMessage.mockResolvedValue({
      message: mockFinalMessage,
      requiresMoreInfo: false
    });

    mockChatService.generateUpdatedContent.mockResolvedValue({
      updatedContent: 'Updated section content',
      message: 'Content updated successfully'
    });

    render(<ChatInterface {...defaultProps} />);

    // Wait for initialization
    await waitFor(() => {
      expect(screen.getByText('What specific achievements can you share?')).toBeInTheDocument();
    });

    // Send a message
    const input = screen.getByPlaceholderText('Type your response...');
    fireEvent.change(input, { target: { value: 'I increased sales by 25%' } });
    fireEvent.click(screen.getByText('Send'));

    // Wait for completion
    await waitFor(() => {
      expect(mockChatService.generateUpdatedContent).toHaveBeenCalled();
    }, { timeout: 3000 });

    expect(defaultProps.onComplete).toHaveBeenCalledWith('Updated section content');
  });

  it('displays error messages', async () => {
    mockChatService.initializeChat.mockRejectedValue(new Error('Failed to initialize'));

    render(<ChatInterface {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Failed to initialize')).toBeInTheDocument();
    });
  });

  it('disables input while loading', async () => {
    const mockMessage = {
      id: 'ai-1',
      role: 'assistant' as const,
      content: 'What specific achievements can you share?',
      timestamp: new Date()
    };

    mockChatService.initializeChat.mockResolvedValue({
      message: mockMessage,
      requiresMoreInfo: true
    });

    // Make sendMessage hang to test loading state
    mockChatService.sendMessage.mockImplementation(() => new Promise(() => {}));

    render(<ChatInterface {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('What specific achievements can you share?')).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText('Type your response...');
    const sendButton = screen.getByText('Send');

    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.click(sendButton);

    // Check loading state
    expect(screen.getByText('AI is thinking...')).toBeInTheDocument();
    expect(input).toBeDisabled();
    expect(sendButton).toBeDisabled();
  });
});