import { Request, Response } from "express";
import { TicketService } from "./tickets.service";
import { createTicketSchema, updateStatusSchema } from "./tickets.validators";

export class TicketController {

  static async create(req: any, res: Response) {
    try {
      const data = createTicketSchema.parse(req.body);

      const ticket = await TicketService.createTicket(
        req.user.orgId,
        data
      );

      res.status(201).json(ticket);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async getAll(req: any, res: Response) {
    const tickets = await TicketService.getTickets(req.user.orgId);
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