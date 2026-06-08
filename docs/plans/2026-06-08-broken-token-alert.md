# Broken Token Alert Implementation Plan

## Goal

Create persistent connection-health incidents for explicit OAuth failures and surface them through grouped creator and admin alerts without exposing provider errors to creators.

## Implementation

1. Add incident and per-viewer dismissal models with one active incident per connection.
2. Open or refresh incidents only for explicit missing, expired, revoked, or invalid credentials.
3. Resolve incidents after a successful refresh, successful OAuth reconnect, or connection removal.
4. Dispatch one `TOKEN_BROKEN` notification and email when a new incident opens.
5. Add role-scoped list and dismissal APIs.
6. Add grouped responsive alerts to creator and admin layouts, plus a read-only warning on admin creator details.
7. Keep broken status visible on Connections with friendly reconnect guidance.
8. Backfill existing confirmed authentication failures and verify the migration in the target database.

## Verification

- Unit and route tests for classification, lifecycle, authorization, dismissal, and deduplication.
- Component tests for grouped alerts and friendly connection status.
- Security audit, lint, types, full tests, production build, and applicable browser checks.
