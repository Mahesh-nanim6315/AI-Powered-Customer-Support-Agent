import { z } from "zod";

export const createTicketSchema = z.object({
  customerId: z.string(),
  subject: z.string().min(3),
  description: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional().default("MEDIUM"),
  createdByUserId: z.string().optional()
});

export const updateStatusSchema = z.object({
  status: z.string().transform((value) => value.toUpperCase()).refine((value) =>
    [
      "OPEN",
      "AI_HANDLING",
      "WAITING_FOR_HUMAN",
      "ESCALATED",
      "IN_PROGRESS",
      "RESOLVED",
      "CLOSED",
    ].includes(value), "Invalid status"),
});

export const updateTicketSchema = z.object({
  subject: z.string().min(3).optional(),
  description: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: "At least one field is required",
});
