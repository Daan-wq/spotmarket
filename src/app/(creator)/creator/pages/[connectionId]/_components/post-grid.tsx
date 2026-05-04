"use client";

import { useState } from "react";
import Link from "next/link";
import type { IgMediaItem } from "@/types/instagram";

interface ActiveApplication {
  id: string;
  campaign: { id: string; name: string };
}

interface PostGridProps {
  media: IgMediaItem[];
  activeApplications: ActiveApplication[];
}

export function PostGrid({ media, activeApplications }: PostGridProps) {
  const [openPopover, setOpenPopover] = useState<string | null>(null);
  const [showJoinPrompt, setShowJoinPrompt] = useState<string | null>(null);

  if (media.length === 0) {
    return <p className="text-sm" style={{ color: "var(--text-muted)" }}>No posts found.</p>;
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {media.map((item: IgMediaItem) => (
        <div
          key={item.id}
          className="group relative rounded-lg overflow-hidden border"
          style={{ borderColor: "var(--border)", aspectRatio: "1" }}
        >
          {/* Thumbnail */}
          {(item.thumbnail_url || item.media_url) ? (
            <img
              src={item.thumbnail_url ?? item.media_url ?? ""}
              alt={item.caption?.slice(0, 50) ?? "Post"}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ background: "var(--bg-primary)" }}>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>{item.media_type}</span>
            </div>
          )}

          {/* Reels badge */}
          {item.media_product_type === "REELS" && (
            <div className="absolute top-2 left-2 z-10">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="white" className="drop-shadow">
                <path d="M5 3l14 9-14 9V3z" />
              </svg>
            </div>
          )}

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 text-white z-20 pointer-events-none group-hover:pointer-events-auto overflow-hidden p-2">
            {/* Stats */}
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
                <span className="text-sm font-semibold">{item.like_count.toLocaleString()}</span>
              </span>
              <span className="flex items-center gap-1">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <span className="text-sm font-semibold">{item.comments_count.toLocaleString()}</span>
              </span>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <a
                href={item.permalink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                style={{ background: "rgba(255,255,255,0.2)", color: "#fff" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.35)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.2)"; }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                Open
              </a>

              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (activeApplications.length === 0) {
                      setShowJoinPrompt(showJoinPrompt === item.id ? null : item.id);
                      setOpenPopover(null);
                    } else {
                      setOpenPopover(openPopover === item.id ? null : item.id);
                      setShowJoinPrompt(null);
                    }
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
                  style={{ background: "rgba(99,102,241,0.85)", color: "#fff" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(99,102,241,1)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(99,102,241,0.85)"; }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                  Submit
                </button>

                {/* No campaigns prompt */}
                {showJoinPrompt === item.id && (
                  <div
                    className="absolute bottom-full mb-2 right-0 rounded-lg shadow-xl overflow-hidden z-50 min-w-[200px] p-4"
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
                {openPopover === item.id && activeApplications.length > 0 && (
                  <div
                    className="absolute bottom-full mb-2 right-0 rounded-lg shadow-xl overflow-hidden z-50 min-w-[180px]"
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
                        href={`/creator/applications/${app.id}/submit?mediaUrl=${encodeURIComponent(item.permalink)}`}
                        className="flex items-center px-3 py-2 text-xs transition-colors"
                        style={{ color: "var(--text-primary)" }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--sidebar-hover-bg)"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
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
