/**
 * Profile Cache
 * Caches ensureProfileExists results to prevent redundant database calls
 */

// In-memory cache with TTL
const profileExistsCache = new Map<string, { exists: boolean; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Check if a user's profile exists in cache
 */
export function isProfileCached(userId: string): boolean {
  const cached = profileExistsCache.get(userId);
  if (!cached) return false;
  
  const now = Date.now();
  const age = now - cached.timestamp;
  
  // Clear expired cache entry
  if (age > CACHE_TTL) {
    profileExistsCache.delete(userId);
    return false;
  }
  
  return true;
}

/**
 * Mark a profile as existing in cache
 */
export function cacheProfileExists(userId: string): void {
  profileExistsCache.set(userId, {
    exists: true,
    timestamp: Date.now()
  });
}

/**
 * Clear cache for a specific user
 */
export function clearProfileCache(userId: string): void {
  profileExistsCache.delete(userId);
}

/**
 * Clear entire cache (useful for testing/development)
 */
export function clearAllProfileCache(): void {
  profileExistsCache.clear();
}

/**
 * Get cache stats for debugging
 */
export function getProfileCacheStats() {
  return {
    size: profileExistsCache.size,
    entries: Array.from(profileExistsCache.entries()).map(([userId, data]) => ({
      userId,
      age: Date.now() - data.timestamp,
      expiresIn: CACHE_TTL - (Date.now() - data.timestamp)
    }))
  };
}

