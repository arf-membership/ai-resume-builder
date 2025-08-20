/**
 * Section editing service for AI-powered CV improvements
 * Handles communication with the edit-section Edge Function
 */

import { supabase } from '../lib/supabase';
import { CacheService } from './cacheService';
import { trackOperation } from './performanceMonitoringService';
import type { SectionEditRequest, SectionEditResponse } from '../types/api';
import type { CVSection } from '../types/cv';

export interface SectionEditOptions {
  signal?: AbortSignal;
  onProgress?: (status: string) => void;
}

export interface SectionEditResult {
  updatedSection: CVSection;
  updatedScore: number;
  message: string;
}

/**
 * Section editing service class
 */
export class SectionEditService {
  /**
   * Edit a CV section using AI
   */
  static async editSection(
    resumeId: string,
    sectionName: string,
    currentContent: string,
    suggestions: string,
    sessionId: string,
    additionalContext?: string,
    options: SectionEditOptions = {}
  ): Promise<SectionEditResult> {
    const { signal, onProgress } = options;

    return trackOperation(
      'section_edit',
      async () => {
        try {
          onProgress?.('Preparing section for editing...');

          // Validate inputs
          this.validateEditRequest(resumeId, sectionName, currentContent, suggestions, sessionId);

          // Check if request was aborted
          if (signal?.aborted) {
            throw new Error('Section editing was cancelled');
          }

          // Check cache first
          const cachedResult = CacheService.getCachedSectionEditResult(
            resumeId,
            sectionName,
            currentContent,
            suggestions
          );

          if (cachedResult) {
            onProgress?.('Using cached result...');
            return cachedResult;
          }

          onProgress?.('Sending to AI for improvement...');

          // Prepare request data
          const requestData: SectionEditRequest = {
            resumeId,
            sectionName,
            currentContent,
            suggestions,
            ...(additionalContext && { additionalContext })
          };

          // Make request to Edge Function
          const { data, error } = await supabase.functions.invoke('edit-section', {
            body: requestData,
            headers: {
              'x-session-id': sessionId,
              'Content-Type': 'application/json'
            }
          });

          // Check if request was aborted
          if (signal?.aborted) {
            throw new Error('Section editing was cancelled');
          }

          // Handle response
          if (error) {
            throw new Error(`Section editing failed: ${error.message}`);
          }

          if (!data || !data.success) {
            throw new Error(data?.error || 'Section editing failed');
          }

          onProgress?.('Section updated successfully');

          const responseData = data.data as SectionEditResponse;
          
          const result: SectionEditResult = {
            updatedSection: responseData.updatedSection,
            updatedScore: responseData.updatedScore,
            message: responseData.message
          };

          // Cache the result
          CacheService.cacheSectionEditResult(
            resumeId,
            sectionName,
            currentContent,
            suggestions,
            result
          );

          return result;

        } catch (error) {
          // Handle different types of errors
          if (error instanceof Error) {
            if (error.name === 'AbortError' || error.message.includes('cancelled')) {
              throw new Error('Section editing was cancelled by user');
            }
            throw error;
          }
          throw new Error('An unexpected error occurred during section editing');
        }
      },
      {
        resumeId,
        sectionName,
        contentLength: currentContent.length,
        suggestionsLength: suggestions.length,
      }
    );
  }

  /**
   * Validate section edit request
   */
  private static validateEditRequest(
    resumeId: string,
    sectionName: string,
    currentContent: string,
    suggestions: string,
    sessionId: string
  ): void {
    if (!resumeId || typeof resumeId !== 'string') {
      throw new Error('Resume ID is required and must be a string');
    }

    if (!sectionName || typeof sectionName !== 'string') {
      throw new Error('Section name is required and must be a string');
    }

    if (!currentContent || typeof currentContent !== 'string') {
      throw new Error('Current content is required and must be a string');
    }

    if (!suggestions || typeof suggestions !== 'string') {
      throw new Error('Suggestions are required and must be a string');
    }

    if (!sessionId || typeof sessionId !== 'string') {
      throw new Error('Session ID is required and must be a string');
    }

    // Validate content length
    if (currentContent.length > 5000) {
      throw new Error('Current content is too long (maximum 5000 characters)');
    }

    if (suggestions.length > 2000) {
      throw new Error('Suggestions are too long (maximum 2000 characters)');
    }
  }

  /**
   * Check if section editing is available
   */
  static async checkAvailability(): Promise<boolean> {
    try {
      // Simple availability check - we'll assume it's available
      // In a real implementation, you might want to make a lightweight test call
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get estimated processing time based on content length
   */
  static getEstimatedProcessingTime(contentLength: number): number {
    // Base time of 5 seconds + 1 second per 100 characters
    const baseTime = 5000;
    const variableTime = Math.ceil(contentLength / 100) * 1000;
    return Math.min(baseTime + variableTime, 30000); // Cap at 30 seconds
  }
}