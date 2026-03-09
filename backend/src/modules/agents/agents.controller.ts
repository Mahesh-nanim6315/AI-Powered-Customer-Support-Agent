import { Request, Response } from "express";
import prisma from "../../config/database";
import bcrypt from "bcrypt";

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

    const { email, password, specialization } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    try {
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) return res.status(400).json({ message: "User already exists" });

      const hashedPassword = await bcrypt.hash(password, 10);

      // Create User and Agent in a transaction
      const newUser = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          role: "AGENT",
          orgId,
          agent: {
            create: {
              specialization: specialization || null,
            }
          }
        },
        include: {
          agent: true
        }
      });

      return res.status(201).json({
        id: newUser.agent?.id,
        userId: newUser.id,
        specialization: newUser.agent?.specialization,
        user: { id: newUser.id, email: newUser.email, role: newUser.role }
      });
    } catch (error: any) {
      console.error(error);
      return res.status(500).json({ message: "Failed to create agent" });
    }
  }

  static async update(req: Request, res: Response) {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ message: "Unauthorized" });

    const id = req.params.id as string;
    const { specialization, email, password } = req.body;

    try {
      // Find the agent 
      const agent: any = await prisma.agent.findUnique({
        where: { id },
        include: { user: true }
      });

      if (!agent || agent.user.orgId !== orgId) {
        return res.status(404).json({ message: "Agent not found" });
      }

      const userUpdateData: any = {};
      if (email && email !== agent.user.email) {
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) return res.status(400).json({ message: "Email already in use" });
        userUpdateData.email = email;
      }

      if (password) {
        userUpdateData.password = await bcrypt.hash(password, 10);
      }

      // Perform updates
      const updatedAgent = await prisma.$transaction(async (tx) => {
        if (Object.keys(userUpdateData).length > 0) {
          await tx.user.update({
            where: { id: agent.userId },
            data: userUpdateData
          });
        }

        return await tx.agent.update({
          where: { id },
          data: { specialization: specialization !== undefined ? specialization : agent.specialization },
          include: { user: { select: { id: true, email: true, role: true } } }
        });
      });

      return res.json(updatedAgent);
    } catch (error: any) {
      console.error(error);
      return res.status(500).json({ message: "Failed to update agent" });
    }
  }

  static async delete(req: Request, res: Response) {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ message: "Unauthorized" });

    const id = req.params.id as string;

    try {
      const agent: any = await prisma.agent.findUnique({
        where: { id },
        include: { user: true }
      });

      if (!agent || agent.user.orgId !== orgId) {
        return res.status(404).json({ message: "Agent not found" });
      }

      // Unassign any assigned tickets
      await prisma.ticket.updateMany({
        where: { assignedAgentId: id },
        data: { assignedAgentId: null, status: "OPEN" }
      });

      // Delete agent, then user
      await prisma.$transaction([
        prisma.agent.delete({ where: { id } }),
        prisma.user.delete({ where: { id: agent.userId } })
      ]);

      return res.json({ success: true, id });
    } catch (error: any) {
      console.error(error);
      return res.status(500).json({ message: "Failed to delete agent" });
    }
  }
}