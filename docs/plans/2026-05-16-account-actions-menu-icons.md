# Account Actions Menu And My Clips Icon

## Summary

Replace the directly visible red account disconnect button with a neutral three-dot options menu. The menu contains the destructive disconnect action, and selecting it opens the existing confirmation dialog. Also replace the creator sidebar My Clips icon with the Animate UI clapperboard icon.

## Implementation

- Add the requested Animate UI ellipsis and clapperboard icons through the shadcn registry.
- Preserve the existing shared Animate UI slot helper if the registry command tries to overwrite it.
- Update the shared disconnect button to render a neutral ellipsis dropdown trigger and a destructive dropdown item labeled `Disconnect [account name] on [platform] from Clipprofit`.
- Pass platform labels from the Instagram, TikTok, Facebook, and YouTube remove button wrappers.
- Update the creator nav items so My Clips uses the clapperboard icon.

## Verification

- Run `npm run build`.
- Run focused lint/type checks where available.
- Visually verify the Accounts row options menu, confirmation popup, and My Clips sidebar icon.
