export type UserRole = "ADMIN" | "AGENT";

export interface AuthUser {
  id: string;
  email: string;
  orgId: string;
  role: UserRole;
  token: string;
}

export interface Ticket {
  id: string;
  subject: string;
  status: string;
  priority: string;
  customerName: string;
  createdAt: string;
  updatedAt: string;
  assignedAgent?: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  totalTickets: number;
  lastSeenAt?: string;
}

export interface Agent {
  id: string;
  email: string;
  role: UserRole;
  activeTickets: number;
  specialization?: string;
}

export interface AiSuggestion {
  id: string;
  summary: string;
  actionType: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
}

