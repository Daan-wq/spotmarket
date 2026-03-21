# Spotmarket Upgrade Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Upgrade Spotmarket from manual admin tool to self-serve marketplace with instant claim, live earnings, auto-approvals, auto-payouts, network owner support, and Stripe Connect.

**Architecture:** All 7 blocks build on a single Prisma schema migration first. Then API routes + server actions, then UI pages/components. Cron jobs are standalone API routes. Network owners are a first-class user role with their own dashboard layout at `/network/*`.

**Tech Stack:** Next.js 16 App Router, Prisma 7 + Neon/Supabase Postgres, Supabase Auth, Tailwind v4, Zod v4, `prisma migrate dev` via `DATABASE_URL_DIRECT`

**Migration strategy:** Single migration covering all schema changes across Blocks 1-7. Run once, then build features on top.

---

## Task 1: Full Schema Migration (All Blocks Combined)

**Files:**
- Modify: `prisma/schema.prisma`
- Run: `prisma migrate dev`

**Step 1: Replace schema.prisma entirely**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
}

// ─────────────────────────────────────────
// USERS & IDENTITY
// ─────────────────────────────────────────

model User {
  id         String   @id @default(cuid())
  supabaseId String   @unique
  email      String   @unique
  role       UserRole
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  creatorProfile   CreatorProfile?
  businessProfile  BusinessProfile?
  networkProfile   NetworkProfile?
  sentMessages     Message[]       @relation("SentMessages")
  receivedMessages Message[]       @relation("ReceivedMessages")
  auditLogs        AuditLog[]

  @@index([supabaseId])
  @@index([role])
}

enum UserRole {
  admin
  business
  creator
  network
  user
}

model CreatorProfile {
  id              String   @id @default(cuid())
  userId          String   @unique
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  displayName     String
  bio             String?
  avatarUrl       String?
  walletAddress   String?
  stripeAccountId String?
  primaryGeo      String   @default("US")
  totalFollowers  Int      @default(0)
  engagementRate  Decimal  @default(0) @db.Decimal(5, 2)
  isVerified      Boolean  @default(false)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  socialAccounts SocialAccount[]
  applications   CampaignApplication[]
  payouts        Payout[]

  @@index([primaryGeo])
  @@index([engagementRate])
  @@index([totalFollowers])
}

model BusinessProfile {
  id          String   @id @default(cuid())
  userId      String   @unique
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  companyName String
  website     String?
  isApproved  Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  campaigns Campaign[]
}

model NetworkProfile {
  id              String   @id @default(cuid())
  userId          String   @unique
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  companyName     String
  contactName     String
  website         String?
  description     String?
  networkSize     Int?
  inviteCode      String   @unique
  walletAddress   String?
  stripeAccountId String?
  isApproved      Boolean  @default(false)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  members      NetworkMember[]
  applications CampaignApplication[]
  payouts      Payout[]

  @@index([inviteCode])
  @@index([isApproved])
}

model NetworkMember {
  id               String         @id @default(cuid())
  networkId        String
  network          NetworkProfile @relation(fields: [networkId], references: [id], onDelete: Cascade)
  displayName      String?
  email            String?
  igUserId         String?        @unique
  igUsername       String?
  igAccessToken    String?
  igAccessTokenIv  String?
  igTokenExpiry    DateTime?
  igFollowerCount  Int?
  igIsConnected    Boolean        @default(false)
  creatorProfileId String?        @unique
  creatorProfile   CreatorProfile? @relation(fields: [creatorProfileId], references: [id])
  isActive         Boolean        @default(true)
  joinedAt         DateTime       @default(now())

  posts       CampaignPost[]
  assignments NetworkMemberAssignment[]

  @@index([networkId])
  @@index([igUserId])
}

model NetworkMemberAssignment {
  id            String              @id @default(cuid())
  applicationId String
  application   CampaignApplication @relation(fields: [applicationId], references: [id], onDelete: Cascade)
  memberId      String
  member        NetworkMember       @relation(fields: [memberId], references: [id], onDelete: Cascade)
  assignedAt    DateTime            @default(now())

  @@unique([applicationId, memberId])
  @@index([applicationId])
  @@index([memberId])
}

// ─────────────────────────────────────────
// SOCIAL ACCOUNTS
// ─────────────────────────────────────────

model SocialAccount {
  id               String         @id @default(cuid())
  creatorProfileId String
  creatorProfile   CreatorProfile @relation(fields: [creatorProfileId], references: [id], onDelete: Cascade)
  platform         SocialPlatform
  platformUserId   String
  platformUsername String
  accessToken      String
  accessTokenIv    String
  tokenExpiresAt   DateTime
  followerCount    Int            @default(0)
  engagementRate   Decimal        @default(0) @db.Decimal(5, 2)
  audienceGeo      Json?
  lastSyncedAt     DateTime?
  isActive         Boolean        @default(true)
  createdAt        DateTime       @default(now())
  updatedAt        DateTime       @updatedAt

  posts CampaignPost[]

  @@unique([creatorProfileId, platform])
  @@index([platform])
  @@index([tokenExpiresAt])
}

enum SocialPlatform {
  instagram
  tiktok
}

// ─────────────────────────────────────────
// CAMPAIGNS
// ─────────────────────────────────────────

model Campaign {
  id                    String         @id @default(cuid())
  businessProfileId     String
  businessProfile       BusinessProfile @relation(fields: [businessProfileId], references: [id])
  name                  String
  description           String?
  contentGuidelines     String?        @db.Text
  referralLink          String
  targetGeo             String[]
  minFollowers          Int
  minEngagementRate     Decimal        @db.Decimal(5, 2)
  totalBudget           Decimal        @db.Decimal(12, 2)
  creatorCpv            Decimal        @db.Decimal(8, 6)
  adminMargin           Decimal        @db.Decimal(8, 6)
  businessCpv           Decimal        @db.Decimal(8, 6)
  deadline              DateTime
  status                CampaignStatus @default(draft)
  briefAssetUrl         String?

  // Block 2: Instant claim fields
  maxSlots              Int?
  claimedSlots          Int            @default(0)
  requiresApproval      Boolean        @default(false)

  // Block 6: Campaign brief fields
  targetCountry         String?
  targetCountryPercent  Int?
  targetMinAge18Percent Int?
  targetMalePercent     Int?
  contentType           String?
  requirements          String?
  otherNotes            String?
  bannerUrl             String?
  contentAssetUrls      String[]
  guidelinesUrl         String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  applications CampaignApplication[]
  messages     Message[]
  report       CampaignReport?

  @@index([status])
  @@index([deadline])
  @@index([businessProfileId])
}

enum CampaignStatus {
  draft
  active
  paused
  completed
  cancelled
}

model CampaignApplication {
  id                 String            @id @default(cuid())
  campaignId         String
  campaign           Campaign          @relation(fields: [campaignId], references: [id])

  // Either creator OR network applies (one will be null)
  creatorProfileId   String?
  creatorProfile     CreatorProfile?   @relation(fields: [creatorProfileId], references: [id])
  networkId          String?
  network            NetworkProfile?   @relation(fields: [networkId], references: [id])

  status             ApplicationStatus @default(pending)
  claimType          ClaimType         @default(INSTANT)
  appliedAt          DateTime          @default(now())
  reviewedAt         DateTime?
  reviewNotes        String?
  followerSnapshot   Int?
  engagementSnapshot Decimal?          @db.Decimal(5, 2)

  // Block 3: Earnings tracking
  earnedAmount       Int               @default(0)  // cents
  paidAmount         Int               @default(0)  // cents
  lastEarningsCalcAt DateTime?

  updatedAt DateTime @updatedAt

  posts           CampaignPost[]
  payouts         Payout[]
  assignedMembers NetworkMemberAssignment[]

  @@index([status])
  @@index([campaignId])
  @@index([creatorProfileId])
  @@index([networkId])
}

enum ApplicationStatus {
  pending
  approved
  rejected
  active
  completed
  disputed
}

enum ClaimType {
  INSTANT
  APPLICATION
}

// ─────────────────────────────────────────
// POSTS & VIEW TRACKING
// ─────────────────────────────────────────

model CampaignPost {
  id              String              @id @default(cuid())
  applicationId   String
  application     CampaignApplication @relation(fields: [applicationId], references: [id])
  socialAccountId String?
  socialAccount   SocialAccount?      @relation(fields: [socialAccountId], references: [id])

  // For network member posts (no SocialAccount model entry)
  networkMemberId String?
  networkMember   NetworkMember?      @relation(fields: [networkMemberId], references: [id])

  postUrl         String
  platformPostId  String
  platform        SocialPlatform
  status          PostStatus          @default(submitted)
  submittedAt     DateTime            @default(now())
  approvedAt      DateTime?
  isApproved      Boolean             @default(false)
  isFraudSuspect  Boolean             @default(false)
  fraudFlags      Json?

  // Block 4: Auto-approve
  autoApproveAt   DateTime?
  isAutoApproved  Boolean             @default(false)

  verifiedViews   Int                 @default(0)

  snapshots ViewSnapshot[]

  @@index([applicationId])
  @@index([platformPostId])
  @@index([platform])
  @@index([status])
  @@index([autoApproveAt])
}

enum PostStatus {
  submitted
  approved
  rejected
}

model ViewSnapshot {
  id            String       @id @default(cuid())
  postId        String
  post          CampaignPost @relation(fields: [postId], references: [id])
  viewsCount    Int
  likesCount    Int
  commentsCount Int
  reach         Int?
  impressions   Int?
  capturedAt    DateTime     @default(now())

  @@index([postId, capturedAt])
  @@index([capturedAt])
}

// ─────────────────────────────────────────
// MESSAGING
// ─────────────────────────────────────────

model Message {
  id          String   @id @default(cuid())
  campaignId  String
  campaign    Campaign @relation(fields: [campaignId], references: [id])
  senderId    String
  sender      User     @relation("SentMessages", fields: [senderId], references: [id])
  recipientId String
  recipient   User     @relation("ReceivedMessages", fields: [recipientId], references: [id])
  content     String   @db.Text
  readAt      DateTime?
  createdAt   DateTime @default(now())

  @@index([campaignId, createdAt])
  @@index([senderId])
  @@index([recipientId])
}

// ─────────────────────────────────────────
// PAYOUTS
// ─────────────────────────────────────────

model Payout {
  id               String         @id @default(cuid())

  // Payee — one will be set
  creatorProfileId String?
  creatorProfile   CreatorProfile? @relation(fields: [creatorProfileId], references: [id])
  networkId        String?
  network          NetworkProfile? @relation(fields: [networkId], references: [id])

  // Legacy: link to specific application (kept for backwards compat)
  applicationId    String?
  application      CampaignApplication? @relation(fields: [applicationId], references: [id])

  amount           Decimal        @db.Decimal(12, 6)
  currency         String         @default("USD")
  status           PayoutStatus   @default(pending)
  type             PayoutType     @default(final)
  paymentMethod    PaymentMethod?

  // Crypto
  walletAddress    String?
  txHash           String?
  coinbaseChargeId String?

  // Stripe
  stripeTransferId String?

  // Period
  periodStart      DateTime?
  periodEnd        DateTime?

  // Which applications are included (for batch payouts)
  applicationIds   String[]

  verifiedViews    Int?
  initiatedAt      DateTime?
  confirmedAt      DateTime?
  processedAt      DateTime?
  createdAt        DateTime       @default(now())
  updatedAt        DateTime       @updatedAt

  @@index([applicationId])
  @@index([status])
  @@index([creatorProfileId])
  @@index([networkId])
}

enum PayoutType {
  upfront
  final
}

enum PayoutStatus {
  pending
  processing
  sent
  confirmed
  failed
  disputed
}

enum PaymentMethod {
  CRYPTO
  STRIPE
}

// ─────────────────────────────────────────
// REPORTING
// ─────────────────────────────────────────

model CampaignReport {
  id           String   @id @default(cuid())
  campaignId   String   @unique
  campaign     Campaign @relation(fields: [campaignId], references: [id])
  totalViews   BigInt
  totalPayout  Decimal  @db.Decimal(12, 2)
  adminRevenue Decimal  @db.Decimal(12, 2)
  creatorCount Int
  generatedAt  DateTime @default(now())
  dataJson     Json

  @@index([generatedAt])
}

// ─────────────────────────────────────────
// AUDIT LOG
// ─────────────────────────────────────────

model AuditLog {
  id         String   @id @default(cuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id])
  action     String
  entityType String
  entityId   String
  metadata   Json?
  createdAt  DateTime @default(now())

  @@index([userId, createdAt])
  @@index([entityType, entityId])
}

// ─────────────────────────────────────────
// INTERNAL OPS
// ─────────────────────────────────────────

model Client {
  id                   String   @id @default(cuid())
  name                 String
  contactName          String?
  email                String?
  phone                String?
  company              String?
  communicationChannel String   @default("whatsapp")
  communicationHandle  String?
  country              String?
  notes                String?  @db.Text
  status               String   @default("active")
  totalSpent           Decimal  @default(0) @db.Decimal(12, 2)
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  internalCampaigns InternalCampaign[]
  payments          OpsPayment[]

  @@index([status])
  @@index([createdAt])
}

model InstagramPage {
  id                   String   @id @default(cuid())
  handle               String   @unique
  niche                String?
  followerCount        Int      @default(0)
  avgEngagementRate    Decimal  @default(0) @db.Decimal(5, 2)
  avgCpm               Decimal  @default(0) @db.Decimal(8, 2)
  reliabilityScore     Int      @default(5)
  communicationChannel String   @default("instagram")
  communicationHandle  String?
  contactName          String?
  country              String?
  notes                String?  @db.Text
  status               String   @default("active")
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  internalCampaignPages InternalCampaignPage[]
  payments              OpsPayment[]

  @@index([status])
  @@index([niche])
  @@index([followerCount])
}

model InternalCampaign {
  id            String   @id @default(cuid())
  clientId      String
  client        Client   @relation(fields: [clientId], references: [id])
  name          String
  status        String   @default("draft")
  clientPays    Decimal  @db.Decimal(12, 2)
  totalPageCost Decimal  @default(0) @db.Decimal(12, 2)
  adContentUrl  String?
  adCaption     String?  @db.Text
  adLink        String?
  startDate     DateTime?
  endDate       DateTime?
  notes         String?  @db.Text
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  campaignPages InternalCampaignPage[]
  payments      OpsPayment[]

  @@index([status])
  @@index([clientId])
  @@index([startDate])
}

model InternalCampaignPage {
  id                 String           @id @default(cuid())
  internalCampaignId String
  internalCampaign   InternalCampaign @relation(fields: [internalCampaignId], references: [id], onDelete: Cascade)
  pageId             String
  page               InstagramPage    @relation(fields: [pageId], references: [id])
  cost               Decimal          @db.Decimal(10, 2)
  status             String           @default("pending")
  scheduledDate      DateTime?
  postedAt           DateTime?
  reach              Int?
  impressions        Int?
  screenshotUrl      String?
  createdAt          DateTime         @default(now())

  @@unique([internalCampaignId, pageId])
  @@index([internalCampaignId])
  @@index([pageId])
}

model PaymentNetwork {
  id           String   @id @default(cuid())
  platform     String
  accountLabel String
  currency     String   @default("USD")
  balance      Decimal  @default(0) @db.Decimal(12, 2)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  payments OpsPayment[]

  @@index([platform])
}

model OpsPayment {
  id                 String            @id @default(cuid())
  direction          String
  clientId           String?
  client             Client?           @relation(fields: [clientId], references: [id])
  pageId             String?
  page               InstagramPage?    @relation(fields: [pageId], references: [id])
  internalCampaignId String?
  internalCampaign   InternalCampaign? @relation(fields: [internalCampaignId], references: [id])
  paymentNetworkId   String?
  paymentNetwork     PaymentNetwork?   @relation(fields: [paymentNetworkId], references: [id])
  amount             Decimal           @db.Decimal(12, 2)
  currency           String            @default("USD")
  status             String            @default("pending")
  dueDate            DateTime?
  paidAt             DateTime?
  notes              String?           @db.Text
  createdAt          DateTime          @default(now())
  updatedAt          DateTime          @updatedAt

  @@index([direction])
  @@index([status])
  @@index([clientId])
  @@index([pageId])
  @@index([internalCampaignId])
  @@index([createdAt])
}
```

**Step 2: Run migration**

```bash
cd spotmarket
npx prisma migrate dev --name "spotmarket-upgrade-all-blocks"
```

Expected: Migration created and applied successfully. Prisma client regenerated.

Note: If you get connection errors, ensure `DATABASE_URL_DIRECT` is set in `.env.local`. The `prisma.config.ts` already uses this var for migrations.

**Step 3: Format schema**

```bash
npx prisma format
```

---

## Task 2: Block 1 — Network Owner API Routes

**Files:**
- Create: `src/app/api/network/route.ts` (GET profile, POST create)
- Create: `src/app/api/network/members/route.ts` (GET list, POST add)
- Create: `src/app/api/network/members/[memberId]/route.ts` (PATCH, DELETE)
- Create: `src/app/api/network/applications/route.ts` (GET campaigns as network)

**Step 1: Create `src/app/api/network/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createNetworkSchema = z.object({
  companyName: z.string().min(1).max(200),
  contactName: z.string().min(1).max(200),
  website: z.string().url().optional(),
  description: z.string().max(1000).optional(),
  networkSize: z.number().int().positive().optional(),
  inviteCode: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, hyphens only"),
  walletAddress: z.string().optional(),
});

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    include: {
      networkProfile: {
        include: {
          _count: { select: { members: true, applications: true } },
        },
      },
    },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!user.networkProfile) return NextResponse.json({ error: "No network profile" }, { status: 404 });

  return NextResponse.json({ network: user.networkProfile });
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createNetworkSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { supabaseId: authUser.id } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Check invite code uniqueness
  const existing = await prisma.networkProfile.findUnique({ where: { inviteCode: parsed.data.inviteCode } });
  if (existing) return NextResponse.json({ error: "Invite code already taken" }, { status: 409 });

  const [networkProfile] = await prisma.$transaction([
    prisma.networkProfile.create({
      data: {
        userId: user.id,
        ...parsed.data,
      },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: { role: "network" },
    }),
  ]);

  return NextResponse.json({ network: networkProfile }, { status: 201 });
}
```

**Step 2: Create `src/app/api/network/members/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

async function getNetworkProfile(supabaseId: string) {
  const user = await prisma.user.findUnique({
    where: { supabaseId },
    include: { networkProfile: true },
  });
  return user?.networkProfile ?? null;
}

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const network = await getNetworkProfile(authUser.id);
  if (!network) return NextResponse.json({ error: "No network profile" }, { status: 403 });

  const members = await prisma.networkMember.findMany({
    where: { networkId: network.id },
    orderBy: { joinedAt: "desc" },
  });

  return NextResponse.json({ members });
}
```

**Step 3: Create `src/app/api/network/members/[memberId]/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(_req: Request, { params }: { params: Promise<{ memberId: string }> }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { memberId } = await params;

  const user = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    include: { networkProfile: true },
  });
  if (!user?.networkProfile) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const member = await prisma.networkMember.findFirst({
    where: { id: memberId, networkId: user.networkProfile.id },
  });
  if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.networkMember.update({
    where: { id: memberId },
    data: { isActive: false },
  });

  return NextResponse.json({ ok: true });
}
```

---

## Task 3: Block 1 — Join Page (Network Member Instagram OAuth)

**Files:**
- Create: `src/app/join/[inviteCode]/page.tsx`
- Create: `src/app/api/join/[inviteCode]/route.ts` (GET: lookup network)
- Create: `src/app/api/join/complete/route.ts` (POST: store OAuth token after IG redirect)

**Step 1: Create `src/app/api/join/[inviteCode]/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ inviteCode: string }> }) {
  const { inviteCode } = await params;

  const network = await prisma.networkProfile.findUnique({
    where: { inviteCode, isApproved: true },
    select: { id: true, companyName: true, description: true },
  });

  if (!network) return NextResponse.json({ error: "Network not found or not approved" }, { status: 404 });

  return NextResponse.json({ network });
}
```

**Step 2: Create `src/app/join/[inviteCode]/page.tsx`**

```typescript
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { JoinPageClient } from "./join-page-client";

interface Props {
  params: Promise<{ inviteCode: string }>;
}

export default async function JoinPage({ params }: Props) {
  const { inviteCode } = await params;

  const network = await prisma.networkProfile.findUnique({
    where: { inviteCode, isApproved: true },
    select: { id: true, companyName: true, description: true },
  });

  if (!network) notFound();

  return <JoinPageClient network={network} inviteCode={inviteCode} />;
}
```

**Step 3: Create `src/app/join/[inviteCode]/join-page-client.tsx`**

```typescript
"use client";

import { useState } from "react";

interface Props {
  network: { id: string; companyName: string; description: string | null };
  inviteCode: string;
}

export function JoinPageClient({ network, inviteCode }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    setLoading(true);
    // Store name/email in sessionStorage, redirect to IG OAuth
    sessionStorage.setItem("join_name", name);
    sessionStorage.setItem("join_email", email);
    sessionStorage.setItem("join_invite_code", inviteCode);

    const redirectUri = encodeURIComponent(`${window.location.origin}/api/auth/instagram/callback`);
    const scope = "instagram_basic,instagram_content_publish,instagram_manage_insights,pages_read_engagement";
    const igAuthUrl = `https://api.instagram.com/oauth/authorize?client_id=${process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID}&redirect_uri=${redirectUri}&scope=${scope}&response_type=code&state=join:${inviteCode}`;

    window.location.href = igAuthUrl;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">{network.companyName}</h1>
          {network.description && (
            <p className="text-gray-500 mt-2">{network.description}</p>
          )}
          <p className="text-sm text-gray-400 mt-4">
            Connect your Instagram to verify your views for campaigns in this network.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Your name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Display name"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email (optional)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={handleConnect}
            disabled={!name || loading}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold py-3 rounded-lg disabled:opacity-50"
          >
            {loading ? "Redirecting..." : "Connect Instagram"}
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Step 4: Create `src/app/api/auth/instagram/callback/route.ts`** (handles both creator OAuth and network member join)

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state") ?? "";
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(new URL("/sign-in?error=ig_denied", req.url));
  }

  // Exchange code for token
  const tokenRes = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.INSTAGRAM_APP_ID!,
      client_secret: process.env.INSTAGRAM_APP_SECRET!,
      grant_type: "authorization_code",
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/instagram/callback`,
      code,
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(new URL("/sign-in?error=ig_token_failed", req.url));
  }

  const { access_token, user_id } = await tokenRes.json() as { access_token: string; user_id: string };

  // Fetch long-lived token
  const llRes = await fetch(
    `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${process.env.INSTAGRAM_APP_SECRET}&access_token=${access_token}`
  );
  const llData = await llRes.json() as { access_token: string; expires_in: number };
  const longToken = llData.access_token;
  const expiresAt = new Date(Date.now() + llData.expires_in * 1000);

  // Fetch IG profile
  const profileRes = await fetch(
    `https://graph.instagram.com/${user_id}?fields=username,followers_count&access_token=${longToken}`
  );
  const profile = await profileRes.json() as { username: string; followers_count: number };

  // Encrypt token
  const { encrypted, iv } = encrypt(longToken);

  // If state starts with "join:" → network member flow
  if (state.startsWith("join:")) {
    const inviteCode = state.replace("join:", "");
    const network = await prisma.networkProfile.findUnique({ where: { inviteCode } });
    if (!network) return NextResponse.redirect(new URL("/", req.url));

    // Upsert network member
    await prisma.networkMember.upsert({
      where: { igUserId: user_id },
      create: {
        networkId: network.id,
        igUserId: user_id,
        igUsername: profile.username,
        igAccessToken: encrypted,
        igAccessTokenIv: iv,
        igTokenExpiry: expiresAt,
        igFollowerCount: profile.followers_count ?? 0,
        igIsConnected: true,
      },
      update: {
        networkId: network.id,
        igUsername: profile.username,
        igAccessToken: encrypted,
        igAccessTokenIv: iv,
        igTokenExpiry: expiresAt,
        igFollowerCount: profile.followers_count ?? 0,
        igIsConnected: true,
      },
    });

    return NextResponse.redirect(new URL(`/join/${inviteCode}/success`, req.url));
  }

  // Regular creator OAuth flow — user must be logged in
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.redirect(new URL("/sign-in", req.url));

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    include: { creatorProfile: true },
  });
  if (!dbUser?.creatorProfile) return NextResponse.redirect(new URL("/onboarding", req.url));

  await prisma.socialAccount.upsert({
    where: {
      creatorProfileId_platform: {
        creatorProfileId: dbUser.creatorProfile.id,
        platform: "instagram",
      },
    },
    create: {
      creatorProfileId: dbUser.creatorProfile.id,
      platform: "instagram",
      platformUserId: user_id,
      platformUsername: profile.username,
      accessToken: encrypted,
      accessTokenIv: iv,
      tokenExpiresAt: expiresAt,
      followerCount: profile.followers_count ?? 0,
    },
    update: {
      platformUserId: user_id,
      platformUsername: profile.username,
      accessToken: encrypted,
      accessTokenIv: iv,
      tokenExpiresAt: expiresAt,
      followerCount: profile.followers_count ?? 0,
    },
  });

  return NextResponse.redirect(new URL("/dashboard", req.url));
}
```

**Step 5: Create `src/app/join/[inviteCode]/success/page.tsx`**

```typescript
export default function JoinSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        <div className="text-5xl mb-4">✅</div>
        <h1 className="text-2xl font-bold text-gray-900">You&apos;re connected!</h1>
        <p className="text-gray-500 mt-3">
          Your Instagram is now linked. Your network owner will let you know when you have campaigns to post.
        </p>
        <p className="text-sm text-gray-400 mt-6">You can close this tab.</p>
      </div>
    </div>
  );
}
```

---

## Task 4: Block 1 — Network Dashboard Layout + Pages

**Files:**
- Create: `src/app/(network)/layout.tsx`
- Create: `src/app/(network)/network/dashboard/page.tsx`
- Create: `src/app/(network)/network/members/page.tsx`
- Create: `src/app/(network)/network/campaigns/page.tsx`
- Create: `src/app/(network)/network/campaigns/[id]/page.tsx`
- Create: `src/app/(network)/network/earnings/page.tsx`
- Create: `src/app/(network)/_components/network-sidebar.tsx`

**Step 1: Create `src/app/(network)/layout.tsx`**

```typescript
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { NetworkSidebar } from "./_components/network-sidebar";

export default async function NetworkLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    select: { role: true },
  });

  if (dbUser?.role !== "network") redirect("/unauthorized");

  return (
    <div className="flex h-screen bg-gray-50">
      <NetworkSidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
```

**Step 2: Create `src/app/(network)/_components/network-sidebar.tsx`**

```typescript
import Link from "next/link";

const navItems = [
  { href: "/network/dashboard", label: "Dashboard" },
  { href: "/network/campaigns", label: "Campaigns" },
  { href: "/network/members", label: "Members" },
  { href: "/network/earnings", label: "Earnings" },
];

export function NetworkSidebar() {
  return (
    <aside className="w-56 bg-white border-r border-gray-200 flex flex-col py-6 px-4 gap-1">
      <div className="font-bold text-gray-900 text-lg mb-6 px-2">Network</div>
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-3 py-2 rounded-lg transition-colors"
        >
          {item.label}
        </Link>
      ))}
    </aside>
  );
}
```

**Step 3: Create `src/app/(network)/network/dashboard/page.tsx`**

```typescript
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function NetworkDashboardPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    include: {
      networkProfile: {
        include: {
          _count: { select: { members: true } },
          applications: {
            where: { status: { in: ["approved", "active"] } },
            include: {
              campaign: { select: { name: true, creatorCpv: true } },
              _count: { select: { posts: true } },
            },
          },
        },
      },
    },
  });

  const network = dbUser?.networkProfile;
  if (!network) redirect("/onboarding");

  const totalEarned = network.applications.reduce((sum, a) => sum + a.earnedAmount, 0);
  const totalPaid = network.applications.reduce((sum, a) => sum + a.paidAmount, 0);
  const unpaid = totalEarned - totalPaid;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{network.companyName}</h1>
      <p className="text-gray-500 text-sm mb-8">Network dashboard</p>

      <div className="grid grid-cols-3 gap-6 mb-10">
        <StatCard label="Members" value={network._count.members} />
        <StatCard label="Active Campaigns" value={network.applications.length} />
        <StatCard label="Unpaid Earnings" value={`€${(unpaid / 100).toFixed(2)}`} />
      </div>

      <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Campaigns</h2>
      <div className="space-y-3">
        {network.applications.map((app) => (
          <div key={app.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">{app.campaign.name}</p>
              <p className="text-sm text-gray-500">{app._count.posts} posts</p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-gray-900">€{(app.earnedAmount / 100).toFixed(2)}</p>
              <p className="text-xs text-gray-400">earned</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
```

**Step 4: Create `src/app/(network)/network/members/page.tsx`**

```typescript
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function NetworkMembersPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    include: { networkProfile: true },
  });

  const network = dbUser?.networkProfile;
  if (!network) redirect("/onboarding");

  const members = await prisma.networkMember.findMany({
    where: { networkId: network.id },
    orderBy: { joinedAt: "desc" },
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Members</h1>
        <div className="bg-blue-50 text-blue-700 text-sm px-4 py-2 rounded-lg">
          Invite link: <span className="font-mono font-semibold">{process.env.NEXT_PUBLIC_APP_URL}/join/{network.inviteCode}</span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Username</th>
              <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Followers</th>
              <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Connected</th>
              <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {members.map((m) => (
              <tr key={m.id}>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">@{m.igUsername ?? "—"}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{m.igFollowerCount?.toLocaleString() ?? "—"}</td>
                <td className="px-4 py-3 text-sm">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${m.igIsConnected ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {m.igIsConnected ? "Connected" : "Pending"}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {new Date(m.joinedAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {members.length === 0 && (
          <div className="text-center py-12 text-gray-400 text-sm">
            No members yet. Share your invite link to get started.
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 5: Create `src/app/(network)/network/campaigns/page.tsx`**

Same as creator campaign marketplace but filtered for network owners. Copies the campaign listing logic but skips follower/geo checks for network owners (they bypass these per decision V5-B).

```typescript
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function NetworkCampaignsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    include: { networkProfile: true },
  });
  if (!dbUser?.networkProfile) redirect("/onboarding");
  const network = dbUser.networkProfile;

  const [campaigns, myApplications] = await Promise.all([
    prisma.campaign.findMany({
      where: { status: "active", deadline: { gt: new Date() } },
      include: {
        _count: { select: { applications: true } },
        businessProfile: { select: { companyName: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.campaignApplication.findMany({
      where: { networkId: network.id },
      select: { campaignId: true, status: true },
    }),
  ]);

  const appliedIds = new Set(myApplications.map((a) => a.campaignId));

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Campaign Marketplace</h1>
      <div className="grid gap-4">
        {campaigns.map((campaign) => {
          const hasClaimed = appliedIds.has(campaign.id);
          return (
            <div key={campaign.id} className="bg-white rounded-xl border border-gray-200 p-6 flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900">{campaign.name}</p>
                <p className="text-sm text-gray-500">{campaign.businessProfile.companyName}</p>
                <p className="text-sm text-gray-400 mt-1">
                  CPV: €{Number(campaign.creatorCpv).toFixed(4)} · Deadline: {new Date(campaign.deadline).toLocaleDateString()}
                </p>
              </div>
              <div>
                {hasClaimed ? (
                  <Link href={`/network/campaigns/${campaign.id}`}>
                    <span className="text-sm bg-green-100 text-green-700 px-4 py-2 rounded-lg">Claimed →</span>
                  </Link>
                ) : (
                  <Link href={`/network/campaigns/${campaign.id}`}>
                    <span className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">View & Claim</span>
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

**Step 6: Create `src/app/(network)/network/campaigns/[id]/page.tsx`**

This page handles: view campaign details, claim with slot count, assign members, and bulk-submit post URLs.

```typescript
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { NetworkCampaignDetail } from "./network-campaign-detail";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function NetworkCampaignDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    include: { networkProfile: { include: { members: { where: { isActive: true } } } } },
  });
  if (!dbUser?.networkProfile) redirect("/onboarding");

  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: { businessProfile: { select: { companyName: true } } },
  });
  if (!campaign) notFound();

  const application = await prisma.campaignApplication.findFirst({
    where: { campaignId: id, networkId: dbUser.networkProfile.id },
    include: {
      assignedMembers: { include: { member: true } },
      posts: true,
    },
  });

  return (
    <NetworkCampaignDetail
      campaign={campaign}
      application={application}
      network={dbUser.networkProfile}
      members={dbUser.networkProfile.members}
    />
  );
}
```

**Step 7: Create `src/app/(network)/network/campaigns/[id]/network-campaign-detail.tsx`** (client component for claim + assign + submit)

This is a large interactive component. Keep it client-side for the interactive parts.

```typescript
"use client";

import { useState } from "react";
import type { Campaign, CampaignApplication, NetworkProfile, NetworkMember, NetworkMemberAssignment, CampaignPost } from "@prisma/client";

type ApplicationWithRelations = CampaignApplication & {
  assignedMembers: (NetworkMemberAssignment & { member: NetworkMember })[];
  posts: CampaignPost[];
};

type CampaignWithBusiness = Campaign & {
  businessProfile: { companyName: string };
};

interface Props {
  campaign: CampaignWithBusiness;
  application: ApplicationWithRelations | null;
  network: NetworkProfile;
  members: NetworkMember[];
}

export function NetworkCampaignDetail({ campaign, application, network, members }: Props) {
  const [slotCount, setSlotCount] = useState(1);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [postUrls, setPostUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const hasClaimed = !!application;
  const assignedIds = new Set(application?.assignedMembers.map((a) => a.member.id) ?? []);

  async function handleClaim() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/network/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId: campaign.id, slotCount }),
    });
    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Failed to claim");
    } else {
      window.location.reload();
    }
    setLoading(false);
  }

  async function handleAssignMember(memberId: string) {
    if (!application) return;
    await fetch(`/api/network/applications/${application.id}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId }),
    });
    window.location.reload();
  }

  async function handleSubmitPost(memberId: string) {
    if (!application) return;
    const postUrl = postUrls[memberId];
    if (!postUrl) return;
    await fetch(`/api/network/applications/${application.id}/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId, postUrl }),
    });
    window.location.reload();
  }

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">{campaign.name}</h1>
      <p className="text-gray-500 text-sm mb-6">{campaign.businessProfile.companyName}</p>

      {campaign.description && (
        <p className="text-gray-700 mb-6">{campaign.description}</p>
      )}

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-xs text-gray-400">CPV</p>
          <p className="font-semibold">€{Number(campaign.creatorCpv).toFixed(4)}</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-xs text-gray-400">Deadline</p>
          <p className="font-semibold">{new Date(campaign.deadline).toLocaleDateString()}</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-xs text-gray-400">Slots available</p>
          <p className="font-semibold">{campaign.maxSlots != null ? `${campaign.maxSlots - campaign.claimedSlots} left` : "Unlimited"}</p>
        </div>
      </div>

      {!hasClaimed && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Claim this campaign</h2>
          <div className="flex items-center gap-4">
            <div>
              <label className="text-sm text-gray-600">How many creator slots?</label>
              <input
                type="number"
                min={1}
                value={slotCount}
                onChange={(e) => setSlotCount(Number(e.target.value))}
                className="w-24 ml-3 border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
              />
            </div>
            <button
              onClick={handleClaim}
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Claiming..." : "Claim Campaign"}
            </button>
          </div>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>
      )}

      {hasClaimed && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Assign Members & Submit Posts</h2>
          <div className="space-y-4">
            {members.filter((m) => m.igIsConnected).map((member) => {
              const isAssigned = assignedIds.has(member.id);
              const existingPost = application?.posts.find((p) => p.networkMemberId === member.id);
              return (
                <div key={member.id} className="border border-gray-100 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-sm">@{member.igUsername} ({member.igFollowerCount?.toLocaleString()} followers)</p>
                    {!isAssigned && (
                      <button
                        onClick={() => handleAssignMember(member.id)}
                        className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded hover:bg-gray-200"
                      >
                        Assign
                      </button>
                    )}
                    {isAssigned && <span className="text-xs text-green-600 font-medium">Assigned</span>}
                  </div>
                  {isAssigned && !existingPost && (
                    <div className="flex gap-2 mt-2">
                      <input
                        type="url"
                        placeholder="https://instagram.com/p/..."
                        value={postUrls[member.id] ?? ""}
                        onChange={(e) => setPostUrls((p) => ({ ...p, [member.id]: e.target.value }))}
                        className="flex-1 border border-gray-200 rounded px-3 py-1.5 text-sm"
                      />
                      <button
                        onClick={() => handleSubmitPost(member.id)}
                        className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm"
                      >
                        Submit
                      </button>
                    </div>
                  )}
                  {existingPost && (
                    <p className="text-xs text-green-600 mt-1">Post submitted ✓</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
```

**Step 8: Create `src/app/(network)/network/earnings/page.tsx`**

```typescript
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function NetworkEarningsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    include: { networkProfile: true },
  });
  const network = dbUser?.networkProfile;
  if (!network) redirect("/onboarding");

  const [applications, payouts] = await Promise.all([
    prisma.campaignApplication.findMany({
      where: { networkId: network.id },
      include: { campaign: { select: { name: true } } },
    }),
    prisma.payout.findMany({
      where: { networkId: network.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const totalEarned = applications.reduce((s, a) => s + a.earnedAmount, 0);
  const totalPaid = applications.reduce((s, a) => s + a.paidAmount, 0);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Earnings</h1>

      <div className="grid grid-cols-3 gap-6 mb-10">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500">Total Earned</p>
          <p className="text-2xl font-bold">€{(totalEarned / 100).toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500">Total Paid</p>
          <p className="text-2xl font-bold">€{(totalPaid / 100).toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500">Unpaid Balance</p>
          <p className="text-2xl font-bold text-blue-600">€{((totalEarned - totalPaid) / 100).toFixed(2)}</p>
        </div>
      </div>

      <h2 className="text-lg font-semibold mb-4">By Campaign</h2>
      <div className="space-y-3 mb-10">
        {applications.map((a) => (
          <div key={a.id} className="bg-white rounded-xl border border-gray-200 p-4 flex justify-between">
            <p className="font-medium">{a.campaign.name}</p>
            <div className="text-right">
              <p className="font-semibold">€{(a.earnedAmount / 100).toFixed(2)}</p>
              <p className="text-xs text-gray-400">€{(a.paidAmount / 100).toFixed(2)} paid</p>
            </div>
          </div>
        ))}
      </div>

      <h2 className="text-lg font-semibold mb-4">Payout History</h2>
      <div className="space-y-3">
        {payouts.map((p) => (
          <div key={p.id} className="bg-white rounded-xl border border-gray-200 p-4 flex justify-between">
            <div>
              <p className="font-medium">€{Number(p.amount).toFixed(2)}</p>
              <p className="text-xs text-gray-400">{new Date(p.createdAt).toLocaleDateString()}</p>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
              p.status === "confirmed" ? "bg-green-100 text-green-700" :
              p.status === "sent" ? "bg-blue-100 text-blue-700" :
              "bg-yellow-100 text-yellow-700"
            }`}>
              {p.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Task 5: Block 2 — Instant Claim API

**Files:**
- Create: `src/app/api/network/claim/route.ts`
- Create: `src/app/api/campaigns/[campaignId]/claim/route.ts` (for creators)
- Modify: `src/app/api/campaigns/route.ts` (add maxSlots/requiresApproval to create schema)
- Create: `src/app/api/network/applications/[applicationId]/assign/route.ts`
- Create: `src/app/api/network/applications/[applicationId]/posts/route.ts`

**Step 1: Create `src/app/api/network/claim/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const claimSchema = z.object({
  campaignId: z.string(),
  slotCount: z.number().int().positive().max(500),
});

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = claimSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    include: { networkProfile: true },
  });
  if (!dbUser?.networkProfile?.isApproved) {
    return NextResponse.json({ error: "Network not approved" }, { status: 403 });
  }

  const network = dbUser.networkProfile;
  const { campaignId, slotCount } = parsed.data;

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId, status: "active" },
  });
  if (!campaign) return NextResponse.json({ error: "Campaign not found or not active" }, { status: 404 });

  // Slot check
  if (campaign.maxSlots != null && campaign.claimedSlots + slotCount > campaign.maxSlots) {
    return NextResponse.json({ error: "Not enough slots available" }, { status: 409 });
  }

  // Check existing application
  const existing = await prisma.campaignApplication.findFirst({
    where: { campaignId, networkId: network.id },
  });
  if (existing) return NextResponse.json({ error: "Already claimed" }, { status: 409 });

  const [application] = await prisma.$transaction([
    prisma.campaignApplication.create({
      data: {
        campaignId,
        networkId: network.id,
        status: campaign.requiresApproval ? "pending" : "approved",
        claimType: campaign.requiresApproval ? "APPLICATION" : "INSTANT",
      },
    }),
    prisma.campaign.update({
      where: { id: campaignId },
      data: { claimedSlots: { increment: slotCount } },
    }),
  ]);

  return NextResponse.json({ application }, { status: 201 });
}
```

**Step 2: Create `src/app/api/campaigns/[campaignId]/claim/route.ts`** (creator instant claim)

```typescript
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function POST(_req: Request, { params }: { params: Promise<{ campaignId: string }> }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { campaignId } = await params;

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    include: {
      creatorProfile: {
        include: { socialAccounts: { where: { isActive: true } } },
      },
    },
  });
  if (!dbUser?.creatorProfile) return NextResponse.json({ error: "No creator profile" }, { status: 403 });

  const cp = dbUser.creatorProfile;

  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId, status: "active" } });
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  // Eligibility check
  if (cp.totalFollowers < campaign.minFollowers) {
    return NextResponse.json({ error: `Minimum ${campaign.minFollowers} followers required` }, { status: 400 });
  }
  if (Number(cp.engagementRate) < Number(campaign.minEngagementRate)) {
    return NextResponse.json({ error: "Engagement rate too low" }, { status: 400 });
  }
  if (campaign.targetGeo.length > 0 && !campaign.targetGeo.includes(cp.primaryGeo)) {
    return NextResponse.json({ error: "Geo not matching campaign target" }, { status: 400 });
  }
  if (campaign.maxSlots != null && campaign.claimedSlots >= campaign.maxSlots) {
    return NextResponse.json({ error: "No slots available" }, { status: 409 });
  }

  const existing = await prisma.campaignApplication.findFirst({
    where: { campaignId, creatorProfileId: cp.id },
  });
  if (existing) return NextResponse.json({ error: "Already applied" }, { status: 409 });

  const [application] = await prisma.$transaction([
    prisma.campaignApplication.create({
      data: {
        campaignId,
        creatorProfileId: cp.id,
        status: campaign.requiresApproval ? "pending" : "approved",
        claimType: campaign.requiresApproval ? "APPLICATION" : "INSTANT",
        followerSnapshot: cp.totalFollowers,
        engagementSnapshot: cp.engagementRate,
      },
    }),
    prisma.campaign.update({
      where: { id: campaignId },
      data: { claimedSlots: { increment: 1 } },
    }),
  ]);

  return NextResponse.json({ application }, { status: 201 });
}
```

**Step 3: Create `src/app/api/network/applications/[applicationId]/assign/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const assignSchema = z.object({ memberId: z.string() });

export async function POST(req: Request, { params }: { params: Promise<{ applicationId: string }> }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { applicationId } = await params;
  const body = await req.json();
  const parsed = assignSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed" }, { status: 400 });

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    include: { networkProfile: true },
  });
  if (!dbUser?.networkProfile) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Verify this application belongs to this network
  const application = await prisma.campaignApplication.findFirst({
    where: { id: applicationId, networkId: dbUser.networkProfile.id },
  });
  if (!application) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Verify member belongs to this network
  const member = await prisma.networkMember.findFirst({
    where: { id: parsed.data.memberId, networkId: dbUser.networkProfile.id },
  });
  if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });

  const assignment = await prisma.networkMemberAssignment.upsert({
    where: { applicationId_memberId: { applicationId, memberId: parsed.data.memberId } },
    create: { applicationId, memberId: parsed.data.memberId },
    update: {},
  });

  return NextResponse.json({ assignment }, { status: 201 });
}
```

**Step 4: Create `src/app/api/network/applications/[applicationId]/posts/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const postSchema = z.object({
  memberId: z.string(),
  postUrl: z.string().url(),
});

function extractInstagramMediaId(url: string): string | null {
  const match = url.match(/instagram\.com\/(?:p|reel)\/([A-Za-z0-9_-]+)/);
  return match?.[1] ?? null;
}

export async function POST(req: Request, { params }: { params: Promise<{ applicationId: string }> }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { applicationId } = await params;
  const body = await req.json();
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed" }, { status: 400 });

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    include: { networkProfile: true },
  });
  if (!dbUser?.networkProfile) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const application = await prisma.campaignApplication.findFirst({
    where: { id: applicationId, networkId: dbUser.networkProfile.id },
  });
  if (!application) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const member = await prisma.networkMember.findFirst({
    where: { id: parsed.data.memberId, networkId: dbUser.networkProfile.id },
  });
  if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });

  const platformPostId = extractInstagramMediaId(parsed.data.postUrl);
  if (!platformPostId) return NextResponse.json({ error: "Invalid Instagram URL" }, { status: 400 });

  const autoApproveAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

  const post = await prisma.campaignPost.create({
    data: {
      applicationId,
      networkMemberId: parsed.data.memberId,
      postUrl: parsed.data.postUrl,
      platformPostId,
      platform: "instagram",
      status: "submitted",
      isApproved: false,
      autoApproveAt,
    },
  });

  return NextResponse.json({ post }, { status: 201 });
}
```

---

## Task 6: Block 2 — Lightweight Post Submit Page (Option A)

**Files:**
- Create: `src/app/submit/[campaignId]/page.tsx`
- Create: `src/app/api/submit/[campaignId]/route.ts`

**Step 1: Create `src/app/api/submit/[campaignId]/route.ts`**

This endpoint is public (network members have no account). It takes a member token or just ig username + url.

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const submitSchema = z.object({
  igUsername: z.string(),
  postUrl: z.string().url(),
});

function extractInstagramMediaId(url: string): string | null {
  const match = url.match(/instagram\.com\/(?:p|reel)\/([A-Za-z0-9_-]+)/);
  return match?.[1] ?? null;
}

export async function POST(req: Request, { params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = await params;
  const body = await req.json();
  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed" }, { status: 400 });

  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId, status: "active" } });
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  // Find member by IG username
  const member = await prisma.networkMember.findFirst({
    where: { igUsername: parsed.data.igUsername, isActive: true },
  });
  if (!member) return NextResponse.json({ error: "Instagram account not found in any network for this campaign" }, { status: 404 });

  // Find the network's application for this campaign
  const application = await prisma.campaignApplication.findFirst({
    where: { campaignId, networkId: member.networkId, status: { in: ["approved", "active"] } },
  });
  if (!application) return NextResponse.json({ error: "Your network has not claimed this campaign" }, { status: 400 });

  const platformPostId = extractInstagramMediaId(parsed.data.postUrl);
  if (!platformPostId) return NextResponse.json({ error: "Invalid Instagram URL" }, { status: 400 });

  const autoApproveAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

  const post = await prisma.campaignPost.create({
    data: {
      applicationId: application.id,
      networkMemberId: member.id,
      postUrl: parsed.data.postUrl,
      platformPostId,
      platform: "instagram",
      status: "submitted",
      isApproved: false,
      autoApproveAt,
    },
  });

  return NextResponse.json({ post }, { status: 201 });
}
```

**Step 2: Create `src/app/submit/[campaignId]/page.tsx`**

```typescript
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { SubmitPostForm } from "./submit-post-form";

interface Props {
  params: Promise<{ campaignId: string }>;
}

export default async function SubmitPostPage({ params }: Props) {
  const { campaignId } = await params;
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId, status: "active" },
    select: { id: true, name: true, deadline: true },
  });
  if (!campaign) notFound();

  return <SubmitPostForm campaign={campaign} />;
}
```

**Step 3: Create `src/app/submit/[campaignId]/submit-post-form.tsx`**

```typescript
"use client";

import { useState } from "react";

interface Props {
  campaign: { id: string; name: string; deadline: Date };
}

export function SubmitPostForm({ campaign }: Props) {
  const [igUsername, setIgUsername] = useState("");
  const [postUrl, setPostUrl] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    const res = await fetch(`/api/submit/${campaign.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ igUsername, postUrl }),
    });
    if (res.ok) {
      setStatus("success");
    } else {
      const d = await res.json();
      setErrorMsg(d.error ?? "Something went wrong");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">✅</div>
          <h1 className="text-xl font-bold">Post submitted!</h1>
          <p className="text-gray-500 mt-2 text-sm">Your post is being reviewed. You&apos;ll earn once it&apos;s approved.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full">
        <h1 className="text-xl font-bold mb-1">{campaign.name}</h1>
        <p className="text-sm text-gray-400 mb-6">Submit your post for this campaign</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Instagram username</label>
            <input
              type="text"
              value={igUsername}
              onChange={(e) => setIgUsername(e.target.value.replace("@", ""))}
              placeholder="yourhandle"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Post URL</label>
            <input
              type="url"
              value={postUrl}
              onChange={(e) => setPostUrl(e.target.value)}
              placeholder="https://instagram.com/p/..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              required
            />
          </div>
          {status === "error" && <p className="text-red-500 text-sm">{errorMsg}</p>}
          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium disabled:opacity-50"
          >
            {status === "loading" ? "Submitting..." : "Submit Post"}
          </button>
        </form>
      </div>
    </div>
  );
}
```

---

## Task 7: Block 3 — Update Poll-Views Cron (Auto-Calculate Earnings)

**Files:**
- Modify: `src/app/api/cron/poll-views/route.ts`

**Step 1: Update the cron to calculate earnings after each snapshot**

After the `ViewSnapshot` create call (line ~116 in current file), add earnings calculation. Also update the query to include network member posts (which have no `socialAccountId`).

Replace the full `GET` export in `poll-views/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { broadcast, realtimeChannel, REALTIME_EVENTS } from "@/lib/realtime";

const FRAUD_SPIKE_MULTIPLIER = 3;

async function fetchInstagramInsights(
  accessToken: string,
  mediaId: string
): Promise<{ views: number; likes: number; comments: number; reach: number } | null> {
  try {
    const fields = "like_count,comments_count,insights.metric(impressions,reach,video_views)";
    const url = `https://graph.instagram.com/${mediaId}?fields=${encodeURIComponent(fields)}&access_token=${accessToken}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();

    const insights: Record<string, number> = {};
    if (data.insights?.data) {
      for (const metric of data.insights.data as { name: string; values: { value: number }[] }[]) {
        insights[metric.name] = metric.values?.[0]?.value ?? 0;
      }
    }

    return {
      views: insights["video_views"] ?? insights["impressions"] ?? 0,
      likes: data.like_count ?? 0,
      comments: data.comments_count ?? 0,
      reach: insights["reach"] ?? 0,
    };
  } catch {
    return null;
  }
}

function compute24hRollingAvg(snapshots: { viewsCount: number; capturedAt: Date }[]): number {
  const now = Date.now();
  const cutoff = now - 24 * 60 * 60 * 1000;
  const recent = snapshots
    .filter((s) => s.capturedAt.getTime() >= cutoff)
    .sort((a, b) => a.capturedAt.getTime() - b.capturedAt.getTime());
  if (recent.length < 2) return 0;
  const totalDelta = recent[recent.length - 1].viewsCount - recent[0].viewsCount;
  return Math.max(0, totalDelta / (recent.length - 1));
}

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const posts = await prisma.campaignPost.findMany({
    where: {
      isFraudSuspect: false,
      status: "approved",
      application: {
        status: { in: ["active", "approved"] },
        campaign: { status: "active", deadline: { gt: new Date() } },
      },
    },
    include: {
      socialAccount: {
        select: { accessToken: true, accessTokenIv: true, platform: true },
      },
      networkMember: {
        select: { igAccessToken: true, igAccessTokenIv: true },
      },
      application: {
        include: {
          campaign: { select: { creatorCpv: true } },
        },
      },
      snapshots: {
        orderBy: { capturedAt: "desc" },
        take: 8,
      },
    },
  });

  let snapshotsWritten = 0;
  let fraudFlagged = 0;

  for (const post of posts) {
    // Resolve token — either from SocialAccount or NetworkMember
    let plainToken: string | null = null;
    const platform = post.socialAccount?.platform ?? "instagram";

    if (post.socialAccount?.accessToken && post.socialAccount.accessTokenIv) {
      try {
        plainToken = decrypt(post.socialAccount.accessToken, post.socialAccount.accessTokenIv);
      } catch {
        console.error(`Failed to decrypt token for post ${post.id}`);
      }
    } else if (post.networkMember?.igAccessToken && post.networkMember.igAccessTokenIv) {
      try {
        plainToken = decrypt(post.networkMember.igAccessToken, post.networkMember.igAccessTokenIv);
      } catch {
        console.error(`Failed to decrypt network member token for post ${post.id}`);
      }
    }

    if (!plainToken) continue;

    let metrics: { views: number; likes: number; comments: number; reach: number } | null = null;
    if (platform === "instagram") {
      metrics = await fetchInstagramInsights(plainToken, post.platformPostId);
    }
    if (!metrics) continue;

    await prisma.viewSnapshot.create({
      data: {
        postId: post.id,
        viewsCount: metrics.views,
        likesCount: metrics.likes,
        commentsCount: metrics.comments,
        reach: metrics.reach,
        capturedAt: new Date(),
      },
    });
    snapshotsWritten++;

    // Update verified views on post
    await prisma.campaignPost.update({
      where: { id: post.id },
      data: { verifiedViews: metrics.views },
    });

    // Fraud detection
    const sortedSnapshots = [...post.snapshots].sort(
      (a, b) => a.capturedAt.getTime() - b.capturedAt.getTime()
    );
    const latestSnapshot = sortedSnapshots[sortedSnapshots.length - 1];
    if (latestSnapshot) {
      const currentDelta = Math.max(0, metrics.views - latestSnapshot.viewsCount);
      const rollingAvg = compute24hRollingAvg(sortedSnapshots);
      if (rollingAvg > 0 && currentDelta > FRAUD_SPIKE_MULTIPLIER * rollingAvg) {
        const fraudFlags = {
          detectedAt: new Date().toISOString(),
          currentDelta,
          rollingAvg,
          multiplier: currentDelta / rollingAvg,
          previousViews: latestSnapshot.viewsCount,
          currentViews: metrics.views,
        };
        await prisma.campaignPost.update({
          where: { id: post.id },
          data: { isFraudSuspect: true, fraudFlags },
        });
        try {
          await broadcast(
            realtimeChannel.adminAlerts(),
            REALTIME_EVENTS.FRAUD_ALERT,
            { postId: post.id, applicationId: post.applicationId, ...fraudFlags }
          );
        } catch (err) {
          console.error("Realtime fraud alert failed:", err);
        }
        fraudFlagged++;
        continue;
      }
    }
  }

  // After processing all posts: recalculate earnings per application
  // Group posts by applicationId
  const applicationIds = [...new Set(posts.map((p) => p.applicationId))];

  for (const applicationId of applicationIds) {
    const app = await prisma.campaignApplication.findUnique({
      where: { id: applicationId },
      include: {
        posts: { where: { status: "approved", isFraudSuspect: false }, select: { verifiedViews: true } },
        campaign: { select: { creatorCpv: true } },
      },
    });
    if (!app) continue;

    const totalViews = app.posts.reduce((s, p) => s + p.verifiedViews, 0);
    const earnedAmount = Math.floor((totalViews / 1000) * Number(app.campaign.creatorCpv) * 100); // store in cents

    await prisma.campaignApplication.update({
      where: { id: applicationId },
      data: { earnedAmount, lastEarningsCalcAt: new Date() },
    });
  }

  return NextResponse.json({
    ok: true,
    postsProcessed: posts.length,
    snapshotsWritten,
    fraudFlagged,
  });
}
```

---

## Task 8: Block 4 — Auto-Approve Cron

**Files:**
- Create: `src/app/api/cron/auto-approve/route.ts`
- Modify: `vercel.json` (add cron schedule)

**Step 1: Create `src/app/api/cron/auto-approve/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const postsToApprove = await prisma.campaignPost.findMany({
    where: {
      status: "submitted",
      autoApproveAt: { lte: new Date() },
      isFraudSuspect: false,
    },
    select: { id: true },
  });

  if (postsToApprove.length === 0) {
    return NextResponse.json({ ok: true, approved: 0 });
  }

  await prisma.campaignPost.updateMany({
    where: { id: { in: postsToApprove.map((p) => p.id) } },
    data: {
      status: "approved",
      isApproved: true,
      isAutoApproved: true,
      approvedAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true, approved: postsToApprove.length });
}
```

**Step 2: Read and update `vercel.json`**

```json
{
  "crons": [
    {
      "path": "/api/cron/poll-views",
      "schedule": "*/30 * * * *"
    },
    {
      "path": "/api/cron/refresh-tokens",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/cron/auto-approve",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/cron/weekly-payouts",
      "schedule": "0 0 * * 1"
    }
  ]
}
```

---

## Task 9: Block 5 — Weekly Payouts Cron

**Files:**
- Create: `src/app/api/cron/weekly-payouts/route.ts`

**Step 1: Create the cron**

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const MIN_PAYOUT_CENTS = 1000; // €10

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const thisMonday = new Date();
  const dayOfWeek = thisMonday.getDay();
  const diff = (dayOfWeek + 6) % 7;
  thisMonday.setDate(thisMonday.getDate() - diff);
  thisMonday.setHours(0, 0, 0, 0);

  const lastMonday = new Date(thisMonday);
  lastMonday.setDate(lastMonday.getDate() - 7);

  // Find applications with unpaid earnings
  const applications = await prisma.campaignApplication.findMany({
    where: { earnedAmount: { gt: 0 } },
    include: {
      creatorProfile: { select: { id: true, walletAddress: true, stripeAccountId: true } },
      network: { select: { id: true, walletAddress: true, stripeAccountId: true } },
    },
  });

  // Filter those with unpaid balance
  const unpaid = applications.filter((a) => a.earnedAmount - a.paidAmount > 0);

  // Group by payee
  const byCreator = new Map<string, typeof unpaid>();
  const byNetwork = new Map<string, typeof unpaid>();

  for (const app of unpaid) {
    if (app.creatorProfileId && app.creatorProfile) {
      const key = app.creatorProfileId;
      byCreator.set(key, [...(byCreator.get(key) ?? []), app]);
    } else if (app.networkId && app.network) {
      const key = app.networkId;
      byNetwork.set(key, [...(byNetwork.get(key) ?? []), app]);
    }
  }

  let payoutsCreated = 0;

  // Process creator payouts
  for (const [creatorProfileId, apps] of byCreator) {
    const totalUnpaid = apps.reduce((s, a) => s + (a.earnedAmount - a.paidAmount), 0);
    if (totalUnpaid < MIN_PAYOUT_CENTS) continue;

    const creator = apps[0].creatorProfile!;
    await prisma.payout.create({
      data: {
        creatorProfileId,
        amount: totalUnpaid / 100, // convert to euros
        currency: "EUR",
        status: "pending",
        type: "final",
        walletAddress: creator.walletAddress ?? undefined,
        paymentMethod: creator.stripeAccountId ? "STRIPE" : (creator.walletAddress ? "CRYPTO" : undefined),
        applicationIds: apps.map((a) => a.id),
        periodStart: lastMonday,
        periodEnd: thisMonday,
      },
    });
    payoutsCreated++;
  }

  // Process network payouts
  for (const [networkId, apps] of byNetwork) {
    const totalUnpaid = apps.reduce((s, a) => s + (a.earnedAmount - a.paidAmount), 0);
    if (totalUnpaid < MIN_PAYOUT_CENTS) continue;

    const network = apps[0].network!;
    await prisma.payout.create({
      data: {
        networkId,
        amount: totalUnpaid / 100,
        currency: "EUR",
        status: "pending",
        type: "final",
        walletAddress: network.walletAddress ?? undefined,
        paymentMethod: network.stripeAccountId ? "STRIPE" : (network.walletAddress ? "CRYPTO" : undefined),
        applicationIds: apps.map((a) => a.id),
        periodStart: lastMonday,
        periodEnd: thisMonday,
      },
    });
    payoutsCreated++;
  }

  return NextResponse.json({ ok: true, payoutsCreated });
}
```

---

## Task 10: Block 1 — Admin Network Management Pages

**Files:**
- Create: `src/app/(admin)/admin/networks/page.tsx`
- Create: `src/app/(admin)/admin/networks/[id]/page.tsx`
- Create: `src/app/api/admin/networks/[id]/route.ts` (PATCH for approve/reject)

**Step 1: Create `src/app/api/admin/networks/[id]/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { z } from "zod";

const patchSchema = z.object({
  isApproved: z.boolean(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth("admin");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed" }, { status: 400 });

  const network = await prisma.networkProfile.update({
    where: { id },
    data: { isApproved: parsed.data.isApproved },
  });

  return NextResponse.json({ network });
}
```

**Step 2: Create `src/app/(admin)/admin/networks/page.tsx`**

```typescript
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function AdminNetworksPage() {
  const networks = await prisma.networkProfile.findMany({
    include: {
      user: { select: { email: true } },
      _count: { select: { members: true, applications: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Networks</h1>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Company</th>
              <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Contact</th>
              <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Members</th>
              <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Status</th>
              <th className="text-left text-xs font-medium text-gray-500 px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {networks.map((n) => (
              <tr key={n.id}>
                <td className="px-4 py-3">
                  <p className="font-medium text-sm">{n.companyName}</p>
                  <p className="text-xs text-gray-400">{n.user.email}</p>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{n.contactName}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{n._count.members}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${n.isApproved ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                    {n.isApproved ? "Approved" : "Pending"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Link href={`/admin/networks/${n.id}`} className="text-xs text-blue-600 hover:underline">View</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

**Step 3: Create `src/app/(admin)/admin/networks/[id]/page.tsx`**

```typescript
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { NetworkApprovalButtons } from "./network-approval-buttons";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminNetworkDetailPage({ params }: Props) {
  const { id } = await params;

  const network = await prisma.networkProfile.findUnique({
    where: { id },
    include: {
      user: { select: { email: true } },
      members: { orderBy: { joinedAt: "desc" } },
      applications: {
        include: { campaign: { select: { name: true } } },
      },
    },
  });

  if (!network) notFound();

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">{network.companyName}</h1>
          <p className="text-gray-500 text-sm">{network.user.email} · Invite: /join/{network.inviteCode}</p>
        </div>
        <NetworkApprovalButtons networkId={network.id} isApproved={network.isApproved} />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-xs text-gray-400">Members</p>
          <p className="text-xl font-bold">{network.members.length}</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-xs text-gray-400">Campaigns</p>
          <p className="text-xl font-bold">{network.applications.length}</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-xs text-gray-400">Network size (claimed)</p>
          <p className="text-xl font-bold">{network.networkSize ?? "—"}</p>
        </div>
      </div>

      <h2 className="font-semibold mb-4">Members</h2>
      <div className="space-y-2">
        {network.members.map((m) => (
          <div key={m.id} className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex justify-between text-sm">
            <span>@{m.igUsername ?? "—"}</span>
            <span className="text-gray-400">{m.igFollowerCount?.toLocaleString() ?? "—"} followers</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Step 4: Create `src/app/(admin)/admin/networks/[id]/network-approval-buttons.tsx`**

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  networkId: string;
  isApproved: boolean;
}

export function NetworkApprovalButtons({ networkId, isApproved }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function toggle(approve: boolean) {
    setLoading(true);
    await fetch(`/api/admin/networks/${networkId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isApproved: approve }),
    });
    router.refresh();
    setLoading(false);
  }

  return (
    <div className="flex gap-2">
      {!isApproved && (
        <button
          onClick={() => toggle(true)}
          disabled={loading}
          className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
        >
          Approve
        </button>
      )}
      {isApproved && (
        <button
          onClick={() => toggle(false)}
          disabled={loading}
          className="bg-red-100 text-red-700 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
        >
          Revoke
        </button>
      )}
    </div>
  );
}
```

---

## Task 11: Block 6 — Campaign Brief Fields (Update Business Campaign Form)

**Files:**
- Modify: `src/app/api/campaigns/route.ts` (add new fields to createCampaignSchema)
- Modify: `src/app/(business)/business/campaigns/new/page.tsx` (if exists, add brief fields)

**Step 1: Update `src/app/api/campaigns/route.ts` createCampaignSchema**

Add to the existing `createCampaignSchema`:

```typescript
const createCampaignSchema = z.object({
  // ...existing fields...
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  contentGuidelines: z.string().max(5000).optional(),
  referralLink: z.string().url("Must be a valid URL"),
  targetGeo: z.array(z.string().length(2)).min(1, "At least one geo required"),
  minFollowers: z.number().int().min(0),
  minEngagementRate: z.number().min(0).max(100),
  totalBudget: z.number().positive(),
  creatorCpv: z.number().positive(),
  adminMargin: z.number().min(0),
  deadline: z.string().datetime(),
  briefAssetUrl: z.string().url().optional(),
  // Block 2 fields
  maxSlots: z.number().int().positive().optional(),
  requiresApproval: z.boolean().optional().default(false),
  // Block 6 brief fields
  targetCountry: z.string().length(2).optional(),
  targetCountryPercent: z.number().int().min(0).max(100).optional(),
  targetMinAge18Percent: z.number().int().min(0).max(100).optional(),
  targetMalePercent: z.number().int().min(0).max(100).optional(),
  contentType: z.string().max(100).optional(),
  requirements: z.string().max(2000).optional(),
  otherNotes: z.string().max(2000).optional(),
  bannerUrl: z.string().url().optional(),
  contentAssetUrls: z.array(z.string().url()).optional().default([]),
  guidelinesUrl: z.string().url().optional(),
});
```

---

## Task 12: Block 7 — Stripe Connect Foundation

**Files:**
- Create: `src/app/api/stripe/connect/route.ts` (create onboarding link)
- Create: `src/app/api/stripe/connect/callback/route.ts` (handle return)
- Modify: `src/app/(app)/profile/page.tsx` (add Stripe connect button)

> Note: Requires `stripe` npm package. Install with: `npm install stripe`

**Step 1: Install Stripe**

```bash
npm install stripe
```

**Step 2: Create `src/app/api/stripe/connect/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-12-18.acacia" });

export async function POST() {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    include: {
      creatorProfile: true,
      networkProfile: true,
    },
  });
  if (!dbUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const profile = dbUser.creatorProfile ?? dbUser.networkProfile;
  if (!profile) return NextResponse.json({ error: "No profile" }, { status: 400 });

  let stripeAccountId = profile.stripeAccountId;

  if (!stripeAccountId) {
    const account = await stripe.accounts.create({
      type: "express",
      email: dbUser.email,
      capabilities: { transfers: { requested: true } },
    });
    stripeAccountId = account.id;

    // Store accountId
    if (dbUser.creatorProfile) {
      await prisma.creatorProfile.update({
        where: { id: dbUser.creatorProfile.id },
        data: { stripeAccountId },
      });
    } else if (dbUser.networkProfile) {
      await prisma.networkProfile.update({
        where: { id: dbUser.networkProfile.id },
        data: { stripeAccountId },
      });
    }
  }

  const accountLink = await stripe.accountLinks.create({
    account: stripeAccountId,
    refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/profile?stripe=refresh`,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/profile?stripe=success`,
    type: "account_onboarding",
  });

  return NextResponse.json({ url: accountLink.url });
}
```

---

## Task 13: Update App Layout to Route Network Users + Fix Auth

**Files:**
- Modify: `src/app/(app)/layout.tsx`
- Modify: `src/app/(admin)/admin/layout.tsx` (add networks nav item)

**Step 1: Update `src/app/(app)/layout.tsx` to redirect network users**

Add network redirect after the business check:

```typescript
if (dbUser?.role === "network") redirect("/network/dashboard");
```

**Step 2: Add "Networks" to admin sidebar nav**

Find the admin sidebar component and add a Networks link pointing to `/admin/networks`.

---

## Task 14: Network Onboarding Page

**Files:**
- Create: `src/app/onboarding/network/page.tsx` (network signup form)
- Modify: `src/app/onboarding/page.tsx` (add network option to role selection)

**Step 1: Create `src/app/onboarding/network/page.tsx`**

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NetworkOnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    companyName: "",
    contactName: "",
    website: "",
    description: "",
    networkSize: "",
    inviteCode: "",
    walletAddress: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/network", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        networkSize: form.networkSize ? parseInt(form.networkSize) : undefined,
        inviteCode: form.inviteCode.toLowerCase().replace(/\s+/g, "-"),
      }),
    });

    if (res.ok) {
      router.push("/network/dashboard");
    } else {
      const d = await res.json();
      setError(d.error ?? "Something went wrong");
      setLoading(false);
    }
  }

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-lg w-full">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Set up your network</h1>
        <p className="text-gray-500 text-sm mb-6">You&apos;ll be reviewed by our team before going live.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { key: "companyName", label: "Company / network name", required: true },
            { key: "contactName", label: "Your name", required: true },
            { key: "website", label: "Website (optional)" },
            { key: "networkSize", label: "Estimated creator count", type: "number" },
            { key: "inviteCode", label: "Invite code (e.g. clippingculture)", required: true },
            { key: "walletAddress", label: "Crypto wallet address (optional)" },
          ].map(({ key, label, required, type }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              <input
                type={type ?? "text"}
                value={form[key as keyof typeof form]}
                onChange={set(key)}
                required={required}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ))}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
            <textarea
              value={form.description}
              onChange={set("description")}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold disabled:opacity-50"
          >
            {loading ? "Submitting..." : "Apply to join"}
          </button>
        </form>
      </div>
    </div>
  );
}
```

---

## Task 15: Run Build & Fix Type Errors

**Step 1: Run type check**

```bash
cd spotmarket && npx tsc --noEmit
```

Fix any TypeScript errors that arise from the schema changes (e.g., `Payout` fields now nullable, new enum values, etc.).

Common fixes needed:
- `creatorProfileId` on `Payout` is now optional — update any code that assumed it was required
- `CampaignApplication.creatorProfileId` is now optional — update application-related queries
- New `PostStatus` enum values — update any hardcoded status strings

**Step 2: Run linter**

```bash
npx eslint . --ext .ts,.tsx
```

**Step 3: Build**

```bash
npm run build
```

---

## Task 16: Update `CampaignApplication` unique constraint

The current schema has `@@unique([campaignId, creatorProfileId])` — this will break for network applications where `creatorProfileId` is null. The new schema removes this in favor of application-level logic.

**This is already handled in the new schema** (unique constraint removed). Verify the migration handles this correctly by checking the migration SQL after running `prisma migrate dev`.

---

## Notes

- **`DATABASE_URL` vs `DATABASE_URL_DIRECT`:** Supabase provides a pooled URL (`DATABASE_URL`) for runtime queries and a direct URL (`DATABASE_URL_DIRECT`) for migrations. The `prisma.config.ts` already uses `DATABASE_URL_DIRECT` for migrations — this is correct. Just ensure both env vars are set.
- **Instagram OAuth callback:** The existing `/api/auth/instagram/callback` route (if it exists) needs to be replaced with the new one in Task 3 that handles both creator and join flows via the `state` param.
- **`NEXT_PUBLIC_INSTAGRAM_APP_ID`** env var needed for the join page client-side redirect.
- **`NEXT_PUBLIC_APP_URL`** env var needed for OAuth redirect URIs.
- **Stripe env vars needed for Block 7:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`.
