import { prisma } from "../config/db";
import { AssignmentService } from "./assignment.service";
import { addAIJob } from "../queues/bullmq";
import { toDbStatus } from "../modules/tickets/ticketStatus.lifecycle";

export class TicketService {
  /**
   * Create new support ticket
   */
  static async createTicket(data: {
    orgId: string;
    customerId: string;
    subject: string;
    description?: string;
  }) {
    try {
      const ticket = await prisma.ticket.create({
        data: {
          orgId: data.orgId,
          customerId: data.customerId,
          subject: data.subject,
          description: data.description,
          status: "OPEN",
          priority: "MEDIUM",
        },
      });

      console.log("Ticket created:", { ticketId: ticket.id, subject: ticket.subject });

      // Auto-assign after creation
      await AssignmentService.assignTicket(ticket.id, data.orgId);

      // Trigger AI processing for new tickets
      await prisma.ticket.update({
        where: { id: ticket.id },
        data: { status: toDbStatus("AI_IN_PROGRESS") },
      });

      console.log("Ticket status updated to AI_IN_PROGRESS");

      // For now, process AI synchronously until Redis is configured
      try {
        console.log("Starting AI processing...");
        const { runAgentDetailed } = await import("../services/agent.service");
        const aiRun = await runAgentDetailed(
          data.description || data.subject,
          data.orgId,
          ticket.id
        );

        console.log("AI response generated:", { length: aiRun.reply.length });

        // Save AI response
        const aiMessage = await prisma.ticketMessage.create({
          data: {
            ticketId: ticket.id,
            role: "AI",
            content: aiRun.reply,
          },
        });

        // Update ticket status
        const nextStatus = aiRun.shouldEscalate ? "ESCALATED" : "RESOLVED";
        await prisma.ticket.update({
          where: { id: ticket.id },
          data: { status: toDbStatus(nextStatus) },
        });

        console.log("Ticket updated with AI response, status:", nextStatus);

        // Emit real-time updates
        try {
          const { getIO } = await import("../config/socket");
          const io = getIO();
          io.to(`ticket-${ticket.id}`).emit("newMessage", aiMessage);
          io.to(`org-${data.orgId}`).emit("ticketUpdated", { ticketId: ticket.id, status: nextStatus });
          console.log("Real-time updates emitted");
        } catch (socketError: any) {
          console.warn("Failed to emit Socket.io event:", socketError?.message || socketError);
        }

      } catch (aiError: any) {
        console.error("AI processing failed:", aiError?.message || aiError);
        // Fallback: escalate to human
        await prisma.ticket.update({
          where: { id: ticket.id },
          data: { status: toDbStatus("ESCALATED") },
        });
        console.log("Fallback: Ticket updated to ESCALATED");
      }

      return ticket;
    } catch (error: any) {
      console.error("Create Ticket Error:", error.message);
      throw new Error("Failed to create ticket");
    }
  }

  /**
   * Get ticket by ID
   */
  static async getTicketById(ticketId: string) {
    try {
      return await prisma.ticket.findUnique({
        where: { id: ticketId },
        include: {
          messages: true,
          assignedAgent: true,
          customer: true,
        },
      });
    } catch (error: any) {
      console.error("Get Ticket Error:", error.message);
      throw new Error("Failed to fetch ticket");
    }
  }

  /**
   * Add message to ticket (Customer or Agent)
   */
  static async addMessage(
    ticketId: string,
    senderId: string | null,
    message: string
  ) {
    try {
      const newMessage = await prisma.ticketMessage.create({
        data: {
          ticketId,
          senderId,
          role: senderId ? "AGENT" : "CUSTOMER",
          content: message,
        },
      });

      return newMessage;
    } catch (error: any) {
      console.error("Add Message Error:", error.message);
      throw new Error("Failed to add message");
    }
  }

  /**
   * Update ticket status
   */
  static async updateStatus(
    ticketId: string,
    status: "OPEN" | "AI_IN_PROGRESS" | "ESCALATED" | "IN_PROGRESS" | "RESOLVED" | "CLOSED"
  ) {
    try {
      return await prisma.ticket.update({
        where: { id: ticketId },
        data: { status: toDbStatus(status) },
      });
    } catch (error: any) {
      console.error("Update Status Error:", error.message);
      throw new Error("Failed to update ticket status");
    }
  }

  /**
   * Close ticket
   */
  static async closeTicket(ticketId: string) {
    try {
      return await prisma.ticket.update({
        where: { id: ticketId },
        data: { status: "RESOLVED" },
      });
    } catch (error: any) {
      console.error("Close Ticket Error:", error.message);
      throw new Error("Failed to close ticket");
    }
  }

  /**
   * Get all tickets (for dashboard)
   */
  static async getAllTickets() {
    try {
      return await prisma.ticket.findMany({
        include: {
          assignedAgent: true,
          customer: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });
    } catch (error: any) {
      console.error("Get All Tickets Error:", error.message);
      throw new Error("Failed to fetch tickets");
    }
  }
}
