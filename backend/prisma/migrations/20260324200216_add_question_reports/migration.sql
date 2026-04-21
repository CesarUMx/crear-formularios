/*
  Warnings:

  - You are about to drop the column `logo` on the `platform_settings` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'REVIEWED', 'ACCEPTED', 'REJECTED');

-- AlterTable
ALTER TABLE "platform_settings" DROP COLUMN "logo",
ADD COLUMN     "allowPublicForms" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "faviconUrl" TEXT,
ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "platformName" TEXT NOT NULL DEFAULT 'UMx Forms',
ALTER COLUMN "primaryColor" SET DEFAULT '#3B82F6',
ALTER COLUMN "secondaryColor" SET DEFAULT '#10B981',
ALTER COLUMN "accentColor" SET DEFAULT '#F59E0B';

-- CreateTable
CREATE TABLE "question_reports" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "userAnswer" TEXT NOT NULL,
    "correctAnswer" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "question_reports_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "question_reports" ADD CONSTRAINT "question_reports_examId_fkey" FOREIGN KEY ("examId") REFERENCES "ai_exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_reports" ADD CONSTRAINT "question_reports_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "ai_exam_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
