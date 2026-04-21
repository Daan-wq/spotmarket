"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

type ProviderKey = "youtube" | "tiktok" | "instagram" | "facebook" | "discord";

interface ProviderMeta {
  label: string;
  color: string;
  reconnectHref: string;
}

const PROVIDERS: Record<ProviderKey, ProviderMeta> = {
  youtube: { label: "YouTube", color: "#FF0000", reconnectHref: "/api/auth/youtube" },
  tiktok: { label: "TikTok", color: "#010101", reconnectHref: "/api/auth/tiktok" },
  instagram: { label: "Instagram", color: "#E1306C", reconnectHref: "/api/auth/instagram" },
  facebook: { label: "Facebook", color: "#1877F2", reconnectHref: "/api/auth/facebook" },
  discord: { label: "Discord", color: "#5865F2", reconnectHref: "/api/auth/discord" },
};

const ERROR_TO_PROVIDER: Record<string, ProviderKey> = {
  yt_missing_scopes: "youtube",
  tt_missing_scopes: "tiktok",
  ig_missing_scopes: "instagram",
  fb_missing_scopes: "facebook",
  discord_missing_scopes: "discord",
};

export function ScopeErrorDialog() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [provider, setProvider] = useState<ProviderKey | null>(null);

  useEffect(() => {
    const err = searchParams.get("error");
    if (!err) return;
    const match = ERROR_TO_PROVIDER[err];
    if (match) setProvider(match);
  }, [searchParams]);

  if (!provider) return null;

  const meta = PROVIDERS[provider];

  const handleClose = () => {
    setProvider(null);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("error");
    params.delete("missing");
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0, 0, 0, 0.6)", backdropFilter: "blur(4px)" }}
      onClick={handleClose}
    >
      <div
        className="rounded-xl p-6 max-w-md w-full shadow-2xl border"
        style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{ background: meta.color }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
            {meta.label} permissions needed
          </h3>
        </div>

        <p className="text-sm mb-5" style={{ color: "var(--text-secondary)" }}>
          Please select both boxes so ClipProfit can track your views automatically.
        </p>

        <div className="flex gap-3 mb-4">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium border transition-all cursor-pointer"
            style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
          >
            Cancel
          </button>
          <a
            href={meta.reconnectHref}
            className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white text-center transition-all hover:opacity-90"
            style={{ background: meta.color }}
          >
            Connect again
          </a>
        </div>

        <p className="text-xs text-center" style={{ color: "var(--text-muted)", opacity: 0.75 }}>
          We use your data with care, please learn more in{" "}
          <Link href="/privacy" className="underline" style={{ color: "var(--text-muted)" }}>
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
