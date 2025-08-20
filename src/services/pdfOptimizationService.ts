/**
 * PDF rendering optimization service with virtual scrolling and caching
 * Provides efficient PDF rendering for large documents
 */

import { pdfjs } from 'react-pdf';
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';

// Configuration for PDF optimization
const PDF_CONFIG = {
  // Virtual scrolling
  VIEWPORT_BUFFER: 2, // Number of pages to render outside viewport
  PAGE_CACHE_SIZE: 10, // Maximum number of cached page renders
  
  // Rendering optimization
  DEFAULT_SCALE: 1.0,
  MIN_SCALE: 0.25,
  MAX_SCALE: 3.0,
  SCALE_STEP: 0.25,
  
  // Performance thresholds
  LARGE_DOCUMENT_THRESHOLD: 10, // Pages
  RENDER_TIMEOUT: 30000, // 30 seconds
  
  // Canvas optimization
  MAX_CANVAS_SIZE: 4096, // Maximum canvas dimension
  DEVICE_PIXEL_RATIO_LIMIT: 2, // Limit for high-DPI displays
} as const;

interface PageRenderCache {
  canvas: HTMLCanvasElement;
  scale: number;
  timestamp: number;
}

interface ViewportInfo {
  startPage: number;
  endPage: number;
  visiblePages: number[];
}

interface RenderTask {
  pageNumber: number;
  scale: number;
  priority: number;
  abortController: AbortController;
}

/**
 * PDF page renderer with caching and optimization
 */
class PDFPageRenderer {
  private cache = new Map<string, PageRenderCache>();
  private renderQueue: RenderTask[] = [];
  private isRendering = false;
  private maxCacheSize: number;

  constructor(maxCacheSize: number = PDF_CONFIG.PAGE_CACHE_SIZE) {
    this.maxCacheSize = maxCacheSize;
  }

  /**
   * Generate cache key for a page render
   */
  private getCacheKey(pageNumber: number, scale: number): string {
    return `${pageNumber}_${scale.toFixed(2)}`;
  }

  /**
   * Check if page render is cached
   */
  hasCachedRender(pageNumber: number, scale: number): boolean {
    const key = this.getCacheKey(pageNumber, scale);
    return this.cache.has(key);
  }

  /**
   * Get cached page render
   */
  getCachedRender(pageNumber: number, scale: number): HTMLCanvasElement | null {
    const key = this.getCacheKey(pageNumber, scale);
    const cached = this.cache.get(key);
    
    if (cached) {
      // Update timestamp for LRU
      cached.timestamp = Date.now();
      return cached.canvas;
    }
    
    return null;
  }

  /**
   * Cache a page render
   */
  cacheRender(pageNumber: number, scale: number, canvas: HTMLCanvasElement): void {
    const key = this.getCacheKey(pageNumber, scale);
    
    // Clean up old cache entries if at capacity
    if (this.cache.size >= this.maxCacheSize) {
      this.cleanupCache();
    }

    // Clone canvas for caching
    const cachedCanvas = document.createElement('canvas');
    cachedCanvas.width = canvas.width;
    cachedCanvas.height = canvas.height;
    const ctx = cachedCanvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(canvas, 0, 0);
    }

    this.cache.set(key, {
      canvas: cachedCanvas,
      scale,
      timestamp: Date.now(),
    });
  }

  /**
   * Clean up old cache entries (LRU)
   */
  private cleanupCache(): void {
    if (this.cache.size === 0) return;

    // Find oldest entry
    let oldestKey = '';
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Clear all cached renders
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; maxSize: number; keys: string[] } {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      keys: Array.from(this.cache.keys()),
    };
  }
}

/**
 * Virtual scrolling manager for PDF pages
 */
class VirtualScrollManager {
  private containerHeight: number = 0;
  private pageHeight: number = 0;
  private totalPages: number = 0;
  private scrollTop: number = 0;

  constructor() {
    this.updateDimensions = this.updateDimensions.bind(this);
  }

  /**
   * Update container and page dimensions
   */
  updateDimensions(
    containerHeight: number,
    pageHeight: number,
    totalPages: number
  ): void {
    this.containerHeight = containerHeight;
    this.pageHeight = pageHeight;
    this.totalPages = totalPages;
  }

  /**
   * Update scroll position
   */
  updateScrollPosition(scrollTop: number): void {
    this.scrollTop = scrollTop;
  }

  /**
   * Calculate which pages should be visible
   */
  getViewportInfo(): ViewportInfo {
    if (this.pageHeight === 0 || this.totalPages === 0) {
      return {
        startPage: 1,
        endPage: 1,
        visiblePages: [1],
      };
    }

    // Calculate visible page range
    const startPage = Math.max(
      1,
      Math.floor(this.scrollTop / this.pageHeight) + 1 - PDF_CONFIG.VIEWPORT_BUFFER
    );
    
    const endPage = Math.min(
      this.totalPages,
      Math.ceil((this.scrollTop + this.containerHeight) / this.pageHeight) + PDF_CONFIG.VIEWPORT_BUFFER
    );

    // Generate array of visible page numbers
    const visiblePages: number[] = [];
    for (let i = startPage; i <= endPage; i++) {
      visiblePages.push(i);
    }

    return {
      startPage,
      endPage,
      visiblePages,
    };
  }

  /**
   * Calculate total document height for virtual scrolling
   */
  getTotalHeight(): number {
    return this.totalPages * this.pageHeight;
  }

  /**
   * Calculate offset for a specific page
   */
  getPageOffset(pageNumber: number): number {
    return (pageNumber - 1) * this.pageHeight;
  }
}

/**
 * Main PDF optimization service
 */
export class PDFOptimizationService {
  private pageRenderer: PDFPageRenderer;
  private virtualScroll: VirtualScrollManager;
  private document: PDFDocumentProxy | null = null;
  private currentScale: number = PDF_CONFIG.DEFAULT_SCALE;
  private renderQueue: RenderTask[] = [];
  private isProcessingQueue = false;

  constructor() {
    this.pageRenderer = new PDFPageRenderer();
    this.virtualScroll = new VirtualScrollManager();
  }

  /**
   * Initialize with PDF document
   */
  async initialize(pdfDocument: PDFDocumentProxy): Promise<void> {
    this.document = pdfDocument;
    
    // Get first page to calculate dimensions
    if (pdfDocument.numPages > 0) {
      const firstPage = await pdfDocument.getPage(1);
      const viewport = firstPage.getViewport({ scale: this.currentScale });
      
      // Update virtual scroll manager
      this.virtualScroll.updateDimensions(
        0, // Will be updated by container
        viewport.height,
        pdfDocument.numPages
      );
    }
  }

  /**
   * Update container dimensions
   */
  updateContainerDimensions(width: number, height: number): void {
    if (this.document) {
      this.virtualScroll.updateDimensions(
        height,
        this.virtualScroll.getPageOffset(2) - this.virtualScroll.getPageOffset(1), // Current page height
        this.document.numPages
      );
    }
  }

  /**
   * Update scroll position and get visible pages
   */
  updateScrollPosition(scrollTop: number): ViewportInfo {
    this.virtualScroll.updateScrollPosition(scrollTop);
    return this.virtualScroll.getViewportInfo();
  }

  /**
   * Optimize scale based on container width
   */
  calculateOptimalScale(containerWidth: number, pageWidth: number): number {
    if (pageWidth === 0) return PDF_CONFIG.DEFAULT_SCALE;
    
    const scale = containerWidth / pageWidth;
    
    // Apply device pixel ratio but limit it
    const devicePixelRatio = Math.min(
      window.devicePixelRatio || 1,
      PDF_CONFIG.DEVICE_PIXEL_RATIO_LIMIT
    );
    
    const optimizedScale = scale * devicePixelRatio;
    
    // Clamp to min/max values
    return Math.max(
      PDF_CONFIG.MIN_SCALE,
      Math.min(PDF_CONFIG.MAX_SCALE, optimizedScale)
    );
  }

  /**
   * Set rendering scale
   */
  setScale(scale: number): void {
    this.currentScale = Math.max(
      PDF_CONFIG.MIN_SCALE,
      Math.min(PDF_CONFIG.MAX_SCALE, scale)
    );
    
    // Clear cache when scale changes significantly
    this.pageRenderer.clearCache();
  }

  /**
   * Get current scale
   */
  getScale(): number {
    return this.currentScale;
  }

  /**
   * Check if page render is available in cache
   */
  hasPageRender(pageNumber: number, scale?: number): boolean {
    const renderScale = scale || this.currentScale;
    return this.pageRenderer.hasCachedRender(pageNumber, renderScale);
  }

  /**
   * Get cached page render
   */
  getCachedPageRender(pageNumber: number, scale?: number): HTMLCanvasElement | null {
    const renderScale = scale || this.currentScale;
    return this.pageRenderer.getCachedRender(pageNumber, renderScale);
  }

  /**
   * Render a page with optimization
   */
  async renderPage(
    pageNumber: number,
    canvas: HTMLCanvasElement,
    scale?: number,
    priority: number = 0
  ): Promise<void> {
    if (!this.document) {
      throw new Error('PDF document not initialized');
    }

    const renderScale = scale || this.currentScale;
    
    // Check cache first
    const cached = this.pageRenderer.getCachedRender(pageNumber, renderScale);
    if (cached) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = cached.width;
        canvas.height = cached.height;
        ctx.drawImage(cached, 0, 0);
      }
      return;
    }

    // Add to render queue
    const abortController = new AbortController();
    const task: RenderTask = {
      pageNumber,
      scale: renderScale,
      priority,
      abortController,
    };

    this.renderQueue.push(task);
    this.renderQueue.sort((a, b) => b.priority - a.priority);

    // Process queue
    this.processRenderQueue();

    // Wait for this specific task to complete
    return new Promise((resolve, reject) => {
      const checkCompletion = () => {
        if (this.pageRenderer.hasCachedRender(pageNumber, renderScale)) {
          const cached = this.pageRenderer.getCachedRender(pageNumber, renderScale);
          if (cached) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
              canvas.width = cached.width;
              canvas.height = cached.height;
              ctx.drawImage(cached, 0, 0);
            }
          }
          resolve();
        } else if (abortController.signal.aborted) {
          reject(new Error('Render task was aborted'));
        } else {
          setTimeout(checkCompletion, 100);
        }
      };

      checkCompletion();
    });
  }

  /**
   * Process render queue
   */
  private async processRenderQueue(): Promise<void> {
    if (this.isProcessingQueue || this.renderQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.renderQueue.length > 0) {
      const task = this.renderQueue.shift();
      if (!task || task.abortController.signal.aborted) {
        continue;
      }

      try {
        await this.executeRenderTask(task);
      } catch (error) {
        console.warn('Failed to render page:', task.pageNumber, error);
      }
    }

    this.isProcessingQueue = false;
  }

  /**
   * Execute a single render task
   */
  private async executeRenderTask(task: RenderTask): Promise<void> {
    if (!this.document || task.abortController.signal.aborted) {
      return;
    }

    // Check if already cached
    if (this.pageRenderer.hasCachedRender(task.pageNumber, task.scale)) {
      return;
    }

    try {
      const page = await this.document.getPage(task.pageNumber);
      const viewport = page.getViewport({ scale: task.scale });

      // Create temporary canvas for rendering
      const tempCanvas = document.createElement('canvas');
      const context = tempCanvas.getContext('2d');
      
      if (!context) {
        throw new Error('Failed to get canvas context');
      }

      // Optimize canvas size
      const canvasWidth = Math.min(viewport.width, PDF_CONFIG.MAX_CANVAS_SIZE);
      const canvasHeight = Math.min(viewport.height, PDF_CONFIG.MAX_CANVAS_SIZE);
      
      tempCanvas.width = canvasWidth;
      tempCanvas.height = canvasHeight;

      // Render page
      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      const renderTask = page.render(renderContext);
      
      // Set timeout for render task
      const timeoutId = setTimeout(() => {
        renderTask.cancel();
      }, PDF_CONFIG.RENDER_TIMEOUT);

      await renderTask.promise;
      clearTimeout(timeoutId);

      // Cache the rendered page
      this.pageRenderer.cacheRender(task.pageNumber, task.scale, tempCanvas);

    } catch (error) {
      if (error instanceof Error && error.name !== 'RenderingCancelledException') {
        console.warn('Page render failed:', error);
      }
    }
  }

  /**
   * Preload pages around current viewport
   */
  async preloadPages(currentPage: number, preloadCount: number = 3): Promise<void> {
    if (!this.document) return;

    const startPage = Math.max(1, currentPage - preloadCount);
    const endPage = Math.min(this.document.numPages, currentPage + preloadCount);

    const preloadTasks: Promise<void>[] = [];

    for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
      if (!this.pageRenderer.hasCachedRender(pageNum, this.currentScale)) {
        // Create a temporary canvas for preloading
        const tempCanvas = document.createElement('canvas');
        const priority = Math.abs(pageNum - currentPage); // Closer pages have higher priority
        
        preloadTasks.push(
          this.renderPage(pageNum, tempCanvas, this.currentScale, -priority)
            .catch(error => {
              console.warn('Preload failed for page', pageNum, error);
            })
        );
      }
    }

    // Wait for all preload tasks to complete
    await Promise.allSettled(preloadTasks);
  }

  /**
   * Get optimization statistics
   */
  getStats(): {
    cacheStats: { size: number; maxSize: number; keys: string[] };
    queueSize: number;
    isProcessing: boolean;
    currentScale: number;
    documentPages: number;
  } {
    return {
      cacheStats: this.pageRenderer.getCacheStats(),
      queueSize: this.renderQueue.length,
      isProcessing: this.isProcessingQueue,
      currentScale: this.currentScale,
      documentPages: this.document?.numPages || 0,
    };
  }

  /**
   * Clear all caches and reset
   */
  reset(): void {
    // Cancel all pending render tasks
    this.renderQueue.forEach(task => {
      task.abortController.abort();
    });
    this.renderQueue = [];
    
    // Clear caches
    this.pageRenderer.clearCache();
    
    // Reset state
    this.document = null;
    this.currentScale = PDF_CONFIG.DEFAULT_SCALE;
    this.isProcessingQueue = false;
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.reset();
  }
}

// Export singleton instance
export const pdfOptimizationService = new PDFOptimizationService();