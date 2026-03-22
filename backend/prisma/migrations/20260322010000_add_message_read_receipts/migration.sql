CREATE TABLE IF NOT EXISTS "MessageReadReceipt" (
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readDuration" INTEGER,
    CONSTRAINT "MessageReadReceipt_pkey" PRIMARY KEY ("messageId","userId")
);

CREATE INDEX IF NOT EXISTS "MessageReadReceipt_userId_readAt_idx"
ON "MessageReadReceipt"("userId", "readAt");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'MessageReadReceipt_messageId_fkey'
          AND table_name = 'MessageReadReceipt'
    ) THEN
        ALTER TABLE "MessageReadReceipt"
        ADD CONSTRAINT "MessageReadReceipt_messageId_fkey"
        FOREIGN KEY ("messageId") REFERENCES "TicketMessage"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'MessageReadReceipt_userId_fkey'
          AND table_name = 'MessageReadReceipt'
    ) THEN
        ALTER TABLE "MessageReadReceipt"
        ADD CONSTRAINT "MessageReadReceipt_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END
$$;
