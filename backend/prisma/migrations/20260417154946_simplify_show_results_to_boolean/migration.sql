/*
  Warnings:

  - You are about to drop the column `allowReview` on the `ai_exams` table. All the data in the column will be lost.
  - The `showResults` column on the `ai_exams` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `examVersionId` on the `exam_attempts` table. All the data in the column will be lost.
  - You are about to drop the column `examVersionId` on the `exam_sections` table. All the data in the column will be lost.
  - You are about to drop the column `allowReview` on the `exams` table. All the data in the column will be lost.
  - You are about to drop the column `isPublic` on the `exams` table. All the data in the column will be lost.
  - You are about to drop the column `templateId` on the `exams` table. All the data in the column will be lost.
  - The `showResults` column on the `exams` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `exam_files` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `exam_versions` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `examId` to the `exam_sections` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ExamAccessType" AS ENUM ('PUBLIC', 'PRIVATE');

-- AlterEnum
ALTER TYPE "ExamQuestionType" ADD VALUE 'FILL_BLANK';

-- DropForeignKey
ALTER TABLE "public"."exam_attempts" DROP CONSTRAINT "exam_attempts_examVersionId_fkey";

-- DropForeignKey
ALTER TABLE "public"."exam_files" DROP CONSTRAINT "exam_files_examId_fkey";

-- DropForeignKey
ALTER TABLE "public"."exam_sections" DROP CONSTRAINT "exam_sections_examVersionId_fkey";

-- DropForeignKey
ALTER TABLE "public"."exam_versions" DROP CONSTRAINT "exam_versions_examId_fkey";

-- DropForeignKey
ALTER TABLE "public"."exams" DROP CONSTRAINT "exams_templateId_fkey";

-- AlterTable
ALTER TABLE "ai_exams" DROP COLUMN "allowReview",
DROP COLUMN "showResults",
ADD COLUMN     "showResults" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "exam_attempts" DROP COLUMN "examVersionId",
ADD COLUMN     "autoScore" DOUBLE PRECISION,
ADD COLUMN     "gradedAt" TIMESTAMP(3),
ADD COLUMN     "gradedBy" TEXT,
ADD COLUMN     "isGraded" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "manualScore" DOUBLE PRECISION,
ADD COLUMN     "requiresManualGrading" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "selectedQuestions" JSONB,
ADD COLUMN     "sessionToken" TEXT,
ADD COLUMN     "studentId" TEXT,
ADD COLUMN     "studentPhoto" TEXT,
ADD COLUMN     "tabSwitches" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "exam_questions" ADD COLUMN     "fileName" TEXT,
ADD COLUMN     "fileSize" INTEGER,
ADD COLUMN     "fileType" TEXT,
ADD COLUMN     "fileUrl" TEXT,
ADD COLUMN     "metadata" JSONB;

-- AlterTable
ALTER TABLE "exam_sections" DROP COLUMN "examVersionId",
ADD COLUMN     "examId" TEXT NOT NULL,
ADD COLUMN     "fileName" TEXT,
ADD COLUMN     "fileSize" INTEGER,
ADD COLUMN     "fileType" TEXT,
ADD COLUMN     "fileUrl" TEXT;

-- AlterTable
ALTER TABLE "exams" DROP COLUMN "allowReview",
DROP COLUMN "isPublic",
DROP COLUMN "templateId",
ADD COLUMN     "accessType" "ExamAccessType" NOT NULL DEFAULT 'PUBLIC',
ADD COLUMN     "instructions" TEXT,
ADD COLUMN     "questionsPerAttempt" INTEGER,
ALTER COLUMN "isActive" SET DEFAULT false,
DROP COLUMN "showResults",
ADD COLUMN     "showResults" BOOLEAN NOT NULL DEFAULT true;

-- DropTable
DROP TABLE "public"."exam_files";

-- DropTable
DROP TABLE "public"."exam_versions";

-- DropEnum
DROP TYPE "public"."ShowResultsType";

-- CreateTable
CREATE TABLE "exam_students" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exam_students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_exam_shares" (
    "id" TEXT NOT NULL,
    "aiExamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "permission" "SharePermission" NOT NULL DEFAULT 'VIEW',
    "sharedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_exam_shares_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "exam_students_examId_email_key" ON "exam_students"("examId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "ai_exam_shares_aiExamId_userId_key" ON "ai_exam_shares"("aiExamId", "userId");

-- CreateIndex
CREATE INDEX "exam_attempts_sessionToken_idx" ON "exam_attempts"("sessionToken");

-- AddForeignKey
ALTER TABLE "exam_sections" ADD CONSTRAINT "exam_sections_examId_fkey" FOREIGN KEY ("examId") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "exam_students"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_students" ADD CONSTRAINT "exam_students_examId_fkey" FOREIGN KEY ("examId") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_exam_shares" ADD CONSTRAINT "ai_exam_shares_aiExamId_fkey" FOREIGN KEY ("aiExamId") REFERENCES "ai_exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_exam_shares" ADD CONSTRAINT "ai_exam_shares_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
