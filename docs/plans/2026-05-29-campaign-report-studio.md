# Campaign Report Studio

Implement `/admin/reports` as a campaign report studio for client-facing campaign reports.

Core scope:
- Per-campaign reports only.
- Saved reports store editorial content and report scope, while metrics stay live.
- Reports can be drafted, finalized, filtered in history, edited, and printed via browser print/save-as-PDF.
- Audience data is aggregated from creators who participated in the selected campaign.

Verification:
- Unit coverage for aggregation and API validation/filtering.
- Build verification after implementation.
