import { prisma } from "@/lib/prisma";
import { decrypt, encrypt } from "@/lib/crypto";
import { refreshTikTokToken } from "@/lib/tiktok";
import { refreshYoutubeToken } from "@/lib/youtube";

const REFRESH_SKEW_MS = 5 * 60 * 1000;

interface TokenRecord {
  id: string;
  accessToken: string | null;
  accessTokenIv: string | null;
  refreshToken: string | null;
  refreshTokenIv: string | null;
  tokenExpiresAt: Date | null;
}

function shouldRefresh(expiresAt: Date | null): boolean {
  if (!expiresAt) return false;
  return expiresAt.getTime() - Date.now() < REFRESH_SKEW_MS;
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
  if (!shouldRefresh(conn.tokenExpiresAt) || !conn.refreshToken || !conn.refreshTokenIv) {
    return current;
  }
  try {
    const refresh = decrypt(conn.refreshToken, conn.refreshTokenIv);
    const fresh = await refreshTikTokToken(refresh);
    const enc = encrypt(fresh.accessToken);
    await prisma.creatorTikTokConnection.update({
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

export async function getFreshYoutubeAccessToken(
  conn: TokenRecord
): Promise<string | null> {
  if (!conn.accessToken || !conn.accessTokenIv) return null;
  const current = decrypt(conn.accessToken, conn.accessTokenIv);
  if (!shouldRefresh(conn.tokenExpiresAt) || !conn.refreshToken || !conn.refreshTokenIv) {
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
