# Settings Profile Cleanup Plan

## Goal

Clean up `/creator/settings` so it only contains real account preferences and danger-zone controls.

## Scope

- Remove the profile summary and stat cards from the settings page.
- Remove the profile edit section from settings because profile details live on `/creator/profile`.
- Remove the account details container from settings.
- Keep language preferences and account deletion controls intact.
- Update settings header copy so it no longer mentions profile management.

## Verification

- Run TypeScript/build verification for the Next.js app after the cleanup.
