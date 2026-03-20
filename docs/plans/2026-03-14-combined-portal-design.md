# Combined Portal Design
_Date: 2026-03-14_

## Context

Spotmarket currently has two separate portals (`/creator` and `/dashboard`) with different layouts and role-gated access. The goal is to merge them into one unified `(app)` route group where all authenticated (non-admin) users can access all features: creator stats, campaign browsing, campaign management, profile, earnings, and payouts. The admin panel stays separate. Onboarding is simplified to name input + optional Instagram connect (no role picker).

---

## Architecture

### Route Groups

| Before | After |
|---|---|
| `(creator)/creator/...` | `(app)/...` |
| `(dashboard)/dashboard/...` | `(app)/dashboard/...` (merged) |
| `(admin)/admin/...` | unchanged |

### New `(app)` File Structure

```
src/app/(app)/
  layout.tsx                          ← single sidebar, auth: authenticated + not admin
  dashboard/
    page.tsx                          ← merged: creator stats + business campaign stats
  campaigns/
    page.tsx                          ← browse & apply (from creator/campaigns)
    new/
      page.tsx                        ← create campaign
      campaign-form.tsx
    [campaignId]/
      messages/
        page.tsx
        message-thread.tsx
      posts/
        page.tsx
        submit-post-form.tsx
  profile/
    page.tsx
    profile-form.tsx
  earnings/
    page.tsx
  payouts/
    page.tsx
```

### Sidebar Nav

```
Spotmarket
─────────────
Dashboard
Campaigns
Create Campaign
Profile
Earnings
Payouts
─────────────
Sign out
```

---

## Auth Guard

`(app)/layout.tsx`: redirect to `/sign-in` if not authenticated. Redirect to `/admin` if `role === "admin"`. No other role checks.

---

## Onboarding

Remove role picker. New flow:
1. Input: **Display Name** (required)
2. Input: **Instagram handle** (optional, or skip to connect later)
3. Submit → API creates both `CreatorProfile` and `BusinessProfile`, assigns `user` role → redirect to `/dashboard`

New API endpoint: `POST /api/onboarding/complete` (replaces `/api/onboarding/set-role`)

---

## Prisma Changes

Add `user` to `UserRole` enum:
```prisma
enum UserRole {
  admin
  business  // kept for existing records
  creator   // kept for existing records
  user      // new: default for all new signups
}
```

Requires Prisma migration. During onboarding, new users get `role: "user"`. The `(app)/layout.tsx` allows `role !== "admin"`.

---

## API Changes

- `DELETE /api/onboarding/set-role` → removed
- `POST /api/onboarding/complete` → new: sets `user` role, creates both profiles with displayName
- API routes currently checking `requireAuth(UserRole.creator)` or `requireAuth(UserRole.business)` → updated to `requireAuth()` (any authenticated user)

---

## Redirects (`next.config.ts`)

```
/creator              → /dashboard
/creator/campaigns    → /campaigns
/creator/campaigns/:path* → /campaigns/:path*
/creator/profile      → /profile
/creator/earnings     → /earnings
```

---

## Verification

1. Sign up → lands on `/onboarding` → fill name → lands on `/dashboard`
2. All sidebar links navigate correctly
3. `/creator/*` URLs redirect to correct new paths
4. Admin user → redirected from `(app)` to `/admin`
5. Unauthenticated user → redirected to `/sign-in`
