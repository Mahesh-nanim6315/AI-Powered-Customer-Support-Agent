import IORedis from "ioredis";
import { logger } from "../utils/logger";

/**
 * Central Redis connection for:
 * - BullMQ workers
 * - Caching
 * - Rate limiting
 * - Session storage
 */

const isRedisEnabled =
  String(process.env.ENABLE_REDIS_CONNECTION).toLowerCase() === "true";

let redisConnection: IORedis | null = null;

if (isRedisEnabled) {
  if (process.env.REDIS_URL) {
    // For Upstash / Cloud Redis
    redisConnection = new IORedis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
      tls: {
        rejectUnauthorized: false, // For Upstash
      },
    });
  } else {
    // For Local Redis
    redisConnection = new IORedis({
      host: process.env.REDIS_HOST || "127.0.0.1",
      port: Number(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD,
      maxRetriesPerRequest: null,
    });
  }

  redisConnection.on("connect", () => {
    logger.info("Redis connected successfully");
  });

  redisConnection.on("error", (err) => {
    logger.error("Redis connection error", err);
  });
} else {
  logger.warn("Redis disabled via ENABLE_REDIS_CONNECTION");
}

export { redisConnection };

export const redisConnectionOptions = isRedisEnabled
  ? process.env.REDIS_URL
    ? {
      url: process.env.REDIS_URL,
      maxRetriesPerRequest: null as null,
      tls: {
        rejectUnauthorized: false, // For Upstash
      },
    }
    : {
      host: process.env.REDIS_HOST || "127.0.0.1",
      port: Number(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD,
      maxRetriesPerRequest: null as null, // Required for BullMQ
    }
  : null;

export { isRedisEnabled };
