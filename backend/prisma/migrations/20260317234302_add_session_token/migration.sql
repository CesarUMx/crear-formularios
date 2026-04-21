-- AlterTable
ALTER TABLE "ai_exam_attempts" ADD COLUMN     "sessionToken" TEXT;

-- CreateIndex
CREATE INDEX "ai_exam_attempts_sessionToken_idx" ON "ai_exam_attempts"("sessionToken");
