# Auth UI Minimal Polish

## Summary
Polish the `/sign-in` and `/sign-up` pages into one consistent minimal auth experience: light neutral page, black ClipProfit logo, larger high-contrast dark card, Discord-blue primary action, and restrained motion.

## Implementation
- Add a shared auth shell for the centered viewport, larger black logo, `480px` dark card, stronger border, and restrained shadow.
- Update sign-in, sign-up, forgot-password, secondary-method, and sign-up check-email states to use dark-card contrast while preserving existing auth behavior.
- Adjust auth copy for a dedicated subtitle and localized English/Dutch sign-up text.
- Restyle OAuth buttons to match the requested Discord-first treatment without changing provider handling.
- Omit Terms/Privacy copy until a Terms route exists in the app.

## Verification
- Run the focused OAuth button test.
- Run lint and production build.
- Smoke-check `/sign-in` and `/sign-up` visually on desktop and mobile.
