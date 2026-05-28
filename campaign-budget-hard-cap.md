# Campaign Budget Hard Cap

## Goal
Enforce `Campaign.totalBudget` as the absolute payout ceiling while keeping view metrics visible and growing for client reporting.

## Decisions
- Campaign budget allocation follows approval order (`reviewedAt`).
- The submission that crosses the budget only receives the remaining budget.
- Later approved submissions keep their views/eligible views, but receive `earnedAmount = 0` when the budget is exhausted.
- Metrics refreshes may update views after approval, but must not increase campaign payout above `totalBudget`.

## Tasks
- [x] Add a reusable campaign budget cap helper that computes capped `earnedAmount` from approval order and current submission context. Verify with unit tests.
- [x] Apply the cap in the admin submission review route. Verify the crossing submission receives only remaining budget.
- [x] Apply the cap in metrics refresh so approved/unsettled submissions can grow views without exceeding campaign budget. Verify later refreshes do not increase total payout.
- [x] Preserve view reporting by keeping `eligibleViews` based on paid-view rules, independent of the campaign budget cap. Verify campaign views still sum normally.
- [x] Run targeted tests for paid views, review route, and metrics poller.

## Done When
- [x] Approved campaign `earnedAmount` totals can never exceed `totalBudget`.
- [x] Approval order determines who receives remaining budget.
- [x] View metrics continue after budget exhaustion.
- [x] Regression tests cover crossing, exhausted, and metrics-refresh cases.
