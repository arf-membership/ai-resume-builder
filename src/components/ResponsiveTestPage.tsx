/**
 * Responsive Test Page
 * A simple page to visually test responsive design implementations
 */

import React, { useState } from 'react';
import { LandingPage } from './LandingPage';
import { AnalysisResults } from './AnalysisResults';
import { ChatInterface } from './ChatInterface';
import { SectionCard } from './SectionCard';
import { OverallScoreDisplay } from './OverallScoreDisplay';
import { SessionProvider } from '../contexts/SessionContext';
import type { CVAnalysisResult, CVSection } from '../types';

const mockAnalysisData: CVAnalysisResult = {
  overall_score: 75,
  summary: 'Your CV shows good potential with room for improvement. The professional summary is well-written but could benefit from more specific achievements. Technical skills are clearly listed but could be better organized.',
  sections: [
    {
      section_name: 'professional_summary',
      score: 80,
      content: 'Experienced software developer with 5+ years of experience in full-stack development, specializing in React, Node.js, and cloud technologies.',
      feedback: 'Good summary but could be more specific about achievements and impact.',
      suggestions: 'Add quantifiable achievements, specific technologies used, and measurable impact on previous projects.'
    },
    {
      section_name: 'technical_skills',
      score: 85,
      content: 'JavaScript, TypeScript, React, Node.js, Python, AWS, Docker, PostgreSQL',
      feedback: 'Comprehensive skill list with relevant technologies.',
      suggestions: 'Group skills by category and add proficiency levels.'
    },
    {
      section_name: 'work_experience',
      score: 70,
      content: 'Senior Developer at TechCorp (2020-2023)\n- Developed web applications\n- Led team of 3 developers\n- Improved system performance',
      feedback: 'Good experience but lacks specific metrics and achievements.',
      suggestions: 'Add specific metrics, technologies used, and quantifiable achievements for each role.'
    }
  ],
  ats_compatibility: {
    score: 70,
    feedback: 'Generally ATS-friendly with standard formatting.',
    suggestions: 'Use more standard section headings and avoid complex formatting.'
  }
};

const mockSection: CVSection = mockAnalysisData.sections[0];

function ResponsiveTestPage() {
  const [currentView, setCurrentView] = useState<'landing' | 'analysis' | 'components'>('landing');
  const [chatOpen, setChatOpen] = useState(false);
  const [viewportInfo, setViewportInfo] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });

  // Update viewport info on resize
  React.useEffect(() => {
    const handleResize = () => {
      setViewportInfo({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getBreakpointInfo = () => {
    const width = viewportInfo.width;
    if (width < 475) return 'xs (< 475px)';
    if (width < 640) return 'sm (475px - 640px)';
    if (width < 768) return 'md (640px - 768px)';
    if (width < 1024) return 'lg (768px - 1024px)';
    if (width < 1280) return 'xl (1024px - 1280px)';
    return '2xl (> 1280px)';
  };

  return (
    <SessionProvider>
      <div className="min-h-screen bg-gray-100">
        {/* Viewport Info Bar */}
        <div className="bg-blue-600 text-white p-2 text-center text-sm">
          <div className="flex flex-col sm:flex-row justify-center items-center space-y-1 sm:space-y-0 sm:space-x-4">
            <span>Viewport: {viewportInfo.width} × {viewportInfo.height}</span>
            <span>Breakpoint: {getBreakpointInfo()}</span>
            <span className="text-blue-200">Resize window to test responsiveness</span>
          </div>
        </div>

        {/* Navigation */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
              <button
                onClick={() => setCurrentView('landing')}
                className={`btn-touch px-4 py-2 rounded-lg font-medium transition-colors ${
                  currentView === 'landing'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Landing Page
              </button>
              <button
                onClick={() => setCurrentView('analysis')}
                className={`btn-touch px-4 py-2 rounded-lg font-medium transition-colors ${
                  currentView === 'analysis'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Analysis Results
              </button>
              <button
                onClick={() => setCurrentView('components')}
                className={`btn-touch px-4 py-2 rounded-lg font-medium transition-colors ${
                  currentView === 'components'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Individual Components
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          {currentView === 'landing' && <LandingPage />}
          
          {currentView === 'analysis' && (
            <AnalysisResults
              analysisData={mockAnalysisData}
              resumeId="test-resume-id"
              onSectionEdit={(sectionName) => console.log('Edit section:', sectionName)}
              onDownloadPDF={() => console.log('Download PDF')}
            />
          )}
          
          {currentView === 'components' && (
            <div className="p-4 sm:p-6 space-y-6">
              <div className="max-w-4xl mx-auto space-y-8">
                
                {/* Overall Score Display */}
                <div>
                  <h2 className="text-responsive-lg font-semibold text-gray-900 mb-4">Overall Score Display</h2>
                  <OverallScoreDisplay
                    score={mockAnalysisData.overall_score}
                    summary={mockAnalysisData.summary}
                  />
                </div>

                {/* Section Card */}
                <div>
                  <h2 className="text-responsive-lg font-semibold text-gray-900 mb-4">Section Card</h2>
                  <SectionCard
                    section={mockSection}
                    onEdit={() => console.log('Edit section')}
                    onChatEdit={() => setChatOpen(true)}
                    isEditing={false}
                  />
                </div>

                {/* Responsive Grid Test */}
                <div>
                  <h2 className="text-responsive-lg font-semibold text-gray-900 mb-4">Responsive Grid Test</h2>
                  <div className="grid-responsive-1-3 gap-4">
                    {[1, 2, 3, 4, 5, 6].map(num => (
                      <div key={num} className="bg-white p-4 rounded-lg border text-center">
                        <div className="text-responsive-base font-medium">Card {num}</div>
                        <div className="text-responsive-sm text-gray-600 mt-2">
                          This card tests responsive grid behavior
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Touch Target Test */}
                <div>
                  <h2 className="text-responsive-lg font-semibold text-gray-900 mb-4">Touch Target Test</h2>
                  <div className="space-y-3">
                    <button className="btn-touch bg-blue-600 text-white px-4 py-2 rounded-lg">
                      Standard Button
                    </button>
                    <button className="btn-touch bg-green-600 text-white px-6 py-3 rounded-lg">
                      Large Touch Target
                    </button>
                    <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                      <button className="btn-touch bg-red-600 text-white px-4 py-2 rounded-lg flex-1">
                        Mobile Full Width
                      </button>
                      <button className="btn-touch bg-purple-600 text-white px-4 py-2 rounded-lg flex-1">
                        Desktop Side by Side
                      </button>
                    </div>
                  </div>
                </div>

                {/* Typography Test */}
                <div>
                  <h2 className="text-responsive-lg font-semibold text-gray-900 mb-4">Responsive Typography</h2>
                  <div className="space-y-2">
                    <div className="text-responsive-xs">Extra Small Text (responsive)</div>
                    <div className="text-responsive-sm">Small Text (responsive)</div>
                    <div className="text-responsive-base">Base Text (responsive)</div>
                    <div className="text-responsive-lg">Large Text (responsive)</div>
                    <div className="text-responsive-xl">Extra Large Text (responsive)</div>
                    <div className="text-responsive-2xl">2XL Text (responsive)</div>
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>

        {/* Chat Interface Modal */}
        {chatOpen && (
          <ChatInterface
            isOpen={chatOpen}
            sectionName="professional_summary"
            resumeId="test-resume-id"
            onClose={() => setChatOpen(false)}
            onComplete={(content) => {
              console.log('Chat completed with content:', content);
              setChatOpen(false);
            }}
          />
        )}
      </div>
    </SessionProvider>
  );
}

export default ResponsiveTestPage;