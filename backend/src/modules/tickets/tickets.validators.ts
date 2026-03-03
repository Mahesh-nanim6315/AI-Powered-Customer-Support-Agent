import { z } from "zod";

export const createTicketSchema = z.object({
  customerId: z.string(),
  subject: z.string().min(3),
  content: z.string().min(3)
});

export const updateStatusSchema = z.object({
  status: z.enum([
    "OPEN",
    "AI_HANDLING",
    "WAITING_FOR_HUMAN",
    "RESOLVED",
    "CLOSED"
  ])
});