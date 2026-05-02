# Charter E — Notifications & Alert Routing

> Read `docs/agent-team/README.md` first. This charter assumes the foundation PR has merged.

## Goal

Performance signals from B + existing approval/payout events route to the right channel (in-app, email, Discord) per user prefs.

## In scope

- **`NotificationRule` per user × type → channels[]** — Prisma model is already in foundation. Default channel routing comes from `src/lib/contracts/notifications.ts` (`DEFAULT_CHANNELS`).
- **Bus subscriber** — maps domain events to `Notification` rows + channel fan-out:
  - `submission.viral` → `PERFORMANCE_VIRAL`
  - `submission.underperform` → `PERFORMANCE_UNDERPERFORM`
  - `submission.flagged` (severity ≥ WARN) → `SIGNAL_FLAGGED` (admin recipients)
  - `submission.flagged` (signal=`TOKEN_BROKEN`) → `TOKEN_BROKEN` (creator recipient)
  - Earnings milestones (computed by E itself or A) → `EARNINGS_MILESTONE`
- **Email rendering** — via existing React Email + Resend (`src/lib/notifications.ts` is the existing in-app dispatcher; refactor into `src/lib/notifications/dispatcher.ts` and templates).
- **Discord webhook fan-out** — admin alerts use Discord. Use existing `src/lib/discord.ts`.
- **`/creator/settings/notifications`** — per-type channel toggles. Reads/writes `NotificationRule`.
- **Retry cron** — `/api/cron/notification-dispatch` drains failed sends.

## Out of scope

- Event computation (A and B)
- UI surfaces beyond the settings page (D)
- New event types not already in `NotificationType` enum

## Critical files

| File | Purpose |
|---|---|
| `src/lib/notifications/dispatcher.ts` (new) | Channel fan-out, replaces the in-app-only `src/lib/notifications.ts` |
| `src/lib/notifications/templates/*` (new) | React Email templates per type |
| `src/lib/notifications/event-subscriber.ts` (new) | Registers handlers on event bus at boot |
| `src/app/(creator)/creator/settings/notifications/page.tsx` (new) | Settings UI |
| `src/app/api/notification-rules/route.ts` (new) | CRUD `NotificationRule` |
| `src/app/api/cron/notification-dispatch/route.ts` (new) | Drains failed sends, retries |
| `vercel.json` | Add the dispatch cron entry only — coordinate with A |

## Verification

1. **Fan-out** — fire a synthetic `submission.viral`, confirm in-app `Notification` row, email lands in test inbox, Discord webhook fires (test channel).
2. **Rules respected** — set a user's rule for `PERFORMANCE_UNDERPERFORM` to in-app only, fire underperform event, confirm no email/Discord.
3. **Settings UI** — open `/creator/settings/notifications`, toggle channels, confirm `NotificationRule` rows persist.
4. **Retry cron** — manually fail an email send, run `notification-dispatch`, confirm retry.

## Dependencies

- A's event bus (consume).
- B's `submission.viral` / `submission.underperform` events.
- Foundation's `NotificationRule` Prisma model + new `NotificationType` enum values.
