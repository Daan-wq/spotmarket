# Auth Email Unification Design

## Goal

Give every active ClipProfit user-authentication email the same branded,
mobile-friendly UI and ensure password-reset emails link directly to the
ClipProfit application instead of exposing the Supabase project domain.

## Scope

This change covers the authentication emails currently sent to ClipProfit
users:

- Account verification after email/password signup.
- Password recovery after using "Forgot password?".

Magic-link login, Supabase invitations, email-change verification, and
reauthentication emails are not active product flows today. The shared renderer
will be structured so those flows can be added without duplicating layout code,
but this change will not introduce unused auth features.

## Decisions

- Send both active auth emails through Resend.
- Use `ClipProfit <noreply@clipprofit.com>` as the sender.
- Use one shared HTML renderer for branding, spacing, CTA treatment, fallback
  link, and safety copy.
- Render Dutch copy for requests arriving through the `.nl` application domain
  and English copy for requests arriving through the `.com` domain.
- Preserve the request origin in the email link, including Vercel preview and
  local development origins.
- Do not include a visible `*.supabase.co` URL in the email HTML.
- Keep Supabase Auth as the authority that issues and verifies password-recovery
  tokens.
- Return the same successful forgot-password response whether or not an account
  exists, preventing email-address enumeration.

## Architecture

### Shared auth-email renderer

Create a focused server-only module under `src/lib/auth-email/` containing:

- The sender identity.
- Locale-specific copy for verification and password recovery.
- A renderer that accepts a title, body, CTA label, CTA URL, preview text, and
  footer text.
- HTML escaping for every text and URL value interpolated into the email.
- A plain fallback URL below the CTA for clients that do not render buttons.

The renderer will use email-safe inline styles and table-based layout where
needed. It will retain the existing ClipProfit light palette, purple CTA,
strong wordmark, restrained border, and mobile spacing.

### Account verification

The existing signup route continues to create a short-lived application signup
ticket. It will stop owning its HTML string and instead call the shared
auth-email renderer with locale-specific verification copy and the existing
ClipProfit `/auth/confirm?ticket=...` URL.

### Password-recovery request

Replace the browser call to `resetPasswordForEmail` with a POST request to a new
application route:

`POST /api/auth/password-reset`

The route will:

1. Validate and normalize the email address.
2. Apply the existing authentication IP rate limiter.
3. Ask the Supabase admin API to generate a `recovery` link without sending a
   Supabase email.
4. Extract the generated hashed recovery token.
5. Build a ClipProfit URL using the current request origin:
   `/auth/recovery?token_hash=...`.
6. Send the branded localized email through Resend.
7. Return a generic success response for both existing and unknown accounts.

Provider failures will be logged server-side without disclosing whether the
email address belongs to an account.

### Recovery callback

Add a server route:

`GET /auth/recovery`

The route will validate the `token_hash`, call Supabase `verifyOtp` with the
`recovery` type, allow the Supabase server client to write the authenticated
session cookies, and redirect to `/reset-password`.

Invalid, missing, or expired tokens redirect to:

`/sign-in?auth_error=recovery_failed`

The sign-in page will show a localized, non-technical recovery error for that
query value.

## Security And Deliverability

- The service-role key remains server-only.
- Recovery tokens are generated and verified by Supabase; the application does
  not invent or persist password-reset secrets.
- Recovery links use HTTPS ClipProfit origins in production.
- Email HTML contains only ClipProfit links and no tracking parameters.
- Resend click/open tracking must remain disabled for these transactional auth
  messages so the recovery URL is not rewritten.
- Rate limiting is keyed by client IP. The endpoint always returns generic
  success after valid input, including for unknown accounts.
- Logs may include provider error codes but must not log recovery tokens.
- SPF, DKIM, and DMARC for `clipprofit.com` remain deployment prerequisites for
  Gmail reputation. Application changes cannot by themselves guarantee that
  Gmail will never display a warning.

## Error Handling

- Invalid email syntax returns the existing localized invalid-input response.
- Rate-limited requests return HTTP 429 with the limiter headers.
- Unknown users receive HTTP 200 and the same UI success state as known users.
- Resend or Supabase outages return a generic localized failure only when the
  route cannot safely complete the request.
- Recovery callback failures never expose Supabase error details in the URL.

## Testing

Add focused tests for:

- Dutch and English auth-email copy.
- Shared ClipProfit visual markers and sender identity.
- Escaping of dynamic content.
- ClipProfit-only CTA and fallback links.
- Password-reset route input validation, locale selection, rate limiting,
  generic unknown-user success, recovery-token extraction, and Resend payload.
- Recovery callback verification and success/failure redirects.
- Signup verification continuing to use the same renderer.

After focused tests pass, run:

1. `npm test`
2. `npm run lint`
3. `npx tsc --noEmit`
4. `npm run build`

## Rollout

Deploy to a Vercel preview first. Request one English reset email through
`app.clipprofit.com` and one Dutch reset email through `app.clipprofit.nl`.
Verify the sender, subject, rendered UI, link hostname, recovery session, and
password update. Production promotion happens after the preview flow is
accepted.
