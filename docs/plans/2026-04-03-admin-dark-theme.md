# Admin Dashboard Dark Theme Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate the admin UI to a full dark theme matching app.clipprofit.com — Lexend font, `#6366F1` indigo accent, dark backgrounds — by updating CSS tokens and sweeping hardcoded Tailwind color classes across all 39 admin pages.

**Architecture:** Token-first approach: update `globals.css` CSS variables to dark theme values, load Lexend font in the Next.js root layout, then grep-and-replace all hardcoded Tailwind color utilities (bg-white, bg-gray-*, text-gray-*, border-gray-*, bg-blue-*) across admin pages and components with CSS-variable-driven equivalents. Shared admin components (`sidebar`, `page-header`, `stat-cards`, `empty-state`) already use CSS variables so they need only visual tuning; individual page files are the main sweep target.

**Tech Stack:** Next.js 15 App Router, Tailwind CSS v4, `next/font/google` (Lexend), CSS custom properties

---

## Task 1: Load Lexend font and update root layout

**Files:**
- Modify: `appClipprofit/src/app/layout.tsx`

**Step 1: Find the root layout**

Read `appClipprofit/src/app/layout.tsx` to see current font setup.

**Step 2: Add Lexend font**

Import and configure Lexend from `next/font/google`. Replace whatever font is currently loaded:

```tsx
import { Lexend } from "next/font/google";

const lexend = Lexend({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});
```

Add `lexend.variable` to the `<html>` className.

**Step 3: Verify**

Run the dev server (`npm run dev` in `appClipprofit/`), open any admin page, and confirm in DevTools that the body font-family resolves to `Lexend`.

**Step 4: Commit**

```bash
git add appClipprofit/src/app/layout.tsx
git commit -m "style: load Lexend font for admin dark theme"
```

---

## Task 2: Replace CSS design tokens with dark theme values

**Files:**
- Modify: `appClipprofit/src/app/globals.css`

**Step 1: Replace the `:root` token block**

Replace the entire `:root { ... }` section with these dark-theme values:

```css
:root {
  /* Font */
  --font-sans: var(--font-sans, 'Lexend', system-ui, sans-serif);

  /* Backgrounds */
  --bg-primary: #0a0a0a;
  --bg-secondary: #161616;
  --bg-card: #111111;
  --bg-card-hover: #1a1a1a;
  --bg-elevated: #161616;

  /* Primary Indigo */
  --primary: #6366F1;
  --primary-hover: #4f46e5;
  --primary-gradient-light: #6366F1;
  --primary-gradient-dark: #4f46e5;
  --primary-accent: #5855eb;
  --primary-deep: #3730a3;
  --secondary: #818cf8;

  /* Accent */
  --accent: #6366F1;
  --accent-hover: #4f46e5;
  --accent-muted: rgba(99, 102, 241, 0.15);
  --accent-bg: rgba(99, 102, 241, 0.12);
  --accent-foreground: #a5b4fc;
  --accent-glow: 0 0 40px rgba(99, 102, 241, 0.2);

  /* Text */
  --text-primary: #f1f5f9;
  --text-secondary: #94a3b8;
  --text-muted: #64748b;
  --card-foreground: #e2e8f0;

  /* Muted */
  --muted: #1e293b;

  /* Borders */
  --border: rgba(255, 255, 255, 0.07);
  --border-default: rgba(255, 255, 255, 0.07);
  --border-hover: rgba(255, 255, 255, 0.12);
  --border-active: #6366F1;

  /* Dark mode (auth panels) — now same as root */
  --dark-bg: #0a0a0a;
  --dark-card: #111111;
  --dark-panel: #111111;
  --dark-text: #64748b;
  --dark-text-light: #94a3b8;

  /* Radius */
  --radius: 1.5rem;
  --radius-sm: 8px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-xl: 16px;
  --radius-pill: 9999px;

  /* Shadows */
  --shadow-card: 0 1px 3px rgba(0, 0, 0, 0.4), 0 4px 12px rgba(0, 0, 0, 0.3);
  --shadow-glow: 0 0 40px rgba(99, 102, 241, 0.2);

  /* Transitions */
  --transition-fast: 150ms ease;
  --transition-default: 250ms ease;
  --transition-slow: 400ms ease;

  /* Sidebar */
  --sidebar-bg: #0d0d0d;
  --sidebar-border: rgba(255, 255, 255, 0.06);
  --sidebar-item: #64748b;
  --sidebar-item-hover: #cbd5e1;
  --sidebar-hover-bg: rgba(255, 255, 255, 0.05);
  --sidebar-active-bg: rgba(99, 102, 241, 0.15);
  --sidebar-active-text: #818cf8;

  /* Status */
  --success: #22c55e;
  --success-bg: rgba(34, 197, 94, 0.1);
  --success-text: #4ade80;
  --warning: #f59e0b;
  --warning-bg: rgba(245, 158, 11, 0.1);
  --warning-text: #fbbf24;
  --error: #ef4444;
  --error-bg: rgba(239, 68, 68, 0.1);
  --error-text: #f87171;
}
```

Also update the status badge utility classes added in `@layer components` to use these tokens instead of bg-green-50 etc., and update the `.gradient-card` to use dark values:

```css
.gradient-card {
  background: linear-gradient(180deg, #111111 0%, #0d0d0d 100%);
}
```

**Step 2: Verify token changes**

Open admin dashboard in browser. The background should go dark immediately. Cards, sidebar, and text using CSS variables will update automatically.

**Step 3: Commit**

```bash
git add appClipprofit/src/app/globals.css
git commit -m "style: apply dark theme CSS tokens — indigo #6366F1, dark backgrounds"
```

---

## Task 3: Update shared admin components

These 5 files already use CSS variables, but may have small hardcoded classes to clean up.

**Files:**
- Modify: `appClipprofit/src/components/admin/page-header.tsx`
- Modify: `appClipprofit/src/components/admin/stat-cards.tsx`
- Modify: `appClipprofit/src/components/admin/empty-state.tsx`
- Modify: `appClipprofit/src/components/admin/admin-nav-link.tsx`
- Modify: `appClipprofit/src/app/(admin)/_components/admin-sidebar.tsx`

**Step 1: Fix `stat-cards.tsx`**

Change `rounded-md` → `rounded-xl` for the card style (matches new design):
```tsx
className="rounded-xl px-4 py-[14px]"
```

**Step 2: Fix `empty-state.tsx`**

The outline button has a hardcoded `text-gray-600`. Replace:
```tsx
// Before
variant === "primary" ? "text-white" : "text-gray-600"
// After
variant === "primary" ? "text-white" : ""
```
(color is handled by the inline style's `color: "var(--text-secondary)"`)

**Step 3: Fix admin sidebar**

The sidebar currently uses `var(--bg-elevated)` and `var(--border)` for the light theme. With the new dark tokens these will already look correct, but update the sidebar to use the dedicated sidebar tokens explicitly:

```tsx
// aside element
style={{
  background: "var(--sidebar-bg)",
  borderRight: "1px solid var(--sidebar-border)",
}}

// logo border
style={{ borderBottom: "1px solid var(--sidebar-border)" }}

// footer border
style={{ borderTop: "1px solid var(--sidebar-border)" }}

// section label text
style={{ color: "var(--sidebar-item)" }}

// active link
style={{
  color: "var(--sidebar-active-text)",
  background: "var(--sidebar-active-bg)",
}}

// inactive link
style={{ color: "var(--sidebar-item)" }}

// hover handlers
onMouseEnter: color → "var(--sidebar-item-hover)", background → "var(--sidebar-hover-bg)"
onMouseLeave: color → "var(--sidebar-item)", background → "transparent"
```

**Step 4: Commit**

```bash
git add appClipprofit/src/components/admin/ appClipprofit/src/app/\(admin\)/_components/
git commit -m "style: update shared admin components for dark theme"
```

---

## Task 4: Sweep hardcoded light classes in admin pages — batch 1 (dashboard, campaigns)

The key pattern: replace light-theme hardcoded Tailwind with CSS-variable-based equivalents.

**Replacement mapping (apply everywhere):**

| Old class | Replacement |
|---|---|
| `bg-white` | `style={{ background: "var(--bg-elevated)" }}` |
| `bg-gray-50` | `style={{ background: "var(--bg-secondary)" }}` |
| `bg-gray-100` | `style={{ background: "var(--bg-secondary)" }}` |
| `text-gray-900` | `style={{ color: "var(--text-primary)" }}` |
| `text-gray-500` | `style={{ color: "var(--text-secondary)" }}` |
| `text-gray-400` | `style={{ color: "var(--text-muted)" }}` |
| `border-gray-200` | `style={{ borderColor: "var(--border)" }}` (or use `border border-[--border]`) |
| `border-gray-100` | same as above |
| `divide-gray-100` | keep divide, override color with CSS |
| `hover:bg-gray-50` | `hover:bg-[var(--bg-card-hover)]` or inline |
| `bg-blue-50` | `style={{ background: "var(--accent-bg)" }}` |
| `text-blue-700` | `style={{ color: "var(--accent-foreground)" }}` |
| `text-blue-600` | `style={{ color: "var(--accent)" }}` |
| `bg-blue-600` | `style={{ background: "var(--accent)" }}` |
| `hover:bg-blue-700` | `style={{ background: "var(--accent-hover)" }}` |
| `border-blue-200` | `style={{ borderColor: "var(--accent-muted)" }}` |
| `divide-blue-50` | remove, use border token |
| `bg-green-50` | `style={{ background: "var(--success-bg)" }}` |
| `text-green-700` | `style={{ color: "var(--success-text)" }}` |
| `bg-amber-50` | `style={{ background: "var(--warning-bg)" }}` |
| `text-amber-700` | `style={{ color: "var(--warning-text)" }}` |
| `bg-red-50` | `style={{ background: "var(--error-bg)" }}` |
| `text-red-700` | `style={{ color: "var(--error-text)" }}` |
| `text-red-500` | `style={{ color: "var(--error)" }}` |

**Files:**
- Modify: `appClipprofit/src/app/(admin)/admin/page.tsx`
- Modify: `appClipprofit/src/app/(admin)/admin/campaigns/page.tsx`
- Modify: `appClipprofit/src/app/(admin)/admin/campaigns/new/page.tsx`
- Modify: `appClipprofit/src/app/(admin)/admin/campaigns/[campaignId]/page.tsx`
- Modify: `appClipprofit/src/app/(admin)/admin/campaigns/[campaignId]/review/page.tsx`
- Modify: `appClipprofit/src/app/(admin)/admin/campaigns/[campaignId]/analytics/page.tsx`
- Modify: `appClipprofit/src/app/(admin)/admin/campaigns/[campaignId]/report/page.tsx`

**Step 1: Run grep to find all hardcoded classes in these files**

```bash
cd appClipprofit && grep -rn "bg-white\|bg-gray-\|text-gray-\|border-gray-\|bg-blue-\|text-blue-\|bg-green-\|text-green-\|bg-amber-\|text-amber-\|bg-red-\|text-red-" src/app/\(admin\)/admin/campaigns/ src/app/\(admin\)/admin/page.tsx
```

**Step 2: Apply replacements** using the mapping table above. Read each file, identify each instance, replace with variable-based equivalent.

**Step 3: Commit**

```bash
git add appClipprofit/src/app/\(admin\)/admin/page.tsx appClipprofit/src/app/\(admin\)/admin/campaigns/
git commit -m "style: dark theme sweep — dashboard + campaigns pages"
```

---

## Task 5: Sweep hardcoded light classes — batch 2 (clients, creators, networks, pages)

**Files:**
- `appClipprofit/src/app/(admin)/admin/clients/page.tsx`
- `appClipprofit/src/app/(admin)/admin/clients/new/page.tsx`
- `appClipprofit/src/app/(admin)/admin/clients/[id]/page.tsx`
- `appClipprofit/src/app/(admin)/admin/clients/[id]/edit/page.tsx`
- `appClipprofit/src/app/(admin)/admin/creators/page.tsx`
- `appClipprofit/src/app/(admin)/admin/creators/[id]/page.tsx`
- `appClipprofit/src/app/(admin)/admin/networks/page.tsx`
- `appClipprofit/src/app/(admin)/admin/networks/[id]/page.tsx`
- `appClipprofit/src/app/(admin)/admin/pages/page.tsx`
- `appClipprofit/src/app/(admin)/admin/pages/new/page.tsx`
- `appClipprofit/src/app/(admin)/admin/pages/[id]/page.tsx`
- `appClipprofit/src/app/(admin)/admin/pages/[id]/edit/page.tsx`

**Step 1: Grep for hardcoded classes**

```bash
cd appClipprofit && grep -rn "bg-white\|bg-gray-\|text-gray-\|border-gray-\|bg-blue-\|text-blue-\|bg-green-\|text-green-\|bg-amber-\|text-amber-\|bg-red-\|text-red-" src/app/\(admin\)/admin/clients/ src/app/\(admin\)/admin/creators/ src/app/\(admin\)/admin/networks/ src/app/\(admin\)/admin/pages/
```

**Step 2: Apply replacements** using the mapping table from Task 4.

**Step 3: Commit**

```bash
git add appClipprofit/src/app/\(admin\)/admin/clients/ appClipprofit/src/app/\(admin\)/admin/creators/ appClipprofit/src/app/\(admin\)/admin/networks/ appClipprofit/src/app/\(admin\)/admin/pages/
git commit -m "style: dark theme sweep — clients, creators, networks, pages"
```

---

## Task 6: Sweep hardcoded light classes — batch 3 (money + ops)

**Files:**
- `appClipprofit/src/app/(admin)/admin/payouts/page.tsx`
- `appClipprofit/src/app/(admin)/admin/invoices/page.tsx`
- `appClipprofit/src/app/(admin)/admin/finances/page.tsx`
- `appClipprofit/src/app/(admin)/admin/finances/new/page.tsx`
- `appClipprofit/src/app/(admin)/admin/submissions/page.tsx`
- `appClipprofit/src/app/(admin)/admin/ops-pages/page.tsx`
- `appClipprofit/src/app/(admin)/admin/ops-pages/new/page.tsx`
- `appClipprofit/src/app/(admin)/admin/ops-pages/[id]/page.tsx`
- `appClipprofit/src/app/(admin)/admin/ops-pages/[id]/edit/page.tsx`

**Step 1: Grep for hardcoded classes**

```bash
cd appClipprofit && grep -rn "bg-white\|bg-gray-\|text-gray-\|border-gray-\|bg-blue-\|text-blue-\|bg-green-\|text-green-\|bg-amber-\|text-amber-\|bg-red-\|text-red-" src/app/\(admin\)/admin/payouts/ src/app/\(admin\)/admin/invoices/ src/app/\(admin\)/admin/finances/ src/app/\(admin\)/admin/submissions/ src/app/\(admin\)/admin/ops-pages/
```

**Step 2: Apply replacements** using the mapping table from Task 4.

**Step 3: Commit**

```bash
git add appClipprofit/src/app/\(admin\)/admin/payouts/ appClipprofit/src/app/\(admin\)/admin/invoices/ appClipprofit/src/app/\(admin\)/admin/finances/ appClipprofit/src/app/\(admin\)/admin/submissions/ appClipprofit/src/app/\(admin\)/admin/ops-pages/
git commit -m "style: dark theme sweep — payouts, invoices, finances, submissions, ops"
```

---

## Task 7: Sweep hardcoded light classes — batch 4 (agency + internal)

**Files:**
- `appClipprofit/src/app/(admin)/admin/scouting/page.tsx`
- `appClipprofit/src/app/(admin)/admin/scouting/new/page.tsx`
- `appClipprofit/src/app/(admin)/admin/scouting/[id]/page.tsx`
- `appClipprofit/src/app/(admin)/admin/deals/page.tsx`
- `appClipprofit/src/app/(admin)/admin/deals/new/page.tsx`
- `appClipprofit/src/app/(admin)/admin/deals/[id]/page.tsx`
- `appClipprofit/src/app/(admin)/admin/agency-kpis/page.tsx`
- `appClipprofit/src/app/(admin)/admin/internal-campaigns/page.tsx`
- `appClipprofit/src/app/(admin)/admin/internal-campaigns/new/page.tsx`
- `appClipprofit/src/app/(admin)/admin/internal-campaigns/[id]/page.tsx`
- `appClipprofit/src/app/(admin)/admin/internal-campaigns/[id]/edit/page.tsx`

**Step 1: Grep for hardcoded classes**

```bash
cd appClipprofit && grep -rn "bg-white\|bg-gray-\|text-gray-\|border-gray-\|bg-blue-\|text-blue-\|bg-green-\|text-green-\|bg-amber-\|text-amber-\|bg-red-\|text-red-" src/app/\(admin\)/admin/scouting/ src/app/\(admin\)/admin/deals/ src/app/\(admin\)/admin/agency-kpis/ src/app/\(admin\)/admin/internal-campaigns/
```

**Step 2: Apply replacements** using the mapping table from Task 4.

**Step 3: Commit**

```bash
git add appClipprofit/src/app/\(admin\)/admin/scouting/ appClipprofit/src/app/\(admin\)/admin/deals/ appClipprofit/src/app/\(admin\)/admin/agency-kpis/ appClipprofit/src/app/\(admin\)/admin/internal-campaigns/
git commit -m "style: dark theme sweep — scouting, deals, agency KPIs, internal campaigns"
```

---

## Task 8: Update status badge map pattern

Several pages use the inline `statusBadge` map with Tailwind color classes. This is a recurring pattern. Search and update all instances.

**Step 1: Find all statusBadge maps**

```bash
cd appClipprofit && grep -rn "statusBadge\|bg: \"bg-" src/app/\(admin\)/
```

**Step 2: Replace each statusBadge map** with CSS-variable versions. Example:

```tsx
// Before
const statusBadge: Record<string, { bg: string; text: string }> = {
  draft:           { bg: "bg-gray-100",  text: "text-gray-500" },
  active:          { bg: "bg-green-50",  text: "text-green-700" },
  paused:          { bg: "bg-amber-50",  text: "text-amber-700" },
  completed:       { bg: "bg-gray-100",  text: "text-gray-500" },
  cancelled:       { bg: "bg-red-50",    text: "text-red-700" },
  pending_payment: { bg: "bg-amber-50",  text: "text-amber-700" },
  pending_review:  { bg: "bg-blue-50",   text: "text-blue-700" },
};

// After — use inline style instead of className
const statusBadge: Record<string, { background: string; color: string }> = {
  draft:           { background: "var(--bg-secondary)",  color: "var(--text-muted)" },
  active:          { background: "var(--success-bg)",    color: "var(--success-text)" },
  paused:          { background: "var(--warning-bg)",    color: "var(--warning-text)" },
  completed:       { background: "var(--bg-secondary)",  color: "var(--text-muted)" },
  cancelled:       { background: "var(--error-bg)",      color: "var(--error-text)" },
  pending_payment: { background: "var(--warning-bg)",    color: "var(--warning-text)" },
  pending_review:  { background: "var(--accent-bg)",     color: "var(--accent-foreground)" },
};

// Usage changes from:
<span className={`... ${badge.bg} ${badge.text}`}>
// To:
<span className="..." style={badge}>
```

**Step 3: Commit**

```bash
git add appClipprofit/src/app/\(admin\)/
git commit -m "style: convert statusBadge maps to CSS variable inline styles"
```

---

## Task 9: Final verification sweep

**Step 1: Run grep for any remaining hardcoded light classes**

```bash
cd appClipprofit && grep -rn "bg-white\|bg-gray-\|text-gray-9\|text-gray-5\|border-gray-2\|bg-blue-5\|bg-green-5\|bg-amber-5\|bg-red-5" src/app/\(admin\)/ src/components/admin/
```

**Step 2: Fix any remaining instances** found above.

**Step 3: Check Recharts components** (used in analytics pages) — these often have inline colors that need dark-theme values:

```bash
grep -rn "fill=\"#\|stroke=\"#\|fill='#\|stroke='#" src/app/\(admin\)/
```

Replace any hardcoded white/light chart colors with token values or `currentColor`.

**Step 4: Visual check**

Start dev server and manually verify:
- [ ] Admin dashboard: dark bg, dark cards, white/light text
- [ ] Campaigns list: table rows dark, status badges correct colors
- [ ] Sidebar: matches dark bg, correct active state
- [ ] Forms (new campaign, new client): dark inputs, correct label colors
- [ ] Empty states: dark icon container, correct text

**Step 5: Final commit**

```bash
git add appClipprofit/src/
git commit -m "style: complete dark theme migration — all admin pages"
```

---

## Verification

**Run in `appClipprofit/`:**

```bash
npm run build
```

Expected: no TypeScript errors, no build failures. CSS variable references don't cause build errors.

**Dev visual check URL:** `http://localhost:3000/admin`

**Key things to confirm visually:**
1. Background is `#0a0a0a` (near-black), not white
2. Cards are `#111111` with subtle border
3. Primary accent buttons and links are indigo `#6366F1`
4. Font is Lexend (check DevTools > Computed > font-family)
5. Status badges (active = green-tinted, warning = amber-tinted, error = red-tinted)
6. No white "flash" of light-colored elements
