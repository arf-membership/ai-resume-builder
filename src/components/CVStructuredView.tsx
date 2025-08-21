import React, { useState } from 'react';
import type { StructuredContent, CVSection } from '../types/cv';

interface CVStructuredViewProps {
  structuredContent?: StructuredContent;
  sections?: CVSection[];
  updates?: Record<string, string>;
  onSectionClick?: (sectionName: string) => void;
  highlightedSection?: string;
}

interface SectionHeaderProps {
  title: string;
  score?: number;
  isHighlighted?: boolean;
  onClick?: () => void;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ 
  title, 
  score, 
  isHighlighted, 
  onClick 
}) => (
  <div 
    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
      isHighlighted 
        ? 'bg-purple-900/50 border-purple-500 shadow-lg shadow-purple-500/20' 
        : 'bg-gray-800/50 border-gray-600 hover:bg-gray-700/50'
    }`}
    onClick={onClick}
  >
    <h3 className="text-lg font-semibold text-white">{title}</h3>
    {score !== undefined && (
      <div className="flex items-center space-x-2">
        <span className={`text-sm font-medium ${
          score >= 80 ? 'text-green-400' : 
          score >= 60 ? 'text-yellow-400' : 'text-red-400'
        }`}>
          {score}%
        </span>
        <div className="w-16 h-2 bg-gray-700 rounded-full">
          <div 
            className={`h-full rounded-full transition-all duration-300 ${
              score >= 80 ? 'bg-green-400' : 
              score >= 60 ? 'bg-yellow-400' : 'bg-red-400'
            }`}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>
    )}
  </div>
);

const SkillTag: React.FC<{ skill: string; category: 'technical' | 'soft' | 'language' }> = ({ 
  skill, 
  category 
}) => {
  const colors = {
    technical: 'bg-blue-900/50 text-blue-300 border-blue-700',
    soft: 'bg-green-900/50 text-green-300 border-green-700',
    language: 'bg-purple-900/50 text-purple-300 border-purple-700',
  };

  return (
    <span className={`px-3 py-1 rounded-full text-sm border ${colors[category]} transition-colors hover:brightness-110`}>
      {skill}
    </span>
  );
};

export const CVStructuredView: React.FC<CVStructuredViewProps> = ({
  structuredContent,
  sections = [],
  updates = {},
  onSectionClick,
  highlightedSection,
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['personal_info']));

  const toggleSection = (sectionName: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionName)) {
      newExpanded.delete(sectionName);
    } else {
      newExpanded.add(sectionName);
    }
    setExpandedSections(newExpanded);
    onSectionClick?.(sectionName);
  };

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

  if (!structuredContent) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        <div className="text-center">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-gray-300 font-medium">CV Structure Loading...</p>
          <p className="text-gray-400 text-sm mt-2">Processing your CV for enhanced display</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-auto p-6 space-y-6">
      {/* Personal Information */}
      <div className="space-y-3">
        <SectionHeader
          title="Personal Information"
          score={getSectionScore('personal')}
          isHighlighted={highlightedSection === 'personal_info'}
          onClick={() => toggleSection('personal_info')}
        />
        
        {expandedSections.has('personal_info') && (
          <div className="bg-gray-800/30 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
            <div className="text-center mb-6">
              <h1 className="text-3xl font-bold text-white mb-2">
                {getUpdatedContent('personal_info', structuredContent.personal_info.name)}
              </h1>
              <p className="text-xl text-purple-300 mb-4">
                {getUpdatedContent('title', structuredContent.personal_info.title)}
              </p>
              <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-300">
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
        )}
      </div>

      {/* Professional Summary */}
      {structuredContent.professional_summary && (
        <div className="space-y-3">
          <SectionHeader
            title="Professional Summary"
            score={getSectionScore('summary')}
            isHighlighted={highlightedSection === 'professional_summary'}
            onClick={() => toggleSection('professional_summary')}
          />
          
          {expandedSections.has('professional_summary') && (
            <div className="bg-gray-800/30 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
              <p className="text-gray-300 leading-relaxed">
                {getUpdatedContent('professional_summary', structuredContent.professional_summary)}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Experience */}
      {structuredContent.experience.length > 0 && (
        <div className="space-y-3">
          <SectionHeader
            title="Professional Experience"
            score={getSectionScore('experience')}
            isHighlighted={highlightedSection === 'experience'}
            onClick={() => toggleSection('experience')}
          />
          
          {expandedSections.has('experience') && (
            <div className="space-y-4">
              {structuredContent.experience.map((exp, index) => (
                <div key={index} className="bg-gray-800/30 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
                  <div className="mb-4">
                    <h4 className="text-xl font-semibold text-white mb-1">{exp.title}</h4>
                    <p className="text-purple-300 font-medium">{exp.company}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-400 mt-2">
                      <span>{exp.duration}</span>
                      {exp.location && <span>• {exp.location}</span>}
                    </div>
                  </div>
                  
                  {exp.achievements.length > 0 && (
                    <div className="mb-4">
                      <h5 className="text-sm font-medium text-gray-300 mb-2">Key Achievements:</h5>
                      <ul className="space-y-1">
                        {exp.achievements.map((achievement, achIndex) => (
                          <li key={achIndex} className="text-gray-300 text-sm flex items-start">
                            <span className="text-purple-400 mr-2 mt-1">•</span>
                            {achievement}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {exp.skills_used.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-gray-300 mb-2">Technologies Used:</h5>
                      <div className="flex flex-wrap gap-2">
                        {exp.skills_used.map((skill, skillIndex) => (
                          <SkillTag key={skillIndex} skill={skill} category="technical" />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Skills */}
      <div className="space-y-3">
        <SectionHeader
          title="Skills & Competencies"
          score={getSectionScore('skills')}
          isHighlighted={highlightedSection === 'skills'}
          onClick={() => toggleSection('skills')}
        />
        
        {expandedSections.has('skills') && (
          <div className="bg-gray-800/30 backdrop-blur-sm rounded-lg p-6 border border-gray-700 space-y-6">
            {structuredContent.skills.technical.length > 0 && (
              <div>
                <h5 className="text-sm font-medium text-gray-300 mb-3">Technical Skills</h5>
                <div className="flex flex-wrap gap-2">
                  {structuredContent.skills.technical.map((skill, index) => (
                    <SkillTag key={index} skill={skill} category="technical" />
                  ))}
                </div>
              </div>
            )}
            
            {structuredContent.skills.soft.length > 0 && (
              <div>
                <h5 className="text-sm font-medium text-gray-300 mb-3">Soft Skills</h5>
                <div className="flex flex-wrap gap-2">
                  {structuredContent.skills.soft.map((skill, index) => (
                    <SkillTag key={index} skill={skill} category="soft" />
                  ))}
                </div>
              </div>
            )}
            
            {structuredContent.skills.languages.length > 0 && (
              <div>
                <h5 className="text-sm font-medium text-gray-300 mb-3">Languages</h5>
                <div className="flex flex-wrap gap-2">
                  {structuredContent.skills.languages.map((language, index) => (
                    <SkillTag key={index} skill={language} category="language" />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Education */}
      {structuredContent.education.length > 0 && (
        <div className="space-y-3">
          <SectionHeader
            title="Education"
            score={getSectionScore('education')}
            isHighlighted={highlightedSection === 'education'}
            onClick={() => toggleSection('education')}
          />
          
          {expandedSections.has('education') && (
            <div className="space-y-4">
              {structuredContent.education.map((edu, index) => (
                <div key={index} className="bg-gray-800/30 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
                  <h4 className="text-lg font-semibold text-white mb-1">{edu.degree}</h4>
                  <p className="text-purple-300 font-medium">{edu.institution}</p>
                  <div className="flex items-center space-x-4 text-sm text-gray-400 mt-2 mb-3">
                    <span>{edu.duration}</span>
                    {edu.location && <span>• {edu.location}</span>}
                  </div>
                  
                  {edu.details.length > 0 && (
                    <ul className="space-y-1">
                      {edu.details.map((detail, detailIndex) => (
                        <li key={detailIndex} className="text-gray-300 text-sm flex items-start">
                          <span className="text-purple-400 mr-2 mt-1">•</span>
                          {detail}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Certifications */}
      {structuredContent.certifications.length > 0 && (
        <div className="space-y-3">
          <SectionHeader
            title="Certifications"
            score={getSectionScore('certifications')}
            isHighlighted={highlightedSection === 'certifications'}
            onClick={() => toggleSection('certifications')}
          />
          
          {expandedSections.has('certifications') && (
            <div className="space-y-3">
              {structuredContent.certifications.map((cert, index) => (
                <div key={index} className="bg-gray-800/30 backdrop-blur-sm rounded-lg p-4 border border-gray-700">
                  <h4 className="text-lg font-semibold text-white">{cert.name}</h4>
                  <p className="text-purple-300">{cert.issuer}</p>
                  <p className="text-sm text-gray-400 mt-1">{cert.date}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CVStructuredView;
