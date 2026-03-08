import { redisConnection } from "../config/redis";

type MemoryRole = "USER" | "AI" | "AGENT";

interface MemoryEntry {
  role: MemoryRole;
  content: string;
  createdAt: string;
}

function memoryKey(orgId: string, ticketId: string) {
  return `ticket:memory:${orgId}:${ticketId}`;
}

export async function appendMemory(
  orgId: string,
  ticketId: string,
  role: MemoryRole,
  content: string
) {
  const key = memoryKey(orgId, ticketId);
  const entry: MemoryEntry = {
    role,
    content,
    createdAt: new Date().toISOString(),
  };

  await redisConnection.rpush(key, JSON.stringify(entry));
  await redisConnection.ltrim(key, -30, -1);
  await redisConnection.expire(key, 60 * 60 * 24 * 7);
}

export async function getRecentMemory(orgId: string, ticketId: string, limit = 12) {
  const key = memoryKey(orgId, ticketId);
  const raw = await redisConnection.lrange(key, -limit, -1);
  return raw
    .map((item) => {
      try {
        return JSON.parse(item) as MemoryEntry;
      } catch {
        return null;
      }
    })
    .filter(Boolean) as MemoryEntry[];
}

