// lib/security/rate-limiter.ts
// Simple in-memory rate limiter (no Redis dependency)
// For production with multiple instances, migrate to Redis or Upstash

interface RateLimitEntry {
    count: number
    resetAt: number
}

export interface RateLimiterConfig {
    maxRequests: number
    windowMs: number
}

const store = new Map<string, RateLimitEntry>()

// Cleanup expired entries every 60s to prevent memory leak
setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of store) {
        if (entry.resetAt <= now) store.delete(key)
    }
}, 60_000)

export const aiRateLimiter: RateLimiterConfig = {
    maxRequests: 30,   // 30 requests
    windowMs: 60_000,  // per minute per org
}

export const uploadRateLimiter: RateLimiterConfig = {
    maxRequests: 10,
    windowMs: 60_000,
}

export async function checkRateLimit(
    config: RateLimiterConfig,
    key: string
): Promise<{ allowed: boolean; remaining: number }> {
    const now = Date.now()
    const entry = store.get(key)

    if (!entry || entry.resetAt <= now) {
        store.set(key, { count: 1, resetAt: now + config.windowMs })
        return { allowed: true, remaining: config.maxRequests - 1 }
    }

    if (entry.count >= config.maxRequests) {
        return { allowed: false, remaining: 0 }
    }

    entry.count++
    return { allowed: true, remaining: config.maxRequests - entry.count }
}
