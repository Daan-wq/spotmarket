"use client";

import { DashboardPlatformGlyph } from "@/lib/stats/platform-icons";

export type ConnectionPlatform = "ig" | "tt" | "fb" | "yt";

const PLATFORM_LABELS: Record<ConnectionPlatform, string> = {
  ig: "Instagram",
  tt: "TikTok",
  fb: "Facebook",
  yt: "YouTube",
};

interface Props<P extends ConnectionPlatform = ConnectionPlatform> {
  platforms: P[];
  active: P;
  onChange: (p: P) => void;
}

export default function PlatformTabs<P extends ConnectionPlatform = ConnectionPlatform>({
  platforms,
  active,
  onChange,
}: Props<P>) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {platforms.map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer"
          style={{
            background: active === p ? "var(--primary)" : "transparent",
            color: active === p ? "#fff" : "var(--text-secondary)",
            border: active === p ? "none" : "1px solid var(--border)",
          }}
        >
          <DashboardPlatformGlyph platform={p} size={14} />
          {PLATFORM_LABELS[p]}
        </button>
      ))}
    </div>
  );
}
