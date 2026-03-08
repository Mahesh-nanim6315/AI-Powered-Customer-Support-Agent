import prisma from "../../config/database";
import { Prisma } from "@prisma/client";
import { sendRefundLinkTool } from "../../ai/tools/sendRefundLink.tool";
import { updateTicketStatusTool } from "../../ai/tools/updateTicketStatus.tool";
import { changePriority, escalateTicket } from "../../ai/tools/tools.service";
import { normalizeApiStatus, toDbStatus } from "../tickets/ticketStatus.lifecycle";

export type SuggestionActionType =
  | "ESCALATE_TO_HUMAN"
  | "CHANGE_PRIORITY"
  | "UPDATE_TICKET_STATUS"
  | "SEND_REFUND_LINK";

export class AiSuggestionsService {
  static async propose(params: {
    orgId: string;
    ticketId: string;
    actionType: SuggestionActionType;
    params: Record<string, unknown>;
  }) {
    return prisma.aiSuggestion.create({
      data: {
        orgId: params.orgId,
        ticketId: params.ticketId,
        actionType: params.actionType,
        params: params.params as Prisma.InputJsonValue,
        status: "PENDING",
      },
    });
  }

  static async list(orgId: string, filters?: { ticketId?: string; status?: string }) {
    return prisma.aiSuggestion.findMany({
      where: {
        orgId,
        ...(filters?.ticketId ? { ticketId: filters.ticketId } : {}),
        ...(filters?.status ? { status: filters.status as any } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
  }

  static async getById(orgId: string, id: string) {
    return prisma.aiSuggestion.findFirst({ where: { id, orgId } });
  }

  static async reject(orgId: string, id: string) {
    const updated = await prisma.aiSuggestion.updateMany({
      where: { id, orgId, status: "PENDING" },
      data: { status: "REJECTED", decidedAt: new Date() },
    });
    if (updated.count === 0) return null;
    return prisma.aiSuggestion.findFirst({ where: { id, orgId } });
  }

  static async approve(orgId: string, id: string) {
    const updated = await prisma.aiSuggestion.updateMany({
      where: { id, orgId, status: "PENDING" },
      data: { status: "APPROVED", decidedAt: new Date() },
    });
    if (updated.count === 0) return null;
    return prisma.aiSuggestion.findFirst({ where: { id, orgId } });
  }

  static async execute(orgId: string, id: string) {
    const suggestion = await prisma.aiSuggestion.findFirst({ where: { id, orgId } });
    if (!suggestion) return null;

    if (suggestion.status !== "APPROVED" && suggestion.status !== "PENDING") {
      return suggestion;
    }

    // Execute side effects server-side (never in the LLM loop).
    const params = (suggestion.params ?? {}) as Record<string, any>;

    if (suggestion.actionType === "ESCALATE_TO_HUMAN") {
      await escalateTicket(suggestion.ticketId);
    } else if (suggestion.actionType === "CHANGE_PRIORITY") {
      const priority = (params.priority as "LOW" | "MEDIUM" | "HIGH") ?? "HIGH";
      await changePriority(suggestion.ticketId, priority);
    } else if (suggestion.actionType === "UPDATE_TICKET_STATUS") {
      const nextStatus = normalizeApiStatus(String(params.status ?? "OPEN"));
      await updateTicketStatusTool({
        ticketId: suggestion.ticketId,
        status: toDbStatus(nextStatus),
        note: params.note,
      });
    } else if (suggestion.actionType === "SEND_REFUND_LINK") {
      const amount = Number(params.amount ?? 0);
      await sendRefundLinkTool({ ticketId: suggestion.ticketId, amount });
    }

    const updated = await prisma.aiSuggestion.update({
      where: { id: suggestion.id },
      data: { status: "EXECUTED" },
    });

    return updated;
  }
}
