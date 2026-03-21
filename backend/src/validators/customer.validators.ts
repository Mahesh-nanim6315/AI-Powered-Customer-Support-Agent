import { z } from "zod";
import { 
  uuidSchema, 
  emailSchema, 
  nameSchema,
  sanitizeString,
  sanitizeHtml
} from "./common.validators";

// Create customer validation
export const createCustomerSchema = z.object({
  email: emailSchema,
  name: nameSchema.transform(sanitizeString),
  metadata: z.record(z.string(), z.any()).optional()
});

// Update customer validation
export const updateCustomerSchema = z.object({
  name: nameSchema.transform(sanitizeString).optional(),
  status: z.enum(["PENDING", "ACTIVE"]).optional(),
  metadata: z.record(z.string(), z.any()).optional()
});

// Accept customer invite validation
export const acceptCustomerInviteSchema = z.object({
  token: z.string().min(1, "Token is required").max(255, "Invalid token format"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password too long")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Password must contain at least one uppercase letter, one lowercase letter, and one number")
});

// Customer list filters
export const customerListSchema = z.object({
  status: z.enum(["PENDING", "ACTIVE"]).optional(),
  search: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

// Export types
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type AcceptCustomerInviteInput = z.infer<typeof acceptCustomerInviteSchema>;
