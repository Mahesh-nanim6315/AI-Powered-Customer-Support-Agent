export type DbTicketStatus =
  | "OPEN"
  | "AI_HANDLING"
  | "ESCALATED"
  | "IN_PROGRESS"
  | "WAITING_FOR_HUMAN"
  | "RESOLVED"
  | "CLOSED";

export type ApiTicketStatus =
  | "OPEN"
  | "AI_HANDLING"
  | "ESCALATED"
  | "IN_PROGRESS"
  | "RESOLVED"
  | "CLOSED";

const dbToApi: Record<DbTicketStatus, ApiTicketStatus> = {
  OPEN: "OPEN",
  AI_HANDLING: "AI_HANDLING",
  ESCALATED: "ESCALATED",
  IN_PROGRESS: "IN_PROGRESS",
  WAITING_FOR_HUMAN: "ESCALATED",
  RESOLVED: "RESOLVED",
  CLOSED: "CLOSED",
};

const apiToDb: Record<ApiTicketStatus, DbTicketStatus> = {
  OPEN: "OPEN",
  AI_HANDLING: "AI_HANDLING",
  ESCALATED: "ESCALATED",
  IN_PROGRESS: "IN_PROGRESS",
  RESOLVED: "RESOLVED",
  CLOSED: "CLOSED",
};

export function normalizeApiStatus(input: string): ApiTicketStatus {
  const value = (input || "").toUpperCase();
  if (value === "WAITING_FOR_HUMAN") return "ESCALATED";
  if (value === "IN_PROGRESS") return "IN_PROGRESS";
  if (value === "ESCALATED") return "ESCALATED";
  if (value === "OPEN") return "OPEN";
  if (value === "AI_HANDLING") return "AI_HANDLING";
  if (value === "RESOLVED") return "RESOLVED";
  if (value === "CLOSED") return "CLOSED";
  throw new Error(`Invalid ticket status: ${input}`);
}

export function toDbStatus(status: string): DbTicketStatus {
  const normalized = normalizeApiStatus(status);
  return apiToDb[normalized];
}

export function toApiStatus(status: string): ApiTicketStatus {
  const value = (status || "").toUpperCase() as DbTicketStatus;
  return dbToApi[value] ?? normalizeApiStatus(value);
}

const allowedTransitions: Record<ApiTicketStatus, ApiTicketStatus[]> = {
  OPEN: ["AI_HANDLING", "IN_PROGRESS", "ESCALATED", "CLOSED"],
  AI_HANDLING: ["ESCALATED", "RESOLVED", "IN_PROGRESS", "CLOSED"],
  ESCALATED: ["IN_PROGRESS", "RESOLVED", "CLOSED"],
  IN_PROGRESS: ["ESCALATED", "RESOLVED", "CLOSED"],
  RESOLVED: ["CLOSED", "IN_PROGRESS"],
  CLOSED: ["IN_PROGRESS"],
};

export function canTransitionStatus(
  currentStatus: string,
  nextStatus: string
): boolean {
  const current = toApiStatus(currentStatus);
  const next = normalizeApiStatus(nextStatus);

  if (current === next) return true;
  return allowedTransitions[current]?.includes(next) ?? false;
}

export function normalizeTicketForApi<T extends { status?: string }>(
  ticket: T | null
): T | null {
  if (!ticket) return ticket;
  if (!ticket.status) return ticket;
  return {
    ...ticket,
    status: toApiStatus(ticket.status),
  };
}

export function normalizeTicketListForApi<T extends { status?: string }>(
  tickets: T[]
): T[] {
  return tickets.map((ticket) => normalizeTicketForApi(ticket) as T);
}
