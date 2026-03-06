import prisma from "../../config/database";
import { generateEmbedding } from "../embedding.service";
import { searchSimilar } from "../vector.service";

export async function searchKnowledge(message: string, orgId: string) {
  try {
    const embedding = await generateEmbedding(message);
    const matches = await searchSimilar(embedding, orgId);
    return matches.map((m: any) => m.metadata?.text).filter(Boolean).join("\n");
  } catch (error) {
    console.error("searchKnowledge failed:", error);
    return "";
  }
}

export async function escalateTicket(ticketId: string) {
  return prisma.ticket.update({
    where: { id: ticketId },
    data: { status: "WAITING_FOR_HUMAN" },
  });
}

export async function changePriority(
  ticketId: string,
  priority: "LOW" | "MEDIUM" | "HIGH"
) {
  return prisma.ticket.update({
    where: { id: ticketId },
    data: { priority },
  });
}
