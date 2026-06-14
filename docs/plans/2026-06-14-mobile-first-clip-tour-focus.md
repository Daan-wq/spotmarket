# Mobile First-Clip Tour Focus

## Goal

Make the guided first-clip onboarding reliable on phone-sized viewports and prevent accidental interaction outside the active tour target.

## Changes

- Close the mobile creator drawer automatically after drawer-specific tour steps.
- Render the tour panel as a bottom sheet capped at 45dvh with a scrollable body and fixed action row.
- Keep the highlighted target visible above the sheet, including bottom-navigation targets.
- Block pointer, keyboard, wheel, touch, and browser-back interaction outside the highlighted target and tour dialog.
- Preserve click access for the highlighted target and every control inside the tour dialog.

## Verification

- Unit-test spotlight geometry and mobile panel placement.
- Run the complete test suite, TypeScript, lint, and production build.
- Inspect the preview at desktop and mobile viewport sizes.
