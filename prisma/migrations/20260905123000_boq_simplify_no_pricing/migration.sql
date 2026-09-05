-- AlterTable
ALTER TABLE "BoqItem" DROP COLUMN "unit",
DROP COLUMN "unitPrice",
ALTER COLUMN "quantity" SET DEFAULT 1,
ALTER COLUMN "quantity" SET DATA TYPE INTEGER;

-- AlterTable
ALTER TABLE "Proposal" DROP COLUMN "currency",
DROP COLUMN "showPricing";

