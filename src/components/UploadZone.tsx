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
          relative border-2 border-dashed rounded-lg p-6 sm:p-8 text-center transition-all duration-200 cursor-pointer touch-manipulation
          ${isActive 
            ? 'border-blue-400 bg-blue-50' 
            : isDisabled 
              ? 'border-gray-200 bg-gray-50 cursor-not-allowed' 
              : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50'
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
        <div className="mb-3 sm:mb-4">
          {isUploading ? (
            <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto">
              <div className="animate-spin rounded-full h-full w-full border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <svg 
              className={`w-12 h-12 sm:w-16 sm:h-16 mx-auto ${isDisabled ? 'text-gray-300' : 'text-gray-400'}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" 
              />
            </svg>
          )}
        </div>

        {/* Upload Text */}
        <div className="space-y-1 sm:space-y-2">
          {isUploading ? (
            <>
              <p className="text-responsive-base font-medium text-gray-700">Uploading your CV...</p>
              <p className="text-responsive-sm text-gray-500">Please wait while we process your file</p>
            </>
          ) : (
            <>
              <p className={`text-responsive-base font-medium ${isDisabled ? 'text-gray-400' : 'text-gray-700'}`}>
                {isActive ? 'Drop your PDF here' : (
                  <>
                    <span className="hidden sm:inline">Drag and drop your PDF CV here</span>
                    <span className="sm:hidden">Tap to select your PDF CV</span>
                  </>
                )}
              </p>
              <p className={`text-responsive-sm ${isDisabled ? 'text-gray-300' : 'text-gray-500'}`}>
                <span className="hidden sm:inline">or click to browse files</span>
                <span className="sm:hidden">Browse files from your device</span>
              </p>
            </>
          )}
        </div>

        {/* File Requirements */}
        {!isUploading && (
          <div className="mt-3 sm:mt-4 text-xs sm:text-sm text-gray-400 space-y-1">
            <div className="flex flex-col sm:flex-row sm:justify-center sm:space-x-4 space-y-1 sm:space-y-0">
              <span>• PDF files only</span>
              <span>• Max 10MB</span>
              <span className="hidden sm:inline">• Secure processing</span>
            </div>
            <p className="sm:hidden">• Secure and private processing</p>
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