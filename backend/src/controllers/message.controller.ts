import { Request, Response } from "express";
import prisma from "../config/database";
import { runAgentDetailed } from "../services/agent.service";
import { appendMemory } from "../ai/memory.service";

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

    if (userRole === "CUSTOMER" && ticket.createdByUserId !== userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const messageRole = userRole === "CUSTOMER" ? "CUSTOMER" : "AGENT";
    const userMessage = await prisma.ticketMessage.create({
      data: {
        ticketId,
        senderId: userId,
        role: messageRole,
        content,
      },
    });

    const io = req.app.get("io");
    if (messageRole === "CUSTOMER") {
      await prisma.ticket.update({
        where: { id: ticketId },
        data: { status: "AI_HANDLING" },
      });

      io.to(`ticket-${ticketId}`).emit("message-added", userMessage);
      io.to(`ticket-${ticketId}`).emit("customer_message", userMessage);
      io.to(`org-${orgId}`).emit("ticket-updated", { id: ticketId, status: "AI_HANDLING" });
      io.to(`org-${orgId}`).emit("ticket_update", { ticketId, status: "AI_HANDLING" });

      const aiRun = await runAgentDetailed(content, orgId, ticketId, io);
      const aiMessage = await prisma.ticketMessage.create({
        data: {
          ticketId,
          role: "AI",
          content: aiRun.reply,
        },
      });

      const nextStatus = aiRun.shouldEscalate ? "ESCALATED" : "WAITING_FOR_HUMAN";
      await prisma.ticket.update({
        where: { id: ticketId },
        data: { status: nextStatus as any },
      });

      io.to(`ticket-${ticketId}`).emit("newMessage", aiMessage);
      io.to(`ticket-${ticketId}`).emit("message-added", aiMessage);
      io.to(`ticket-${ticketId}`).emit("ai_reply", aiMessage);
      io.to(`ticket-${ticketId}`).emit("ai_mode", { ticketId, mode: aiRun.mode });
      io.to(`org-${orgId}`).emit("ticket-updated", { id: ticketId, status: nextStatus });
      io.to(`org-${orgId}`).emit("ticket_update", { ticketId, status: nextStatus });

      return res.json({
        success: true,
        userMessage,
        aiMessage,
        aiMode: aiRun.mode,
      });
    }

    io.to(`ticket-${ticketId}`).emit("message-added", userMessage);
    io.to(`ticket-${ticketId}`).emit("agent_reply", userMessage);
    await appendMemory(orgId, ticketId, "AGENT", content);

    // Enterprise workflow: first human reply on escalated ticket moves it to IN_PROGRESS.
    if (ticket.status === "ESCALATED" || ticket.status === "WAITING_FOR_HUMAN") {
      await prisma.ticket.update({
        where: { id: ticketId },
        data: { status: "IN_PROGRESS" as any },
      });
      io.to(`org-${orgId}`).emit("ticket-updated", { id: ticketId, status: "IN_PROGRESS" });
      io.to(`org-${orgId}`).emit("ticket_update", { ticketId, status: "IN_PROGRESS" });
    }

    return res.json({
      success: true,
      userMessage,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to process message" });
  }
};
