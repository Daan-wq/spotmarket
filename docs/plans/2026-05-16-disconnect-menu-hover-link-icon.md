# Disconnect Menu Hover And Link Icon

## Summary

Refine the account disconnect dropdown so it reads as a button, uses a grey hover highlight, swaps the trash icon for the Animate UI link icon, and shortens the menu copy to `Disconnect [account name]`.

## Implementation

- Add the Animate UI link icon through the shadcn registry.
- Preserve existing shared Animate UI helpers if the registry tries to overwrite them.
- Add a global button hover highlight token/rule for neutral button-like controls.
- Apply the highlight affordance to the account options trigger and dropdown item.
- Render the link icon in red to signal unlink/disconnect.

## Verification

- Run focused lint and type/build checks for the edited UI files.
