/**
 * Search cache for course queries
 * Provides fast lookup for search results and negative results (courses not found)
 */

import { CourseInfo } from './courses';

interface CacheEntry {
  results: CourseInfo[];
  timestamp: number;
}

interface NegativeCacheEntry {
  timestamp: number;
}

// In-memory cache for search results
const searchCache = new Map<string, CacheEntry>();
const negativeCache = new Map<string, NegativeCacheEntry>(); // Cache for "not found" results

// Cache TTL: 1 hour
const CACHE_TTL = 60 * 60 * 1000;
// Negative cache TTL: 5 minutes (shorter for failed searches)
const NEGATIVE_CACHE_TTL = 5 * 60 * 1000;

function makeCacheKey(query: string, institution?: string): string {
  const normalizedQuery = query.trim().toUpperCase();
  return institution ? `${institution}::${normalizedQuery}` : `all::${normalizedQuery}`;
}

/**
 * Get cached search results
 */
export function getCachedSearchResults(
  query: string,
  institution?: string
): CourseInfo[] | null {
  const key = makeCacheKey(query, institution);
  const entry = searchCache.get(key);

  if (!entry) {
    return null;
  }

  // Check if cache is still valid
  const age = Date.now() - entry.timestamp;
  if (age > CACHE_TTL) {
    searchCache.delete(key);
    return null;
  }

  return entry.results;
}

/**
 * Cache search results
 */
export function cacheSearchResults(
  query: string,
  results: CourseInfo[],
  institution?: string
): void {
  const key = makeCacheKey(query, institution);
  searchCache.set(key, {
    results,
    timestamp: Date.now(),
  });
}

/**
 * Check if a query was recently determined to have no results
 */
export function isNegativeCacheHit(query: string, institution?: string): boolean {
  const key = makeCacheKey(query, institution);
  const entry = negativeCache.get(key);

  if (!entry) {
    return false;
  }

  // Check if negative cache is still valid
  const age = Date.now() - entry.timestamp;
  if (age > NEGATIVE_CACHE_TTL) {
    negativeCache.delete(key);
    return false;
  }

  return true;
}

/**
 * Cache a negative result (no courses found)
 */
export function cacheNegativeResult(query: string, institution?: string): void {
  const key = makeCacheKey(query, institution);
  negativeCache.set(key, {
    timestamp: Date.now(),
  });
}

/**
 * Clear all caches (useful for testing or manual refresh)
 */
export function clearSearchCache(): void {
  searchCache.clear();
  negativeCache.clear();
}

/**
 * Clear expired cache entries (can be called periodically)
 */
export function pruneCache(): void {
  const now = Date.now();

  // Prune search cache
  for (const [key, entry] of searchCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL) {
      searchCache.delete(key);
    }
  }

  // Prune negative cache
  for (const [key, entry] of negativeCache.entries()) {
    if (now - entry.timestamp > NEGATIVE_CACHE_TTL) {
      negativeCache.delete(key);
    }
  }
}

