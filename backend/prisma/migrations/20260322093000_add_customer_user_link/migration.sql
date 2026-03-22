ALTER TABLE "Customer"
ADD COLUMN IF NOT EXISTS "userId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Customer_userId_key"
ON "Customer"("userId");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'Customer_userId_fkey'
          AND table_name = 'Customer'
    ) THEN
        ALTER TABLE "Customer"
        ADD CONSTRAINT "Customer_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id")
        ON DELETE SET NULL
        ON UPDATE CASCADE;
    END IF;
END $$;
