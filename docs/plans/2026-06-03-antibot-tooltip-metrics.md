# Anti-bot tooltip metric expansion

## Goal

Replace the thin view-only hover text in the admin anti-bot detail chart with a ClipProfit-styled tooltip that shows enough context to judge a spike: view delta, engagement deltas, engagement per 1,000 new views, watch-time status, reach/profile deltas, and compact availability chips for unavailable metrics.

## Approach

1. Extend the signal detail snapshot query with already-stored metric fields: watch time, reach, total interactions, follows, profile visits, reactions, profile activity, raw, and metric availability.
2. Add a pure helper that buckets snapshots and computes safe deltas per metric.
3. Treat total watch time and average watch time separately. Only cumulative total watch time gets a delta; average watch time is shown as an average.
4. Add lightweight watch-time kind metadata to newly fetched IG/YT/FB raw metric payloads so future snapshots are explicit without a database migration.
5. Update the chart tooltip UI and add unit tests for delta and watch-time semantics.

## Verification

- `npm test -- signal-view-growth-tooltip view-growth-buckets`
- `npm run build`
