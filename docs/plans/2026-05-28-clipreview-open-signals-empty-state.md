# Clipreview Open Signals Empty State

## Goal
When the admin clip review queue is empty, make it clear that open Signal review can still require attention before payouts move forward.

## Approach
- Count open admin-visible submission signals on the Clip review page.
- If the clip queue is empty and open signals exist, show a short explanation instead of a generic clear state.
- Link the primary action to all open signals.

## Verification
- Run a focused type/lint check if feasible.
- Confirm the page still renders the original empty state when there are no open signals.
