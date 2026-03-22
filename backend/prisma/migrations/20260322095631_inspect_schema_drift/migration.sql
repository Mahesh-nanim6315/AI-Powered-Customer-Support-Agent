/*
  Warnings:

  - A unique constraint covering the columns `[orgId,email]` on the table `Customer` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "FileAttachment" DROP CONSTRAINT "FileAttachment_messageId_fkey";

-- DropForeignKey
ALTER TABLE "MessageReadReceipt" DROP CONSTRAINT "MessageReadReceipt_messageId_fkey";

-- DropForeignKey
ALTER TABLE "MessageReadReceipt" DROP CONSTRAINT "MessageReadReceipt_userId_fkey";

-- DropForeignKey
ALTER TABLE "TicketAssignment" DROP CONSTRAINT "TicketAssignment_ticketId_fkey";

-- AlterTable
ALTER TABLE "CustomerNotification" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX "Customer_orgId_email_key" ON "Customer"("orgId", "email");

-- AddForeignKey
ALTER TABLE "MessageReadReceipt" ADD CONSTRAINT "MessageReadReceipt_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "TicketMessage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageReadReceipt" ADD CONSTRAINT "MessageReadReceipt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileAttachment" ADD CONSTRAINT "FileAttachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "TicketMessage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketAssignment" ADD CONSTRAINT "TicketAssignment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
