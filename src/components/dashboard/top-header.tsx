"use client";

type TopHeaderProps = {
  title: string;
  displayName?: string;
  followers?: number;
};

export function TopHeader({ title, displayName, followers }: TopHeaderProps) {
  return (
    <div
      className="flex items-center justify-between px-6 py-4 shrink-0"
      style={{ borderBottom: "1px solid #f3f4f6", background: "#ffffff" }}
    >
      {/* Title */}
      <h1 className="text-lg font-semibold" style={{ color: "#111827" }}>{title}</h1>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <button
          className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors cursor-pointer"
          style={{ color: "#9ca3af" }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = "#f3f4f6";
            (e.currentTarget as HTMLElement).style.color = "#374151";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = "transparent";
            (e.currentTarget as HTMLElement).style.color = "#9ca3af";
          }}
          aria-label="Search"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
        </button>

        {/* Bell */}
        <button
          className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors cursor-pointer relative"
          style={{ color: "#9ca3af" }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = "#f3f4f6";
            (e.currentTarget as HTMLElement).style.color = "#374151";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = "transparent";
            (e.currentTarget as HTMLElement).style.color = "#9ca3af";
          }}
          aria-label="Notifications"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
        </button>

        {/* User */}
        {displayName && (
          <div className="flex items-center gap-2.5 pl-2" style={{ borderLeft: "1px solid #f3f4f6" }}>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
              style={{ background: "#111827" }}
            >
              {displayName.slice(0, 1).toUpperCase()}
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-semibold leading-none" style={{ color: "#111827" }}>{displayName}</p>
              {followers && (
                <p className="text-xs mt-0.5" style={{ color: "#9ca3af" }}>
                  {followers >= 1000 ? `${(followers / 1000).toFixed(0)}K` : followers} followers
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
