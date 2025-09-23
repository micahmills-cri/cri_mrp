-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('ADMIN', 'SUPERVISOR', 'OPERATOR');

-- CreateEnum
CREATE TYPE "public"."WOStatus" AS ENUM ('PLANNED', 'RELEASED', 'IN_PROGRESS', 'HOLD', 'COMPLETED', 'CLOSED');

-- CreateEnum
CREATE TYPE "public"."WOEvent" AS ENUM ('START', 'PAUSE', 'COMPLETE', 'SCRAP_ADJUST', 'GOOD_ADJUST');

-- CreateEnum
CREATE TYPE "public"."RoutingVersionStatus" AS ENUM ('DRAFT', 'RELEASED');

-- CreateTable
CREATE TABLE "public"."Department" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "public"."Role" NOT NULL DEFAULT 'OPERATOR',
    "departmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WorkCenter" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "WorkCenter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Station" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "workCenterId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Station_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RoutingVersion" (
    "id" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "trim" TEXT,
    "featuresJson" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "public"."RoutingVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "releasedAt" TIMESTAMP(3),

    CONSTRAINT "RoutingVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RoutingStage" (
    "id" TEXT NOT NULL,
    "routingVersionId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "workCenterId" TEXT NOT NULL,
    "standardStageSeconds" INTEGER NOT NULL,

    CONSTRAINT "RoutingStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WorkOrder" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "hullId" TEXT NOT NULL,
    "productSku" TEXT NOT NULL,
    "specSnapshot" JSONB NOT NULL,
    "qty" INTEGER NOT NULL,
    "status" "public"."WOStatus" NOT NULL DEFAULT 'RELEASED',
    "routingVersionId" TEXT NOT NULL,
    "currentStageIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WOStageLog" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "routingStageId" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "event" "public"."WOEvent" NOT NULL,
    "goodQty" INTEGER NOT NULL DEFAULT 0,
    "scrapQty" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WOStageLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WorkInstructionVersion" (
    "id" TEXT NOT NULL,
    "routingStageId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "contentMd" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkInstructionVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "model" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Department_name_key" ON "public"."Department"("name");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "WorkCenter_name_key" ON "public"."WorkCenter"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Station_code_key" ON "public"."Station"("code");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrder_number_key" ON "public"."WorkOrder"("number");

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "public"."Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WorkCenter" ADD CONSTRAINT "WorkCenter_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "public"."Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Station" ADD CONSTRAINT "Station_workCenterId_fkey" FOREIGN KEY ("workCenterId") REFERENCES "public"."WorkCenter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RoutingStage" ADD CONSTRAINT "RoutingStage_routingVersionId_fkey" FOREIGN KEY ("routingVersionId") REFERENCES "public"."RoutingVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RoutingStage" ADD CONSTRAINT "RoutingStage_workCenterId_fkey" FOREIGN KEY ("workCenterId") REFERENCES "public"."WorkCenter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WorkOrder" ADD CONSTRAINT "WorkOrder_routingVersionId_fkey" FOREIGN KEY ("routingVersionId") REFERENCES "public"."RoutingVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WOStageLog" ADD CONSTRAINT "WOStageLog_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "public"."WorkOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WOStageLog" ADD CONSTRAINT "WOStageLog_routingStageId_fkey" FOREIGN KEY ("routingStageId") REFERENCES "public"."RoutingStage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WOStageLog" ADD CONSTRAINT "WOStageLog_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "public"."Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WOStageLog" ADD CONSTRAINT "WOStageLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WorkInstructionVersion" ADD CONSTRAINT "WorkInstructionVersion_routingStageId_fkey" FOREIGN KEY ("routingStageId") REFERENCES "public"."RoutingStage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
