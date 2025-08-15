import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import CVCanvas from '../CVCanvas';
import type { SectionUpdate } from '../../types/components';

// Mock react-pdf
vi.mock('react-pdf', () => ({
  Document: ({ children, onLoadSuccess, onLoadError, loading, error }: any) => {
    // Simulate successful load after a short delay
    React.useEffect(() => {
      setTimeout(() => {
        onLoadSuccess({ numPages: 2 });
      }, 100);
    }, [onLoadSuccess]);

    return (
      <div data-testid="pdf-document">
        {children}
      </div>
    );
  },
  Page: ({ pageNumber, scale, onLoadError, loading, className }: any) => (
    <div 
      data-testid={`pdf-page-${pageNumber}`}
      data-scale={scale}
      className={className}
    >
      Page {pageNumber}
    </div>
  ),
  pdfjs: {
    version: '3.11.174',
    GlobalWorkerOptions: {
      workerSrc: ''
    }
  }
}));

describe('CVCanvas', () => {
  const mockProps = {
    pdfUrl: 'https://example.com/test.pdf',
    onDownload: vi.fn(),
    className: 'test-class'
  };

  const mockUpdates: SectionUpdate[] = [
    {
      sectionName: 'Experience',
      newContent: 'Updated experience content',
      position: { x: 10, y: 20, width: 200, height: 50 }
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    render(<CVCanvas {...mockProps} />);
    
    expect(screen.getByText('Loading PDF...')).toBeInTheDocument();
  });

  it('renders PDF document after loading', async () => {
    render(<CVCanvas {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByTestId('pdf-document')).toBeInTheDocument();
    });
  });

  it('displays page navigation controls', async () => {
    render(<CVCanvas {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByLabelText('Previous page')).toBeInTheDocument();
      expect(screen.getByLabelText('Next page')).toBeInTheDocument();
      expect(screen.getByText('1 / 2')).toBeInTheDocument();
    });
  });

  it('displays zoom controls', async () => {
    render(<CVCanvas {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByLabelText('Zoom in')).toBeInTheDocument();
      expect(screen.getByLabelText('Zoom out')).toBeInTheDocument();
      expect(screen.getByText('100%')).toBeInTheDocument();
    });
  });

  it('displays download button', async () => {
    render(<CVCanvas {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Download PDF')).toBeInTheDocument();
    });
  });

  it('handles page navigation', async () => {
    render(<CVCanvas {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('1 / 2')).toBeInTheDocument();
    });

    const nextButton = screen.getByLabelText('Next page');
    fireEvent.click(nextButton);
    
    expect(screen.getByText('2 / 2')).toBeInTheDocument();

    const prevButton = screen.getByLabelText('Previous page');
    fireEvent.click(prevButton);
    
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
  });

  it('handles zoom controls', async () => {
    render(<CVCanvas {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText(/\d+%/)).toBeInTheDocument();
    });

    const zoomInButton = screen.getByLabelText('Zoom in');
    const zoomOutButton = screen.getByLabelText('Zoom out');
    const resetZoomButton = screen.getByText(/\d+%/);
    
    // Test that buttons are clickable and don't throw errors
    expect(() => {
      fireEvent.click(zoomInButton);
      fireEvent.click(zoomOutButton);
      fireEvent.click(resetZoomButton);
    }).not.toThrow();
  });

  it('calls onDownload when download button is clicked', async () => {
    render(<CVCanvas {...mockProps} />);
    
    await waitFor(() => {
      const downloadButton = screen.getByText('Download PDF');
      fireEvent.click(downloadButton);
      
      expect(mockProps.onDownload).toHaveBeenCalledTimes(1);
    });
  });

  it('renders section updates overlay', async () => {
    render(<CVCanvas {...mockProps} updates={mockUpdates} />);
    
    await waitFor(() => {
      expect(screen.getByTitle('Updated: Experience')).toBeInTheDocument();
    });
  });

  it('applies custom className', () => {
    const { container } = render(<CVCanvas {...mockProps} />);
    
    const canvasContainer = container.querySelector('.test-class');
    expect(canvasContainer).toBeInTheDocument();
    expect(canvasContainer).toHaveClass('test-class');
  });

  it('disables navigation buttons appropriately', async () => {
    render(<CVCanvas {...mockProps} />);
    
    await waitFor(() => {
      const prevButton = screen.getByLabelText('Previous page');
      const nextButton = screen.getByLabelText('Next page');
      
      // On first page, previous should be disabled
      expect(prevButton).toBeDisabled();
      expect(nextButton).not.toBeDisabled();
      
      // Navigate to last page
      fireEvent.click(nextButton);
      
      // On last page, next should be disabled
      expect(prevButton).not.toBeDisabled();
      expect(nextButton).toBeDisabled();
    });
  });

  it('handles responsive layout', async () => {
    // Mock container width
    const mockOffsetWidth = 800;
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
      configurable: true,
      value: mockOffsetWidth,
    });

    render(<CVCanvas {...mockProps} />);
    
    await waitFor(() => {
      const page = screen.getByTestId('pdf-page-1');
      // Scale should be calculated based on container width
      expect(page).toHaveAttribute('data-scale');
    });
  });
});