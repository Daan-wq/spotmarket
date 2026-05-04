# YouTube Shorts Integration

## Goal
Add YouTube channel connection via Google OAuth, matching the existing Instagram/Facebook pattern: OAuth flow, encrypted token storage, channel analytics dashboard, and token refresh cron.

## Env vars needed (Google Cloud Console)
- `GOOGLE_CLIENT_ID` — OAuth 2.0 client ID
- `GOOGLE_CLIENT_SECRET` — OAuth 2.0 client secret
- `YOUTUBE_REDIRECT_URI` — e.g. `https://app.clipprofit.com/api/auth/youtube/callback`

Google Cloud APIs to enable: **YouTube Data API v3**, **YouTube Analytics API**

## Tasks

- [ ] **1. Prisma schema** — Add `CreatorYtConnection` model + relation on `CreatorProfile`
  - Fields: channelId, channelName, profilePicUrl, subscriberCount, accessToken, accessTokenIv, refreshToken, refreshTokenIv, tokenExpiresAt, isVerified
  - Run `prisma migrate dev`
  - Verify: `npx prisma validate`

- [ ] **2. Types** — Create `src/types/youtube.ts` with YtVideoItem, YtDemographics, YtChannelProfile interfaces

- [ ] **3. YouTube API lib** — Create `src/lib/youtube.ts`
  - `getYoutubeAuthUrl(state)` — Google OAuth URL with scopes: `youtube.readonly`, `yt-analytics.readonly`
  - `exchangeCodeForTokens(code)` — Exchange auth code for access + refresh token
  - `refreshYoutubeToken(refreshToken)` — Refresh expired access token
  - `fetchChannelProfile(accessToken)` — Channel name, subscribers, video count, profile pic
  - `fetchRecentShorts(accessToken, channelId, limit)` — Recent Shorts via search + video details
  - `fetchChannelAnalytics(accessToken, channelId, startDate, endDate)` — Views, watch time, subscribers gained/lost
  - `fetchVideoDemographics(accessToken, channelId, startDate, endDate)` — Age, gender, country breakdown
  - Verify: TypeScript compiles

- [ ] **4. OAuth routes** — Create `src/app/api/auth/youtube/route.ts` + `callback/route.ts`
  - Redirect → Google consent screen
  - Callback: exchange code, encrypt tokens, upsert CreatorYtConnection
  - Verify: Manual test via browser redirect

- [ ] **5. Connect button** — Create `src/app/(creator)/creator/pages/_components/youtube-connect-button.tsx`
  - Same modal pattern as Instagram button with YouTube-specific instructions
  - Replace the "Coming Soon" YouTube button on pages/page.tsx

- [ ] **6. Pages listing** — Update `src/app/(creator)/creator/pages/page.tsx`
  - Add ytConnections include + profile pic fetching
  - Add YouTube section (same layout as Instagram/Facebook)
  - Verify: Page renders without errors

- [ ] **7. Server action** — Add `removeYtPage(connectionId)` to `src/app/(creator)/creator/pages/actions.ts`

- [ ] **8. Analytics dashboard** — Create `src/app/(creator)/creator/pages/yt/[connectionId]/page.tsx`
  - Profile card (channel pic, name, subscribers, video count)
  - 30d stats: views, watch time, subscribers gained, engagement
  - Demographics: country, gender, age
  - Recent Shorts grid with thumbnails, views, likes
  - Verify: Page renders with mock/real data

- [ ] **9. Token refresh cron** — Update `src/app/api/cron/refresh-tokens/route.ts`
  - Add YouTube token refresh alongside Instagram refresh
  - Google uses refresh tokens (no expiry) to get new access tokens (~1hr)
  - Update `vercel.json` if needed

- [ ] **10. Build verification** — `npm run build` passes clean

## Notes
- Google OAuth uses refresh tokens (permanent) + access tokens (1hr). Different from Instagram's 60-day tokens.
- YouTube Data API has a 10,000 units/day quota. Search costs 100 units. Optimize by using `playlistItems` on the Shorts playlist instead of search where possible.
- Reuse existing `crypto.ts` encrypt/decrypt for token storage.
