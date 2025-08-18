import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import type { CVCanvasProps } from '../types/components';
import { usePDFGeneration } from '../hooks/usePDFGeneration';

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

interface TouchState {
  initialDistance: number;
  initialScale: number;
  lastTouchTime: number;
  touchCount: number;
}

const CVCanvas: React.FC<CVCanvasProps> = ({
  pdfUrl,
  updates = [],
  onDownload,
  className = '',
  resumeId,
  sessionId
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfViewerRef = useRef<HTMLDivElement>(null);
  const touchStateRef = useRef<TouchState>({
    initialDistance: 0,
    initialScale: 1,
    lastTouchTime: 0,
    touchCount: 0
  });

  const [state, setState] = useState<CVCanvasState>({
    numPages: null,
    currentPage: 1,
    scale: 1.0,
    isLoading: true,
    error: null,
    containerWidth: 0
  });

  // PDF generation hook
  const pdfGeneration = usePDFGeneration({
    resumeId: resumeId || '',
    sessionId: sessionId || '',
    onSuccess: (pdfUrl) => {
      console.log('PDF generated successfully:', pdfUrl);
    },
    onError: (error) => {
      console.error('PDF generation failed:', error);
    }
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

  // Touch gesture handlers
  const getTouchDistance = useCallback((touches: TouchList) => {
    if (touches.length < 2) return 0;
    const touch1 = touches[0];
    const touch2 = touches[1];
    return Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) + 
      Math.pow(touch2.clientY - touch1.clientY, 2)
    );
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touches = e.touches;
    touchStateRef.current.touchCount = touches.length;
    touchStateRef.current.lastTouchTime = Date.now();

    if (touches.length === 2) {
      // Pinch gesture start
      touchStateRef.current.initialDistance = getTouchDistance(touches);
      touchStateRef.current.initialScale = state.scale;
      e.preventDefault();
    }
  }, [getTouchDistance, state.scale]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const touches = e.touches;

    if (touches.length === 2 && touchStateRef.current.initialDistance > 0) {
      // Pinch zoom
      const currentDistance = getTouchDistance(touches);
      const scaleChange = currentDistance / touchStateRef.current.initialDistance;
      const newScale = Math.max(0.25, Math.min(3.0, touchStateRef.current.initialScale * scaleChange));
      
      setState(prev => ({
        ...prev,
        scale: newScale
      }));
      
      e.preventDefault();
    }
  }, [getTouchDistance]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const currentTime = Date.now();
    const timeDiff = currentTime - touchStateRef.current.lastTouchTime;

    // Handle double tap to zoom
    if (e.changedTouches.length === 1 && touchStateRef.current.touchCount === 1 && timeDiff < 300) {
      if (touchStateRef.current.lastTouchTime && (currentTime - touchStateRef.current.lastTouchTime) < 500) {
        // Double tap detected
        if (state.scale === 1.0) {
          setState(prev => ({ ...prev, scale: 2.0 }));
        } else {
          setState(prev => ({ ...prev, scale: 1.0 }));
        }
      }
    }

    // Reset touch state
    touchStateRef.current.initialDistance = 0;
    touchStateRef.current.touchCount = 0;
  }, [state.scale]);

  const handleRetry = useCallback(() => {
    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null
    }));
  }, []);

  // Handle download button click
  const handleDownload = useCallback(async () => {
    if (onDownload) {
      // Use custom download handler if provided
      onDownload();
    } else if (resumeId && sessionId) {
      // Use PDF generation service
      try {
        await pdfGeneration.generateAndDownload(updates);
      } catch (error) {
        console.error('Download failed:', error);
      }
    }
  }, [onDownload, resumeId, sessionId, updates, pdfGeneration]);

  // Check for existing generated PDF on mount
  useEffect(() => {
    if (resumeId && sessionId) {
      pdfGeneration.checkExistingPDF();
    }
  }, [resumeId, sessionId]);

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border-b bg-gray-50 space-y-3 sm:space-y-0">
        
        {/* Mobile: Top row with page navigation and download */}
        <div className="flex items-center justify-between sm:hidden">
          <div className="flex items-center space-x-2">
            <button
              onClick={goToPreviousPage}
              disabled={state.currentPage <= 1}
              className="btn-touch p-2 rounded-lg bg-white border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Previous page"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <span className="text-responsive-xs text-gray-600 min-w-[60px] text-center">
              {state.numPages ? `${state.currentPage}/${state.numPages}` : 'Loading...'}
            </span>
            
            <button
              onClick={goToNextPage}
              disabled={state.currentPage >= (state.numPages || 1)}
              className="btn-touch p-2 rounded-lg bg-white border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Next page"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <button
            onClick={handleDownload}
            disabled={pdfGeneration.state.isGenerating || pdfGeneration.state.isDownloading}
            className="btn-touch px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-1"
          >
            {pdfGeneration.state.isGenerating || pdfGeneration.state.isDownloading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            )}
            <span className="text-xs">
              {pdfGeneration.state.isGenerating ? 'Gen...' : 
               pdfGeneration.state.isDownloading ? 'Down...' : 
               'PDF'}
            </span>
          </button>
        </div>

        {/* Mobile: Bottom row with zoom controls */}
        <div className="flex items-center justify-center space-x-2 sm:hidden">
          <button
            onClick={zoomOut}
            className="btn-touch p-2 rounded-lg bg-white border hover:bg-gray-50 transition-colors"
            aria-label="Zoom out"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          
          <button
            onClick={resetZoom}
            className="btn-touch px-3 py-2 text-xs bg-white border rounded-lg hover:bg-gray-50 transition-colors min-w-[50px]"
          >
            {Math.round(getResponsiveScale() * 100)}%
          </button>
          
          <button
            onClick={zoomIn}
            className="btn-touch p-2 rounded-lg bg-white border hover:bg-gray-50 transition-colors"
            aria-label="Zoom in"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        {/* Desktop: Single row layout */}
        <div className="hidden sm:flex items-center space-x-2">
          {/* Page navigation */}
          <button
            onClick={goToPreviousPage}
            disabled={state.currentPage <= 1}
            className="btn-touch p-2 rounded-lg bg-white border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
            className="btn-touch p-2 rounded-lg bg-white border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Next page"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Desktop: Zoom controls */}
        <div className="hidden sm:flex items-center space-x-2">
          <button
            onClick={zoomOut}
            className="btn-touch p-2 rounded-lg bg-white border hover:bg-gray-50 transition-colors"
            aria-label="Zoom out"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          
          <button
            onClick={resetZoom}
            className="btn-touch px-3 py-1 text-sm bg-white border rounded-lg hover:bg-gray-50 transition-colors min-w-[60px]"
          >
            {Math.round(getResponsiveScale() * 100)}%
          </button>
          
          <button
            onClick={zoomIn}
            className="btn-touch p-2 rounded-lg bg-white border hover:bg-gray-50 transition-colors"
            aria-label="Zoom in"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        {/* Desktop: Download button */}
        <div className="hidden sm:block">
          <button
            onClick={handleDownload}
            disabled={pdfGeneration.state.isGenerating || pdfGeneration.state.isDownloading}
            className="btn-touch px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            {pdfGeneration.state.isGenerating || pdfGeneration.state.isDownloading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            )}
            <span>
              {pdfGeneration.state.isGenerating ? 'Generating...' : 
               pdfGeneration.state.isDownloading ? 'Downloading...' : 
               'Download PDF'}
            </span>
          </button>
        </div>
      </div>

      {/* PDF Generation Progress */}
      {pdfGeneration.state.progress && (
        <div className="px-4 py-2 bg-blue-50 border-b">
          <div className="flex items-center justify-between text-sm">
            <span className="text-blue-700">{pdfGeneration.state.progress.stage}</span>
            <span className="text-blue-600">{Math.round(pdfGeneration.state.progress.percentage)}%</span>
          </div>
          <div className="mt-1 w-full bg-blue-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${pdfGeneration.state.progress.percentage}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* PDF Generation Error */}
      {pdfGeneration.state.error && (
        <div className="px-4 py-2 bg-red-50 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-red-700 text-sm">{pdfGeneration.state.error}</span>
            </div>
            <button
              onClick={pdfGeneration.clearError}
              className="text-red-500 hover:text-red-700 text-sm"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* PDF viewer container */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto bg-gray-100 p-2 sm:p-4"
      >
        <div className="flex justify-center">
          <div 
            ref={pdfViewerRef}
            className="relative touch-manipulation"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{ touchAction: 'pan-x pan-y pinch-zoom' }}
          >
            {state.isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10 rounded-lg">
                <div className="flex flex-col items-center">
                  <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-blue-600 mb-2"></div>
                  <div className="text-responsive-xs text-gray-600">Loading PDF...</div>
                </div>
              </div>
            )}
            
            <Document
              file={pdfUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={
                <div className="flex items-center justify-center p-6 sm:p-8">
                  <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-blue-600"></div>
                </div>
              }
              error={
                <div className="flex flex-col items-center justify-center p-6 sm:p-8 text-center">
                  <div className="text-red-500 text-responsive-base font-semibold mb-2">
                    Failed to load PDF
                  </div>
                  <button
                    onClick={handleRetry}
                    className="btn-touch px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
                  <div className="flex items-center justify-center p-6 sm:p-8 bg-white border rounded-lg">
                    <div className="animate-spin rounded-full h-4 w-4 sm:h-6 sm:w-6 border-b-2 border-blue-600"></div>
                  </div>
                }
                className="shadow-lg rounded-lg"
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
                    <div className="absolute -top-5 sm:-top-6 left-0 text-xs bg-blue-600 text-white px-1 sm:px-2 py-1 rounded text-[10px] sm:text-xs">
                      {update.sectionName}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Touch gesture hint for mobile */}
            <div className="absolute bottom-2 right-2 sm:hidden">
              <div className="bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                Pinch to zoom • Double tap to reset
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CVCanvas;