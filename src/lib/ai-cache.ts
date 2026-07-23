/**
 * AI Response Cache Utility
 * 
 * Provides server-side caching for AI responses to reduce:
 * - API costs
 * - Latency
 * - Rate limiting issues
 */

// In-memory cache with TTL (Time To Live)
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class AICache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private defaultTTL: number;

  constructor(defaultTTL: number = 300000) { // Default: 5 minutes
    this.defaultTTL = defaultTTL;
    
    // Clean up expired entries periodically
    setInterval(() => this.cleanup(), 60000); // Clean every minute
  }

  /**
   * Get a cached value
   */
  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return undefined;
    }
    
    return entry.data as T;
  }

  /**
   * Set a cached value
   */
  set<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl ?? this.defaultTTL,
    });
  }

  /**
   * Check if a key exists and is valid
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Delete a cached entry
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cached entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()),
    };
  }
}

// Singleton instance for tax calculations (longer TTL since tax rates don't change often)
export const taxCalculationCache = new AICache(86400000); // 24 hours

// Singleton instance for category suggestions (shorter TTL)
export const categorySuggestionCache = new AICache(3600000); // 1 hour

// Singleton instance for financial advice (medium TTL)
export const financialAdviceCache = new AICache(1800000); // 30 minutes

/**
 * Create a cache key from input parameters
 */
export function createCacheKey(prefix: string, input: Record<string, any>): string {
  const sortedEntries = Object.entries(input).sort(([a], [b]) => a.localeCompare(b));
  const stringified = JSON.stringify(sortedEntries);
  return `${prefix}:${stringified}`;
}
