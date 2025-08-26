import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AnalysisResultsProps } from '../types';
import { useSectionEdit } from '../hooks/useSectionEdit';

import { useSession } from '../contexts/SessionContext';



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
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'overview' | 'skills' | 'experience' | 'strategy'>('overview');

  
  
    
  const {
    analysisData,
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





  // Check if this is the new comprehensive schema
  const isComprehensiveSchema = 'detailed_checks' in analysisData;
  
  // Get overall score from either schema
  const getOverallScore = () => {
    if (isComprehensiveSchema) {
      return (analysisData as any).overall_summary?.overall_score || 0;
    }
    return analysisData.overall_score || 0;
  };

  // Calculate match scores from real analysis data
  const calculateMatchScores = () => {
    if (isComprehensiveSchema) {
      const checks = (analysisData as any).detailed_checks || {};
      return {
        skillsMatch: checks.skills_section?.score || 0,
        cultureMatch: checks.professional_summary?.score || 0,
        keywordsMatch: checks.keyword_optimization?.score || 0,
        locationMatch: checks.contact_info?.score || 0,
        educationMatch: checks.education?.score || 0,
        experienceMatch: checks.work_experience?.score || 0
      };
    }
    
    // Legacy calculation for old schema
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
                  {Math.round(getOverallScore())}
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Overall CV Score</h2>
                <p className="text-gray-300">
                  {getOverallScore() >= 80 ? 'Excellent CV! 🎉' : 
                   getOverallScore() >= 60 ? 'Good CV with room for improvement 👍' : 
                   'Your CV needs significant improvements 📝'}
                </p>
              </div>
              
              {/* Show analysis summary or strengths/next steps for new schema */}
              {isComprehensiveSchema ? (
                <div className="space-y-6">
                  {/* Strengths */}
                  {(analysisData as any).strengths?.length > 0 && (
                    <div className="bg-green-900/20 backdrop-blur-sm rounded-xl p-6 border border-green-700">
                      <h3 className="font-semibold text-green-400 mb-3 flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Strengths
                      </h3>
                      <ul className="text-green-300 space-y-2">
                        {(analysisData as any).strengths.map((strength: string, index: number) => (
                          <li key={index} className="flex items-start">
                            <span className="text-green-500 mr-2">•</span>
                            {strength}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {/* Next Steps */}
                  {(analysisData as any).next_steps?.length > 0 && (
                    <div className="bg-blue-900/20 backdrop-blur-sm rounded-xl p-6 border border-blue-700">
                      <h3 className="font-semibold text-blue-400 mb-3 flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5-5 5M6 17l5-5-5-5" />
                        </svg>
                        Next Steps
                      </h3>
                      <ul className="text-blue-300 space-y-2">
                        {(analysisData as any).next_steps.map((step: string, index: number) => (
                          <li key={index} className="flex items-start">
                            <span className="text-blue-500 mr-2">•</span>
                            {step}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                analysisData.summary && (
                  <div className="bg-gray-700/50 backdrop-blur-sm rounded-xl p-6 border border-gray-600">
                    <h3 className="font-semibold text-white mb-3">AI Summary</h3>
                    <p className="text-gray-300 leading-relaxed">{analysisData.summary}</p>
                  </div>
                )
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
            {(() => {
              const atsData = isComprehensiveSchema 
                ? (analysisData as any).detailed_checks?.ats_compatibility
                : analysisData.ats_compatibility;
              
              if (!atsData) return null;
              
              return (
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
                      <span className="text-2xl font-bold text-green-400">{Math.round(atsData.score || 0)}%</span>
                    </div>
                    <div className="w-full bg-green-900/50 rounded-full h-3">
                      <div 
                        className="bg-gradient-to-r from-green-500 to-emerald-400 h-3 rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${atsData.score || 0}%` }}
                      />
                    </div>
                  </div>

                  <div className="bg-gray-700/50 rounded-xl p-6 border border-gray-600">
                    <h3 className="font-semibold text-white mb-3">Analysis</h3>
                    <p className="text-gray-300 leading-relaxed">
                      {isComprehensiveSchema ? atsData.message : (
                        (atsData.score || 0) >= 80 ? 
                          'Your CV is well-formatted for ATS systems with clear sections and standard formatting.' :
                          (atsData.score || 0) >= 60 ?
                          'Your CV has good ATS compatibility but could benefit from improved keyword optimization.' :
                          'Your CV may face challenges with ATS systems. Consider reformatting with standard sections and more relevant keywords.'
                      )}
                    </p>
                    
                    {/* Show suggestions for new schema */}
                    {isComprehensiveSchema && atsData.suggestions?.length > 0 && (
                      <div className="mt-4">
                        <h4 className="font-medium text-white mb-2">Suggestions:</h4>
                        <ul className="text-gray-300 space-y-1">
                          {atsData.suggestions.map((suggestion: string, index: number) => (
                            <li key={index} className="flex items-start">
                              <span className="text-green-500 mr-2">•</span>
                              {suggestion}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        );
      case 'strategy':
        return (
          <div className="space-y-8">
            {/* Section Analysis */}
            <div className="bg-gray-800/90 backdrop-blur-sm rounded-2xl border border-gray-700 p-8 shadow-lg">
              <h2 className="text-2xl font-bold text-white mb-8">
                {isComprehensiveSchema ? 'Detailed Analysis' : 'Section Analysis'}
              </h2>
              <div className="space-y-6">
                {isComprehensiveSchema ? (
                  // New comprehensive schema detailed checks
                  Object.entries((analysisData as any).detailed_checks || {}).map(([checkName, checkData]: [string, any]) => (
                    <div key={checkName} className="bg-gray-700/50 rounded-xl p-6 hover:bg-gray-700/70 transition-colors duration-200 border border-gray-600">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className={`w-16 h-16 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg ${
                            checkData.score >= 80 ? 'bg-gradient-to-br from-green-500 to-emerald-600 shadow-green-500/25' :
                            checkData.score >= 60 ? 'bg-gradient-to-br from-yellow-500 to-orange-500 shadow-yellow-500/25' :
                            'bg-gradient-to-br from-red-500 to-pink-600 shadow-red-500/25'
                          }`}>
                            {checkData.score}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h3 className="text-lg font-semibold text-white capitalize">
                                {checkName.replace('_', ' ')}
                              </h3>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                checkData.status === 'pass' ? 'bg-green-500/20 text-green-300 border border-green-500/30' :
                                checkData.status === 'warning' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' :
                                'bg-red-500/20 text-red-300 border border-red-500/30'
                              }`}>
                                {checkData.status}
                              </span>
                            </div>
                            <p className="text-gray-300 text-sm leading-relaxed mb-3">
                              {checkData.message}
                            </p>
                            {checkData.suggestions?.length > 0 && (
                              <div className="space-y-1">
                                <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wide">Suggestions:</h4>
                                <ul className="text-xs text-gray-400">
                                  {checkData.suggestions.slice(0, 2).map((suggestion: string, index: number) => (
                                    <li key={index} className="flex items-start">
                                      <span className="text-blue-400 mr-1">•</span>
                                      {suggestion}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                        {/* <div className="flex space-x-3">
                          <button
                            onClick={() => navigate('/chat')}
                            className="group px-4 py-2 text-sm bg-gradient-to-r from-emerald-500/20 to-purple-500/20 text-emerald-300 rounded-lg hover:from-emerald-500/30 hover:to-purple-500/30 transition-all duration-300 border border-emerald-500/30 transform hover:scale-105"
                          >
                            <svg className="w-4 h-4 mr-2 inline transform group-hover:rotate-12 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            ✨ Enhance CV
                          </button>
                        </div> */}
                      </div>
                    </div>
                  ))
                ) : (
                  // Legacy schema sections
                  analysisData.sections?.map((section, index) => (
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
                            onClick={() => navigate('/chat')}
                            className="group px-4 py-2 text-sm bg-gradient-to-r from-emerald-500/20 to-purple-500/20 text-emerald-300 rounded-lg hover:from-emerald-500/30 hover:to-purple-500/30 transition-all duration-300 border border-emerald-500/30 transform hover:scale-105"
                          >
                            <svg className="w-4 h-4 mr-2 inline transform group-hover:rotate-12 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            ✨ Enhance CV
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
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
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigate('/chat')}
                  className="group relative px-8 py-4 bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-600 text-white rounded-xl hover:from-emerald-600 hover:via-blue-600 hover:to-purple-700 focus:outline-none focus:ring-4 focus:ring-purple-500/50 transition-all duration-300 flex items-center space-x-3 transform hover:scale-105 hover:shadow-2xl animate-pulse-glow"
                >
                  <div className="relative">
                    <svg className="w-6 h-6 transform group-hover:rotate-12 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-ping"></div>
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="font-bold text-lg">✨ Enhance My CV</span>
                    <span className="text-sm opacity-90">AI-powered improvements</span>
                  </div>
                  <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </button>
              </div>
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
          </div>

                    {/* Standard Layout for all tabs */}
            <div className="w-full">
              {renderTabContent()}
            </div>

        </div>
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
  );
};