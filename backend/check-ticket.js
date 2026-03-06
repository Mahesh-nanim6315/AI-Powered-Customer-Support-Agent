require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

async function check() {
    const prisma = new PrismaClient();
    try {
        const tickets = await prisma.ticket.findMany({
            where: { subject: { contains: 'Test' } },
            include: { messages: true },
            take: 5
        });
        console.log('Tickets:', tickets.map(t => ({ id: t.id, subject: t.subject, status: t.status, messages: t.messages.length })));
    } finally {
        await prisma.$disconnect();
    }
}

check().catch(console.error);
