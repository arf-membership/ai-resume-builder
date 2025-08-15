/**
 * Integration tests for ChatInterface with section editing
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AnalysisResults } from '../AnalysisResults';
import type { CVAnalysisResult } from '../../types';

// Mock the services
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

vi.mock('../../services/sectionEditService', () => ({
  SectionEditService: {
    editSection: vi.fn(),
    checkAvailability: vi.fn(),
    getEstimatedProcessingTime: vi.fn()
  }
}));

vi.mock('../../services/sessionStorage', () => ({
  SessionStorageService: {
    getSessionData: vi.fn(() => ({
      sessionId: 'test-session-id',
      timestamp: Date.now()
    })),
    setSessionData: vi.fn(),
    clearSessionData: vi.fn()
  }
}));

describe('ChatInterface Integration', () => {
  const mockAnalysisData: CVAnalysisResult = {
    overall_score: 75,
    summary: 'Your CV shows good potential with room for improvement.',
    sections: [
      {
        section_name: 'work_experience',
        score: 70,
        content: 'Software Developer at Tech Corp (2020-2023)',
        feedback: 'Good experience but lacks specific achievements',
        suggestions: 'Add quantifiable results and specific technologies used'
      },
      {
        section_name: 'skills',
        score: 80,
        content: 'JavaScript, React, Node.js',
        feedback: 'Good technical skills listed',
        suggestions: 'Consider adding proficiency levels'
      }
    ],
    ats_compatibility: {
      score: 75,
      feedback: 'Generally ATS-friendly format',
      suggestions: 'Use more standard section headings'
    }
  };

  const defaultProps = {
    analysisData: mockAnalysisData,
    resumeId: 'test-resume-id',
    onSectionEdit: vi.fn(),
    onDownloadPDF: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows chat with AI button for each section', () => {
    render(<AnalysisResults {...defaultProps} />);
    
    // Should show "Chat with AI" buttons for each section
    const chatButtons = screen.getAllByText('Chat with AI');
    expect(chatButtons).toHaveLength(2); // One for each section
  });

  it('opens chat interface when chat button is clicked', async () => {
    render(<AnalysisResults {...defaultProps} />);
    
    // Click the first "Chat with AI" button
    const chatButtons = screen.getAllByText('Chat with AI');
    fireEvent.click(chatButtons[0]);

    // Should open the chat interface
    await waitFor(() => {
      expect(screen.getByText('Improve work experience Section')).toBeInTheDocument();
    });

    // Should show the chat interface modal
    expect(screen.getByText('Let\'s gather some additional information to make your section even better')).toBeInTheDocument();
  });

  it('closes chat interface when close button is clicked', async () => {
    render(<AnalysisResults {...defaultProps} />);
    
    // Open chat interface
    const chatButtons = screen.getAllByText('Chat with AI');
    fireEvent.click(chatButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Improve work experience Section')).toBeInTheDocument();
    });

    // Close the chat interface
    const closeButton = screen.getByLabelText('Close chat');
    fireEvent.click(closeButton);

    // Chat interface should be closed
    await waitFor(() => {
      expect(screen.queryByText('Improve work experience Section')).not.toBeInTheDocument();
    });
  });

  it('shows both edit options for each section', () => {
    render(<AnalysisResults {...defaultProps} />);
    
    // Should show both "Edit with AI" and "Chat with AI" buttons
    expect(screen.getAllByText('Edit with AI')).toHaveLength(2);
    expect(screen.getAllByText('Chat with AI')).toHaveLength(2);
  });

  it('displays section information correctly', () => {
    render(<AnalysisResults {...defaultProps} />);
    
    // Should display section names
    expect(screen.getByText('Work Experience')).toBeInTheDocument();
    expect(screen.getByText('Skills')).toBeInTheDocument();

    // Should display feedback and suggestions
    expect(screen.getByText('Good experience but lacks specific achievements')).toBeInTheDocument();
    expect(screen.getByText('Add quantifiable results and specific technologies used')).toBeInTheDocument();
  });
});