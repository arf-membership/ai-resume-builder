/**
 * Performance monitoring and analytics service
 * Tracks application performance metrics and user interactions
 */

// Performance monitoring configuration
const PERFORMANCE_CONFIG = {
  // Metrics collection
  COLLECT_METRICS: true,
  BATCH_SIZE: 50,
  FLUSH_INTERVAL: 30000, // 30 seconds
  
  // Thresholds for performance alerts
  SLOW_OPERATION_THRESHOLD: 2000, // 2 seconds
  MEMORY_USAGE_THRESHOLD: 100 * 1024 * 1024, // 100MB
  
  // Sampling rates
  ERROR_SAMPLING_RATE: 1.0, // 100% of errors
  PERFORMANCE_SAMPLING_RATE: 0.1, // 10% of performance events
  USER_INTERACTION_SAMPLING_RATE: 0.05, // 5% of user interactions
  
  // Storage
  STORAGE_KEY: 'cv_performance_metrics',
  MAX_STORED_METRICS: 1000,
} as const;

// Metric types
interface BaseMetric {
  id: string;
  timestamp: number;
  sessionId: string;
  type: string;
}

interface PerformanceMetric extends BaseMetric {
  type: 'performance';
  operation: string;
  duration: number;
  success: boolean;
  metadata?: Record<string, any>;
}

interface ErrorMetric extends BaseMetric {
  type: 'error';
  error: string;
  stack?: string;
  component?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface UserInteractionMetric extends BaseMetric {
  type: 'interaction';
  action: string;
  element: string;
  page: string;
  metadata?: Record<string, any>;
}

interface ResourceMetric extends BaseMetric {
  type: 'resource';
  resourceType: 'memory' | 'network' | 'storage';
  value: number;
  unit: string;
}

interface PageLoadMetric extends BaseMetric {
  type: 'pageload';
  page: string;
  loadTime: number;
  resources: {
    scripts: number;
    stylesheets: number;
    images: number;
    total: number;
  };
}

type Metric = PerformanceMetric | ErrorMetric | UserInteractionMetric | ResourceMetric | PageLoadMetric;

// Performance observer for Web Vitals
// interface _WebVitalsMetric { // Commented out as it's not used yet
//   name: string;
//   value: number;
//   rating: 'good' | 'needs-improvement' | 'poor';
//   delta: number;
// }

/**
 * Performance monitoring service
 */
export class PerformanceMonitoringService {
  private static instance: PerformanceMonitoringService;
  private metrics: Metric[] = [];
  private sessionId: string = '';
  private flushTimer: NodeJS.Timeout | null = null;
  private performanceObserver: PerformanceObserver | null = null;
  private isInitialized = false;

  private constructor() {
    this.generateSessionId();
    this.initialize();
  }

  static getInstance(): PerformanceMonitoringService {
    if (!PerformanceMonitoringService.instance) {
      PerformanceMonitoringService.instance = new PerformanceMonitoringService();
    }
    return PerformanceMonitoringService.instance;
  }

  /**
   * Initialize performance monitoring
   */
  private initialize(): void {
    if (this.isInitialized || !PERFORMANCE_CONFIG.COLLECT_METRICS) {
      return;
    }

    try {
      // Set up periodic flushing
      this.flushTimer = setInterval(() => {
        this.flushMetrics();
      }, PERFORMANCE_CONFIG.FLUSH_INTERVAL);

      // Set up performance observer for navigation and resource timing
      if (typeof PerformanceObserver !== 'undefined') {
        this.performanceObserver = new PerformanceObserver((list) => {
          this.handlePerformanceEntries(list.getEntries());
        });

        this.performanceObserver.observe({
          entryTypes: ['navigation', 'resource', 'measure', 'paint']
        });
      }

      // Monitor memory usage
      this.startMemoryMonitoring();

      // Set up error tracking
      this.setupErrorTracking();

      // Track page load performance
      this.trackPageLoad();

      // Set up Web Vitals tracking
      this.setupWebVitals();

      this.isInitialized = true;
      console.log('Performance monitoring initialized');

    } catch (error) {
      console.warn('Failed to initialize performance monitoring:', error);
    }
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): void {
    this.sessionId = `perf_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Create base metric object
   */
  private createBaseMetric(type: string): BaseMetric {
    return {
      id: `${type}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      type,
    };
  }

  /**
   * Add metric to collection
   */
  private addMetric(metric: Metric): void {
    if (!this.shouldSampleMetric(metric)) {
      return;
    }

    this.metrics.push(metric);

    // Prevent memory leaks by limiting stored metrics
    if (this.metrics.length > PERFORMANCE_CONFIG.MAX_STORED_METRICS) {
      this.metrics = this.metrics.slice(-PERFORMANCE_CONFIG.MAX_STORED_METRICS);
    }

    // Auto-flush if batch size reached
    if (this.metrics.length >= PERFORMANCE_CONFIG.BATCH_SIZE) {
      this.flushMetrics();
    }
  }

  /**
   * Determine if metric should be sampled
   */
  private shouldSampleMetric(metric: Metric): boolean {
    switch (metric.type) {
      case 'error':
        return Math.random() < PERFORMANCE_CONFIG.ERROR_SAMPLING_RATE;
      case 'performance':
        return Math.random() < PERFORMANCE_CONFIG.PERFORMANCE_SAMPLING_RATE;
      case 'interaction':
        return Math.random() < PERFORMANCE_CONFIG.USER_INTERACTION_SAMPLING_RATE;
      default:
        return true;
    }
  }

  /**
   * Track performance of an operation
   */
  trackOperation<T>(
    operationName: string,
    operation: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const startTime = performance.now();
    
    return operation()
      .then((result) => {
        const duration = performance.now() - startTime;
        
        const metric: PerformanceMetric = {
          ...this.createBaseMetric('performance'),
          type: 'performance',
          operation: operationName,
          duration,
          success: true,
          metadata,
        };

        this.addMetric(metric);

        // Alert on slow operations
        if (duration > PERFORMANCE_CONFIG.SLOW_OPERATION_THRESHOLD) {
          console.warn(`Slow operation detected: ${operationName} took ${duration.toFixed(2)}ms`);
        }

        return result;
      })
      .catch((error) => {
        const duration = performance.now() - startTime;
        
        const performanceMetric: PerformanceMetric = {
          ...this.createBaseMetric('performance'),
          type: 'performance',
          operation: operationName,
          duration,
          success: false,
          metadata,
        };

        this.addMetric(performanceMetric);

        // Also track as error
        this.trackError(error instanceof Error ? error : new Error(String(error)), 'high', operationName);

        throw error;
      });
  }

  /**
   * Track synchronous operation performance
   */
  trackSyncOperation<T>(
    operationName: string,
    operation: () => T,
    metadata?: Record<string, any>
  ): T {
    const startTime = performance.now();
    
    try {
      const result = operation();
      const duration = performance.now() - startTime;
      
      const metric: PerformanceMetric = {
        ...this.createBaseMetric('performance'),
        type: 'performance',
        operation: operationName,
        duration,
        success: true,
        metadata,
      };

      this.addMetric(metric);

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      const performanceMetric: PerformanceMetric = {
        ...this.createBaseMetric('performance'),
        type: 'performance',
        operation: operationName,
        duration,
        success: false,
        metadata,
      };

      this.addMetric(performanceMetric);
      this.trackError(error instanceof Error ? error : new Error(String(error)), 'high', operationName);

      throw error;
    }
  }

  /**
   * Track errors
   */
  trackError(
    error: Error | string,
    severity: ErrorMetric['severity'] = 'medium',
    component?: string
  ): void {
    const errorMessage = error instanceof Error ? error.message : error;
    const stack = error instanceof Error ? error.stack : undefined;

    const metric: ErrorMetric = {
      ...this.createBaseMetric('error'),
      type: 'error',
      error: errorMessage,
      stack,
      component,
      severity,
    };

    this.addMetric(metric);

    // Log critical errors immediately
    if (severity === 'critical') {
      console.error('Critical error tracked:', errorMessage, stack);
    }
  }

  /**
   * Track user interactions
   */
  trackUserInteraction(
    action: string,
    element: string,
    page: string = window.location.pathname,
    metadata?: Record<string, any>
  ): void {
    const metric: UserInteractionMetric = {
      ...this.createBaseMetric('interaction'),
      type: 'interaction',
      action,
      element,
      page,
      metadata,
    };

    this.addMetric(metric);
  }

  /**
   * Track resource usage
   */
  trackResourceUsage(
    resourceType: ResourceMetric['resourceType'],
    value: number,
    unit: string
  ): void {
    const metric: ResourceMetric = {
      ...this.createBaseMetric('resource'),
      type: 'resource',
      resourceType,
      value,
      unit,
    };

    this.addMetric(metric);

    // Alert on high memory usage
    if (resourceType === 'memory' && value > PERFORMANCE_CONFIG.MEMORY_USAGE_THRESHOLD) {
      console.warn(`High memory usage detected: ${(value / 1024 / 1024).toFixed(2)}MB`);
    }
  }

  /**
   * Handle performance entries from PerformanceObserver
   */
  private handlePerformanceEntries(entries: PerformanceEntry[]): void {
    entries.forEach((entry) => {
      if (entry.entryType === 'navigation') {
        this.trackNavigationTiming(entry as PerformanceNavigationTiming);
      } else if (entry.entryType === 'resource') {
        this.trackResourceTiming(entry as PerformanceResourceTiming);
      } else if (entry.entryType === 'measure') {
        this.trackCustomMeasure(entry);
      } else if (entry.entryType === 'paint') {
        this.trackPaintTiming(entry);
      }
    });
  }

  /**
   * Track navigation timing
   */
  private trackNavigationTiming(entry: PerformanceNavigationTiming): void {
    const loadTime = entry.loadEventEnd - (entry as any).navigationStart;
    
    const metric: PageLoadMetric = {
      ...this.createBaseMetric('pageload'),
      type: 'pageload',
      page: window.location.pathname,
      loadTime,
      resources: {
        scripts: 0, // Would need to count from resource entries
        stylesheets: 0,
        images: 0,
        total: 0,
      },
    };

    this.addMetric(metric);
  }

  /**
   * Track resource timing
   */
  private trackResourceTiming(entry: PerformanceResourceTiming): void {
    const duration = entry.responseEnd - entry.requestStart;
    
    if (duration > 1000) { // Only track slow resources
      this.trackOperation(
        `resource_load_${entry.initiatorType}`,
        async () => Promise.resolve(),
        {
          url: entry.name,
          size: entry.transferSize,
          cached: entry.transferSize === 0,
        }
      );
    }
  }

  /**
   * Track custom measures
   */
  private trackCustomMeasure(entry: PerformanceEntry): void {
    const metric: PerformanceMetric = {
      ...this.createBaseMetric('performance'),
      type: 'performance',
      operation: `measure_${entry.name}`,
      duration: entry.duration,
      success: true,
    };

    this.addMetric(metric);
  }

  /**
   * Track paint timing
   */
  private trackPaintTiming(entry: PerformanceEntry): void {
    const metric: PerformanceMetric = {
      ...this.createBaseMetric('performance'),
      type: 'performance',
      operation: `paint_${entry.name}`,
      duration: entry.startTime,
      success: true,
    };

    this.addMetric(metric);
  }

  /**
   * Set up error tracking
   */
  private setupErrorTracking(): void {
    // Global error handler
    window.addEventListener('error', (event) => {
      this.trackError(event.error || event.message, 'high', 'global');
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.trackError(event.reason, 'high', 'promise');
    });
  }

  /**
   * Track page load performance
   */
  private trackPageLoad(): void {
    if (document.readyState === 'complete') {
      this.measurePageLoad();
    } else {
      window.addEventListener('load', () => {
        this.measurePageLoad();
      });
    }
  }

  /**
   * Measure page load metrics
   */
  private measurePageLoad(): void {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    if (navigation) {
      const metrics = {
                domContentLoaded: navigation.domContentLoadedEventEnd - (navigation as any).navigationStart,
        loadComplete: navigation.loadEventEnd - (navigation as any).navigationStart,      
        firstByte: navigation.responseStart - (navigation as any).navigationStart,        
        domInteractive: navigation.domInteractive - (navigation as any).navigationStart,
      };

      Object.entries(metrics).forEach(([name, value]) => {
        this.trackSyncOperation(`pageload_${name}`, () => value);
      });
    }
  }

  /**
   * Set up Web Vitals tracking
   */
  private setupWebVitals(): void {
    // This would integrate with web-vitals library if available
    // For now, we'll track basic metrics
    
    // Track First Contentful Paint
    const paintEntries = performance.getEntriesByType('paint');
    paintEntries.forEach((entry) => {
      if (entry.name === 'first-contentful-paint') {
        this.trackSyncOperation('web_vital_fcp', () => entry.startTime);
      }
    });
  }

  /**
   * Start memory monitoring
   */
  private startMemoryMonitoring(): void {
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        if (memory) {
          this.trackResourceUsage('memory', memory.usedJSHeapSize, 'bytes');
        }
      }, 30000); // Every 30 seconds
    }
  }

  /**
   * Flush metrics to storage or analytics service
   */
  private flushMetrics(): void {
    if (this.metrics.length === 0) {
      return;
    }

    try {
      // Store in localStorage for now
      // In production, this would send to analytics service
      const stored = localStorage.getItem(PERFORMANCE_CONFIG.STORAGE_KEY);
      const existingMetrics = stored ? JSON.parse(stored) : [];
      
      const allMetrics = [...existingMetrics, ...this.metrics];
      
      // Keep only recent metrics
      const recentMetrics = allMetrics.slice(-PERFORMANCE_CONFIG.MAX_STORED_METRICS);
      
      localStorage.setItem(PERFORMANCE_CONFIG.STORAGE_KEY, JSON.stringify(recentMetrics));
      
      console.log(`Flushed ${this.metrics.length} performance metrics`);
      
      // Clear current batch
      this.metrics = [];

    } catch (error) {
      console.warn('Failed to flush performance metrics:', error);
    }
  }

  /**
   * Get performance statistics
   */
  getStats(): {
    totalMetrics: number;
    errorCount: number;
    averageOperationTime: number;
    slowOperations: string[];
    memoryUsage?: number;
  } {
    const errorMetrics = this.metrics.filter(m => m.type === 'error');
    const performanceMetrics = this.metrics.filter(m => m.type === 'performance') as PerformanceMetric[];
    
    const averageOperationTime = performanceMetrics.length > 0
      ? performanceMetrics.reduce((sum, m) => sum + m.duration, 0) / performanceMetrics.length
      : 0;

    const slowOperations = performanceMetrics
      .filter(m => m.duration > PERFORMANCE_CONFIG.SLOW_OPERATION_THRESHOLD)
      .map(m => m.operation);

    let memoryUsage: number | undefined;
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      memoryUsage = memory?.usedJSHeapSize;
    }

    return {
      totalMetrics: this.metrics.length,
      errorCount: errorMetrics.length,
      averageOperationTime,
      slowOperations,
      memoryUsage,
    };
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics(): Metric[] {
    return [...this.metrics];
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics = [];
    localStorage.removeItem(PERFORMANCE_CONFIG.STORAGE_KEY);
  }

  /**
   * Cleanup and stop monitoring
   */
  cleanup(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
      this.performanceObserver = null;
    }

    this.flushMetrics();
    this.isInitialized = false;
  }
}

// Export singleton instance
export const performanceMonitoring = PerformanceMonitoringService.getInstance();

// Convenience functions
export const trackOperation = performanceMonitoring.trackOperation.bind(performanceMonitoring);
export const trackSyncOperation = performanceMonitoring.trackSyncOperation.bind(performanceMonitoring);
export const trackError = performanceMonitoring.trackError.bind(performanceMonitoring);
export const trackUserInteraction = performanceMonitoring.trackUserInteraction.bind(performanceMonitoring);