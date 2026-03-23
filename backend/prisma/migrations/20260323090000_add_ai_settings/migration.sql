CREATE TABLE IF NOT EXISTS "AiSettings" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "aiEnabled" BOOLEAN NOT NULL DEFAULT true,
    "model" TEXT NOT NULL DEFAULT 'gpt-4.1-mini',
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.4,
    "confidenceThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.75,
    "autoExecuteSuggestions" BOOLEAN NOT NULL DEFAULT false,
    "kbFallbackEnabled" BOOLEAN NOT NULL DEFAULT true,
    "safeFallbackEnabled" BOOLEAN NOT NULL DEFAULT true,
    "escalationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "replyTone" TEXT NOT NULL DEFAULT 'professional',
    "systemPrompt" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AiSettings_orgId_key" ON "AiSettings"("orgId");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'AiSettings_orgId_fkey'
    ) THEN
        ALTER TABLE "AiSettings"
        ADD CONSTRAINT "AiSettings_orgId_fkey"
        FOREIGN KEY ("orgId") REFERENCES "Organization"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
