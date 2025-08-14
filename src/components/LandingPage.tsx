/**
 * Landing Page Component
 * Provides the main entry point with hero section and platform explanation
 */

import { useState } from 'react';
import { UploadZone } from './UploadZone';
import { useSession } from '../contexts/SessionContext';

export function LandingPage() {
  const { sessionId } = useSession();
  const [uploadedFile, setUploadedFile] = useState<{ resumeId: string; filePath: string } | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleUploadComplete = (fileData: { resumeId: string; filePath: string }) => {
    setUploadedFile(fileData);
    setUploadError(null);
  };

  const handleUploadProgress = (progress: number) => {
    setUploadProgress(progress);
  };

  const handleUploadError = (error: string) => {
    setUploadError(error);
    setUploadProgress(0);
  };

  const handleAnalyzeCV = () => {
    if (uploadedFile) {
      // TODO: Navigate to analysis page or trigger analysis
      console.log('Analyzing CV:', uploadedFile);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            AI-Powered CV Improvement Platform
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Transform your resume with artificial intelligence. Upload your PDF CV and get 
            instant analysis, personalized feedback, and AI-powered improvements to help you 
            land your dream job.
          </p>
          
          {/* Feature highlights */}
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Instant Analysis</h3>
              <p className="text-gray-600">Get detailed scoring and feedback on every section of your CV in seconds.</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">AI-Powered Editing</h3>
              <p className="text-gray-600">Interactive editing with AI suggestions to improve your content.</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Download Enhanced CV</h3>
              <p className="text-gray-600">Get your improved CV as a professional PDF ready for applications.</p>
            </div>
          </div>
        </div>

        {/* Upload Section */}
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              Upload Your CV to Get Started
            </h2>
            
            <UploadZone
              onUploadComplete={handleUploadComplete}
              onUploadProgress={handleUploadProgress}
              onError={handleUploadError}
              disabled={uploadProgress > 0 && uploadProgress < 100}
            />

            {/* Upload Error Display */}
            {uploadError && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-red-700 font-medium">Upload Error</p>
                </div>
                <p className="text-red-600 mt-1">{uploadError}</p>
              </div>
            )}

            {/* Success State and Analyze Button */}
            {uploadedFile && (
              <div className="mt-6 text-center">
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <p className="text-green-700 font-medium">CV uploaded successfully!</p>
                  </div>
                </div>
                
                <button
                  onClick={handleAnalyzeCV}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
                >
                  Analyze My CV
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Additional Information */}
        <div className="mt-16 text-center">
          <p className="text-gray-500 mb-4">
            No account required • Secure processing • Your data is protected
          </p>
          {sessionId && (
            <p className="text-sm text-gray-400">
              Session ID: {sessionId.substring(0, 8)}...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}