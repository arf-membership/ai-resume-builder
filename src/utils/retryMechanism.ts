/**
 * Retry mechanism utilities for failed operations
 */

import { useNotifications } from '../store/notificationStore';

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryCondition?: (error: Error) => boolean;
  onRetry?: (attempt: number, error: Error) => void;
  onMaxAttemptsReached?: (error: Error) => void;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  retryCondition: (error: Error) => {
    // Retry on network errors, timeouts, and 5xx server errors
    const retryableErrors = [
      'NetworkError',
      'TimeoutError',
      'fetch',
      '5',
      'timeout',
      'network',
      'connection',
    ];
    
    const errorMessage = error.message.toLowerCase();
    return retryableErrors.some(keyword => errorMessage.includes(keyword));
  },
};

/**
 * Retry an async operation with exponential backoff
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error;
  
  for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Check if we should retry this error
      if (!finalConfig.retryCondition!(lastError)) {
        throw lastError;
      }
      
      // If this is the last attempt, don't wait
      if (attempt === finalConfig.maxAttempts) {
        if (finalConfig.onMaxAttemptsReached) {
          finalConfig.onMaxAttemptsReached(lastError);
        }
        break;
      }
      
      // Call retry callback
      if (finalConfig.onRetry) {
        finalConfig.onRetry(attempt, lastError);
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        finalConfig.baseDelay * Math.pow(finalConfig.backoffMultiplier, attempt - 1),
        finalConfig.maxDelay
      );
      
      // Add jitter to prevent thundering herd
      const jitteredDelay = delay + Math.random() * 1000;
      
      await new Promise(resolve => setTimeout(resolve, jitteredDelay));
    }
  }
  
  throw lastError!;
}

/**
 * React hook for retry operations with user feedback
 */
export const useRetryOperation = () => {
  const { showWarning, showError, showInfo } = useNotifications();
  
  const retryWithFeedback = async <T>(
    operation: () => Promise<T>,
    operationName: string,
    config: Partial<RetryConfig> = {}
  ): Promise<T> => {
    const retryConfig: RetryConfig = {
      ...DEFAULT_RETRY_CONFIG,
      ...config,
      onRetry: (attempt, error) => {
        showWarning(
          'Retrying Operation',
          `${operationName} failed (attempt ${attempt}). Retrying...`,
          3000
        );
        
        if (config.onRetry) {
          config.onRetry(attempt, error);
        }
      },
      onMaxAttemptsReached: (error) => {
        showError(
          'Operation Failed',
          `${operationName} failed after ${config.maxAttempts || DEFAULT_RETRY_CONFIG.maxAttempts} attempts. Please try again later.`,
          0
        );
        
        if (config.onMaxAttemptsReached) {
          config.onMaxAttemptsReached(error);
        }
      },
    };
    
    try {
      showInfo('Processing', `Starting ${operationName}...`, 2000);
      return await retryOperation(operation, retryConfig);
    } catch (error) {
      // Final error handling
      const errorMessage = error instanceof Error ? error.message : String(error);
      showError(
        'Operation Failed',
        `${operationName} failed: ${errorMessage}`,
        0
      );
      throw error;
    }
  };
  
  return { retryWithFeedback };
};

/**
 * Specific retry configurations for different operations
 */
export const RETRY_CONFIGS = {
  upload: {
    maxAttempts: 3,
    baseDelay: 2000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    retryCondition: (error: Error) => {
      const message = error.message.toLowerCase();
      return message.includes('network') || 
             message.includes('timeout') || 
             message.includes('connection') ||
             message.includes('fetch');
    },
  },
  
  analysis: {
    maxAttempts: 2,
    baseDelay: 3000,
    maxDelay: 15000,
    backoffMultiplier: 2,
    retryCondition: (error: Error) => {
      const message = error.message.toLowerCase();
      return message.includes('timeout') || 
             message.includes('service unavailable') ||
             message.includes('rate limit') ||
             message.includes('502') ||
             message.includes('503') ||
             message.includes('504');
    },
  },
  
  edit: {
    maxAttempts: 2,
    baseDelay: 1500,
    maxDelay: 8000,
    backoffMultiplier: 2,
    retryCondition: (error: Error) => {
      const message = error.message.toLowerCase();
      return message.includes('timeout') || 
             message.includes('service unavailable') ||
             message.includes('rate limit');
    },
  },
  
  download: {
    maxAttempts: 3,
    baseDelay: 2000,
    maxDelay: 12000,
    backoffMultiplier: 2,
    retryCondition: (error: Error) => {
      const message = error.message.toLowerCase();
      return message.includes('network') || 
             message.includes('timeout') ||
             message.includes('generation failed') ||
             message.includes('storage');
    },
  },
  
  network: {
    maxAttempts: 4,
    baseDelay: 1000,
    maxDelay: 8000,
    backoffMultiplier: 1.5,
    retryCondition: () => true, // Always retry network errors
  },
} as const;

/**
 * Utility function to check if an error is retryable
 */
export const isRetryableError = (error: Error, operationType: keyof typeof RETRY_CONFIGS): boolean => {
  const config = RETRY_CONFIGS[operationType];
  return config.retryCondition ? config.retryCondition(error) : false;
};

/**
 * Create a retry wrapper for a specific operation type
 */
export const createRetryWrapper = <T extends unknown[], R>(
  operationType: keyof typeof RETRY_CONFIGS,
  operation: (...args: T) => Promise<R>
) => {
  return async (...args: T): Promise<R> => {
    return retryOperation(
      () => operation(...args),
      RETRY_CONFIGS[operationType]
    );
  };
};

export default retryOperation;