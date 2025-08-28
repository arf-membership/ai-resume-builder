/**
 * CV Analysis Flow Component
 * Modern landing page with professional design for hackathon submission
 */

import { useState, useRef } from 'react';
import { UploadZone } from './UploadZone';
import { AnalysisResults } from './AnalysisResults';
import { useSession } from '../contexts/SessionContext';
import { useStoreActions } from '../store';
import { useNotifications } from '../store/notificationStore';
import { AnalysisService } from '../services/analysisService';
import { 
  saveCVAnalysisToStorage, 
  clearCVAnalysisFromStorage
} from '../utils/cvStorageUtils';
import { useCVAnalysisRestore } from '../hooks/useCVAnalysisRestore';

interface CVAnalysisFlowProps {
  className?: string;
}

export function CVAnalysisFlow({ className = '' }: CVAnalysisFlowProps) {
  const { sessionId } = useSession();
  const { showError, showSuccess } = useNotifications();
  const actions = useStoreActions();
  
  const [uploadedFile, setUploadedFile] = useState<{ resumeId: string; filePath: string } | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState('');
  const analysisRef = useRef<HTMLDivElement>(null);
  
  // Use custom hook to handle analysis restoration
  const { analysisResult, currentResume } = useCVAnalysisRestore(analysisRef);

  // Set showResults based on whether we have analysis data
  const showResults = Boolean(analysisResult && currentResume);

  const handleUploadComplete = (fileData: { resumeId: string; filePath: string }) => {
    setUploadedFile(fileData);
    setUploadError(null);
    setUploadProgress(0);
  };

  const handleUploadProgress = (progress: number) => {
    setUploadProgress(progress);
  };

  const handleUploadError = (error: string) => {
    setUploadError(error);
    setUploadProgress(0);
  };

  const handleAnalyzeCV = async () => {
    if (!uploadedFile || !sessionId) {
      console.error('Missing uploadedFile or sessionId');
      return;
    }

    // Clear previous analysis data from storage when starting new analysis
    clearCVAnalysisFromStorage();
    
    try {
      setIsAnalyzing(true);
      setAnalysisProgress(0);
      setUploadError(null);
      setCurrentStage('Initializing analysis...');
      
      // Set the current resume in the store
      actions.setCurrentResume({
        id: uploadedFile.resumeId,
        user_session_id: sessionId,
        original_pdf_path: uploadedFile.filePath,
        generated_pdf_path: null,
        analysis_json: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      actions.setIsAnalyzing(true);

      // Start fake progress timer
      const progressInterval = setInterval(() => {
        setAnalysisProgress(prev => {
          const newProgress = Math.min(prev + Math.random() * 3 + 1, 95); // Increment by 1-4%, max 95%
          updateStageAndTime(newProgress);
          return newProgress;
        });
      }, 800); // Update every 800ms

      try {
        // Call the analysis service (this is the long AI request)
        const result = await AnalysisService.analyzeCV(
          uploadedFile.resumeId,
          sessionId
        );
        
        // Clear the fake progress and set to 100%
        clearInterval(progressInterval);
        setAnalysisProgress(100);
        updateStageAndTime(100);
        
        // Store the analysis result
        actions.setAnalysisResult(result);
        
        // Save to local storage
        const currentResumeData = {
          id: uploadedFile.resumeId,
          user_session_id: sessionId,
          original_pdf_path: uploadedFile.filePath,
          generated_pdf_path: null,
          analysis_json: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        
        saveCVAnalysisToStorage(result, currentResumeData, sessionId);
        
        // Results will show automatically via computed showResults
        // showSuccess('CV Analysis Complete', 'Your CV has been analyzed successfully!');

        // Smooth scroll to results after a brief delay
        setTimeout(() => {
          analysisRef.current?.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
          });
        }, 500);
        
      } catch (error) {
        clearInterval(progressInterval);
        throw error;
      }

    } catch (error) {
      console.error('Analysis failed:', error);
      setUploadError(error instanceof Error ? error.message : 'Analysis failed');
      showError('Analysis Failed', error instanceof Error ? error.message : 'Failed to analyze your CV. Please try again.');
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress(0);
      setCurrentStage('');
      actions.setIsAnalyzing(false);
    }
  };

  const handleSectionEdit = async (sectionName: string) => {
    console.log('Editing section:', sectionName);
  };

  const handleDownloadPDF = () => {
    console.log('Downloading PDF');
  };

  const updateStageAndTime = (progress: number) => {
    // Update stage based on progress with more granular updates
    if (progress < 15) {
      setCurrentStage('📄 Extracting text from your CV...');
    } else if (progress < 25) {
      setCurrentStage('📋 Processing document structure...');
    } else if (progress < 40) {
      setCurrentStage('🔍 Analyzing CV structure and formatting...');
    } else if (progress < 55) {
      setCurrentStage('🤖 AI is processing your content...');
    } else if (progress < 65) {
      setCurrentStage('🧠 Deep content analysis in progress...');
    } else if (progress < 75) {
      setCurrentStage('📊 Calculating compatibility scores...');
    } else if (progress < 90) {
      setCurrentStage('💡 Generating personalized recommendations...');
    } else if (progress < 100) {
      setCurrentStage('✨ Finalizing your analysis...');
    } else {
      setCurrentStage('✅ Analysis complete!');
    }
  };

  return (
    <div className={`min-h-screen ${className}`}>
      {/* Hero Section with Modern Design */}
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        {/* Background Effects */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(68,68,68,.2)_50%,transparent_75%,transparent_100%)] bg-[length:250px_250px] animate-pulse"></div>
          <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
          <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
        </div>

        <div className="relative  container mx-auto px-6 py-10 lg:py-13">
          {/* Header */}
          <div className="text-center max-w-4xl mx-auto mb-16">
            <style>{`
              @keyframes shimmer {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(200%); }
              }
              .animate-shimmer {
                animation: shimmer 2s infinite;
              }
            `}</style>
            
            <h1 className="text-5xl lg:text-7xl font-bold text-white mb-6 tracking-tight">
              Transform Your
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent"> CV </span>
              with AI
            </h1>
            
            <p className="text-xl lg:text-2xl text-gray-300 mb-8 leading-relaxed">
              Get instant AI analysis, personalized feedback, and ATS optimization. 
              <br className="hidden md:block" />
              Land your dream job with our cutting-edge resume enhancement platform.
            </p>

          </div>

          {/* Feature Cards */}
          {/* <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="group relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all duration-300">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Instant Analysis</h3>
              <p className="text-gray-400 leading-relaxed">Advanced AI algorithms analyze your CV in seconds, providing detailed insights and recommendations.</p>
            </div>

            <div className="group relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all duration-300">
              <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Smart Optimization</h3>
              <p className="text-gray-400 leading-relaxed">Get AI-powered suggestions to enhance content, structure, and keywords for maximum impact.</p>
            </div>

            <div className="group relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all duration-300">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">ATS Compatible</h3>
              <p className="text-gray-400 leading-relaxed">Ensure your resume passes through Applicant Tracking Systems with our optimization engine.</p>
            </div>
          </div> */}

          {/* Upload Section */}
          <div className="max-w-2xl mx-auto">
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 lg:p-12 shadow-2xl">
              <div className="text-center mb-8">
                <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
                  {showResults ? 'Upload New CV for Fresh Analysis' : 'Upload Your CV to Get Started'}
                </h2>
                <p className="text-gray-300 text-lg">
                  {showResults 
                    ? 'Upload a new CV to clear previous results and start fresh analysis.' 
                    : 'Drag and drop your PDF or click to browse. Analysis starts instantly.'
                  }
                </p>
                {showResults && (
                  <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <p className="text-blue-300 text-sm">
                      💡 Your previous analysis is shown below. Upload a new CV to start over.
                    </p>
                  </div>
                )}
              </div>
              
              <UploadZone
                onUploadComplete={(fileData) => {
                  // Clear results when new file is uploaded
                  clearCVAnalysisFromStorage();
                  handleUploadComplete(fileData);
                }}
                onUploadProgress={handleUploadProgress}
                onError={handleUploadError}
                disabled={uploadProgress > 0 && uploadProgress < 100}
              />

              {/* Upload Error Display */}
              {uploadError && (
                <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl backdrop-blur-sm">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-red-400 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-red-300">Upload Error</p>
                      <p className="text-sm text-red-200 mt-1 break-words">{uploadError}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Success State and Analyze Button */}
              {uploadedFile && (
                <div className="mt-8 text-center">
                  <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl backdrop-blur-sm">
                    <div className="flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-400 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <p className="text-sm font-medium text-green-300">CV uploaded successfully!</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleAnalyzeCV}
                    disabled={isAnalyzing}
                    className={`group relative inline-flex items-center justify-center px-8 py-4 text-lg font-semibold rounded-2xl transition-all duration-300 transform ${
                      isAnalyzing
                        ? 'bg-gray-600 cursor-not-allowed scale-95'
                        : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white hover:scale-105 shadow-2xl hover:shadow-purple-500/25'
                    }`}
                  >
                    {isAnalyzing ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
                        <div className="flex flex-col items-center">
                          <span className="font-semibold">Analyzing... {Math.round(analysisProgress)}%</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <span>Analyze My CV</span>
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-400 to-pink-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                      </>
                    )}
                  </button>

                  {/* Enhanced Progress Visualization */}
                  {isAnalyzing && (
                    <div className="mt-8 space-y-6">
                      {/* Current Stage Display */}
                      <div className="text-center">   
                        <h3 className="text-white text-xl font-semibold mb-2">
                          {currentStage || 'Processing your CV...'}
                        </h3>
                        <div className="flex items-center justify-center space-x-4 text-sm text-gray-300">
                          <span className="text-purple-400 font-medium">{Math.round(analysisProgress)}% complete</span>
                        </div>
                      </div>

                      {/* Enhanced Progress Bar */}
                      <div className="relative">
                        <div className="bg-white/10 rounded-full h-4 overflow-hidden backdrop-blur-sm border border-white/20">
                          <div 
                            className="bg-gradient-to-r from-purple-500 via-pink-500 to-purple-600 h-4 transition-all duration-700 ease-out relative"
                            style={{ width: `${analysisProgress}%` }}
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
                          </div>
                        </div>
                      </div>

                      {/* Progress Milestones */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                        <div className={`flex flex-col items-center p-3 rounded-lg border transition-all duration-300 ${
                          analysisProgress >= 25 
                            ? 'bg-purple-500/10 border-purple-500/30 text-purple-300' 
                            : 'bg-gray-500/10 border-gray-500/30 text-gray-400'
                        }`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 text-sm ${
                            analysisProgress >= 25 ? 'bg-purple-500/20' : 'bg-gray-500/20'
                          }`}>
                            {analysisProgress >= 25 ? '✓' : '📄'}
                          </div>
                          <span className="font-medium">Text Extraction</span>
                        </div>
                        
                        <div className={`flex flex-col items-center p-3 rounded-lg border transition-all duration-300 ${
                          analysisProgress >= 50 
                            ? 'bg-purple-500/10 border-purple-500/30 text-purple-300' 
                            : 'bg-gray-500/10 border-gray-500/30 text-gray-400'
                        }`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 text-sm ${
                            analysisProgress >= 50 ? 'bg-purple-500/20' : 'bg-gray-500/20'
                          }`}>
                            {analysisProgress >= 50 ? '✓' : '🤖'}
                          </div>
                          <span className="font-medium">AI Analysis</span>
                        </div>
                        
                        <div className={`flex flex-col items-center p-3 rounded-lg border transition-all duration-300 ${
                          analysisProgress >= 85 
                            ? 'bg-purple-500/10 border-purple-500/30 text-purple-300' 
                            : 'bg-gray-500/10 border-gray-500/30 text-gray-400'
                        }`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 text-sm ${
                            analysisProgress >= 85 ? 'bg-purple-500/20' : 'bg-gray-500/20'
                          }`}>
                            {analysisProgress >= 85 ? '✓' : '💡'}
                          </div>
                          <span className="font-medium">Recommendations</span>
                        </div>
                        
                        <div className={`flex flex-col items-center p-3 rounded-lg border transition-all duration-300 ${
                          analysisProgress >= 100 
                            ? 'bg-purple-500/10 border-purple-500/30 text-purple-300' 
                            : 'bg-gray-500/10 border-gray-500/30 text-gray-400'
                        }`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 text-sm ${
                            analysisProgress >= 100 ? 'bg-purple-500/20' : 'bg-gray-500/20'
                          }`}>
                            {analysisProgress >= 100 ? '✓' : '✨'}
                          </div>
                          <span className="font-medium">Finalizing</span>
                        </div>
                      </div>

                      {/* Fun Facts During Wait */}
                      <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                        <div className="flex items-start space-x-3">
                          <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                            💡
                          </div>
                          <div>
                            <h4 className="text-white font-medium mb-1">Did you know?</h4>
                            <p className="text-gray-300 text-sm">
                              {analysisProgress < 30 && "Our AI analyzes over 50 different aspects of your CV, from formatting to keyword optimization."}
                              {analysisProgress >= 30 && analysisProgress < 60 && "75% of resumes are rejected by ATS systems before a human ever sees them. We're making sure yours isn't one of them!"}
                              {analysisProgress >= 60 && analysisProgress < 90 && "The average recruiter spends only 6 seconds reviewing a resume. We're optimizing yours for maximum impact."}
                              {analysisProgress >= 90 && "Your enhanced CV will be ready in just a moment. Great things are worth the wait!"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

         
        </div>
      </div>

      {/* Analysis Results Section - Keep dark theme consistent */}
      {showResults && analysisResult && (
        <div ref={analysisRef}>
          <AnalysisResults
            analysisData={analysisResult}
            resumeId={currentResume?.id || ''}
            onSectionEdit={handleSectionEdit}
            onDownloadPDF={handleDownloadPDF}
          />
        </div>
      )}
      
    </div>
  );
}