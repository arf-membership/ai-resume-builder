/**
 * PDF Generation Demo Component
 * Demonstrates the PDF generation functionality
 */

import React, { useState } from 'react';
import CVCanvas from './CVCanvas';
import { usePDFGeneration } from '../hooks/usePDFGeneration';
import type { SectionUpdate } from '../types/components';

const PDFGenerationDemo: React.FC = () => {
  const [mockSectionUpdates] = useState<SectionUpdate[]>([
    {
      sectionName: 'Summary',
      newContent: 'Updated professional summary with enhanced skills and experience.',
      position: { x: 50, y: 100, width: 400, height: 60 },
    },
    {
      sectionName: 'Experience',
      newContent: 'Enhanced work experience with quantified achievements and impact.',
      position: { x: 50, y: 200, width: 400, height: 120 },
    },
  ]);

  const pdfGeneration = usePDFGeneration({
    resumeId: 'demo-resume-123',
    sessionId: 'session_demo_abc123',
    onSuccess: (pdfUrl) => {
      console.log('PDF generated successfully:', pdfUrl);
    },
    onError: (error) => {
      console.error('PDF generation failed:', error);
    },
  });

  const handleGenerateOnly = async () => {
    await pdfGeneration.generatePDF(mockSectionUpdates);
  };

  const handleGenerateAndDownload = async () => {
    await pdfGeneration.generateAndDownload(mockSectionUpdates, 'demo_enhanced_cv.pdf');
  };

  const handleDownloadExisting = async () => {
    if (pdfGeneration.state.generatedPdfUrl) {
      await pdfGeneration.downloadPDF('demo_cv.pdf');
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          PDF Generation Demo
        </h2>
        <p className="text-gray-600 mb-6">
          This demo showcases the PDF generation functionality. You can generate enhanced PDFs 
          with section updates and download them automatically.
        </p>

        {/* Control Panel */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Controls</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={handleGenerateOnly}
              disabled={pdfGeneration.state.isGenerating}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
            >
              {pdfGeneration.state.isGenerating ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              )}
              <span>Generate PDF</span>
            </button>

            <button
              onClick={handleGenerateAndDownload}
              disabled={pdfGeneration.state.isGenerating || pdfGeneration.state.isDownloading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
            >
              {pdfGeneration.state.isGenerating || pdfGeneration.state.isDownloading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              )}
              <span>Generate & Download</span>
            </button>

            <button
              onClick={handleDownloadExisting}
              disabled={!pdfGeneration.state.generatedPdfUrl || pdfGeneration.state.isDownloading}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
            >
              {pdfGeneration.state.isDownloading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              )}
              <span>Download Existing</span>
            </button>
          </div>
        </div>

        {/* Status Display */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Status</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Generation Status
              </label>
              <div className="text-sm text-gray-600">
                {pdfGeneration.state.isGenerating ? 'Generating...' : 
                 pdfGeneration.state.isDownloading ? 'Downloading...' : 
                 'Ready'}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Generated PDF
              </label>
              <div className="text-sm text-gray-600">
                {pdfGeneration.state.hasGeneratedPdf ? 'Available' : 'Not generated'}
              </div>
            </div>
          </div>

          {pdfGeneration.state.progress && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-700">{pdfGeneration.state.progress.stage}</span>
                <span className="text-gray-600">{Math.round(pdfGeneration.state.progress.percentage)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${pdfGeneration.state.progress.percentage}%` }}
                ></div>
              </div>
            </div>
          )}

          {pdfGeneration.state.error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
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
        </div>

        {/* Section Updates Preview */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Section Updates</h3>
          <div className="space-y-3">
            {mockSectionUpdates.map((update, index) => (
              <div key={index} className="bg-white p-3 rounded border">
                <div className="font-medium text-gray-800 mb-1">{update.sectionName}</div>
                <div className="text-sm text-gray-600">{update.newContent}</div>
                {update.position && (
                  <div className="text-xs text-gray-500 mt-1">
                    Position: ({update.position.x}, {update.position.y}) 
                    Size: {update.position.width}×{update.position.height}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CV Canvas Demo */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-800">CV Canvas with PDF Generation</h3>
          <p className="text-sm text-gray-600 mt-1">
            This canvas shows how the PDF generation integrates with the CV viewer.
          </p>
        </div>
        
        <div className="h-96">
          <CVCanvas
            pdfUrl="https://example.com/sample-cv.pdf"
            updates={mockSectionUpdates}
            resumeId="demo-resume-123"
            sessionId="session_demo_abc123"
            className="h-full"
          />
        </div>
      </div>
    </div>
  );
};

export default PDFGenerationDemo;