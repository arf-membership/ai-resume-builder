/**
 * Caching service for API responses and analysis results
 * Provides in-memory and localStorage caching with TTL support
 */

import type { CVAnalysisResult } from '../types/cv';
import type { ChatMessage } from '../types/api';

// Cache configuration
const CACHE_CONFIG = {
  // TTL in milliseconds
  ANALYSIS_TTL: 30 * 60 * 1000, // 30 minutes
  CHAT_TTL: 10 * 60 * 1000, // 10 minutes
  SECTION_EDIT_TTL: 15 * 60 * 1000, // 15 minutes
  PDF_GENERATION_TTL: 60 * 60 * 1000, // 1 hour
  
  // Maximum cache sizes
  MAX_ANALYSIS_CACHE: 10,
  MAX_CHAT_CACHE: 20,
  MAX_SECTION_CACHE: 50,
  
  // Storage keys
  STORAGE_PREFIX: 'cv_cache_',
  ANALYSIS_KEY: 'analysis',
  CHAT_KEY: 'chat',
  SECTION_KEY: 'section',
  PDF_KEY: 'pdf',
} as const;

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  key: string;
}

interface AnalysisCacheEntry {
  resumeId: string;
  result: CVAnalysisResult;
  hash: string; // Hash of the original PDF content
}

interface ChatCacheEntry {
  resumeId: string;
  sectionName: string;
  messages: ChatMessage[];
  context: string;
}

interface SectionEditCacheEntry {
  resumeId: string;
  sectionName: string;
  originalContent: string;
  suggestions: string;
  result: any;
  hash: string;
}

interface PDFCacheEntry {
  resumeId: string;
  pdfUrl: string;
  updates: any[];
  hash: string;
}

/**
 * Generic cache manager with TTL support
 */
class CacheManager<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private maxSize: number;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  set(key: string, data: T, ttl: number): void {
    // Remove expired entries if cache is full
    if (this.cache.size >= this.maxSize) {
      this.cleanup();
      
      // If still full, remove oldest entry
      if (this.cache.size >= this.maxSize) {
        const oldestKey = Array.from(this.cache.keys())[0];
        this.cache.delete(oldestKey);
      }
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      key,
    };

    this.cache.set(key, entry);
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.cache.delete(key));
  }

  size(): number {
    this.cleanup();
    return this.cache.size;
  }

  keys(): string[] {
    this.cleanup();
    return Array.from(this.cache.keys());
  }
}

/**
 * Persistent cache using localStorage
 */
class PersistentCache<T> {
  private storageKey: string;

  constructor(storageKey: string) {
    this.storageKey = `${CACHE_CONFIG.STORAGE_PREFIX}${storageKey}`;
  }

  set(key: string, data: T, ttl: number): void {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl,
        key,
      };

      const cache = this.getCache();
      cache[key] = entry;
      
      localStorage.setItem(this.storageKey, JSON.stringify(cache));
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }
  }

  get(key: string): T | null {
    try {
      const cache = this.getCache();
      const entry = cache[key];

      if (!entry) {
        return null;
      }

      // Check if entry has expired
      if (Date.now() - entry.timestamp > entry.ttl) {
        delete cache[key];
        localStorage.setItem(this.storageKey, JSON.stringify(cache));
        return null;
      }

      return entry.data;
    } catch (error) {
      console.warn('Failed to read from localStorage:', error);
      return null;
    }
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): boolean {
    try {
      const cache = this.getCache();
      const existed = key in cache;
      delete cache[key];
      localStorage.setItem(this.storageKey, JSON.stringify(cache));
      return existed;
    } catch (error) {
      console.warn('Failed to delete from localStorage:', error);
      return false;
    }
  }

  clear(): void {
    try {
      localStorage.removeItem(this.storageKey);
    } catch (error) {
      console.warn('Failed to clear localStorage:', error);
    }
  }

  private getCache(): Record<string, CacheEntry<T>> {
    try {
      const cached = localStorage.getItem(this.storageKey);
      return cached ? JSON.parse(cached) : {};
    } catch (error) {
      console.warn('Failed to parse localStorage cache:', error);
      return {};
    }
  }
}

/**
 * Main cache service
 */
export class CacheService {
  // In-memory caches
  private static analysisCache = new CacheManager<AnalysisCacheEntry>(CACHE_CONFIG.MAX_ANALYSIS_CACHE);
  private static chatCache = new CacheManager<ChatCacheEntry>(CACHE_CONFIG.MAX_CHAT_CACHE);
  private static sectionCache = new CacheManager<SectionEditCacheEntry>(CACHE_CONFIG.MAX_SECTION_CACHE);

  // Persistent caches
  private static persistentAnalysisCache = new PersistentCache<AnalysisCacheEntry>(CACHE_CONFIG.ANALYSIS_KEY);
  private static persistentPDFCache = new PersistentCache<PDFCacheEntry>(CACHE_CONFIG.PDF_KEY);

  /**
   * Generate hash for content-based caching
   */
  private static generateHash(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Analysis result caching
   */
  static cacheAnalysisResult(
    resumeId: string, 
    result: CVAnalysisResult, 
    pdfContent: string
  ): void {
    const hash = this.generateHash(pdfContent);
    const entry: AnalysisCacheEntry = {
      resumeId,
      result,
      hash,
    };

    const key = `${resumeId}_${hash}`;
    
    // Cache in memory and persistent storage
    this.analysisCache.set(key, entry, CACHE_CONFIG.ANALYSIS_TTL);
    this.persistentAnalysisCache.set(key, entry, CACHE_CONFIG.ANALYSIS_TTL);
  }

  static getCachedAnalysisResult(resumeId: string, pdfContent: string): CVAnalysisResult | null {
    const hash = this.generateHash(pdfContent);
    const key = `${resumeId}_${hash}`;

    // Try memory cache first
    let entry = this.analysisCache.get(key);
    
    // Fallback to persistent cache
    if (!entry) {
      entry = this.persistentAnalysisCache.get(key);
      
      // If found in persistent cache, restore to memory cache
      if (entry) {
        this.analysisCache.set(key, entry, CACHE_CONFIG.ANALYSIS_TTL);
      }
    }

    return entry?.result || null;
  }

  /**
   * Chat conversation caching
   */
  static cacheChatConversation(
    resumeId: string,
    sectionName: string,
    messages: ChatMessage[],
    context: string = ''
  ): void {
    const entry: ChatCacheEntry = {
      resumeId,
      sectionName,
      messages: [...messages], // Deep copy
      context,
    };

    const key = `${resumeId}_${sectionName}`;
    this.chatCache.set(key, entry, CACHE_CONFIG.CHAT_TTL);
  }

  static getCachedChatConversation(
    resumeId: string,
    sectionName: string
  ): ChatMessage[] | null {
    const key = `${resumeId}_${sectionName}`;
    const entry = this.chatCache.get(key);
    return entry?.messages || null;
  }

  /**
   * Section edit result caching
   */
  static cacheSectionEditResult(
    resumeId: string,
    sectionName: string,
    originalContent: string,
    suggestions: string,
    result: any
  ): void {
    const hash = this.generateHash(originalContent + suggestions);
    const entry: SectionEditCacheEntry = {
      resumeId,
      sectionName,
      originalContent,
      suggestions,
      result,
      hash,
    };

    const key = `${resumeId}_${sectionName}_${hash}`;
    this.sectionCache.set(key, entry, CACHE_CONFIG.SECTION_EDIT_TTL);
  }

  static getCachedSectionEditResult(
    resumeId: string,
    sectionName: string,
    originalContent: string,
    suggestions: string
  ): any | null {
    const hash = this.generateHash(originalContent + suggestions);
    const key = `${resumeId}_${sectionName}_${hash}`;
    const entry = this.sectionCache.get(key);
    return entry?.result || null;
  }

  /**
   * PDF generation caching
   */
  static cachePDFGeneration(
    resumeId: string,
    pdfUrl: string,
    updates: any[]
  ): void {
    const hash = this.generateHash(JSON.stringify(updates));
    const entry: PDFCacheEntry = {
      resumeId,
      pdfUrl,
      updates: [...updates], // Deep copy
      hash,
    };

    const key = `${resumeId}_${hash}`;
    this.persistentPDFCache.set(key, entry, CACHE_CONFIG.PDF_GENERATION_TTL);
  }

  static getCachedPDFGeneration(
    resumeId: string,
    updates: any[]
  ): string | null {
    const hash = this.generateHash(JSON.stringify(updates));
    const key = `${resumeId}_${hash}`;
    const entry = this.persistentPDFCache.get(key);
    return entry?.pdfUrl || null;
  }

  /**
   * Cache management
   */
  static clearAllCaches(): void {
    this.analysisCache.clear();
    this.chatCache.clear();
    this.sectionCache.clear();
    this.persistentAnalysisCache.clear();
    this.persistentPDFCache.clear();
  }

  static clearExpiredCaches(): void {
    this.analysisCache.cleanup();
    this.chatCache.cleanup();
    this.sectionCache.cleanup();
  }

  static getCacheStats(): {
    analysis: { memory: number; persistent: number };
    chat: number;
    section: number;
  } {
    return {
      analysis: {
        memory: this.analysisCache.size(),
        persistent: 0, // Would need to implement size() for persistent cache
      },
      chat: this.chatCache.size(),
      section: this.sectionCache.size(),
    };
  }

  /**
   * Initialize cache service
   */
  static initialize(): void {
    // Set up periodic cleanup
    setInterval(() => {
      this.clearExpiredCaches();
    }, 5 * 60 * 1000); // Every 5 minutes

    // Clear caches on page unload to prevent memory leaks
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.clearAllCaches();
      });
    }
  }

  /**
   * Preload critical data
   */
  static async preloadCriticalData(sessionId: string): Promise<void> {
    try {
      // This could be expanded to preload commonly used data
      console.log('Preloading critical data for session:', sessionId);
    } catch (error) {
      console.warn('Failed to preload critical data:', error);
    }
  }
}

// Initialize cache service
CacheService.initialize();