import prisma from "../config/database";
import { AuditService } from "./audit.service";

export interface LogEntry {
  id: string;
  timestamp: string;
  level: "info" | "warn" | "error";
  source: string;
  message: string;
  actor?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  details?: Record<string, unknown> | null;
}

export class LogsService {
  private static escapeCsv(value: unknown) {
    const text = String(value ?? "");
    if (/[",\n]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  }

  static async list(orgId: string, filters: { limit?: number; level?: string; source?: string; startDate?: string; endDate?: string }) {
    const limit = Math.min(filters.limit ?? 50, 100);

    const [systemEvents, notifications, suggestions, tickets, aiSettings] = await Promise.all([
      AuditService.getSystemEvents({ orgId }, limit),
      prisma.customerNotification.findMany({
        where: { orgId },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      prisma.aiSuggestion.findMany({
        where: { orgId },
        include: {
          ticket: {
            select: {
              subject: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      prisma.ticket.findMany({
        where: { orgId },
        select: {
          id: true,
          subject: true,
          status: true,
          priority: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: "desc" },
        take: limit,
      }),
      prisma.aiSettings.findUnique({
        where: { orgId },
        select: {
          id: true,
          model: true,
          aiEnabled: true,
          confidenceThreshold: true,
          autoExecuteSuggestions: true,
          updatedAt: true,
        },
      }),
    ]);

    const mappedSystemEvents: LogEntry[] = systemEvents.map((event: any) => ({
      id: `system-${event.id}`,
      timestamp: new Date(event.createdAt).toISOString(),
      level:
        event.severity === "CRITICAL" || event.severity === "HIGH"
          ? "error"
          : event.severity === "MEDIUM"
            ? "warn"
            : "info",
      source: event.source || "SYSTEM",
      message: event.message,
      actor: event.userId || null,
      entityType: "SYSTEM_EVENT",
      entityId: event.id,
      details: event.details || null,
    }));

    const mappedNotifications: LogEntry[] = notifications.map((notification) => ({
      id: `notification-${notification.id}`,
      timestamp: new Date(notification.createdAt).toISOString(),
      level: "info",
      source: "CUSTOMER_NOTIFICATION",
      message: `${notification.title}: ${notification.message}`,
      actor: "SYSTEM",
      entityType: "NOTIFICATION",
      entityId: notification.ticketId || notification.id,
      details: notification.data ? JSON.parse(notification.data) : null,
    }));

    const mappedSuggestions: LogEntry[] = suggestions.map((suggestion) => ({
      id: `suggestion-${suggestion.id}`,
      timestamp: new Date(suggestion.createdAt).toISOString(),
      level:
        suggestion.status === "REJECTED"
          ? "warn"
          : suggestion.status === "EXECUTED"
            ? "info"
            : "warn",
      source: "AI_SUGGESTION",
      message: `${suggestion.actionType} for ${suggestion.ticket?.subject || suggestion.ticketId} (${suggestion.status})`,
      actor: "AI",
      entityType: "AI_SUGGESTION",
      entityId: suggestion.id,
      details: (suggestion.params ?? {}) as Record<string, unknown>,
    }));

    const mappedTickets: LogEntry[] = tickets.flatMap((ticket) => ([
      {
        id: `ticket-created-${ticket.id}`,
        timestamp: new Date(ticket.createdAt).toISOString(),
        level: "info" as const,
        source: "TICKET",
        message: `Ticket created: ${ticket.subject}`,
        actor: "SYSTEM",
        entityType: "TICKET",
        entityId: ticket.id,
        details: {
          status: ticket.status,
          priority: ticket.priority,
        },
      },
      {
        id: `ticket-updated-${ticket.id}`,
        timestamp: new Date(ticket.updatedAt).toISOString(),
        level: ticket.status === "ESCALATED" ? "warn" as const : "info" as const,
        source: "TICKET",
        message: `Ticket updated: ${ticket.subject} (${ticket.status})`,
        actor: "SYSTEM",
        entityType: "TICKET",
        entityId: ticket.id,
        details: {
          status: ticket.status,
          priority: ticket.priority,
        },
      },
    ]));

    const mappedAiSettings: LogEntry[] = aiSettings
      ? [{
          id: `ai-settings-${aiSettings.id}`,
          timestamp: new Date(aiSettings.updatedAt).toISOString(),
          level: "info",
          source: "AI_SETTINGS",
          message: `AI settings active: ${aiSettings.model} (${aiSettings.aiEnabled ? "enabled" : "disabled"})`,
          actor: "ADMIN",
          entityType: "AI_SETTINGS",
          entityId: aiSettings.id,
          details: {
            model: aiSettings.model,
            aiEnabled: aiSettings.aiEnabled,
            confidenceThreshold: aiSettings.confidenceThreshold,
            autoExecuteSuggestions: aiSettings.autoExecuteSuggestions,
          },
        }]
      : [];

    let entries = [
      ...mappedSystemEvents,
      ...mappedNotifications,
      ...mappedSuggestions,
      ...mappedTickets,
      ...mappedAiSettings,
    ];

    if (filters.level) {
      entries = entries.filter((entry) => entry.level === filters.level);
    }

    if (filters.source) {
      entries = entries.filter((entry) => entry.source === filters.source);
    }

    if (filters.startDate) {
      const start = new Date(filters.startDate);
      if (!Number.isNaN(start.getTime())) {
        entries = entries.filter((entry) => new Date(entry.timestamp).getTime() >= start.getTime());
      }
    }

    if (filters.endDate) {
      const end = new Date(filters.endDate);
      if (!Number.isNaN(end.getTime())) {
        end.setHours(23, 59, 59, 999);
        entries = entries.filter((entry) => new Date(entry.timestamp).getTime() <= end.getTime());
      }
    }

    entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return {
      entries: entries.slice(0, limit),
      availableSources: Array.from(new Set(entries.map((entry) => entry.source))).sort(),
    };
  }

  static async exportCsv(orgId: string, filters: { limit?: number; level?: string; source?: string; startDate?: string; endDate?: string }) {
    const { entries } = await this.list(orgId, filters);
    const header = ["timestamp", "level", "source", "message", "actor", "entityType", "entityId", "details"];
    const rows = entries.map((entry) => [
      entry.timestamp,
      entry.level,
      entry.source,
      entry.message,
      entry.actor || "",
      entry.entityType || "",
      entry.entityId || "",
      entry.details ? JSON.stringify(entry.details) : "",
    ]);

    return [header, ...rows]
      .map((row) => row.map((cell) => this.escapeCsv(cell)).join(","))
      .join("\n");
  }
}
