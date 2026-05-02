# Charter C — Clipper-Facing Surfaces

> Read `docs/agent-team/README.md` first. This charter assumes the foundation PR has merged.

## Goal

Clippers see their performance live, see other clippers' work in their campaigns, and see live (estimated) earnings — driving motivation and copy-the-winner behavior.

## In scope

- **Campaign-scoped leaderboard** at `/creator/campaigns/[id]/leaderboard` — ranks all approved clippers in this campaign by views, earnings, and score. Top performers' post URLs are visible to peers (the whole point: drives clipping copying).
- **Live earnings ticker** on `/creator/dashboard` — computed live from `viewCount × creatorCpv` for *unsettled* approved submissions. Refresh via the bus or 60s poll. Show "estimated" vs "settled" separately.
- **Performance score widget** on `/creator/profile` and `/creator/dashboard` — consumes `ClipperPerformanceScore` (B's output).
- **"Why it's flopping" inline notice** on `/creator/videos` for any submission with a `submission.underperform` signal — shows weak dimension(s) from the signal payload.

## Out of scope

- Score computation (B)
- Signal computation (B)
- Notification delivery (E)
- Schema changes — C is presentation only

## Critical files

| File | Purpose |
|---|---|
| `src/app/(creator)/creator/campaigns/[id]/leaderboard/page.tsx` (new) | Campaign leaderboard page |
| `src/app/(creator)/creator/dashboard/_components/live-earnings.tsx` (new) | Live earnings ticker |
| `src/components/clipper-score/score-card.tsx` (new) | Reusable score widget |
| `src/app/api/clipper/live-earnings/route.ts` (new) | Computes live earnings for current user |
| `src/app/api/campaigns/[id]/leaderboard/route.ts` (new) | Campaign-scoped leaderboard query |

## Verification

1. **Live earnings** — open `/creator/dashboard` with a seeded user, watch live earnings tick as a fake-metrics dev cron fires.
2. **Leaderboard** — create campaign with 5 clippers across varied scores, open `/creator/campaigns/[id]/leaderboard`, confirm rank ordering and that peer post URLs are visible.
3. **Underperform notice** — fire a `submission.underperform` event for a known submission, reload `/creator/videos`, confirm inline notice shows weak dimensions.
4. **Score widget** — confirm `ScoreCard` renders for users with `ClipperPerformanceScore` row; falls back to empty state otherwise.

## Dependencies

- B's `ClipperPerformanceScore` and `submission.underperform` event payloads (locked in contracts).
- A's `MetricSnapshot` (read live earnings via Prisma). Until A ships, mock with a dev seed.
