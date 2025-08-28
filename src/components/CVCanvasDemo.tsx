import React, { useState } from 'react';
import CVCanvas from './CVCanvas';
import type { SectionUpdate } from '../types/components';

/**
 * Demo component for CVCanvas functionality
 * Shows PDF display with mock data and interactive features
 */
const CVCanvasDemo: React.FC = () => {
  const [updates, setUpdates] = useState<SectionUpdate[]>([]);
  const [showUpdates, setShowUpdates] = useState(false);

  // Mock PDF URL - in real app this would come from Supabase Storage
  const mockPdfUrl = 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf';

  const mockUpdates: SectionUpdate[] = [
    {
      sectionName: 'Experience',
      newContent: 'Updated work experience with AI improvements',
      position: { x: 50, y: 100, width: 300, height: 80 }
    },
    {
      sectionName: 'Skills',
      newContent: 'Enhanced skills section with better keywords',
      position: { x: 50, y: 200, width: 250, height: 60 }
    },
    {
      sectionName: 'Education',
      newContent: 'Improved education formatting and details',
      position: { x: 50, y: 300, width: 280, height: 70 }
    }
  ];

  const handleDownload = () => {
    alert('Download functionality would generate and download the improved PDF');
  };

  const toggleUpdates = () => {
    setShowUpdates(!showUpdates);
    setUpdates(showUpdates ? [] : mockUpdates);
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          CV Canvas Demo
        </h2>
        <p className="text-gray-600 mb-4">
          Interactive PDF viewer with zoom, navigation, and section update overlay features.
        </p>
        
        <div className="flex flex-wrap gap-4 mb-4">
          <button
            onClick={toggleUpdates}
            className={`px-4 py-2 rounded-lg transition-colors ${
              showUpdates
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {showUpdates ? 'Hide' : 'Show'} Section Updates
          </button>
          
          <div className="text-sm text-gray-500 flex items-center">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Using sample PDF for demonstration
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg overflow-hidden" style={{ height: '800px' }}>
        <CVCanvas
          pdfUrl={mockPdfUrl}
          updates={updates}
          onDownload={handleDownload}
          className="h-full"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-2">Features</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• PDF rendering with react-pdf</li>
            <li>• Page navigation controls</li>
            <li>• Zoom in/out functionality</li>
            <li>• Responsive layout</li>
            <li>• Section update overlays</li>
            <li>• Download integration</li>
          </ul>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-2">Mobile Support</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Touch-friendly controls</li>
            <li>• Responsive scaling</li>
            <li>• Adaptive layout</li>
            <li>• Mobile-optimized UI</li>
          </ul>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-2">Error Handling</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Loading states</li>
            <li>• Error recovery</li>
            <li>• Retry mechanisms</li>
            <li>• User-friendly messages</li>
          </ul>
        </div>
      </div>

      {showUpdates && (
        <div className="mt-6 bg-blue-50 p-4 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">Active Section Updates</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {mockUpdates.map((update, index) => (
              <div key={index} className="bg-white p-3 rounded border">
                <div className="font-medium text-blue-800">{update.sectionName}</div>
                <div className="text-sm text-gray-600 mt-1">{update.newContent}</div>
                <div className="text-xs text-gray-500 mt-2">
                  Position: {update.position?.x}, {update.position?.y}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CVCanvasDemo;