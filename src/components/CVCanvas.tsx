import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import type { CVCanvasProps } from '../types/components';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface CVCanvasState {
  numPages: number | null;
  currentPage: number;
  scale: number;
  isLoading: boolean;
  error: string | null;
  containerWidth: number;
}

const CVCanvas: React.FC<CVCanvasProps> = ({
  pdfUrl,
  updates = [],
  onDownload,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<CVCanvasState>({
    numPages: null,
    currentPage: 1,
    scale: 1.0,
    isLoading: true,
    error: null,
    containerWidth: 0
  });

  // Handle container resize for responsive layout
  useEffect(() => {
    const updateContainerWidth = () => {
      if (containerRef.current) {
        setState(prev => ({
          ...prev,
          containerWidth: containerRef.current!.offsetWidth
        }));
      }
    };

    updateContainerWidth();
    window.addEventListener('resize', updateContainerWidth);
    return () => window.removeEventListener('resize', updateContainerWidth);
  }, []);

  // Calculate responsive scale based on container width
  const getResponsiveScale = useCallback(() => {
    if (state.containerWidth === 0) return 1.0;
    
    // Base scale calculation for responsive design
    const baseWidth = 600; // Base PDF width
    const maxScale = 2.0;
    const minScale = 0.5;
    
    let calculatedScale = state.containerWidth / baseWidth;
    calculatedScale = Math.max(minScale, Math.min(maxScale, calculatedScale));
    
    return calculatedScale * state.scale;
  }, [state.containerWidth, state.scale]);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setState(prev => ({
      ...prev,
      numPages,
      isLoading: false,
      error: null
    }));
  }, []);

  const onDocumentLoadError = useCallback((error: Error) => {
    setState(prev => ({
      ...prev,
      isLoading: false,
      error: `Failed to load PDF: ${error.message}`
    }));
  }, []);

  const onPageLoadError = useCallback((error: Error) => {
    setState(prev => ({
      ...prev,
      error: `Failed to load page: ${error.message}`
    }));
  }, []);

  const goToPreviousPage = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentPage: Math.max(1, prev.currentPage - 1)
    }));
  }, []);

  const goToNextPage = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentPage: Math.min(prev.numPages || 1, prev.currentPage + 1)
    }));
  }, []);

  const zoomIn = useCallback(() => {
    setState(prev => ({
      ...prev,
      scale: Math.min(3.0, prev.scale + 0.25)
    }));
  }, []);

  const zoomOut = useCallback(() => {
    setState(prev => ({
      ...prev,
      scale: Math.max(0.25, prev.scale - 0.25)
    }));
  }, []);

  const resetZoom = useCallback(() => {
    setState(prev => ({
      ...prev,
      scale: 1.0
    }));
  }, []);

  const handleRetry = useCallback(() => {
    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null
    }));
  }, []);

  if (state.error) {
    return (
      <div className={`flex flex-col items-center justify-center p-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 ${className}`}>
        <div className="text-center">
          <div className="text-red-500 text-lg font-semibold mb-2">
            Error Loading PDF
          </div>
          <div className="text-gray-600 mb-4 max-w-md">
            {state.error}
          </div>
          <button
            onClick={handleRetry}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full bg-white rounded-lg shadow-sm border ${className}`}>
      {/* Header with controls */}
      <div className="flex items-center justify-between p-4 border-b bg-gray-50">
        <div className="flex items-center space-x-2">
          {/* Page navigation */}
          <button
            onClick={goToPreviousPage}
            disabled={state.currentPage <= 1}
            className="p-2 rounded-lg bg-white border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Previous page"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <span className="text-sm text-gray-600 min-w-[80px] text-center">
            {state.numPages ? `${state.currentPage} / ${state.numPages}` : 'Loading...'}
          </span>
          
          <button
            onClick={goToNextPage}
            disabled={state.currentPage >= (state.numPages || 1)}
            className="p-2 rounded-lg bg-white border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Next page"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Zoom controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={zoomOut}
            className="p-2 rounded-lg bg-white border hover:bg-gray-50 transition-colors"
            aria-label="Zoom out"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          
          <button
            onClick={resetZoom}
            className="px-3 py-1 text-sm bg-white border rounded-lg hover:bg-gray-50 transition-colors min-w-[60px]"
          >
            {Math.round(getResponsiveScale() * 100)}%
          </button>
          
          <button
            onClick={zoomIn}
            className="p-2 rounded-lg bg-white border hover:bg-gray-50 transition-colors"
            aria-label="Zoom in"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        {/* Download button */}
        <button
          onClick={onDownload}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="hidden sm:inline">Download PDF</span>
        </button>
      </div>

      {/* PDF viewer container */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto bg-gray-100 p-4"
      >
        <div className="flex justify-center">
          <div className="relative">
            {state.isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10">
                <div className="flex flex-col items-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                  <div className="text-sm text-gray-600">Loading PDF...</div>
                </div>
              </div>
            )}
            
            <Document
              file={pdfUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              }
              error={
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <div className="text-red-500 text-lg font-semibold mb-2">
                    Failed to load PDF
                  </div>
                  <button
                    onClick={handleRetry}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              }
            >
              <Page
                pageNumber={state.currentPage}
                scale={getResponsiveScale()}
                onLoadError={onPageLoadError}
                loading={
                  <div className="flex items-center justify-center p-8 bg-white border rounded-lg">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  </div>
                }
                className="shadow-lg"
              />
            </Document>

            {/* Section updates overlay */}
            {updates.length > 0 && (
              <div className="absolute inset-0 pointer-events-none">
                {updates.map((update, index) => (
                  <div
                    key={`${update.sectionName}-${index}`}
                    className="absolute bg-blue-100 bg-opacity-50 border-2 border-blue-400 rounded"
                    style={{
                      left: update.position?.x || 0,
                      top: update.position?.y || 0,
                      width: update.position?.width || 100,
                      height: update.position?.height || 20,
                    }}
                    title={`Updated: ${update.sectionName}`}
                  >
                    <div className="absolute -top-6 left-0 text-xs bg-blue-600 text-white px-2 py-1 rounded">
                      {update.sectionName}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CVCanvas;