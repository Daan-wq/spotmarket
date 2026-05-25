# Discord Campaign Provisioning Plan

## Goal

Automatically create or reuse a Discord campaign role and private campaign chat when a campaign becomes active, then store those Discord IDs on the campaign for later role assignment/removal.

## Decisions

- Role name: `{Campaign name} Campagne`.
- Channel name: `💬│{campaign-name-without-spaces}-chat`, lowercased and Discord-safe.
- Trigger: admin publish / campaign activation, with idempotent provisioning.
- Access: moderators plus the campaign role can see the channel.
- Existing fallback mappings for old campaigns should continue to work while stored IDs are added.

## Implementation Steps

1. Add campaign fields for Discord role/channel IDs and a migration.
2. Extend Discord helpers to create/find roles, create/find channels in the campaign category, and configure channel permissions.
3. Call provisioning from campaign publish/activation and from join as a fallback if IDs are still missing.
4. Update tests for role assignment to prefer stored role IDs and cover provisioning behavior.
5. Verify with targeted tests, typecheck, and build before deploy.
