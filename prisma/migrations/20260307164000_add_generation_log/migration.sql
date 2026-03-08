-- CreateTable
CREATE TABLE "public"."Generation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'video',
    "provider" TEXT NOT NULL DEFAULT 'vertex-ai',
    "operationName" TEXT,
    "prompt" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "reason" TEXT,
    "videoUrl" TEXT,
    "videoGcsUri" TEXT,
    "persistedVideoUrl" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Generation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Generation_operationName_key" ON "public"."Generation"("operationName");

-- CreateIndex
CREATE INDEX "Generation_userId_createdAt_idx" ON "public"."Generation"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."Generation" ADD CONSTRAINT "Generation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
