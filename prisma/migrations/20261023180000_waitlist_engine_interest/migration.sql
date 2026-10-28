-- AlterTable
ALTER TABLE "WaitlistLead" ADD COLUMN     "engine" TEXT,
ADD COLUMN     "intent" TEXT,
ADD COLUMN     "role" TEXT;

-- CreateIndex
CREATE INDEX "WaitlistLead_engine_idx" ON "WaitlistLead"("engine");
