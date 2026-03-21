import { z } from "zod";
import { 
  uuidSchema, 
  nameSchema,
  sanitizeString
} from "./common.validators";

// Create agent validation
export const createAgentSchema = z.object({
  userId: uuidSchema,
  specialization: nameSchema.transform(sanitizeString).optional()
});

// Update agent validation
export const updateAgentSchema = z.object({
  specialization: nameSchema.transform(sanitizeString).optional(),
  busyStatus: z.boolean().optional()
});

// Agent list filters
export const agentListSchema = z.object({
  busyStatus: z.boolean().optional(),
  specialization: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

// Assign agent validation
export const assignAgentSchema = z.object({
  agentId: uuidSchema
});

// Export types
export type CreateAgentInput = z.infer<typeof createAgentSchema>;
export type UpdateAgentInput = z.infer<typeof updateAgentSchema>;
export type AssignAgentInput = z.infer<typeof assignAgentSchema>;
