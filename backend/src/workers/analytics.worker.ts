import { Worker } from "bullmq";
import { isRedisEnabled, redisConnectionOptions } from "../config/redis";
import { prisma } from "../config/db";
import { logger } from "../utils/logger";

const workersEnabled =
  String(process.env.ENABLE_BULLMQ_WORKERS).toLowerCase() === "true";

let analyticsWorker: Worker | null = null;

if (workersEnabled && isRedisEnabled && redisConnectionOptions) {
  analyticsWorker = new Worker(
    "analyticsQueue",
    async (job) => {
      const { ticketId, sentimentScore } = job.data;

      logger.info("Analytics Worker started", { ticketId });

      await prisma.ticketAnalytics.create({
        data: {
          ticketId,
          sentimentScore,
        },
      });

      logger.info("Analytics Worker completed", { ticketId });
    },
    { connection: redisConnectionOptions }
  );

  analyticsWorker.on("failed", (job, err) => {
    logger.error("Analytics Worker failed", { error: err.message });
  });
} else {
  logger.warn("Analytics Worker disabled via environment configuration");
}

export default analyticsWorker;
