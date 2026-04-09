# Clipster-style View Tracking + Wallet System

## Goal
Implement "only views after submission count" model with a CLIPPROFIT wallet, campaign-end settlement, and $50 min withdrawal (USDT TRC-20).

## Tasks

- [ ] **Task 1: Schema changes** → Add to `CampaignSubmission`: `baselineViews Int?`, `eligibleViews Int?`. Add `Wallet` model (userId, balance). Add `WithdrawalRequest` model (walletId, amount, status, txHash, walletAddress). Run `prisma migrate dev`.
  - Verify: `npx prisma validate` passes

- [ ] **Task 2: Bio verification code format** → Change `nanoid(6)` to `CLIPPROFIT XXXX` (4 random digits) in `src/app/api/bio-verification/route.ts`
  - Verify: New codes match `CLIPPROFIT 1234` format

- [ ] **Task 3: Submission flow — require postUrl** → Make `postUrl` required in schema + API + UI. Remove `claimedViews` from creator form (admin enters views manually). Add info banner: "Views after submission count toward earnings. Submit as soon as you post."
  - Verify: Submission fails without postUrl, no claimedViews field in creator UI

- [ ] **Task 4: Admin review flow — manual view entry** → Update review API to accept `baselineViews` + `viewCount` from admin. Calculate `eligibleViews = viewCount - baselineViews`. Calculate `earnedAmount = eligibleViews * creatorCpv`. Don't credit wallet yet (campaign-end settlement).
  - Verify: Review API accepts new fields, calculates correctly

- [ ] **Task 5: Campaign-end settlement** → Add admin API endpoint to settle a campaign: for all APPROVED submissions in that campaign, credit each creator's wallet with their earnedAmount. Add `settledAt` to CampaignSubmission. Add notification type `EARNINGS_CREDITED`.
  - Verify: Settlement credits wallets, marks submissions as settled

- [ ] **Task 6: Wallet API + creator UI** → GET wallet balance. POST withdrawal request (min $50). Creator dashboard shows wallet balance + withdrawal history. Withdrawal request shows "USDT TRC-20" only after requesting (not in main UI).
  - Verify: Balance visible, withdrawal blocked under $50, USDT info shown on request

- [ ] **Task 7: Admin withdrawal management** → Admin can view pending withdrawals, mark as processing/sent/confirmed with txHash. Uses creator's `tronAddress` from CreatorProfile.
  - Verify: Admin can process withdrawals end-to-end

- [ ] **Task 8: Build verification** → `npx prisma validate && npm run build`

## Done When
- [ ] Creator submits post URL → timestamp recorded as baseline
- [ ] Admin manually enters baseline + current views → eligible views calculated
- [ ] Earnings credited to wallet only after admin settles campaign
- [ ] Creator can request withdrawal at $50+ (USDT TRC-20)
- [ ] Bio codes use `CLIPPROFIT XXXX` format
- [ ] Build passes
