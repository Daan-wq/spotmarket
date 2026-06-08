CREATE TYPE "ConnectionHealthIssueType" AS ENUM (
  'MISSING_TOKEN',
  'TOKEN_EXPIRED',
  'TOKEN_REVOKED',
  'AUTH_INVALID'
);

CREATE TYPE "ConnectionHealthResolutionReason" AS ENUM (
  'REFRESH_SUCCEEDED',
  'RECONNECTED',
  'UNLINKED'
);

CREATE TABLE "ConnectionHealthIncident" (
  "id" TEXT NOT NULL,
  "creatorProfileId" TEXT NOT NULL,
  "connectionType" "ConnectionType" NOT NULL,
  "connectionId" TEXT NOT NULL,
  "connectionLabel" TEXT NOT NULL,
  "issueType" "ConnectionHealthIssueType" NOT NULL,
  "providerCode" TEXT,
  "providerSubcode" TEXT,
  "providerType" TEXT,
  "providerMessage" TEXT,
  "activeKey" TEXT,
  "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastDetectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  "resolutionReason" "ConnectionHealthResolutionReason",

  CONSTRAINT "ConnectionHealthIncident_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConnectionHealthDismissal" (
  "id" TEXT NOT NULL,
  "incidentId" TEXT NOT NULL,
  "viewerId" TEXT NOT NULL,
  "dismissedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ConnectionHealthDismissal_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ConnectionHealthIncident_activeKey_key"
  ON "ConnectionHealthIncident"("activeKey");
CREATE INDEX "ConnectionHealthIncident_creatorProfileId_resolvedAt_idx"
  ON "ConnectionHealthIncident"("creatorProfileId", "resolvedAt");
CREATE INDEX "ConnectionHealthIncident_connectionType_connectionId_idx"
  ON "ConnectionHealthIncident"("connectionType", "connectionId");
CREATE INDEX "ConnectionHealthIncident_resolvedAt_lastDetectedAt_idx"
  ON "ConnectionHealthIncident"("resolvedAt", "lastDetectedAt");
CREATE UNIQUE INDEX "ConnectionHealthDismissal_incidentId_viewerId_key"
  ON "ConnectionHealthDismissal"("incidentId", "viewerId");
CREATE INDEX "ConnectionHealthDismissal_viewerId_dismissedAt_idx"
  ON "ConnectionHealthDismissal"("viewerId", "dismissedAt");

ALTER TABLE "ConnectionHealthIncident"
  ADD CONSTRAINT "ConnectionHealthIncident_creatorProfileId_fkey"
  FOREIGN KEY ("creatorProfileId") REFERENCES "CreatorProfile"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConnectionHealthDismissal"
  ADD CONSTRAINT "ConnectionHealthDismissal_incidentId_fkey"
  FOREIGN KEY ("incidentId") REFERENCES "ConnectionHealthIncident"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConnectionHealthDismissal"
  ADD CONSTRAINT "ConnectionHealthDismissal_viewerId_fkey"
  FOREIGN KEY ("viewerId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

WITH broken_connections AS (
  SELECT
    "id" AS connection_id,
    "creatorProfileId" AS creator_profile_id,
    'IG'::"ConnectionType" AS connection_type,
    '@' || regexp_replace("igUsername", '^@', '') AS connection_label,
    "lastRefreshErrorCode" AS error_code,
    "lastRefreshErrorMessage" AS error_message,
    COALESCE("lastRefreshFailedAt", CURRENT_TIMESTAMP) AS detected_at
  FROM "CreatorIgConnection"
  WHERE "accountRefreshStatus" = 'FAILED'
  UNION ALL
  SELECT
    "id",
    "creatorProfileId",
    'FB'::"ConnectionType",
    "pageName",
    "lastRefreshErrorCode",
    "lastRefreshErrorMessage",
    COALESCE("lastRefreshFailedAt", CURRENT_TIMESTAMP)
  FROM "CreatorFbConnection"
  WHERE "accountRefreshStatus" = 'FAILED'
  UNION ALL
  SELECT
    "id",
    "creatorProfileId",
    'YT'::"ConnectionType",
    "channelName",
    "lastRefreshErrorCode",
    "lastRefreshErrorMessage",
    COALESCE("lastRefreshFailedAt", CURRENT_TIMESTAMP)
  FROM "CreatorYtConnection"
  WHERE "accountRefreshStatus" = 'FAILED'
  UNION ALL
  SELECT
    "id",
    "creatorProfileId",
    'TT'::"ConnectionType",
    '@' || regexp_replace("username", '^@', ''),
    "lastRefreshErrorCode",
    "lastRefreshErrorMessage",
    COALESCE("lastRefreshFailedAt", CURRENT_TIMESTAMP)
  FROM "CreatorTikTokConnection"
  WHERE "accountRefreshStatus" = 'FAILED'
),
confirmed_auth_failures AS (
  SELECT *
  FROM broken_connections
  WHERE error_code IN (
      'MISSING_ACCOUNT_CREDENTIALS',
      'NO_TOKEN',
      'TOKEN_EXPIRED',
      'TOKEN_BROKEN'
    )
    OR COALESCE(error_message, '') ~* (
      'invalid_grant|access_token_invalid|access_token_expired|' ||
      'session (has been )?invalidated|not a confirmed user|' ||
      'OAuthException|Error validating access token|token (has )?expired|' ||
      'invalid token|refresh token is missing|missing [^ ]* ?token'
    )
)
INSERT INTO "ConnectionHealthIncident" (
  "id",
  "creatorProfileId",
  "connectionType",
  "connectionId",
  "connectionLabel",
  "issueType",
  "providerCode",
  "providerType",
  "providerMessage",
  "activeKey",
  "openedAt",
  "lastDetectedAt"
)
SELECT
  'chi_' || md5(
    connection_type::text || ':' || connection_id || ':' || detected_at::text
  ),
  creator_profile_id,
  connection_type,
  connection_id,
  connection_label,
  CASE
    WHEN error_code IN ('MISSING_ACCOUNT_CREDENTIALS', 'NO_TOKEN')
      OR COALESCE(error_message, '') ~* 'missing [^ ]* ?token|refresh token is missing'
      THEN 'MISSING_TOKEN'::"ConnectionHealthIssueType"
    WHEN error_code = 'TOKEN_EXPIRED'
      OR COALESCE(error_message, '') ~* 'access_token_expired|token (has )?expired'
      THEN 'TOKEN_EXPIRED'::"ConnectionHealthIssueType"
    WHEN COALESCE(error_message, '') ~* 'invalid_grant|session (has been )?invalidated|revoked'
      THEN 'TOKEN_REVOKED'::"ConnectionHealthIssueType"
    ELSE 'AUTH_INVALID'::"ConnectionHealthIssueType"
  END,
  CASE
    WHEN COALESCE(error_message, '') ~* 'OAuthException|Error validating access token'
      THEN '190'
    ELSE NULL
  END,
  CASE
    WHEN COALESCE(error_message, '') ~* 'OAuthException'
      THEN 'OAuthException'
    ELSE NULL
  END,
  error_message,
  connection_type::text || ':' || connection_id,
  detected_at,
  detected_at
FROM confirmed_auth_failures
ON CONFLICT ("activeKey") DO NOTHING;
