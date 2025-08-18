/**
 * Tests for the notification store
 */

import { act, renderHook } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useNotificationStore, useNotifications } from '../notificationStore';

// Mock setTimeout and clearTimeout
vi.useFakeTimers();

describe('Notification Store', () => {
  beforeEach(() => {
    // Reset store state
    act(() => {
      useNotificationStore.getState().clearNotifications();
    });
    
    vi.clearAllTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.useFakeTimers();
  });

  describe('Basic Notification Management', () => {
    it('should add notification with unique ID and timestamp', () => {
      const { result } = renderHook(() => useNotificationStore());

      act(() => {
        result.current.addNotification({
          type: 'success',
          title: 'Test Success',
          message: 'Test message',
        });
      });

      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0]).toMatchObject({
        type: 'success',
        title: 'Test Success',
        message: 'Test message',
        duration: 5000,
      });
      expect(result.current.notifications[0].id).toMatch(/^notification_\d+_[a-z0-9]+$/);
      expect(result.current.notifications[0].timestamp).toBeInstanceOf(Date);
    });

    it('should remove specific notification', () => {
      const { result } = renderHook(() => useNotificationStore());

      act(() => {
        result.current.addNotification({
          type: 'success',
          title: 'Notification 1',
        });
        result.current.addNotification({
          type: 'error',
          title: 'Notification 2',
        });
      });

      const notificationId = result.current.notifications[0].id;

      act(() => {
        result.current.removeNotification(notificationId);
      });

      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0].title).toBe('Notification 2');
    });

    it('should clear all notifications', () => {
      const { result } = renderHook(() => useNotificationStore());

      act(() => {
        result.current.addNotification({ type: 'success', title: 'Test 1' });
        result.current.addNotification({ type: 'error', title: 'Test 2' });
      });

      act(() => {
        result.current.clearNotifications();
      });

      expect(result.current.notifications).toHaveLength(0);
    });

    it('should clear notifications by type', () => {
      const { result } = renderHook(() => useNotificationStore());

      act(() => {
        result.current.addNotification({ type: 'success', title: 'Success 1' });
        result.current.addNotification({ type: 'success', title: 'Success 2' });
        result.current.addNotification({ type: 'error', title: 'Error 1' });
      });

      act(() => {
        result.current.clearNotificationsByType('success');
      });

      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0].type).toBe('error');
    });
  });

  describe('Auto-removal', () => {
    it('should auto-remove notification after default duration', () => {
      const { result } = renderHook(() => useNotificationStore());

      act(() => {
        result.current.addNotification({
          type: 'info',
          title: 'Auto-remove test',
        });
      });

      expect(result.current.notifications).toHaveLength(1);

      // Fast-forward time by 5 seconds (default duration)
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(result.current.notifications).toHaveLength(0);
    });

    it('should auto-remove notification after custom duration', () => {
      const { result } = renderHook(() => useNotificationStore());

      act(() => {
        result.current.addNotification({
          type: 'warning',
          title: 'Custom duration test',
          duration: 3000,
        });
      });

      expect(result.current.notifications).toHaveLength(1);

      // Fast-forward time by 2.5 seconds (less than duration)
      act(() => {
        vi.advanceTimersByTime(2500);
      });

      expect(result.current.notifications).toHaveLength(1);

      // Fast-forward time by another 1 second (total 3.5 seconds)
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.notifications).toHaveLength(0);
    });

    it('should not auto-remove persistent notifications', () => {
      const { result } = renderHook(() => useNotificationStore());

      act(() => {
        result.current.addNotification({
          type: 'error',
          title: 'Persistent notification',
          duration: 0, // Persistent
        });
      });

      expect(result.current.notifications).toHaveLength(1);

      // Fast-forward time by a long duration
      act(() => {
        vi.advanceTimersByTime(10000);
      });

      expect(result.current.notifications).toHaveLength(1);
    });
  });

  describe('useNotifications Hook', () => {
    it('should provide convenience methods for different notification types', () => {
      const { result } = renderHook(() => useNotifications());

      act(() => {
        result.current.showSuccess('Success Title', 'Success message');
      });

      act(() => {
        result.current.showError('Error Title', 'Error message');
      });

      act(() => {
        result.current.showWarning('Warning Title', 'Warning message');
      });

      act(() => {
        result.current.showInfo('Info Title', 'Info message');
      });

      expect(result.current.notifications).toHaveLength(4);
      expect(result.current.notifications[0].type).toBe('success');
      expect(result.current.notifications[1].type).toBe('error');
      expect(result.current.notifications[2].type).toBe('warning');
      expect(result.current.notifications[3].type).toBe('info');
    });

    it('should make error notifications persistent by default', () => {
      const { result } = renderHook(() => useNotifications());

      act(() => {
        result.current.showError('Error Title');
      });

      expect(result.current.notifications[0].duration).toBe(0);

      // Fast-forward time
      act(() => {
        vi.advanceTimersByTime(10000);
      });

      expect(result.current.notifications).toHaveLength(1);
    });

    it('should allow custom duration for error notifications', () => {
      const { result } = renderHook(() => useNotifications());

      act(() => {
        result.current.showError('Error Title', 'Error message', 3000);
      });

      expect(result.current.notifications[0].duration).toBe(3000);

      // Fast-forward time
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(result.current.notifications).toHaveLength(0);
    });

    it('should provide access to store methods', () => {
      const { result } = renderHook(() => useNotifications());

      expect(typeof result.current.removeNotification).toBe('function');
      expect(typeof result.current.clearNotifications).toBe('function');
      expect(typeof result.current.showSuccess).toBe('function');
      expect(typeof result.current.showError).toBe('function');
      expect(typeof result.current.showWarning).toBe('function');
      expect(typeof result.current.showInfo).toBe('function');
    });
  });

  describe('Multiple Notifications', () => {
    it('should handle multiple notifications with different durations', () => {
      const { result } = renderHook(() => useNotifications());

      act(() => {
        result.current.showSuccess('Success 1', undefined, 2000);
        result.current.showInfo('Info 1', undefined, 4000);
        result.current.showError('Error 1'); // Persistent
      });

      expect(result.current.notifications).toHaveLength(3);

      // After 2 seconds, success should be removed
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(result.current.notifications).toHaveLength(2);
      expect(result.current.notifications.find(n => n.title === 'Success 1')).toBeUndefined();

      // After 4 seconds total, info should be removed
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0].title).toBe('Error 1');
    });

    it('should handle rapid notification additions', () => {
      const { result } = renderHook(() => useNotificationStore());

      act(() => {
        for (let i = 0; i < 10; i++) {
          result.current.addNotification({
            type: 'info',
            title: `Notification ${i}`,
            duration: 1000,
          });
        }
      });

      expect(result.current.notifications).toHaveLength(10);

      // All should be removed after 1 second
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.notifications).toHaveLength(0);
    });
  });
});