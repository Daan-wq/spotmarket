# Platformbrede Direct-ID Metricsfix

## Goal

Poll Instagram and Facebook permanently by canonical API media ID, persist structured poll failures separately from successful metrics, and prevent historical failed snapshots from becoming the current reported value.

## Tasks

- [x] Add canonical identity and last-error fields plus `MetricPollFailure` schema and additive backfill migration.
- [x] Add typed provider failure details and valid-snapshot query helpers.
- [x] Resolve Instagram once, then poll metadata and insights directly by Graph media ID.
- [x] Fetch Facebook post engagement and video insights separately with structured Meta error classification.
- [x] Persist failed attempts outside `MetricSnapshot` and retain existing polling cadence and locks.
- [x] Keep every submission status pollable, including rejected and needs-revision rows.
- [x] Validate picker media IDs and store canonical identities during submission.
- [x] Exclude historical `OAUTH_FAILED` rows from reporting, earnings, leaderboards, review, stats, velocity, and anti-bot consumers.
- [x] Apply the migration, run the full verification suite, commit, push, and deploy.

## Done When

- Existing Instagram and Facebook submissions are backfilled and immediately due.
- New failed polls create `MetricPollFailure` rows without changing valid counters.
- No latest-metric consumer selects `OAUTH_FAILED`.
- Prisma validation, TypeScript, tests, build, and production-data acceptance queries pass.
