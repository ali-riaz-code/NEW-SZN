/*
  Warnings:

  - Added the required column `periodEnd` to the `reports` table without a default value. This is not possible if the table is not empty.
  - Added the required column `periodStart` to the `reports` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- AlterTable
ALTER TABLE "calls" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "anomalyCriticalPct" INTEGER NOT NULL DEFAULT 35,
ADD COLUMN     "anomalyWarningPct" INTEGER NOT NULL DEFAULT 20;

-- AlterTable
ALTER TABLE "reports" ADD COLUMN     "periodEnd" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "periodStart" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "type" "ReportType" NOT NULL DEFAULT 'MONTHLY';

-- CreateTable
CREATE TABLE "ai_configs" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "dashboard" TEXT NOT NULL,
    "tone" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ai_configs_clientId_dashboard_key" ON "ai_configs"("clientId", "dashboard");

-- CreateIndex
CREATE INDEX "reports_clientId_generatedAt_idx" ON "reports"("clientId", "generatedAt");

-- AddForeignKey
ALTER TABLE "ai_configs" ADD CONSTRAINT "ai_configs_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
