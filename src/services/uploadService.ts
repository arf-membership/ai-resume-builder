/**
 * File upload service with Supabase Storage integration
 * Handles PDF uploads with progress tracking and error handling
 */

import { supabase, STORAGE_BUCKETS, getSessionFilePath } from '../lib/supabase';
import type { ResumeInsert, StorageResponse, FileUploadResult } from '../types/database';

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadResult {
  resumeId: string;
  filePath: string;
  fileUrl: string;
}

export interface UploadOptions {
  onProgress?: (progress: UploadProgress) => void;
  signal?: AbortSignal;
}

/**
 * Upload service class for handling file uploads to Supabase Storage
 */
export class UploadService {
  /**
   * Upload PDF file to Supabase Storage and create database record
   */
  static async uploadPDF(
    file: File,
    sessionId: string,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    const { onProgress, signal } = options;

    try {
      // Validate file before upload
      this.validateFile(file);

      // Generate unique filename to prevent conflicts
      const timestamp = Date.now();
      const sanitizedName = this.sanitizeFilename(file.name);
      const uniqueFilename = `${timestamp}_${sanitizedName}`;
      const filePath = getSessionFilePath(sessionId, uniqueFilename);

      // Check if upload was aborted
      if (signal?.aborted) {
        throw new Error('Upload was cancelled');
      }

      // Upload file to Supabase Storage with progress tracking
      const uploadResult = await this.uploadWithProgress(
        file,
        filePath,
        onProgress,
        signal
      );

      if (uploadResult.error) {
        throw new Error(`Upload failed: ${uploadResult.error.message}`);
      }

      // Check if upload was aborted after completion
      if (signal?.aborted) {
        // Clean up uploaded file if aborted
        await this.cleanupFile(filePath);
        throw new Error('Upload was cancelled');
      }

      // Get public URL for the uploaded file
      const { data: urlData } = supabase.storage
        .from(STORAGE_BUCKETS.ORIGINALS)
        .getPublicUrl(filePath);

      // Create database record
      const resumeRecord = await this.createResumeRecord(sessionId, filePath);

      return {
        resumeId: resumeRecord.id,
        filePath: filePath,
        fileUrl: urlData.publicUrl,
      };
    } catch (error) {
      // Handle different types of errors
      if (error instanceof Error) {
        if (error.name === 'AbortError' || error.message.includes('cancelled')) {
          throw new Error('Upload was cancelled by user');
        }
        throw error;
      }
      throw new Error('An unexpected error occurred during upload');
    }
  }

  /**
   * Upload file with progress tracking
   */
  private static async uploadWithProgress(
    file: File,
    filePath: string,
    onProgress?: (progress: UploadProgress) => void,
    signal?: AbortSignal
  ): Promise<StorageResponse<FileUploadResult>> {
    // Create a promise that can track upload progress
    return new Promise((resolve, reject) => {
      // Check if already aborted
      if (signal?.aborted) {
        reject(new Error('Upload was cancelled'));
        return;
      }

      // Set up abort handler
      const abortHandler = () => {
        reject(new Error('Upload was cancelled'));
      };
      signal?.addEventListener('abort', abortHandler);

      // Use Supabase upload with progress simulation
      // Note: Supabase doesn't provide native progress tracking, so we simulate it
      let progressInterval: NodeJS.Timeout;
      let currentProgress = 0;

      if (onProgress) {
        progressInterval = setInterval(() => {
          if (currentProgress < 90) {
            currentProgress += Math.random() * 10;
            onProgress({
              loaded: (currentProgress / 100) * file.size,
              total: file.size,
              percentage: Math.min(currentProgress, 90),
            });
          }
        }, 100);
      }

      // Perform the actual upload
      supabase.storage
        .from(STORAGE_BUCKETS.ORIGINALS)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        })
        .then((result) => {
          // Clear progress interval
          if (progressInterval) {
            clearInterval(progressInterval);
          }

          // Complete progress
          if (onProgress) {
            onProgress({
              loaded: file.size,
              total: file.size,
              percentage: 100,
            });
          }

          // Clean up abort handler
          signal?.removeEventListener('abort', abortHandler);

          resolve(result as StorageResponse<FileUploadResult>);
        })
        .catch((error) => {
          // Clear progress interval
          if (progressInterval) {
            clearInterval(progressInterval);
          }

          // Clean up abort handler
          signal?.removeEventListener('abort', abortHandler);

          reject(error);
        });
    });
  }

  /**
   * Create database record for uploaded resume
   */
  private static async createResumeRecord(
    sessionId: string,
    filePath: string
  ): Promise<{ id: string }> {
    const resumeData: ResumeInsert = {
      user_session_id: sessionId,
      original_pdf_path: filePath,
      analysis_json: null,
      generated_pdf_path: null,
    };

    const { data, error } = await supabase
      .from('resumes')
      .insert(resumeData)
      .select('id')
      .single();

    if (error) {
      // Clean up uploaded file if database insert fails
      await this.cleanupFile(filePath);
      throw new Error(`Failed to create resume record: ${error.message}`);
    }

    if (!data) {
      await this.cleanupFile(filePath);
      throw new Error('Failed to create resume record: No data returned');
    }

    return data;
  }

  /**
   * Validate uploaded file
   */
  private static validateFile(file: File): void {
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    const ALLOWED_TYPES = ['application/pdf'];
    const ALLOWED_EXTENSIONS = ['.pdf'];

    // Check file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new Error('Invalid file type. Please upload a PDF file only.');
    }

    // Check file extension as backup
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
      throw new Error('Invalid file extension. File must have a .pdf extension.');
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File size too large. Maximum allowed size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.`);
    }

    // Check if file is empty
    if (file.size === 0) {
      throw new Error('File appears to be empty. Please select a valid PDF file.');
    }
  }

  /**
   * Sanitize filename to prevent issues
   */
  private static sanitizeFilename(filename: string): string {
    // Remove or replace problematic characters
    return filename
      .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace special chars with underscore
      .replace(/_{2,}/g, '_') // Replace multiple underscores with single
      .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
      .toLowerCase();
  }

  /**
   * Clean up uploaded file (used when database operations fail)
   */
  private static async cleanupFile(filePath: string): Promise<void> {
    try {
      await supabase.storage
        .from(STORAGE_BUCKETS.ORIGINALS)
        .remove([filePath]);
    } catch (error) {
      // Log cleanup error but don't throw - this is a cleanup operation
      console.error('Failed to cleanup uploaded file:', error);
    }
  }

  /**
   * Check if a file exists in storage
   */
  static async fileExists(filePath: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKETS.ORIGINALS)
        .list(filePath.substring(0, filePath.lastIndexOf('/')), {
          search: filePath.substring(filePath.lastIndexOf('/') + 1),
        });

      return !error && data && data.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Get file size from storage
   */
  static async getFileSize(filePath: string): Promise<number | null> {
    try {
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKETS.ORIGINALS)
        .list(filePath.substring(0, filePath.lastIndexOf('/')), {
          search: filePath.substring(filePath.lastIndexOf('/') + 1),
        });

      if (error || !data || data.length === 0) {
        return null;
      }

      return data[0].metadata?.size || null;
    } catch {
      return null;
    }
  }
}