import { z } from "zod";
import { 
  uuidSchema,
  sanitizeString,
  sanitizeHtml
} from "./common.validators";

// Create knowledge base entry validation
export const createKnowledgeSchema = z.object({
  title: z.string()
    .min(1, "Title is required")
    .max(200, "Title too long")
    .transform(sanitizeString),
  category: z.string()
    .min(1, "Category is required")
    .max(100, "Category too long")
    .transform(sanitizeString)
    .default("General"),
  content: z.string()
    .min(1, "Content is required")
    .max(50000, "Content too long")
    .transform(sanitizeHtml)
});

// Update knowledge base entry validation
export const updateKnowledgeSchema = z.object({
  title: z.string()
    .min(1, "Title is required")
    .max(200, "Title too long")
    .transform(sanitizeString)
    .optional(),
  category: z.string()
    .min(1, "Category is required")
    .max(100, "Category too long")
    .transform(sanitizeString)
    .optional(),
  content: z.string()
    .min(1, "Content is required")
    .max(50000, "Content too long")
    .transform(sanitizeHtml)
    .optional()
});

// Knowledge base search validation
export const searchKnowledgeSchema = z.object({
  query: z.string()
    .min(1, "Search query is required")
    .max(500, "Search query too long")
    .transform(sanitizeString),
  category: z.string()
    .max(100, "Category too long")
    .transform(sanitizeString)
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10)
});

// Export types
export type CreateKnowledgeInput = z.infer<typeof createKnowledgeSchema>;
export type UpdateKnowledgeInput = z.infer<typeof updateKnowledgeSchema>;
export type SearchKnowledgeInput = z.infer<typeof searchKnowledgeSchema>;
