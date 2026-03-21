# Remove Business Role Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove the `business` role and `BusinessProfile` entirely — campaigns are admin-owned, users can only sign up as `creator` or `network`.

**Architecture:** Strip `BusinessProfile` from the schema, drop `Campaign.businessProfileId` FK (campaigns become admin-scoped globally), delete the `(business)` route group, and clean up every reference to `business` across API routes, layouts, and onboarding.

**Tech Stack:** Next.js App Router, Prisma + PostgreSQL (Supabase), TypeScript

---

## Scope summary

Files to **delete**:
- `src/app/(business)/` (entire directory)
- `src/app/(admin)/admin/businesses/` (entire directory)
- `src/app/api/admin/businesses/` (entire directory)
- `src/app/(app)/campaigns/new/` (creators cannot create campaigns)

Files to **modify** (listed per task below):
- `prisma/schema.prisma`
- `src/app/api/onboarding/complete/route.ts`
- `src/app/api/onboarding/set-role/route.ts`
- `src/app/onboarding/onboarding-form.tsx`
- `src/app/(app)/layout.tsx`
- `src/app/(admin)/layout.tsx`
- `src/app/(admin)/admin/campaigns/new/campaign-form.tsx`
- `src/app/(admin)/admin/campaigns/new/page.tsx`
- `src/app/(admin)/admin/campaigns/page.tsx`
- `src/app/(admin)/admin/campaigns/[campaignId]/page.tsx`
- `src/app/(admin)/admin/campaigns/[campaignId]/analytics/page.tsx`
- `src/app/(app)/campaigns/page.tsx`
- `src/app/(app)/applications/page.tsx`
- `src/app/(app)/dashboard/page.tsx`
- `src/app/(app)/campaigns/[campaignId]/messages/page.tsx`
- `src/app/(app)/campaigns/[campaignId]/messages/message-thread.tsx`
- `src/app/(app)/profile/profile-form.tsx`
- `src/app/(network)/network/campaigns/page.tsx`
- `src/app/(network)/network/campaigns/[id]/network-campaign-detail.tsx`
- `src/app/(network)/network/campaigns/[id]/page.tsx`
- `src/app/api/campaigns/route.ts`
- `src/app/api/campaigns/[campaignId]/route.ts`
- `src/app/api/campaigns/[campaignId]/applications/route.ts`
- `src/app/api/campaigns/[campaignId]/applications/[applicationId]/route.ts`
- `src/app/api/campaigns/[campaignId]/analytics/route.ts`
- `src/app/api/campaigns/[campaignId]/messages/route.ts`
- `src/app/api/campaigns/[campaignId]/report/route.ts`
- `src/app/api/campaigns/[campaignId]/invite/route.ts`
- `src/lib/instagram.ts`
- `src/app/page.tsx`
- `src/app/layout.tsx`

---

## Task 1: Update Prisma schema

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Remove `business` from `UserRole` enum**

In `schema.prisma`, change:
```prisma
enum UserRole {
  admin
  business
  creator
  network
  user
}
```
to:
```prisma
enum UserRole {
  admin
  creator
  network
  user
}
```

**Step 2: Remove `BusinessProfile` model**

Delete the entire `BusinessProfile` model block (lines 66–77 currently):
```prisma
// DELETE THIS:
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
```

**Step 3: Remove `businessProfile` relation from `User` model**

Delete this line from the `User` model:
```prisma
businessProfile  BusinessProfile?
```

**Step 4: Update `Campaign` model — remove `businessProfileId` FK**

Remove these two lines from `Campaign`:
```prisma
businessProfileId String
businessProfile   BusinessProfile @relation(fields: [businessProfileId], references: [id])
```
And remove from `@@index`:
```prisma
@@index([businessProfileId])
```

**Step 5: Verify schema parses**

```bash
cd spotmarket
npx prisma validate
```
Expected: `The schema at prisma/schema.prisma is valid`

**Step 6: Generate migration**

```bash
npx prisma migrate dev --name remove-business-role
```
Expected: Migration created and applied. If it asks to confirm data loss on `BusinessProfile` table, type `yes`.

**Step 7: Regenerate Prisma client**

```bash
npx prisma generate
```

**Step 8: Commit**

```bash
git add prisma/
git commit -m "feat: remove BusinessProfile model and business role from schema"
```

---

## Task 2: Delete dead route groups and pages

**Files:**
- Delete: `src/app/(business)/` (entire directory)
- Delete: `src/app/(admin)/admin/businesses/` (entire directory)
- Delete: `src/app/api/admin/businesses/` (entire directory)
- Delete: `src/app/(app)/campaigns/new/` (entire directory)

**Step 1: Delete the business route group**

```bash
rm -rf "spotmarket/src/app/(business)"
```

**Step 2: Delete admin businesses pages**

```bash
rm -rf "spotmarket/src/app/(admin)/admin/businesses"
```

**Step 3: Delete admin businesses API**

```bash
rm -rf "spotmarket/src/app/api/admin/businesses"
```

**Step 4: Delete creator campaign-creation pages**

```bash
rm -rf "spotmarket/src/app/(app)/campaigns/new"
```

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: delete business route group and creator campaign-creation pages"
```

---

## Task 3: Fix onboarding — remove business option

**Files:**
- Modify: `src/app/onboarding/onboarding-form.tsx`
- Modify: `src/app/api/onboarding/complete/route.ts`
- Modify: `src/app/api/onboarding/set-role/route.ts`

**Step 1: Update `onboarding-form.tsx`**

Change `selectedRole` type from `"creator" | "business" | null` to `"creator" | null`.

Remove the entire `"business"` button block:
```tsx
// DELETE THIS BUTTON:
<button
  type="button"
  onClick={() => setSelectedRole("business")}
  ...
>
  <p className="font-semibold">Business</p>
  <p className="text-xs mt-1">Launch and manage campaigns</p>
</button>
```

Change the redirect after submit:
```tsx
// FROM:
router.push(selectedRole === "business" ? "/business" : "/dashboard");
// TO:
router.push("/dashboard");
```

**Step 2: Update `api/onboarding/complete/route.ts`**

Remove the `businessProfile` include and creation block. New file:

```typescript
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const displayName = (body.displayName as string)?.trim();

  if (!displayName) {
    return NextResponse.json({ error: "Display name is required" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  await admin.auth.admin.updateUserById(authUser.id, {
    user_metadata: { role: UserRole.creator },
  });

  const user = await prisma.user.upsert({
    where: { supabaseId: authUser.id },
    update: { role: UserRole.creator },
    create: { supabaseId: authUser.id, email: authUser.email ?? "", role: UserRole.creator },
    include: { creatorProfile: true },
  });

  if (!user.creatorProfile) {
    await prisma.creatorProfile.create({
      data: { userId: user.id, displayName },
    });
  }

  return NextResponse.json({ success: true });
}
```

**Step 3: Update `api/onboarding/set-role/route.ts`**

Change `ALLOWED_ROLES` to only allow `creator` and `network`:
```typescript
const ALLOWED_ROLES: UserRole[] = [UserRole.creator, UserRole.network];
```

Remove the `businessProfile` include and the business profile creation block:
```typescript
// FROM:
include: { creatorProfile: true, businessProfile: true },
// TO:
include: { creatorProfile: true },
```

Delete the entire `if (role === UserRole.business)` block.

**Step 4: Commit**

```bash
git add src/app/onboarding/ src/app/api/onboarding/
git commit -m "feat: remove business option from onboarding flow"
```

---

## Task 4: Fix app layout — remove business redirect

**Files:**
- Modify: `src/app/(app)/layout.tsx`

**Step 1: Remove the business redirect**

Delete these lines:
```typescript
if (dbUser?.role === "business") redirect("/business");
```

The full `dbUser` query now only needs to check for `network` redirect, but we still need it for that. Keep the query, just remove the business line.

**Step 2: Commit**

```bash
git add src/app/(app)/layout.tsx
git commit -m "fix: remove business role redirect from app layout"
```

---

## Task 5: Fix admin campaigns — remove businessProfileId

**Files:**
- Modify: `src/app/(admin)/admin/campaigns/new/campaign-form.tsx`
- Modify: `src/app/(admin)/admin/campaigns/new/page.tsx`
- Modify: `src/app/(admin)/admin/campaigns/page.tsx`
- Modify: `src/app/(admin)/admin/campaigns/[campaignId]/page.tsx`
- Modify: `src/app/(admin)/admin/campaigns/[campaignId]/analytics/page.tsx`
- Modify: `src/app/(admin)/layout.tsx`

**Step 1: Read each file** to understand exactly what references `businessProfileId`, `BusinessProfile`, or business role.

**Step 2: In campaign-form.tsx** — remove any `businessProfileId` field from the form and from the POST body sent to the API.

**Step 3: In new/page.tsx** — remove any query that fetches `BusinessProfile` records to populate a dropdown.

**Step 4: In campaigns/page.tsx** — remove any `include: { businessProfile: true }` from Prisma queries and remove business-related columns from the table display.

**Step 5: In [campaignId]/page.tsx and analytics/page.tsx** — remove `businessProfile` from includes and from the rendered UI.

**Step 6: In admin layout.tsx** — remove any link to `/admin/businesses`.

**Step 7: Confirm TypeScript compiles**

```bash
cd spotmarket && npx tsc --noEmit
```
Fix any remaining type errors.

**Step 8: Commit**

```bash
git add src/app/(admin)/
git commit -m "fix: remove businessProfile references from admin campaign pages"
```

---

## Task 6: Fix campaign API routes — remove business ownership

**Files:**
- Modify: `src/app/api/campaigns/route.ts`
- Modify: `src/app/api/campaigns/[campaignId]/route.ts`
- Modify: `src/app/api/campaigns/[campaignId]/applications/route.ts`
- Modify: `src/app/api/campaigns/[campaignId]/applications/[applicationId]/route.ts`
- Modify: `src/app/api/campaigns/[campaignId]/analytics/route.ts`
- Modify: `src/app/api/campaigns/[campaignId]/messages/route.ts`
- Modify: `src/app/api/campaigns/[campaignId]/report/route.ts`
- Modify: `src/app/api/campaigns/[campaignId]/invite/route.ts`

**Step 1: In `campaigns/route.ts` (GET — public campaign list)**

Remove any `include: { businessProfile: true }` from the Prisma query and remove business fields from the response shape.

**Step 2: In `campaigns/route.ts` (POST — create campaign)**

Campaigns are now admin-only. Change the auth check to `requireAuth(UserRole.admin)`. Remove `businessProfileId` from the create payload entirely.

```typescript
// FROM: data: { businessProfileId: ..., name, ... }
// TO:   data: { name, ... }  (no businessProfileId)
```

**Step 3: In `[campaignId]/route.ts`**

Remove business ownership checks — only `admin` can PATCH/DELETE. Remove `businessProfile` from includes.

**Step 4: In `[campaignId]/applications/route.ts`**

Remove any check that prevents non-business users from viewing applications. Keep creator/network auth checks as-is.

**Step 5: Repeat for remaining routes**

For each remaining route file: remove `businessProfile` includes, remove business role checks, keep admin/creator/network checks.

**Step 6: Confirm TypeScript compiles**

```bash
cd spotmarket && npx tsc --noEmit
```

**Step 7: Commit**

```bash
git add src/app/api/campaigns/
git commit -m "fix: remove business ownership from campaign API routes"
```

---

## Task 7: Fix creator-facing pages

**Files:**
- Modify: `src/app/(app)/campaigns/page.tsx`
- Modify: `src/app/(app)/applications/page.tsx`
- Modify: `src/app/(app)/dashboard/page.tsx`
- Modify: `src/app/(app)/campaigns/[campaignId]/messages/page.tsx`
- Modify: `src/app/(app)/campaigns/[campaignId]/messages/message-thread.tsx`
- Modify: `src/app/(app)/profile/profile-form.tsx`

**Step 1: Read each file** and remove any reference to `businessProfile`, `BusinessProfile`, or business role checks.

**Step 2: In `campaigns/page.tsx`** — remove business-name display from campaign cards if it was sourced from `businessProfile.companyName`. Replace with the campaign name or remove the field entirely.

**Step 3: In `message-thread.tsx`** — messages currently may check if sender is a business. Replace any business-role-specific rendering with admin-role checks.

**Step 4: In `profile-form.tsx`** — remove any business-related fields.

**Step 5: Commit**

```bash
git add src/app/(app)/
git commit -m "fix: remove business references from creator-facing pages"
```

---

## Task 8: Fix network-facing pages

**Files:**
- Modify: `src/app/(network)/network/campaigns/page.tsx`
- Modify: `src/app/(network)/network/campaigns/[id]/network-campaign-detail.tsx`
- Modify: `src/app/(network)/network/campaigns/[id]/page.tsx`

**Step 1: Read each file** and remove `businessProfile` includes and display.

**Step 2: Commit**

```bash
git add src/app/(network)/
git commit -m "fix: remove business references from network-facing pages"
```

---

## Task 9: Fix remaining files

**Files:**
- Modify: `src/lib/instagram.ts`
- Modify: `src/app/page.tsx`
- Modify: `src/app/layout.tsx`

**Step 1: Read each file** and remove business-role checks or businessProfile references.

**Step 2: In `layout.tsx`** — remove any business role redirects or meta.

**Step 3: Final TypeScript check**

```bash
cd spotmarket && npx tsc --noEmit
```

All errors must be zero before continuing.

**Step 4: Commit**

```bash
git add src/lib/ src/app/layout.tsx src/app/page.tsx
git commit -m "fix: clean up remaining business role references"
```

---

## Task 10: Smoke test

**Step 1: Start dev server**

```bash
cd spotmarket && npm run dev
```

**Step 2: Test creator signup flow**

1. Go to `/sign-up`, create account
2. Should land on `/onboarding` — confirm only "Creator" and "Network Owner" options are shown (no "Business")
3. Select Creator, enter name, submit
4. Should redirect to `/dashboard`

**Step 3: Test campaign visibility**

1. Log in as admin, go to `/admin/campaigns`
2. Confirm campaigns list loads without errors
3. Open a campaign detail — confirm no broken references

**Step 4: Test creator campaign browsing**

1. Log in as creator, go to `/campaigns`
2. Confirm campaigns list loads
3. Confirm "New campaign" link in sidebar is gone

**Step 5: Final commit**

```bash
git add -A
git commit -m "chore: smoke test complete — business role refactor done"
```
