import { Request, Response } from "express";
import prisma from "../../config/database";

export class AgentsController {
  static async list(req: Request, res: Response) {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ message: "Unauthorized" });

    const agents = await prisma.agent.findMany({
      where: { user: { orgId } },
      include: { user: { select: { id: true, email: true, role: true } } },
      orderBy: { activeTickets: "asc" },
    });

    return res.json(agents);
  }

  static async create(req: Request, res: Response) {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ message: "Unauthorized" });

    const { userId, specialization } = req.body as {
      userId?: string;
      specialization?: string;
    };

    if (!userId) return res.status(400).json({ message: "userId is required" });

    // Ensure user belongs to org
    const user = await prisma.user.findFirst({ where: { id: userId, orgId } });
    if (!user) return res.status(404).json({ message: "User not found" });

    const agent = await prisma.agent.create({
      data: { userId, specialization },
    });

    return res.status(201).json(agent);
  }
}