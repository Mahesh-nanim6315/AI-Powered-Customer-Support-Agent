import { Request, Response } from "express";
import { TicketService } from "./tickets.service";
import { createTicketSchema, updateStatusSchema, updateTicketSchema } from "./tickets.validators";
import {
  normalizeTicketForApi,
  normalizeTicketListForApi,
} from "./ticketStatus.lifecycle";

export class TicketController {

  static async create(req: any, res: Response) {
    try {
      const data = createTicketSchema.parse(req.body);

      // For CUSTOMER role, ensure they can only create tickets for themselves
      if (req.user.role === "CUSTOMER") {
        // Get customer ID from user's associated customer record
        const prisma = require("../../config/database").default;
        const customer = await prisma.customer.findFirst({
          where: {
            orgId: req.user.orgId,
            userId: req.user.id
          }
        }) ?? await prisma.customer.findFirst({
          where: {
            orgId: req.user.orgId,
            email: req.user.email
          }
        });

        if (!customer) {
          return res.status(400).json({ message: "Customer profile not found" });
        }

        data.customerId = customer.id;
      }

      // Create ticket with createdByUserId for tracking
      const ticketData = {
        ...data,
        createdByUserId: req.user.id // Track who created the ticket
      };

      const ticket = await TicketService.createTicket(
        req.user.orgId,
        ticketData
      );

      res.status(201).json(normalizeTicketForApi(ticket));
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async getAll(req: any, res: Response) {
    let tickets = await TicketService.getTickets(req.user.orgId);

    // If user is AGENT, only show tickets assigned to them
    if (req.user.role === "AGENT") {
      const prisma = require("../../config/database").default;
      tickets = await prisma.ticket.findMany({
        where: {
          orgId: req.user.orgId,
          assignedAgent: {
            userId: req.user.id
          }
        },
        include: {
          customer: true,
          assignedAgent: {
            include: {
              user: true
            }
          },
          messages: true
        },
        orderBy: { createdAt: "desc" }
      });
    }

    // If user is CUSTOMER, only show their own tickets
    if (req.user.role === "CUSTOMER") {
      // For customers, only show their own tickets
      const prisma = require("../../config/database").default;
      const customer = await prisma.customer.findFirst({
        where: {
          orgId: req.user.orgId,
          userId: req.user.id
        },
        select: { id: true }
      });

      const whereClause = customer
        ? { orgId: req.user.orgId, customerId: customer.id }
        : { orgId: req.user.orgId, createdByUserId: req.user.id };

      tickets = await prisma.ticket.findMany({
        where: whereClause,
        include: {
          customer: true,
          assignedAgent: {
            include: {
              user: true
            }
          },
          messages: true
        }
      });
    }

    res.json(normalizeTicketListForApi(tickets));
  }

  static async getUnassigned(req: any, res: Response) {
    try {
      const prisma = require("../../config/database").default;
      const tickets = await prisma.ticket.findMany({
        where: {
          orgId: req.user.orgId,
          assignedAgentId: null,
        },
        include: {
          customer: true,
          assignedAgent: {
            include: {
              user: true
            }
          },
          messages: true
        },
        orderBy: { createdAt: "desc" }
      });

      res.json(normalizeTicketListForApi(tickets));
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async getById(req: any, res: Response) {
    try {
      const prisma = require("../../config/database").default;
      if (req.user.role === "AGENT") {
        const allowedTicket = await prisma.ticket.findFirst({
          where: {
            id: req.params.id,
            orgId: req.user.orgId,
            assignedAgent: {
              userId: req.user.id
            }
          },
        });

        if (!allowedTicket) {
          return res.status(403).json({ message: "Forbidden" });
        }
      }

      if (req.user.role === "CUSTOMER") {
        const allowedTicket = await prisma.ticket.findFirst({
          where: {
            id: req.params.id,
            orgId: req.user.orgId,
            createdByUserId: req.user.id,
          },
          select: { id: true }
        });

        if (!allowedTicket) {
          return res.status(403).json({ message: "Forbidden" });
        }
      }

      const ticket = await TicketService.getTicketById(
        req.params.id,
        req.user.orgId
      );
      res.json(normalizeTicketForApi(ticket));
    } catch (error: any) {
      res.status(404).json({ message: error.message });
    }
  }

  static async updateStatus(req: any, res: Response) {
    try {
      const data = updateStatusSchema.parse(req.body);
      const prisma = require("../../config/database").default;
      if (req.user.role === "AGENT") {
        const allowedTicket = await prisma.ticket.findFirst({
          where: {
            id: req.params.id,
            orgId: req.user.orgId,
            assignedAgent: {
              userId: req.user.id
            }
          },
          select: { id: true }
        });

        if (!allowedTicket) {
          return res.status(403).json({ message: "Forbidden" });
        }
      }

      const ticket = await TicketService.updateTicketStatus(
        req.params.id,
        req.user.orgId,
        data.status
      );

      res.json(ticket);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async update(req: any, res: Response) {
    try {
      const data = updateTicketSchema.parse(req.body);
      const prisma = require("../../config/database").default;

      if (req.user.role === "AGENT") {
        const allowedTicket = await prisma.ticket.findFirst({
          where: {
            id: req.params.id,
            orgId: req.user.orgId,
            assignedAgent: {
              userId: req.user.id
            }
          },
          select: { id: true }
        });

        if (!allowedTicket) {
          return res.status(403).json({ message: "Forbidden" });
        }
      }

      if (req.user.role === "CUSTOMER") {
        const allowedTicket = await prisma.ticket.findFirst({
          where: {
            id: req.params.id,
            orgId: req.user.orgId,
            createdByUserId: req.user.id,
          },
          select: { id: true }
        });

        if (!allowedTicket) {
          return res.status(403).json({ message: "Forbidden" });
        }
      }

      const ticket = await TicketService.updateTicketDetails(req.params.id, req.user.orgId, data);
      res.json(ticket);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async delete(req: any, res: Response) {
    try {
      const prisma = require("../../config/database").default;

      if (req.user.role === "AGENT") {
        const allowedTicket = await prisma.ticket.findFirst({
          where: {
            id: req.params.id,
            orgId: req.user.orgId,
            assignedAgent: {
              userId: req.user.id
            }
          },
          select: { id: true }
        });

        if (!allowedTicket) {
          return res.status(403).json({ message: "Forbidden" });
        }
      }

      if (req.user.role === "CUSTOMER") {
        const allowedTicket = await prisma.ticket.findFirst({
          where: {
            id: req.params.id,
            orgId: req.user.orgId,
            createdByUserId: req.user.id,
          },
          select: { id: true }
        });

        if (!allowedTicket) {
          return res.status(403).json({ message: "Forbidden" });
        }
      }

      await TicketService.deleteTicket(req.params.id, req.user.orgId);
      res.json({ success: true, id: req.params.id });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }
}
