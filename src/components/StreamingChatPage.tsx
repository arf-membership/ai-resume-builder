import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CVStructuredView } from './CVStructuredView';
import { ScoreTimeline } from './ScoreTimeline';
import { useCVStore } from '../store';
import { useSession } from '../contexts/SessionContext';
import { useSectionEdit } from '../hooks/useSectionEdit';
import { useNotifications } from '../store/notificationStore';
import { useStreamingChat } from '../hooks/useStreamingChat';
import { generateChatSuggestions, type ChatSuggestion } from '../utils/chatSuggestions';


export const StreamingChatPage: React.FC = () => {
  const navigate = useNavigate();
  const { sessionId } = useSession();
  const { showSuccess } = useNotifications();
  
  // Get CV data from store
  const analysisResult = useCVStore(state => state.analysisResult);
  const currentResume = useCVStore(state => state.currentResume);
  
  // Generate suggestions from analysis data
  const suggestions = analysisResult ? generateChatSuggestions(analysisResult as any) : [];
  const hasProblematicIssues = suggestions.length > 0;
  
  // Track used suggestions per message to show remaining ones
  const [usedSuggestions, setUsedSuggestions] = useState<Set<string>>(new Set());
  const [suggestionsByMessage, setSuggestionsByMessage] = useState<{[messageIndex: number]: ChatSuggestion[]}>({});
  
  // Initialize suggestions for the first message
  React.useEffect(() => {
    if (hasProblematicIssues && suggestions.length > 0 && !suggestionsByMessage[0]) {
      setSuggestionsByMessage(prev => ({
        ...prev,
        0: suggestions.slice(0, 4)
      }));
    }
  }, [hasProblematicIssues, suggestions.length]); // Use suggestions.length instead of suggestions array


  // Use streaming chat hook
  const { messages, isStreaming, sendMessage } = useStreamingChat();
  
  // Override the first message content if we have problematic issues
  const displayMessages = useMemo(() => {
    if (messages.length > 0 && hasProblematicIssues) {
      const firstMessage = messages[0];
      if (firstMessage.role === 'assistant') {
        return [
          {
            ...firstMessage,
            content: `Hi! I've analyzed your CV and found ${suggestions.length} areas that need improvement. Here are my top recommendations to enhance your CV:`
          },
          ...messages.slice(1)
        ];
      }
    }
    return messages;
  }, [messages, hasProblematicIssues, suggestions.length]);
  
  
  
  // Local state for input and CV update status
  const [inputMessage, setInputMessage] = useState('');
  const [isUpdatingCV, setIsUpdatingCV] = useState(false);
  const [isScoreUpdated, setIsScoreUpdated] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const cvPreviewRef = useRef<HTMLDivElement>(null);

  // Helper function to create simple HTML from store data
  const createSimpleHTMLFromStore = (cvHeader: any, originalSections: any[]) => {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Enhanced CV</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
            line-height: 1.6;
            color: #333;
            background: white;
          }
          .header {
            background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
            color: white;
            padding: 30px;
            text-align: center;
            margin-bottom: 30px;
            border-radius: 8px;
          }
          .header h1 {
            font-size: 28px;
            margin-bottom: 8px;
          }
          .header h2 {
            font-size: 16px;
            margin-bottom: 15px;
            opacity: 0.9;
          }
          .contact-info {
            font-size: 12px;
            margin-top: 15px;
          }
          .section {
            margin-bottom: 25px;
          }
          .section h3 {
            font-size: 18px;
            font-weight: bold;
            color: #1f2937;
            margin-bottom: 15px;
            padding-bottom: 8px;
            border-bottom: 2px solid #3b82f6;
            text-transform: uppercase;
          }
          .content {
            font-size: 12px;
            line-height: 1.6;
            white-space: pre-wrap;
          }
        </style>
      </head>
      <body>
        ${cvHeader ? `
          <div class="header">
            <h1>${cvHeader.name || 'CV Candidate'}</h1>
            <h2>${cvHeader.title || 'Professional Title'}</h2>
            <div class="contact-info">
              ${cvHeader.email ? `📧 ${cvHeader.email}` : ''}
              ${cvHeader.phone ? ` • 📞 ${cvHeader.phone}` : ''}
              ${cvHeader.location ? ` • 📍 ${cvHeader.location}` : ''}
              ${cvHeader.linkedin ? ` • 💼 LinkedIn` : ''}
              ${cvHeader.github ? ` • 💻 GitHub` : ''}
            </div>
          </div>
        ` : ''}
        
        ${originalSections ? originalSections
          .filter(section => section.section_name.toLowerCase() !== 'header')
          .sort((a, b) => a.order - b.order)
          .map(section => `
            <div class="section">
              <h3>${section.section_name}</h3>
              <div class="content">${section.content}</div>
            </div>
          `).join('') : ''}
      </body>
      </html>
    `;
  };
  
  // Monitor for CV updates by watching the store
  const lastUpdated = useRef<number>(Date.now());
  const analysisResultSnapshot = useCVStore(state => state.analysisResult);
  const scoreHistory = useCVStore(state => state.scoreHistory);
  
  useEffect(() => {
    if (analysisResultSnapshot) {
      const now = Date.now();
      if (now - lastUpdated.current < 2000) { // If updated within last 2 seconds
        setIsUpdatingCV(true);
        const timer = setTimeout(() => setIsUpdatingCV(false), 1500);
        return () => clearTimeout(timer);
      }
      lastUpdated.current = now;
    }
  }, [analysisResultSnapshot]);

  // Monitor for score updates
  useEffect(() => {
    if (scoreHistory.length > 1) { // Only highlight if there are actual updates (not initial)
      setIsScoreUpdated(true);
      const timer = setTimeout(() => setIsScoreUpdated(false), 3000); // Highlight for 3 seconds
      return () => clearTimeout(timer);
    }
  }, [scoreHistory.length]);
  
  const { sectionUpdates } = useSectionEdit({
    resumeId: currentResume?.id || '',
    sessionId: sessionId || undefined,
    initialAnalysisData: analysisResult || {} as any,
    onSectionEdit: () => {},
    onError: (error) => {
      console.error('Section editing error:', error);
    }
  });

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Redirect if no analysis data
  useEffect(() => {
    if (!analysisResult || !currentResume) {
      console.warn('No analysis result or resume found, redirecting to home');
      navigate('/', { replace: true });
    }
  }, [analysisResult, currentResume, navigate]);

  const handleSendMessage = () => {
    if (!inputMessage.trim() || isStreaming) return;
    sendMessage(inputMessage.trim());
    setInputMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleDownloadPDF = async () => {
    if (!currentResume || !cvPreviewRef.current) {
      console.error('Missing current resume or CV preview ref');
      return;
    }

    try {
      setIsGeneratingPDF(true);
      
      // Get the HTML content from the CV preview
      const htmlContent = cvPreviewRef.current.innerHTML;
      console.log('📄 HTML Content Length:', htmlContent.length);
      console.log('📄 HTML Content Preview:', htmlContent.substring(0, 500));
      
      // Check if HTML content is valid, if not create from store data
      if (!htmlContent || htmlContent.length < 100) {
        console.log('⚠️ HTML content is short, creating from store data');
        
        // Get CV data from store
        const { cvHeader, originalSections } = useCVStore.getState();
        
        if (!cvHeader && (!originalSections || originalSections.length === 0)) {
          throw new Error('No CV content available for PDF generation');
        }
        
        // Create simple HTML from store data
        const simpleHtml = createSimpleHTMLFromStore(cvHeader, originalSections);
        
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-pdf`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'x-session-id': sessionId || '',
          },
          body: JSON.stringify({
            resumeId: currentResume.id,
            htmlContent: simpleHtml
          })
        });

        if (!response.ok) {
          throw new Error(`PDF generation failed: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.success && data.data.signedUrl) {
          // Download the PDF
          const pdfResponse = await fetch(data.data.signedUrl);
          const pdfBlob = await pdfResponse.blob();
          
          const blobUrl = URL.createObjectURL(pdfBlob);
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = `enhanced_cv_${new Date().toISOString().split('T')[0]}.pdf`;
          link.style.display = 'none';
          
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          URL.revokeObjectURL(blobUrl);
          console.log('✅ PDF downloaded successfully using store data');
          return;
        } else {
          throw new Error(data.message || 'PDF generation failed');
        }
      }

      // Extract text content from HTML for debugging
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlContent;
      const textContent = tempDiv.textContent || tempDiv.innerText || '';
      console.log('📄 Text Content Preview:', textContent.substring(0, 200));

      // Get CV data from the analysis result (same as what's displayed)
      const { analysisResult } = useCVStore.getState();
      const cvHeader = (analysisResult as any)?.cv_header;
      const originalSections = (analysisResult as any)?.original_cv_sections || [];
      
      console.log('📊 Store data check:', {
        hasHeader: !!cvHeader,
        headerData: cvHeader,
        sectionsCount: originalSections?.length || 0,
        sectionsData: originalSections?.slice(0, 2) // Show first 2 sections for debugging
      });
      
      // If no store data, extract from HTML content
      if (!cvHeader && (!originalSections || originalSections.length === 0)) {
        console.log('⚠️ No store data found, extracting from HTML content');
        
        if (!htmlContent || htmlContent.length < 100) {
          throw new Error('No CV content available for PDF generation - both store and HTML are empty');
        }
        
        // Extract text content and create a simple PDF
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;
        const extractedText = tempDiv.textContent || tempDiv.innerText || '';
        
        if (extractedText.length < 50) {
          throw new Error('CV content is too short for PDF generation');
        }
        
        // Create simple HTML from extracted content
        const simpleHtmlContent = `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Enhanced CV - ${new Date().toISOString().split('T')[0]}</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                font-size: 12px;
                line-height: 1.6;
                color: #333;
                background: white;
                margin: 20px;
                max-width: 800px;
              }
              h1, h2, h3 {
                color: #1f2937;
                margin-bottom: 10px;
              }
              h1 { font-size: 24px; text-align: center; }
              h2 { font-size: 18px; border-bottom: 2px solid #3b82f6; padding-bottom: 5px; }
              h3 { font-size: 14px; }
              p, div { margin-bottom: 8px; }
            </style>
          </head>
          <body>
            ${htmlContent}
          </body>
          </html>
        `;
        
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-pdf`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'x-session-id': sessionId || '',
          },
          body: JSON.stringify({
            resumeId: currentResume.id,
            htmlContent: simpleHtmlContent
          })
        });

        if (!response.ok) {
          throw new Error(`PDF generation failed: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.success && data.data.signedUrl) {
          // Download the PDF
          const pdfResponse = await fetch(data.data.signedUrl);
          const pdfBlob = await pdfResponse.blob();
          
          const blobUrl = URL.createObjectURL(pdfBlob);
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = `enhanced_cv_${new Date().toISOString().split('T')[0]}.pdf`;
          link.style.display = 'none';
          
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          URL.revokeObjectURL(blobUrl);
          console.log('✅ PDF downloaded successfully using HTML content');
          return;
        } else {
          throw new Error(data.message || 'PDF generation failed');
        }
      }

      // Create clean, simple HTML structure
      const styledHtmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Enhanced CV - ${new Date().toISOString().split('T')[0]}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
              font-size: 12px;
              line-height: 1.6;
              color: #333;
              background: white;
              margin: 0;
              padding: 20px;
              max-width: 800px;
            }
            
            .cv-header {
              background: white !important;
              color: #1f2937 !important;
              padding: 20px 30px 15px 30px;
              text-align: center;
              margin-bottom: 20px;
              border-bottom: 1px solid #e5e7eb;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            
            .cv-header h1 {
              font-size: 32px;
              font-weight: 700;
              margin: 0 0 8px 0;
              letter-spacing: -0.5px;
              color: #1f2937 !important;
            }
            
            .cv-header h2 {
              font-size: 18px;
              font-weight: 400;
              margin: 0 0 12px 0;
              color: #6b7280 !important;
            }
            
            .contact-info {
              display: flex;
              flex-wrap: wrap;
              justify-content: center;
              gap: 12px;
              font-size: 11px;
            }
            
            .contact-item {
              background: transparent !important;
              color: #4b5563 !important;
              padding: 4px 8px;
              border: none !important;
              font-size: 11px;
              display: inline-flex;
              align-items: center;
              gap: 4px;
            }
            
            .section {
              margin-bottom: 30px;
              page-break-inside: avoid;
            }
            
            .section h3 {
              font-size: 18px;
              font-weight: 600;
              color: #1f2937;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin: 0 0 15px 0;
              padding-bottom: 8px;
              border-bottom: 2px solid #3b82f6;
            }
            
            .section-content {
              font-size: 12px;
              line-height: 1.6;
              white-space: pre-wrap;
              word-wrap: break-word;
            }
            
            .experience-item {
              margin-bottom: 25px;
              padding-left: 20px;
              border-left: 3px solid #dbeafe;
              position: relative;
            }
            
            .experience-item:before {
              content: '';
              position: absolute;
              left: -6px;
              top: 5px;
              width: 9px;
              height: 9px;
              background: #3b82f6;
              border-radius: 50%;
            }
            
            .job-title {
              font-size: 15px;
              font-weight: 600;
              color: #1f2937;
              margin-bottom: 4px;
            }
            
            .company {
              font-size: 13px;
              color: #3b82f6;
              font-weight: 500;
              margin-bottom: 4px;
            }
            
            .duration {
              font-size: 11px;
              color: #6b7280;
              margin-bottom: 10px;
            }
            
            .skills-section {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
              gap: 20px;
            }
            
            .skill-category {
              background: #f8fafc;
              padding: 15px;
              border-radius: 8px;
              border: 1px solid #e5e7eb;
            }
            
            .skill-category h4 {
              font-size: 12px;
              font-weight: 600;
              color: #1f2937;
              margin: 0 0 10px 0;
              padding-bottom: 5px;
              border-bottom: 1px solid #3b82f6;
            }
            
            .skill-list {
              font-size: 11px;
              line-height: 1.4;
            }
            
            @page {
              margin: 0.75in;
              size: A4;
            }
            
            /* Force colors in PDF */
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            
            .cv-header * {
              color: inherit !important;
            }
            
            .contact-item * {
              color: #4b5563 !important;
            }
            
            @media print {
              body {
                font-size: 11px;
              }
              .cv-header {
                background: white !important;
                color: #1f2937 !important;
              }
              .cv-header h1 {
                font-size: 28px;
                color: #1f2937 !important;
              }
              .cv-header h2 {
                font-size: 16px;
                color: #6b7280 !important;
              }
              .contact-item {
                background: transparent !important;
                color: #4b5563 !important;
                border: none !important;
              }
            }
          </style>
        </head>
        <body>
          ${cvHeader ? `
            <div class="cv-header">
              <h1>${cvHeader.name || 'Professional CV'}</h1>
              <h2>${cvHeader.title || 'Software Developer'}</h2>
              <div class="contact-info">
                ${cvHeader.email ? `<div class="contact-item">📧 ${cvHeader.email}</div>` : ''}
                ${cvHeader.phone ? `<div class="contact-item">📞 ${cvHeader.phone}</div>` : ''}
                ${cvHeader.location ? `<div class="contact-item">📍 ${cvHeader.location}</div>` : ''}
                ${cvHeader.linkedin ? `<div class="contact-item">💼 LinkedIn</div>` : ''}
                ${cvHeader.github ? `<div class="contact-item">💻 GitHub</div>` : ''}
              </div>
            </div>
          ` : ''}
          
          ${originalSections ? originalSections
            .filter(section => section.section_name.toLowerCase() !== 'header')
            .sort((a, b) => a.order - b.order)
            .map(section => `
              <div class="section">
                <h3>${section.section_name}</h3>
                <div class="section-content">${section.content}</div>
              </div>
            `).join('') : ''}
        </body>
        </html>
      `;

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'x-session-id': sessionId || '',
        },
        body: JSON.stringify({
          resumeId: currentResume.id,
          htmlContent: styledHtmlContent
        })
      });

      if (!response.ok) {
        throw new Error(`PDF generation failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.data.signedUrl) {
        // Fetch the PDF and force download without opening in new tab
        try {
          const pdfResponse = await fetch(data.data.signedUrl);
          const pdfBlob = await pdfResponse.blob();
          
          // Create blob URL and download link
          const blobUrl = URL.createObjectURL(pdfBlob);
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = `enhanced_cv_${new Date().toISOString().split('T')[0]}.pdf`;
          link.style.display = 'none';
          
          // Add to DOM, trigger download, and cleanup
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          // Clean up blob URL
          URL.revokeObjectURL(blobUrl);
          
          console.log('✅ PDF downloaded successfully');
        } catch (downloadError) {
          console.error('❌ Download failed, trying direct link:', downloadError);
          // Fallback to direct link if blob approach fails
          window.location.href = data.data.signedUrl;
        }
      } else {
        throw new Error(data.message || 'PDF generation failed');
      }

    } catch (error) {
      console.error('❌ PDF download error:', error);
      alert(`Failed to download PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGeneratingPDF(false);
    }
  };



  return (
    <div className="flex h-screen bg-slate-900 text-white">
      {/* Left Side - Score Timeline */}
      <div className={`w-1/5 bg-slate-800 border-r border-slate-700 flex flex-col transition-all duration-500 ${
        isScoreUpdated ? 'ring-2 ring-green-400 ring-opacity-75 shadow-lg shadow-green-400/20' : ''
      }`}>
        <div className={`p-4 border-b border-slate-700 flex-shrink-0 transition-all duration-500 ${
          isScoreUpdated ? 'bg-green-900/20 border-green-500/30' : ''
        }`}>
          <h2 className={`text-lg font-semibold transition-colors duration-500 ${
            isScoreUpdated ? 'text-green-300' : 'text-white'
          }`}>
            Score Progress {isScoreUpdated && <span className="ml-2 text-green-400">✨</span>}
          </h2>
          <p className="text-sm text-gray-400">Track your CV improvements</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          <ScoreTimeline />
        </div>
      </div>

      {/* Middle - Chat Interface */}
      <div className="w-2/5 flex flex-col">
        {/* Header */}
        <div className="p-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">✨ AI CV Enhancement</h1>
            <p className="text-sm text-gray-400">Get personalized CV improvements with AI assistance</p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors text-sm"
            >
              ← Back to Analysis
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {displayMessages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] p-3 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-gray-100'
                }`}
              >
                <div className="text-sm font-medium mb-1">
                  {message.role === 'user' ? 'You' : 'AI Assistant'}
                </div>
                <div className="whitespace-pre-wrap">{message.content}</div>
                
                {/* Show suggestions for first AI message if there are problematic issues */}
                {message.role === 'assistant' && index === 0 && hasProblematicIssues && suggestionsByMessage[0] && (
                  <div className="mt-3 space-y-2">
                    <div className="text-sm text-gray-400 mb-2">Click a suggestion to get started:</div>
                    {suggestionsByMessage[0].map((suggestion: ChatSuggestion, suggestionIndex: number) => (
                      <button
                        key={suggestionIndex}
                        onClick={() => {
                          sendMessage(suggestion.text);
                          setUsedSuggestions(prev => new Set([...prev, suggestion.text]));
                          // Store remaining suggestions for next AI message (after user + AI response)
                          const nextAIMessageIndex = displayMessages.length + 1; // +1 for user message, +1 for AI response
                          const remaining = suggestionsByMessage[0].filter(s => s.text !== suggestion.text);
                          setSuggestionsByMessage(prev => ({
                            ...prev,
                            [nextAIMessageIndex]: remaining.slice(0, 3)
                          }));
                        }}
                        disabled={isStreaming}
                        className={`w-full text-left p-3 rounded-lg border transition-all hover:scale-[1.02] disabled:opacity-50 ${
                          suggestion.priority === 'high'
                            ? 'bg-red-900/20 border-red-500/30 text-red-300 hover:bg-red-900/30'
                            : suggestion.priority === 'medium'
                              ? 'bg-yellow-900/20 border-yellow-500/30 text-yellow-300 hover:bg-yellow-900/30'
                              : 'bg-blue-900/20 border-blue-500/30 text-blue-300 hover:bg-blue-900/30'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-sm">{suggestion.section}</div>
                            <div className="text-xs opacity-75 mt-1">{suggestion.text}</div>
                          </div>
                          <div className="flex items-center space-x-2 ml-3">
                            <div className="text-xs">
                              <span className="opacity-75">Score: </span>
                              <span className="font-medium">{suggestion.currentScore}/100</span>
                            </div>
                            {suggestion.priority === 'high' && (
                              <span className="text-red-400">🔥</span>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                
                {/* Show remaining suggestions for AI responses after user interactions */}
                {message.role === 'assistant' && index > 0 && suggestionsByMessage[index] && suggestionsByMessage[index].length > 0 && (
                  <div className="mt-3 space-y-2">
                    <div className="text-sm text-gray-400 mb-2">More suggestions to improve your CV:</div>
                    {suggestionsByMessage[index].map((suggestion: ChatSuggestion, suggestionIndex: number) => (
                      <button
                        key={suggestionIndex}
                        onClick={() => {
                          sendMessage(suggestion.text);
                          setUsedSuggestions(prev => new Set([...prev, suggestion.text]));
                          // Store remaining suggestions for next AI message (after user + AI response)
                          const nextAIMessageIndex = displayMessages.length + 1; // +1 for user message, +1 for AI response
                          const currentRemaining = suggestionsByMessage[index].filter(s => s.text !== suggestion.text);
                          setSuggestionsByMessage(prev => ({
                            ...prev,
                            [nextAIMessageIndex]: currentRemaining.slice(0, 3)
                          }));
                        }}
                        disabled={isStreaming}
                        className={`w-full text-left p-3 rounded-lg border transition-all hover:scale-[1.02] disabled:opacity-50 ${
                          suggestion.priority === 'high'
                            ? 'bg-red-900/20 border-red-500/30 text-red-300 hover:bg-red-900/30'
                            : suggestion.priority === 'medium'
                              ? 'bg-yellow-900/20 border-yellow-500/30 text-yellow-300 hover:bg-yellow-900/30'
                              : 'bg-blue-900/20 border-blue-500/30 text-blue-300 hover:bg-blue-900/30'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-sm">{suggestion.section}</div>
                            <div className="text-xs opacity-75 mt-1">{suggestion.text}</div>
                          </div>
                          <div className="flex items-center space-x-2 ml-3">
                            <div className="text-xs">
                              <span className="opacity-75">Score: </span>
                              <span className="font-medium">{suggestion.currentScore}/100</span>
                            </div>
                            {suggestion.priority === 'high' && (
                              <span className="text-red-400">🔥</span>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                
                {isStreaming && index === messages.length - 1 && message.role === 'assistant' && (
                  <div className="mt-2 flex items-center text-xs text-gray-400">
                    <div className="animate-pulse mr-2">●</div>
                    Processing...
                  </div>
                )}
              </div>
            </div>
          ))}
          

          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-slate-800 border-t border-slate-700">
          <div className="relative">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me to improve your CV... (Press Enter to send)"
              className="w-full p-4 pr-16 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
              rows={2}
              disabled={isStreaming}
            />
            {isStreaming && (
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full"></div>
              </div>
            )}
          </div>
          
          {/* Quick Suggestions - only show if no AI message suggestions are present */}
          {!hasProblematicIssues && (
            <div className="mt-3 space-y-2">
              <div className="text-xs text-gray-400 font-medium">
                💡 Quick suggestions:
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  "Make my professional summary more impactful",
                  "Improve my work experience descriptions",
                  "Optimize my skills section",
                  "Enhance my CV formatting"
                ].map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      sendMessage(suggestion);
                    }}
                    disabled={isStreaming}
                    className="px-3 py-2 text-xs bg-slate-700 hover:bg-slate-600 text-gray-300 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Side - Live CV Preview */}
      <div className="w-2/5 bg-gray-100">
        <div className="p-4 bg-slate-800 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white flex items-center">
                <div className={`w-3 h-3 rounded-full mr-2 ${
                  isUpdatingCV 
                    ? 'bg-orange-500 animate-bounce' 
                    : isStreaming 
                      ? 'bg-purple-500 animate-pulse' 
                      : 'bg-green-500 animate-pulse'
                }`}></div>
                {isUpdatingCV ? 'Updating CV...' : isStreaming ? 'AI Processing...' : 'Live CV Preview'}
              </h2>
              <p className="text-sm text-gray-400">
                {isUpdatingCV 
                  ? 'CV sections are being updated!' 
                  : 'Watch your CV improve as you chat with AI'
                }
              </p>
            </div>
            
            {/* Download PDF Button */}
            <button
              onClick={handleDownloadPDF}
              disabled={isGeneratingPDF || !currentResume}
              className="group relative px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center space-x-2 shadow-lg hover:shadow-green-500/25 transform hover:scale-105 disabled:hover:scale-100"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-400 rounded-lg opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
              {isGeneratingPDF ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                  <span className="text-sm font-medium">Generating...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-sm font-medium">Download PDF</span>
                </>
              )}
            </button>
          </div>
        </div>
        <div className="h-[calc(100%-120px)] overflow-hidden">
          <div ref={cvPreviewRef} className="h-full overflow-y-auto">
            <CVStructuredView
              structuredContent={analysisResult?.structured_content}
              sections={analysisResult?.sections}
              originalSections={(analysisResult as any)?.original_cv_sections || []}
              cvHeader={(analysisResult as any)?.cv_header}
              updates={{}} // We'll handle updates through direct store changes for now
            />
          </div>
        </div>
      </div>
    </div>
  );
};
