# Report Layout Reintegration

## Goal

Restore the archived web-first campaign report layout on top of the current
production `master` without rolling back newer brand portal, campaign data, or
dashboard work.

## Constraints

- Keep the current report APIs, aggregation, Prisma schema, and brand access flow.
- Keep current `CampaignReportLiveData` fields and sanitization.
- Use the restored layout for both admin preview/editing and brand report pages.
- Keep live values locked while all client-facing copy remains editable.
- Do not merge or deploy the archived branch directly.

## Implementation

1. Add focused display tests for template token rendering and editable copy
   normalization before changing production components.
2. Restore the archived report display utilities and adapt them to current data
   types.
3. Port the archived admin document editor and report layout onto the current
   studio state, save, history, and publication flows.
4. Update the brand report document to render the same visual hierarchy using
   saved editorial content and sanitized live data.
5. Verify report tests, full TypeScript, production build, and browser behavior.
6. Commit and push the isolated branch, then create a preview deployment.

## Verification

- Template mode shows locked `{{tokens}}`; live preview resolves them.
- Admin copy edits survive save/reload and are not overwritten by live polling.
- Brand pages render the same report structure without editor controls.
- Current brand dashboard and report access routes still compile and pass tests.
- No database migration is introduced.
