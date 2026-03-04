import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

/*
  Tool: Send Refund Link

  Used when:
  - Customer eligible for refund
  - AI decides refund is appropriate
*/

interface SendRefundLinkInput {
    ticketId: string;
    userId: string;
    amount: number;
}

export async function sendRefundLinkTool({
    ticketId,
    userId,
    amount,
}: SendRefundLinkInput) {
    try {
        // 1️⃣ Generate secure token
        const token = crypto.randomBytes(24).toString("hex");

        // 2️⃣ Create refund record (optional table but recommended)
        await prisma.refund.create({
            data: {
                userId,
                ticketId,
                amount,
                token,
                status: "PENDING",
            },
        });

        // 3️⃣ Create refund URL
        const refundUrl = `${process.env.FRONTEND_URL}/refund/${token}`;

        // 4️⃣ Save AI message in ticket
        await prisma.ticketMessage.create({
            data: {
                ticketId,
                sender: "AI",
                content: `💰 You are eligible for a refund of ₹${amount}.
        
Please use the secure link below to process your refund:

${refundUrl}

This link will expire in 24 hours.`,
            },
        });

        return {
            success: true,
            message: "Refund link sent successfully.",
            data: {
                refundUrl,
            },
        };
    } catch (error) {
        console.error("Send Refund Tool Error:", error);

        return {
            success: false,
            message: "Failed to generate refund link.",
        };
    }
}