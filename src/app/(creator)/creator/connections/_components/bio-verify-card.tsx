"use client";

import { PlatformLogo } from "@clipprofit/platform-icons";

// NOTE: name kept for backwards compatibility with existing imports. The
// bio-verify path was deprecated by Subsystem A (tracking foundation) - this
// is now an OAuth-only connect card.

interface ConnectCardProps {
  brand: { name: string; platform: string };
  oauthHref: string;
  oauthAvailable: boolean;
  buttonLabel?: string;
}

export function BioVerifyCard({
  brand,
  oauthHref,
  oauthAvailable,
  buttonLabel,
}: ConnectCardProps) {
  return (
    <div
      className="rounded-lg border p-4 flex flex-col gap-3"
      style={{ background: "var(--bg-primary)", borderColor: "var(--border)" }}
    >
      <div className="flex items-center gap-3">
        <PlatformLogo platform={brand.platform} alt={brand.name} size={36} className="shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            {brand.name}
          </p>
        </div>
      </div>

      {oauthAvailable ? (
        <a
          href={oauthHref}
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold transition-all"
          style={{ background: "var(--primary)", color: "#fff" }}
        >
          {buttonLabel ?? `Connect ${brand.name}`}
        </a>
      ) : (
        <button
          type="button"
          disabled
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium border cursor-not-allowed opacity-50"
          style={{ borderColor: "var(--border)", color: "var(--text-muted)", background: "var(--bg-card)" }}
        >
          Coming soon
        </button>
      )}
    </div>
  );
}
