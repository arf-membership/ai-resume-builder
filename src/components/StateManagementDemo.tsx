/**
 * Demo component to showcase state management functionality
 */

import React from 'react';
import { useAppState } from '../hooks/useAppState';

const StateManagementDemo: React.FC = () => {
  const {
    sessionId,
    uploadProgress,
    isUploading,
    isAnalyzing,
    analysisResult,
    errors,
    computed,
    upload,
    analysis,
    editing,
    pdf,
    session,
    notifications,
  } = useAppState();

  const handleTestUpload = () => {
    const testFile = new File(['test content'], 'test-cv.pdf', { type: 'application/pdf' });
    upload.startUpload(testFile);
    
    // Simulate upload progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      upload.updateProgress(progress);
      
      if (progress >= 100) {
        clearInterval(interval);
        upload.completeUpload({
          id: 'demo-resume-id',
          user_session_id: sessionId,
          original_pdf_path: 'demo/test-cv.pdf',
          generated_pdf_path: null,
          analysis_json: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    }, 200);
  };

  const handleTestAnalysis = () => {
    analysis.startAnalysis();
    
    // Simulate analysis completion
    setTimeout(() => {
      analysis.completeAnalysis({
        overall_score: 85,
        summary: 'Your CV shows strong professional experience with good structure.',
        sections: [
          {
            section_name: 'Professional Summary',
            score: 90,
            content: 'Experienced software developer with 5+ years...',
            feedback: 'Strong opening statement that clearly communicates value.',
            suggestions: 'Consider adding specific technologies you specialize in.',
          },
          {
            section_name: 'Work Experience',
            score: 80,
            content: 'Senior Developer at Tech Corp (2020-2024)...',
            feedback: 'Good use of action verbs and quantified achievements.',
            suggestions: 'Add more specific metrics and impact numbers.',
          },
        ],
        ats_compatibility: {
          score: 85,
          feedback: 'CV is well-structured for ATS systems.',
          suggestions: 'Consider adding more industry keywords.',
        },
      });
    }, 2000);
  };

  const handleTestEdit = () => {
    if (analysisResult?.sections[0]) {
      editing.startEdit(analysisResult.sections[0].section_name);
      
      // Simulate edit completion
      setTimeout(() => {
        editing.completeEdit(analysisResult.sections[0].section_name, {
          ...analysisResult.sections[0],
          score: 95,
          content: 'Highly experienced software developer with 5+ years of expertise in React, TypeScript, and Node.js...',
          feedback: 'Excellent opening statement with specific technologies mentioned.',
          suggestions: 'Perfect! This section is now optimized.',
        });
      }, 1500);
    }
  };

  const handleTestPDF = () => {
    pdf.startGeneration();
    
    // Simulate PDF generation
    setTimeout(() => {
      pdf.completeGeneration('demo/generated-cv.pdf');
    }, 1000);
  };

  const handleTestError = () => {
    notifications.showError('Test Error', 'This is a test error message to demonstrate error handling.');
  };

  const handleTestSuccess = () => {
    notifications.showSuccess('Test Success', 'This is a test success message!');
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">State Management Demo</h1>
        
        {/* Session Info */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Session Information</h2>
          <p className="text-sm text-gray-600">Session ID: {sessionId}</p>
          <p className="text-sm text-gray-600">Valid: {computed.sessionValid ? 'Yes' : 'No'}</p>
          <div className="mt-2 space-x-2">
            <button
              onClick={session.refresh}
              className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
            >
              Refresh Session
            </button>
            <button
              onClick={session.clear}
              className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
            >
              Clear Session
            </button>
          </div>
        </div>

        {/* Upload Demo */}
        <div className="mb-6 p-4 border rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Upload Demo</h2>
          <div className="mb-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-sm text-gray-600 mt-1">Progress: {uploadProgress}%</p>
          </div>
          <button
            onClick={handleTestUpload}
            disabled={isUploading}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            {isUploading ? 'Uploading...' : 'Test Upload'}
          </button>
        </div>

        {/* Analysis Demo */}
        <div className="mb-6 p-4 border rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Analysis Demo</h2>
          <p className="text-sm text-gray-600 mb-2">
            Status: {isAnalyzing ? 'Analyzing...' : 'Ready'}
          </p>
          {analysisResult && (
            <div className="mb-2 p-2 bg-green-50 rounded">
              <p className="text-sm font-medium">Overall Score: {analysisResult.overall_score}/100</p>
              <p className="text-sm text-gray-600">{analysisResult.summary}</p>
            </div>
          )}
          <button
            onClick={handleTestAnalysis}
            disabled={isAnalyzing || !computed.hasResume}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
          >
            {isAnalyzing ? 'Analyzing...' : 'Test Analysis'}
          </button>
        </div>

        {/* Editing Demo */}
        <div className="mb-6 p-4 border rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Section Editing Demo</h2>
          <button
            onClick={handleTestEdit}
            disabled={!computed.canEdit}
            className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50"
          >
            Test Section Edit
          </button>
        </div>

        {/* PDF Demo */}
        <div className="mb-6 p-4 border rounded-lg">
          <h2 className="text-lg font-semibold mb-2">PDF Generation Demo</h2>
          <button
            onClick={handleTestPDF}
            disabled={!computed.canDownload}
            className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 disabled:opacity-50"
          >
            Test PDF Generation
          </button>
        </div>

        {/* Notification Demo */}
        <div className="mb-6 p-4 border rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Notification Demo</h2>
          <div className="space-x-2">
            <button
              onClick={handleTestSuccess}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Test Success
            </button>
            <button
              onClick={handleTestError}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Test Error
            </button>
          </div>
        </div>

        {/* Computed State */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Computed State</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>Has Resume: {computed.hasResume ? 'Yes' : 'No'}</div>
            <div>Has Analysis: {computed.hasAnalysis ? 'Yes' : 'No'}</div>
            <div>Can Edit: {computed.canEdit ? 'Yes' : 'No'}</div>
            <div>Can Download: {computed.canDownload ? 'Yes' : 'No'}</div>
            <div>Is Loading: {computed.isLoading ? 'Yes' : 'No'}</div>
            <div>Has Errors: {computed.hasErrors ? 'Yes' : 'No'}</div>
            <div>Overall Score: {computed.overallScore}</div>
            <div>Sections Count: {computed.sectionsCount}</div>
          </div>
        </div>

        {/* Errors */}
        {errors.length > 0 && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <h2 className="text-lg font-semibold mb-2 text-red-800">Errors</h2>
            {errors.map((error) => (
              <div key={error.id} className="mb-2 p-2 bg-red-100 rounded">
                <p className="text-sm font-medium text-red-800">{error.type}: {error.message}</p>
                <p className="text-xs text-red-600">{error.timestamp.toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StateManagementDemo;