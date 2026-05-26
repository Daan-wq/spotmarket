# Admin Discord Embed Builder

## Goal
Extend the existing admin Discord composer with embed creation while keeping normal Discord Markdown messages, URL buttons, attachments, templates, previews, and send flow intact.

## Tasks
- [x] Add shared embed payload cleaning and validation for Discord limits.
- [x] Extend Discord send helpers and admin message API to accept embeds in `payload_json`.
- [x] Extend Discord templates to persist embed drafts and selected channel context.
- [x] Add an embeds section to the existing composer with presets, multiple embeds, fields, reorder, duplicate, delete, and Discord-style preview.
- [x] Add focused tests for validation, API send payloads, template persistence, and preview rendering.
- [x] Run Prisma generation, tests, typecheck, lint, build, and migration deploy.

## Done When
- [x] Existing plain messages still send.
- [x] Admins can create and preview one or more embeds.
- [x] Invalid embed payloads are blocked before send.
- [x] Empty optional embed fields are omitted from Discord payloads.
- [x] Rules-style preset creates a professional Discord embed.
