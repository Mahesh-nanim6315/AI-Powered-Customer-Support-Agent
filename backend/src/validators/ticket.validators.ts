import { z } from "zod";
import { 
  uuidSchema, 
  emailSchema, 
  subjectSchema, 
  messageSchema, 
  prioritySchema, 
  statusSchema,
  sanitizeString,
  sanitizeHtml
} from "./common.validators";

// Create ticket validation
export const createTicketSchema = z.object({
  customerId: uuidSchema.optional(),
  subject: subjectSchema.transform(sanitizeString),
  description: messageSchema.transform(sanitizeHtml).optional(),
  priority: prioritySchema.default("MEDIUM")
});

// Update ticket validation
export const updateTicketSchema = z.object({
  subject: subjectSchema.transform(sanitizeString).optional(),
  description: messageSchema.transform(sanitizeHtml).optional(),
  priority: prioritySchema.optional()
});

// Update status validation
export const updateStatusSchema = z.object({
  status: statusSchema
});

// Send message validation
export const sendMessageSchema = z.object({
  content: messageSchema.transform(sanitizeHtml)
});

// Get ticket validation
export const getTicketSchema = z.object({
  id: uuidSchema
});

// Ticket list filters
export const ticketListSchema = z.object({
  status: statusSchema.optional(),
  priority: prioritySchema.optional(),
  customerId: uuidSchema.optional(),
  assignedAgentId: uuidSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(200).optional()
});

// Bulk operations
export const bulkUpdateSchema = z.object({
  ticketIds: z.array(uuidSchema).min(1, "At least one ticket ID is required").max(50, "Cannot update more than 50 tickets at once"),
  status: statusSchema.optional(),
  priority: prioritySchema.optional(),
  assignedAgentId: uuidSchema.optional()
});

// Ticket assignment
export const assignTicketSchema = z.object({
  ticketId: uuidSchema,
  agentId: uuidSchema
});

// Export types for use in controllers
export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type BulkUpdateInput = z.infer<typeof bulkUpdateSchema>;
export type AssignTicketInput = z.infer<typeof assignTicketSchema>;
