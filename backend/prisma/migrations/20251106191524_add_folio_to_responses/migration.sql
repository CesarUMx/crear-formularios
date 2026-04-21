/*
  Warnings:

  - A unique constraint covering the columns `[folio]` on the table `responses` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "public"."forms" DROP CONSTRAINT "forms_templateId_fkey";

-- AlterTable
ALTER TABLE "forms" ALTER COLUMN "templateId" DROP NOT NULL,
ALTER COLUMN "templateId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "responses" ADD COLUMN     "folio" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "responses_folio_key" ON "responses"("folio");

-- CreateIndex
CREATE INDEX "responses_folio_idx" ON "responses"("folio");

-- AddForeignKey
ALTER TABLE "forms" ADD CONSTRAINT "forms_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "form_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
