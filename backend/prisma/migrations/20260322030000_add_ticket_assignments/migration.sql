DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AssignmentAction') THEN
        CREATE TYPE "AssignmentAction" AS ENUM (
            'ASSIGNED',
            'REASSIGNED',
            'UNASSIGNED',
            'AUTO_ASSIGNED'
        );
    END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "TicketAssignment" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "agentId" TEXT,
    "assignedByUserId" TEXT,
    "action" "AssignmentAction" NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TicketAssignment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "TicketAssignment_ticketId_createdAt_idx"
ON "TicketAssignment"("ticketId", "createdAt");

CREATE INDEX IF NOT EXISTS "TicketAssignment_agentId_createdAt_idx"
ON "TicketAssignment"("agentId", "createdAt");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'TicketAssignment_ticketId_fkey'
          AND table_name = 'TicketAssignment'
    ) THEN
        ALTER TABLE "TicketAssignment"
        ADD CONSTRAINT "TicketAssignment_ticketId_fkey"
        FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'TicketAssignment_agentId_fkey'
          AND table_name = 'TicketAssignment'
    ) THEN
        ALTER TABLE "TicketAssignment"
        ADD CONSTRAINT "TicketAssignment_agentId_fkey"
        FOREIGN KEY ("agentId") REFERENCES "Agent"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'TicketAssignment_assignedByUserId_fkey'
          AND table_name = 'TicketAssignment'
    ) THEN
        ALTER TABLE "TicketAssignment"
        ADD CONSTRAINT "TicketAssignment_assignedByUserId_fkey"
        FOREIGN KEY ("assignedByUserId") REFERENCES "User"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END
$$;
