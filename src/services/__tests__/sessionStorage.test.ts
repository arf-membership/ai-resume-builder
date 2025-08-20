/**
 * Tests for SessionStorage service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SessionStorageService } from '../sessionStorage';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('SessionStorageService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  describe('getCurrentSession', () => {
    it('should return null when no session exists', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const session = SessionStorageService.getCurrentSession();
      expect(session).toBeNull();
    });

    it('should return parsed session data when valid session exists', () => {
      const mockSession = {
        sessionId: '123e4567-e89b-12d3-a456-426614174000',
        createdAt: '2023-01-01T00:00:00.000Z',
        lastActivity: '2023-01-01T01:00:00.000Z',
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockSession));
      
      const session = SessionStorageService.getCurrentSession();
      expect(session).toEqual(mockSession);
    });

    it('should return null when session data is invalid JSON', () => {
      localStorageMock.getItem.mockReturnValue('invalid json');
      
      const session = SessionStorageService.getCurrentSession();
      expect(session).toBeNull();
    });

    it('should return null when session is expired', () => {
      const expiredSession = {
        sessionId: '123e4567-e89b-12d3-a456-426614174000',
        createdAt: '2023-01-01T00:00:00.000Z',
        lastActivity: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(), // 25 hours ago
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(expiredSession));
      
      const session = SessionStorageService.getCurrentSession();
      expect(session).toBeNull();
    });
  });

  describe('createSession', () => {
    it('should create and store a new session', () => {
      const session = SessionStorageService.createSession();
      
      expect(session).toHaveProperty('sessionId');
      expect(session).toHaveProperty('createdAt');
      expect(session).toHaveProperty('lastActivity');
      expect(session.sessionId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'cv_session',
        JSON.stringify(session)
      );
    });

    it('should create unique session IDs', () => {
      const session1 = SessionStorageService.createSession();
      const session2 = SessionStorageService.createSession();
      
      expect(session1.sessionId).not.toBe(session2.sessionId);
    });
  });

  describe('updateActivity', () => {
    it('should update last activity timestamp', () => {
      const mockSession = {
        sessionId: '123e4567-e89b-12d3-a456-426614174000',
        createdAt: '2023-01-01T00:00:00.000Z',
        lastActivity: '2023-01-01T01:00:00.000Z',
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockSession));
      
      const updatedSession = SessionStorageService.updateActivity();
      
      expect(updatedSession).toBeDefined();
      expect(updatedSession!.sessionId).toBe(mockSession.sessionId);
      expect(updatedSession!.createdAt).toBe(mockSession.createdAt);
      expect(updatedSession!.lastActivity).not.toBe(mockSession.lastActivity);
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'cv_session',
        JSON.stringify(updatedSession)
      );
    });

    it('should return null when no session exists', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const result = SessionStorageService.updateActivity();
      expect(result).toBeNull();
    });

    it('should create new session if current is expired', () => {
      const expiredSession = {
        sessionId: '123e4567-e89b-12d3-a456-426614174000',
        createdAt: '2023-01-01T00:00:00.000Z',
        lastActivity: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(expiredSession));
      
      const result = SessionStorageService.updateActivity();
      expect(result).toBeDefined();
      expect(result!.sessionId).not.toBe(expiredSession.sessionId);
    });
  });

  describe('clearSession', () => {
    it('should remove session from localStorage', () => {
      SessionStorageService.clearSession();
      
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('cv_session');
    });
  });

  describe('getOrCreateSession', () => {
    it('should return existing valid session', () => {
      const mockSession = {
        sessionId: '123e4567-e89b-12d3-a456-426614174000',
        createdAt: '2023-01-01T00:00:00.000Z',
        lastActivity: new Date().toISOString(),
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockSession));
      
      const session = SessionStorageService.getOrCreateSession();
      expect(session).toEqual(mockSession);
    });

    it('should create new session when none exists', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const session = SessionStorageService.getOrCreateSession();
      expect(session).toHaveProperty('sessionId');
      expect(session).toHaveProperty('createdAt');
      expect(session).toHaveProperty('lastActivity');
    });

    it('should create new session when existing is expired', () => {
      const expiredSession = {
        sessionId: '123e4567-e89b-12d3-a456-426614174000',
        createdAt: '2023-01-01T00:00:00.000Z',
        lastActivity: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(expiredSession));
      
      const session = SessionStorageService.getOrCreateSession();
      expect(session.sessionId).not.toBe(expiredSession.sessionId);
    });
  });

  describe('isSessionValid', () => {
    it('should return true for valid session', () => {
      const validSession = {
        sessionId: '123e4567-e89b-12d3-a456-426614174000',
        createdAt: '2023-01-01T00:00:00.000Z',
        lastActivity: new Date().toISOString(),
      };

      const isValid = SessionStorageService.isSessionValid(validSession);
      expect(isValid).toBe(true);
    });

    it('should return false for expired session', () => {
      const expiredSession = {
        sessionId: '123e4567-e89b-12d3-a456-426614174000',
        createdAt: '2023-01-01T00:00:00.000Z',
        lastActivity: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
      };

      const isValid = SessionStorageService.isSessionValid(expiredSession);
      expect(isValid).toBe(false);
    });

    it('should return false for invalid session ID', () => {
      const invalidSession = {
        sessionId: 'invalid-uuid',
        createdAt: '2023-01-01T00:00:00.000Z',
        lastActivity: new Date().toISOString(),
      };

      const isValid = SessionStorageService.isSessionValid(invalidSession);
      expect(isValid).toBe(false);
    });

    it('should return false for null session', () => {
      const isValid = SessionStorageService.isSessionValid(null);
      expect(isValid).toBe(false);
    });
  });

  describe('getSessionAge', () => {
    it('should return correct session age in milliseconds', () => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const session = {
        sessionId: '123e4567-e89b-12d3-a456-426614174000',
        createdAt: oneHourAgo.toISOString(),
        lastActivity: new Date().toISOString(),
      };

      const age = SessionStorageService.getSessionAge(session);
      expect(age).toBeGreaterThan(60 * 60 * 1000 - 1000); // Allow 1 second tolerance
      expect(age).toBeLessThan(60 * 60 * 1000 + 1000);
    });

    it('should return 0 for null session', () => {
      const age = SessionStorageService.getSessionAge(null);
      expect(age).toBe(0);
    });

    it('should return 0 for invalid date', () => {
      const invalidSession = {
        sessionId: '123e4567-e89b-12d3-a456-426614174000',
        createdAt: 'invalid-date',
        lastActivity: new Date().toISOString(),
      };

      const age = SessionStorageService.getSessionAge(invalidSession);
      expect(age).toBe(0);
    });
  });

  describe('cleanup', () => {
    it('should remove expired sessions', () => {
      const expiredSession = {
        sessionId: '123e4567-e89b-12d3-a456-426614174000',
        createdAt: '2023-01-01T00:00:00.000Z',
        lastActivity: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(expiredSession));
      
      SessionStorageService.cleanup();
      
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('cv_session');
    });

    it('should keep valid sessions', () => {
      const validSession = {
        sessionId: '123e4567-e89b-12d3-a456-426614174000',
        createdAt: '2023-01-01T00:00:00.000Z',
        lastActivity: new Date().toISOString(),
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(validSession));
      
      SessionStorageService.cleanup();
      
      expect(localStorageMock.removeItem).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle localStorage errors gracefully', () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      expect(() => SessionStorageService.createSession()).not.toThrow();
    });

    it('should handle JSON parse errors gracefully', () => {
      localStorageMock.getItem.mockReturnValue('{"invalid": json}');
      
      const session = SessionStorageService.getCurrentSession();
      expect(session).toBeNull();
    });
  });
});