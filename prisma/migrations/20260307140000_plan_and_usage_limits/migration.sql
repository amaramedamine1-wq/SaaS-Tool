-- Add monthly usage and plan fields for freemium limits
ALTER TABLE "User"
ADD COLUMN "plan" TEXT NOT NULL DEFAULT 'free',
ADD COLUMN "usageMonthKey" TEXT NOT NULL DEFAULT '',
ADD COLUMN "imageUsed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "videoUsed" INTEGER NOT NULL DEFAULT 0;
