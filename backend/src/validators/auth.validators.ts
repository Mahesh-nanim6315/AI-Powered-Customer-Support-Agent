import { z } from "zod";
import { 
  emailSchema, 
  passwordSchema, 
  nameSchema, 
  orgNameSchema, 
  roleSchema,
  sanitizeString
} from "./common.validators";

// Login validation
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required")
});

// Register validation
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  orgName: orgNameSchema.transform(sanitizeString)
});

// Switch organization validation
export const switchOrgSchema = z.object({
  orgId: z.string().uuid("Invalid organization ID")
});

// Invite user validation
export const inviteSchema = z.object({
  email: emailSchema,
  role: roleSchema
});

// Accept invite validation
export const acceptInviteSchema = z.object({
  token: z.string().min(1, "Token is required").max(255, "Invalid token format"),
  password: passwordSchema
});

// Register customer validation
export const registerCustomerSchema = z.object({
  orgId: z.string().uuid("Invalid organization ID"),
  email: emailSchema,
  password: passwordSchema.optional(),
  name: nameSchema.transform(sanitizeString)
});

// Update profile validation
export const updateProfileSchema = z.object({
  name: nameSchema.transform(sanitizeString).optional(),
  email: emailSchema.optional()
});

// Change password validation
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: passwordSchema,
  confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

// Export types
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type SwitchOrgInput = z.infer<typeof switchOrgSchema>;
export type InviteInput = z.infer<typeof inviteSchema>;
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;
export type RegisterCustomerInput = z.infer<typeof registerCustomerSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
