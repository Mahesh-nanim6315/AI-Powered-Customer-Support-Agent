import { Request, Response } from "express";
import { createCustomerSchema } from "./customers.validators";
import { CustomersService } from "./customers.service";

export class CustomersController {
  static async create(req: Request, res: Response) {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ message: "Unauthorized" });

    const data = createCustomerSchema.parse(req.body);
    const customer = await CustomersService.create(orgId, data);
    return res.status(201).json(customer);
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
}

