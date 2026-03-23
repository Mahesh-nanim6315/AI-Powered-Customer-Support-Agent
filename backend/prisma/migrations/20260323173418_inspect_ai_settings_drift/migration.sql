-- DropForeignKey
ALTER TABLE "AiSettings" DROP CONSTRAINT "AiSettings_orgId_fkey";

-- AlterTable
ALTER TABLE "AiSettings" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "AiSettings" ADD CONSTRAINT "AiSettings_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
