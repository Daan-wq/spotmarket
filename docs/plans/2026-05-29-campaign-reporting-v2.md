# Campaign Reporting V2 Implementation Plan

## Summary
Upgrade `/admin/reports` from a dashboard-style campaign report into a strategic brand-facing report. The report keeps live metrics, stores flexible editorial content in JSON, and preserves reusable foundations for a future creator-facing report.

## Implementation
- Add `CampaignReport.editorialContent` as a backwards-compatible JSON field.
- Extend report section keys for Financial Overview, Content Insights, Community Activation, Key Learnings, and Appendix.
- Expand live report aggregation with financial, pacing, platform, creator reliability, audience fit, traffic quality, and top clip summary metrics.
- Refactor the editor into section-based controls for campaign type, notes, insights, recommendations, and next campaign plan.
- Rework the full report view into the agreed brand-report order with client-safe quality language.

## Verification
- Update report aggregation and API tests.
- Run targeted Vitest report tests, typecheck, and production build.
- Browser smoke `/admin/reports` if an admin session is available.
