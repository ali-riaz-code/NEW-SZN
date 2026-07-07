-- AlterTable
ALTER TABLE "slack_configs" ADD COLUMN     "bigDealEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "bigDealThresholdMinor" INTEGER NOT NULL DEFAULT 5000000,
ADD COLUMN     "milestoneChannelId" TEXT,
ADD COLUMN     "streakMilestoneEnabled" BOOLEAN NOT NULL DEFAULT true;
