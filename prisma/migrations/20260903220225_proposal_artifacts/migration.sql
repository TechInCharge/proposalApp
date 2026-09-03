-- AlterTable
ALTER TABLE "Proposal" ADD COLUMN     "docxUrl" TEXT,
ADD COLUMN     "generatedAt" TIMESTAMP(3),
ADD COLUMN     "pdfUrl" TEXT;
