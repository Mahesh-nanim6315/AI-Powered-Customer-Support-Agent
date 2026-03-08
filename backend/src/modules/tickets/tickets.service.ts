import { TicketRepository } from "./tickets.repository";
import prisma from "../../config/database";
import { AgentService } from "../agents/agents.service";
import { io } from "../../server";
import { addAIJob } from "../../queues/bullmq";
import {
  canTransitionStatus,
  normalizeApiStatus,
  normalizeTicketForApi,
  toApiStatus,
  toDbStatus,
} from "./ticketStatus.lifecycle";


export class TicketService {

  static async createTicket(orgId: string, data: any) {

    const assignedAgent = await AgentService.assignAgent(orgId);

    const ticket = await TicketRepository.create({
      orgId,
      customerId: data.customerId,
      createdByUserId: data.createdByUserId, // Track who created the ticket
      subject: data.subject,
      description: data.description,
      priority: data.priority,
      assignedAgentId: assignedAgent?.id,
      messages: {
        create: {
          role: "CUSTOMER",
          content: data.description || "No description provided"
        }
      }
    });

    io.to(`org-${orgId}`).emit("ticket-created", ticket);
    io.to(`org-${orgId}`).emit("ticket_update", { ticketId: ticket.id, status: "OPEN" });

    // Immediately move to AI handling and queue the first AI response.
    const aiHandlingTicket = await TicketRepository.updateStatus(ticket.id, orgId, "AI_HANDLING");
    if (aiHandlingTicket) {
      io.to(`org-${orgId}`).emit("ticket-updated", aiHandlingTicket);
      io.to(`org-${orgId}`).emit("ticket_update", { ticketId: ticket.id, status: "AI_HANDLING" });
    }

    try {
      await addAIJob({
        ticketId: ticket.id,
        orgId,
        message: data.description || data.subject || "New ticket received",
        isInitialProcessing: true,
        delayMs: 12000,
      });
    } catch (queueError) {
      console.error("Failed to enqueue AI job:", queueError);
    }

    return aiHandlingTicket || ticket;
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
    const currentTicket = await TicketRepository.findById(id, orgId);
    if (!currentTicket) {
      throw new Error("Ticket not found");
    }

    const currentStatus = toApiStatus(currentTicket.status);
    const nextStatus = normalizeApiStatus(String(status));
    if (!canTransitionStatus(currentStatus, nextStatus)) {
      throw new Error(`Invalid status transition: ${currentStatus} -> ${nextStatus}`);
    }

    const ticket = await TicketRepository.updateStatus(id, orgId, toDbStatus(nextStatus));
    if (!ticket) {
      throw new Error("Ticket not found");
    }

    const apiTicket = normalizeTicketForApi(ticket);
    io.to(`org-${orgId}`).emit("ticket-updated", apiTicket);
    io.to(`org-${orgId}`).emit("ticket_update", { ticketId: id, status: nextStatus });
    return apiTicket;
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

  static async updateTicketDetails(
    id: string,
    orgId: string,
    data: {
      subject?: string;
      description?: string;
      priority?: "LOW" | "MEDIUM" | "HIGH";
    }
  ) {
    const ticket = await TicketRepository.updateDetails(id, orgId, data);
    if (!ticket) {
      throw new Error("Ticket not found");
    }

    const apiTicket = normalizeTicketForApi(ticket);
    io.to(`org-${orgId}`).emit("ticket-updated", apiTicket);
    return apiTicket;
  }

  static async deleteTicket(id: string, orgId: string) {
    const deleted = await TicketRepository.deleteById(id, orgId);
    if (!deleted) {
      throw new Error("Ticket not found");
    }

    io.to(`org-${orgId}`).emit("ticket-deleted", { ticketId: id });
    return deleted;
  }

}   
