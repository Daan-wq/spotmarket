# Mobile Campaign Nav And Info Restoration

## Goal
Restore the creator mobile top navigation so it stays anchored while scrolling, and make the campaign detail info cards more compact on mobile.

## Implementation
- Reapply the sticky mobile creator chrome behavior from the earlier nav fix.
- Keep the bottom mobile nav fixed.
- Show campaign info cards in two compact columns on mobile, with the current four-column layout preserved on desktop.

## Verification
- Run lint and build.
- Check a mobile-width campaign detail page for sticky top navigation, compact info cards, and no bottom-nav overlap.
