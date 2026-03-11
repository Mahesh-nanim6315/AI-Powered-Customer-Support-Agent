import { z } from "zod";

export const createCustomerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const acceptCustomerInviteSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(6),
});

