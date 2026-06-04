import { prisma } from "@/lib/prisma";
import { decrypt, encrypt } from "@/lib/crypto";
import { refreshTikTokToken } from "@/lib/tiktok";
import { refreshYoutubeToken } from "@/lib/youtube";

const TIKTOK_REFRESH_SKEW_MS = 30 * 60 * 1000;
const YOUTUBE_REFRESH_SKEW_MS = 5 * 60 * 1000;
const TIKTOK_INVALID_TOKEN_PATTERN = /access_token_invalid|access_token_expired/i;

interface TokenRecord {
  id: string;
  accessToken: string | null;
  accessTokenIv: string | null;
  refreshToken: string | null;
  refreshTokenIv: string | null;
  tokenExpiresAt: Date | null;
}

function shouldRefresh(expiresAt: Date | null, skewMs: number): boolean {
  if (!expiresAt) return false;
  return expiresAt.getTime() - Date.now() < skewMs;
}

function isExpired(expiresAt: Date | null): boolean {
  return Boolean(expiresAt && expiresAt.getTime() <= Date.now());
}

export function isTikTokInvalidTokenError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return TIKTOK_INVALID_TOKEN_PATTERN.test(message);
}

/**
 * Return a usable decrypted access token. If the stored token is near
 * expiry and a refresh token is available, perform the refresh and
 * persist the new token before returning it.
 */
export async function getFreshTikTokAccessToken(
  conn: TokenRecord
): Promise<string | null> {
  if (!conn.accessToken || !conn.accessTokenIv) return null;
  const current = decrypt(conn.accessToken, conn.accessTokenIv);
  if (!shouldRefresh(conn.tokenExpiresAt, TIKTOK_REFRESH_SKEW_MS)) {
    return current;
  }
  if (!conn.refreshToken || !conn.refreshTokenIv) {
    return isExpired(conn.tokenExpiresAt) ? null : current;
  }
  try {
    return await forceRefreshTikTokAccessToken(conn);
  } catch {
    return isExpired(conn.tokenExpiresAt) ? null : current;
  }
}

export async function withFreshTikTokAccessToken<T>(
  conn: TokenRecord,
  operation: (accessToken: string) => Promise<T>,
): Promise<T | null> {
  const token = await getFreshTikTokAccessToken(conn);
  if (!token) return null;

  try {
    return await operation(token);
  } catch (err) {
    if (!isTikTokInvalidTokenError(err)) throw err;
    const refreshed = await forceRefreshTikTokAccessToken(conn);
    if (!refreshed) return null;
    return await operation(refreshed);
  }
}

/**
 * Always perform a TikTok refresh-token exchange and persist the new
 * access token. Use this when the API reports the current token as
 * invalid/expired even though our `tokenExpiresAt` says otherwise —
 * TikTok can revoke tokens server-side outside the expected window.
 *
 * Throws on refresh failure so the caller can surface a reconnect
 * prompt instead of retrying with another dead token.
 */
export async function forceRefreshTikTokAccessToken(
  conn: TokenRecord
): Promise<string | null> {
  if (!conn.refreshToken || !conn.refreshTokenIv) return null;
  const refresh = decrypt(conn.refreshToken, conn.refreshTokenIv);
  const fresh = await refreshTikTokToken(refresh);
  const enc = encrypt(fresh.accessToken);
  const refreshData: {
    refreshToken?: string;
    refreshTokenIv?: string;
    refreshTokenExpiresAt?: Date;
  } = {};

  if (fresh.refreshToken) {
    const encRefresh = encrypt(fresh.refreshToken);
    refreshData.refreshToken = encRefresh.ciphertext;
    refreshData.refreshTokenIv = encRefresh.iv;
  }
  if (fresh.refreshExpiresIn) {
    refreshData.refreshTokenExpiresAt = new Date(Date.now() + fresh.refreshExpiresIn * 1000);
  }

  await prisma.creatorTikTokConnection.update({
    where: { id: conn.id },
    data: {
      accessToken: enc.ciphertext,
      accessTokenIv: enc.iv,
      tokenExpiresAt: new Date(Date.now() + fresh.expiresIn * 1000),
      ...refreshData,
    },
  });
  return fresh.accessToken;
}

export async function getFreshYoutubeAccessToken(
  conn: TokenRecord
): Promise<string | null> {
  if (!conn.accessToken || !conn.accessTokenIv) return null;
  const current = decrypt(conn.accessToken, conn.accessTokenIv);
  if (!shouldRefresh(conn.tokenExpiresAt, YOUTUBE_REFRESH_SKEW_MS) || !conn.refreshToken || !conn.refreshTokenIv) {
    return current;
  }
  try {
    const refresh = decrypt(conn.refreshToken, conn.refreshTokenIv);
    const fresh = await refreshYoutubeToken(refresh);
    const enc = encrypt(fresh.accessToken);
    await prisma.creatorYtConnection.update({
      where: { id: conn.id },
      data: {
        accessToken: enc.ciphertext,
        accessTokenIv: enc.iv,
        tokenExpiresAt: new Date(Date.now() + fresh.expiresIn * 1000),
      },
    });
    return fresh.accessToken;
  } catch {
    return current;
  }
}
