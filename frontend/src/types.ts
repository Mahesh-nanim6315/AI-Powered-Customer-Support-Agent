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
  | "AI_IN_PROGRESS"
  | "ESCALATED"
  | "IN_PROGRESS"
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

export interface TicketAssignmentHistoryEntry {
  id: string;
  action: "ASSIGNED" | "REASSIGNED" | "UNASSIGNED" | "AUTO_ASSIGNED";
  reason?: string | null;
  createdAt: string;
  agentEmail?: string | null;
  assignedBy?: string | null;
  assignedByRole?: UserRole | null;
}

export interface TicketActivityEntry {
  id: string;
  type: "TICKET_CREATED" | "MESSAGE" | "STATUS_CHANGE" | "ASSIGNMENT";
  createdAt: string;
  actor: string;
  description: string;
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderId?: string;
  role: MessageRole;
  content: string;
  createdAt: string;
}

export interface FileAttachment {
  id: string;
  messageId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  uploadedBy: string;
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

export interface UploadKnowledgeRequest {
  file: File;
  title?: string;
  category?: string;
}

export interface UploadKnowledgeResponse {
  article: KnowledgeBase;
  indexed: boolean;
  chunksStored: number;
  uploadedFileName: string;
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

export interface AdminAnalyticsOverview {
  totalTickets: number;
  activeTickets: number;
  aiResolutionRate: number;
  agentResolutionRate: number;
  avgResponseTime: number;
  csat: number;
  escalationRate: number;
  activeAgents: number;
}

export interface TicketTrends {
  [date: string]: {
    created: number;
    resolved: number;
  };
}

export interface AgentPerformance {
  agentId: string;
  email: string;
  totalTickets: number;
  resolvedTickets: number;
  resolutionRate: number;
  avgResolutionTime: number;
  busyStatus: boolean;
  activeTickets: number;
}

export interface AnalyticsOperationalInsights {
  queue: {
    unassignedTickets: number;
    openHighPriorityTickets: number;
    oldestOpenTicketHours: number;
    avgFirstReplyMinutes: number;
  };
  workload: {
    totalAgents: number;
    availableAgents: number;
    averageActiveLoad: number;
    busiestAgent?: {
      email: string;
      activeTickets: number;
    } | null;
  };
  aiQuality: {
    totalSuggestions: number;
    pendingSuggestions: number;
    executedSuggestions: number;
    executionRate: number;
    averageConfidence: number | null;
  };
}

export interface AiSettings {
  id?: string | null;
  orgId: string;
  aiEnabled: boolean;
  model: string;
  temperature: number;
  confidenceThreshold: number;
  autoExecuteSuggestions: boolean;
  kbFallbackEnabled: boolean;
  safeFallbackEnabled: boolean;
  escalationEnabled: boolean;
  replyTone: string;
  systemPrompt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  runtimeConfig?: {
    chatProvider: string;
    chatModelDefault: string;
    embeddingProvider: string;
    embeddingModel: string;
    embeddingDimension: number;
  };
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: "info" | "warn" | "error";
  source: string;
  message: string;
  actor?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  details?: Record<string, any> | null;
}

export interface LogsResponse {
  entries: LogEntry[];
  availableSources: string[];
}

// ============ NOTIFICATIONS ============
export type NotificationType =
  | "TICKET_CREATED"
  | "TICKET_UPDATED"
  | "TICKET_ASSIGNED"
  | "TICKET_RESOLVED"
  | "TICKET_ESCALATED"
  | "MESSAGE_RECEIVED";

export interface CustomerNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  ticketId?: string | null;
  data?: Record<string, any> | null;
}

export interface NotificationsPagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface NotificationsResponse {
  success: boolean;
  notifications: CustomerNotification[];
  pagination: NotificationsPagination;
}

export interface NotificationStatsResponse {
  success: boolean;
  stats: {
    total: number;
    read: number;
    unread: number;
    statsByType: Record<string, number>;
  };
  generatedAt: string;
}
