import { Request, Response } from "express";
import prisma from "../config/database";
import { runAgent } from "../services/agent.service";

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
    if (!orgId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userMessage = await prisma.ticketMessage.create({
      data: {
        ticketId,
        role: "CUSTOMER",
        content,
      },
    });

    const io = req.app.get("io");
    const aiReply = await runAgent(content, orgId, ticketId, io);

    const aiMessage = await prisma.ticketMessage.create({
      data: {
        ticketId,
        role: "AI",
        content: aiReply,
      },
    });

    io.to(`ticket-${ticketId}`).emit("newMessage", aiMessage);

    return res.json({
      success: true,
      userMessage,
      aiMessage,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to process message" });
  }
};
