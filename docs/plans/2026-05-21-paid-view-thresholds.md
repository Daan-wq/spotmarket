# Paid View Thresholds

## Goal
Add per-campaign minimum and maximum paid-view settings so admins can gate payouts until a clip reaches the minimum and cap payoutable views per submitted video.

## Tasks
- [x] Add campaign schema fields and a Prisma migration for `minimumPaidViews` and `maximumPaidViews`.
- [x] Centralize paid-view math in a shared helper and use it in approval, live earnings, projected earnings, summaries, and leaderboard fallbacks.
- [x] Add admin create/edit controls and creator/admin campaign displays for the thresholds.
- [x] Cover the helper, campaign edit payload, and approval calculation with tests.
- [ ] Run security, lint, type, test, build, browser verification, then deploy from `master`.

## Done When
- [x] Existing campaigns default to minimum `0` and unlimited maximum.
- [x] Already-approved earnings remain unchanged.
- [x] New approvals store capped payable views in `CampaignSubmission.eligibleViews`.
- [ ] Production migration and deployment complete successfully.
