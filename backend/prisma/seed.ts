import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set in environment variables');
}

const pool = new Pool({ connectionString: databaseUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    // Delete existing data (reset for demo purposes) - in reverse order of foreign key dependencies
    await prisma.aiSuggestion.deleteMany({});
    await prisma.ticketMessage.deleteMany({});
    await prisma.ticket.deleteMany({});
    await prisma.agent.deleteMany({});
    await prisma.customer.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.organization.deleteMany({});

    // Create demo organization
    const org = await prisma.organization.create({
        data: {
            name: 'Demo Support Company',
        },
    });

    // Create demo users
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Admin user
    const adminUser = await prisma.user.create({
        data: {
            email: 'admin@example.com',
            password: hashedPassword,
            role: 'ADMIN',
            orgId: org.id,
        },
    });

    // Agent users
    const agent1 = await prisma.user.create({
        data: {
            email: 'agent1@example.com',
            password: hashedPassword,
            role: 'AGENT',
            orgId: org.id,
        },
    });

    const agent2 = await prisma.user.create({
        data: {
            email: 'agent2@example.com',
            password: hashedPassword,
            role: 'AGENT',
            orgId: org.id,
        },
    });

    // Customer user
    const customerUser = await prisma.user.create({
        data: {
            email: 'customer@example.com',
            password: hashedPassword,
            role: 'CUSTOMER',
            orgId: org.id,
        },
    });

    // Create agents (link to agent users)
    const agentRecord1 = await prisma.agent.create({
        data: {
            userId: agent1.id,
            specialization: 'Billing & Payments',
            busyStatus: false,
            activeTickets: 0,
        },
    });

    const agentRecord2 = await prisma.agent.create({
        data: {
            userId: agent2.id,
            specialization: 'Technical Support',
            busyStatus: false,
            activeTickets: 0,
        },
    });

    // Create demo customer
    const customer = await prisma.customer.create({
        data: {
            orgId: org.id,
            name: 'John Doe',
            email: 'customer@example.com',
            metadata: { tier: 'STANDARD', lifeTimeValue: 1500 },
        },
    });

    // Create sample tickets
    const ticket1 = await prisma.ticket.create({
        data: {
            customerId: customer.id,
            orgId: org.id,
            subject: 'Can\'t login to my account',
            description: 'I\'ve been trying to login for the past 30 minutes but keep getting an error.',
            status: 'OPEN',
            priority: 'HIGH',
        },
    });

    const ticket2 = await prisma.ticket.create({
        data: {
            customerId: customer.id,
            orgId: org.id,
            subject: 'Billing inquiry',
            description: 'Why was I charged twice this month?',
            status: 'OPEN',
            priority: 'MEDIUM',
        },
    });

    console.log('✅ Seed data created successfully!');
    console.log('\n📝 Demo Credentials:');
    console.log('  Admin:    admin@example.com / password123');
    console.log('  Agent 1:  agent1@example.com / password123');
    console.log('  Agent 2:  agent2@example.com / password123');
    console.log('  Customer: customer@example.com / password123');
    console.log('\n🎫 Sample Tickets: 2 created for demo customer');
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
