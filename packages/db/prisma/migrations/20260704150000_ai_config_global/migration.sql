-- AiConfig becomes agency-wide per dashboard instead of per client + dashboard.
-- Table is empty in production (no admin has set a custom AI tone yet), so this
-- is a pure schema simplification with no data to migrate.

-- DropForeignKey
ALTER TABLE "ai_configs" DROP CONSTRAINT "ai_configs_clientId_fkey";

-- DropIndex
DROP INDEX "ai_configs_clientId_dashboard_key";

-- AlterTable
ALTER TABLE "ai_configs" DROP COLUMN "clientId";

-- CreateIndex
CREATE UNIQUE INDEX "ai_configs_dashboard_key" ON "ai_configs"("dashboard");
