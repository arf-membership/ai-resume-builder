import React, { useState } from 'react';
import type { AnalysisResultsProps } from '../types';
import { useSectionEdit } from '../hooks/useSectionEdit';

import { useSession } from '../contexts/SessionContext';
import CVStructuredView from './CVStructuredView';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Modern Dark-themed Analysis Results component using real data from CV analysis
 */
export const AnalysisResults: React.FC<AnalysisResultsProps> = ({
  analysisData: initialAnalysisData,
  resumeId,
  onSectionEdit,
  onDownloadPDF
}) => {
  const { sessionId } = useSession();

  const [activeTab, setActiveTab] = useState<'overview' | 'skills' | 'experience' | 'strategy' | 'competition' | 'chat'>('overview');

  
  
    
  const {
    analysisData,
    sectionUpdates,
    error,
    clearError
  } = useSectionEdit({
    resumeId,
    sessionId: sessionId || undefined,
    initialAnalysisData,
    onSectionEdit,
    onError: (error) => {
      console.error('Section editing error:', error);
    }
  });

  // Global chat state for CV improvements
  const [globalChatMessages, setGlobalChatMessages] = useState<ChatMessage[]>([]);
  const [isGlobalChatLoading, setIsGlobalChatLoading] = useState(false);

  // Handle global chat message
  const handleGlobalChatMessage = async (message: string) => {
    if (!message.trim() || isGlobalChatLoading) return;

    // Add user message
    setGlobalChatMessages(prev => [...prev, { role: 'user', content: message }]);
    setIsGlobalChatLoading(true);

    try {
      // Call the chat-section edge function for global CV improvement
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-section`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          resumeId,
          sessionId: sessionId || undefined,
          message,
          conversationHistory: globalChatMessages,
          currentCV: analysisData
        }),
      });

      if (!response.ok) {
        throw new Error(`Chat request failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Add AI response
      setGlobalChatMessages(prev => [...prev, { role: 'assistant', content: result.response }]);
      
      // Apply any CV updates if provided
      if (result.cvUpdates) {
        // TODO: Integrate with useSectionEdit hook to apply updates
        console.log('CV Updates received:', result.cvUpdates);
      }

      // Handle suggestions and next steps if provided
      if (result.suggestions && result.suggestions.length > 0) {
        console.log('AI Suggestions:', result.suggestions);
      }
      if (result.nextSteps && result.nextSteps.length > 0) {
        console.log('Next Steps:', result.nextSteps);
      }
    } catch (error) {
      console.error('Global chat error:', error);
      setGlobalChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.' 
      }]);
    } finally {
      setIsGlobalChatLoading(false);
    }
  };

  // Global Chat Input Component
  const GlobalChatInput = ({ onSendMessage, isLoading }: { onSendMessage: (message: string) => void; isLoading: boolean }) => {
    const [inputValue, setInputValue] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!inputValue.trim() || isLoading) return;
      onSendMessage(inputValue);
      setInputValue('');
    };

    return (
      <form onSubmit={handleSubmit} className="flex space-x-3">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Ask me how to improve your CV..."
          disabled={isLoading}
          className="flex-1 bg-gray-700 text-white placeholder-gray-400 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isLoading || !inputValue.trim()}
          className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </form>
    );
  };

  // Calculate match scores from real analysis data
  const calculateMatchScores = () => {
    const sections = analysisData.sections || [];
    if (sections.length === 0) return { skillsMatch: 0, cultureMatch: 0, keywordsMatch: 0, locationMatch: 0, educationMatch: 0, experienceMatch: 0 };
    
    const avgScore = sections.reduce((sum, section) => sum + section.score, 0) / sections.length;
    
    // Calculate based on actual section data and overall score
    const skillsSection = sections.find(s => s.section_name.toLowerCase().includes('skill'));
    const experienceSection = sections.find(s => s.section_name.toLowerCase().includes('experience') || s.section_name.toLowerCase().includes('work'));
    const educationSection = sections.find(s => s.section_name.toLowerCase().includes('education'));
    
    return {
      skillsMatch: skillsSection ? skillsSection.score : Math.max(20, avgScore - 10),
      cultureMatch: Math.max(50, Math.min(100, avgScore + 5)),
      keywordsMatch: Math.max(15, avgScore - 20),
      locationMatch: 100,
      educationMatch: educationSection ? educationSection.score : Math.max(70, avgScore),
      experienceMatch: experienceSection ? experienceSection.score : Math.max(40, avgScore - 5)
    };
  };

  const matchScores = calculateMatchScores();

  // Progress bar component with dark theme
  const ProgressBar = ({ value, color, label }: { value: number; color: string; label: string }) => (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-gray-300">{label}</span>
        <span className={`text-sm font-bold ${
          value >= 80 ? 'text-green-400' : 
          value >= 60 ? 'text-yellow-400' : 
          'text-red-400'
        }`}>
          {Math.round(value)}%
        </span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
        <div 
          className={`h-3 rounded-full transition-all duration-1000 ease-out ${color}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );

  // Tab navigation component with dark theme
  const TabButton = ({ 
    tabKey, 
    label, 
    icon 
  }: { 
    tabKey: typeof activeTab; 
    label: string; 
    icon: React.ReactNode 
  }) => (
    <button
      onClick={() => setActiveTab(tabKey)}
      className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
        activeTab === tabKey
          ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/25' 
          : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  // Tab content renderer
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-8">
            {/* Overall Score Card */}
            <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm rounded-2xl border border-gray-700 p-8">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full text-white text-3xl font-bold mb-4 shadow-lg shadow-purple-500/25">
                  {Math.round(analysisData.overall_score || 0)}
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Overall CV Score</h2>
                <p className="text-gray-300">
                  {(analysisData.overall_score || 0) >= 80 ? 'Excellent CV! 🎉' : 
                   (analysisData.overall_score || 0) >= 60 ? 'Good CV with room for improvement 👍' : 
                   'Your CV needs significant improvements 📝'}
                </p>
              </div>
              
              {analysisData.summary && (
                <div className="bg-gray-700/50 backdrop-blur-sm rounded-xl p-6 border border-gray-600">
                  <h3 className="font-semibold text-white mb-3">AI Summary</h3>
                  <p className="text-gray-300 leading-relaxed">{analysisData.summary}</p>
                </div>
              )}
            </div>
          </div>
        );
      case 'skills':
        return (
          <div className="space-y-8">
            {/* Match Analysis Grid */}
            <div className="bg-gray-800/90 backdrop-blur-sm rounded-2xl border border-gray-700 p-8 shadow-lg">
              <h2 className="text-2xl font-bold text-white mb-8">Match Analysis</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <ProgressBar 
                  value={matchScores.skillsMatch} 
                  color={matchScores.skillsMatch >= 70 ? "bg-gradient-to-r from-green-500 to-green-400" : matchScores.skillsMatch >= 40 ? "bg-gradient-to-r from-yellow-500 to-yellow-400" : "bg-gradient-to-r from-red-500 to-red-400"} 
                  label="Skills Match" 
                />
                <ProgressBar 
                  value={matchScores.cultureMatch} 
                  color={matchScores.cultureMatch >= 70 ? "bg-gradient-to-r from-green-500 to-green-400" : matchScores.cultureMatch >= 40 ? "bg-gradient-to-r from-yellow-500 to-yellow-400" : "bg-gradient-to-r from-red-500 to-red-400"} 
                  label="Culture Match" 
                />
                <ProgressBar 
                  value={matchScores.keywordsMatch} 
                  color={matchScores.keywordsMatch >= 70 ? "bg-gradient-to-r from-green-500 to-green-400" : matchScores.keywordsMatch >= 40 ? "bg-gradient-to-r from-yellow-500 to-yellow-400" : "bg-gradient-to-r from-red-500 to-red-400"} 
                  label="Keywords Match" 
                />
                <ProgressBar 
                  value={matchScores.locationMatch} 
                  color="bg-gradient-to-r from-green-500 to-green-400" 
                  label="Location Match" 
                />
                <ProgressBar 
                  value={matchScores.educationMatch} 
                  color={matchScores.educationMatch >= 70 ? "bg-gradient-to-r from-green-500 to-green-400" : matchScores.educationMatch >= 40 ? "bg-gradient-to-r from-yellow-500 to-yellow-400" : "bg-gradient-to-r from-red-500 to-red-400"} 
                  label="Education Match" 
                />
                <ProgressBar 
                  value={matchScores.experienceMatch} 
                  color={matchScores.experienceMatch >= 70 ? "bg-gradient-to-r from-green-500 to-green-400" : matchScores.experienceMatch >= 40 ? "bg-gradient-to-r from-yellow-500 to-yellow-400" : "bg-gradient-to-r from-red-500 to-red-400"} 
                  label="Experience Match" 
                />
              </div>
            </div>
          </div>
        );
      case 'experience':
        return (
          <div className="space-y-8">
            {/* ATS Compatibility */}
            {analysisData.ats_compatibility && (
              <div className="bg-gray-800/90 backdrop-blur-sm rounded-2xl border border-gray-700 p-8 shadow-lg">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center mr-4 border border-green-500/30">
                    <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">ATS Compatibility</h2>
                    <p className="text-gray-300">Applicant Tracking System readiness</p>
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 rounded-xl p-6 border border-green-500/30 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-lg font-semibold text-white">ATS Score</span>
                    <span className="text-2xl font-bold text-green-400">{Math.round(analysisData.ats_compatibility.score || 0)}%</span>
                  </div>
                  <div className="w-full bg-green-900/50 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-green-500 to-emerald-400 h-3 rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${analysisData.ats_compatibility.score || 0}%` }}
                    />
                  </div>
                </div>

                <div className="bg-gray-700/50 rounded-xl p-6 border border-gray-600">
                  <h3 className="font-semibold text-white mb-3">Analysis</h3>
                  <p className="text-gray-300 leading-relaxed">
                    {(analysisData.ats_compatibility.score || 0) >= 80 ? 
                      'Your CV is well-formatted for ATS systems with clear sections and standard formatting.' :
                      (analysisData.ats_compatibility.score || 0) >= 60 ?
                      'Your CV has good ATS compatibility but could benefit from improved keyword optimization.' :
                      'Your CV may face challenges with ATS systems. Consider reformatting with standard sections and more relevant keywords.'
                    }
                  </p>
                </div>
              </div>
            )}
          </div>
        );
      case 'strategy':
        return (
          <div className="space-y-8">
            {/* Section Analysis */}
            <div className="bg-gray-800/90 backdrop-blur-sm rounded-2xl border border-gray-700 p-8 shadow-lg">
              <h2 className="text-2xl font-bold text-white mb-8">Section Analysis</h2>
              <div className="space-y-6">
                {analysisData.sections?.map((section, index) => (
                  <div key={index} className="bg-gray-700/50 rounded-xl p-6 hover:bg-gray-700/70 transition-colors duration-200 border border-gray-600">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`w-16 h-16 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg ${
                          section.score >= 80 ? 'bg-gradient-to-br from-green-500 to-emerald-600 shadow-green-500/25' :
                          section.score >= 60 ? 'bg-gradient-to-br from-yellow-500 to-orange-500 shadow-yellow-500/25' :
                          'bg-gradient-to-br from-red-500 to-pink-600 shadow-red-500/25'
                        }`}>
                          {section.score}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-white capitalize mb-2">
                            {section.section_name.replace('_', ' ')}
                          </h3>
                          <p className="text-gray-300 text-sm leading-relaxed">
                            {section.feedback?.substring(0, 120)}...
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-3">
                        <button
                          onClick={() => setActiveTab('chat')}
                          className="px-4 py-2 text-sm bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-purple-300 rounded-lg hover:from-purple-500/30 hover:to-blue-500/30 transition-colors border border-purple-500/30"
                        >
                          <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          Go to Chat
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      case 'competition':
  return (
          <div className="space-y-8">
            {/* Strengths and Quick Wins */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Your Strengths */}
              <div className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 backdrop-blur-sm rounded-2xl border border-green-500/30 p-8">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center mr-4 shadow-lg shadow-green-500/25">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-white">Your Strengths</h3>
                </div>
                <div className="space-y-4">
                  {analysisData.sections?.filter(section => section.score >= 70).slice(0, 3).map((section, index) => (
                    <div key={index} className="flex items-start">
                      <div className="w-2 h-2 bg-green-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      <p className="text-gray-300 leading-relaxed">
                        <span className="font-medium capitalize text-green-400">{section.section_name.replace('_', ' ')}</span> section performs well 
                        {section.suggestions && ` - ${section.suggestions.split('.')[0]}.`}
                      </p>
                    </div>
                  )) || (
                    <p className="text-gray-400 italic">Complete your CV analysis to see your strengths</p>
                  )}
                </div>
              </div>

              {/* Quick Wins */}
              <div className="bg-gradient-to-br from-blue-900/30 to-cyan-900/30 backdrop-blur-sm rounded-2xl border border-blue-500/30 p-8">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center mr-4 shadow-lg shadow-blue-500/25">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-white">Quick Wins</h3>
                </div>
                <div className="space-y-4">
                  {analysisData.sections?.filter(section => section.score < 70).slice(0, 3).map((section, index) => (
                    <div key={index} className="flex items-start">
                      <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      <p className="text-gray-300 leading-relaxed">
                        {section.feedback?.split('.')[0] || `Improve your ${section.section_name.replace('_', ' ')} section`}.
                      </p>
                    </div>
                  )) || (
                    <p className="text-gray-400 italic">Great job! No immediate improvements needed.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      case 'chat':
        return (
          <div className="space-y-8">
            {/* Global Chat Interface */}
            <div className="bg-gray-800/90 backdrop-blur-sm rounded-2xl border border-gray-700 shadow-lg overflow-hidden">
              <div className="p-6 border-b border-gray-700">
                <h2 className="text-2xl font-bold text-white mb-2">AI CV Enhancement Chat</h2>
                <p className="text-gray-300">Chat with AI to improve your entire CV. Changes will be reflected in real-time.</p>
              </div>
              
              {/* Chat Messages Area */}
              <div className="h-96 overflow-y-auto p-6 space-y-4">
                {globalChatMessages.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <h3 className="text-white font-medium mb-2">Start Your CV Enhancement</h3>
                    <p className="text-gray-400 text-sm mb-4">
                      Ask me anything about improving your CV. I can help with content, formatting, keywords, and more!
                    </p>
                    <div className="space-y-2 text-xs text-gray-500">
                      <p>💡 "How can I improve my work experience section?"</p>
                      <p>🎯 "What keywords should I add for tech roles?"</p>
                      <p>✨ "Make my summary more compelling"</p>
                    </div>
                  </div>
                ) : (
                  globalChatMessages.map((message, index) => (
                    <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.role === 'user' 
                          ? 'bg-purple-600 text-white' 
                          : 'bg-gray-700 text-gray-100'
                      }`}>
                        <p className="text-sm">{message.content}</p>
                      </div>
                    </div>
                  ))
                )}
                
                {isGlobalChatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-700 text-gray-100 max-w-xs lg:max-w-md px-4 py-2 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                        </div>
                        <span className="text-sm text-gray-400">AI is thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Chat Input */}
              <div className="p-6 border-t border-gray-700">
                <GlobalChatInput 
                  onSendMessage={handleGlobalChatMessage}
                  isLoading={isGlobalChatLoading}
                />
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 z-0 opacity-20">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
        <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
      </div>

      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.03)_1px,transparent_1px)] bg-[size:64px_64px] opacity-25 z-0"></div>

      <div className="relative z-10">
        {/* Modern Header */}
        <div className="bg-gray-800/80 backdrop-blur-sm border-b border-gray-700 shadow-lg">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">CV Analysis Results</h1>
                <p className="text-gray-300">Comprehensive analysis of your resume with actionable insights</p>
              </div>
              <button
                onClick={onDownloadPDF}
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition-all duration-200 shadow-lg hover:shadow-xl shadow-purple-500/25"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                Download Enhanced PDF
              </button>
          </div>
        </div>
      </div>

        <div className="max-w-7xl mx-auto p-6">
          {/* Tab Navigation */}
          <div className="flex flex-wrap gap-2 mb-8 bg-gray-800/50 backdrop-blur-sm p-2 rounded-xl border border-gray-700 shadow-lg">
            <TabButton 
              tabKey="overview"
              label="Overview" 
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
            />
            <TabButton 
              tabKey="skills"
              label="Match Analysis" 
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
            />
            <TabButton 
              tabKey="experience"
              label="ATS Compatibility" 
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            />
            <TabButton 
              tabKey="strategy"
              label="Section Analysis" 
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>}
            />
            <TabButton 
              tabKey="competition"
              label="Strengths & Quick Wins" 
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
            />
            <TabButton 
              tabKey="chat"
              label="AI Chat" 
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>}
            />
          </div>

                    {/* Dynamic Layout based on active tab */}
          {activeTab === 'chat' ? (
            /* Chat Tab - Split Layout with Chat and CV Canvas */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[600px]">
              {/* Left Side - Chat */}
              <div className="space-y-8">
                {renderTabContent()}
              </div>
              
              {/* Right Side - CV Canvas */}
              <div className="bg-gray-800/90 backdrop-blur-sm rounded-2xl border border-gray-700 shadow-lg">
                <div className="p-6 border-b border-gray-700">
                  <h3 className="text-lg font-semibold text-white mb-1">Live CV Preview</h3>
                  <p className="text-sm text-gray-400">See changes in real-time as you chat</p>
                </div>
                <div className="h-[calc(600px-80px)]">
                  <CVStructuredView
                    structuredContent={analysisData?.structured_content}
                    sections={analysisData?.sections}
                    updates={Object.fromEntries(
                      Array.from(sectionUpdates.entries()).map(([key, value]) => [
                        key, 
                        typeof value === 'string' ? value : value.content || ''
                      ])
                    )}
                    onSectionClick={(sectionName) => {
                      // Optional: Highlight section or provide feedback
                      console.log('Section clicked:', sectionName);
                    }}
                    highlightedSection={undefined}
                  />
                </div>
              </div>
            </div>
          ) : (
            /* Other Tabs - Standard Layout */
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              {/* Left Column - Analysis Content */}
              <div className="xl:col-span-2 space-y-8">
                {renderTabContent()}
              </div>

              {/* Right Column - CV Management */}
              <div className="xl:col-span-1">
                <div className="bg-gray-800/90 backdrop-blur-sm rounded-2xl border border-gray-700 min-h-[600px] sticky top-6 shadow-lg">
                  <div className="p-6 border-b border-gray-700">
                    <h3 className="text-lg font-semibold text-white mb-1">CV Management</h3>
                    <p className="text-sm text-gray-400">View, edit, and download your CV</p>
                  </div>
                  <div className="h-[calc(600px-80px)] p-4">
                    <div className="h-full bg-gray-700/30 rounded-xl border border-gray-600 flex flex-col">
                      {/* Enhanced CV Actions Panel */}
                      <div className="p-6 border-b border-gray-600">
                        <h3 className="text-lg font-semibold text-white mb-4">CV Actions</h3>
                        <div className="space-y-3">
                          {/* View Structured CV */}
                          <button
                            onClick={() => setActiveTab('chat')}
                            className="flex items-center justify-center w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            View Structured CV
                          </button>
                          
                          {/* Download Enhanced PDF */}
                          <button
                            onClick={onDownloadPDF}
                            className="flex items-center justify-center w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-colors"
                          >
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Download Enhanced PDF
                          </button>
                        </div>
                      </div>

                      {/* Section Updates Preview */}
                      {sectionUpdates.size > 0 && (
                        <div className="flex-1 p-6 overflow-y-auto">
                          <h4 className="text-md font-semibold text-white mb-4">Recent Updates</h4>
                          <div className="space-y-3">
                            {Array.from(sectionUpdates.entries()).map(([sectionName, content]) => {
                              // Handle different content types safely
                              let displayText = 'Section updated';
                              try {
                                const contentStr = typeof content === 'string' 
                                  ? content 
                                  : content && typeof content === 'object' && 'content' in content
                                    ? String((content as any).content || 'Updated')
                                    : String(content || 'Updated');
                                
                                displayText = contentStr.length > 100 ? contentStr.substring(0, 100) + '...' : contentStr;
                              } catch (e) {
                                displayText = 'Section updated';
                              }
                              
                              return (
                                <div key={sectionName} className="bg-gray-600/50 rounded-lg p-4 border border-gray-500">
                                  <h5 className="text-sm font-medium text-green-400 mb-2 capitalize">
                                    {sectionName.replace('_', ' ')} Updated
                                  </h5>
                                  <p className="text-gray-300 text-sm leading-relaxed">
                                    {displayText}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* AI Enhancement Suggestions */}
                      {sectionUpdates.size === 0 && (
                        <div className="flex-1 p-6 flex flex-col justify-center">
                          <div className="text-center">
                            <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                              <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                              </svg>
                            </div>
                            <h4 className="text-white font-medium mb-2">Try the AI Chat!</h4>
                            <p className="text-gray-400 text-sm mb-4">
                              Go to the Chat tab to start improving your CV with AI assistance.
                            </p>
                            <button
                              onClick={() => setActiveTab('chat')}
                              className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 transition-colors"
                            >
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                              </svg>
                              Start Chat
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
      </div>

        {/* Error Display */}
        {error && (
          <div className="fixed bottom-6 right-6 max-w-md bg-red-900/80 backdrop-blur-sm border border-red-500/50 rounded-xl p-4 shadow-lg">
            <div className="flex items-start">
              <svg className="h-5 w-5 text-red-400 mr-3 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-red-300">Error</h3>
                <p className="mt-1 text-sm text-red-200 break-words">{error}</p>
              </div>
              <button
                onClick={clearError}
                className="ml-3 text-red-400 hover:text-red-300 flex-shrink-0"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        
      </div>
    </div>
  );
};