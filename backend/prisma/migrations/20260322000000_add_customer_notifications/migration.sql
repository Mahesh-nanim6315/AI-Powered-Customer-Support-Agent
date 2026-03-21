DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NotificationType') THEN
        CREATE TYPE "NotificationType" AS ENUM (
            'TICKET_CREATED',
            'TICKET_UPDATED',
            'TICKET_ASSIGNED',
            'TICKET_RESOLVED',
            'TICKET_ESCALATED',
            'MESSAGE_RECEIVED'
        );
    END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "CustomerNotification" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "ticketId" TEXT,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CustomerNotification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CustomerNotification_customerId_orgId_read_idx"
ON "CustomerNotification"("customerId", "orgId", "read");

CREATE INDEX IF NOT EXISTS "CustomerNotification_orgId_createdAt_idx"
ON "CustomerNotification"("orgId", "createdAt");

CREATE INDEX IF NOT EXISTS "CustomerNotification_ticketId_idx"
ON "CustomerNotification"("ticketId");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'CustomerNotification_customerId_fkey'
          AND table_name = 'CustomerNotification'
    ) THEN
        ALTER TABLE "CustomerNotification"
        ADD CONSTRAINT "CustomerNotification_customerId_fkey"
        FOREIGN KEY ("customerId") REFERENCES "Customer"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'CustomerNotification_orgId_fkey'
          AND table_name = 'CustomerNotification'
    ) THEN
        ALTER TABLE "CustomerNotification"
        ADD CONSTRAINT "CustomerNotification_orgId_fkey"
        FOREIGN KEY ("orgId") REFERENCES "Organization"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'CustomerNotification_ticketId_fkey'
          AND table_name = 'CustomerNotification'
    ) THEN
        ALTER TABLE "CustomerNotification"
        ADD CONSTRAINT "CustomerNotification_ticketId_fkey"
        FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END
$$;
