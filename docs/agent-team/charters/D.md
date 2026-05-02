# Charter D — Admin Command Center

> Read `docs/agent-team/README.md` first. This charter assumes the foundation PR has merged.

## Goal

Replace the 13 thin admin tables with insight-first surfaces. Action where it matters, analytics where they help.

## In scope

- **`/admin` (dashboard)** — real KPIs: campaigns at risk, signals fired today, top performing creators, weekly view trend, fraud-flag count, OAuth-token-broken count. Replace the 6-card stub.
- **`/admin/campaigns/[id]`** — campaign health view: benchmark distribution chart, creator leaderboard, submission feed with signal badges, budget burn-down vs goal-views.
- **`/admin/signals`** (new) — alert inbox. All `SubmissionSignal` rows with severity ≥ WARN. Filterable, mark-as-resolved. `TOKEN_BROKEN` rows have a "nudge creator to reconnect" action.
- **`/admin/review/videos`** (rewrite) — submission review queue gains a **manual logo verification widget**:
  - Displays post thumbnail (fetched from platform OAuth API at render — no scraping)
  - Buttons: "Logo Present" / "Logo Missing"
  - Click writes `logoStatus`, `logoVerifiedAt`, `logoVerifiedBy` to `CampaignSubmission` via `POST /api/admin/submissions/[id]/logo`
  - Submission cannot be APPROVED while `logoStatus ∈ {PENDING, MISSING}`
  - On "Logo Missing" → also writes a `SubmissionSignal` with `type = LOGO_MISSING, severity = WARN`
- **`/admin/creators/[id]`** — creator profile with performance score, score history sparkline, submission feed, signal history, OAuth connection health.
- **`/admin/analytics`** (new) — platform-wide: CPV efficiency, OAuth success rate, demographic distribution, token-broken rate.

## Out of scope

- Schema changes
- Signal computation (B)
- Score computation (B)
- Notification delivery (E)
- `/admin/payouts`, `/admin/withdrawals` — kept as-is, orthogonal flows
- Automated logo / brand-message detection — does not exist

## Cuts from sidebar

- `/admin/tiktok-demographics` — page deleted by A (demographics auto-pulled now)
- `/admin/review/demographics` — deleted by A (same reason)
- `/admin/verifications` — rolls into `/admin/creators/[id]` OAuth tab
- `/admin/networks` — kept (referrals)

## Critical files

| File | Purpose |
|---|---|
| `src/app/(admin)/admin/page.tsx` (rewrite) | KPI dashboard |
| `src/app/(admin)/admin/signals/page.tsx` (new) | Alert inbox |
| `src/app/(admin)/admin/analytics/page.tsx` (new) | Platform analytics |
| `src/app/(admin)/admin/campaigns/[id]/page.tsx` (rewrite) | Campaign health |
| `src/app/(admin)/admin/creators/[id]/page.tsx` (rewrite) | Creator profile |
| `src/app/(admin)/admin/review/videos/page.tsx` (rewrite) | Adds logo widget |
| `src/components/admin/logo-review-widget.tsx` (new) | Logo Present/Missing buttons |
| `src/components/admin/kpi-card.tsx`, `signal-row.tsx`, `creator-score-cell.tsx` (new) | Building blocks |
| `src/app/api/admin/submissions/[id]/logo/route.ts` (new) | POST sets `logoStatus` |

## Verification

1. **Dashboard** — seed 3 campaigns at varying health, open `/admin`, confirm KPIs reflect reality.
2. **Signals inbox** — fire 5 synthetic signals (mix of severity), open `/admin/signals`, confirm rendering, filtering, and resolve action work.
3. **Logo widget** — open `/admin/review/videos` for a `PENDING` submission, click "Logo Present" → DB row updates, approve becomes available. Click "Logo Missing" → `SubmissionSignal` row created with `LOGO_MISSING`.
4. **Campaign health** — open `/admin/campaigns/[id]` with seeded benchmark data, confirm chart and leaderboard render.
5. **Token-broken nudge** — fire a `TOKEN_BROKEN` signal, click the nudge action, confirm a notification is queued (E-side).

## Dependencies

- A's `SubmissionSignal`, `MetricSnapshot`, `AudienceSnapshot` (Prisma reads) and `submission.flagged` events (consumed for live signals refresh).
- B's `ClipperPerformanceScore`, `CampaignBenchmark` (Prisma reads).
