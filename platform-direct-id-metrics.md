# Platformbrede Direct-ID Metricsfix

## Goal

Poll Instagram and Facebook permanently by canonical API media ID, persist structured poll failures separately from successful metrics, and prevent historical failed snapshots from becoming the current reported value.

## Tasks

- [ ] Add canonical identity and last-error fields plus `MetricPollFailure` schema and additive backfill migration.
- [ ] Add typed provider failure details and valid-snapshot query helpers.
- [ ] Resolve Instagram once, then poll metadata and insights directly by Graph media ID.
- [ ] Fetch Facebook post engagement and video insights separately with structured Meta error classification.
- [ ] Persist failed attempts outside `MetricSnapshot` and retain existing polling cadence and locks.
- [ ] Validate picker media IDs and store canonical identities during submission.
- [ ] Exclude historical `OAUTH_FAILED` rows from reporting, earnings, leaderboards, review, stats, velocity, and anti-bot consumers.
- [ ] Apply the migration, run the full verification suite, commit, push, and create a preview.

## Done When

- Existing Instagram and Facebook submissions are backfilled and immediately due.
- New failed polls create `MetricPollFailure` rows without changing valid counters.
- No latest-metric consumer selects `OAUTH_FAILED`.
- Prisma validation, TypeScript, tests, build, and production-data acceptance queries pass.
