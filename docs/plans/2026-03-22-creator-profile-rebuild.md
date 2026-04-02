# Creator Profile Rebuild Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild creator profile pages to surface full Instagram Graph API data (demographics, insights, recent posts) via shared components used by `/profile` (creator view) and `/admin/creators/[id]` (admin review view with campaign match scoring).

**Architecture:** All expanded Instagram data stored on `SocialAccount`; five computed fields on `CreatorProfile` for fast campaign-matching queries. Pages are Server Components reading from Prisma; only `RefreshButton` is a client component. A unified `POST /api/instagram/sync-profile` handles all fetching, called on demand and by weekly cron.

**Tech Stack:** Next.js 15 App Router, Prisma ORM, PostgreSQL, Tailwind CSS, Instagram Graph API v25.0, Supabase auth

---

### Task 1: Schema migration

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Add fields to SocialAccount**

Find the `SocialAccount` model. After the `lastSyncedAt DateTime?` line, add:

```prisma
  // Expanded Instagram profile fields
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
  // [{ id, caption, media_type, media_product_type, permalink, timestamp, like_count, comments_count, thumbnail_url }]
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

**Step 2: Add computed fields to CreatorProfile**

Find the `CreatorProfile` model. After `isVerified Boolean @default(false)`, add:

```prisma
  // Computed from best connected social account — used for campaign matching queries
  topCountry         String?
  topCountryPercent  Float?
  malePercent        Float?
  age18PlusPercent   Float?
  bestEngagementRate Float?
```

Also add to the `CreatorProfile` indexes block:
```prisma
  @@index([topCountry])
  @@index([malePercent])
  @@index([age18PlusPercent])
```

**Step 3: Run migration**

```bash
cd spotmarket
npx prisma migrate dev --name expand_instagram_data
npx prisma generate
```

Expected: migration applied, Prisma client regenerated, no errors.

**Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: expand SocialAccount and CreatorProfile schema for Instagram data"
```

---

### Task 2: TypeScript types

**Files:**
- Create: `src/types/instagram.ts`

**Step 1: Create file**

```typescript
export interface IgDemographics {
  countries: Record<string, number>;
  genders: { male?: number; female?: number; unknown?: number };
  ages: {
    "13-17"?: number;
    "18-24"?: number;
    "25-34"?: number;
    "35-44"?: number;
    "45-54"?: number;
    "55-64"?: number;
    "65+"?: number;
  };
  cities?: Record<string, number>;
}

export interface IgMediaItem {
  id: string;
  caption: string | null;
  media_type: string;
  media_product_type: string;
  permalink: string;
  timestamp: string;
  like_count: number;
  comments_count: number;
  thumbnail_url: string | null;
}

export interface ComputedCreatorStats {
  topCountry: string | null;
  topCountryPercent: number | null;
  malePercent: number | null;
  age18PlusPercent: number | null;
}
```

**Step 2: Commit**

```bash
git add src/types/instagram.ts
git commit -m "feat: add TypeScript types for Instagram data structures"
```

---

### Task 3: Expand instagram.ts

**Files:**
- Modify: `src/lib/instagram.ts`

**Step 1: Update GRAPH_BASE to v25.0**

Change line 6 from `v21.0` to `v25.0`.

**Step 2: Add `instagram_business_manage_insights` to OAuth scope**

In `getInstagramAuthUrl`, change:
```typescript
scope: "instagram_business_basic",
```
to:
```typescript
scope: "instagram_business_basic,instagram_business_manage_insights",
```

**Step 3: Add fetchInstagramProfile**

Append after the existing `getInstagramProfile` function:

```typescript
export interface ExpandedInstagramProfile {
  id: string;
  username: string;
  name: string;
  biography: string;
  followersCount: number;
  followsCount: number;
  mediaCount: number;
  profilePictureUrl: string;
  website: string;
}

export async function fetchInstagramProfile(
  accessToken: string,
  igUserId: string
): Promise<ExpandedInstagramProfile> {
  const fields =
    "id,username,name,biography,followers_count,follows_count,media_count,profile_picture_url,website";
  const res = await fetch(
    `${GRAPH_BASE}/${igUserId}?fields=${fields}&access_token=${accessToken}`
  );
  if (!res.ok) throw new Error(`fetchInstagramProfile failed: ${await res.text()}`);
  const d = await res.json();
  return {
    id: d.id,
    username: d.username ?? "",
    name: d.name ?? "",
    biography: d.biography ?? "",
    followersCount: d.followers_count ?? 0,
    followsCount: d.follows_count ?? 0,
    mediaCount: d.media_count ?? 0,
    profilePictureUrl: d.profile_picture_url ?? "",
    website: d.website ?? "",
  };
}
```

**Step 4: Add fetchFollowerDemographics**

```typescript
import type { IgDemographics } from "@/types/instagram";

export async function fetchFollowerDemographics(
  accessToken: string,
  igUserId: string
): Promise<IgDemographics> {
  const base = `${GRAPH_BASE}/${igUserId}/insights`;

  const fetchBreakdown = async (breakdown: string): Promise<Record<string, number>> => {
    const params = new URLSearchParams({
      metric: "follower_demographics",
      period: "lifetime",
      timeframe: "this_month",
      metric_type: "total_value",
      breakdown,
      access_token: accessToken,
    });
    const res = await fetch(`${base}?${params}`);
    if (!res.ok) {
      console.warn(`Demographics ${breakdown} failed: ${await res.text()}`);
      return {};
    }
    const data = await res.json();
    const rows: Record<string, number> = {};
    for (const item of data?.data?.[0]?.total_value?.breakdowns?.[0]?.results ?? []) {
      const key = item.dimension_values?.[0];
      if (key) rows[key] = item.value ?? 0;
    }
    return rows;
  };

  const [countries, gendersRaw, agesRaw] = await Promise.all([
    fetchBreakdown("country"),
    fetchBreakdown("gender"),
    fetchBreakdown("age"),
  ]);

  return {
    countries,
    genders: {
      male: gendersRaw["M"] ?? gendersRaw["male"] ?? 0,
      female: gendersRaw["F"] ?? gendersRaw["female"] ?? 0,
      unknown: gendersRaw["U"] ?? gendersRaw["unknown"] ?? 0,
    },
    ages: {
      "13-17": agesRaw["13-17"] ?? 0,
      "18-24": agesRaw["18-24"] ?? 0,
      "25-34": agesRaw["25-34"] ?? 0,
      "35-44": agesRaw["35-44"] ?? 0,
      "45-54": agesRaw["45-54"] ?? 0,
      "55-64": agesRaw["55-64"] ?? 0,
      "65+": agesRaw["65+"] ?? 0,
    },
  };
}
```

**Step 5: Add fetchAccountInsights**

```typescript
export interface AccountInsights {
  reach: number;
  views: number;
  accountsEngaged: number;
  totalInteractions: number;
}

export async function fetchAccountInsights(
  accessToken: string,
  igUserId: string
): Promise<AccountInsights> {
  const since = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);
  const until = Math.floor(Date.now() / 1000);
  const params = new URLSearchParams({
    metric: "reach,views,accounts_engaged,total_interactions",
    period: "day",
    metric_type: "total_value",
    since: String(since),
    until: String(until),
    access_token: accessToken,
  });
  const res = await fetch(`${GRAPH_BASE}/${igUserId}/insights?${params}`);
  if (!res.ok) throw new Error(`fetchAccountInsights failed: ${await res.text()}`);
  const data = await res.json();
  const getValue = (name: string) =>
    (data.data ?? []).find((d: any) => d.name === name)?.total_value?.value ?? 0;
  return {
    reach: getValue("reach"),
    views: getValue("views"),
    accountsEngaged: getValue("accounts_engaged"),
    totalInteractions: getValue("total_interactions"),
  };
}
```

**Step 6: Add fetchRecentMedia**

```typescript
import type { IgMediaItem } from "@/types/instagram";

export async function fetchRecentMedia(
  accessToken: string,
  igUserId: string,
  limit = 12
): Promise<IgMediaItem[]> {
  const params = new URLSearchParams({
    fields:
      "id,caption,media_type,media_product_type,permalink,timestamp,like_count,comments_count,thumbnail_url",
    limit: String(limit),
    access_token: accessToken,
  });
  const res = await fetch(`${GRAPH_BASE}/${igUserId}/media?${params}`);
  if (!res.ok) {
    console.warn(`fetchRecentMedia failed (non-fatal): ${await res.text()}`);
    return [];
  }
  const data = await res.json();
  return (data.data ?? []).map((item: any): IgMediaItem => ({
    id: item.id,
    caption: item.caption ?? null,
    media_type: item.media_type ?? "",
    media_product_type: item.media_product_type ?? "",
    permalink: item.permalink ?? "",
    timestamp: item.timestamp ?? "",
    like_count: item.like_count ?? 0,
    comments_count: item.comments_count ?? 0,
    thumbnail_url: item.thumbnail_url ?? null,
  }));
}
```

**Step 7: Add computeDemographicStats helper**

```typescript
import type { ComputedCreatorStats, IgDemographics } from "@/types/instagram";

export function computeDemographicStats(
  demographics: IgDemographics | null
): ComputedCreatorStats {
  if (!demographics) {
    return { topCountry: null, topCountryPercent: null, malePercent: null, age18PlusPercent: null };
  }
  const countries = demographics.countries ?? {};
  const totalCountry = Object.values(countries).reduce((s, v) => s + v, 0);
  const topEntry = Object.entries(countries).sort(([, a], [, b]) => b - a)[0];
  const topCountry = topEntry?.[0] ?? null;
  const topCountryPercent =
    topEntry && totalCountry > 0
      ? parseFloat(((topEntry[1] / totalCountry) * 100).toFixed(1))
      : null;

  const { male = 0, female = 0, unknown = 0 } = demographics.genders ?? {};
  const totalGender = male + female + unknown;
  const malePercent =
    totalGender > 0 ? parseFloat(((male / totalGender) * 100).toFixed(1)) : null;

  const ages = demographics.ages ?? {};
  const total18Plus =
    (ages["18-24"] ?? 0) + (ages["25-34"] ?? 0) + (ages["35-44"] ?? 0) +
    (ages["45-54"] ?? 0) + (ages["55-64"] ?? 0) + (ages["65+"] ?? 0);
  const totalAge = total18Plus + (ages["13-17"] ?? 0);
  const age18PlusPercent =
    totalAge > 0 ? parseFloat(((total18Plus / totalAge) * 100).toFixed(1)) : null;

  return { topCountry, topCountryPercent, malePercent, age18PlusPercent };
}
```

**Step 8: Commit**

```bash
git add src/lib/instagram.ts src/types/instagram.ts
git commit -m "feat: add expanded Instagram API functions and computeDemographicStats"
```

---

### Task 4: POST /api/instagram/sync-profile

**Files:**
- Create: `src/app/api/instagram/sync-profile/route.ts`

**Step 1: Create file**

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  fetchInstagramProfile,
  fetchFollowerDemographics,
  fetchAccountInsights,
  fetchRecentMedia,
  computeEngagementRate,
  computeDemographicStats,
} from "@/lib/instagram";
import type { IgDemographics } from "@/types/instagram";

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { creatorId } = body as { creatorId?: string };
  if (!creatorId) return NextResponse.json({ error: "creatorId required" }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    include: { creatorProfile: { select: { id: true } } },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const isAdmin = user.role === "admin";
  const isOwner = user.creatorProfile?.id === creatorId;
  if (!isAdmin && !isOwner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const account = await prisma.socialAccount.findFirst({
    where: { creatorProfileId: creatorId, platform: "instagram", isActive: true },
  });
  if (!account) return NextResponse.json({ error: "No active Instagram account" }, { status: 404 });

  const accessToken = decrypt(account.accessToken, account.accessTokenIv);
  const igUserId = account.platformUserId;

  try {
    const profile = await fetchInstagramProfile(accessToken, igUserId);
    const media = await fetchRecentMedia(accessToken, igUserId);
    const engagementRate = computeEngagementRate(
      media.map((m) => ({
        mediaId: m.id,
        likeCount: m.like_count,
        commentCount: m.comments_count,
        impressions: 0,
        reach: 0,
        videoViews: 0,
      })),
      profile.followersCount
    );

    let demographics: IgDemographics | null = null;
    if (profile.followersCount >= 100) {
      try {
        demographics = await fetchFollowerDemographics(accessToken, igUserId);
      } catch (err) {
        console.warn("Demographics fetch failed (non-fatal):", err);
      }
    }

    let insights = null;
    try {
      insights = await fetchAccountInsights(accessToken, igUserId);
    } catch (err) {
      console.warn("Insights fetch failed (non-fatal):", err);
    }

    const now = new Date();

    await prisma.socialAccount.update({
      where: { id: account.id },
      data: {
        igName: profile.name,
        igBio: profile.biography,
        igProfilePicUrl: profile.profilePictureUrl,
        igFollowsCount: profile.followsCount,
        igWebsite: profile.website,
        followerCount: profile.followersCount,
        engagementRate,
        igMediaCache: media.length > 0 ? (media as any) : undefined,
        ...(demographics && {
          igDemographics: demographics as any,
          igDemographicsUpdatedAt: now,
        }),
        ...(insights && {
          ig30DayReach: insights.reach,
          ig30DayViews: insights.views,
          ig30DayEngaged: insights.accountsEngaged,
          ig30DayInteractions: insights.totalInteractions,
          igInsightsUpdatedAt: now,
        }),
        lastSyncedAt: now,
      },
    });

    const computed = computeDemographicStats(demographics);
    await prisma.creatorProfile.update({
      where: { id: creatorId },
      data: {
        totalFollowers: profile.followersCount,
        engagementRate,
        avatarUrl: profile.profilePictureUrl || undefined,
        bestEngagementRate: engagementRate,
        ...(computed.topCountry && { topCountry: computed.topCountry }),
        ...(computed.topCountryPercent !== null && { topCountryPercent: computed.topCountryPercent }),
        ...(computed.malePercent !== null && { malePercent: computed.malePercent }),
        ...(computed.age18PlusPercent !== null && { age18PlusPercent: computed.age18PlusPercent }),
      },
    });

    return NextResponse.json({ success: true, syncedAt: now.toISOString() });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[sync-profile]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
```

**Step 2: Commit**

```bash
git add src/app/api/instagram/sync-profile/route.ts
git commit -m "feat: add POST /api/instagram/sync-profile unified sync endpoint"
```

---

### Task 5: ProfileStatsRow component

**Files:**
- Create: `src/components/creator/ProfileStatsRow.tsx`

**Step 1: Create file**

```tsx
interface Props {
  followerCount: number;
  engagementRate: number | string;
  topGeo: string | null;
  reach30d: number | null;
  views30d: number | null;
}

function fmt(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString();
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="bg-gray-50 rounded-lg px-4 py-3.5">
      <p className="text-[22px] font-semibold text-gray-900 leading-tight">{value}</p>
      <p className="text-[12px] text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

export function ProfileStatsRow({ followerCount, engagementRate, topGeo, reach30d, views30d }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      <StatCard value={fmt(followerCount)} label="Followers" />
      <StatCard value={`${engagementRate}%`} label="Engagement" />
      <StatCard value={topGeo ?? "—"} label="Top Geo" />
      <StatCard value={fmt(reach30d)} label="Reach (30d)" />
      <StatCard value={fmt(views30d)} label="Views (30d)" />
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/creator/ProfileStatsRow.tsx
git commit -m "feat: add ProfileStatsRow component"
```

---

### Task 6: AudienceDemographics component

**Files:**
- Create: `src/components/creator/AudienceDemographics.tsx`

**Step 1: Create file**

```tsx
import type { IgDemographics } from "@/types/instagram";

const FLAGS: Record<string, string> = {
  US: "🇺🇸", NL: "🇳🇱", DE: "🇩🇪", GB: "🇬🇧", FR: "🇫🇷",
  CA: "🇨🇦", AU: "🇦🇺", BR: "🇧🇷", IN: "🇮🇳", MX: "🇲🇽",
  ES: "🇪🇸", IT: "🇮🇹", JP: "🇯🇵", KR: "🇰🇷", NG: "🇳🇬",
  ZA: "🇿🇦", PH: "🇵🇭", ID: "🇮🇩", TR: "🇹🇷", AR: "🇦🇷",
};

interface Props {
  demographics: IgDemographics | null;
  followerCount: number;
  updatedAt?: Date | null;
}

export function AudienceDemographics({ demographics, followerCount, updatedAt }: Props) {
  const daysOld = updatedAt
    ? Math.floor((Date.now() - new Date(updatedAt).getTime()) / 86_400_000)
    : null;

  if (followerCount < 100 || !demographics) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 px-5 py-6 text-center">
        <p className="text-sm text-gray-400">
          {followerCount < 100
            ? "Connect an account with 100+ followers to see audience demographics"
            : "Demographics not yet loaded — click Refresh to fetch"}
        </p>
      </div>
    );
  }

  // Countries
  const countryEntries = Object.entries(demographics.countries ?? {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);
  const totalCountry = countryEntries.reduce((s, [, v]) => s + v, 0);

  // Gender
  const { male = 0, female = 0, unknown = 0 } = demographics.genders ?? {};
  const totalG = male + female + unknown;
  const pct = (n: number) => (totalG > 0 ? ((n / totalG) * 100).toFixed(1) : "0");

  // Age
  const ages = demographics.ages ?? {};
  const ageRanges: [string, number][] = [
    ["13-17", ages["13-17"] ?? 0], ["18-24", ages["18-24"] ?? 0],
    ["25-34", ages["25-34"] ?? 0], ["35-44", ages["35-44"] ?? 0],
    ["45-54", ages["45-54"] ?? 0], ["55-64", ages["55-64"] ?? 0],
    ["65+", ages["65+"] ?? 0],
  ];
  const totalAge = ageRanges.reduce((s, [, v]) => s + v, 0);
  const total18Plus = ageRanges.slice(1).reduce((s, [, v]) => s + v, 0);
  const age18Pct = totalAge > 0 ? ((total18Plus / totalAge) * 100).toFixed(1) : "0";
  const maxAge = Math.max(...ageRanges.map(([, v]) => v), 1);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-700">Audience Demographics</h3>
        {daysOld !== null && daysOld > 14 ? (
          <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
            May be outdated — updated {daysOld}d ago
          </span>
        ) : daysOld !== null ? (
          <span className="text-xs text-gray-400">
            Updated {daysOld === 0 ? "today" : `${daysOld}d ago`}
          </span>
        ) : null}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Countries */}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wide">Country</p>
          <div className="space-y-2.5">
            {countryEntries.map(([code, count]) => {
              const p = totalCountry > 0 ? ((count / totalCountry) * 100).toFixed(1) : "0";
              return (
                <div key={code}>
                  <div className="flex justify-between mb-1">
                    <span className="text-[13px] text-gray-700">{FLAGS[code] ?? "🌐"} {code}</span>
                    <span className="text-[12px] text-gray-500">{p}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${p}%`, backgroundColor: "#534AB7" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Gender */}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wide">Gender</p>
          <div className="h-4 rounded-full overflow-hidden flex mb-3">
            <div className="h-full bg-blue-400" style={{ width: `${pct(male)}%` }} />
            <div className="h-full bg-pink-400" style={{ width: `${pct(female)}%` }} />
            <div className="h-full bg-gray-200" style={{ width: `${pct(unknown)}%` }} />
          </div>
          <div className="space-y-1.5">
            {([["bg-blue-400", "Male", male], ["bg-pink-400", "Female", female], ["bg-gray-200", "Other", unknown]] as const).map(
              ([color, label, val]) =>
                Number(pct(val)) > 0 ? (
                  <div key={label} className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${color} shrink-0`} />
                    <span className="text-[13px] text-gray-700 flex-1">{label}</span>
                    <span className="text-[12px] text-gray-500">{pct(val)}%</span>
                  </div>
                ) : null
            )}
          </div>
        </div>

        {/* Age */}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Age</p>
          <p className="text-[11px] text-gray-400 mb-3">{age18Pct}% are 18+</p>
          <div className="flex items-end gap-1 h-20">
            {ageRanges.map(([range, count]) => (
              <div key={range} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex items-end" style={{ height: 56 }}>
                  <div
                    className="w-full rounded-t"
                    style={{
                      height: `${(count / maxAge) * 100}%`,
                      backgroundColor: range === "13-17" ? "#e5e7eb" : "#534AB7",
                      opacity: 0.85,
                    }}
                  />
                </div>
                <span className="text-[9px] text-gray-400 text-center leading-tight">{range}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/creator/AudienceDemographics.tsx
git commit -m "feat: add AudienceDemographics component"
```

---

### Task 7: RecentPostsGrid component

**Files:**
- Create: `src/components/creator/RecentPostsGrid.tsx`

**Step 1: Create file**

```tsx
import type { IgMediaItem } from "@/types/instagram";

export function RecentPostsGrid({ mediaCache }: { mediaCache: IgMediaItem[] | null }) {
  if (!mediaCache || mediaCache.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 px-5 py-6 text-center">
        <p className="text-sm text-gray-400">No recent posts — click Refresh to fetch</p>
      </div>
    );
  }
  return (
    <div>
      <h3 className="text-sm font-medium text-gray-700 mb-3">Recent Posts</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {mediaCache.slice(0, 12).map((post) => (
          <a
            key={post.id}
            href={post.permalink}
            target="_blank"
            rel="noopener noreferrer"
            className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 group block"
          >
            {post.thumbnail_url ? (
              <img
                src={post.thumbnail_url}
                alt={post.caption?.slice(0, 40) ?? "Post"}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                {post.media_type}
              </div>
            )}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100">
              <span className="text-white text-xs">♥ {post.like_count.toLocaleString()}</span>
              <span className="text-white text-xs">💬 {post.comments_count.toLocaleString()}</span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/creator/RecentPostsGrid.tsx
git commit -m "feat: add RecentPostsGrid component"
```

---

### Task 8: RefreshButton client component

**Files:**
- Create: `src/components/creator/RefreshButton.tsx`

**Step 1: Create file**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RefreshButton({ creatorId }: { creatorId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRefresh() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/instagram/sync-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creatorId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as any).error ?? "Sync failed");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleRefresh}
        disabled={loading}
        className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
        style={{ background: "#f1f5f9", color: "#534AB7" }}
      >
        {loading ? (
          <span className="flex items-center gap-1.5">
            <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            Syncing…
          </span>
        ) : (
          "Refresh now"
        )}
      </button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/creator/RefreshButton.tsx
git commit -m "feat: add RefreshButton client component"
```

---

### Task 9: CampaignMatchCard component

**Files:**
- Create: `src/components/creator/CampaignMatchCard.tsx`

**Step 1: Create file**

```tsx
import type { CreatorProfile, Campaign } from "@prisma/client";

interface MatchRow {
  label: string;
  creatorValue: string;
  required: string;
  passes: boolean;
}

export function CampaignMatchCard({
  profile,
  campaign,
}: {
  profile: CreatorProfile;
  campaign: Campaign;
}) {
  const rows: MatchRow[] = [
    {
      label: "Country",
      creatorValue: `${profile.topCountryPercent?.toFixed(1) ?? "—"}% ${profile.topCountry ?? ""}`,
      required: `≥${campaign.targetCountryPercent ?? 0}% ${campaign.targetCountry ?? "any"}`,
      passes:
        !campaign.targetCountry ||
        (profile.topCountry === campaign.targetCountry &&
          (profile.topCountryPercent ?? 0) >= (campaign.targetCountryPercent ?? 0)),
    },
    {
      label: "Age 18+",
      creatorValue: `${profile.age18PlusPercent?.toFixed(1) ?? "—"}%`,
      required: `≥${campaign.targetMinAge18Percent ?? 0}%`,
      passes: (profile.age18PlusPercent ?? 0) >= (campaign.targetMinAge18Percent ?? 0),
    },
    {
      label: "Male",
      creatorValue: `${profile.malePercent?.toFixed(1) ?? "—"}%`,
      required: `≥${campaign.targetMalePercent ?? 0}%`,
      passes: (profile.malePercent ?? 0) >= (campaign.targetMalePercent ?? 0),
    },
    {
      label: "Followers",
      creatorValue: profile.totalFollowers.toLocaleString(),
      required: `≥${campaign.minFollowers.toLocaleString()}`,
      passes: profile.totalFollowers >= campaign.minFollowers,
    },
    {
      label: "Engagement",
      creatorValue: `${profile.engagementRate}%`,
      required: `≥${campaign.minEngagementRate}%`,
      passes: Number(profile.engagementRate) >= Number(campaign.minEngagementRate),
    },
  ];

  const passed = rows.filter((r) => r.passes).length;

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
        <p className="text-sm font-medium text-gray-900">Campaign Match: {campaign.name}</p>
        <span
          className="text-xs font-medium px-2 py-0.5 rounded-full"
          style={{
            background: passed === rows.length ? "#f0fdf4" : "#fef2f2",
            color: passed === rows.length ? "#16a34a" : "#dc2626",
          }}
        >
          {passed}/{rows.length} requirements met
        </span>
      </div>
      <div className="divide-y divide-gray-50">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center gap-3 px-5 py-2.5">
            <span className={`text-base ${row.passes ? "text-green-500" : "text-red-500"}`}>
              {row.passes ? "✓" : "✗"}
            </span>
            <span className="text-sm text-gray-700 w-24 shrink-0">{row.label}:</span>
            <span className="text-sm text-gray-900 flex-1">{row.creatorValue}</span>
            <span className="text-xs text-gray-400">required: {row.required}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/creator/CampaignMatchCard.tsx
git commit -m "feat: add CampaignMatchCard component"
```

---

### Task 10: Rebuild /profile page

**Files:**
- Modify: `src/app/(app)/profile/page.tsx`

**Step 1: Replace full file content**

```tsx
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ProfileForm } from "./profile-form";
import { ProfileStatsRow } from "@/components/creator/ProfileStatsRow";
import { AudienceDemographics } from "@/components/creator/AudienceDemographics";
import { RecentPostsGrid } from "@/components/creator/RecentPostsGrid";
import { RefreshButton } from "@/components/creator/RefreshButton";
import type { IgDemographics, IgMediaItem } from "@/types/instagram";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string; detail?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) redirect("/sign-in");

  const params = await searchParams;

  const user = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    include: { creatorProfile: { include: { socialAccounts: true } } },
  });

  const profile = user?.creatorProfile;
  const igAccount = profile?.socialAccounts.find((a) => a.platform === "instagram" && a.isActive);
  const tiktokAccount = profile?.socialAccounts.find((a) => a.platform === "tiktok" && a.isActive);
  const demographics = (igAccount?.igDemographics as IgDemographics | null) ?? null;
  const mediaCache = (igAccount?.igMediaCache as IgMediaItem[] | null) ?? null;

  return (
    <div className="p-8 max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Profile</h1>
        <p className="text-sm mt-1 text-gray-500">Manage your public profile and connected accounts.</p>
      </div>

      {params.success === "instagram_connected" && (
        <div className="px-4 py-3 rounded-lg border-l-[3px] border-green-500 bg-green-50">
          <p className="text-sm text-green-700">Instagram connected successfully. Your stats have been synced.</p>
        </div>
      )}
      {params.error && (
        <div className="px-4 py-3 rounded-lg border-l-[3px] border-red-500 bg-red-50">
          <p className="text-sm text-red-700">
            {params.error === "instagram_denied"
              ? "Instagram connection was cancelled."
              : "Failed to connect Instagram. Please try again."}
          </p>
          {params.detail && (
            <p className="text-xs mt-1 font-mono text-red-700 opacity-80">{params.detail}</p>
          )}
        </div>
      )}

      {igAccount && profile && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              {igAccount.igProfilePicUrl || profile.avatarUrl ? (
                <img
                  src={igAccount.igProfilePicUrl ?? profile.avatarUrl ?? ""}
                  alt={igAccount.platformUsername}
                  className="w-14 h-14 rounded-full object-cover shrink-0"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold text-lg shrink-0">
                  {igAccount.platformUsername?.[0]?.toUpperCase() ?? "?"}
                </div>
              )}
              <div>
                <p className="text-base font-semibold text-gray-900">@{igAccount.platformUsername}</p>
                {igAccount.igName && <p className="text-sm text-gray-600">{igAccount.igName}</p>}
                {igAccount.igBio && (
                  <p className="text-xs text-gray-400 mt-0.5 max-w-xs line-clamp-2">{igAccount.igBio}</p>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <a href="/api/auth/instagram" className="text-xs text-gray-400 hover:underline">
                Reconnect
              </a>
              <RefreshButton creatorId={profile.id} />
              {igAccount.lastSyncedAt && (
                <span className="text-[11px] text-gray-300">
                  Last synced {new Date(igAccount.lastSyncedAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {igAccount && profile && (
        <ProfileStatsRow
          followerCount={profile.totalFollowers}
          engagementRate={Number(profile.engagementRate).toFixed(2)}
          topGeo={profile.topCountry ?? profile.primaryGeo}
          reach30d={igAccount.ig30DayReach}
          views30d={igAccount.ig30DayViews}
        />
      )}

      {profile && (
        <AudienceDemographics
          demographics={demographics}
          followerCount={profile.totalFollowers}
          updatedAt={igAccount?.igDemographicsUpdatedAt}
        />
      )}

      <RecentPostsGrid mediaCache={mediaCache} />

      <div className="rounded-xl overflow-hidden border border-gray-200">
        <div className="px-5 py-3 border-b border-gray-100 bg-white">
          <p className="text-sm font-medium text-gray-900">Connected Accounts</p>
        </div>
        <div className="bg-white divide-y divide-gray-50">
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                style={{ background: "linear-gradient(135deg, #a855f7, #ec4899)" }}
              >
                IG
              </div>
              <div>
                {igAccount ? (
                  <>
                    <p className="text-sm font-medium text-gray-900">@{igAccount.platformUsername}</p>
                    <p className="text-xs mt-0.5 text-gray-400">
                      {igAccount.followerCount.toLocaleString()} followers · {igAccount.engagementRate.toString()}% engagement
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-gray-500">Instagram not connected</p>
                )}
              </div>
            </div>
            {igAccount ? (
              <a href="/api/auth/instagram" className="text-xs text-gray-400 hover:underline">Reconnect</a>
            ) : (
              <a
                href="/api/auth/instagram"
                className="text-xs font-medium px-3 py-1.5 rounded-lg text-white"
                style={{ background: "#534AB7" }}
              >
                Connect
              </a>
            )}
          </div>
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-black flex items-center justify-center text-white text-xs font-bold shrink-0">
                TT
              </div>
              <div>
                {tiktokAccount ? (
                  <p className="text-sm font-medium text-gray-900">@{tiktokAccount.platformUsername}</p>
                ) : (
                  <p className="text-sm text-gray-500">TikTok not connected</p>
                )}
              </div>
            </div>
            {!tiktokAccount && <span className="text-xs italic text-gray-400">Coming soon</span>}
          </div>
        </div>
      </div>

      {profile && (
        <ProfileForm
          profileId={profile.id}
          initialData={{
            displayName: profile.displayName,
            bio: profile.bio ?? "",
            walletAddress: profile.walletAddress ?? "",
            primaryGeo: profile.primaryGeo,
          }}
        />
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/app/(app)/profile/page.tsx
git commit -m "feat: rebuild /profile page with expanded Instagram data"
```

---

### Task 11: /admin/creators/[id] page

**Files:**
- Create: `src/app/(admin)/admin/creators/[id]/page.tsx`
- Modify: `src/app/(admin)/admin/creators/page.tsx` (make rows linkable)

**Step 1: Create admin detail page**

```tsx
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ProfileStatsRow } from "@/components/creator/ProfileStatsRow";
import { AudienceDemographics } from "@/components/creator/AudienceDemographics";
import { RecentPostsGrid } from "@/components/creator/RecentPostsGrid";
import { CampaignMatchCard } from "@/components/creator/CampaignMatchCard";
import { RefreshButton } from "@/components/creator/RefreshButton";
import type { IgDemographics, IgMediaItem } from "@/types/instagram";

export default async function AdminCreatorDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ campaignId?: string }>;
}) {
  const { id } = await params;
  const { campaignId } = await searchParams;

  const [creator, campaign] = await Promise.all([
    prisma.creatorProfile.findUnique({
      where: { id },
      include: {
        user: { select: { email: true } },
        socialAccounts: { where: { isActive: true } },
        _count: { select: { applications: true } },
      },
    }),
    campaignId ? prisma.campaign.findUnique({ where: { id: campaignId } }) : Promise.resolve(null),
  ]);

  if (!creator) notFound();

  const igAccount = creator.socialAccounts.find((a) => a.platform === "instagram");
  const demographics = (igAccount?.igDemographics as IgDemographics | null) ?? null;
  const mediaCache = (igAccount?.igMediaCache as IgMediaItem[] | null) ?? null;

  return (
    <div className="p-8 max-w-3xl space-y-6">
      <div className="flex items-center gap-2">
        <a href="/admin/creators" className="text-sm text-gray-400 hover:text-gray-600">
          ← Creators
        </a>
        {campaign && (
          <>
            <span className="text-gray-300">/</span>
            <span className="text-sm text-gray-400">{campaign.name}</span>
          </>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            {igAccount?.igProfilePicUrl || creator.avatarUrl ? (
              <img
                src={igAccount?.igProfilePicUrl ?? creator.avatarUrl ?? ""}
                alt={creator.displayName}
                className="w-14 h-14 rounded-full object-cover shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold text-lg shrink-0">
                {creator.displayName?.[0]?.toUpperCase() ?? "?"}
              </div>
            )}
            <div>
              <p className="text-base font-semibold text-gray-900">{creator.displayName}</p>
              {igAccount && <p className="text-sm text-gray-500">@{igAccount.platformUsername}</p>}
              <p className="text-xs text-gray-400">{creator.user.email}</p>
              {igAccount?.igBio && (
                <p className="text-xs text-gray-400 mt-1 max-w-xs line-clamp-2">{igAccount.igBio}</p>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <RefreshButton creatorId={creator.id} />
            {igAccount?.lastSyncedAt && (
              <span className="text-[11px] text-gray-300">
                Synced {new Date(igAccount.lastSyncedAt).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      </div>

      {igAccount && (
        <ProfileStatsRow
          followerCount={creator.totalFollowers}
          engagementRate={Number(creator.engagementRate).toFixed(2)}
          topGeo={creator.topCountry ?? creator.primaryGeo}
          reach30d={igAccount.ig30DayReach}
          views30d={igAccount.ig30DayViews}
        />
      )}

      {campaign && <CampaignMatchCard profile={creator} campaign={campaign} />}

      <AudienceDemographics
        demographics={demographics}
        followerCount={creator.totalFollowers}
        updatedAt={igAccount?.igDemographicsUpdatedAt}
      />

      <RecentPostsGrid mediaCache={mediaCache} />

      <div className="rounded-xl border border-gray-200 bg-white p-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-gray-400">Campaigns</p>
          <p className="font-medium text-gray-900">{creator._count.applications}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Verified</p>
          <p className="font-medium text-gray-900">{creator.isVerified ? "Yes" : "No"}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Primary Geo</p>
          <p className="font-medium text-gray-900">{creator.primaryGeo}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Joined</p>
          <p className="font-medium text-gray-900">{new Date(creator.createdAt).toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Make creator list rows link to detail page**

In `src/app/(admin)/admin/creators/page.tsx`, change the row `<div>` to a `<Link>`:

Replace:
```tsx
<div
  key={c.id}
  className="grid grid-cols-[1fr_1fr_auto_auto_auto_auto_auto] gap-4 items-center px-5 py-3 hover:bg-gray-50"
  style={{ borderTop: i > 0 ? "1px solid #f8fafc" : undefined }}
>
```
With (add `import Link from "next/link"` at top):
```tsx
<Link
  key={c.id}
  href={`/admin/creators/${c.id}`}
  className="grid grid-cols-[1fr_1fr_auto_auto_auto_auto_auto] gap-4 items-center px-5 py-3 hover:bg-gray-50"
  style={{ borderTop: i > 0 ? "1px solid #f8fafc" : undefined }}
>
```
And close with `</Link>` instead of `</div>`.

**Step 3: Commit**

```bash
git add src/app/(admin)/admin/creators/[id]/page.tsx src/app/(admin)/admin/creators/page.tsx
git commit -m "feat: add /admin/creators/[id] page with shared components and campaign match"
```

---

### Task 12: Weekly refresh-demographics cron

**Files:**
- Create: `src/app/api/cron/refresh-demographics/route.ts`
- Create/update: `vercel.json`

**Step 1: Create cron route**

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import {
  fetchInstagramProfile,
  fetchFollowerDemographics,
  fetchAccountInsights,
  fetchRecentMedia,
  computeEngagementRate,
  computeDemographicStats,
} from "@/lib/instagram";
import type { IgDemographics } from "@/types/instagram";

export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Max 40 accounts per run to stay within 200 calls/hour rate limit (5 calls per account)
  const accounts = await prisma.socialAccount.findMany({
    where: { platform: "instagram", isActive: true },
    select: {
      id: true,
      platformUserId: true,
      accessToken: true,
      accessTokenIv: true,
      followerCount: true,
      creatorProfileId: true,
    },
    take: 40,
  });

  const results = { updated: 0, failed: 0, errors: [] as string[] };

  for (const account of accounts) {
    try {
      const accessToken = decrypt(account.accessToken, account.accessTokenIv);
      const igUserId = account.platformUserId;

      const profile = await fetchInstagramProfile(accessToken, igUserId);
      const media = await fetchRecentMedia(accessToken, igUserId);
      const engagementRate = computeEngagementRate(
        media.map((m) => ({
          mediaId: m.id,
          likeCount: m.like_count,
          commentCount: m.comments_count,
          impressions: 0,
          reach: 0,
          videoViews: 0,
        })),
        profile.followersCount
      );

      let demographics: IgDemographics | null = null;
      if (profile.followersCount >= 100) {
        try {
          demographics = await fetchFollowerDemographics(accessToken, igUserId);
        } catch {
          // non-fatal
        }
      }

      let insights = null;
      try {
        insights = await fetchAccountInsights(accessToken, igUserId);
      } catch {
        // non-fatal
      }

      const now = new Date();
      await prisma.socialAccount.update({
        where: { id: account.id },
        data: {
          igName: profile.name,
          igBio: profile.biography,
          igProfilePicUrl: profile.profilePictureUrl,
          igFollowsCount: profile.followsCount,
          igWebsite: profile.website,
          followerCount: profile.followersCount,
          engagementRate,
          igMediaCache: media.length > 0 ? (media as any) : undefined,
          ...(demographics && { igDemographics: demographics as any, igDemographicsUpdatedAt: now }),
          ...(insights && {
            ig30DayReach: insights.reach,
            ig30DayViews: insights.views,
            ig30DayEngaged: insights.accountsEngaged,
            ig30DayInteractions: insights.totalInteractions,
            igInsightsUpdatedAt: now,
          }),
          lastSyncedAt: now,
        },
      });

      if (account.creatorProfileId) {
        const computed = computeDemographicStats(demographics);
        await prisma.creatorProfile.update({
          where: { id: account.creatorProfileId },
          data: {
            totalFollowers: profile.followersCount,
            engagementRate,
            avatarUrl: profile.profilePictureUrl || undefined,
            bestEngagementRate: engagementRate,
            ...(computed.topCountry && { topCountry: computed.topCountry }),
            ...(computed.topCountryPercent !== null && { topCountryPercent: computed.topCountryPercent }),
            ...(computed.malePercent !== null && { malePercent: computed.malePercent }),
            ...(computed.age18PlusPercent !== null && { age18PlusPercent: computed.age18PlusPercent }),
          },
        });
      }
      results.updated++;
    } catch (err) {
      results.failed++;
      results.errors.push(`${account.id}: ${err instanceof Error ? err.message : "unknown"}`);
    }
  }

  console.log("[cron/refresh-demographics]", results);
  return NextResponse.json(results);
}
```

**Step 2: Create/update vercel.json**

Check if `vercel.json` exists at project root. If not, create it. Ensure the `crons` array contains both entries:

```json
{
  "crons": [
    { "path": "/api/cron/refresh-tokens", "schedule": "0 9 * * 1" },
    { "path": "/api/cron/refresh-demographics", "schedule": "0 2 * * 0" }
  ]
}
```

**Step 3: Commit**

```bash
git add src/app/api/cron/refresh-demographics/route.ts vercel.json
git commit -m "feat: add weekly refresh-demographics cron"
```

---

### Task 13: Build verification

**Step 1: TypeScript check**

```bash
cd spotmarket && npx tsc --noEmit
```

Expected: 0 errors. Fix any type errors before proceeding.

**Step 2: Lint**

```bash
npx eslint src --ext .ts,.tsx --max-warnings 0
```

**Step 3: Build**

```bash
npm run build
```

Expected: successful build.

**Step 4: Manual smoke test**

Start dev server (`npm run dev`) and verify:
- `/profile` renders for a connected creator (header card, stat row, demographics prompt or charts, posts grid)
- "Refresh now" spins and data reloads without page reload
- `/admin/creators` rows are now clickable links
- `/admin/creators/[id]` shows all sections
- `/admin/creators/[id]?campaignId=<valid-id>` shows CampaignMatchCard

**Step 5: Final commit**

```bash
git add -A
git commit -m "chore: verify creator profile rebuild build and lint clean"
```
