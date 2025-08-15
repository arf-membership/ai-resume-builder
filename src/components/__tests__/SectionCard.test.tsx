import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SectionCard } from '../SectionCard';
import type { CVSection } from '../../types';

const mockSection: CVSection = {
  section_name: 'professional_summary',
  score: 85,
  content: 'Experienced software developer with 5 years of experience in full-stack development.',
  feedback: 'Strong professional summary that clearly communicates your value proposition.',
  suggestions: 'Consider adding specific technologies and quantifiable achievements to make it more impactful.'
};

describe('SectionCard', () => {
  const mockProps = {
    section: mockSection,
    onEdit: vi.fn()
  };

  it('renders section information correctly', () => {
    render(<SectionCard {...mockProps} />);
    
    expect(screen.getByText('Professional Summary')).toBeInTheDocument();
    expect(screen.getByText('85')).toBeInTheDocument();
    expect(screen.getByText(mockSection.feedback)).toBeInTheDocument();
    expect(screen.getByText(mockSection.suggestions)).toBeInTheDocument();
  });

  it('shows correct color coding for high score', () => {
    render(<SectionCard {...mockProps} />);
    
    const scoreDisplay = screen.getByText('85').closest('div');
    expect(scoreDisplay).toHaveClass('text-green-600');
  });

  it('shows correct color coding for medium score', () => {
    const mediumScoreSection = { ...mockSection, score: 70 };
    render(<SectionCard {...mockProps} section={mediumScoreSection} />);
    
    const scoreDisplay = screen.getByText('70').closest('div');
    expect(scoreDisplay).toHaveClass('text-yellow-600');
  });

  it('shows correct color coding for low score', () => {
    const lowScoreSection = { ...mockSection, score: 45 };
    render(<SectionCard {...mockProps} section={lowScoreSection} />);
    
    const scoreDisplay = screen.getByText('45').closest('div');
    expect(scoreDisplay).toHaveClass('text-red-600');
  });

  it('expands and collapses content section', () => {
    render(<SectionCard {...mockProps} />);
    
    const contentButton = screen.getByText('Current Content');
    
    // Content should not be visible initially
    expect(screen.queryByText(mockSection.content)).not.toBeInTheDocument();
    
    // Click to expand
    fireEvent.click(contentButton);
    expect(screen.getByText(mockSection.content)).toBeInTheDocument();
    
    // Click to collapse
    fireEvent.click(contentButton);
    expect(screen.queryByText(mockSection.content)).not.toBeInTheDocument();
  });

  it('calls onEdit when edit button is clicked', () => {
    render(<SectionCard {...mockProps} />);
    
    const editButton = screen.getByText('Edit with AI');
    fireEvent.click(editButton);
    
    expect(mockProps.onEdit).toHaveBeenCalled();
  });

  it('shows editing state correctly', () => {
    render(<SectionCard {...mockProps} isEditing={true} />);
    
    expect(screen.getByText('Editing...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /editing/i })).toBeDisabled();
  });

  it('shows disabled state correctly', () => {
    render(<SectionCard {...mockProps} disabled={true} />);
    
    const editButton = screen.getByText('Edit with AI');
    expect(editButton).toBeDisabled();
  });
});