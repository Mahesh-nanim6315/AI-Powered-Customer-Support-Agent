import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/*
  Tool: Get Customer History

  Used when:
  - AI wants to check user's previous issues
  - Detect repeated complaints
  - Understand long-term context
*/

interface GetCustomerHistoryInput {
  customerId: string;
  limit?: number;
}

export async function getCustomerHistoryTool({
  customerId,
  limit = 5,
}: GetCustomerHistoryInput) {
    try {
        // 1️⃣ Fetch recent tickets of the user
        const tickets = await prisma.ticket.findMany({
            where: {
                customerId,
            },
            orderBy: {
                createdAt: "desc",
            },
            take: limit,
            include: {
                messages: {
                    orderBy: { createdAt: "asc" },
                },
            },
        });

        if (!tickets.length) {
            return {
                success: true,
                message: "No previous ticket history found for this user.",
                data: [],
            };
        }

        // 2️⃣ Format history for AI context
        const formattedHistory = tickets.map((ticket) => ({
            ticketId: ticket.id,
            status: ticket.status,
            createdAt: ticket.createdAt,
            messages: ticket.messages.map((m) => ({
              role: m.role,
              content: m.content,
              createdAt: m.createdAt,
            })),
        }));

        return {
            success: true,
            message: "Customer history retrieved successfully.",
            data: formattedHistory,
        };
    } catch (error) {
        console.error("Customer History Tool Error:", error);

        return {
            success: false,
            message: "Failed to retrieve customer history.",
            data: [],
        };
    }
}