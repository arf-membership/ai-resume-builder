/**
 * Tests for PerformanceMonitoringService
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PerformanceMonitoringService } from '../performanceMonitoringService';

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

// Mock performance API
const performanceMock = {
  now: vi.fn(() => Date.now()),
  getEntriesByType: vi.fn(() => []),
  memory: {
    usedJSHeapSize: 50 * 1024 * 1024, // 50MB
  },
};

Object.defineProperty(window, 'performance', {
  value: performanceMock,
});

describe('PerformanceMonitoringService', () => {
  let service: PerformanceMonitoringService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = PerformanceMonitoringService.getInstance();
    localStorageMock.getItem.mockReturnValue(null);
  });

  describe('Operation Tracking', () => {
    it('should track successful operations', async () => {
      const operationName = 'test_operation';
      const expectedResult = 'success';

      const result = await service.trackOperation(
        operationName,
        async () => {
          // Simulate some work
          await new Promise(resolve => setTimeout(resolve, 10));
          return expectedResult;
        }
      );

      expect(result).toBe(expectedResult);

      const stats = service.getStats();
      expect(stats.totalMetrics).toBeGreaterThan(0);
    });

    it('should track failed operations', async () => {
      const operationName = 'failing_operation';
      const errorMessage = 'Operation failed';

      await expect(
        service.trackOperation(
          operationName,
          async () => {
            throw new Error(errorMessage);
          }
        )
      ).rejects.toThrow(errorMessage);

      const stats = service.getStats();
      expect(stats.errorCount).toBeGreaterThan(0);
    });

    it('should track synchronous operations', () => {
      const operationName = 'sync_operation';
      const expectedResult = 42;

      const result = service.trackSyncOperation(
        operationName,
        () => {
          // Simulate some computation
          return expectedResult;
        }
      );

      expect(result).toBe(expectedResult);

      const stats = service.getStats();
      expect(stats.totalMetrics).toBeGreaterThan(0);
    });
  });

  describe('Error Tracking', () => {
    it('should track errors with different severities', () => {
      const errorMessage = 'Test error';
      const component = 'TestComponent';

      service.trackError(new Error(errorMessage), 'high', component);

      const stats = service.getStats();
      expect(stats.errorCount).toBe(1);
    });

    it('should track string errors', () => {
      const errorMessage = 'String error message';

      service.trackError(errorMessage, 'medium');

      const stats = service.getStats();
      expect(stats.errorCount).toBe(1);
    });
  });

  describe('User Interaction Tracking', () => {
    it('should track user interactions', () => {
      const action = 'button_click';
      const element = 'submit_button';
      const page = '/test-page';

      service.trackUserInteraction(action, element, page);

      const stats = service.getStats();
      expect(stats.totalMetrics).toBeGreaterThan(0);
    });

    it('should track interactions with metadata', () => {
      const action = 'form_submit';
      const element = 'contact_form';
      const page = '/contact';
      const metadata = { formFields: 5, validationErrors: 0 };

      service.trackUserInteraction(action, element, page, metadata);

      const stats = service.getStats();
      expect(stats.totalMetrics).toBeGreaterThan(0);
    });
  });

  describe('Resource Usage Tracking', () => {
    it('should track memory usage', () => {
      const memoryUsage = 100 * 1024 * 1024; // 100MB
      const unit = 'bytes';

      service.trackResourceUsage('memory', memoryUsage, unit);

      const stats = service.getStats();
      expect(stats.totalMetrics).toBeGreaterThan(0);
    });

    it('should track network usage', () => {
      const networkUsage = 1024; // 1KB
      const unit = 'bytes';

      service.trackResourceUsage('network', networkUsage, unit);

      const stats = service.getStats();
      expect(stats.totalMetrics).toBeGreaterThan(0);
    });
  });

  describe('Performance Statistics', () => {
    it('should provide performance statistics', () => {
      // Add some test data
      service.trackSyncOperation('test_op_1', () => 'result1');
      service.trackSyncOperation('test_op_2', () => 'result2');
      service.trackError('Test error', 'low');

      const stats = service.getStats();

      expect(stats).toHaveProperty('totalMetrics');
      expect(stats).toHaveProperty('errorCount');
      expect(stats).toHaveProperty('averageOperationTime');
      expect(stats).toHaveProperty('slowOperations');
      expect(stats).toHaveProperty('memoryUsage');

      expect(typeof stats.totalMetrics).toBe('number');
      expect(typeof stats.errorCount).toBe('number');
      expect(typeof stats.averageOperationTime).toBe('number');
      expect(Array.isArray(stats.slowOperations)).toBe(true);
    });

    it('should export metrics', () => {
      service.trackSyncOperation('export_test', () => 'result');

      const metrics = service.exportMetrics();

      expect(Array.isArray(metrics)).toBe(true);
      expect(metrics.length).toBeGreaterThan(0);
      expect(metrics[0]).toHaveProperty('id');
      expect(metrics[0]).toHaveProperty('timestamp');
      expect(metrics[0]).toHaveProperty('type');
    });

    it('should clear metrics', () => {
      service.trackSyncOperation('clear_test', () => 'result');

      let stats = service.getStats();
      expect(stats.totalMetrics).toBeGreaterThan(0);

      service.clearMetrics();

      stats = service.getStats();
      expect(stats.totalMetrics).toBe(0);
    });
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = PerformanceMonitoringService.getInstance();
      const instance2 = PerformanceMonitoringService.getInstance();

      expect(instance1).toBe(instance2);
    });
  });
});