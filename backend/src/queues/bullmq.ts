import { Queue } from "bullmq";
import { redisConnectionOptions } from "../config/redis";
import { logger } from "../utils/logger";

/**
 * Centralized BullMQ queues
 * Used by controllers/services to add jobs
 */

export const queuesEnabled = Boolean(redisConnectionOptions);

const createNoopQueue = (name: string) => ({
  name,
  add: async () => {
    logger.warn(`Queue "${name}" is disabled; job not enqueued`);
    return { id: "disabled" };
  },
});

export const aiQueue = queuesEnabled
  ? new Queue("aiQueue", { connection: redisConnectionOptions! })
  : (createNoopQueue("aiQueue") as any);

export const emailQueue = queuesEnabled
  ? new Queue("emailQueue", { connection: redisConnectionOptions! })
  : (createNoopQueue("emailQueue") as any);

export const analyticsQueue = queuesEnabled
  ? new Queue("analyticsQueue", { connection: redisConnectionOptions! })
  : (createNoopQueue("analyticsQueue") as any);

/**
 * Optional: helper functions (cleaner usage)
 */

export const addAIJob = async (data: any) => {
  return aiQueue.add("runAI", data, {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
    delay: data?.delayMs ?? 0,
    removeOnComplete: true,
  });
};

export const addEmailJob = async (data: any) => {
  return emailQueue.add("sendEmail", data, {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
    removeOnComplete: true,
  });
};

export const addAnalyticsJob = async (data: any) => {
  return analyticsQueue.add("logAnalytics", data, {
    removeOnComplete: true,
  });
};
