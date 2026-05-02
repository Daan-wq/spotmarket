# Agent-Team Build Protocol

Five subsystems (A–E) ship the automated clipping management system in parallel, sharing one repo, one schema, one bus.

This doc is the **rule book**. Every fresh subsystem session reads it first.

## The five subsystems

| ID | Name | Charter |
|---|---|---|
| **A** | Tracking Foundation | [`charters/A.md`](./charters/A.md) — owner of metrics, demographics, anti-bot, OAuth gate, event bus |
| **B** | Performance Intelligence | [`charters/B.md`](./charters/B.md) — owner of viral/underperform detection, clipper performance score, benchmarks |
| **C** | Clipper-Facing Surfaces | [`charters/C.md`](./charters/C.md) — owner of campaign leaderboard, live earnings, score widget |
| **D** | Admin Command Center | [`charters/D.md`](./charters/D.md) — owner of `/admin/*` overhaul, signals inbox, manual logo widget |
| **E** | Notifications & Routing | [`charters/E.md`](./charters/E.md) — owner of dispatcher, channel routing, settings UI |

## Branch strategy

- Each subsystem works in its own git worktree under `clipprofit-trees/<X>-<name>/`.
- One feature branch per subsystem: `feat/A-tracking`, `feat/B-intelligence`, etc.
- All branches branch from `master` **after** `feat/automation-foundation` has merged.
- Direct PRs back to `master`. No long-lived integration branch.

## Communication rules (hard)

Sessions never import from another subsystem's directory. Only three channels are allowed:

1. **Event bus** — `src/lib/event-bus.ts`. A publishes, B/C/D/E subscribe.
2. **Contracts** — `src/lib/contracts/*`. Frozen after foundation merge.
3. **Database (Prisma)** — read-only across subsystem boundaries.

If you find yourself writing `import { foo } from "@/lib/scoring/..."` from inside `/lib/metrics/`, stop. Use the bus or read from Prisma instead.

## File-ownership matrix

| Path | Owner |
|---|---|
| `prisma/schema.prisma` | Foundation PR. After: only A may add tables (with charter hand-off). Other subsystems open a *schema-delta* PR. |
| `src/lib/contracts/*` | Foundation PR. **Frozen** — additions require coordination PR. |
| `src/lib/event-bus.ts` | A |
| `src/lib/metrics/*`, `src/lib/velocity-scorer.ts`, `src/lib/duplicate-detector.ts`, `src/lib/audience-fetcher/*` | A |
| `src/lib/scoring/*`, `src/lib/signals/*`, `src/lib/benchmarks/*` | B |
| `src/app/(creator)/creator/campaigns/[id]/leaderboard/*`, `src/app/(creator)/creator/dashboard/_components/live-earnings.tsx`, `src/components/clipper-score/*` | C |
| `src/app/(admin)/admin/**` (except `/admin/payouts`, `/admin/withdrawals`) | D |
| `src/components/admin/logo-review-widget.tsx`, `src/app/api/admin/submissions/[id]/logo/route.ts` | D |
| `src/lib/notifications/*`, `src/app/api/cron/notification-dispatch/route.ts`, `src/app/(creator)/creator/settings/notifications/*` | E |
| `vercel.json` | A owns the cron section. E owns the dispatch cron entry only — coordinate via charter. |

## Schema-change protocol (after foundation lands)

If your session needs a new column or table mid-build:

1. **Stop**. Don't add it inline with feature code.
2. Create a tiny *schema-delta* branch from `master`:
   - Branch name: `schema/<subsystem>-<short-desc>` (e.g., `schema/B-need-confidence-field`)
   - Single commit: schema change + migration + regenerated client + brief PR description.
3. Get it merged.
4. Other sessions rebase onto `master` at their next pause.

Never edit `prisma/schema.prisma` on the same commit as feature code.

## Status / blocker tracking

`docs/agent-team/STATUS.md` — append-only. One line per session per work session:

```
2026-05-02  A  in-progress  poll-metrics-hot scaffolded; IG fetcher 80%
2026-05-02  B  blocked      waiting on contracts; SignalType.VELOCITY_DROP not yet declared
2026-05-02  C  in-progress  campaign-leaderboard query draft passes tests
```

Read STATUS.md before starting work. If the session you depend on is blocked or behind, pick a different task until they unblock.

## Merge order

1. **Foundation PR** lands first.
2. **A** lands first of the parallel set — data must be live in prod before consumers exist.
3. **B / C / D / E** land in any order after A.

## Verification before merge

Each subsystem PR must:

- Pass `npm run build`.
- Pass `npx tsc --noEmit -p tsconfig.json` with zero errors.
- Pass `npm test` (if tests exist for the touched area).
- Include a Verification section in the PR description matching the charter's verification checklist.

A specific extra requirement applies to A:

- `grep -r -i apify src/ prisma/ vercel.json package.json .env.example` must return zero hits.

## Who ships the foundation PR

Whoever opens the project first. The foundation PR is short (1–2h) and unblocks everyone. After it merges, four sessions can start in parallel immediately.
