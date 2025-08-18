/**
 * Demo component to test error handling and loading features
 */

import React, { useState } from 'react';
import { useErrorHandling } from '../hooks/useErrorHandling';
import { useNotifications } from '../store/notificationStore';
import { ButtonLoading, InlineLoading, Skeleton } from './LoadingIndicator';
import { ErrorList, ErrorBanner } from './ErrorDisplay';
import { useErrors, useStoreActions } from '../store';

const ErrorHandlingDemo: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [selectedErrorType, setSelectedErrorType] = useState<'upload' | 'analysis' | 'edit' | 'download' | 'network' | 'validation'>('upload');
  
  const {
    handleUploadWithRetry,
    handleAnalysisWithRetry,
    handleEditWithRetry,
    handleDownloadWithRetry,
    handleNetworkOperation,
    handleValidation,
    safeAsync,
    handleBatchOperations,
  } = useErrorHandling();
  
  const { showSuccess, showError, showWarning, showInfo } = useNotifications();
  const errors = useErrors();
  const { addError } = useStoreActions();

  // Simulate different types of operations
  const simulateUpload = async () => {
    const operation = async () => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      if (Math.random() < 0.3) {
        throw new Error('Network timeout during upload');
      }
    };
    
    await handleUploadWithRetry(operation, {
      name: 'test-cv.pdf',
      size: 1024000,
      type: 'application/pdf'
    });
  };

  const simulateAnalysis = async () => {
    const operation = async () => {
      await new Promise(resolve => setTimeout(resolve, 3000));
      if (Math.random() < 0.4) {
        throw new Error('AI service temporarily unavailable');
      }
    };
    
    await handleAnalysisWithRetry(operation, 'resume-123');
  };

  const simulateEdit = async () => {
    const operation = async () => {
      await new Promise(resolve => setTimeout(resolve, 1500));
      if (Math.random() < 0.3) {
        throw new Error('Content too long for processing');
      }
    };
    
    await handleEditWithRetry(operation, 'Professional Summary');
  };

  const simulateDownload = async () => {
    const operation = async () => {
      await new Promise(resolve => setTimeout(resolve, 2500));
      if (Math.random() < 0.3) {
        throw new Error('PDF generation failed');
      }
    };
    
    await handleDownloadWithRetry(operation, 'resume-123');
  };

  const simulateNetworkOperation = async () => {
    const operation = async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (Math.random() < 0.5) {
        throw new Error('Network connection lost');
      }
    };
    
    await handleNetworkOperation(operation, 'Data Sync');
  };

  const simulateValidation = () => {
    const isValid = handleValidation(() => {
      const randomValue = Math.random();
      if (randomValue < 0.3) {
        return 'Email format is invalid';
      }
      if (randomValue < 0.6) {
        return false;
      }
      return true;
    }, 'Email Address');
    
    if (isValid) {
      showSuccess('Validation Passed', 'All fields are valid');
    }
  };

  const simulateBatchOperations = async () => {
    const operations = [
      async () => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (Math.random() < 0.3) throw new Error('Operation 1 failed');
        return 'Result 1';
      },
      async () => {
        await new Promise(resolve => setTimeout(resolve, 1200));
        if (Math.random() < 0.3) throw new Error('Operation 2 failed');
        return 'Result 2';
      },
      async () => {
        await new Promise(resolve => setTimeout(resolve, 800));
        if (Math.random() < 0.3) throw new Error('Operation 3 failed');
        return 'Result 3';
      },
    ];
    
    await handleBatchOperations(operations, 'Batch Processing', true);
  };

  const simulateManualError = () => {
    addError({
      type: selectedErrorType,
      message: `Simulated ${selectedErrorType} error for testing`,
      details: `Stack trace and technical details for ${selectedErrorType} error`,
    });
  };

  const testSafeAsync = async () => {
    setIsLoading(true);
    const result = await safeAsync(
      async () => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (Math.random() < 0.5) {
          throw new Error('Random failure in safe async operation');
        }
        return 'Success result';
      },
      'Fallback result',
      'Safe async operation failed, using fallback'
    );
    
    console.log('Safe async result:', result);
    setIsLoading(false);
  };

  const testNotifications = () => {
    showSuccess('Success!', 'This is a success notification');
    setTimeout(() => showInfo('Info', 'This is an info notification'), 500);
    setTimeout(() => showWarning('Warning', 'This is a warning notification'), 1000);
    setTimeout(() => showError('Error', 'This is an error notification'), 1500);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Error Handling & Loading Demo
        </h1>
        
        {/* Operation Simulation Buttons */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          <ButtonLoading
            isLoading={false}
            onClick={simulateUpload}
            className="w-full"
          >
            Test Upload
          </ButtonLoading>
          
          <ButtonLoading
            isLoading={false}
            onClick={simulateAnalysis}
            className="w-full"
          >
            Test Analysis
          </ButtonLoading>
          
          <ButtonLoading
            isLoading={false}
            onClick={simulateEdit}
            className="w-full"
          >
            Test Edit
          </ButtonLoading>
          
          <ButtonLoading
            isLoading={false}
            onClick={simulateDownload}
            className="w-full"
          >
            Test Download
          </ButtonLoading>
          
          <ButtonLoading
            isLoading={false}
            onClick={simulateNetworkOperation}
            className="w-full"
          >
            Test Network
          </ButtonLoading>
          
          <ButtonLoading
            isLoading={false}
            onClick={simulateValidation}
            className="w-full"
            variant="secondary"
          >
            Test Validation
          </ButtonLoading>
        </div>

        {/* Additional Test Buttons */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <ButtonLoading
            isLoading={false}
            onClick={simulateBatchOperations}
            className="w-full"
            variant="secondary"
          >
            Batch Ops
          </ButtonLoading>
          
          <ButtonLoading
            isLoading={isLoading}
            onClick={testSafeAsync}
            className="w-full"
            variant="secondary"
          >
            Safe Async
          </ButtonLoading>
          
          <ButtonLoading
            isLoading={false}
            onClick={testNotifications}
            className="w-full"
            variant="secondary"
          >
            Test Notifications
          </ButtonLoading>
          
          <ButtonLoading
            isLoading={false}
            onClick={() => setShowSkeleton(!showSkeleton)}
            className="w-full"
            variant="secondary"
          >
            Toggle Skeleton
          </ButtonLoading>
        </div>

        {/* Manual Error Generation */}
        <div className="bg-gray-50 rounded-lg p-4 mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Manual Error Generation</h3>
          <div className="flex items-center space-x-4">
            <select
              value={selectedErrorType}
              onChange={(e) => setSelectedErrorType(e.target.value as any)}
              className="border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="upload">Upload Error</option>
              <option value="analysis">Analysis Error</option>
              <option value="edit">Edit Error</option>
              <option value="download">Download Error</option>
              <option value="network">Network Error</option>
              <option value="validation">Validation Error</option>
            </select>
            <ButtonLoading
              isLoading={false}
              onClick={simulateManualError}
              variant="danger"
            >
              Generate Error
            </ButtonLoading>
          </div>
        </div>

        {/* Loading Indicators Demo */}
        <div className="bg-gray-50 rounded-lg p-4 mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Loading Indicators</h3>
          <div className="space-y-4">
            <InlineLoading message="Processing your request..." />
            <InlineLoading message="Analyzing data..." size="lg" />
            
            {showSkeleton && (
              <div className="space-y-4">
                <Skeleton lines={3} avatar />
                <Skeleton lines={2} />
              </div>
            )}
          </div>
        </div>

        {/* Error Display */}
        {errors.length > 0 && (
          <div className="mb-8">
            <ErrorBanner
              error={errors[errors.length - 1]}
              onDismiss={() => {}}
              onRetry={() => console.log('Retry clicked')}
            />
          </div>
        )}

        {/* Error List */}
        <ErrorList
          maxErrors={3}
          showDetails={true}
          onRetryError={(error) => {
            console.log('Retrying error:', error);
            showInfo('Retry', `Retrying ${error.type} operation...`);
          }}
        />
      </div>
    </div>
  );
};

export default ErrorHandlingDemo;