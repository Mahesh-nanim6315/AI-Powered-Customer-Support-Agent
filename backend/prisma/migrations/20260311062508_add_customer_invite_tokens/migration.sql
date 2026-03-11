-- CreateEnum
CREATE TYPE "CustomerStatus" AS ENUM ('PENDING', 'ACTIVE');

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "password" TEXT,
ADD COLUMN     "status" "CustomerStatus" NOT NULL DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE "CustomerInviteToken" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "customerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerInviteToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomerInviteToken_token_key" ON "CustomerInviteToken"("token");

-- CreateIndex
CREATE INDEX "CustomerInviteToken_orgId_idx" ON "CustomerInviteToken"("orgId");

-- CreateIndex
CREATE INDEX "CustomerInviteToken_email_idx" ON "CustomerInviteToken"("email");

-- CreateIndex
CREATE INDEX "CustomerInviteToken_expiresAt_idx" ON "CustomerInviteToken"("expiresAt");

-- AddForeignKey
ALTER TABLE "CustomerInviteToken" ADD CONSTRAINT "CustomerInviteToken_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerInviteToken" ADD CONSTRAINT "CustomerInviteToken_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
