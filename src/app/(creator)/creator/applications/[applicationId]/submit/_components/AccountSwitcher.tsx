"use client";

interface Account {
  id: string;
  username: string;
}

interface Props {
  accounts: Account[];
  activeId: string;
  onChange: (id: string) => void;
}

export default function AccountSwitcher({ accounts, activeId, onChange }: Props) {
  if (accounts.length <= 1) return null;
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {accounts.map((acc) => (
        <button
          key={acc.id}
          onClick={() => onChange(acc.id)}
          className="px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer"
          style={{
            background: activeId === acc.id ? "rgba(99,102,241,0.15)" : "transparent",
            color: activeId === acc.id ? "var(--primary)" : "var(--text-muted)",
            border: `1px solid ${activeId === acc.id ? "var(--primary)" : "var(--border)"}`,
          }}
        >
          @{acc.username}
        </button>
      ))}
    </div>
  );
}
