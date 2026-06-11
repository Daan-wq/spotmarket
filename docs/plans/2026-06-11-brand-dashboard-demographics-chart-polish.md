# Brand Dashboard Demographics And Chart Polish

## Goal

Correct the brand dashboard demographics order, remove internal quality labels,
and prevent the incomplete current day from creating a misleading chart drop.

## Implementation

1. Add shared audience display ordering:
   - age buckets in ascending age order, with `65+` last;
   - gender in `male`, `female`, `other` order.
2. Apply the shared ordering to both the dashboard and printable brand report.
3. Keep the actual current-day views for the tooltip, but plot the previous
   completed day's value until the current day is complete.
4. Remove creator approval/reliability text and the audience fit-status badge
   from the dashboard.
5. Remove the duplicate separator between Creator contribution and Audience by
   omitting the final creator-row border.

## Verification

- Add regression tests for audience ordering and current-day chart behavior.
- Add component assertions for removed labels and the single separator.
- Run targeted Vitest suites, the full test suite, ESLint, and the production build.
- Push to the existing preview branch and verify the Vercel deployment.
