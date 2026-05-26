# Creator Earnings And Payout Rejections

## Scope

- Show the creator clips total as the financial total: available balance plus lifetime profit.
- Stop using projected submission earnings for the creator-facing total and row amounts.
- Let admins reject payout requests with an internal reason.
- Keep rejection reasons hidden from creators.

## Approach

1. Update the creator videos server page to load the existing payment summary and pass `availableBalance + profit` to the UI.
2. Treat submission row earnings as persisted earned amounts only, so rejected or pending clips do not add projected money.
3. Add a nullable payout rejection reason to Prisma and store it when a payout request is marked failed from the admin dashboard.
4. Require an internal reason in the admin reject flow and show that reason only in admin payout history.

## Verification

- Apply the Prisma migration and regenerate the Prisma client.
- Run focused payout API and payment summary tests.
- Run the production build to catch route and type regressions.
