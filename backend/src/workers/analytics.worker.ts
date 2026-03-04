import { Worker } from "bullmq";
import { redisConnectionOptions } from "../config/redis";
import { prisma } from "../config/db";
import { logger } from "../utils/logger";

const analyticsWorker = new Worker(
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

export default analyticsWorker;