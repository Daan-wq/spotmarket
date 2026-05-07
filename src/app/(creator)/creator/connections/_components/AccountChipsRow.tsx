"use client";

interface Account {
  id: string;
  username: string;
}

interface Props {
  accounts: Account[];
  /** Currently active id, or "all" for the All-accounts pseudo-chip. */
  activeId: string | "all";
  onChange: (id: string | "all") => void;
}

/**
 * Account chip row for a selected platform. Always shows a leading "All accounts"
 * pill; the rest are real connections from `accounts`. Wraps the visual idiom of
 * shared/connections/AccountSwitcher without modifying its types.
 */
export function AccountChipsRow({ accounts, activeId, onChange }: Props) {
  const allActive = activeId === "all";
  return (
    <div className="flex items-center gap-1 flex-wrap">
      <button
        type="button"
        onClick={() => onChange("all")}
        className="px-2.5 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer"
        style={{
          background: allActive ? "rgba(99,102,241,0.18)" : "var(--bg-card)",
          color: allActive ? "var(--primary)" : "var(--text-secondary)",
          border: `1px solid ${allActive ? "var(--primary)" : "var(--border)"}`,
        }}
      >
        All accounts
      </button>
      {accounts.map((acc) => {
        const active = acc.id === activeId;
        return (
          <button
            key={acc.id}
            type="button"
            onClick={() => onChange(acc.id)}
            className="px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer"
            style={{
              background: active ? "rgba(99,102,241,0.15)" : "transparent",
              color: active ? "var(--primary)" : "var(--text-muted)",
              border: `1px solid ${active ? "var(--primary)" : "var(--border)"}`,
            }}
          >
            @{acc.username}
          </button>
        );
      })}
    </div>
  );
}
