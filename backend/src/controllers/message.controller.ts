import { Request, Response } from "express";
import prisma from "../config/database";
import { runAgentDetailed } from "../services/agent.service";
import { appendMemory } from "../ai/memory.service";
import { toApiStatus, toDbStatus } from "../modules/tickets/ticketStatus.lifecycle";
import { messageLockService } from "../services/messageLock.service";
import { TicketService } from "../modules/tickets/tickets.service";
import { NotificationService } from "../services/notification.service";

export const sendMessage = async (req: Request, res: Response) => {
  try {
    const rawTicketId = req.params.ticketId ?? req.params.id;
    const ticketId = Array.isArray(rawTicketId) ? rawTicketId[0] : rawTicketId;
    const { content } = req.body as { content?: string };

    if (!ticketId) {
      return res.status(400).json({ error: "ticketId is required" });
    }

    if (!content?.trim()) {
      return res.status(400).json({ error: "content is required" });
    }

    const orgId = req.user?.orgId;
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    if (!orgId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const ticket = await prisma.ticket.findFirst({
      where: { id: ticketId, orgId },
      include: { assignedAgent: true },
    });

    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    if (userRole === "AGENT" && ticket.assignedAgent?.userId !== userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Enhanced permission validation for customers
    if (userRole === "CUSTOMER") {
      // Customer can only access tickets they created OR tickets associated with their customer record
      const customer = await prisma.customer.findFirst({
        where: {
          orgId,
          userId
        },
        select: { id: true }
      });

      const isTicketOwner = ticket.createdByUserId === userId;
      const isTicketAssociated = customer && ticket.customerId === customer.id;

      if (!isTicketOwner && !isTicketAssociated) {
        return res.status(403).json({ error: "Forbidden: You can only access your own tickets" });
      }
    }

    const messageRole = userRole === "CUSTOMER" ? "CUSTOMER" : "AGENT";

    // Acquire lock before persisting the message so failed lock attempts do not
    // create duplicate or partially-processed messages.
    const lockAcquired = await messageLockService.acquireLock({
      ticketId,
      userId: userId ?? "system",
      lockType: messageRole === 'CUSTOMER' ? 'AI_PROCESSING' : 'AGENT_REPLY'
    });

    if (!lockAcquired) {
      return res.status(429).json({ 
        error: "Message processing in progress", 
        message: "Another user is currently processing this message. Please wait." 
      });
    }

    const userMessage = await prisma.ticketMessage.create({
      data: {
        ticketId,
        senderId: userId ?? null,
        role: messageRole,
        content,
      },
    });

    const io = req.app.get("io");

    try {
      if (messageRole === "CUSTOMER") {
        const aiInProgressDb = toDbStatus("AI_IN_PROGRESS");
        await prisma.ticket.update({
          where: { id: ticketId },
          data: { status: aiInProgressDb },
        });

        io.to(`ticket-${ticketId}`).emit("message-added", userMessage);
        io.to(`ticket-${ticketId}`).emit("customer_message", userMessage);
        io.to(`org-${orgId}`).emit("ticket-updated", { id: ticketId, status: "AI_IN_PROGRESS" });
        io.to(`org-${orgId}`).emit("ticket_update", { ticketId, status: "AI_IN_PROGRESS" });

        const aiRun = await runAgentDetailed(content, orgId, ticketId, io);
        const aiMessage = await prisma.ticketMessage.create({
          data: {
            ticketId,
            role: "AI",
            content: aiRun.reply,
          },
        });

        const { status: nextStatus } = await TicketService.applyAiOutcome(ticketId, orgId, aiRun);

        io.to(`ticket-${ticketId}`).emit("newMessage", aiMessage);
        io.to(`ticket-${ticketId}`).emit("message-added", aiMessage);
        io.to(`ticket-${ticketId}`).emit("ai_reply", aiMessage);
        io.to(`ticket-${ticketId}`).emit("ai_mode", { ticketId, mode: aiRun.mode });
        io.to(`org-${orgId}`).emit("ticket-updated", { id: ticketId, status: nextStatus });
        io.to(`org-${orgId}`).emit("ticket_update", { ticketId, status: nextStatus });
        await NotificationService.sendMessageNotification(ticketId, "AI", orgId);

        return res.json({
          success: true,
          userMessage,
          aiMessage,
          aiMode: aiRun.mode,
        });
      }

      // Agent message handling
      io.to(`ticket-${ticketId}`).emit("message-added", userMessage);
      io.to(`ticket-${ticketId}`).emit("agent_reply", userMessage);
      await appendMemory(orgId, ticketId, "AGENT", content);
      await NotificationService.sendMessageNotification(ticketId, "AGENT", orgId);

      // Enterprise workflow: first human reply on escalated ticket moves it to IN_PROGRESS.
      const currentStatus = toApiStatus(ticket.status);
      if (currentStatus === "ESCALATED") {
        await prisma.ticket.update({
          where: { id: ticketId },
          data: { status: toDbStatus("IN_PROGRESS") },
        });
        io.to(`org-${orgId}`).emit("ticket-updated", { id: ticketId, status: "IN_PROGRESS" });
        io.to(`org-${orgId}`).emit("ticket_update", { ticketId, status: "IN_PROGRESS" });
      }

      return res.json({
        success: true,
        userMessage,
      });
    } finally {
      // Always release the lock
      await messageLockService.releaseLock(ticketId, messageRole === 'CUSTOMER' ? 'AI_PROCESSING' : 'AGENT_REPLY');
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to process message" });
  }
};
