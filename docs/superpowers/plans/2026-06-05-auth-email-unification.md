# Auth Email Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Send ClipProfit account-verification and password-recovery emails through one localized branded Resend flow with ClipProfit-only user-facing links.

**Architecture:** A focused `src/lib/auth-email` module owns sender identity, domain-based locale selection, escaped HTML rendering, and Resend delivery. The signup route delegates verification email delivery to that module; a new password-reset API generates Supabase recovery tokens without Supabase mail, and a ClipProfit confirmation page verifies the token through an explicit POST before redirecting to the existing reset form.

**Tech Stack:** Next.js App Router, TypeScript, Supabase Auth admin API, Resend, next-intl, Vitest.

---

### Task 1: Shared auth email module

**Files:**
- Create: `src/lib/auth-email/index.ts`
- Create: `src/lib/auth-email/index.test.ts`

- [ ] **Step 1: Write failing renderer and locale tests**

Cover `.com` to English, `.nl` to Dutch, preview `x-locale` fallback, sender identity, branded HTML, escaped values, CTA/fallback links, and absence of `supabase.co`.

- [ ] **Step 2: Verify the tests fail**

Run: `npm test -- src/lib/auth-email/index.test.ts`

Expected: FAIL because `@/lib/auth-email` does not exist.

- [ ] **Step 3: Implement the minimal shared module**

Export:

```ts
export const AUTH_EMAIL_FROM = "ClipProfit <noreply@clipprofit.com>";
export function getAuthEmailLocale(request: Request): Locale;
export function renderAuthEmail(input: AuthEmailInput): string;
export async function sendAuthEmail(input: SendAuthEmailInput): Promise<void>;
```

Use localized copy for `verification` and `passwordRecovery`, escape all
interpolated values, render a hidden preview line, purple CTA, and plain fallback
URL, and throw when Resend reports an error.

- [ ] **Step 4: Verify the focused tests pass**

Run: `npm test -- src/lib/auth-email/index.test.ts`

Expected: PASS.

### Task 2: Application-owned password recovery

**Files:**
- Create: `src/app/api/auth/password-reset/route.ts`
- Create: `src/app/api/auth/password-reset/route.test.ts`
- Create: `src/app/auth/recovery/page.tsx`
- Create: `src/app/auth/recovery/recovery-form.tsx`
- Create: `src/app/api/auth/password-reset/verify/route.ts`
- Create: `src/app/api/auth/password-reset/verify/route.test.ts`
- Modify: `src/app/sign-in/sign-in-form.tsx`
- Modify: `messages/en.json`
- Modify: `messages/nl.json`

- [ ] **Step 1: Write failing API and callback tests**

Test invalid input, IP rate-limit rejection, `recovery` link generation,
ClipProfit recovery URL construction, Dutch/English locale delivery, generic
success for `user_not_found`, and explicit POST verification with
`verifyOtp({ type: "recovery" })`.

- [ ] **Step 2: Verify the tests fail**

Run:

```bash
npm test -- src/app/api/auth/password-reset/route.test.ts src/app/api/auth/password-reset/verify/route.test.ts
```

Expected: FAIL because both routes do not exist.

- [ ] **Step 3: Implement the API and callback**

The request route validates a lowercased email, applies `AUTH_LIMIT`, calls
`admin.auth.admin.generateLink({ type: "recovery", email })`, sends the shared
auth email with `/auth/recovery?token_hash=...`, and returns generic success for
unknown users. The GET page does not consume the token. Its explicit button
posts the hash to the verify route, which establishes the Supabase recovery
session before opening `/reset-password`.

- [ ] **Step 4: Replace the browser Supabase mail call**

Update `handleForgotPassword` to POST JSON to `/api/auth/password-reset` and use
the existing success/error UI. Add localized API failure and invalid recovery
messages.

- [ ] **Step 5: Verify focused tests pass**

Run:

```bash
npm test -- src/app/api/auth/password-reset/route.test.ts src/app/api/auth/password-reset/verify/route.test.ts
```

Expected: PASS.

### Task 3: Move signup verification onto the shared renderer

**Files:**
- Create: `src/app/api/auth/signup/route.test.ts`
- Modify: `src/app/api/auth/signup/route.ts`

- [ ] **Step 1: Write a failing signup mail test**

Mock ticket creation and auth user creation, then assert that signup calls
`sendAuthEmail` with `kind: "verification"`, the domain-derived locale, and the
existing ClipProfit confirmation-ticket URL.

- [ ] **Step 2: Verify the test fails**

Run: `npm test -- src/app/api/auth/signup/route.test.ts`

Expected: FAIL because signup still sends its own inline Resend HTML.

- [ ] **Step 3: Refactor signup delivery**

Remove the local Resend client and inline renderer. Resolve email locale through
`getAuthEmailLocale(request)` and delegate to `sendAuthEmail`.

- [ ] **Step 4: Verify the signup test and shared renderer tests pass**

Run:

```bash
npm test -- src/app/api/auth/signup/route.test.ts src/lib/auth-email/index.test.ts
```

Expected: PASS.

### Task 4: Full verification and delivery

**Files:**
- Modify if needed: files from Tasks 1-3 only

- [ ] **Step 1: Run all unit tests**

Run: `npm test`

Expected: 0 failed tests.

- [ ] **Step 2: Run lint**

Run: `npm run lint`

Expected: exit code 0.

- [ ] **Step 3: Run TypeScript**

Run: `npx tsc --noEmit`

Expected: exit code 0.

- [ ] **Step 4: Run production build**

Run: `npm run build`

Expected: exit code 0.

- [ ] **Step 5: Commit, push, and create a Vercel preview**

Commit only the auth-email scope on `codex/auth-email-unification`, push the
branch, deploy a preview, and inspect deployment readiness. Production remains
unchanged until preview acceptance.
