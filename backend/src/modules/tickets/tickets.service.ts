import { TicketRepository } from "./tickets.repository";
import prisma from "../../config/database";
import { AgentService } from "../agents/agents.service";
import { io } from "../../server";


export class TicketService {

  static async createTicket(orgId: string, data: any) {

  const assignedAgent = await AgentService.assignAgent(orgId);

  const ticket = await TicketRepository.create({
    orgId,
    customerId: data.customerId,
    subject: data.subject,
    assignedAgentId: assignedAgent?.id,
    messages: {
      create: {
        role: "CUSTOMER",
        content: data.content
      }
    }
  });

  io.to(`org-${orgId}`).emit("ticket-created", ticket);

  return ticket;
}


  static async getTickets(orgId: string) {
    return TicketRepository.findAll(orgId);
  }

  static async getTicketById(id: string, orgId: string) {
    const ticket = await TicketRepository.findById(id, orgId);

    if (!ticket) {
      throw new Error("Ticket not found");
    }

    return ticket;
  }

  static async updateTicketStatus(id: string, orgId: string, status: any) {
    const ticket = await TicketRepository.updateStatus(id, orgId, status);
    io.to(`org-${orgId}`).emit("ticket-updated", ticket);
    return ticket;
  }

  static async addMessage(ticketId: string, orgId: string, role: any, content: string) {

  const message = await prisma.ticketMessage.create({
    data: {
      ticketId,
      role,
      content
    }
  });

  io.to(`ticket-${ticketId}`).emit("message-added", message);

  return message;
}

}   
