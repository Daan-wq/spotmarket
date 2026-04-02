# Instagram OAuth Fix — Self-Testing Loop

## Goal
Automatically test the Instagram connect flow end-to-end using Playwright, debug the real redirect_uri being sent, fix env vars, redeploy, and repeat until the OAuth screen loads.

## Tasks
- [x] Task 1: Identify root cause investigation path → Write Playwright script that logs in, clicks "Connect Instagram", captures the full redirect URL before Instagram error
- [ ] Task 2: Run script → Read exact `redirect_uri` and `client_id` being sent in the OAuth URL
- [ ] Task 3: Compare captured URL params against what's registered in Meta Dashboard → fix any mismatch via Vercel CLI
- [ ] Task 4: Remove debug logs from `route.ts`, redeploy → `vercel --prod --yes`
- [ ] Task 5: Re-run Playwright script → Verify Instagram OAuth screen loads (no error page)

## Done When
- [ ] Playwright navigates to the Instagram OAuth screen without error
- [ ] User sees "Log in with Instagram" or permission grant screen

## Notes
- Credentials: daan0529@icloud.com / Test123
- Target: https://spotmarket-gamma.vercel.app
- "Connect Instagram" button is on the profile page (likely `/profile` or `/onboarding`)
- Playwright script intercepts the redirect to `www.instagram.com/oauth/authorize` to extract exact params
- Do NOT follow through to Instagram login (we only need to verify the authorize URL is valid)
