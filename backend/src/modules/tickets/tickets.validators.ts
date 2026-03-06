import { z } from "zod";

export const createTicketSchema = z.object({
  customerId: z.string(),
  subject: z.string().min(3),
  description: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional().default("MEDIUM"),
  createdByUserId: z.string().optional()
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