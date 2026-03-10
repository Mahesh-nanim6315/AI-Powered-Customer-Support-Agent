import { Worker } from "bullmq";
import { isRedisEnabled, redisConnectionOptions } from "../config/redis";
import { EmailService } from "../services/email.service";
import { logger } from "../utils/logger";

const workersEnabled =
  String(process.env.ENABLE_BULLMQ_WORKERS).toLowerCase() === "true";

let emailWorker: Worker | null = null;

if (workersEnabled && isRedisEnabled && redisConnectionOptions) {
  emailWorker = new Worker(
    "emailQueue",
    async (job) => {
      const { type, payload } = job.data;

      logger.info("Email Worker started", { type });

      if (type === "refund") {
        await EmailService.sendRefundLinkEmail(payload.email, payload.link);
      }

      if (type === "escalation") {
        await EmailService.notifyEscalation(payload.agentEmail, payload.ticketId);
      }

      logger.info("Email Worker completed");
    },
    { connection: redisConnectionOptions }
  );

  emailWorker.on("failed", (job, err) => {
    logger.error("Email Worker failed", { error: err.message });
  });
} else {
  logger.warn("Email Worker disabled via environment configuration");
}

export default emailWorker;
