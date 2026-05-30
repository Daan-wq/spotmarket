# Auth Email UI Refresh

## Summary
- Refresh the forgot-password request state in `/sign-in` and the `/reset-password` page with the ClipProfit website visual language.
- Restyle app-managed transactional emails while keeping existing copy and delivery behavior intact.
- Keep password reset delivery in Supabase and provide a Supabase-ready template source for the hosted reset email.

## Implementation
- Use the website palette: light `#f7f9f9` surfaces, purple `#5d5fef` to `#3f41b3` primary treatment, pill CTAs, soft borders, and restrained elevation.
- Preserve the existing Supabase reset-password request and update-user flows.
- Restyle the shared React Email shell so notification templates inherit the new visual system.
- Match the signup verification email HTML to the same email layout.
- Add a source template for the Supabase password reset email without replacing Supabase-managed delivery.

## Verification
- Run `npm test -- src/lib/notifications/templates/_layout.test.ts`.
- Run `npm run build`.
- Smoke-check `/sign-in` forgot mode and `/reset-password` on desktop and mobile.
