# Creator Profile Rebuild — Design Document
**Date:** 2026-03-22
**Status:** Approved

---

## Overview

Rebuild the creator profile page to surface the full range of Instagram Graph API data: audience demographics, account insights, and recent posts. Serve this data from two views — `/profile` (creator's editable view) and `/admin/creators/[id]` (admin read-only review with campaign match scoring) — using shared components.

---

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Data storage | Expanded `SocialAccount` + computed `CreatorProfile` fields | Platform-specific raw data stays scoped to the account; computed fields enable fast campaign-matching queries |
| Refresh UX | Server components + client `RefreshButton` + `router.refresh()` | Idiomatic Next.js 15 App Router; no full page reload, no SWR dependency |
| Admin view | Separate page with shared components | Clean separation; admin gets campaign match card, creator gets edit form |
| `audienceGeo` field | Retained (no destructive migration), but superseded by `igDemographics` | Safe migration; stop writing to old field |

---

## Section 1: Prisma Schema Changes

### SocialAccount — new fields

```prisma
// Expanded Instagram profile fields (fetched on connect + weekly refresh)
igName            String?
igBio             String?
igProfilePicUrl   String?
igFollowsCount    Int?
igWebsite         String?

// igDemographics structure:
// {
//   countries: { "US": 174, "NL": 12, "DE": 8 },
//   genders: { "male": 131, "female": 72, "unknown": 15 },
//   ages: { "13-17": 22, "18-24": 65, "25-34": 78, "35-44": 33, "45-54": 12, "55-64": 5, "65+": 3 },
//   cities: { "New York": 45, "Los Angeles": 32 }
// }
igDemographics    Json?

// igMediaCache structure:
// [
//   { id, caption, media_type, media_product_type, permalink, timestamp, like_count, comments_count, thumbnail_url },
//   ...
// ]
igMediaCache      Json?

// 30-day account insights
ig30DayReach         Int?
ig30DayViews         Int?
ig30DayEngaged       Int?
ig30DayInteractions  Int?

// Refresh tracking
igDemographicsUpdatedAt  DateTime?
igInsightsUpdatedAt      DateTime?
```

### CreatorProfile — new computed fields

Recalculated on every sync from the creator's best/primary social account. Used by campaign matching queries.

```prisma
topCountry         String?   // e.g. "US"
topCountryPercent  Float?    // e.g. 79.8
malePercent        Float?    // e.g. 60.1
age18PlusPercent   Float?    // e.g. 89.9
bestEngagementRate Float?    // sourced from best connected social account
```

**Indexes to add:** `@@index([topCountry])`, `@@index([malePercent])`, `@@index([age18PlusPercent])` on `CreatorProfile`.

---

## Section 2: Instagram API Layer (`src/lib/instagram.ts`)

Update `GRAPH_BASE` to `v25.0`. Add four new async functions:

### `fetchInstagramProfile(accessToken, igUserId)`
`GET /v25.0/{igUserId}?fields=id,username,name,biography,followers_count,follows_count,media_count,profile_picture_url,website`

### `fetchFollowerDemographics(accessToken, igUserId)`
Three serial calls to `/v25.0/{igUserId}/insights` with `metric=follower_demographics`, `period=lifetime`, `timeframe=this_month`, `metric_type=total_value`, and `breakdown=country|gender|age` respectively. Returns combined `{ countries, genders, ages }` object. Skip entirely if `followerCount < 100`.

### `fetchAccountInsights(accessToken, igUserId)`
`GET /v25.0/{igUserId}/insights?metric=reach,views,accounts_engaged,total_interactions&period=day&metric_type=total_value&since={30d_ago_unix}&until={now_unix}`

### `fetchRecentMedia(accessToken, igUserId)`
`GET /v25.0/{igUserId}/media?fields=id,caption,media_type,media_product_type,permalink,timestamp,like_count,comments_count,thumbnail_url&limit=12`
Also recalculates `engagementRate = avg(likes + comments per post) / followers * 100`.

---

## Section 3: Sync API Route

### `POST /api/instagram/sync-profile`

Auth: creator (own profile) or admin. Body: `{ creatorId: string }`.

Sequence:
1. Fetch `SocialAccount` + decrypt token
2. `fetchInstagramProfile()` → update `igName`, `igBio`, `igProfilePicUrl`, `igFollowsCount`, `igWebsite`
3. `fetchFollowerDemographics()` if `followerCount >= 100` → update `igDemographics`, `igDemographicsUpdatedAt`
4. `fetchAccountInsights()` → update `ig30DayReach/Views/Engaged/Interactions`, `igInsightsUpdatedAt`
5. `fetchRecentMedia()` → update `igMediaCache`, recalculate `engagementRate`
6. Recalculate computed fields → update `CreatorProfile.topCountry/Percent`, `malePercent`, `age18PlusPercent`, `bestEngagementRate`

The existing `POST /api/creators/[creatorId]/sync` continues to exist but delegates to this logic (or is replaced entirely — implementation decides).

---

## Section 4: Shared Components

All in `src/components/creator/`. Server components unless noted.

### `ProfileStatsRow`
Props: `{ followerCount, engagementRate, topGeo, reach30d, views30d }`.
Renders 5 stat cards in a row (2-per-row on mobile). Purple accent `#534AB7`.

### `AudienceDemographics`
Props: `{ demographics: IgDemographics | null, followerCount: number }`.
Three cards side-by-side (stack on mobile):
- **Countries** — horizontal bars, top 5, flag emoji + code + % label
- **Gender** — two-segment bar (blue/pink/gray)
- **Age** — vertical bars with "X% are 18+" callout

If `demographics` is null or `followerCount < 100`: renders a prompt card instead.
If data is older than 14 days: shows subtle "may be outdated" warning.

### `RecentPostsGrid`
Props: `{ mediaCache: IgMediaItem[] | null }`.
4-column grid (2-col on mobile), each cell: thumbnail, likes + comments overlay. Click opens `permalink` in new tab. If null: empty state.

### `RefreshButton` *(client component)*
Props: `{ creatorId: string }`.
Calls `POST /api/instagram/sync-profile`, shows spinner, calls `router.refresh()` on success. Shows error toast on failure.

### `CampaignMatchCard` *(admin-only, server component)*
Props: `{ profile: CreatorProfile, campaign: Campaign | null }`.
Renders pass/fail rows comparing `topCountryPercent`, `age18PlusPercent`, `malePercent`, `totalFollowers`, `engagementRate` against campaign target thresholds. Shows "X/5 requirements met" score.

---

## Section 5: Pages

### `/profile` (creator view) — `src/app/(app)/profile/page.tsx`
Layout (top to bottom):
1. **Header card** — avatar (`igProfilePicUrl` or `avatarUrl`), `@username`, display name, bio, Reconnect link, `RefreshButton`, last-synced timestamp
2. **`ProfileStatsRow`**
3. **`AudienceDemographics`**
4. **`RecentPostsGrid`**
5. **Connected Accounts** (existing section, cleaned up)
6. **`ProfileForm`** (existing editable fields)

### `/admin/creators/[id]` (admin view) — `src/app/(admin)/admin/creators/[id]/page.tsx`
Layout (top to bottom):
1. **Header card** — same as above but read-only, no `ProfileForm`
2. **`ProfileStatsRow`**
3. **`CampaignMatchCard`** — rendered if `?campaignId=` query param is present
4. **`AudienceDemographics`**
5. **`RecentPostsGrid`**
6. **Admin actions** — Approve/Reject application buttons (if `?applicationId=` present)

---

## Section 6: Weekly Cron

**`src/app/api/cron/refresh-demographics/route.ts`**
Schedule: Sunday 02:00 (add to `vercel.json`).
Auth: `Authorization: Bearer {CRON_SECRET}`.

Process all active Instagram `SocialAccount` records. For each: check token validity, run the same sync sequence as `sync-profile`. Rate limit: batch of 40 accounts per run (5 API calls × 40 = 200 calls/hour limit). Log `{ updated, failed, errors[] }`.

---

## Files Touched

| File | Action |
|---|---|
| `prisma/schema.prisma` | Update — add fields to `SocialAccount` and `CreatorProfile` |
| `src/lib/instagram.ts` | Update — add 4 new fetch functions, bump to v25.0 |
| `src/app/api/instagram/sync-profile/route.ts` | Create |
| `src/components/creator/ProfileStatsRow.tsx` | Create |
| `src/components/creator/AudienceDemographics.tsx` | Create |
| `src/components/creator/RecentPostsGrid.tsx` | Create |
| `src/components/creator/RefreshButton.tsx` | Create |
| `src/components/creator/CampaignMatchCard.tsx` | Create |
| `src/app/(app)/profile/page.tsx` | Update — rebuild using shared components |
| `src/app/(admin)/admin/creators/[id]/page.tsx` | Create |
| `src/app/api/cron/refresh-demographics/route.ts` | Create |
| `vercel.json` | Update — add cron schedule |
