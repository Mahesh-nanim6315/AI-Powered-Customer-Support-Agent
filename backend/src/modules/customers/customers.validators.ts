import { z } from "zod";

export const createCustomerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  metadata: z.record(z.string(), z.any()).optional(),
});

