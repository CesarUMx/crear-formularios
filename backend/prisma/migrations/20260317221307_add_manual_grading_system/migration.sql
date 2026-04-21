-- AlterTable
ALTER TABLE "ai_exam_attempts" ADD COLUMN     "autoScore" DOUBLE PRECISION,
ADD COLUMN     "gradedAt" TIMESTAMP(3),
ADD COLUMN     "gradedBy" TEXT,
ADD COLUMN     "isGraded" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "manualScore" DOUBLE PRECISION,
ADD COLUMN     "requiresManualGrading" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ai_exam_responses" ADD COLUMN     "feedback" TEXT,
ADD COLUMN     "isGraded" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "manualScore" DOUBLE PRECISION,
ADD COLUMN     "requiresManualGrading" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "textAnswer" TEXT;
