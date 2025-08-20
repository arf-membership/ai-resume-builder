/**
 * Tests for useErrorHandling hook
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useErrorHandling } from '../useErrorHandling';

// Mock the notification store
vi.mock('../../store/notificationStore', () => ({
  useNotificationStore: () => ({
    addNotification: vi.fn(),
    removeNotification: vi.fn(),
  }),
}));

describe('useErrorHandling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with no errors', () => {
    const { result } = renderHook(() => useErrorHandling());

    expect(result.current.errors).toEqual([]);
    expect(result.current.hasErrors).toBe(false);
  });

  it('should add error correctly', () => {
    const { result } = renderHook(() => useErrorHandling());

    act(() => {
      result.current.addError('upload', 'Upload failed');
    });

    expect(result.current.errors).toHaveLength(1);
    expect(result.current.errors[0]).toMatchObject({
      type: 'upload',
      message: 'Upload failed',
    });
    expect(result.current.hasErrors).toBe(true);
  });

  it('should add multiple errors', () => {
    const { result } = renderHook(() => useErrorHandling());

    act(() => {
      result.current.addError('upload', 'Upload failed');
      result.current.addError('analysis', 'Analysis failed');
    });

    expect(result.current.errors).toHaveLength(2);
    expect(result.current.hasErrors).toBe(true);
  });

  it('should remove error by id', () => {
    const { result } = renderHook(() => useErrorHandling());

    let errorId: string;

    act(() => {
      result.current.addError('upload', 'Upload failed');
      errorId = result.current.errors[0].id;
    });

    act(() => {
      result.current.removeError(errorId);
    });

    expect(result.current.errors).toHaveLength(0);
    expect(result.current.hasErrors).toBe(false);
  });

  it('should clear all errors', () => {
    const { result } = renderHook(() => useErrorHandling());

    act(() => {
      result.current.addError('upload', 'Upload failed');
      result.current.addError('analysis', 'Analysis failed');
    });

    expect(result.current.errors).toHaveLength(2);

    act(() => {
      result.current.clearErrors();
    });

    expect(result.current.errors).toHaveLength(0);
    expect(result.current.hasErrors).toBe(false);
  });

  it('should clear errors by type', () => {
    const { result } = renderHook(() => useErrorHandling());

    act(() => {
      result.current.addError('upload', 'Upload failed 1');
      result.current.addError('upload', 'Upload failed 2');
      result.current.addError('analysis', 'Analysis failed');
    });

    expect(result.current.errors).toHaveLength(3);

    act(() => {
      result.current.clearErrorsByType('upload');
    });

    expect(result.current.errors).toHaveLength(1);
    expect(result.current.errors[0].type).toBe('analysis');
  });

  it('should get errors by type', () => {
    const { result } = renderHook(() => useErrorHandling());

    act(() => {
      result.current.addError('upload', 'Upload failed 1');
      result.current.addError('upload', 'Upload failed 2');
      result.current.addError('analysis', 'Analysis failed');
    });

    const uploadErrors = result.current.getErrorsByType('upload');
    expect(uploadErrors).toHaveLength(2);
    expect(uploadErrors.every(error => error.type === 'upload')).toBe(true);

    const analysisErrors = result.current.getErrorsByType('analysis');
    expect(analysisErrors).toHaveLength(1);
    expect(analysisErrors[0].type).toBe('analysis');
  });

  it('should handle error objects', () => {
    const { result } = renderHook(() => useErrorHandling());

    const error = new Error('Test error');

    act(() => {
      result.current.handleError('upload', error);
    });

    expect(result.current.errors).toHaveLength(1);
    expect(result.current.errors[0].message).toBe('Test error');
  });

  it('should handle error with custom details', () => {
    const { result } = renderHook(() => useErrorHandling());

    act(() => {
      result.current.addError('upload', 'Upload failed', {
        fileName: 'test.pdf',
        fileSize: 1024,
      });
    });

    expect(result.current.errors[0].details).toEqual({
      fileName: 'test.pdf',
      fileSize: 1024,
    });
  });

  it('should auto-remove errors after timeout', async () => {
    vi.useFakeTimers();
    
    const { result } = renderHook(() => useErrorHandling({
      autoRemoveTimeout: 1000,
    }));

    act(() => {
      result.current.addError('upload', 'Upload failed');
    });

    expect(result.current.errors).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.errors).toHaveLength(0);

    vi.useRealTimers();
  });

  it('should not auto-remove persistent errors', async () => {
    vi.useFakeTimers();
    
    const { result } = renderHook(() => useErrorHandling({
      autoRemoveTimeout: 1000,
    }));

    act(() => {
      result.current.addError('upload', 'Upload failed', undefined, true);
    });

    expect(result.current.errors).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.errors).toHaveLength(1);

    vi.useRealTimers();
  });

  it('should call onError callback when provided', () => {
    const onErrorCallback = vi.fn();
    
    const { result } = renderHook(() => useErrorHandling({
      onError: onErrorCallback,
    }));

    act(() => {
      result.current.addError('upload', 'Upload failed');
    });

    expect(onErrorCallback).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'upload',
        message: 'Upload failed',
      })
    );
  });

  it('should limit number of errors when maxErrors is set', () => {
    const { result } = renderHook(() => useErrorHandling({
      maxErrors: 2,
    }));

    act(() => {
      result.current.addError('upload', 'Error 1');
      result.current.addError('upload', 'Error 2');
      result.current.addError('upload', 'Error 3');
    });

    expect(result.current.errors).toHaveLength(2);
    expect(result.current.errors[0].message).toBe('Error 2');
    expect(result.current.errors[1].message).toBe('Error 3');
  });

  it('should format error messages correctly', () => {
    const { result } = renderHook(() => useErrorHandling());

    act(() => {
      result.current.addError('upload', 'File upload failed: Invalid file type');
    });

    const formattedMessage = result.current.getFormattedError(result.current.errors[0]);
    expect(formattedMessage).toContain('Upload Error');
    expect(formattedMessage).toContain('File upload failed: Invalid file type');
  });

  it('should retry failed operations', async () => {
    const retryFn = vi.fn().mockResolvedValue('success');
    
    const { result } = renderHook(() => useErrorHandling());

    act(() => {
      result.current.addError('upload', 'Upload failed', { retryFn });
    });

    await act(async () => {
      await result.current.retryError(result.current.errors[0].id);
    });

    expect(retryFn).toHaveBeenCalled();
    expect(result.current.errors).toHaveLength(0);
  });

  it('should handle retry failures', async () => {
    const retryFn = vi.fn().mockRejectedValue(new Error('Retry failed'));
    
    const { result } = renderHook(() => useErrorHandling());

    act(() => {
      result.current.addError('upload', 'Upload failed', { retryFn });
    });

    await act(async () => {
      await result.current.retryError(result.current.errors[0].id);
    });

    expect(retryFn).toHaveBeenCalled();
    expect(result.current.errors).toHaveLength(1);
    expect(result.current.errors[0].message).toContain('Retry failed');
  });
});