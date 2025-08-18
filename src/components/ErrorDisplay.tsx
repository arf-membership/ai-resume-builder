/**
 * Error display components for showing user-friendly error messages
 */

import React from 'react';
import { useErrors, useStoreActions } from '../store';
import type { ErrorState } from '../types/state';

interface ErrorMessageProps {
  error: ErrorState;
  onDismiss?: (errorId: string) => void;
  onRetry?: () => void;
  showDetails?: boolean;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  error,
  onDismiss,
  onRetry,
  showDetails = false,
}) => {
  const getErrorIcon = (type: ErrorState['type']) => {
    switch (type) {
      case 'upload':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
        );
      case 'analysis':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
        );
      case 'edit':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
          </svg>
        );
      case 'download':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        );
      case 'network':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M17.778 8.222c-4.296-4.296-11.26-4.296-15.556 0A1 1 0 01.808 6.808c5.076-5.077 13.308-5.077 18.384 0a1 1 0 01-1.414 1.414zM14.95 11.05a7 7 0 00-9.9 0 1 1 0 01-1.414-1.414 9 9 0 0112.728 0 1 1 0 01-1.414 1.414zM12.12 13.88a3 3 0 00-4.242 0 1 1 0 01-1.415-1.415 5 5 0 017.072 0 1 1 0 01-1.415 1.415zM9 16a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
          </svg>
        );
      case 'validation':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  const getErrorColor = (type: ErrorState['type']) => {
    switch (type) {
      case 'network':
      case 'validation':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      default:
        return 'bg-red-50 border-red-200 text-red-800';
    }
  };

  const getIconColor = (type: ErrorState['type']) => {
    switch (type) {
      case 'network':
      case 'validation':
        return 'text-yellow-400';
      default:
        return 'text-red-400';
    }
  };

  return (
    <div className={`rounded-md p-4 border ${getErrorColor(error.type)}`}>
      <div className="flex">
        <div className={`flex-shrink-0 ${getIconColor(error.type)}`}>
          {getErrorIcon(error.type)}
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium">
            {error.type.charAt(0).toUpperCase() + error.type.slice(1)} Error
          </h3>
          <div className="mt-2 text-sm">
            <p>{error.message}</p>
            {showDetails && error.details && (
              <details className="mt-2">
                <summary className="cursor-pointer font-medium">
                  Technical Details
                </summary>
                <pre className="mt-1 text-xs bg-gray-100 p-2 rounded overflow-auto">
                  {error.details}
                </pre>
              </details>
            )}
            <p className="mt-1 text-xs opacity-75">
              {error.timestamp.toLocaleString()}
            </p>
          </div>
          <div className="mt-4 flex space-x-2">
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="bg-white text-sm font-medium text-red-800 hover:bg-red-100 border border-red-300 rounded-md px-3 py-1 transition-colors"
              >
                Try Again
              </button>
            )}
            {onDismiss && (
              <button
                type="button"
                onClick={() => onDismiss(error.id)}
                className="bg-white text-sm font-medium text-red-800 hover:bg-red-100 border border-red-300 rounded-md px-3 py-1 transition-colors"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface ErrorListProps {
  maxErrors?: number;
  showDetails?: boolean;
  onRetryError?: (error: ErrorState) => void;
  className?: string;
}

export const ErrorList: React.FC<ErrorListProps> = ({
  maxErrors = 5,
  showDetails = false,
  onRetryError,
  className = '',
}) => {
  const errors = useErrors();
  const { removeError, clearErrors } = useStoreActions();

  if (errors.length === 0) {
    return null;
  }

  const displayErrors = errors.slice(-maxErrors);

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">
          Recent Errors ({errors.length})
        </h3>
        {errors.length > 0 && (
          <button
            onClick={clearErrors}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Clear All
          </button>
        )}
      </div>
      
      {displayErrors.map((error) => (
        <ErrorMessage
          key={error.id}
          error={error}
          onDismiss={removeError}
          onRetry={onRetryError ? () => onRetryError(error) : undefined}
          showDetails={showDetails}
        />
      ))}
      
      {errors.length > maxErrors && (
        <p className="text-sm text-gray-500 text-center">
          ... and {errors.length - maxErrors} more errors
        </p>
      )}
    </div>
  );
};

interface ErrorBannerProps {
  error: ErrorState;
  onDismiss?: () => void;
  onRetry?: () => void;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({
  error,
  onDismiss,
  onRetry,
}) => {
  return (
    <div className={`rounded-md p-4 mb-4 ${error.type === 'network' || error.type === 'validation' ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className={`flex-shrink-0 ${error.type === 'network' || error.type === 'validation' ? 'text-yellow-400' : 'text-red-400'}`}>
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className={`text-sm font-medium ${error.type === 'network' || error.type === 'validation' ? 'text-yellow-800' : 'text-red-800'}`}>
              {error.message}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className={`text-sm font-medium underline ${error.type === 'network' || error.type === 'validation' ? 'text-yellow-800 hover:text-yellow-900' : 'text-red-800 hover:text-red-900'}`}
            >
              Retry
            </button>
          )}
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className={`${error.type === 'network' || error.type === 'validation' ? 'text-yellow-400 hover:text-yellow-600' : 'text-red-400 hover:text-red-600'}`}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorMessage;