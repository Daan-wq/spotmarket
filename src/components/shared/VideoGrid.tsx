"use client";

import { useState } from "react";
import Link from "next/link";

interface VideoItem {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  shareUrl: string | null;
  viewCount: number;
  likeCount: number;
  commentCount?: number;
}

interface ActiveApplication {
  id: string;
  campaign: { id: string; name: string };
}

interface VideoGridProps {
  videos: VideoItem[];
  platform: "tiktok" | "youtube";
  username?: string;
  activeApplications?: ActiveApplication[];
}

export function VideoGrid({ videos, platform, username, activeApplications = [] }: VideoGridProps) {
  const [openPopover, setOpenPopover] = useState<string | null>(null);
  const [showJoinPrompt, setShowJoinPrompt] = useState<string | null>(null);

  if (videos.length === 0) {
    return (
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        No videos found — video access requires app approval.
      </p>
    );
  }

  function getUrl(video: VideoItem): string {
    if (video.shareUrl) return video.shareUrl;
    if (platform === "youtube") return `https://www.youtube.com/shorts/${video.id}`;
    return `https://www.tiktok.com/@${username ?? ""}/video/${video.id}`;
  }

  function formatCount(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toLocaleString();
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {videos.map((video) => (
        <div
          key={video.id}
          className="group relative rounded-lg overflow-hidden border"
          style={{ borderColor: "var(--border)", aspectRatio: "9/16" }}
        >
          {/* Thumbnail */}
          {video.thumbnailUrl ? (
            <img
              src={video.thumbnailUrl}
              alt={video.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center"
              style={{ background: "var(--bg-primary)" }}
            >
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>No thumbnail</span>
            </div>
          )}

          {/* Title overlay (always visible at bottom) */}
          <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent pointer-events-none">
            <p className="text-[10px] text-white font-medium line-clamp-2">{video.title || "Untitled"}</p>
          </div>

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3 z-20 pointer-events-none group-hover:pointer-events-auto p-3">
            {/* Stats */}
            <div className="flex items-center gap-3 text-white">
              <span className="flex items-center gap-1">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                </svg>
                <span className="text-xs font-semibold">{formatCount(video.viewCount)}</span>
              </span>
              <span className="flex items-center gap-1">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
                <span className="text-xs font-semibold">{formatCount(video.likeCount)}</span>
              </span>
              {video.commentCount !== undefined && (
                <span className="flex items-center gap-1">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  <span className="text-xs font-semibold">{formatCount(video.commentCount)}</span>
                </span>
              )}
            </div>

            {/* Buttons */}
            <div className="flex gap-2">
              {/* Open */}
              <a
                href={getUrl(video)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors"
                style={{ background: "rgba(255,255,255,0.2)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.35)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.2)"; }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                Open
              </a>

              {/* Submit */}
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (activeApplications.length === 0) {
                      setShowJoinPrompt(showJoinPrompt === video.id ? null : video.id);
                      setOpenPopover(null);
                    } else {
                      setOpenPopover(openPopover === video.id ? null : video.id);
                      setShowJoinPrompt(null);
                    }
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors cursor-pointer"
                  style={{ background: "rgba(99,102,241,0.85)" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(99,102,241,1)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(99,102,241,0.85)"; }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                  Submit
                </button>

                {/* No campaigns */}
                {showJoinPrompt === video.id && (
                  <div
                    className="absolute bottom-full mb-2 right-0 rounded-lg shadow-xl z-50 min-w-[190px] p-4"
                    style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
                  >
                    <p className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>
                      Join a campaign first!
                    </p>
                    <Link
                      href="/creator/campaigns"
                      className="flex items-center justify-center gap-1.5 w-full px-4 py-2 rounded-lg text-sm font-medium text-white"
                      style={{ background: "var(--primary)" }}
                    >
                      Discover Campaigns
                    </Link>
                  </div>
                )}

                {/* Campaign picker */}
                {openPopover === video.id && activeApplications.length > 0 && (
                  <div
                    className="absolute bottom-full mb-2 right-0 rounded-lg shadow-xl z-50 min-w-[180px] overflow-hidden"
                    style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
                  >
                    <div className="px-3 py-2 border-b" style={{ borderColor: "var(--border)" }}>
                      <p className="text-[10px] font-semibold" style={{ color: "var(--text-muted)" }}>
                        Choose campaign
                      </p>
                    </div>
                    {activeApplications.map((app) => (
                      <a
                        key={app.id}
                        href={`/creator/applications/${app.id}/submit?mediaUrl=${encodeURIComponent(getUrl(video))}`}
                        className="flex items-center px-3 py-2 text-xs transition-colors"
                        style={{ color: "var(--text-primary)" }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--sidebar-hover-bg)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                      >
                        {app.campaign.name}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
