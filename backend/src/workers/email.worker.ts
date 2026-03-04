import { Worker } from "bullmq";
import { redisConnectionOptions } from "../config/redis";
import { EmailService } from "../services/email.service";
import { logger } from "../utils/logger";

const emailWorker = new Worker(
  "emailQueue",
  async (job) => {
    const { type, payload } = job.data;

    logger.info("Email Worker started", { type });

    if (type === "refund") {
      await EmailService.sendRefundLinkEmail(
        payload.email,
        payload.link
      );
    }

    if (type === "escalation") {
      await EmailService.notifyEscalation(
        payload.agentEmail,
        payload.ticketId
      );
    }

    logger.info("Email Worker completed");
  },
  { connection: redisConnectionOptions }
);

emailWorker.on("failed", (job, err) => {
  logger.error("Email Worker failed", { error: err.message });
});

export default emailWorker;