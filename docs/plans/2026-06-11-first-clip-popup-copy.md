# First Clip Help Popup

## Goal
Show the first-clip help content in the shared centered popup instead of a sidebar drawer, and update the Dutch guidance copy.

## Implementation
- Replace the `Drawer` in the first-clip coach with the shared `Dialog`.
- Preserve the existing title, description, two information blocks, icons, and bullet-list formatting.
- Update the Dutch description, preparation heading, preparation steps, and missing-clip guidance.

## Verification
- Run the focused lint check for the changed component.
- Run the production build.
- Check that the help action opens a centered popup and that backdrop, close button, and Escape still close it.
