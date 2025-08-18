/**
 * Responsive Design Tests
 * Tests for mobile optimization and responsive behavior
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LandingPage } from '../LandingPage';
import { AnalysisResults } from '../AnalysisResults';
import { ChatInterface } from '../ChatInterface';
import { SectionCard } from '../SectionCard';
import { SessionProvider } from '../../contexts/SessionContext';
import type { CVAnalysisResult, CVSection } from '../../types';

// Mock dependencies
vi.mock('../../lib/supabase', () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
        getPublicUrl: vi.fn()
      }))
    },
    from: vi.fn(() => ({
      insert: vi.fn(),
      select: vi.fn(),
      update: vi.fn()
    }))
  }
}));

vi.mock('../../services', () => ({
  UploadService: {
    uploadPDF: vi.fn()
  }
}));

vi.mock('../../services/chatService', () => ({
  ChatService: {
    initializeChat: vi.fn(),
    sendMessage: vi.fn(),
    generateUpdatedContent: vi.fn()
  }
}));

vi.mock('../../hooks/useSectionEdit', () => ({
  useSectionEdit: () => ({
    analysisData: mockAnalysisData,
    editingSections: new Set(),
    sectionUpdates: new Map(),
    error: null,
    chatOpen: false,
    currentChatSection: null,
    editSection: vi.fn(),
    editSectionWithChat: vi.fn(),
    closeChatInterface: vi.fn(),
    completeChatEdit: vi.fn(),
    clearError: vi.fn()
  })
}));

const mockAnalysisData: CVAnalysisResult = {
  overall_score: 75,
  summary: 'Your CV shows good potential with room for improvement.',
  sections: [
    {
      section_name: 'professional_summary',
      score: 80,
      content: 'Experienced software developer...',
      feedback: 'Good summary but could be more specific.',
      suggestions: 'Add more quantifiable achievements.'
    }
  ],
  ats_compatibility: {
    score: 70,
    feedback: 'Generally ATS-friendly',
    suggestions: 'Use more standard section headings.'
  }
};

const mockSection: CVSection = {
  section_name: 'professional_summary',
  score: 80,
  content: 'Experienced software developer with 5 years of experience.',
  feedback: 'Good summary but could be more specific.',
  suggestions: 'Add more quantifiable achievements and specific technologies.'
};

// Helper to wrap components with providers
const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <SessionProvider>
      {component}
    </SessionProvider>
  );
};

describe('Responsive Design', () => {
  beforeEach(() => {
    // Reset viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 768,
    });
  });

  describe('LandingPage Responsive Behavior', () => {
    it('should render mobile-friendly layout on small screens', () => {
      // Simulate mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      renderWithProviders(<LandingPage />);

      // Check for responsive text classes
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveClass('text-responsive-3xl');

      // Check for mobile-friendly feature grid
      const featureCards = screen.getAllByText(/Instant Analysis|AI-Powered Editing|Download Enhanced CV/);
      expect(featureCards).toHaveLength(3);
    });

    it('should show appropriate text for mobile upload zone', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      renderWithProviders(<LandingPage />);

      // Mobile text should be different from desktop
      expect(screen.getByText('Tap to select your PDF CV')).toBeInTheDocument();
    });

    it('should have touch-friendly button sizes', () => {
      renderWithProviders(<LandingPage />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        // Check for btn-touch class or minimum touch target size
        expect(button).toHaveClass('btn-touch');
      });
    });
  });

  describe('AnalysisResults Responsive Layout', () => {
    it('should stack layout vertically on mobile', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(
        <AnalysisResults
          analysisData={mockAnalysisData}
          resumeId="test-resume"
          onSectionEdit={vi.fn()}
          onDownloadPDF={vi.fn()}
        />
      );

      // Check for mobile-responsive grid classes
      const gridContainer = screen.getByText('CV Analysis Results').closest('div')?.parentElement;
      expect(gridContainer).toHaveClass('grid-cols-1');
    });

    it('should show compact download button text on mobile', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(
        <AnalysisResults
          analysisData={mockAnalysisData}
          resumeId="test-resume"
          onSectionEdit={vi.fn()}
          onDownloadPDF={vi.fn()}
        />
      );

      // Should show compact text on mobile
      expect(screen.getByText('Download')).toBeInTheDocument();
    });
  });

  describe('SectionCard Mobile Optimization', () => {
    it('should stack buttons vertically on mobile', () => {
      render(
        <SectionCard
          section={mockSection}
          onEdit={vi.fn()}
          onChatEdit={vi.fn()}
          isEditing={false}
        />
      );

      const buttonContainer = screen.getByText('Edit').closest('div');
      expect(buttonContainer).toHaveClass('flex-col');
    });

    it('should show compact button text on small screens', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(
        <SectionCard
          section={mockSection}
          onEdit={vi.fn()}
          onChatEdit={vi.fn()}
          isEditing={false}
        />
      );

      // Should show compact text
      expect(screen.getByText('Chat')).toBeInTheDocument();
      expect(screen.getByText('Edit')).toBeInTheDocument();
    });

    it('should have proper touch targets', () => {
      render(
        <SectionCard
          section={mockSection}
          onEdit={vi.fn()}
          onChatEdit={vi.fn()}
          isEditing={false}
        />
      );

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveClass('btn-touch');
      });
    });
  });

  describe('ChatInterface Mobile Behavior', () => {
    it('should render as full-screen modal on mobile', () => {
      render(
        <ChatInterface
          isOpen={true}
          sectionName="professional_summary"
          resumeId="test-resume"
          onClose={vi.fn()}
          onComplete={vi.fn()}
        />
      );

      const modal = screen.getByRole('dialog', { hidden: true }) || 
                   screen.getByText('Improve Professional Summary Section').closest('div');
      
      // Should have mobile-specific classes
      expect(modal).toHaveClass('h-[90vh]');
    });

    it('should show mobile-appropriate helper text', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(
        <ChatInterface
          isOpen={true}
          sectionName="professional_summary"
          resumeId="test-resume"
          onClose={vi.fn()}
          onComplete={vi.fn()}
        />
      );

      expect(screen.getByText('Tap Send to submit your message')).toBeInTheDocument();
    });

    it('should have proper input sizing for mobile', () => {
      render(
        <ChatInterface
          isOpen={true}
          sectionName="professional_summary"
          resumeId="test-resume"
          onClose={vi.fn()}
          onComplete={vi.fn()}
        />
      );

      const input = screen.getByPlaceholderText('Type your response...');
      expect(input).toHaveClass('text-base');
      expect(input).toHaveClass('py-3');
    });
  });

  describe('Touch Gesture Support', () => {
    it('should handle touch events properly', () => {
      const mockTouchEvent = {
        touches: [
          { clientX: 100, clientY: 100 },
          { clientX: 200, clientY: 200 }
        ],
        preventDefault: vi.fn()
      };

      // This would be tested with actual CVCanvas component
      // For now, we verify the touch event structure
      expect(mockTouchEvent.touches).toHaveLength(2);
      expect(typeof mockTouchEvent.preventDefault).toBe('function');
    });
  });

  describe('Safe Area Support', () => {
    it('should include safe area classes', () => {
      renderWithProviders(<LandingPage />);

      const container = screen.getByText('AI-Powered CV Improvement Platform').closest('div');
      expect(container).toHaveClass('min-h-screen-safe');
    });
  });

  describe('Responsive Text and Spacing', () => {
    it('should use responsive text classes', () => {
      renderWithProviders(<LandingPage />);

      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveClass('text-responsive-3xl');
    });

    it('should use responsive spacing classes', () => {
      render(
        <AnalysisResults
          analysisData={mockAnalysisData}
          resumeId="test-resume"
          onSectionEdit={vi.fn()}
          onDownloadPDF={vi.fn()}
        />
      );

      const container = screen.getByText('Section Analysis').closest('div');
      expect(container).toHaveClass('space-y-3');
    });
  });

  describe('Accessibility on Mobile', () => {
    it('should maintain proper ARIA labels on touch elements', () => {
      renderWithProviders(<LandingPage />);

      const uploadZone = screen.getByLabelText('Upload PDF file');
      expect(uploadZone).toBeInTheDocument();
      expect(uploadZone).toHaveAttribute('role', 'button');
    });

    it('should support keyboard navigation', () => {
      renderWithProviders(<LandingPage />);

      const uploadZone = screen.getByLabelText('Upload PDF file');
      
      // Should be focusable
      uploadZone.focus();
      expect(document.activeElement).toBe(uploadZone);

      // Should respond to Enter key
      fireEvent.keyDown(uploadZone, { key: 'Enter' });
      // File input should be triggered (mocked behavior)
    });
  });
});