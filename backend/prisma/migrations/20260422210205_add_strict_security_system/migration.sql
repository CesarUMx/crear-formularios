-- CreateEnum
CREATE TYPE "SecurityAttemptType" AS ENUM ('EXAM', 'AI_EXAM');

-- CreateEnum
CREATE TYPE "SecurityEventType" AS ENUM ('TAB_SWITCH', 'WINDOW_BLUR', 'CONTEXT_MENU', 'COPY_PASTE', 'FULLSCREEN_EXIT');

-- CreateEnum
CREATE TYPE "SecurityResolveMethod" AS ENUM ('CODE_ENTRY', 'REMOTE_COMPLETION');

-- AlterTable
ALTER TABLE "ai_exams" ADD COLUMN     "strictSecurity" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "exam_attempts" ADD COLUMN     "forceCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "forceCompletedAt" TIMESTAMP(3),
ADD COLUMN     "forceCompletedBy" TEXT;

-- AlterTable
ALTER TABLE "exams" ADD COLUMN     "strictSecurity" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "security_events" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "attemptType" "SecurityAttemptType" NOT NULL,
    "eventType" "SecurityEventType" NOT NULL,
    "unlockCode" TEXT NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" "SecurityResolveMethod",
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "security_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "security_events_attemptId_createdAt_idx" ON "security_events"("attemptId", "createdAt");

-- AddForeignKey
ALTER TABLE "security_events" ADD CONSTRAINT "security_events_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "exam_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
