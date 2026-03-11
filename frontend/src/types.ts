// ============ AUTH ============
export type UserRole = "ADMIN" | "AGENT" | "CUSTOMER";

export interface AuthUser {
  id: string;
  email: string;
  orgId: string;
  role: UserRole;
  token: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    orgId: string;
    role: UserRole;
  };
  organizations?: Organization[];
}

export interface RegisterRequest {
  email: string;
  password: string;
  orgName?: string;
}

// ============ ORGANIZATION ============
export interface Organization {
  id: string;
  name: string;
  subscriptionTier: string;
  aiEnabled: boolean;
  createdAt: string;
}

// ============ TICKETS ============
export type TicketStatus =
  | "OPEN"
  | "AI_HANDLING"
  | "ESCALATED"
  | "IN_PROGRESS"
  | "WAITING_FOR_HUMAN"
  | "RESOLVED"
  | "CLOSED";
export type TicketPriority = "LOW" | "MEDIUM" | "HIGH";
export type MessageRole = "CUSTOMER" | "AGENT" | "AI";

export interface Ticket {
  id: string;
  orgId: string;
  customerId: string;
  subject: string;
  description?: string;
  status: TicketStatus;
  priority: TicketPriority;
  assignedAgentId?: string;
  messages?: TicketMessage[];
  createdAt: string;
  updatedAt: string;
  customer?: Customer;
  assignedAgent?: Agent;
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderId?: string;
  role: MessageRole;
  content: string;
  createdAt: string;
}

export interface CreateTicketRequest {
  customerId: string;
  subject: string;
  description?: string;
  priority?: TicketPriority;
}

// ============ CUSTOMERS ============
export interface Customer {
  id: string;
  orgId: string;
  email: string;
  name: string;
  status: "PENDING" | "ACTIVE";
  metadata?: Record<string, any>;
  createdAt: string;
  tickets?: Ticket[];
}

export interface CreateCustomerRequest {
  email: string;
  name: string;
  metadata?: Record<string, any>;
}

export interface AcceptCustomerInviteRequest {
  token: string;
  password: string;
}

export interface AcceptCustomerInviteResponse {
  message: string;
  customer: Customer;
}

// ============ AGENTS ============
export interface Agent {
  id: string;
  userId: string;
  specialization?: string;
  busyStatus: boolean;
  activeTickets: number;
  lastAssignedAt?: string;
  user?: User;
}

export interface User {
  id: string;
  email: string;
  orgId: string;
  role: UserRole;
  createdAt: string;
}

// ============ AI SUGGESTIONS ============
export type SuggestionStatus = "PENDING" | "APPROVED" | "REJECTED" | "EXECUTED";

export interface AiSuggestion {
  id: string;
  orgId: string;
  ticketId: string;
  actionType: string;
  params: Record<string, any>;
  status: SuggestionStatus;
  createdAt: string;
  decidedAt?: string;
  ticket?: Ticket;
}

// ============ KNOWLEDGE BASE ============
export interface KnowledgeBase {
  id: string;
  orgId: string;
  title: string;
  category: string;
  content: string;
  createdAt: string;
}

export interface CreateKnowledgeRequest {
  title: string;
  category: string;
  content: string;
}

// ============ ANALYTICS ============
export interface TicketAnalytics {
  id: string;
  ticketId: string;
  sentimentScore?: number;
  createdAt: string;
}

export interface DashboardAnalytics {
  totalTickets: number;
  openTickets: number;
  resolvedTickets: number;
  avgResponseTime: number;
  aiResolutionRate: number;
  customerSatisfaction: number;
}
