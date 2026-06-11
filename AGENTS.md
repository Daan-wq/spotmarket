# AGENTS.md - ClipProfit Project Rules

## Vercel Preview Reliability (P1)

On June 11, 2026, previews returned HTTP 500 because `DATABASE_URL` and
`DATABASE_URL_DIRECT` existed only as branch-scoped Preview variables. New
branches therefore received no database configuration and Prisma attempted to
connect to `127.0.0.1:5432`.

Apply these rules to every deployment:

- Keep `DATABASE_URL` and `DATABASE_URL_DIRECT` configured for the complete
  Vercel Preview environment. A branch-scoped variable may override the global
  value, but must never be the only Preview configuration.
- Never rely on local `.env` files during Vercel builds and never commit or log
  environment values.
- Keep `node scripts/verify-production-deploy.mjs` in the Vercel build command.
  It intentionally blocks Preview and Production builds with missing, invalid,
  or local database URLs.
- After changing a Vercel environment variable, create a new deployment.
  Existing deployments retain the environment snapshot from build time.
- Before sharing a deployment, run
  `npm run verify:preview -- https://<deployment>.vercel.app`. The root,
  `/sign-in`, and `/brand` must all return a successful response or redirect.
- Treat the GitHub `Deployment smoke test` as required. A failed smoke test
  blocks acceptance of the preview.
- For any preview HTTP 500, inspect the exact deployment with
  `vercel logs <deployment-url> --since 1h --status-code 500 --expand --no-follow`
  before changing code or environment settings.

Do not promote a change to production until its preview passes the runtime
smoke test.
