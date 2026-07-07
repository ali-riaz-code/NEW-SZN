-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "closeRateAnomalyCriticalPct" INTEGER NOT NULL DEFAULT 35,
ADD COLUMN     "closeRateAnomalyWarningPct" INTEGER NOT NULL DEFAULT 20;
