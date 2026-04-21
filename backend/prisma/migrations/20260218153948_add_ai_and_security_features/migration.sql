/*
  Warnings:

  - A unique constraint covering the columns `[sessionToken]` on the table `exam_attempts` will be added. If there are existing duplicate values, this will fail.
  - Made the column `studentName` on table `exam_attempts` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "ExamAccessType" AS ENUM ('PUBLIC', 'PRIVATE');

-- AlterTable
ALTER TABLE "exam_attempts" ADD COLUMN     "browserFingerprint" TEXT,
ADD COLUMN     "completed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "examAccessId" TEXT,
ADD COLUMN     "flaggedAsSuspicious" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastActivityAt" TIMESTAMP(3),
ADD COLUMN     "sessionToken" TEXT,
ADD COLUMN     "suspiciousReason" TEXT,
ADD COLUMN     "tabSwitchCount" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "studentName" SET NOT NULL;

-- AlterTable
ALTER TABLE "exam_questions" ADD COLUMN     "aiPromptUsed" TEXT,
ADD COLUMN     "generatedByAI" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isInQuestionPool" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isValidated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "needsReview" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "poolOrder" INTEGER,
ADD COLUMN     "questionHash" TEXT,
ADD COLUMN     "timesUsed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "validatedAt" TIMESTAMP(3),
ADD COLUMN     "validatedBy" TEXT;

-- AlterTable
ALTER TABLE "exams" ADD COLUMN     "accessType" "ExamAccessType" NOT NULL DEFAULT 'PUBLIC',
ADD COLUMN     "aiEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "aiModel" TEXT,
ADD COLUMN     "aiProvider" TEXT,
ADD COLUMN     "allowStudentReview" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "availableFrom" TIMESTAMP(3),
ADD COLUMN     "availableUntil" TIMESTAMP(3),
ADD COLUMN     "notifyByEmail" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "optionsPerQuestion" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "questionsPerAttempt" INTEGER,
ADD COLUMN     "requiresAuth" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "showScoreImmediate" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "sourceFileId" TEXT,
ADD COLUMN     "totalQuestionsInPool" INTEGER;

-- CreateTable
CREATE TABLE "student_lists" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_access" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "studentListId" TEXT,
    "studentName" TEXT NOT NULL,
    "studentEmail" TEXT NOT NULL,
    "studentPassword" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "canTakeExam" BOOLEAN NOT NULL DEFAULT true,
    "maxAttempts" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLogin" TIMESTAMP(3),

    CONSTRAINT "exam_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_attempt_questions" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "orderInAttempt" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exam_attempt_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "userId" TEXT,
    "studentEmail" TEXT,
    "details" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "exam_access_studentEmail_idx" ON "exam_access"("studentEmail");

-- CreateIndex
CREATE UNIQUE INDEX "exam_access_examId_studentEmail_key" ON "exam_access"("examId", "studentEmail");

-- CreateIndex
CREATE UNIQUE INDEX "exam_attempt_questions_attemptId_questionId_key" ON "exam_attempt_questions"("attemptId", "questionId");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "exam_attempts_sessionToken_key" ON "exam_attempts"("sessionToken");

-- CreateIndex
CREATE INDEX "exam_attempts_sessionToken_idx" ON "exam_attempts"("sessionToken");

-- CreateIndex
CREATE INDEX "exam_questions_questionHash_idx" ON "exam_questions"("questionHash");

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_sourceFileId_fkey" FOREIGN KEY ("sourceFileId") REFERENCES "exam_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_examAccessId_fkey" FOREIGN KEY ("examAccessId") REFERENCES "exam_access"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_lists" ADD CONSTRAINT "student_lists_examId_fkey" FOREIGN KEY ("examId") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_access" ADD CONSTRAINT "exam_access_examId_fkey" FOREIGN KEY ("examId") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_access" ADD CONSTRAINT "exam_access_studentListId_fkey" FOREIGN KEY ("studentListId") REFERENCES "student_lists"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_attempt_questions" ADD CONSTRAINT "exam_attempt_questions_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "exam_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_attempt_questions" ADD CONSTRAINT "exam_attempt_questions_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "exam_questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
