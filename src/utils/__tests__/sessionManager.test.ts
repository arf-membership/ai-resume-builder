/**
 * Tests for session manager utilities
 */

import { renderHook, act } from '@testing-library/react';
import { sessionManager, useSessionManager } from '../sessionManager';
import { useCVStore } from '../../store';
import { useNotifications } from '../../store/notificationStore';

// Mock the stores
jest.mock('../../store', () => ({
  useCVStore: {
    getState: jest.fn(),
  },
}));

jest.mock('../../store/notificationStore', () => ({
  useNotifications: {
    getState: jest.fn(),
  },
}));

// Mock sessionStorage
const mockSessionStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
});

// Mock timers
jest.useFakeTimers();

describe('Session Manager', () => {
  const mockReset = jest.fn();
  const mockInitializeSession = jest.fn();
  const mockClearSession = jest.fn();
  const mockShowWarning = jest.fn();
  const mockShowInfo = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    
    (useCVStore.getState as jest.Mock).mockReturnValue({
      sessionId: 'test-session-id',
      reset: mockReset,
      initializeSession: mockInitializeSession,
      clearSession: mockClearSession,
    });

    (useNotifications.getState as jest.Mock).mockReturnValue({
      showWarning: mockShowWarning,
      showInfo: mockShowInfo,
    });

    // Mock console.error to avoid noise in tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    sessionManager.destroy();
  });

  describe('Session Validation', () => {
    it('should initialize new session when no stored data exists', () => {
      mockSessionStorage.getItem.mockReturnValue(null);

      sessionManager.initialize();

      expect(mockReset).toHaveBeenCalled();
      expect(mockInitializeSession).toHaveBeenCalled();
    });

    it('should initialize new session when stored data is invalid', () => {
      mockSessionStorage.getItem.mockReturnValue('invalid json');

      sessionManager.initialize();

      expect(mockReset).toHaveBeenCalled();
      expect(mockInitializeSession).toHaveBeenCalled();
    });

    it('should initialize new session when timestamp is missing', () => {
      mockSessionStorage.getItem.mockReturnValue(
        JSON.stringify({ state: {} })
      );

      sessionManager.initialize();

      expect(mockReset).toHaveBeenCalled();
      expect(mockInitializeSession).toHaveBeenCalled();
    });

    it('should expire session when it is too old', () => {
      const oldTimestamp = Date.now() - (25 * 60 * 60 * 1000); // 25 hours ago
      mockSessionStorage.getItem.mockReturnValue(
        JSON.stringify({ state: { timestamp: oldTimestamp } })
      );

      sessionManager.initialize();

      expect(mockReset).toHaveBeenCalled();
      expect(mockInitializeSession).toHaveBeenCalled();
      expect(mockShowWarning).toHaveBeenCalledWith(
        'Session Expired',
        'Your session has expired. Please start over with a new CV upload.',
        8000
      );
    });

    it('should validate session when it is still valid', () => {
      const recentTimestamp = Date.now() - (1 * 60 * 60 * 1000); // 1 hour ago
      mockSessionStorage.getItem.mockReturnValue(
        JSON.stringify({ state: { timestamp: recentTimestamp } })
      );

      (useCVStore.getState as jest.Mock).mockReturnValue({
        sessionId: 'existing-session-id',
        reset: mockReset,
        initializeSession: mockInitializeSession,
        clearSession: mockClearSession,
      });

      sessionManager.initialize();

      expect(mockReset).not.toHaveBeenCalled();
      expect(mockInitializeSession).not.toHaveBeenCalled();
    });

    it('should initialize session when store has no session ID', () => {
      const recentTimestamp = Date.now() - (1 * 60 * 60 * 1000); // 1 hour ago
      mockSessionStorage.getItem.mockReturnValue(
        JSON.stringify({ state: { timestamp: recentTimestamp } })
      );

      (useCVStore.getState as jest.Mock).mockReturnValue({
        sessionId: '', // No session ID
        reset: mockReset,
        initializeSession: mockInitializeSession,
        clearSession: mockClearSession,
      });

      sessionManager.initialize();

      expect(mockInitializeSession).toHaveBeenCalled();
    });
  });

  describe('Session Refresh', () => {
    it('should update session timestamp', () => {
      const existingData = { state: { timestamp: Date.now() - 1000 } };
      mockSessionStorage.getItem.mockReturnValue(JSON.stringify(existingData));

      sessionManager.refreshSession();

      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        'cv-store',
        expect.stringContaining('"timestamp":')
      );
    });

    it('should handle missing session data gracefully', () => {
      mockSessionStorage.getItem.mockReturnValue(null);

      expect(() => sessionManager.refreshSession()).not.toThrow();
    });

    it('should handle invalid JSON gracefully', () => {
      mockSessionStorage.getItem.mockReturnValue('invalid json');

      expect(() => sessionManager.refreshSession()).not.toThrow();
    });
  });

  describe('Session Info', () => {
    it('should return session info for valid session', () => {
      const timestamp = Date.now() - (2 * 60 * 60 * 1000); // 2 hours ago
      mockSessionStorage.getItem.mockReturnValue(
        JSON.stringify({ state: { timestamp } })
      );

      const info = sessionManager.getSessionInfo();

      expect(info.sessionId).toBe('test-session-id');
      expect(info.isValid).toBe(true);
      expect(info.age).toBeCloseTo(2 * 60 * 60 * 1000, -3); // Within 1 second
      expect(info.remainingTime).toBeGreaterThan(0);
    });

    it('should return session info for expired session', () => {
      const timestamp = Date.now() - (25 * 60 * 60 * 1000); // 25 hours ago
      mockSessionStorage.getItem.mockReturnValue(
        JSON.stringify({ state: { timestamp } })
      );

      const info = sessionManager.getSessionInfo();

      expect(info.isValid).toBe(false);
      expect(info.remainingTime).toBe(0);
    });

    it('should handle missing session data', () => {
      mockSessionStorage.getItem.mockReturnValue(null);

      const info = sessionManager.getSessionInfo();

      expect(info.sessionId).toBe('test-session-id');
      expect(info.isValid).toBe(false);
      expect(info.age).toBe(0);
      expect(info.remainingTime).toBe(0);
    });
  });

  describe('Cleanup Timer', () => {
    it('should start cleanup timer on initialization', () => {
      mockSessionStorage.getItem.mockReturnValue(null);

      sessionManager.initialize();

      // Fast-forward time by cleanup interval (1 hour)
      act(() => {
        jest.advanceTimersByTime(60 * 60 * 1000);
      });

      // Should trigger validation again
      expect(mockReset).toHaveBeenCalledTimes(2); // Once on init, once on timer
    });

    it('should clear timer on destroy', () => {
      mockSessionStorage.getItem.mockReturnValue(null);

      sessionManager.initialize();
      sessionManager.destroy();

      // Fast-forward time
      act(() => {
        jest.advanceTimersByTime(60 * 60 * 1000);
      });

      // Should not trigger additional validation
      expect(mockReset).toHaveBeenCalledTimes(1); // Only once on init
    });
  });

  describe('Clear Session', () => {
    it('should clear session data', () => {
      sessionManager.clearSession();

      expect(mockClearSession).toHaveBeenCalled();
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('cv-store');
    });
  });

  describe('useSessionManager Hook', () => {
    it('should provide session management methods', () => {
      const { result } = renderHook(() => useSessionManager());

      expect(typeof result.current.refreshSession).toBe('function');
      expect(typeof result.current.clearSession).toBe('function');
      expect(typeof result.current.initializeSession).toBe('function');
      expect(typeof result.current.sessionInfo).toBe('object');
    });

    it('should show notification when refreshing session', () => {
      const { result } = renderHook(() => useSessionManager());

      act(() => {
        result.current.refreshSession();
      });

      expect(mockShowInfo).toHaveBeenCalledWith(
        'Session Refreshed',
        'Your session has been extended.',
        3000
      );
    });

    it('should show notification when clearing session', () => {
      const { result } = renderHook(() => useSessionManager());

      act(() => {
        result.current.clearSession();
      });

      expect(mockShowInfo).toHaveBeenCalledWith(
        'Session Cleared',
        'All session data has been cleared.',
        3000
      );
    });
  });

  describe('Storage Event Listener', () => {
    it('should setup storage event listener', () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
      
      sessionManager.initialize();

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'storage',
        expect.any(Function)
      );
    });

    it('should handle storage events for session data', () => {
      mockSessionStorage.getItem.mockReturnValue(null);
      
      sessionManager.initialize();

      // Simulate storage event
      const storageEvent = new StorageEvent('storage', {
        key: 'cv-store',
        newValue: JSON.stringify({ state: { timestamp: Date.now() } }),
      });

      window.dispatchEvent(storageEvent);

      // Should trigger validation
      expect(mockReset).toHaveBeenCalledTimes(2); // Once on init, once on storage event
    });

    it('should ignore storage events for other keys', () => {
      mockSessionStorage.getItem.mockReturnValue(null);
      
      sessionManager.initialize();

      // Simulate storage event for different key
      const storageEvent = new StorageEvent('storage', {
        key: 'other-key',
        newValue: 'some value',
      });

      window.dispatchEvent(storageEvent);

      // Should not trigger additional validation
      expect(mockReset).toHaveBeenCalledTimes(1); // Only once on init
    });
  });
});