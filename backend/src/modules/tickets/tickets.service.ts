import { TicketRepository } from "./tickets.repository";
import prisma from "../../config/database";
import { AgentService } from "../agents/agents.service";
import { io } from "../../server";
import { addAIJob, queuesEnabled } from "../../queues/bullmq";
import { runAgentDetailed, type AgentRunResult } from "../../services/agent.service";
import { NotificationService } from "../../services/notification.service";
import { TicketAssignmentHistoryService } from "../../services/ticketAssignmentHistory.service";
import {
  canTransitionStatus,
  normalizeApiStatus,
  normalizeTicketForApi,
  toApiStatus,
  toDbStatus,
} from "./ticketStatus.lifecycle";


export class TicketService {

  static async createTicket(orgId: string, data: any) {
    const ticket = await TicketRepository.create({
      orgId,
      customerId: data.customerId,
      createdByUserId: data.createdByUserId, // Track who created the ticket
      subject: data.subject,
      description: data.description,
      priority: data.priority,
      status: toDbStatus("AI_IN_PROGRESS"),
      messages: {
        create: {
          role: "CUSTOMER",
          content: data.description || "No description provided"
        }
      }
    });

    const apiTicket = normalizeTicketForApi(ticket);
    io.to(`org-${orgId}`).emit("ticket-created", apiTicket);
    io.to(`org-${orgId}`).emit("ticket-updated", apiTicket);
    io.to(`org-${orgId}`).emit("ticket_update", { ticketId: ticket.id, status: "AI_IN_PROGRESS" });

    try {
      const initialMessage = data.description || data.subject || "New ticket received";
      if (queuesEnabled) {
        await addAIJob({
          ticketId: ticket.id,
          orgId,
          message: initialMessage,
          isInitialProcessing: true,
          delayMs: 12000,
        });
      } else {
        const aiRun = await runAgentDetailed(initialMessage, orgId, ticket.id, io);
        const aiMessage = await prisma.ticketMessage.create({
          data: {
            ticketId: ticket.id,
            role: "AI",
            content: aiRun.reply,
          },
        });

        const { status } = await this.applyAiOutcome(ticket.id, orgId, aiRun);
        io.to(`ticket-${ticket.id}`).emit("newMessage", aiMessage);
        io.to(`ticket-${ticket.id}`).emit("message-added", aiMessage);
        io.to(`ticket-${ticket.id}`).emit("ai_reply", aiMessage);
        io.to(`ticket-${ticket.id}`).emit("ai_mode", { ticketId: ticket.id, mode: aiRun.mode });
        io.to(`org-${orgId}`).emit("ticket-updated", { id: ticket.id, status });
        io.to(`org-${orgId}`).emit("ticket_update", { ticketId: ticket.id, status });
      }
    } catch (queueError) {
      console.error("Failed to enqueue AI job:", queueError);
    }

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
    const currentTicket = await TicketRepository.findById(id, orgId);
    if (!currentTicket) {
      throw new Error("Ticket not found");
    }

    const currentStatus = toApiStatus(currentTicket.status);
    const nextStatus = normalizeApiStatus(String(status));
    if (!canTransitionStatus(currentStatus, nextStatus)) {
      throw new Error(`Invalid status transition: ${currentStatus} -> ${nextStatus}`);
    }

    const updateData: {
      status: ReturnType<typeof toDbStatus>;
      assignedAgentId?: string | null;
    } = {
      status: toDbStatus(nextStatus),
    };

    if (
      ["ESCALATED", "IN_PROGRESS"].includes(nextStatus) &&
      !currentTicket.assignedAgentId
    ) {
      const assignedAgent = await AgentService.assignAgent(orgId);
      if (assignedAgent) {
        updateData.assignedAgentId = assignedAgent.id;
      }
    }

    const ticket = await TicketRepository.updateStatus(id, orgId, updateData);
    if (!ticket) {
      throw new Error("Ticket not found");
    }

    if (
      currentTicket.assignedAgentId &&
      !["RESOLVED", "CLOSED"].includes(currentStatus) &&
      ["RESOLVED", "CLOSED"].includes(nextStatus)
    ) {
      await AgentService.releaseAgentLoad(currentTicket.assignedAgentId);
    }

    const apiTicket = normalizeTicketForApi(ticket);
    io.to(`org-${orgId}`).emit("ticket-updated", apiTicket);
    io.to(`org-${orgId}`).emit("ticket_update", { ticketId: id, status: nextStatus });

    if (currentStatus !== nextStatus) {
      await NotificationService.sendTicketStatusNotification(id, currentStatus, nextStatus, orgId);
    }

    if (updateData.assignedAgentId && updateData.assignedAgentId !== currentTicket.assignedAgentId) {
      await NotificationService.sendAssignmentNotification(id, updateData.assignedAgentId, orgId);
      await TicketAssignmentHistoryService.record({
        ticketId: id,
        agentId: updateData.assignedAgentId,
        action: currentTicket.assignedAgentId ? "REASSIGNED" : "AUTO_ASSIGNED",
      });
    }

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
    const ticket = await TicketRepository.findById(id, orgId);
    if (ticket?.assignedAgentId) {
      await AgentService.releaseAgentLoad(ticket.assignedAgentId);
    }

    const deleted = await TicketRepository.deleteById(id, orgId);
    if (!deleted) {
      throw new Error("Ticket not found");
    }

    io.to(`org-${orgId}`).emit("ticket-deleted", { ticketId: id });
    return deleted;
  }

  static async applyAiOutcome(ticketId: string, orgId: string, aiRun: AgentRunResult) {
    const existingTicket = await prisma.ticket.findFirst({
      where: {
        id: ticketId,
        orgId,
      },
      select: {
        id: true,
        status: true,
        assignedAgentId: true,
      },
    });

    if (!existingTicket) {
      throw new Error("Ticket not found");
    }

    const nextStatus = aiRun.shouldEscalate ? "ESCALATED" : "RESOLVED";
    const updateData: {
      status: ReturnType<typeof toDbStatus>;
      assignedAgentId?: string;
    } = {
      status: toDbStatus(nextStatus),
    };

    if (aiRun.shouldEscalate && !existingTicket.assignedAgentId) {
      const assignedAgent = await AgentService.assignAgent(orgId);
      if (assignedAgent) {
        updateData.assignedAgentId = assignedAgent.id;
      }
    }

    const updatedTicket = await prisma.ticket.update({
      where: { id: ticketId },
      data: updateData,
      include: {
        customer: true,
        assignedAgent: {
          include: {
            user: true,
          },
        },
        messages: true,
      },
    });

    const previousStatus = toApiStatus(existingTicket.status);
    await NotificationService.sendTicketStatusNotification(ticketId, previousStatus, nextStatus, orgId);
    if (updateData.assignedAgentId) {
      await NotificationService.sendAssignmentNotification(ticketId, updateData.assignedAgentId, orgId);
      await TicketAssignmentHistoryService.record({
        ticketId,
        agentId: updateData.assignedAgentId,
        action: existingTicket.assignedAgentId ? "REASSIGNED" : "AUTO_ASSIGNED",
      });
    }

    return {
      status: nextStatus,
      ticket: normalizeTicketForApi(updatedTicket),
    };
  }

}   
