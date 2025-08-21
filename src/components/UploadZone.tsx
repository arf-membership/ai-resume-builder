/**
 * Upload Zone Component
 * Handles file upload with drag-and-drop functionality and validation
 */

import React, { useState, useRef, useCallback } from 'react';
import type { UploadZoneProps } from '../types';
import { ProgressIndicator } from './ProgressIndicator';
import { UploadService, type UploadProgress } from '../services';
import { useSession } from '../contexts/SessionContext';

// File validation constants
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['application/pdf'];
const ALLOWED_EXTENSIONS = ['.pdf'];

export function UploadZone({ 
  onUploadComplete, 
  onUploadProgress, 
  onError, 
  disabled = false 
}: UploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const { sessionId } = useSession();

  /**
   * Validate uploaded file
   */
  const validateFile = (file: File): string | null => {
    // Check file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Please upload a PDF file only.';
    }

    // Check file extension as backup
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
      return 'File must have a .pdf extension.';
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return `File size must be less than ${MAX_FILE_SIZE / (1024 * 1024)}MB.`;
    }

    // Check if file is empty
    if (file.size === 0) {
      return 'File appears to be empty. Please select a valid PDF file.';
    }

    return null;
  };

  /**
   * Upload file to Supabase Storage
   */
  const uploadFile = async (file: File): Promise<{ resumeId: string; filePath: string }> => {
    if (!sessionId) {
      throw new Error('No session available. Please refresh the page and try again.');
    }

    // Create abort controller for this upload
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const result = await UploadService.uploadPDF(file, sessionId, {
        onProgress: (progress: UploadProgress) => {
          setUploadProgress(progress.percentage);
          onUploadProgress(progress.percentage);
        },
        signal: abortController.signal,
      });

      return {
        resumeId: result.resumeId,
        filePath: result.filePath,
      };
    } finally {
      abortControllerRef.current = null;
    }
  };

  /**
   * Cancel current upload
   */
  const cancelUpload = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsUploading(false);
    setUploadProgress(0);
  }, []);

  /**
   * Handle file processing
   */
  const processFile = useCallback(async (file: File) => {
    if (disabled || isUploading) return;

    // Validate file
    const validationError = validateFile(file);
    if (validationError) {
      onError(validationError);
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const result = await uploadFile(file);
      onUploadComplete(result);
    } catch (error) {
      // Handle different error types
      if (error instanceof Error) {
        if (error.message.includes('cancelled')) {
          // Upload was cancelled by user - don't show error
          return;
        }
        onError(error.message);
      } else {
        onError('Upload failed. Please try again.');
      }
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [disabled, isUploading, onUploadComplete, onUploadProgress, onError, uploadFile]);

  /**
   * Handle drag events
   */
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isUploading) {
      setIsDragOver(true);
    }
  }, [disabled, isUploading]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (disabled || isUploading) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      processFile(files[0]);
    }
  }, [disabled, isUploading, processFile]);

  /**
   * Handle file input change
   */
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  }, [processFile]);

  /**
   * Handle click to open file dialog
   */
  const handleClick = useCallback(() => {
    if (!disabled && !isUploading && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled, isUploading]);

  const isActive = isDragOver && !disabled && !isUploading;
  const isDisabled = disabled || isUploading;

  return (
    <div className="w-full">
      {/* Upload Zone */}
      <div
        className={`
          relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 cursor-pointer touch-manipulation backdrop-blur-sm
          ${isActive 
            ? 'border-purple-400 bg-purple-500/10 scale-105' 
            : isDisabled 
              ? 'border-white/20 bg-white/5 cursor-not-allowed opacity-50' 
              : 'border-white/30 bg-white/5 hover:border-white/50 hover:bg-white/10'
          }
        `}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
        role="button"
        tabIndex={isDisabled ? -1 : 0}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !isDisabled) {
            e.preventDefault();
            handleClick();
          }
        }}
        aria-label="Upload PDF file"
      >
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileInputChange}
          className="hidden"
          disabled={isDisabled}
          aria-hidden="true"
        />

        {/* Upload Icon */}
        <div className="mb-6">
          {isUploading ? (
            <div className="w-20 h-20 mx-auto">
              <div className="animate-spin rounded-full h-full w-full border-4 border-white/20 border-t-purple-400"></div>
            </div>
          ) : (
            <svg 
              className="w-20 h-20 mx-auto text-white/70" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 48 48"
              aria-hidden="true"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={1.5} 
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" 
              />
            </svg>
          )}
        </div>

        {/* Upload Text */}
        <div className="space-y-6">
          <div className="text-center">
            <p className="text-xl text-white font-medium mb-2">
              {isUploading ? 'Uploading your CV...' : 'Drag and drop your PDF CV here'}
            </p>
            {!isUploading && (
              <p className="text-gray-300">
                or <span className="text-purple-300 font-medium">click to browse files</span>
              </p>
            )}
          </div>
        </div>

        {/* File Requirements */}
        {!isUploading && (
          <div className="flex justify-center items-center space-x-6 text-sm text-gray-400">
            <span className="flex items-center">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
              </svg>
              PDF files only
            </span>
            <span className="flex items-center">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              Max 10MB
            </span>
            <span className="flex items-center">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              Secure processing
            </span>
          </div>
        )}
      </div>

      {/* Progress Indicator */}
      {isUploading && (
        <div className="mt-4 space-y-3">
          <ProgressIndicator
            progress={uploadProgress}
            status="uploading"
            message="Uploading your CV..."
          />
          
          {/* Cancel Button */}
          <div className="flex justify-center">
            <button
              onClick={cancelUpload}
              className="btn-touch px-4 py-2 text-responsive-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel Upload
            </button>
          </div>
        </div>
      )}
    </div>
  );
}