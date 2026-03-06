import { Request, Response } from "express";
import { TicketService } from "./tickets.service";
import { createTicketSchema, updateStatusSchema } from "./tickets.validators";

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
            email: req.user.email // Match by email
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

      res.status(201).json(ticket);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async getAll(req: any, res: Response) {
    let tickets = await TicketService.getTickets(req.user.orgId);

    // If user is CUSTOMER, only show their own tickets
    if (req.user.role === "CUSTOMER") {
      // For customers, we need to find tickets where they are the creator
      // or where they are associated as the customer
      const prisma = require("../../config/database").default;
      tickets = await prisma.ticket.findMany({
        where: {
          orgId: req.user.orgId,
          createdByUserId: req.user.id
        },
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

    res.json(tickets);
  }

  static async getById(req: any, res: Response) {
    try {
      const ticket = await TicketService.getTicketById(
        req.params.id,
        req.user.orgId
      );
      res.json(ticket);
    } catch (error: any) {
      res.status(404).json({ message: error.message });
    }
  }

  static async updateStatus(req: any, res: Response) {
    try {
      const data = updateStatusSchema.parse(req.body);

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
}
