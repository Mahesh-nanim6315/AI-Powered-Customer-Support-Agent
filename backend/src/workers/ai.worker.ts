import { Worker } from "bullmq";
import { redisConnectionOptions } from "../config/redis";
import { runAgent } from "../services/agent.service";
import { logger } from "../utils/logger";

const aiWorker = new Worker(
  "aiQueue",
  async (job) => {
    const { ticketId, message, orgId } = job.data as {
      ticketId: string;
      message: string;
      orgId: string;
    };

    logger.info("AI Worker started", { ticketId });
    const response = await runAgent(message, orgId, ticketId);

    logger.info("AI Worker completed", { ticketId });

    return response;
  },
  { connection: redisConnectionOptions }
);

aiWorker.on("failed", (job, err) => {
  logger.error("AI Worker failed", { jobId: job?.id, error: err.message });
});

export default aiWorker;