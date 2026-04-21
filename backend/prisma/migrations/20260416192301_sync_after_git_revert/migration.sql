/*
  Warnings:

  - You are about to drop the column `fileName` on the `exam_questions` table. All the data in the column will be lost.
  - You are about to drop the column `fileSize` on the `exam_questions` table. All the data in the column will be lost.
  - You are about to drop the column `fileType` on the `exam_questions` table. All the data in the column will be lost.
  - You are about to drop the column `fileUrl` on the `exam_questions` table. All the data in the column will be lost.
  - You are about to drop the column `fileName` on the `exam_sections` table. All the data in the column will be lost.
  - You are about to drop the column `fileSize` on the `exam_sections` table. All the data in the column will be lost.
  - You are about to drop the column `fileType` on the `exam_sections` table. All the data in the column will be lost.
  - You are about to drop the column `fileUrl` on the `exam_sections` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "exam_questions" DROP COLUMN "fileName",
DROP COLUMN "fileSize",
DROP COLUMN "fileType",
DROP COLUMN "fileUrl";

-- AlterTable
ALTER TABLE "exam_sections" DROP COLUMN "fileName",
DROP COLUMN "fileSize",
DROP COLUMN "fileType",
DROP COLUMN "fileUrl";

-- AlterTable
ALTER TABLE "exams" ALTER COLUMN "shuffleQuestions" SET DEFAULT false,
ALTER COLUMN "shuffleOptions" SET DEFAULT false;
