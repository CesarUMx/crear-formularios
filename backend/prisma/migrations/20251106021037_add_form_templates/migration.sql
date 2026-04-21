-- AlterTable
ALTER TABLE "forms" ADD COLUMN     "templateId" TEXT NOT NULL DEFAULT 'modern';

-- CreateTable
CREATE TABLE "form_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "thumbnail" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "primaryColor" TEXT NOT NULL DEFAULT '#3B82F6',
    "secondaryColor" TEXT NOT NULL DEFAULT '#10B981',
    "accentColor" TEXT NOT NULL DEFAULT '#F59E0B',
    "backgroundColor" TEXT NOT NULL DEFAULT '#F9FAFB',
    "textColor" TEXT NOT NULL DEFAULT '#111827',
    "headerStyle" TEXT NOT NULL DEFAULT 'simple',
    "sectionStyle" TEXT NOT NULL DEFAULT 'card',
    "buttonStyle" TEXT NOT NULL DEFAULT 'rounded',
    "inputStyle" TEXT NOT NULL DEFAULT 'outlined',
    "fontFamily" TEXT NOT NULL DEFAULT 'Inter',
    "fontSize" TEXT NOT NULL DEFAULT 'base',
    "customStyles" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "form_templates_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "forms" ADD CONSTRAINT "forms_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "form_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
