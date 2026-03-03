// src/controllers/message.controller.ts

import { Request, Response } from "express";
import prisma from "../lib/prisma";
import { runRAG } from "../services/rag.service";

export const sendMessage = async (req: Request, res: Response) => {
  const { ticketId } = req.params;
  const { content } = req.body;

  // 1️⃣ Save user message
  const userMessage = await prisma.ticketMessage.create({
    data: {
      ticketId,
      sender: "USER",
      content,
    },
  });

  // 2️⃣ Run AI Brain
  const aiReply = await runRAG(content);

  // 3️⃣ Save AI message
  const aiMessage = await prisma.ticketMessage.create({
    data: {
      ticketId,
      sender: "AI",
      content: aiReply,
    },
  });

  // 4️⃣ Emit real-time
  req.app.get("io").to(ticketId).emit("newMessage", aiMessage);

  return res.json({
    success: true,
    userMessage,
    aiMessage,
  });
};