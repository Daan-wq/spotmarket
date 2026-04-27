"use client";

import Link from "next/link";
import type { ReactNode } from "react";

export type BioVerifyPlatform = "instagram" | "tiktok" | "facebook";

interface BioVerifyCardProps {
  platform: BioVerifyPlatform;
  brand: { color: string; gradient?: string; name: string };
  icon: ReactNode;
  oauthHref: string;
  oauthAvailable: boolean;
}

export function BioVerifyCard({ platform, brand, icon, oauthHref, oauthAvailable }: BioVerifyCardProps) {
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
            Choose how to connect
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Link
          href={`/creator/verify?platform=${platform}`}
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold transition-all"
          style={{ background: "var(--primary)", color: "#fff" }}
        >
          Verify via link in bio
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
          </svg>
        </Link>

        {oauthAvailable ? (
          <a
            href={oauthHref}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium border transition-all"
            style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
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
    </div>
  );
}
