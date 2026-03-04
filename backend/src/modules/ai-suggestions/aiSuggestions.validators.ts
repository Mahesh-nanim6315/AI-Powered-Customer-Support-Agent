import { z } from "zod";

export const listSuggestionsQuerySchema = z.object({
  ticketId: z.string().uuid().optional(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "EXECUTED"]).optional(),
});

export const approveSuggestionSchema = z.object({
  // if false, just marks APPROVED; if true, approve+execute in one step
  execute: z.boolean().optional().default(true),
});

