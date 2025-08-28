import React from 'react';
import { AnalysisResults } from './AnalysisResults';
import type { CVAnalysisResult } from '../types';

/**
 * Demo component to showcase the AnalysisResults components
 */
const AnalysisResultsDemo: React.FC = () => {
  // Mock analysis data for demonstration
  const mockAnalysisData: CVAnalysisResult = {
    overall_score: 82,
    summary: 'Your CV demonstrates strong technical expertise and relevant experience. The content is well-structured with clear sections. To enhance your CV further, consider adding more quantifiable achievements and ensuring consistent formatting throughout all sections.',
    sections: [
      {
        section_name: 'professional_summary',
        score: 88,
        content: 'Experienced Full-Stack Developer with 5+ years of expertise in React, Node.js, and cloud technologies. Proven track record of delivering scalable web applications and leading cross-functional teams. Passionate about clean code, user experience, and continuous learning.',
        feedback: 'Excellent professional summary that clearly communicates your value proposition and key strengths.',
        suggestions: 'Consider adding specific metrics about team size or project impact to make it even more compelling.'
      },
      {
        section_name: 'work_experience',
        score: 85,
        content: 'Senior Software Developer at TechCorp Inc. (2020-2024)\n• Led development of customer portal serving 10,000+ users\n• Implemented microservices architecture reducing load times by 40%\n• Mentored 3 junior developers and conducted code reviews\n\nSoftware Developer at StartupXYZ (2019-2020)\n• Built responsive web applications using React and TypeScript\n• Collaborated with design team to implement pixel-perfect UIs\n• Optimized database queries improving performance by 25%',
        feedback: 'Strong work experience section with good use of action verbs and quantifiable achievements.',
        suggestions: 'Add more specific technologies used in each role and consider including any awards or recognition received.'
      },
      {
        section_name: 'technical_skills',
        score: 75,
        content: 'Programming Languages: JavaScript, TypeScript, Python, Java\nFrontend: React, Vue.js, HTML5, CSS3, Tailwind CSS\nBackend: Node.js, Express, Django, Spring Boot\nDatabases: PostgreSQL, MongoDB, Redis\nCloud: AWS, Docker, Kubernetes\nTools: Git, Jenkins, Jira, Figma',
        feedback: 'Comprehensive skills section covering relevant technologies for full-stack development.',
        suggestions: 'Organize skills by proficiency level (Expert, Intermediate, Beginner) and add years of experience for key technologies.'
      },
      {
        section_name: 'education',
        score: 70,
        content: 'Bachelor of Science in Computer Science\nUniversity of Technology, 2019\nRelevant Coursework: Data Structures, Algorithms, Software Engineering, Database Systems',
        feedback: 'Basic education section with relevant degree for the field.',
        suggestions: 'Add GPA if above 3.5, include any honors, relevant projects, or certifications obtained during studies.'
      },
      {
        section_name: 'projects',
        score: 90,
        content: 'E-Commerce Platform (2023)\n• Built full-stack application using React, Node.js, and PostgreSQL\n• Implemented secure payment processing with Stripe integration\n• Deployed on AWS with CI/CD pipeline, handling 1000+ concurrent users\n• GitHub: github.com/user/ecommerce-platform\n\nTask Management App (2022)\n• Developed real-time collaborative tool using Socket.io and React\n• Implemented drag-and-drop functionality and user authentication\n• Used by 500+ beta users with 4.8/5 rating on app stores',
        feedback: 'Outstanding projects section with detailed descriptions and impressive metrics.',
        suggestions: 'Consider adding links to live demos or case studies for your most impressive projects.'
      }
    ],
    ats_compatibility: {
      score: 78,
      feedback: 'Your CV has good ATS compatibility with proper formatting, relevant keywords, and clear section headers. The structure is logical and easy for both ATS systems and human recruiters to parse.',
      suggestions: 'To improve ATS compatibility: use more industry-standard section headers, add more relevant keywords from job descriptions, and ensure consistent date formatting throughout the document.'
    }
  };

  const handleSectionEdit = (sectionName: string) => {
    console.log(`Editing section: ${sectionName}`);
    // In a real application, this would trigger the section editing workflow
  };

  const handleDownloadPDF = () => {
    console.log('Downloading PDF...');
    // In a real application, this would trigger PDF generation and download
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto py-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Analysis Results Demo
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            This demo showcases the analysis results display components with sample CV analysis data. 
            In the real application, this data would come from AI analysis of an uploaded CV.
          </p>
        </div>
        
        <AnalysisResults
          analysisData={mockAnalysisData}
          resumeId="demo-resume-123"
          onSectionEdit={handleSectionEdit}
          onDownloadPDF={handleDownloadPDF}
        />
      </div>
    </div>
  );
};

export default AnalysisResultsDemo;