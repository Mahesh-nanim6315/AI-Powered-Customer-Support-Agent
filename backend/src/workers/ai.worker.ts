import { Worker } from "bullmq";
import { redisConnectionOptions } from "../config/redis";
import { runAgent } from "../services/agent.service";
import { logger } from "../utils/logger";
import prisma from "../config/database";
import { getIO } from "../config/socket";

const aiWorker = new Worker(
  "aiQueue",
  async (job) => {
    const { ticketId, message, orgId, isInitialProcessing } = job.data as {
      ticketId: string;
      message: string;
      orgId: string;
      isInitialProcessing?: boolean;
    };

    logger.info("AI Worker started", { ticketId, isInitialProcessing });

    const aiReply = await runAgent(message, orgId, ticketId);

    // Save AI response as a message
    const aiMessage = await prisma.ticketMessage.create({
      data: {
        ticketId,
        role: "AI",
        content: aiReply,
      },
    });

    // Update ticket status based on processing type
    const newStatus = isInitialProcessing ? "WAITING_FOR_HUMAN" : "RESOLVED";

    await prisma.ticket.update({
      where: { id: ticketId },
      data: { status: newStatus },
    });

    // Emit real-time update
    try {
      const io = getIO();
      io.to(`ticket-${ticketId}`).emit("newMessage", aiMessage);
      io.to(`ticket-${ticketId}`).emit("message-added", aiMessage);
      io.to(`org-${orgId}`).emit("ticketUpdated", { ticketId, status: newStatus });
      io.to(`org-${orgId}`).emit("ticket-updated", { id: ticketId, status: newStatus });
    } catch (error) {
      logger.warn("Failed to emit Socket.io event", { error: error instanceof Error ? error.message : String(error) });
    }

    logger.info("AI Worker completed", { ticketId, messageId: aiMessage.id, newStatus });

    return { aiMessage, newStatus };
  },
  { connection: redisConnectionOptions }
);

aiWorker.on("failed", (job, err) => {
  logger.error("AI Worker failed", { jobId: job?.id, error: err.message });
});

export default aiWorker;
