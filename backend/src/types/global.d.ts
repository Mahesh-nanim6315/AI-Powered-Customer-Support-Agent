export {};

declare global {
  type TicketStatus =
    | "OPEN"
    | "AI_HANDLING"
    | "ESCALATED"
    | "IN_PROGRESS"
    | "WAITING_FOR_HUMAN"
    | "RESOLVED"
    | "CLOSED";

  type TicketPriority =
    | "LOW"
    | "MEDIUM"
    | "HIGH"
    | "URGENT";

  type RoleType =
    | "CUSTOMER"
    | "AGENT"
    | "SENIOR"
    | "ADMIN";

  interface AIMessage {
    role: "system" | "user" | "assistant";
    content: string;
  }

  interface ToolDefinition {
    name: string;
    description: string;
    parameters: any;
  }

  interface SentimentResult {
    score: number; // -1 to 1
    label: "positive" | "neutral" | "negative";
  }
}
