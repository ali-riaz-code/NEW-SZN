-- DropForeignKey
ALTER TABLE "slack_configs" DROP CONSTRAINT "slack_configs_clientId_fkey";

-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "bigDealThresholdMinor" INTEGER NOT NULL DEFAULT 5000000;

-- DropTable
DROP TABLE "slack_configs";

-- CreateTable
CREATE TABLE "slack_settings" (
    "id" TEXT NOT NULL,
    "overallChannelId" TEXT,
    "leaderboardEnabled" BOOLEAN NOT NULL DEFAULT true,
    "milestoneEnabled" BOOLEAN NOT NULL DEFAULT true,
    "streakMilestoneEnabled" BOOLEAN NOT NULL DEFAULT true,
    "bigDealEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lossDebriefEnabled" BOOLEAN NOT NULL DEFAULT true,
    "alertsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "dailyTargetsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "slack_settings_pkey" PRIMARY KEY ("id")
);

