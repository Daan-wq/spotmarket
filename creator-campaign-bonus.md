# Creator Campaign Bonus

## Goal
Replace the creator's hidden balance correction with a campaign-linked courtesy earning while preserving the real available balance.

## Tasks
- [ ] Add failing summary tests for campaign bonuses and campaign grouping.
- [ ] Add a `CreatorCampaignBonus` Prisma model and migration with creator, campaign, amount, reason, and unique reference.
- [ ] Include campaign bonuses in total earnings, available balance, and the matching campaign earnings row.
- [ ] Run focused tests, lint, and the production build.
- [ ] Back up the affected production rows, apply the migration, create the €10.66 ClipProfit bonus, and remove the old €10.66 correction in one transaction.
- [ ] Deploy the verified change and confirm production is healthy.
- [ ] Recalculate production totals and verify the available balance is unchanged.

## Done When
- [ ] The creator sees the courtesy amount under ClipProfit campaign income.
- [ ] No balance correction remains for this creator.
- [ ] Paid remains unchanged and available remains equal to the pre-migration balance.
