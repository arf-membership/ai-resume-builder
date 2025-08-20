/**
 * Lazy-loaded components for code splitting and performance optimization
 * Provides React.lazy wrappers with loading states and error boundaries
 */

import React, { Suspense } from 'react';
import LoadingSpinner from './LoadingIndicator';
import ErrorBoundary from './ErrorBoundary';

// Lazy load heavy components
const AnalysisResults = React.lazy(() => 
  import('./AnalysisResults').then(module => ({ default: module.AnalysisResults }))
);

const CVCanvas = React.lazy(() => 
  import('./CVCanvas').then(module => ({ default: module.default }))
);

const ChatInterface = React.lazy(() => 
  import('./ChatInterface').then(module => ({ default: module.ChatInterface }))
);

// Demo components (only loaded when needed)
const AnalysisResultsDemo = React.lazy(() => 
  import('./AnalysisResultsDemo')
);

const CVCanvasDemo = React.lazy(() => 
  import('./CVCanvasDemo')
);

const ChatInterfaceDemo = React.lazy(() => 
  import('./ChatInterfaceDemo')
);

const ErrorHandlingDemo = React.lazy(() => 
  import('./ErrorHandlingDemo')
);

const PDFGenerationDemo = React.lazy(() => 
  import('./PDFGenerationDemo')
);

const ResponsiveTestPage = React.lazy(() => 
  import('./ResponsiveTestPage')
);

const SessionDemo = React.lazy(() => 
  import('./SessionDemo')
);

const StateManagementDemo = React.lazy(() => 
  import('./StateManagementDemo')
);

// Loading fallback component
const ComponentLoader: React.FC<{ name?: string }> = ({ name }) => (
  <div className="flex items-center justify-center p-8">
    <div className="text-center">
      <LoadingSpinner size="lg" />
      <p className="text-sm text-gray-600 mt-2">
        {name ? `Loading ${name}...` : 'Loading component...'}
      </p>
    </div>
  </div>
);



// Higher-order component for lazy loading with error boundary
const withLazyLoading = <P extends object>(
  LazyComponent: React.LazyExoticComponent<React.ComponentType<P>>,
  componentName?: string
) => {
  return React.forwardRef<any, P>((props, ref) => (
    <ErrorBoundary
      fallback={
        <div className="flex flex-col items-center justify-center p-8 bg-red-50 border border-red-200 rounded-lg">
          <div className="text-center">
            <svg className="w-8 h-8 text-red-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-medium text-red-800 mb-1">
              Failed to load {componentName || 'component'}
            </h3>
            <p className="text-sm text-red-600 mb-4">
              An unexpected error occurred while loading this component
            </p>
          </div>
        </div>
      }
    >
      <Suspense fallback={<ComponentLoader name={componentName} />}>
        <LazyComponent {...props} ref={ref} />
      </Suspense>
    </ErrorBoundary>
  ));
};

// Exported lazy components with error boundaries
export const LazyAnalysisResults = withLazyLoading(AnalysisResults, 'Analysis Results');
export const LazyCVCanvas = withLazyLoading(CVCanvas, 'CV Canvas');
export const LazyChatInterface = withLazyLoading(ChatInterface, 'Chat Interface');

// Demo components
export const LazyAnalysisResultsDemo = withLazyLoading(AnalysisResultsDemo, 'Analysis Results Demo');
export const LazyCVCanvasDemo = withLazyLoading(CVCanvasDemo, 'CV Canvas Demo');
export const LazyChatInterfaceDemo = withLazyLoading(ChatInterfaceDemo, 'Chat Interface Demo');
export const LazyErrorHandlingDemo = withLazyLoading(ErrorHandlingDemo, 'Error Handling Demo');
export const LazyPDFGenerationDemo = withLazyLoading(PDFGenerationDemo, 'PDF Generation Demo');
export const LazyResponsiveTestPage = withLazyLoading(ResponsiveTestPage, 'Responsive Test Page');
export const LazySessionDemo = withLazyLoading(SessionDemo, 'Session Demo');
export const LazyStateManagementDemo = withLazyLoading(StateManagementDemo, 'State Management Demo');

// Preload functions for critical components
export const preloadAnalysisResults = () => {
  import('./AnalysisResults');
};

export const preloadCVCanvas = () => {
  import('./CVCanvas');
};

export const preloadChatInterface = () => {
  import('./ChatInterface');
};

// Preload all critical components
export const preloadCriticalComponents = () => {
  preloadAnalysisResults();
  preloadCVCanvas();
  preloadChatInterface();
};

// Component registry for dynamic loading
export const componentRegistry = {
  AnalysisResults: LazyAnalysisResults,
  CVCanvas: LazyCVCanvas,
  ChatInterface: LazyChatInterface,
  AnalysisResultsDemo: LazyAnalysisResultsDemo,
  CVCanvasDemo: LazyCVCanvasDemo,
  ChatInterfaceDemo: LazyChatInterfaceDemo,
  ErrorHandlingDemo: LazyErrorHandlingDemo,
  PDFGenerationDemo: LazyPDFGenerationDemo,
  ResponsiveTestPage: LazyResponsiveTestPage,
  SessionDemo: LazySessionDemo,
  StateManagementDemo: LazyStateManagementDemo,
} as const;

export type ComponentName = keyof typeof componentRegistry;

// Dynamic component loader
export const loadComponent = (name: ComponentName) => {
  return componentRegistry[name];
};