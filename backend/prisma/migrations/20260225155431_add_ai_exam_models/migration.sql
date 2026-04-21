/*
  Warnings:

  - You are about to drop the column `browserFingerprint` on the `exam_attempts` table. All the data in the column will be lost.
  - You are about to drop the column `completed` on the `exam_attempts` table. All the data in the column will be lost.
  - You are about to drop the column `examAccessId` on the `exam_attempts` table. All the data in the column will be lost.
  - You are about to drop the column `flaggedAsSuspicious` on the `exam_attempts` table. All the data in the column will be lost.
  - You are about to drop the column `lastActivityAt` on the `exam_attempts` table. All the data in the column will be lost.
  - You are about to drop the column `sessionToken` on the `exam_attempts` table. All the data in the column will be lost.
  - You are about to drop the column `suspiciousReason` on the `exam_attempts` table. All the data in the column will be lost.
  - You are about to drop the column `tabSwitchCount` on the `exam_attempts` table. All the data in the column will be lost.
  - You are about to drop the column `aiPromptUsed` on the `exam_questions` table. All the data in the column will be lost.
  - You are about to drop the column `generatedByAI` on the `exam_questions` table. All the data in the column will be lost.
  - You are about to drop the column `isInQuestionPool` on the `exam_questions` table. All the data in the column will be lost.
  - You are about to drop the column `isValidated` on the `exam_questions` table. All the data in the column will be lost.
  - You are about to drop the column `needsReview` on the `exam_questions` table. All the data in the column will be lost.
  - You are about to drop the column `poolOrder` on the `exam_questions` table. All the data in the column will be lost.
  - You are about to drop the column `questionHash` on the `exam_questions` table. All the data in the column will be lost.
  - You are about to drop the column `timesUsed` on the `exam_questions` table. All the data in the column will be lost.
  - You are about to drop the column `validatedAt` on the `exam_questions` table. All the data in the column will be lost.
  - You are about to drop the column `validatedBy` on the `exam_questions` table. All the data in the column will be lost.
  - You are about to drop the column `accessType` on the `exams` table. All the data in the column will be lost.
  - You are about to drop the column `aiEnabled` on the `exams` table. All the data in the column will be lost.
  - You are about to drop the column `aiModel` on the `exams` table. All the data in the column will be lost.
  - You are about to drop the column `aiProvider` on the `exams` table. All the data in the column will be lost.
  - You are about to drop the column `allowStudentReview` on the `exams` table. All the data in the column will be lost.
  - You are about to drop the column `availableFrom` on the `exams` table. All the data in the column will be lost.
  - You are about to drop the column `availableUntil` on the `exams` table. All the data in the column will be lost.
  - You are about to drop the column `notifyByEmail` on the `exams` table. All the data in the column will be lost.
  - You are about to drop the column `optionsPerQuestion` on the `exams` table. All the data in the column will be lost.
  - You are about to drop the column `questionsPerAttempt` on the `exams` table. All the data in the column will be lost.
  - You are about to drop the column `requiresAuth` on the `exams` table. All the data in the column will be lost.
  - You are about to drop the column `showScoreImmediate` on the `exams` table. All the data in the column will be lost.
  - You are about to drop the column `sourceFileId` on the `exams` table. All the data in the column will be lost.
  - You are about to drop the column `totalQuestionsInPool` on the `exams` table. All the data in the column will be lost.
  - You are about to drop the `audit_logs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `exam_access` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `exam_attempt_questions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `student_lists` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "AIExamAccessType" AS ENUM ('PUBLIC', 'PRIVATE');

-- DropForeignKey
ALTER TABLE "public"."exam_access" DROP CONSTRAINT "exam_access_examId_fkey";

-- DropForeignKey
ALTER TABLE "public"."exam_access" DROP CONSTRAINT "exam_access_studentListId_fkey";

-- DropForeignKey
ALTER TABLE "public"."exam_attempt_questions" DROP CONSTRAINT "exam_attempt_questions_attemptId_fkey";

-- DropForeignKey
ALTER TABLE "public"."exam_attempt_questions" DROP CONSTRAINT "exam_attempt_questions_questionId_fkey";

-- DropForeignKey
ALTER TABLE "public"."exam_attempts" DROP CONSTRAINT "exam_attempts_examAccessId_fkey";

-- DropForeignKey
ALTER TABLE "public"."exams" DROP CONSTRAINT "exams_sourceFileId_fkey";

-- DropForeignKey
ALTER TABLE "public"."student_lists" DROP CONSTRAINT "student_lists_examId_fkey";

-- DropIndex
DROP INDEX "public"."exam_attempts_sessionToken_idx";

-- DropIndex
DROP INDEX "public"."exam_attempts_sessionToken_key";

-- DropIndex
DROP INDEX "public"."exam_questions_questionHash_idx";

-- AlterTable
ALTER TABLE "exam_attempts" DROP COLUMN "browserFingerprint",
DROP COLUMN "completed",
DROP COLUMN "examAccessId",
DROP COLUMN "flaggedAsSuspicious",
DROP COLUMN "lastActivityAt",
DROP COLUMN "sessionToken",
DROP COLUMN "suspiciousReason",
DROP COLUMN "tabSwitchCount",
ALTER COLUMN "studentName" DROP NOT NULL;

-- AlterTable
ALTER TABLE "exam_questions" DROP COLUMN "aiPromptUsed",
DROP COLUMN "generatedByAI",
DROP COLUMN "isInQuestionPool",
DROP COLUMN "isValidated",
DROP COLUMN "needsReview",
DROP COLUMN "poolOrder",
DROP COLUMN "questionHash",
DROP COLUMN "timesUsed",
DROP COLUMN "validatedAt",
DROP COLUMN "validatedBy";

-- AlterTable
ALTER TABLE "exams" DROP COLUMN "accessType",
DROP COLUMN "aiEnabled",
DROP COLUMN "aiModel",
DROP COLUMN "aiProvider",
DROP COLUMN "allowStudentReview",
DROP COLUMN "availableFrom",
DROP COLUMN "availableUntil",
DROP COLUMN "notifyByEmail",
DROP COLUMN "optionsPerQuestion",
DROP COLUMN "questionsPerAttempt",
DROP COLUMN "requiresAuth",
DROP COLUMN "showScoreImmediate",
DROP COLUMN "sourceFileId",
DROP COLUMN "totalQuestionsInPool";

-- DropTable
DROP TABLE "public"."audit_logs";

-- DropTable
DROP TABLE "public"."exam_access";

-- DropTable
DROP TABLE "public"."exam_attempt_questions";

-- DropTable
DROP TABLE "public"."student_lists";

-- DropEnum
DROP TYPE "public"."ExamAccessType";

-- CreateTable
CREATE TABLE "ai_exams" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "slug" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "accessType" "AIExamAccessType" NOT NULL DEFAULT 'PUBLIC',
    "publicUrl" TEXT,
    "instructions" TEXT,
    "timeLimit" INTEGER,
    "maxAttempts" INTEGER NOT NULL DEFAULT 1,
    "passingScore" DOUBLE PRECISION NOT NULL DEFAULT 60,
    "shuffleQuestions" BOOLEAN NOT NULL DEFAULT true,
    "shuffleOptions" BOOLEAN NOT NULL DEFAULT true,
    "showResults" "ShowResultsType" NOT NULL DEFAULT 'IMMEDIATE',
    "allowReview" BOOLEAN NOT NULL DEFAULT true,
    "totalQuestionsInPool" INTEGER NOT NULL DEFAULT 0,
    "questionsPerAttempt" INTEGER NOT NULL DEFAULT 10,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "aiModel" TEXT DEFAULT 'gpt-4',
    "sourceDocument" TEXT,
    "generationPrompt" TEXT,
    "validated" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_exams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_exam_sections" (
    "id" TEXT NOT NULL,
    "aiExamId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_exam_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_exam_questions" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "helpText" TEXT,
    "points" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "order" INTEGER NOT NULL,
    "type" "ExamQuestionType" NOT NULL DEFAULT 'RADIO',
    "feedback" TEXT,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "validated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_exam_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_exam_options" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ai_exam_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_exam_attempts" (
    "id" TEXT NOT NULL,
    "aiExamId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "studentName" TEXT,
    "studentEmail" TEXT,
    "studentId" TEXT,
    "selectedQuestions" JSONB NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "timeSpent" INTEGER,
    "score" DOUBLE PRECISION,
    "maxScore" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "passed" BOOLEAN,
    "totalCorrect" INTEGER,
    "totalQuestions" INTEGER,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "ai_exam_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_exam_responses" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "selectedOptionId" TEXT,
    "isCorrect" BOOLEAN,
    "pointsEarned" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_exam_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_exam_students" (
    "id" TEXT NOT NULL,
    "aiExamId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_exam_students_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ai_exams_slug_key" ON "ai_exams"("slug");

-- CreateIndex
CREATE INDEX "ai_exam_attempts_aiExamId_attemptNumber_idx" ON "ai_exam_attempts"("aiExamId", "attemptNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ai_exam_responses_attemptId_questionId_key" ON "ai_exam_responses"("attemptId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "ai_exam_students_aiExamId_email_key" ON "ai_exam_students"("aiExamId", "email");

-- AddForeignKey
ALTER TABLE "ai_exams" ADD CONSTRAINT "ai_exams_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_exam_sections" ADD CONSTRAINT "ai_exam_sections_aiExamId_fkey" FOREIGN KEY ("aiExamId") REFERENCES "ai_exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_exam_questions" ADD CONSTRAINT "ai_exam_questions_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "ai_exam_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_exam_options" ADD CONSTRAINT "ai_exam_options_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "ai_exam_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_exam_attempts" ADD CONSTRAINT "ai_exam_attempts_aiExamId_fkey" FOREIGN KEY ("aiExamId") REFERENCES "ai_exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_exam_attempts" ADD CONSTRAINT "ai_exam_attempts_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "ai_exam_students"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_exam_responses" ADD CONSTRAINT "ai_exam_responses_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "ai_exam_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_exam_responses" ADD CONSTRAINT "ai_exam_responses_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "ai_exam_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_exam_responses" ADD CONSTRAINT "ai_exam_responses_selectedOptionId_fkey" FOREIGN KEY ("selectedOptionId") REFERENCES "ai_exam_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_exam_students" ADD CONSTRAINT "ai_exam_students_aiExamId_fkey" FOREIGN KEY ("aiExamId") REFERENCES "ai_exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
