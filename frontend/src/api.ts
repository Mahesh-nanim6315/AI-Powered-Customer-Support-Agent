import type { AuthUser, Ticket } from "./types";

const API_BASE_URL =
  (import.meta as any).env?.VITE_API_BASE_URL ?? "http://localhost:5000";

interface ApiOptions {
  method?: string;
  body?: unknown;
  token?: string;
}

async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const fetchOptions: RequestInit = {
    method: options.method ?? "GET",
    headers,
  };

  if (options.body !== undefined) {
    fetchOptions.body = JSON.stringify(options.body);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, fetchOptions);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `API error ${response.status} for ${path}: ${text || response.statusText}`,
    );
  }

  return (await response.json()) as T;
}

interface LoginResponse {
  token: string;
}

interface JwtPayload {
  userId: string;
  orgId: string;
  role: string;
  iat?: number;
  exp?: number;
}

function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2 || !parts[1]) return null;
    const part1 = parts[1];
    const payload = part1
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(part1.length + ((4 - (part1.length % 4)) % 4), "=");
    const json = atob(payload);
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const data = await apiFetch<LoginResponse>("/auth/login", {
    method: "POST",
    body: { email, password },
  });

  const payload = decodeJwtPayload(data.token);

  return {
    id: payload?.userId ?? "unknown-user",
    email,
    orgId: payload?.orgId ?? "unknown-org",
    role: (payload?.role as AuthUser["role"]) ?? "ADMIN",
    token: data.token,
  };
}

type TicketApiResponse = Array<{
  id: string;
  subject: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
  customer?: {
    name: string;
  };
}>;

export async function fetchTickets(token: string): Promise<Ticket[]> {
  const raw = await apiFetch<TicketApiResponse>("/tickets", { token });

  return raw.map((ticket) => ({
    id: ticket.id,
    subject: ticket.subject,
    status: ticket.status,
    priority: ticket.priority,
    customerName: ticket.customer?.name ?? "Unknown customer",
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
    assignedAgent: undefined,
  })) as unknown as Ticket[];
}

