-- Durable creator media cache for non-analytics post metadata and thumbnails.

CREATE TABLE "CreatorMediaCache" (
    "id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "platformMediaId" TEXT NOT NULL,
    "permalink" TEXT,
    "thumbnailUrl" TEXT,
    "sourceThumbnailUrl" TEXT,
    "caption" TEXT,
    "mediaType" TEXT NOT NULL,
    "mediaProductType" TEXT,
    "publishedAt" TIMESTAMP(3),
    "likeCount" INTEGER,
    "commentCount" INTEGER,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreatorMediaCache_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CreatorMediaCacheState" (
    "id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "nextCursor" TEXT,
    "hasMore" BOOLEAN NOT NULL DEFAULT false,
    "refreshedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreatorMediaCacheState_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CreatorMediaCache_platform_connectionId_platformMediaId_key"
ON "CreatorMediaCache"("platform", "connectionId", "platformMediaId");

CREATE INDEX "CreatorMediaCache_platform_connectionId_fetchedAt_idx"
ON "CreatorMediaCache"("platform", "connectionId", "fetchedAt");

CREATE INDEX "CreatorMediaCache_connectionId_publishedAt_idx"
ON "CreatorMediaCache"("connectionId", "publishedAt");

CREATE UNIQUE INDEX "CreatorMediaCacheState_platform_connectionId_key"
ON "CreatorMediaCacheState"("platform", "connectionId");

CREATE INDEX "CreatorMediaCacheState_platform_connectionId_refreshedAt_idx"
ON "CreatorMediaCacheState"("platform", "connectionId", "refreshedAt");

ALTER TABLE "CreatorMediaCache" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CreatorMediaCacheState" ENABLE ROW LEVEL SECURITY;
