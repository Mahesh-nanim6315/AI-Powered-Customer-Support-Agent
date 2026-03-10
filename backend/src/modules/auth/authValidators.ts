import { z } from "zod";

export const registerSchema = z.object({
    orgName: z.string().min(3),
    email: z.string().email(),
    password: z.string().min(6)
});

export const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6)
});

export const switchOrgSchema = z.object({
    orgId: z.string().min(1)
});

export const inviteSchema = z.object({
    email: z.string().email(),
    role: z.enum(["ADMIN", "AGENT", "CUSTOMER"]).optional().default("AGENT")
});

export const acceptInviteSchema = z.object({
    token: z.string().min(10),
    password: z.string().min(6).optional()
});

export const registerCustomerSchema = z.object({
    orgId: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(6),
    name: z.string().min(2)
});
