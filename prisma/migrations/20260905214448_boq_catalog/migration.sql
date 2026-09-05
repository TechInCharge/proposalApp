-- CreateTable
CREATE TABLE "BoqCatalogItem" (
    "id" TEXT NOT NULL,
    "partNumber" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BoqCatalogItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BoqCatalogItem_description_idx" ON "BoqCatalogItem"("description");

-- CreateIndex
CREATE UNIQUE INDEX "BoqCatalogItem_partNumber_description_key" ON "BoqCatalogItem"("partNumber", "description");
