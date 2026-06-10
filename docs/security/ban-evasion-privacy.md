# Ban-evasion privacy and rollout record

Last reviewed: 2026-06-10

## Purpose and scope

ClipProfit processes creator security signals to prevent viewbotting, repeat account creation after a ban, and abuse of campaign payouts. Admin and brand accounts are outside this control. The implementation deliberately avoids invasive browser fingerprinting and hardware identifiers.

## Legitimate-interest assessment

- Purpose: protect creators, brands, campaign budgets, and platform integrity from repeat abuse.
- Necessity: account and email bans alone are easily bypassed. A random first-party device identifier and keyed comparisons of IP, social, Discord, and payout identifiers provide a less invasive alternative to browser fingerprinting.
- Balancing: a normal IP match does not automatically ban a creator. It causes a Turnstile challenge and stricter signup controls. Strong identifiers or IP plus a second risk factor are required for automatic blocking.
- Safeguards: admin selection is required before an observed signal becomes a ban indicator; raw values are not shown; hard IP bans require a separate warning, acknowledgment, and motivation; blocked users receive no detection details; human review is available.
- Outcome: processing is proportionate when limited to creator security, the stated retention periods, and the safeguards above. Reassess after the observation rollout and whenever signal types or purposes change.

## DPIA screening

The feature performs systematic security evaluation and can deny access, but uses limited first-party and account-linked data rather than large-scale tracking, sensitive-category profiling, location history, or hardware fingerprinting. Initial screening does not indicate high residual risk requiring a full DPIA, provided the safeguards and human-review process remain active.

A full DPIA is required before adding cross-site fingerprinting, third-party data brokerage, broad location profiling, sensitive personal data, or decisions without an appeal path. This screening must be reviewed by the person responsible for privacy before enforcement mode is enabled.

## Data handling

- Signal hashes: versioned HMAC-SHA256 using `BAN_SIGNAL_HASH_SECRET`.
- Admin display: masked values only.
- Access observations: rolling 90 days, pruned daily.
- Device cookie: random first-party value, HttpOnly, Secure in production, SameSite=Lax, rolling maximum 12 months.
- Active indicators: retained only while the related account ban is active and deleted on unban.
- Enforcement history: no passwords, tokens, raw IP addresses, or raw account identifiers.

## Production configuration

Required environment variables:

```text
BAN_SIGNAL_HASH_SECRET=<dedicated high-entropy secret>
BAN_EVASION_MODE=observe
NEXT_PUBLIC_TURNSTILE_SITE_KEY=<Cloudflare site key>
TURNSTILE_SECRET_KEY=<Cloudflare secret key>
SUPABASE_AUTH_HOOK_SECRET=<Supabase Standard Webhooks signing secret>
REDIS_URL=<Redis connection URL>
```

Configure Supabase Auth's Before User Created HTTP hook to:

```text
https://<production-host>/api/auth/hooks/before-user-created
```

The hook must use the same `SUPABASE_AUTH_HOOK_SECRET` configured in Vercel. Never reuse the signal hash secret for webhook signing.

## Seven-day observation rollout

1. Deploy with `BAN_EVASION_MODE=observe`.
2. Account bans remain immediately effective. New device, identity, and IP matches are logged as observed decisions but are not enforced.
3. Review daily challenge volume, observed block reasons, shared-IP clusters, support reports, and false positives.
4. Confirm the privacy notice, human-review workflow, LIA, and DPIA screening.
5. Enable `BAN_EVASION_MODE=enforce` only after written approval.
6. Keep rollback available by setting the mode back to `observe`; active account bans continue to work.
