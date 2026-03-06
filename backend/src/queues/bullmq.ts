import { Queue } from "bullmq";
import { redisConnectionOptions } from "../config/redis";

/**
 * Centralized BullMQ queues
 * Used by controllers/services to add jobs
 */

export const aiQueue = new Queue("aiQueue", {
  connection: redisConnectionOptions,
});

export const emailQueue = new Queue("emailQueue", {
  connection: redisConnectionOptions,
});

export const analyticsQueue = new Queue("analyticsQueue", {
  connection: redisConnectionOptions,
});

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
