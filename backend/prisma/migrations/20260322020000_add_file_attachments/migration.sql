CREATE TABLE IF NOT EXISTS "FileAttachment" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FileAttachment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "FileAttachment_messageId_createdAt_idx"
ON "FileAttachment"("messageId", "createdAt");

CREATE INDEX IF NOT EXISTS "FileAttachment_uploadedBy_idx"
ON "FileAttachment"("uploadedBy");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'FileAttachment_messageId_fkey'
          AND table_name = 'FileAttachment'
    ) THEN
        ALTER TABLE "FileAttachment"
        ADD CONSTRAINT "FileAttachment_messageId_fkey"
        FOREIGN KEY ("messageId") REFERENCES "TicketMessage"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'FileAttachment_uploadedBy_fkey'
          AND table_name = 'FileAttachment'
    ) THEN
        ALTER TABLE "FileAttachment"
        ADD CONSTRAINT "FileAttachment_uploadedBy_fkey"
        FOREIGN KEY ("uploadedBy") REFERENCES "User"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END
$$;
