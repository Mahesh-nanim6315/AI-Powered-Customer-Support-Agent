import { Worker } from "bullmq";
import { isRedisEnabled, redisConnectionOptions } from "../config/redis";
import { runAgentDetailed } from "../services/agent.service";
import { logger } from "../utils/logger";
import prisma from "../config/database";
import { getIO } from "../config/socket";
import { TicketService } from "../modules/tickets/tickets.service";

const workersEnabled =
  String(process.env.ENABLE_BULLMQ_WORKERS).toLowerCase() === "true";

let aiWorker: Worker | null = null;

if (workersEnabled && isRedisEnabled && redisConnectionOptions) {
  aiWorker = new Worker(
    "aiQueue",
    async (job) => {
      const { ticketId, message, orgId, isInitialProcessing } = job.data as {
        ticketId: string;
        message: string;
        orgId: string;
        isInitialProcessing?: boolean;
      };

      logger.info("AI Worker started", { ticketId, isInitialProcessing });

      const aiRun = await runAgentDetailed(message, orgId, ticketId);

      // Save AI response as a message
      const aiMessage = await prisma.ticketMessage.create({
        data: {
          ticketId,
          role: "AI",
          content: aiRun.reply,
        },
      });

      // Update ticket status based on processing type
      const { status: newStatus } = await TicketService.applyAiOutcome(ticketId, orgId, aiRun);

      // Emit real-time update
      try {
        const io = getIO();
        io.to(`ticket-${ticketId}`).emit("newMessage", aiMessage);
        io.to(`ticket-${ticketId}`).emit("message-added", aiMessage);
        io.to(`ticket-${ticketId}`).emit("ai_reply", aiMessage);
        io.to(`org-${orgId}`).emit("ticketUpdated", { ticketId, status: newStatus });
        io.to(`org-${orgId}`).emit("ticket-updated", { id: ticketId, status: newStatus });
        io.to(`org-${orgId}`).emit("ticket_update", { ticketId, status: newStatus });
      } catch (error) {
        logger.warn("Failed to emit Socket.io event", {
          error: error instanceof Error ? error.message : String(error),
        });
      }

      logger.info("AI Worker completed", { ticketId, messageId: aiMessage.id, newStatus });

      return { aiMessage, newStatus };
    },
    { connection: redisConnectionOptions }
  );

  aiWorker.on("failed", (job, err) => {
    logger.error("AI Worker failed", { jobId: job?.id, error: err.message });
    const ticketId = typeof job?.data?.ticketId === "string" ? job.data.ticketId : null;
    const orgId = typeof job?.data?.orgId === "string" ? job.data.orgId : null;

    if (ticketId && orgId) {
      void TicketService.handleAiFailure(ticketId, orgId).catch((fallbackError) => {
        logger.error("Failed to apply AI fallback", {
          ticketId,
          orgId,
          error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
        });
      });
    }
  });
} else {
  logger.warn("AI Worker disabled via environment configuration");
}

export default aiWorker;
