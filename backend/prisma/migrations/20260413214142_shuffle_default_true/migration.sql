-- AlterTable
ALTER TABLE "exams" ALTER COLUMN "shuffleQuestions" SET DEFAULT true,
ALTER COLUMN "shuffleOptions" SET DEFAULT true;

-- AlterTable
ALTER TABLE "platform_settings" ALTER COLUMN "primaryColor" SET DEFAULT '#2563eb',
ALTER COLUMN "secondaryColor" SET DEFAULT '#1e40af',
ALTER COLUMN "accentColor" SET DEFAULT '#3b82f6',
ALTER COLUMN "allowPublicForms" SET DEFAULT false,
ALTER COLUMN "platformName" DROP NOT NULL,
ALTER COLUMN "platformName" DROP DEFAULT;
