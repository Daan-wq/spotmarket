import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { fetchInstagramProfile } from "@/lib/instagram";
import { fetchFacebookPageProfile } from "@/lib/facebook";
import { fetchChannelProfile as fetchYtProfile } from "@/lib/youtube";
import { fetchTikTokProfile } from "@/lib/tiktok";
import { RemovePageButton } from "./_components/remove-page-button";
import { RemoveFbPageButton } from "./_components/remove-fb-page-button";
import { RemoveYtPageButton } from "./_components/remove-yt-page-button";
import { RemoveTikTokPageButton } from "./_components/remove-tiktok-page-button";
import { InstagramConnectButton } from "./_components/instagram-connect-button";
import { FacebookConnectButton } from "./_components/facebook-connect-button";
import { YoutubeConnectButton } from "./_components/youtube-connect-button";
import { TikTokConnectButton } from "./_components/tiktok-connect-button";

export default async function PagesPage() {
  const { userId } = await requireAuth("creator");

  const user = await prisma.user.findUnique({
    where: { supabaseId: userId },
    select: { id: true },
  });
  if (!user) throw new Error("User not found");

  const profile = await prisma.creatorProfile.findUnique({
    where: { userId: user.id },
    include: {
      igConnections: {
        include: { bioVerifications: { orderBy: { createdAt: "desc" }, take: 1 } },
        orderBy: { createdAt: "desc" },
      },
      fbConnections: {
        orderBy: { createdAt: "desc" },
      },
      ytConnections: {
        orderBy: { createdAt: "desc" },
      },
      ttConnections: {
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!profile) throw new Error("Creator profile not found");

  // Fetch profile pictures for connections that have tokens
  const profilePics = new Map<string, string>();
  await Promise.all([
    ...profile.igConnections
      .filter((c) => c.accessToken && c.accessTokenIv && c.igUserId)
      .map(async (c) => {
        try {
          const token = decrypt(c.accessToken!, c.accessTokenIv!);
          const igProfile = await fetchInstagramProfile(token, c.igUserId!);
          if (igProfile.profilePictureUrl) {
            profilePics.set(c.id, igProfile.profilePictureUrl);
          }
        } catch {
          if (c.profilePicUrl) profilePics.set(c.id, c.profilePicUrl);
        }
      }),
    ...profile.fbConnections
      .filter((c) => c.accessToken && c.accessTokenIv && c.fbPageId)
      .map(async (c) => {
        try {
          const token = decrypt(c.accessToken!, c.accessTokenIv!);
          const fbProfile = await fetchFacebookPageProfile(c.fbPageId!, token);
          if (fbProfile.profilePictureUrl) {
            profilePics.set(c.id, fbProfile.profilePictureUrl);
          }
        } catch {
          if (c.profilePicUrl) profilePics.set(c.id, c.profilePicUrl);
        }
      }),
    ...profile.ytConnections
      .filter((c) => c.accessToken && c.accessTokenIv)
      .map(async (c) => {
        try {
          const token = decrypt(c.accessToken!, c.accessTokenIv!);
          const ytProfile = await fetchYtProfile(token);
          if (ytProfile.profilePictureUrl) {
            profilePics.set(c.id, ytProfile.profilePictureUrl);
          }
        } catch {
          if (c.profilePicUrl) profilePics.set(c.id, c.profilePicUrl);
        }
      }),
    ...profile.ttConnections
      .filter((c) => c.accessToken && c.accessTokenIv)
      .map(async (c) => {
        try {
          const token = decrypt(c.accessToken!, c.accessTokenIv!);
          const ttProfile = await fetchTikTokProfile(token);
          if (ttProfile.avatarUrl) {
            profilePics.set(c.id, ttProfile.avatarUrl);
          }
        } catch {
          if (c.profilePicUrl) profilePics.set(c.id, c.profilePicUrl);
        }
      }),
  ]);

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
          My Pages
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          Connect your social accounts to start earning
        </p>
      </div>

      {/* Connect Accounts */}
      <div
        className="rounded-lg p-5 border"
        style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
      >
        <div className="mb-3">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
            Connect Account
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <InstagramConnectButton />
          <TikTokConnectButton />
          <FacebookConnectButton />
          <YoutubeConnectButton />
        </div>
      </div>

      {/* Instagram Pages */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#E1306C" }}>
            <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
          </svg>
          <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Instagram</span>
          <span className="text-xs ml-1" style={{ color: "var(--text-muted)" }}>({profile.igConnections.length})</span>
        </div>

        {profile.igConnections.length === 0 ? (
          <div
            className="rounded-lg p-6 border text-center"
            style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}
          >
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              No Instagram accounts connected yet.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {profile.igConnections.map((conn) => {
              const bio = conn.bioVerifications[0];
              const status = conn.isVerified
                ? "verified"
                : bio?.status?.toLowerCase() ?? "pending";
              const hasToken = !!conn.accessToken && !!conn.igUserId;

              return (
                <div
                  key={conn.id}
                  className="rounded-lg border overflow-hidden"
                  style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
                >
                  <div className="flex items-center justify-between gap-4 p-4">
                    <Link
                      href={hasToken ? `/creator/pages/ig/${conn.id}` : "/creator/verify"}
                      className="flex items-center gap-3 min-w-0 flex-1 group"
                    >
                      {profilePics.get(conn.id) ? (
                        <img
                          src={profilePics.get(conn.id)}
                          alt={conn.igUsername}
                          className="w-10 h-10 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                          style={{ background: "var(--primary)", color: "#fff" }}
                        >
                          {conn.igUsername[0].toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p
                          className="text-sm font-semibold truncate group-hover:underline"
                          style={{ color: "var(--text-primary)" }}
                        >
                          @{conn.igUsername}
                        </p>
                        <div className="flex items-center gap-3 mt-0.5">
                          {conn.followerCount != null && (
                            <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                              {conn.followerCount.toLocaleString()} followers
                            </span>
                          )}
                          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                            Added {new Date(conn.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      {hasToken && (
                        <svg
                          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                          className="shrink-0 opacity-40 group-hover:opacity-100 transition-opacity"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          <path d="m9 18 6-6-6-6" />
                        </svg>
                      )}
                    </Link>

                    <div className="flex items-center gap-3 shrink-0">
                      {status === "verified" ? (
                        <span
                          className="text-xs px-2 py-1 rounded-full font-medium"
                          style={{ background: "var(--success-bg)", color: "var(--success-text)" }}
                        >
                          Verified
                        </span>
                      ) : status === "failed" ? (
                        <Link
                          href="/creator/verify"
                          className="text-xs px-2 py-1 rounded-full font-medium"
                          style={{ background: "var(--error-bg)", color: "var(--error-text)" }}
                        >
                          Failed — retry
                        </Link>
                      ) : (
                        <Link
                          href="/creator/verify"
                          className="text-xs px-2 py-1 rounded-full font-medium"
                          style={{ background: "var(--warning-bg)", color: "var(--warning-text)" }}
                        >
                          Pending — verify
                        </Link>
                      )}
                      <RemovePageButton connectionId={conn.id} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Facebook Pages */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ color: "#1877F2" }}>
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
          <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Facebook</span>
          <span className="text-xs ml-1" style={{ color: "var(--text-muted)" }}>({profile.fbConnections.length})</span>
        </div>

        {profile.fbConnections.length === 0 ? (
          <div
            className="rounded-lg p-6 border text-center"
            style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}
          >
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              No Facebook pages connected yet.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {profile.fbConnections.map((conn) => {
              const hasToken = !!conn.accessToken;

              return (
                <div
                  key={conn.id}
                  className="rounded-lg border overflow-hidden"
                  style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
                >
                  <div className="flex items-center justify-between gap-4 p-4">
                    <Link
                      href={hasToken ? `/creator/pages/fb/${conn.id}` : "/creator/pages"}
                      className="flex items-center gap-3 min-w-0 flex-1 group"
                    >
                      {profilePics.get(conn.id) ? (
                        <img
                          src={profilePics.get(conn.id)}
                          alt={conn.pageName}
                          className="w-10 h-10 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                          style={{ background: "#1877F2", color: "#fff" }}
                        >
                          {conn.pageName[0].toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p
                          className="text-sm font-semibold truncate group-hover:underline"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {conn.pageName}
                        </p>
                        <div className="flex items-center gap-3 mt-0.5">
                          {conn.followerCount != null && (
                            <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                              {conn.followerCount.toLocaleString()} likes
                            </span>
                          )}
                          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                            Added {new Date(conn.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      {hasToken && (
                        <svg
                          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                          className="shrink-0 opacity-40 group-hover:opacity-100 transition-opacity"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          <path d="m9 18 6-6-6-6" />
                        </svg>
                      )}
                    </Link>

                    <div className="flex items-center gap-3 shrink-0">
                      <RemoveFbPageButton connectionId={conn.id} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* YouTube Channels */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ color: "#FF0000" }}>
            <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.4a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" />
            <polygon fill="#fff" points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" />
          </svg>
          <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>YouTube</span>
          <span className="text-xs ml-1" style={{ color: "var(--text-muted)" }}>({profile.ytConnections.length})</span>
        </div>

        {profile.ytConnections.length === 0 ? (
          <div
            className="rounded-lg p-6 border text-center"
            style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}
          >
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              No YouTube channels connected yet.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {profile.ytConnections.map((conn) => {
              const hasToken = !!conn.accessToken;

              return (
                <div
                  key={conn.id}
                  className="rounded-lg border overflow-hidden"
                  style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
                >
                  <div className="flex items-center justify-between gap-4 p-4">
                    <Link
                      href={hasToken ? `/creator/pages/yt/${conn.id}` : "/creator/pages"}
                      className="flex items-center gap-3 min-w-0 flex-1 group"
                    >
                      {profilePics.get(conn.id) ? (
                        <img
                          src={profilePics.get(conn.id)}
                          alt={conn.channelName}
                          className="w-10 h-10 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                          style={{ background: "#FF0000", color: "#fff" }}
                        >
                          {conn.channelName[0].toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p
                          className="text-sm font-semibold truncate group-hover:underline"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {conn.channelName}
                        </p>
                        <div className="flex items-center gap-3 mt-0.5">
                          {conn.subscriberCount != null && (
                            <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                              {conn.subscriberCount.toLocaleString()} subscribers
                            </span>
                          )}
                          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                            Added {new Date(conn.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      {hasToken && (
                        <svg
                          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                          className="shrink-0 opacity-40 group-hover:opacity-100 transition-opacity"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          <path d="m9 18 6-6-6-6" />
                        </svg>
                      )}
                    </Link>

                    <div className="flex items-center gap-3 shrink-0">
                      <RemoveYtPageButton connectionId={conn.id} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* TikTok Accounts */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ color: "var(--text-primary)" }}>
            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V9.19a8.16 8.16 0 0 0 4.77 1.52V7.27a4.85 4.85 0 0 1-1-.58z" />
          </svg>
          <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>TikTok</span>
          <span className="text-xs ml-1" style={{ color: "var(--text-muted)" }}>({profile.ttConnections.length})</span>
        </div>

        {profile.ttConnections.length === 0 ? (
          <div
            className="rounded-lg p-6 border text-center"
            style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}
          >
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              No TikTok accounts connected yet.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {profile.ttConnections.map((conn) => (
              <div
                key={conn.id}
                className="rounded-lg border overflow-hidden"
                style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
              >
                <div className="flex items-center justify-between gap-4 p-4">
                  <Link
                    href={`/creator/pages/tt/${conn.id}`}
                    className="flex items-center gap-3 min-w-0 flex-1 group"
                  >
                    {(profilePics.get(conn.id) ?? conn.profilePicUrl) ? (
                      <img
                        src={profilePics.get(conn.id) ?? conn.profilePicUrl!}
                        alt={conn.displayName ?? conn.username}
                        width={40}
                        height={40}
                        className="rounded-full shrink-0 object-cover"
                      />
                    ) : (
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                        style={{ background: "#010101", color: "#fff" }}
                      >
                        {(conn.displayName ?? conn.username)[0].toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate group-hover:underline" style={{ color: "var(--text-primary)" }}>
                        {conn.displayName ?? conn.username}
                      </p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                          @{conn.username}
                        </span>
                        {conn.followerCount != null && (
                          <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                            {conn.followerCount.toLocaleString()} followers
                          </span>
                        )}
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                          Added {new Date(conn.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <svg
                      width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                      className="shrink-0 opacity-40 group-hover:opacity-100 transition-opacity"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </Link>
                  <div className="flex items-center gap-3 shrink-0">
                    <RemoveTikTokPageButton connectionId={conn.id} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
