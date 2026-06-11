# Brand login recovery

## Goal

Make username/password login for brand users first-party, visible, self-healing,
and diagnosable without logging credentials.

## Approach

1. Add shared helpers for Supabase auth-cookie detection, deletion, and
   recoverable session-error classification.
2. Add a same-origin password-login route that ignores stale auth cookies,
   authenticates server-side, and returns Dutch-safe error codes.
3. Clear invalid refresh cookies in the proxy and mark redirects caused by an
   expired session.
4. Show username/password immediately when the requested redirect targets the
   brand portal.
5. Add correlated, credential-free auth event logging.
6. Cover cookie recovery, Paperclip login, error mapping, proxy redirects, and
   brand-form visibility with focused tests.

## Verification

- Targeted Vitest tests
- Full Vitest suite
- ESLint
- TypeScript
- Production build
- Preview login smoke test
