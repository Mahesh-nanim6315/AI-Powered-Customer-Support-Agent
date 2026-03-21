import { z } from "zod";

// Common validation schemas
export const uuidSchema = z.string().uuid("Invalid ID format");

export const emailSchema = z.string().email("Invalid email format").min(1, "Email is required").max(254, "Email too long");

export const passwordSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password too long")
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Password must contain at least one uppercase letter, one lowercase letter, and one number");

export const nameSchema = z.string()
  .min(1, "Name is required")
  .max(100, "Name too long")
  .regex(/^[a-zA-Z\s'-]+$/, "Name can only contain letters, spaces, hyphens, and apostrophes");

export const orgNameSchema = z.string()
  .min(1, "Organization name is required")
  .max(100, "Organization name too long")
  .regex(/^[a-zA-Z0-9\s&.-]+$/, "Organization name contains invalid characters");

export const subjectSchema = z.string()
  .min(1, "Subject is required")
  .max(200, "Subject too long")
  .trim();

export const messageSchema = z.string()
  .min(1, "Message is required")
  .max(10000, "Message too long")
  .trim();

export const prioritySchema = z.enum(["LOW", "MEDIUM", "HIGH"], {
  message: "Priority must be LOW, MEDIUM, or HIGH"
});

export const roleSchema = z.enum(["ADMIN", "AGENT", "CUSTOMER"], {
  message: "Role must be ADMIN, AGENT, or CUSTOMER"
});

export const statusSchema = z.enum(["OPEN", "AI_IN_PROGRESS", "ESCALATED", "IN_PROGRESS", "WAITING_FOR_HUMAN", "RESOLVED", "CLOSED"], {
  message: "Invalid ticket status"
});

// Pagination
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1, "Page must be at least 1").default(1),
  limit: z.coerce.number().int().min(1, "Limit must be at least 1").max(100, "Limit cannot exceed 100").default(20)
});

// Search
export const searchSchema = z.object({
  query: z.string().min(1, "Search query is required").max(100, "Search query too long").trim(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

// File upload validation
export const fileUploadSchema = z.object({
  filename: z.string().min(1, "Filename is required").max(255, "Filename too long"),
  mimetype: z.string().regex(/^image\/(jpeg|png|gif|webp)|application\/pdf|text\/plain$/, "Invalid file type"),
  size: z.number().max(10 * 1024 * 1024, "File size cannot exceed 10MB")
});

// Sanitization helpers
export const sanitizeString = (str: string): string => {
  return str
    .trim()
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/[<>]/g, ''); // Remove potential HTML tags
};

export const sanitizeHtml = (str: string): string => {
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
    .replace(/<[^>]*>/g, ''); // Remove all HTML tags
};
