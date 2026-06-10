-- Backfill the known historical pause for Bram's Fruit. These inserts are
-- intentionally idempotent so deploy retries cannot duplicate the events.
INSERT INTO "CampaignEvent" (
    "id",
    "campaignId",
    "type",
    "occurredAt",
    "createdByUserId",
    "transitionKey",
    "createdAt"
)
SELECT
    'brams-fruit-pause-2026-05-24',
    "id",
    'PAUSED'::"CampaignEventType",
    TIMESTAMP '2026-05-24 00:00:00',
    NULL,
    "id" || ':historical:PAUSED:2026-05-24T00:00:00.000Z',
    CURRENT_TIMESTAMP
FROM "Campaign"
WHERE "id" = 'cmpfa9nji000004jlhklensom'
  AND "name" = 'Bram''s Fruit Clipping'
ON CONFLICT DO NOTHING;

INSERT INTO "CampaignEvent" (
    "id",
    "campaignId",
    "type",
    "occurredAt",
    "createdByUserId",
    "transitionKey",
    "createdAt"
)
SELECT
    'brams-fruit-resume-2026-06-06',
    "id",
    'RESUMED'::"CampaignEventType",
    TIMESTAMP '2026-06-06 00:00:00',
    NULL,
    "id" || ':historical:RESUMED:2026-06-06T00:00:00.000Z',
    CURRENT_TIMESTAMP
FROM "Campaign"
WHERE "id" = 'cmpfa9nji000004jlhklensom'
  AND "name" = 'Bram''s Fruit Clipping'
ON CONFLICT DO NOTHING;
