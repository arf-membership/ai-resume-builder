/**
 * CV Analysis Service
 * Handles communication with the analyze-cv Edge Function
 * Provides CV analysis functionality with progress tracking and error handling
 */

import { supabase } from '../lib/supabase';
import type { CVAnalysisResult } from '../types/cv';
import { CacheService } from './cacheService';

export interface AnalysisOptions {
  onProgress?: (progress: number) => void;
  signal?: AbortSignal;
}

export interface AnalysisResponse {
  success: boolean;
  data?: {
    resumeId: string;
    analysis: CVAnalysisResult;
  };
  error?: string;
  type?: string;
}

/**
 * Service for CV analysis operations
 */
export class AnalysisService {
  private static readonly POLL_INTERVAL = 2000; // 2 seconds
  private static readonly MAX_POLL_ATTEMPTS = 60; // 2 minutes max

  /**
   * Analyze a CV using the Edge Function
   */
  static async analyzeCV(
    resumeId: string,
    sessionId: string,
    onProgress?: (progress: number) => void,
    signal?: AbortSignal
  ): Promise<CVAnalysisResult> {
    try {
      // Set initial progress
      onProgress?.(5);

      // Check if analysis is already cached
      const cachedResult = this.getCachedAnalysis(resumeId);
      if (cachedResult) {
        onProgress?.(100);
        return cachedResult;
      }

      // Prepare request payload
      const payload = {
        resumeId,
        pdfPath: null // Let the Edge Function determine the path from the resume record
      };

      // Call the analyze-cv Edge Function using direct fetch
      // Note: Using fetch directly instead of supabase.functions.invoke due to body serialization issues
      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-cv`;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      const fetchResponse = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
          'x-session-id': sessionId,
        },
        body: JSON.stringify(payload)
      });
      
      const responseText = await fetchResponse.text();
      
      let data, error;
      if (fetchResponse.ok) {
        try {
          data = JSON.parse(responseText);
        } catch (e) {
          error = { message: `Failed to parse response: ${responseText}` };
        }
      } else {
        error = { message: `HTTP ${fetchResponse.status}: ${responseText}` };
      }

      if (error) {
        throw new Error(`Edge Function error: ${error.message}`);
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Analysis failed');
      }

      if (!data.data?.analysis) {
        throw new Error('No analysis data received');
      }

      const analysisResult = data.data.analysis;

      // Cache the analysis result
      this.cacheAnalysis(resumeId, analysisResult);

      return analysisResult;

    } catch (error) {
      console.error('CV Analysis failed:', error);
      
      // Check if it's an abort error
      if (signal?.aborted) {
        throw new Error('Analysis was cancelled');
      }

      // Provide user-friendly error messages
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          throw new Error('Analysis timed out. Please try again.');
        }
        if (error.message.includes('network')) {
          throw new Error('Network error. Please check your connection and try again.');
        }
        if (error.message.includes('rate limit')) {
          throw new Error('Too many requests. Please wait a moment and try again.');
        }
        throw error;
      }
      
      throw new Error('An unexpected error occurred during analysis');
    }
  }

  /**
   * Get analysis progress by polling the database
   */
  static async pollAnalysisProgress(
    resumeId: string,
    sessionId: string,
    onProgress?: (progress: number) => void,
    signal?: AbortSignal
  ): Promise<CVAnalysisResult | null> {
    let attempts = 0;

    while (attempts < this.MAX_POLL_ATTEMPTS && !signal?.aborted) {
      try {
        // Query the resume record to check if analysis is complete
        const { data: resume, error } = await supabase
          .from('resumes')
          .select('analysis_json')
          .eq('id', resumeId)
          .eq('user_session_id', sessionId)
          .single();

        if (error) {
          throw new Error(`Database error: ${error.message}`);
        }

        if (resume?.analysis_json) {
          onProgress?.(100);
          return resume.analysis_json as CVAnalysisResult;
        }

        // Update progress based on attempts
        const progress = Math.min(30 + (attempts * 2), 90);
        onProgress?.(progress);

        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, this.POLL_INTERVAL));
        attempts++;

      } catch (error) {
        console.error('Polling error:', error);
        break;
      }
    }

    return null;
  }

  /**
   * Check analysis status
   */
  static async checkAnalysisStatus(
    resumeId: string,
    sessionId: string
  ): Promise<{
    isComplete: boolean;
    result?: CVAnalysisResult;
    error?: string;
  }> {
    try {
      const { data: resume, error } = await supabase
        .from('resumes')
        .select('analysis_json')
        .eq('id', resumeId)
        .eq('user_session_id', sessionId)
        .single();

      if (error) {
        return {
          isComplete: false,
          error: `Database error: ${error.message}`
        };
      }

      if (resume?.analysis_json) {
        return {
          isComplete: true,
          result: resume.analysis_json as CVAnalysisResult
        };
      }

      return { isComplete: false };

    } catch (error) {
      return {
        isComplete: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Cache analysis result
   */
  private static cacheAnalysis(resumeId: string, result: CVAnalysisResult): void {
    try {
      // Use a simple hash for caching since we don't have PDF content here
      const contentHash = resumeId; // Use resumeId as a simple cache key
      CacheService.cacheAnalysisResult(resumeId, result, contentHash);
    } catch (error) {
      console.warn('Failed to cache analysis result:', error);
    }
  }

  /**
   * Get cached analysis result
   */
  private static getCachedAnalysis(resumeId: string): CVAnalysisResult | null {
    try {
      const contentHash = resumeId; // Use resumeId as a simple cache key
      return CacheService.getCachedAnalysisResult(resumeId, contentHash);
    } catch (error) {
      console.warn('Failed to get cached analysis result:', error);
      return null;
    }
  }

  /**
   * Clear analysis cache for a specific resume
   */
  static clearAnalysisCache(resumeId: string): void {
    try {
      // Since we're using resumeId as hash, we need to clear it from cache
      // This is a simplified approach - in a real implementation you might want
      // to track cache keys more systematically
      // For now, we'll just log that we would clear the cache
      console.log('Would clear analysis cache for resume:', resumeId);
    } catch (error) {
      console.warn('Failed to clear analysis cache:', error);
    }
  }

  /**
   * Validate analysis result structure
   */
  static validateAnalysisResult(result: any): result is CVAnalysisResult {
    return (
      result &&
      typeof result.overall_score === 'number' &&
      typeof result.summary === 'string' &&
      Array.isArray(result.sections) &&
      result.ats_compatibility &&
      typeof result.ats_compatibility.score === 'number'
    );
  }
}

export default AnalysisService;
