"use client";

import type { ReactNode } from "react";

export type BioVerifyPlatform = "instagram" | "tiktok" | "facebook";

interface BioVerifyCardProps {
  platform: BioVerifyPlatform;
  brand: { color: string; gradient?: string; name: string };
  icon: ReactNode;
  oauthHref: string;
  oauthAvailable: boolean;
}

export function BioVerifyCard({ platform: _platform, brand, icon, oauthHref, oauthAvailable }: BioVerifyCardProps) {
  return (
    <div
      className="rounded-lg border p-4 flex flex-col gap-3"
      style={{ background: "var(--bg-primary)", borderColor: "var(--border)" }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: brand.gradient ?? brand.color }}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            {brand.name}
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {oauthAvailable ? "Sign in to connect your account" : "Login coming soon"}
          </p>
        </div>
      </div>

      {oauthAvailable ? (
        <a
          href={oauthHref}
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold transition-all"
          style={{ background: "var(--primary)", color: "#fff" }}
        >
          Connect via login
        </a>
      ) : (
        <button
          type="button"
          disabled
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium border cursor-not-allowed opacity-50"
          style={{ borderColor: "var(--border)", color: "var(--text-muted)", background: "var(--bg-card)" }}
        >
          Login
        </button>
      )}
    </div>
  );
}
