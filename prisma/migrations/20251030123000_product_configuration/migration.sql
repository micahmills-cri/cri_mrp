-- CreateEnum
CREATE TYPE "ProductConfigurationDependencyType" AS ENUM ('REQUIRES', 'EXCLUDES');

-- CreateTable
CREATE TABLE "ProductConfigurationSection" (
    "id" TEXT NOT NULL,
    "productModelId" TEXT NOT NULL,
    "productTrimId" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductConfigurationSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductConfigurationComponent" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "allowMultiple" BOOLEAN NOT NULL DEFAULT false,
    "defaultOptionId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductConfigurationComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductConfigurationOption" (
    "id" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "partNumber" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductConfigurationOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductConfigurationDependency" (
    "id" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "dependsOnOptionId" TEXT NOT NULL,
    "dependencyType" "ProductConfigurationDependencyType" NOT NULL DEFAULT 'REQUIRES',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductConfigurationDependency_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductConfigurationSection_productModelId_idx" ON "ProductConfigurationSection"("productModelId");

-- CreateIndex
CREATE INDEX "ProductConfigurationSection_productTrimId_idx" ON "ProductConfigurationSection"("productTrimId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductConfigurationSection_productModelId_productTrimId_co_key" ON "ProductConfigurationSection"("productModelId", "productTrimId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "ProductConfigurationComponent_defaultOptionId_key" ON "ProductConfigurationComponent"("defaultOptionId");

-- CreateIndex
CREATE INDEX "ProductConfigurationComponent_sectionId_idx" ON "ProductConfigurationComponent"("sectionId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductConfigurationComponent_sectionId_code_key" ON "ProductConfigurationComponent"("sectionId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "ProductConfigurationComponent_sectionId_sortOrder_key" ON "ProductConfigurationComponent"("sectionId", "sortOrder");

-- CreateIndex
CREATE INDEX "ProductConfigurationOption_componentId_idx" ON "ProductConfigurationOption"("componentId");

-- CreateIndex
CREATE INDEX "ProductConfigurationOption_code_idx" ON "ProductConfigurationOption"("code");

-- CreateIndex
CREATE INDEX "ProductConfigurationOption_partNumber_idx" ON "ProductConfigurationOption"("partNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ProductConfigurationOption_componentId_code_key" ON "ProductConfigurationOption"("componentId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "ProductConfigurationOption_componentId_sortOrder_key" ON "ProductConfigurationOption"("componentId", "sortOrder");

-- CreateIndex
CREATE INDEX "ProductConfigurationDependency_optionId_idx" ON "ProductConfigurationDependency"("optionId");

-- CreateIndex
CREATE INDEX "ProductConfigurationDependency_dependsOnOptionId_idx" ON "ProductConfigurationDependency"("dependsOnOptionId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductConfigurationDependency_optionId_dependsOnOptionId_d_key" ON "ProductConfigurationDependency"("optionId", "dependsOnOptionId", "dependencyType");

-- AddForeignKey
ALTER TABLE "ProductConfigurationSection" ADD CONSTRAINT "ProductConfigurationSection_productModelId_fkey" FOREIGN KEY ("productModelId") REFERENCES "ProductModel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductConfigurationSection" ADD CONSTRAINT "ProductConfigurationSection_productTrimId_fkey" FOREIGN KEY ("productTrimId") REFERENCES "ProductTrim"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductConfigurationComponent" ADD CONSTRAINT "ProductConfigurationComponent_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "ProductConfigurationSection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductConfigurationComponent" ADD CONSTRAINT "ProductConfigurationComponent_defaultOptionId_fkey" FOREIGN KEY ("defaultOptionId") REFERENCES "ProductConfigurationOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductConfigurationOption" ADD CONSTRAINT "ProductConfigurationOption_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "ProductConfigurationComponent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductConfigurationDependency" ADD CONSTRAINT "ProductConfigurationDependency_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "ProductConfigurationOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductConfigurationDependency" ADD CONSTRAINT "ProductConfigurationDependency_dependsOnOptionId_fkey" FOREIGN KEY ("dependsOnOptionId") REFERENCES "ProductConfigurationOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

