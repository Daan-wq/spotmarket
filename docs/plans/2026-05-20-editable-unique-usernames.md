# Editable Unique Usernames

## Goal

Allow creators to edit a profile username while preventing two creator accounts from using the same username.

## Approach

- Add a nullable, globally unique `username` field to `CreatorProfile`.
- Store usernames normalized to lowercase without a leading `@`.
- Add shared validation helpers for username format and duplicate handling.
- Update profile edit flows to submit and persist the existing profile row instead of creating extra profile records.
- Surface duplicate username errors in the profile form.

## Verification

- Add focused unit coverage for username normalization and candidate generation.
- Run targeted tests for the new helper and any touched API/action code.
- Run Prisma generation/build verification after schema changes.
