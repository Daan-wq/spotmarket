# RBAC Permissions Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Lock down role-based access so admins can only be created in the database, business accounts require admin approval before creating campaigns, and every API enforces the correct permissions.

**Architecture:** `requireAuth()` / `checkRole()` in `src/lib/auth.ts` read role from the Prisma DB — this is the single source of truth. The admin layout currently reads `user_metadata.role` from Supabase instead, which breaks for DB-created admins. All fixes flow through the existing `requireAuth` utility. No new auth libraries needed.

**Tech Stack:** Next.js App Router, Prisma, Supabase Auth, TypeScript

---

## RBAC Matrix (source of truth for all tasks below)

| Role | Created by | /admin panel | Create campaign | Apply to campaign | Needs approval |
|------|-----------|--------------|-----------------|-------------------|----------------|
| `admin` | DB only (SQL/Supabase dashboard) | ✓ | ✓ | ✗ | — |
| `business` | Frontend signup | ✗ | ✓ if approved | ✗ | Yes — admin must approve |
| `creator` | Frontend signup | ✗ | ✗ | ✓ | No |
| `network` | Network invite flow | ✗ | ✗ | ✓ via network | Yes — already has isApproved |
| `user` | Default before onboarding | ✗ | ✗ | ✗ | — |

---

## Task 1: Fix admin layout gate — read role from DB not Supabase metadata

**The bug:** `src/app/(admin)/layout.tsx` checks `user?.user_metadata?.role !== "admin"`. When an admin account is created directly in the database (as intended), their Supabase `user_metadata` is never updated, so they can't log in to the admin panel.

**Fix:** Replace the metadata check with `checkRole("admin")` which reads from Prisma.

**Files:**
- Modify: `src/app/(admin)/layout.tsx`

**Step 1: Replace the auth check**

Find this block in `layout.tsx`:
```tsx
const supabase = await createSupabaseServerClient();
const { data: { user } } = await supabase.auth.getUser();
if (user?.user_metadata?.role !== "admin") redirect("/unauthorized");

const initials = user.email?.slice(0, 1).toUpperCase() ?? "A";
```

Replace with:
```tsx
const supabase = await createSupabaseServerClient();
const { data: { user } } = await supabase.auth.getUser();
if (!user) redirect("/sign-in");

const isAdmin = await checkRole("admin");
if (!isAdmin) redirect("/unauthorized");

const initials = user.email?.slice(0, 1).toUpperCase() ?? "A";
```

Also add the import at the top of the file:
```tsx
import { checkRole } from "@/lib/auth";
```

**Step 2: Verify type check passes**

```bash
cd spotmarket && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors

---

## Task 2: Require business approval before campaign creation

**The bug:** `POST /api/campaigns` allows any user with `role === "business"` to create campaigns immediately. Business accounts need admin approval first.

**Files:**
- Modify: `src/app/api/campaigns/route.ts`

**Step 1: Add the approval check**

In the `POST` handler, find this block (around line 93–104):
```ts
const user = await prisma.user.findUnique({
  where: { supabaseId: authUser.id },
  include: { businessProfile: { select: { id: true } } },
});

if (!user || (user.role !== "admin" && user.role !== "business")) {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

if (!user.businessProfile) {
  return NextResponse.json({ error: "Business profile required" }, { status: 400 });
}
```

Replace with:
```ts
const user = await prisma.user.findUnique({
  where: { supabaseId: authUser.id },
  include: { businessProfile: { select: { id: true, isApproved: true } } },
});

if (!user || (user.role !== "admin" && user.role !== "business")) {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

if (!user.businessProfile) {
  return NextResponse.json({ error: "Business profile required" }, { status: 400 });
}

if (user.role === "business" && !user.businessProfile.isApproved) {
  return NextResponse.json(
    { error: "Your account is pending admin approval. You'll be notified when it's approved." },
    { status: 403 }
  );
}
```

**Step 2: Verify type check passes**

```bash
cd spotmarket && npx tsc --noEmit 2>&1 | head -20
```

---

## Task 3: Admin API route to approve/reject business accounts

Pattern follows the existing `PATCH /api/admin/networks/[id]` approval route.

**Files:**
- Create: `src/app/api/admin/businesses/[id]/route.ts`

**Step 1: Create the route**

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { z } from "zod";

const patchSchema = z.object({
  isApproved: z.boolean(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth("admin");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  const profile = await prisma.businessProfile.update({
    where: { id },
    data: { isApproved: parsed.data.isApproved },
    include: { user: { select: { email: true } } },
  });

  return NextResponse.json({ profile });
}
```

**Step 2: Verify type check passes**

```bash
cd spotmarket && npx tsc --noEmit 2>&1 | head -20
```

---

## Task 4: Admin page — Business Accounts (/admin/businesses)

Shows all `BusinessProfile` accounts with approval status. Admin can approve or reject from here.

**Files:**
- Create: `src/app/(admin)/admin/businesses/page.tsx`
- Create: `src/app/(admin)/admin/businesses/business-approve-button.tsx`

**Step 1: Create the approve/reject button (client component)**

```tsx
// src/app/(admin)/admin/businesses/business-approve-button.tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface BusinessApproveButtonProps {
  businessProfileId: string;
  isApproved: boolean;
}

export function BusinessApproveButton({ businessProfileId, isApproved }: BusinessApproveButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    await fetch(`/api/admin/businesses/${businessProfileId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isApproved: !isApproved }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`text-xs px-3 py-1 rounded-md font-medium transition-colors disabled:opacity-50 ${
        isApproved
          ? "bg-red-50 text-red-600 hover:bg-red-100"
          : "bg-green-50 text-green-700 hover:bg-green-100"
      }`}
    >
      {loading ? "…" : isApproved ? "Revoke" : "Approve"}
    </button>
  );
}
```

**Step 2: Create the page**

```tsx
// src/app/(admin)/admin/businesses/page.tsx
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/admin/page-header";
import { StatCards } from "@/components/admin/stat-cards";
import { EmptyState } from "@/components/admin/empty-state";
import { BusinessApproveButton } from "./business-approve-button";

export default async function AdminBusinessesPage() {
  const businesses = await prisma.businessProfile.findMany({
    include: {
      user: { select: { email: true, createdAt: true } },
      _count: { select: { campaigns: true } },
    },
    orderBy: { user: { createdAt: "desc" } },
  });

  const approved = businesses.filter((b) => b.isApproved).length;
  const pending = businesses.filter((b) => !b.isApproved).length;

  return (
    <div className="p-8 max-w-5xl">
      <PageHeader
        title="Business Accounts"
        subtitle="Frontend-registered business accounts that need approval before creating campaigns"
      />
      <StatCards
        stats={[
          { label: "Total", value: businesses.length },
          { label: "Approved", value: approved },
          { label: "Pending approval", value: pending },
          { label: "With campaigns", value: businesses.filter((b) => b._count.campaigns > 0).length },
        ]}
      />

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-2.5 border-b border-gray-100">
          {["Company", "Email", "Campaigns", "Status", ""].map((h) => (
            <p key={h} className="text-[13px] text-gray-400">{h}</p>
          ))}
        </div>

        {businesses.length === 0 ? (
          <EmptyState
            icon={
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" />
              </svg>
            }
            title="No business accounts yet"
            description="When brands sign up via the frontend, they'll appear here for approval."
          />
        ) : (
          <div>
            {businesses.map((b, i) => (
              <div
                key={b.id}
                className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 items-center px-5 py-3 hover:bg-gray-50"
                style={{ borderTop: i > 0 ? "1px solid #f8fafc" : undefined }}
              >
                <p className="text-[14px] font-medium text-gray-900 truncate">{b.companyName}</p>
                <p className="text-[13px] text-gray-500 whitespace-nowrap">{b.user.email}</p>
                <p className="text-[14px] text-gray-500 text-center">{b._count.campaigns}</p>
                <span
                  className={`text-xs px-2 py-0.5 rounded-md font-medium whitespace-nowrap ${
                    b.isApproved ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {b.isApproved ? "Approved" : "Pending"}
                </span>
                <BusinessApproveButton businessProfileId={b.id} isApproved={b.isApproved} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## Task 5: Add "Businesses" to the admin sidebar nav

**Files:**
- Modify: `src/app/(admin)/layout.tsx`

**Step 1: Add the route to the CLIENTS section**

Find:
```tsx
  {
    label: "CLIENTS",
    items: [{ href: "/admin/clients", label: "Brands" }],
  },
```

Replace with:
```tsx
  {
    label: "CLIENTS",
    items: [
      { href: "/admin/businesses", label: "Business accounts" },
      { href: "/admin/clients", label: "Direct clients" },
    ],
  },
```

---

## Task 6: Final type check

```bash
cd spotmarket && npx tsc --noEmit 2>&1
```

Expected: zero errors.

---

## How to create an admin in the database

Since admins cannot be created from the frontend, use one of these approaches:

**Option A — Supabase dashboard SQL editor:**
```sql
-- 1. Find the user's Prisma ID after they sign up normally
SELECT id, email FROM "User" WHERE email = 'yourname@email.com';

-- 2. Update their role to admin
UPDATE "User" SET role = 'admin' WHERE email = 'yourname@email.com';
```

**Option B — Supabase Table Editor:**
1. Go to Table Editor → `User` table
2. Find the row by email
3. Change `role` column value from `creator`/`business`/`user` to `admin`

After updating the DB, the user can immediately access `/admin` — no Supabase metadata update needed (Task 1 fixes this).
