-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'CLOSER', 'SETTER', 'CLIENT');

-- CreateEnum
CREATE TYPE "CallOutcome" AS ENUM ('CLOSED_PIF', 'CLOSED_SPLIT_PAY', 'CLOSED_DEPOSIT', 'OFFER_DECLINED', 'NOT_A_FIT', 'NO_SHOW', 'CANCELLED', 'RESCHEDULED', 'DRAG_OVER_SHOW');

-- CreateEnum
CREATE TYPE "ObjectionType" AS ENUM ('THINK_ABOUT_IT', 'MONEY', 'TIME', 'PARTNER', 'FEAR', 'VALUE');

-- CreateEnum
CREATE TYPE "LeadTagType" AS ENUM ('CLOSED', 'FOLLOW_UP', 'HOT_FOLLOW_UP', 'NO_SHOW', 'DECLINED', 'NOT_INTERESTED', 'RESCHEDULED');

-- CreateEnum
CREATE TYPE "AdType" AS ENUM ('TYPEFORM', 'NORMAL');

-- CreateEnum
CREATE TYPE "AdSyncStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('WARNING', 'CRITICAL');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'DKK',
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Copenhagen',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memberships" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calls" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "clientId" TEXT NOT NULL,
    "closerId" TEXT NOT NULL,
    "leadName" TEXT NOT NULL,
    "leadPhone" TEXT,
    "leadEmail" TEXT,
    "leadSource" TEXT,
    "outcome" "CallOutcome" NOT NULL,
    "revenueMinor" INTEGER NOT NULL DEFAULT 0,
    "cashCollectedMinor" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL,
    "objectionType" "ObjectionType",
    "objectionNotes" TEXT,
    "callDurationSecs" INTEGER,
    "recordingUrl" TEXT,
    "followUpNotes" TEXT,
    "callSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_tags" (
    "id" TEXT NOT NULL,
    "callId" TEXT NOT NULL,
    "tagType" "LeadTagType" NOT NULL,
    "taggedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "setter_logs" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "clientId" TEXT NOT NULL,
    "setterId" TEXT NOT NULL,
    "newConvos" INTEGER NOT NULL DEFAULT 0,
    "responses" INTEGER NOT NULL DEFAULT 0,
    "offers" INTEGER NOT NULL DEFAULT 0,
    "bookedCalls" INTEGER NOT NULL DEFAULT 0,
    "followUps" INTEGER NOT NULL DEFAULT 0,
    "followUpOffers" INTEGER NOT NULL DEFAULT 0,
    "followUpBookedCalls" INTEGER NOT NULL DEFAULT 0,
    "followerCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "setter_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "facebookId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "adType" "AdType" NOT NULL,
    "status" TEXT NOT NULL,
    "dailyBudgetMinor" INTEGER,
    "currency" TEXT NOT NULL,
    "flaggedForReview" BOOLEAN NOT NULL DEFAULT false,
    "flagReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_daily_metrics" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "clientId" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "newAdFollows" INTEGER NOT NULL DEFAULT 0,
    "dailySpendMinor" INTEGER NOT NULL DEFAULT 0,
    "totalSpendMinor" INTEGER NOT NULL DEFAULT 0,
    "costPerLeadMinor" INTEGER,
    "callsBooked" INTEGER NOT NULL DEFAULT 0,
    "revenueMinor" INTEGER NOT NULL DEFAULT 0,
    "cashCollectedMinor" INTEGER NOT NULL DEFAULT 0,
    "totalLeads" INTEGER,
    "reach" INTEGER,
    "impressions" INTEGER,
    "clicks" INTEGER,
    "ctr" DECIMAL(65,30),
    "cpmMinor" INTEGER,
    "cpcMinor" INTEGER,
    "results" INTEGER,
    "costPerResultMinor" INTEGER,
    "costPerFollowerMinor" INTEGER,
    "costPerConversationMinor" INTEGER,
    "costPerCallMinor" INTEGER,
    "costPerCustomerMinor" INTEGER,
    "roasCash" DECIMAL(65,30),
    "roasRevenue" DECIMAL(65,30),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ad_daily_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_creative_metrics" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "clientId" TEXT NOT NULL,
    "campaignId" TEXT,
    "adLabel" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "follows" INTEGER,
    "newAdFollows" INTEGER,
    "dailySpendMinor" INTEGER,
    "totalSpendMinor" INTEGER,
    "costPerLeadMinor" INTEGER,
    "reach" INTEGER,
    "frequency" DECIMAL(65,30),
    "impressions" INTEGER,
    "clicks" INTEGER,
    "ctr" DECIMAL(65,30),
    "cpmMinor" INTEGER,
    "cpcMinor" INTEGER,
    "results" INTEGER,
    "costPerResultMinor" INTEGER,
    "costPerFollowerMinor" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ad_creative_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_sync_logs" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "campaignId" TEXT,
    "status" "AdSyncStatus" NOT NULL,
    "triggeredBy" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "durationMs" INTEGER,
    "narrative" TEXT,

    CONSTRAINT "ad_sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goals" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "kpiKey" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "targetMinor" INTEGER,
    "targetValue" DECIMAL(65,30),
    "currency" TEXT,
    "greenPct" INTEGER NOT NULL DEFAULT 75,
    "amberPct" INTEGER NOT NULL DEFAULT 50,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fx_rates" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "fromCurrency" TEXT NOT NULL,
    "toCurrency" TEXT NOT NULL,
    "rate" DECIMAL(65,30) NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fx_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "slack_configs" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "botToken" TEXT NOT NULL,
    "dailyReportChannelId" TEXT,
    "weeklyReportChannelId" TEXT,
    "monthlyReportChannelId" TEXT,
    "leaderboardChannelId" TEXT,
    "alertsChannelId" TEXT,
    "lossDebriefChannelId" TEXT,
    "dailyReportEnabled" BOOLEAN NOT NULL DEFAULT true,
    "weeklyReportEnabled" BOOLEAN NOT NULL DEFAULT true,
    "monthlyReportEnabled" BOOLEAN NOT NULL DEFAULT true,
    "leaderboardEnabled" BOOLEAN NOT NULL DEFAULT true,
    "alertsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lossDebriefEnabled" BOOLEAN NOT NULL DEFAULT true,
    "milestoneEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "slack_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "kpiKey" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "dropPct" DECIMAL(65,30) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commission_records" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "closerName" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "prospectName" TEXT,
    "instagramHandle" TEXT,
    "channel" TEXT,
    "closedDate" TIMESTAMP(3),
    "commissionMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commission_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pnl_entries" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "categoryName" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pnl_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "s3Key" TEXT NOT NULL,
    "s3Url" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generatedBy" TEXT NOT NULL,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invite_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invite_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "memberships_userId_clientId_key" ON "memberships"("userId", "clientId");

-- CreateIndex
CREATE INDEX "calls_clientId_date_idx" ON "calls"("clientId", "date");

-- CreateIndex
CREATE INDEX "calls_closerId_date_idx" ON "calls"("closerId", "date");

-- CreateIndex
CREATE INDEX "lead_tags_callId_idx" ON "lead_tags"("callId");

-- CreateIndex
CREATE UNIQUE INDEX "setter_logs_setterId_clientId_date_key" ON "setter_logs"("setterId", "clientId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "campaigns_clientId_facebookId_key" ON "campaigns"("clientId", "facebookId");

-- CreateIndex
CREATE UNIQUE INDEX "ad_daily_metrics_clientId_date_key" ON "ad_daily_metrics"("clientId", "date");

-- CreateIndex
CREATE INDEX "ad_creative_metrics_clientId_date_idx" ON "ad_creative_metrics"("clientId", "date");

-- CreateIndex
CREATE INDEX "ad_creative_metrics_clientId_adLabel_date_idx" ON "ad_creative_metrics"("clientId", "adLabel", "date");

-- CreateIndex
CREATE INDEX "ad_sync_logs_clientId_startedAt_idx" ON "ad_sync_logs"("clientId", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "goals_clientId_kpiKey_month_year_key" ON "goals"("clientId", "kpiKey", "month", "year");

-- CreateIndex
CREATE INDEX "fx_rates_fromCurrency_toCurrency_idx" ON "fx_rates"("fromCurrency", "toCurrency");

-- CreateIndex
CREATE UNIQUE INDEX "fx_rates_fromCurrency_toCurrency_date_key" ON "fx_rates"("fromCurrency", "toCurrency", "date");

-- CreateIndex
CREATE UNIQUE INDEX "slack_configs_clientId_key" ON "slack_configs"("clientId");

-- CreateIndex
CREATE INDEX "alerts_clientId_createdAt_idx" ON "alerts"("clientId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "pnl_entries_clientId_year_month_categoryName_key" ON "pnl_entries"("clientId", "year", "month", "categoryName");

-- CreateIndex
CREATE UNIQUE INDEX "invite_tokens_token_key" ON "invite_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_key" ON "password_reset_tokens"("token");

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calls" ADD CONSTRAINT "calls_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calls" ADD CONSTRAINT "calls_closerId_fkey" FOREIGN KEY ("closerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_tags" ADD CONSTRAINT "lead_tags_callId_fkey" FOREIGN KEY ("callId") REFERENCES "calls"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_tags" ADD CONSTRAINT "lead_tags_taggedBy_fkey" FOREIGN KEY ("taggedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "setter_logs" ADD CONSTRAINT "setter_logs_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "setter_logs" ADD CONSTRAINT "setter_logs_setterId_fkey" FOREIGN KEY ("setterId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_daily_metrics" ADD CONSTRAINT "ad_daily_metrics_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_creative_metrics" ADD CONSTRAINT "ad_creative_metrics_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_creative_metrics" ADD CONSTRAINT "ad_creative_metrics_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_sync_logs" ADD CONSTRAINT "ad_sync_logs_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_sync_logs" ADD CONSTRAINT "ad_sync_logs_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slack_configs" ADD CONSTRAINT "slack_configs_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_records" ADD CONSTRAINT "commission_records_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pnl_entries" ADD CONSTRAINT "pnl_entries_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_generatedBy_fkey" FOREIGN KEY ("generatedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invite_tokens" ADD CONSTRAINT "invite_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
