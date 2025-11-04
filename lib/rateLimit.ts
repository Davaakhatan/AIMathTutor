/**
 * Simple in-memory rate limiting utility
 * Note: For production, use a proper rate limiting service (Redis, etc.)
 */

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

class RateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig = { maxRequests: 10, windowMs: 60000 }) {
    this.config = config;
    // Clean up old entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Check if request should be allowed
   */
  check(identifier: string): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    const entry = this.store.get(identifier);

    // No entry or window expired
    if (!entry || now > entry.resetAt) {
      this.store.set(identifier, {
        count: 1,
        resetAt: now + this.config.windowMs,
      });
      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetAt: now + this.config.windowMs,
      };
    }

    // Check if limit exceeded
    if (entry.count >= this.config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: entry.resetAt,
      };
    }

    // Increment count
    entry.count++;
    return {
      allowed: true,
      remaining: this.config.maxRequests - entry.count,
      resetAt: entry.resetAt,
    };
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    // Collect keys to delete
    this.store.forEach((entry, key) => {
      if (now > entry.resetAt) {
        keysToDelete.push(key);
      }
    });
    
    // Delete collected keys
    keysToDelete.forEach((key) => this.store.delete(key));
  }

  /**
   * Reset rate limit for an identifier
   */
  reset(identifier: string): void {
    this.store.delete(identifier);
  }
}

// Export singleton instances with different limits
export const chatRateLimiter = new RateLimiter({
  maxRequests: 20, // 20 requests
  windowMs: 60000, // per minute
});

export const parseRateLimiter = new RateLimiter({
  maxRequests: 10, // 10 requests
  windowMs: 60000, // per minute
});

/**
 * Get client identifier from request
 */
export function getClientId(request: Request): string {
  // Try to get IP from headers (X-Forwarded-For for Vercel)
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";
  
  // Also try other common headers
  if (ip === "unknown") {
    const realIp = request.headers.get("x-real-ip");
    if (realIp) return realIp;
  }
  
  return ip;
}

/**
 * Create rate limit headers for response
 */
export function createRateLimitHeaders(
  limit: number,
  remaining: number,
  resetAt: number
): Record<string, string> {
  return {
    "X-RateLimit-Limit": limit.toString(),
    "X-RateLimit-Remaining": remaining.toString(),
    "X-RateLimit-Reset": new Date(resetAt).toISOString(),
  };
}

