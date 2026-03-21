import { Request, Response, NextFunction } from "express";

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

class MemoryRateLimit {
  private store: RateLimitStore = {};
  private cleanupInterval: NodeJS.Timeout;

  constructor(
    private windowMs: number = 15 * 60 * 1000, // 15 minutes default
    private maxRequests: number = 100
  ) {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  private getKey(req: Request): string {
    // Use IP + User ID for authenticated users, IP only for anonymous
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const userId = (req as any).user?.userId;
    return userId ? `user:${userId}` : `ip:${ip}`;
  }

  private cleanup(): void {
    const now = Date.now();
    Object.keys(this.store).forEach(key => {
      if (this.store[key].resetTime <= now) {
        delete this.store[key];
      }
    });
  }

  public check(req: Request): { allowed: boolean; resetTime: number; remaining: number } {
    const key = this.getKey(req);
    const now = Date.now();
    const resetTime = now + this.windowMs;

    if (!this.store[key] || this.store[key].resetTime <= now) {
      this.store[key] = {
        count: 1,
        resetTime
      };
      return {
        allowed: true,
        resetTime,
        remaining: this.maxRequests - 1
      };
    }

    const record = this.store[key];
    if (record.count >= this.maxRequests) {
      return {
        allowed: false,
        resetTime: record.resetTime,
        remaining: 0
      };
    }

    record.count++;
    return {
      allowed: true,
      resetTime: record.resetTime,
      remaining: this.maxRequests - record.count
    };
  }

  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

// Rate limiting configurations for different endpoints
const rateLimits = {
  // General API limits
  default: new MemoryRateLimit(15 * 60 * 1000, 100), // 100 requests per 15 minutes
  
  // Authentication endpoints (stricter)
  auth: new MemoryRateLimit(15 * 60 * 1000, 10), // 10 requests per 15 minutes
  
  // Message sending (more lenient for real-time chat)
  messages: new MemoryRateLimit(60 * 1000, 60), // 60 requests per minute
  
  // File uploads
  uploads: new MemoryRateLimit(60 * 1000, 10), // 10 uploads per minute
  
  // AI endpoints
  ai: new MemoryRateLimit(60 * 1000, 30), // 30 requests per minute
};

/**
 * Rate limiting middleware factory
 */
export const createRateLimit = (type: keyof typeof rateLimits = 'default') => {
  const limiter = rateLimits[type];
  
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = limiter.check(req);
      
      // Set rate limit headers
      res.set({
        'X-RateLimit-Limit': limiter['maxRequests'],
        'X-RateLimit-Remaining': Math.max(0, result.remaining),
        'X-RateLimit-Reset': new Date(result.resetTime).toISOString()
      });

      if (!result.allowed) {
        const resetSeconds = Math.ceil((result.resetTime - Date.now()) / 1000);
        return res.status(429).json({
          error: "Too many requests",
          message: `Rate limit exceeded. Try again in ${resetSeconds} seconds.`,
          retryAfter: resetSeconds
        });
      }

      next();
    } catch (error) {
      console.error("Rate limiting error:", error);
      // Fail open - allow request if rate limiting fails
      next();
    }
  };
};

// Pre-configured rate limiters
export const rateLimitDefault = createRateLimit('default');
export const rateLimitAuth = createRateLimit('auth');
export const rateLimitMessages = createRateLimit('messages');
export const rateLimitUploads = createRateLimit('uploads');
export const rateLimitAI = createRateLimit('ai');