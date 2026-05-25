# Discord Campaign Roles

## Goal
Make campaign membership the source of Discord campaign-channel access.

## Tasks
- [x] Update Discord OAuth connect scopes to include `guilds.join` and join the guild during callback -> Verify with `src/lib/discord.test.ts`.
- [x] Add a small Discord campaign-role helper for role mapping, guild join, role add, and role remove -> Verify with unit-level route mocks.
- [x] Require `discordId` in the campaign join API before creating an application -> Verify direct API calls without Discord are rejected.
- [x] Assign the mapped Discord role when a creator joins a mapped campaign -> Verify application creation calls role assignment.
- [x] Remove the mapped Discord role when a creator leaves or an admin completes/cancels a campaign -> Verify leave/end route paths call role removal.
- [ ] Run focused Vitest coverage for Discord OAuth and campaign applications.

## Done When
- [ ] Direct campaign joins cannot bypass Discord linking.
- [ ] Connected users get the mapped role on join.
- [ ] Roles stay on pause and are removed on leave/completed/cancelled.
- [ ] Tests pass for the touched behavior.

## Notes
- Current live Discord roles are `Bram's Fruit Campagne` and `ClipProfit Campagne`.
- Existing campaign participants all already have a stored Discord ID.
