import IORedis from "ioredis";
import { logger } from "../utils/logger";

/**
 * Central Redis connection for:
 * - BullMQ workers
 * - Caching
 * - Rate limiting
 * - Future session storage
 */

export const redisConnectionOptions = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: Number(process.env.REDIS_PORT) || 6379,
  maxRetriesPerRequest: null as null, // Required for BullMQ
};

// Useful for non-BullMQ Redis usage (caching, etc.)
export const redisConnection = new IORedis(redisConnectionOptions);

redisConnection.on("connect", () => {
  logger.info("Redis connected successfully");
});

redisConnection.on("error", (err) => {
  logger.error("Redis connection error", err);
});