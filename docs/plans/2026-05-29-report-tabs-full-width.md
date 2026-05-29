# Reports Page Tabs & Full-Width Report View

## Summary
- Convert `/admin/reports` from a three-column editor/preview workspace into two tabs: `Edit` and `Full report`.
- Keep the full report as the client-facing view, driven by live unsaved admin editor state for previewing.
- Make the full report use the available admin content width instead of a narrow right-side preview column.

## Implementation Notes
- Preserve tab selection in the URL with `tab=edit|report`; default to `edit`.
- Keep report history and filters only in the edit tab.
- Move the report renderer into a reusable component for future client-dashboard use.
- Keep browser print targeting the report content; printing from edit mode switches to the report tab first.

## Verification
- Run report Vitest coverage, TypeScript, production build, and a browser smoke test for edit/report tab behavior.
