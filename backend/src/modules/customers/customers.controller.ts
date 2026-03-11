import { Request, Response } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { acceptCustomerInviteSchema, createCustomerSchema } from "./customers.validators";
import { CustomersService } from "./customers.service";

export class CustomersController {
  static async create(req: Request, res: Response) {
    try {
      const orgId = req.user?.orgId;
      if (!orgId) return res.status(401).json({ message: "Unauthorized" });

      const data = createCustomerSchema.parse(req.body);
      const result = await CustomersService.create(orgId, data);
      return res.status(201).json(result);
    } catch (error: any) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: error.errors[0]?.message || "Invalid request" });
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return res.status(409).json({ message: "Customer already exists" });
      }
      if (error?.message === "Customer already exists") {
        return res.status(409).json({ message: error.message });
      }
      return res.status(400).json({ message: error.message || "Failed to create customer" });
    }
  }

  static async list(req: Request, res: Response) {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ message: "Unauthorized" });

    const customers = await CustomersService.list(orgId);
    return res.json(customers);
  }

  static async getById(req: Request, res: Response) {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ message: "Unauthorized" });

    const rawId = (req.params as any).id as string | string[];
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    const customer = await CustomersService.getById(orgId, id);
    if (!customer) return res.status(404).json({ message: "Customer not found" });
    return res.json(customer);
  }

  static async acceptInvite(req: Request, res: Response) {
    try {
      const data = acceptCustomerInviteSchema.parse(req.body);
      const customer = await CustomersService.acceptInvite(data.token, data.password);
      return res.json({
        message: "Customer account activated",
        customer,
      });
    } catch (error: any) {
      return res.status(400).json({ message: error.message || "Failed to accept invite" });
    }
  }
}

