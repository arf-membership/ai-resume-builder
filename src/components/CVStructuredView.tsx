import React from 'react';
import type { StructuredContent, CVSection, OriginalCVSection, CVHeader } from '../types/cv';

interface CVStructuredViewProps {
  structuredContent?: StructuredContent;
  sections?: CVSection[];
  originalSections?: OriginalCVSection[];
  cvHeader?: CVHeader;
  updates?: Record<string, string>;
}

export const CVStructuredView: React.FC<CVStructuredViewProps> = ({
  structuredContent,
  sections = [],
  originalSections = [],
  cvHeader,
  updates = {},
}) => {
  const [recentlyUpdatedSections, setRecentlyUpdatedSections] = React.useState<Set<string>>(new Set());
  const [previousSections, setPreviousSections] = React.useState<OriginalCVSection[]>([]);
  const [previousHeader, setPreviousHeader] = React.useState<CVHeader | undefined>(undefined);
  const [isUpdating, setIsUpdating] = React.useState(false);

  // Listen for CV section updates from chat
  React.useEffect(() => {
    const handleCVUpdates = (event: CustomEvent) => {
      const { updatedSections } = event.detail;
      console.log('🎨 CVStructuredView: Received CV updates event:', updatedSections);
      
      if (updatedSections && updatedSections.length > 0) {
        setRecentlyUpdatedSections(new Set(updatedSections));
        setIsUpdating(true);
        
        // Clear highlights after 3 seconds
        setTimeout(() => {
          setRecentlyUpdatedSections(new Set());
          setIsUpdating(false);
        }, 3000);
      }
    };
    
    const handleClearHighlights = () => {
      console.log('🎨 CVStructuredView: Clearing highlights');
      setRecentlyUpdatedSections(new Set());
      setIsUpdating(false);
    };
    
    window.addEventListener('cv-sections-updated', handleCVUpdates as EventListener);
    window.addEventListener('clear-cv-highlights', handleClearHighlights);
    
    return () => {
      window.removeEventListener('cv-sections-updated', handleCVUpdates as EventListener);
      window.removeEventListener('clear-cv-highlights', handleClearHighlights);
    };
  }, []);

  // Track changes to cv_header content
  React.useEffect(() => {
    if (previousHeader && cvHeader) {
      const headerChanged = JSON.stringify(previousHeader) !== JSON.stringify(cvHeader);
      if (headerChanged) {
        console.log('🎨 CVStructuredView: CV Header changed, highlighting contact info');
        
        // Clear existing highlights and add header highlight
        setRecentlyUpdatedSections(new Set());
        
        setTimeout(() => {
          setRecentlyUpdatedSections(new Set(['cv_header']));
        }, 50);
        
        // Clear highlights after 3 seconds
        const timer = setTimeout(() => {
          console.log('🎨 CVStructuredView: Clearing header highlights');
          setRecentlyUpdatedSections(new Set());
        }, 3000);
        
        return () => clearTimeout(timer);
      }
    }
    
    // Update previous header for next comparison
    setPreviousHeader(cvHeader ? { ...cvHeader } : undefined);
  }, [cvHeader]);

  // Track changes to sections content with memoized comparison
  const sectionsHash = React.useMemo(() => 
    JSON.stringify(originalSections.map(s => ({ name: s.section_name, content: s.content }))), 
    [originalSections]
  );
  
  const previousSectionsHash = React.useMemo(() => 
    JSON.stringify(previousSections.map(s => ({ name: s.section_name, content: s.content }))), 
    [previousSections]
  );

  React.useEffect(() => {
    if (previousSections.length > 0 && originalSections.length > 0 && sectionsHash !== previousSectionsHash) {
      const changedSections = new Set<string>();
      const renamedSections = new Set<string>();
      
      // Check for content changes and section renames
      originalSections.forEach(currentSection => {
        const previousSection = previousSections.find(p => p.section_name === currentSection.section_name);
        
        if (previousSection) {
          // Check for content changes
          if (previousSection.content !== currentSection.content) {
            const currentTrimmed = currentSection.content.trim();
            const previousTrimmed = previousSection.content.trim();
            
            if (currentTrimmed !== previousTrimmed) {
              console.log(`🎨 CVStructuredView: Content changed for "${currentSection.section_name}"`);
              changedSections.add(currentSection.section_name);
            }
          }
        } else {
          // This might be a renamed section - check if content matches any previous section
          const matchingPreviousSection = previousSections.find(p => p.content === currentSection.content);
          if (matchingPreviousSection) {
            console.log(`🎨 CVStructuredView: Section renamed from "${matchingPreviousSection.section_name}" to "${currentSection.section_name}"`);
            renamedSections.add(currentSection.section_name);
          } else {
            // This is a new section
            console.log(`🎨 CVStructuredView: New section added: "${currentSection.section_name}"`);
            changedSections.add(currentSection.section_name);
          }
        }
      });
      
      const allChangedSections = new Set([...changedSections, ...renamedSections]);
      
      if (allChangedSections.size > 0 && !isUpdating) {
        console.log('🎨 CVStructuredView: Setting highlights for changes:', Array.from(allChangedSections));
        
        setIsUpdating(true);
        setRecentlyUpdatedSections(new Set());
        
        const timeoutId = setTimeout(() => {
          setRecentlyUpdatedSections(new Set(allChangedSections));
        }, 100);
        
        const clearTimeoutId = setTimeout(() => {
          setRecentlyUpdatedSections(new Set());
          setIsUpdating(false);
        }, 3100);
        
        return () => {
          clearTimeout(timeoutId);
          clearTimeout(clearTimeoutId);
          setIsUpdating(false);
        };
      }
    }
  }, [sectionsHash, previousSectionsHash, isUpdating]);
  
  // Update previous sections only when not updating to prevent infinite loops
  React.useEffect(() => {
    if (!isUpdating && originalSections.length > 0 && sectionsHash !== previousSectionsHash) {
      const timer = setTimeout(() => {
        setPreviousSections(originalSections.map(section => ({ ...section })));
      }, 200);
      
      return () => clearTimeout(timer);
    }
  }, [sectionsHash, previousSectionsHash, isUpdating]);

  const getSectionScore = (sectionName: string): number | undefined => {
    const section = sections.find(s => 
      s.section_name.toLowerCase().includes(sectionName.toLowerCase()) ||
      sectionName.toLowerCase().includes(s.section_name.toLowerCase())
    );
    return section?.score;
  };

  const getUpdatedContent = (sectionName: string, originalContent: string): string => {
    return updates[sectionName] || originalContent;
  };

  // Debug log when sections change
  if (originalSections.length > 0) {
    console.log('🎨 CVStructuredView: Rendering', originalSections.length, 'sections');
    console.log('🎨 Section names:', originalSections.map(s => s.section_name));
    console.log('🎨 First section content preview:', originalSections[0]?.content?.substring(0, 100));
  } else {
    console.log('🎨 CVStructuredView: No originalSections available');
    console.log('🎨 Available props:', { 
      structuredContent: !!structuredContent, 
      sections: sections.length, 
      cvHeader: !!cvHeader 
    });
  }

  // If we have original sections, show them even without structured content
  if (!structuredContent && (originalSections.length > 0 || cvHeader)) {
    return (
      <div className="h-full overflow-y-auto bg-white">
        <div className="max-w-4xl mx-auto p-8 bg-white shadow-lg">
          <div className="space-y-8">
                    {/* CV Header */}
        {cvHeader && (
          <div className={`text-center border-b border-gray-200 pb-6 transition-all duration-500 ${
            recentlyUpdatedSections.has('cv_header') ? 'bg-gradient-to-r from-blue-50 to-transparent border-l-4 border-l-blue-500 pl-4' : ''
          }`}>
            <div className="flex items-center justify-center mb-2">
              <h1 className={`text-3xl font-bold text-gray-900 transition-colors duration-500 ${
                recentlyUpdatedSections.has('cv_header') ? 'text-blue-800' : ''
              }`}>{cvHeader.name}</h1>
              {recentlyUpdatedSections.has('cv_header') && (
                <span className="ml-2 inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full animate-pulse">
                  ✨ Updated
                </span>
              )}
            </div>
            <h2 className="text-xl text-gray-600 mb-4">{cvHeader.title}</h2>
            <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-600">
                  {cvHeader.email && (
                    <a href={`mailto:${cvHeader.email}`} className="flex items-center hover:text-blue-600">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 7.89a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      {cvHeader.email}
                    </a>
                  )}
                  {cvHeader.phone && (
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      {cvHeader.phone}
                    </span>
                  )}
                  {cvHeader.location && (
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {cvHeader.location}
                    </span>
                  )}
                  {cvHeader.linkedin && (
                    <a href={cvHeader.linkedin.startsWith('http') ? cvHeader.linkedin : `https://${cvHeader.linkedin}`} 
                       target="_blank" rel="noopener noreferrer" className="flex items-center hover:text-blue-600">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                      </svg>
                      LinkedIn
                    </a>
                  )}
                  {cvHeader.github && (
                    <a href={cvHeader.github.startsWith('http') ? cvHeader.github : `https://${cvHeader.github}`} 
                       target="_blank" rel="noopener noreferrer" className="flex items-center hover:text-blue-600">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                      </svg>
                      GitHub
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* CV Sections */}
            {originalSections
              .filter(section => section.section_name.toLowerCase() !== 'header')
              .sort((a, b) => a.order - b.order)
              .map((section, index) => {
                const isRecentlyUpdated = recentlyUpdatedSections.has(section.section_name);
                return (
                  <div key={index} className={`border-b border-gray-200 pb-6 last:border-b-0 transition-all duration-500 ${
                    isRecentlyUpdated ? 'bg-gradient-to-r from-blue-50 to-transparent border-l-4 border-l-blue-500 pl-4' : ''
                  }`}>
                    <h2 className={`text-xl font-bold text-gray-900 mb-4 uppercase tracking-wide border-b-2 pb-2 transition-colors duration-500 ${
                      isRecentlyUpdated ? 'border-blue-500 text-blue-800' : 'border-blue-600'
                    }`}>
                      {section.section_name}
                      {isRecentlyUpdated && (
                        <span className="ml-2 inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full animate-pulse">
                          ✨ Updated
                        </span>
                      )}
                    </h2>
                    <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                      {getUpdatedContent(section.section_name, section.content)}
                    </div>
                  </div>
                );
              })
            }
          </div>
        </div>
      </div>
    );
  }

  if (!structuredContent) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 bg-gray-100 p-8">
        <div className="text-center max-w-md">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-gray-700 font-semibold text-lg mb-2">CV Structure Processing...</p>
          <p className="text-gray-600 text-sm mb-4">AI is analyzing your CV content</p>
          
          {/* Debug Info */}
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 text-left">
            <p className="text-blue-800 text-sm font-medium mb-2">Debug Info:</p>
            <p className="text-blue-700 text-xs">Sections available: {sections?.length || 0}</p>
            <p className="text-blue-700 text-xs">Original sections: {originalSections?.length || 0}</p>
            {sections?.length > 0 && (
              <p className="text-blue-700 text-xs">
                Section names: {sections.map(s => s.section_name).join(', ')}
              </p>
            )}
          </div>
          
          <div className="mt-4 text-left bg-yellow-50 border-l-4 border-yellow-400 p-3">
            <p className="text-yellow-800 text-xs">
              <strong>Expected sections:</strong> PROFESSIONAL SUMMARY, PROFESSIONAL EXPERIENCE, etc.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-auto bg-gray-100 p-4">
      {/* CV Document Container - Styled like a real resume */}
      <div className="max-w-4xl mx-auto bg-white text-gray-900 shadow-2xl min-h-full border border-gray-200" style={{ fontFamily: 'Georgia, Times, serif' }}>
        {/* CV Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-2">
              {getUpdatedContent('personal_info', structuredContent.personal_info.name)}
            </h1>
            <p className="text-xl mb-6 opacity-90">
              {getUpdatedContent('title', structuredContent.personal_info.title)}
            </p>
            <div className="flex flex-wrap justify-center gap-6 text-sm">
              {structuredContent.personal_info.contact.email && (
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span>{structuredContent.personal_info.contact.email}</span>
                </div>
              )}
              {structuredContent.personal_info.contact.phone && (
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span>{structuredContent.personal_info.contact.phone}</span>
                </div>
              )}
              {structuredContent.personal_info.contact.location && (
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>{structuredContent.personal_info.contact.location}</span>
                </div>
              )}
              {structuredContent.personal_info.contact.linkedin && (
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                  <span>{structuredContent.personal_info.contact.linkedin}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CV Content */}
        <div className="p-8 space-y-8">

          {/* Professional Summary */}
          {structuredContent.professional_summary && (
            <section className="mb-8">
              <div className="border-b-2 border-blue-600 pb-2 mb-4">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center justify-between">
                  PROFESSIONAL SUMMARY
                  {getSectionScore('summary') && (
                    <span className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                      Score: {getSectionScore('summary')}%
                    </span>
                  )}
                </h2>
              </div>
              <div className="text-gray-700 leading-relaxed text-justify">
                <p className="text-base">
                  {getUpdatedContent('professional_summary', structuredContent.professional_summary)}
                </p>
              </div>
            </section>
          )}

          {/* Professional Experience */}
          {structuredContent.experience.length > 0 && (
            <section className="mb-8">
              <div className="border-b-2 border-blue-600 pb-2 mb-6">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center justify-between">
                  PROFESSIONAL EXPERIENCE
                  {getSectionScore('experience') && (
                    <span className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                      Score: {getSectionScore('experience')}%
                    </span>
                  )}
                </h2>
              </div>
              <div className="space-y-6">
                {structuredContent.experience.map((exp, index) => (
                  <div key={index} className="border-l-4 border-blue-200 pl-6 relative">
                    <div className="absolute w-3 h-3 bg-blue-600 rounded-full -left-2 top-1"></div>
                    
                    <div className="mb-3">
                      <h3 className="text-xl font-bold text-gray-800 mb-1">{exp.title}</h3>
                      <p className="text-lg font-semibold text-blue-600 mb-1">{exp.company}</p>
                      <div className="flex items-center text-sm text-gray-600 mb-3">
                        <span className="font-medium">{exp.duration}</span>
                        {exp.location && (
                          <>
                            <span className="mx-2">•</span>
                            <span>{exp.location}</span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {exp.achievements.length > 0 && (
                      <div className="mb-4">
                        <ul className="space-y-2">
                          {exp.achievements.map((achievement, achIndex) => (
                            <li key={achIndex} className="text-gray-700 flex items-start">
                              <span className="text-blue-600 mr-3 mt-1.5 font-bold">•</span>
                              <span className="leading-relaxed">{achievement}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {exp.skills_used.length > 0 && (
                      <div className="mb-2">
                        <p className="text-sm text-gray-600">
                          <span className="font-semibold">Key Technologies:</span>{' '}
                          <span className="italic">{exp.skills_used.join(', ')}</span>
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Skills & Competencies */}
          <section className="mb-8">
            <div className="border-b-2 border-blue-600 pb-2 mb-6">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center justify-between">
                SKILLS & COMPETENCIES
                {getSectionScore('skills') && (
                  <span className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                    Score: {getSectionScore('skills')}%
                  </span>
                )}
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {structuredContent.skills.technical.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-3 border-b border-gray-300 pb-1">
                    Technical Skills
                  </h4>
                  <div className="space-y-1">
                    {structuredContent.skills.technical.map((skill, index) => (
                      <div key={index} className="text-gray-700">• {skill}</div>
                    ))}
                  </div>
                </div>
              )}
              
              {structuredContent.skills.soft.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-3 border-b border-gray-300 pb-1">
                    Soft Skills
                  </h4>
                  <div className="space-y-1">
                    {structuredContent.skills.soft.map((skill, index) => (
                      <div key={index} className="text-gray-700">• {skill}</div>
                    ))}
                  </div>
                </div>
              )}
              
              {structuredContent.skills.languages.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-3 border-b border-gray-300 pb-1">
                    Languages
                  </h4>
                  <div className="space-y-1">
                    {structuredContent.skills.languages.map((language, index) => (
                      <div key={index} className="text-gray-700">• {language}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Education */}
          {structuredContent.education.length > 0 && (
            <section className="mb-8">
              <div className="border-b-2 border-blue-600 pb-2 mb-6">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center justify-between">
                  EDUCATION
                  {getSectionScore('education') && (
                    <span className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                      Score: {getSectionScore('education')}%
                    </span>
                  )}
                </h2>
              </div>
              <div className="space-y-4">
                {structuredContent.education.map((edu, index) => (
                  <div key={index} className="border-l-4 border-blue-200 pl-6 relative">
                    <div className="absolute w-3 h-3 bg-blue-600 rounded-full -left-2 top-1"></div>
                    
                    <h3 className="text-xl font-bold text-gray-800 mb-1">{edu.degree}</h3>
                    <p className="text-lg font-semibold text-blue-600 mb-1">{edu.institution}</p>
                    <div className="flex items-center text-sm text-gray-600 mb-3">
                      <span className="font-medium">{edu.duration}</span>
                      {edu.location && (
                        <>
                          <span className="mx-2">•</span>
                          <span>{edu.location}</span>
                        </>
                      )}
                    </div>
                    
                    {edu.details.length > 0 && (
                      <ul className="space-y-1">
                        {edu.details.map((detail, detailIndex) => (
                          <li key={detailIndex} className="text-gray-700 flex items-start">
                            <span className="text-blue-600 mr-3 mt-1.5 font-bold">•</span>
                            <span className="leading-relaxed">{detail}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Certifications */}
          {structuredContent.certifications.length > 0 && (
            <section className="mb-8">
              <div className="border-b-2 border-blue-600 pb-2 mb-6">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center justify-between">
                  CERTIFICATIONS
                  {getSectionScore('certifications') && (
                    <span className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                      Score: {getSectionScore('certifications')}%
                    </span>
                  )}
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {structuredContent.certifications.map((cert, index) => (
                  <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h4 className="text-lg font-semibold text-gray-800 mb-1">{cert.name}</h4>
                    <p className="text-blue-600 font-medium mb-1">{cert.issuer}</p>
                    <p className="text-sm text-gray-600">{cert.date}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

        </div>
      </div>
    </div>
  );
};

export default CVStructuredView;
