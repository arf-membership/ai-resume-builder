/**
 * Performance optimization hook
 * Provides utilities for monitoring and optimizing component performance
 */

import { useEffect, useCallback, useRef, useMemo } from 'react';
import { performanceMonitoring, trackOperation, trackUserInteraction } from '../services/performanceMonitoringService';
import { CacheService } from '../services/cacheService';

interface PerformanceOptimizationOptions {
  componentName?: string;
  trackRenders?: boolean;
  trackInteractions?: boolean;
  enableCaching?: boolean;
  cacheKey?: string;
}

interface PerformanceStats {
  renderCount: number;
  averageRenderTime: number;
  lastRenderTime: number;
  cacheHits: number;
  cacheMisses: number;
}

/**
 * Hook for performance optimization and monitoring
 */
export function usePerformanceOptimization(options: PerformanceOptimizationOptions = {}) {
  const {
    componentName = 'UnknownComponent',
    trackRenders = true,
    trackInteractions = true,
    enableCaching = false,
    cacheKey,
  } = options;

  const renderCountRef = useRef(0);
  const renderTimesRef = useRef<number[]>([]);
  const lastRenderTimeRef = useRef(0);
  const cacheStatsRef = useRef({ hits: 0, misses: 0 });

  // Track component renders
  useEffect(() => {
    if (trackRenders) {
      const renderStart = performance.now();
      renderCountRef.current++;

      return () => {
        const renderTime = performance.now() - renderStart;
        renderTimesRef.current.push(renderTime);
        lastRenderTimeRef.current = renderTime;

        // Keep only last 10 render times for average calculation
        if (renderTimesRef.current.length > 10) {
          renderTimesRef.current = renderTimesRef.current.slice(-10);
        }

        // Track slow renders (>16ms for 60fps)
        if (renderTime > 16) {
          performanceMonitoring.trackSyncOperation(
            `slow_render_${componentName}`,
            () => renderTime,
            {
              componentName,
              renderCount: renderCountRef.current,
              renderTime,
            }
          );
        }
      };
    }
  });

  // Memoized performance stats
  const performanceStats = useMemo((): PerformanceStats => {
    const renderTimes = renderTimesRef.current;
    const averageRenderTime = renderTimes.length > 0
      ? renderTimes.reduce((sum, time) => sum + time, 0) / renderTimes.length
      : 0;

    return {
      renderCount: renderCountRef.current,
      averageRenderTime,
      lastRenderTime: lastRenderTimeRef.current,
      cacheHits: cacheStatsRef.current.hits,
      cacheMisses: cacheStatsRef.current.misses,
    };
  }, [renderCountRef.current, renderTimesRef.current.length]);

  // Optimized event handler creator
  const createOptimizedHandler = useCallback(
    <T extends (...args: any[]) => any>(
      handler: T,
      eventName: string,
      debounceMs: number = 0
    ): T => {
      let timeoutId: NodeJS.Timeout | null = null;
      let lastCallTime = 0;

      return ((...args: Parameters<T>) => {
        const now = Date.now();

        // Clear existing timeout
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        const executeHandler = () => {
          if (trackInteractions) {
            trackUserInteraction(eventName, componentName, window.location.pathname, {
              timeSinceLastCall: now - lastCallTime,
              componentName,
            });
          }

          lastCallTime = now;
          return handler(...args);
        };

        if (debounceMs > 0) {
          timeoutId = setTimeout(executeHandler, debounceMs);
        } else {
          return executeHandler();
        }
      }) as T;
    },
    [componentName, trackInteractions]
  );

  // Cached computation helper
  const useCachedComputation = useCallback(
    <T>(
      computeFn: () => T,
      dependencies: any[],
      computationKey?: string
    ): T => {
      const key = computationKey || `${cacheKey || componentName}_${JSON.stringify(dependencies)}`;

      if (enableCaching) {
        // Try to get from cache first
        const cached = CacheService.getCachedSectionEditResult('', key, '', '');
        if (cached) {
          cacheStatsRef.current.hits++;
          return cached;
        }
      }

      // Compute the result
      const result = computeFn();

      if (enableCaching) {
        cacheStatsRef.current.misses++;
        // Cache the result (using section edit cache as a generic cache)
        CacheService.cacheSectionEditResult('', key, '', '', result);
      }

      return result;
    },
    [enableCaching, cacheKey, componentName]
  );

  // Async operation tracker
  const trackAsyncOperation = useCallback(
    async <T>(
      operationName: string,
      operation: () => Promise<T>,
      metadata?: Record<string, any>
    ): Promise<T> => {
      return trackOperation(
        `${componentName}_${operationName}`,
        operation,
        {
          componentName,
          ...metadata,
        }
      );
    },
    [componentName]
  );

  // Memory usage tracker
  const trackMemoryUsage = useCallback(() => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      if (memory) {
        performanceMonitoring.trackResourceUsage('memory', memory.usedJSHeapSize, 'bytes');
      }
    }
  }, []);

  // Intersection observer for lazy loading
  const useIntersectionObserver = useCallback(
    (
      callback: (isIntersecting: boolean) => void,
      options: IntersectionObserverInit = {}
    ) => {
      const elementRef = useRef<HTMLElement | null>(null);
      const observerRef = useRef<IntersectionObserver | null>(null);

      useEffect(() => {
        if (!elementRef.current) return;

        observerRef.current = new IntersectionObserver(
          (entries) => {
            const entry = entries[0];
            callback(entry.isIntersecting);

            if (trackInteractions && entry.isIntersecting) {
              trackUserInteraction('element_visible', componentName, window.location.pathname, {
                elementId: elementRef.current?.id,
                elementClass: elementRef.current?.className,
              });
            }
          },
          {
            threshold: 0.1,
            ...options,
          }
        );

        observerRef.current.observe(elementRef.current);

        return () => {
          if (observerRef.current) {
            observerRef.current.disconnect();
          }
        };
      }, [callback, options]);

      return elementRef;
    },
    [componentName, trackInteractions]
  );

  // Resize observer for responsive optimizations
  const useResizeObserver = useCallback(
    (callback: (entry: ResizeObserverEntry) => void) => {
      const elementRef = useRef<HTMLElement | null>(null);
      const observerRef = useRef<ResizeObserver | null>(null);

      useEffect(() => {
        if (!elementRef.current || !window.ResizeObserver) return;

        observerRef.current = new ResizeObserver((entries) => {
          const entry = entries[0];
          callback(entry);
        });

        observerRef.current.observe(elementRef.current);

        return () => {
          if (observerRef.current) {
            observerRef.current.disconnect();
          }
        };
      }, [callback]);

      return elementRef;
    },
    []
  );

  // Performance-optimized state updater
  const createOptimizedStateUpdater = useCallback(
    <T>(
      setState: React.Dispatch<React.SetStateAction<T>>,
      batchMs: number = 16 // One frame at 60fps
    ) => {
      let pendingUpdate: T | ((prev: T) => T) | null = null;
      let timeoutId: NodeJS.Timeout | null = null;

      return (update: T | ((prev: T) => T)) => {
        pendingUpdate = update;

        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        timeoutId = setTimeout(() => {
          if (pendingUpdate !== null) {
            setState(pendingUpdate);
            pendingUpdate = null;
          }
        }, batchMs);
      };
    },
    []
  );

  // Cleanup function
  const cleanup = useCallback(() => {
    // Clear any pending timeouts or intervals
    // This would be called in component unmount
    CacheService.clearExpiredCaches();
  }, []);

  return {
    // Performance stats
    performanceStats,

    // Optimization utilities
    createOptimizedHandler,
    useCachedComputation,
    trackAsyncOperation,
    trackMemoryUsage,
    useIntersectionObserver,
    useResizeObserver,
    createOptimizedStateUpdater,

    // Cleanup
    cleanup,

    // Direct access to services
    performanceMonitoring,
    cacheService: CacheService,
  };
}

/**
 * Hook for component-specific performance monitoring
 */
export function useComponentPerformance(componentName: string) {
  return usePerformanceOptimization({
    componentName,
    trackRenders: true,
    trackInteractions: true,
  });
}

/**
 * Hook for heavy computation optimization
 */
export function useComputationOptimization(componentName: string, cacheKey?: string) {
  return usePerformanceOptimization({
    componentName,
    enableCaching: true,
    cacheKey,
    trackRenders: false,
  });
}

/**
 * Hook for interaction tracking only
 */
export function useInteractionTracking(componentName: string) {
  return usePerformanceOptimization({
    componentName,
    trackRenders: false,
    trackInteractions: true,
  });
}