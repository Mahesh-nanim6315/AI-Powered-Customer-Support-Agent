import Redis from 'ioredis';

interface LockInfo {
  ticketId: string;
  userId: string;
  lockType: 'AI_PROCESSING' | 'AGENT_REPLY' | 'CUSTOMER_REPLY';
  acquiredAt: Date;
  expiresAt: Date;
}

/**
 * Message Lock Service - Prevents race conditions between AI and Agent responses
 */
export class MessageLockService {
  private redis: Redis;
  private lockTimeout: number = 120000; // 2 minutes in milliseconds

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }

  /**
   * Acquire a lock for message processing
   */
  async acquireLock(lockInfo: Omit<LockInfo, 'acquiredAt' | 'expiresAt'>): Promise<boolean> {
    const lockKey = `message_lock:${lockInfo.ticketId}:${lockInfo.lockType}`;
    const lockData = {
      ...lockInfo,
      acquiredAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + this.lockTimeout).toISOString(),
    };

    try {
      // Use Redis SET with NX and EX for atomic lock acquisition
      const result = await this.redis.set(
        lockKey,
        JSON.stringify(lockData),
        'EX', // Expire after lockTimeout seconds
        Math.floor(this.lockTimeout / 1000),
        'NX' // Only set if key doesn't exist
      );

      return result === 'OK';
    } catch (error) {
      console.error('Failed to acquire message lock:', error);
      return false;
    }
  }

  /**
   * Release a lock
   */
  async releaseLock(ticketId: string, lockType: string): Promise<void> {
    const lockKey = `message_lock:${ticketId}:${lockType}`;
    
    try {
      await this.redis.del(lockKey);
    } catch (error) {
      console.error('Failed to release message lock:', error);
    }
  }

  /**
   * Check if a lock exists
   */
  async isLocked(ticketId: string, lockType: string): Promise<boolean> {
    const lockKey = `message_lock:${ticketId}:${lockType}`;
    
    try {
      const exists = await this.redis.exists(lockKey);
      return exists === 1;
    } catch (error) {
      console.error('Failed to check lock status:', error);
      return false;
    }
  }

  /**
   * Get lock information
   */
  async getLockInfo(ticketId: string, lockType: string): Promise<LockInfo | null> {
    const lockKey = `message_lock:${ticketId}:${lockType}`;
    
    try {
      const lockData = await this.redis.get(lockKey);
      return lockData ? JSON.parse(lockData) : null;
    } catch (error) {
      console.error('Failed to get lock info:', error);
      return null;
    }
  }

  /**
   * Wait for lock to be released (with timeout)
   */
  async waitForLockRelease(ticketId: string, lockType: string, timeoutMs: number = 30000): Promise<void> {
    const startTime = Date.now();
    
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(async () => {
        try {
          const isLocked = await this.isLocked(ticketId, lockType);
          
          if (!isLocked) {
            clearInterval(checkInterval);
            resolve();
            return;
          }

          // Check timeout
          if (Date.now() - startTime > timeoutMs) {
            clearInterval(checkInterval);
            reject(new Error(`Lock release timeout for ticket ${ticketId}`));
            return;
          }
        } catch (error) {
          clearInterval(checkInterval);
          reject(error);
        }
      }, 1000); // Check every second
    });
  }

  /**
   * Clean up expired locks
   */
  async cleanupExpiredLocks(): Promise<void> {
    try {
      const pattern = 'message_lock:*';
      const keys = await this.redis.keys(pattern);
      
      for (const key of keys) {
        const lockData = await this.redis.get(key);
        if (lockData) {
          const lockInfo: LockInfo = JSON.parse(lockData);
          const expiresAt = new Date(lockInfo.expiresAt);
          
          if (expiresAt < new Date()) {
            await this.redis.del(key);
            console.log(`Cleaned up expired lock: ${key}`);
          }
        }
      }
    } catch (error) {
      console.error('Failed to cleanup expired locks:', error);
    }
  }

  /**
   * Get all active locks for a ticket
   */
  async getTicketLocks(ticketId: string): Promise<LockInfo[]> {
    const pattern = `message_lock:${ticketId}:*`;
    const keys = await this.redis.keys(pattern);
    const locks: LockInfo[] = [];

    for (const key of keys) {
      const lockData = await this.redis.get(key);
      if (lockData) {
        locks.push(JSON.parse(lockData));
      }
    }

    return locks;
  }

  /**
   * Force release all locks for a ticket (emergency use)
   */
  async forceReleaseTicketLocks(ticketId: string): Promise<void> {
    const pattern = `message_lock:${ticketId}:*`;
    const keys = await this.redis.keys(pattern);

    for (const key of keys) {
      try {
        await this.redis.del(key);
        console.log(`Force released lock: ${key}`);
      } catch (error) {
        console.error(`Failed to force release lock ${key}:`, error);
      }
    }
  }

  /**
   * Close Redis connection
   */
  async disconnect(): Promise<void> {
    try {
      await this.redis.quit();
    } catch (error) {
      console.error('Failed to disconnect from Redis:', error);
    }
  }
}

// Singleton instance
export const messageLockService = new MessageLockService();
