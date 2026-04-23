-- AlterTable
ALTER TABLE "exam_attempts" ADD COLUMN     "sectionTimes" JSONB;

-- AlterTable
ALTER TABLE "exam_sections" ADD COLUMN     "timeLimit" INTEGER;
