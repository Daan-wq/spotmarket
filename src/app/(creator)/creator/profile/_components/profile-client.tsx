"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface ProfileData {
  displayName: string;
  email: string;
  avatarUrl: string | null;
  bio: string | null;
  primaryGeo: string;
  experienceLevel: string | null;
  memberSince: string;
}

interface BalanceData {
  available: number;
  pending: number;
  withdrawalHistory: {
    id: string;
    date: string;
    grossAmount: number;
    status: string;
    method: string;
  }[];
}

interface ProfileClientProps {
  initialTab: string;
  profileData: ProfileData;
  balanceData: BalanceData;
}

const TABS = [
  { key: "general", label: "General", icon: "user" },
  { key: "balance", label: "Balance", icon: "wallet" },
  { key: "community", label: "Community", icon: "discord" },
] as const;

export function ProfileClient({ initialTab, profileData, balanceData }: ProfileClientProps) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const router = useRouter();
  const initial = profileData.displayName.charAt(0).toUpperCase();

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    router.replace(`/creator/profile?tab=${tab}`, { scroll: false });
  };

  return (
    <div className="flex p-6 gap-6 max-w-5xl mx-auto">
      {/* Left Panel — Sub Navigation */}
      <div className="w-52 shrink-0 flex flex-col">
        <h2 className="text-lg font-bold mb-4" style={{ color: "var(--text-primary)" }}>Creator Profile</h2>
        <div className="flex items-center gap-2 mb-6">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ background: "#14b8a6" }}>
            {initial}
          </div>
          <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{profileData.displayName}</span>
        </div>

        <nav className="space-y-1">
          {TABS.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer text-left"
                style={{
                  background: active ? "var(--primary)" : "transparent",
                  color: active ? "#FFFFFF" : "var(--text-secondary)",
                }}
              >
                <TabIcon type={tab.icon} />
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div className="mt-6 pt-4" style={{ borderTop: "1px solid var(--border-default)" }}>
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer text-left"
              style={{ color: "var(--text-secondary)" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--sidebar-hover-bg)"; (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)"; }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Sign out
            </button>
          </form>
        </div>
      </div>

      {/* Right Panel — Content */}
      <div className="flex-1 min-w-0">
        {activeTab === "general" && <GeneralTab data={profileData} />}
        {activeTab === "balance" && <BalanceTab data={balanceData} />}
        {activeTab === "community" && <CommunityTab />}
      </div>
    </div>
  );
}

function GeneralTab({ data }: { data: ProfileData }) {
  const initial = data.displayName.charAt(0).toUpperCase();
  const memberDate = new Date(data.memberSince).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="rounded-xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)" }}>
      {/* Avatar */}
      <div className="text-center mb-6">
        <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white mx-auto mb-2" style={{ background: "#14b8a6" }}>
          {initial}
        </div>
        <button className="text-xs font-medium cursor-pointer" style={{ color: "var(--text-secondary)" }}>
          Change Avatar
        </button>
        <div className="mt-2">
          <div className="text-base font-bold" style={{ color: "var(--text-primary)" }}>{data.displayName}</div>
          <div className="text-xs" style={{ color: "var(--text-muted)" }}>{data.email}</div>
        </div>
      </div>

      {/* Profile Information */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold flex items-center gap-1.5" style={{ color: "var(--text-primary)" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
          </svg>
          Profile Information
        </h3>
        <button className="text-xs font-medium px-3 py-1.5 rounded-lg text-white cursor-pointer" style={{ background: "var(--primary)" }}>
          Edit Profile
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {[
          { label: "FULL NAME", value: data.displayName, icon: "user" },
          { label: "INDUSTRY", value: data.experienceLevel ?? "—", icon: "building" },
          { label: "EMAIL", value: data.email, icon: "mail", note: "Cannot be changed" },
          { label: "OBJECTIVE", value: data.bio ?? "—", icon: "target" },
          { label: "COUNTRY", value: data.primaryGeo, icon: "pin" },
          { label: "MEMBER SINCE", value: memberDate, icon: "calendar" },
        ].map((item) => (
          <div key={item.label} className="p-3 rounded-lg" style={{ background: "var(--bg-primary)" }}>
            <div className="text-xs font-semibold tracking-wider uppercase mb-1 flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
              {item.label}
            </div>
            <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{item.value}</div>
            {item.note && <div className="text-xs mt-0.5" style={{ color: "var(--error-text)" }}>{item.note}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function BalanceTab({ data }: { data: BalanceData }) {
  return (
    <div className="space-y-6">
      {/* Balance Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)" }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-muted)" }}>
                <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2.5" />
                <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
              </svg>
              <span className="text-xs font-semibold uppercase" style={{ color: "var(--text-muted)" }}>Available</span>
            </div>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: "var(--success-bg)", color: "var(--success-text)" }}>Ready</span>
          </div>
          <div className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>${data.available.toFixed(0)}</div>
          <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Ready to withdraw</div>
        </div>

        <div className="rounded-xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)" }}>
          <div className="flex items-center gap-2 mb-3">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-muted)" }}>
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
            <span className="text-xs font-semibold uppercase" style={{ color: "var(--text-muted)" }}>Pending</span>
          </div>
          <div className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>${data.pending.toFixed(0)}</div>
          <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>5-10 business days</div>
        </div>
      </div>

      {/* Withdraw Button */}
      <button
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white cursor-pointer"
        style={{ background: "var(--primary)" }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
        </svg>
        Withdraw funds from my ClipProfit Wallet
      </button>
      <p className="text-center text-xs" style={{ color: "var(--text-muted)" }}>
        Minimum withdrawal amount is $20. Current available: ${data.available.toFixed(0)}
      </p>

      {/* Withdrawal History */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-muted)" }}>
              <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
            <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Withdrawal History</span>
          </div>
        </div>
        <p className="text-xs mb-4" style={{ color: "var(--text-secondary)" }}>Track your payment status and timing</p>

        <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid var(--border-default)" }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "var(--bg-primary)" }}>
                <th className="text-left py-2.5 px-3 font-medium text-xs" style={{ color: "var(--text-muted)" }}>Date</th>
                <th className="text-left py-2.5 px-3 font-medium text-xs" style={{ color: "var(--text-muted)" }}>Gross Amount</th>
                <th className="text-left py-2.5 px-3 font-medium text-xs" style={{ color: "var(--text-muted)" }}>Net Received</th>
                <th className="text-left py-2.5 px-3 font-medium text-xs" style={{ color: "var(--text-muted)" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.withdrawalHistory.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>
                    No withdrawals yet
                  </td>
                </tr>
              ) : (
                data.withdrawalHistory.map((w) => (
                  <tr key={w.id} style={{ borderTop: "1px solid var(--border-default)" }}>
                    <td className="py-2.5 px-3" style={{ color: "var(--text-primary)" }}>
                      {new Date(w.date).toLocaleDateString()}
                    </td>
                    <td className="py-2.5 px-3" style={{ color: "var(--text-primary)" }}>${w.grossAmount.toFixed(2)}</td>
                    <td className="py-2.5 px-3" style={{ color: "var(--text-primary)" }}>—</td>
                    <td className="py-2.5 px-3">
                      <span className="text-xs font-medium capitalize" style={{ color: w.status === "confirmed" ? "var(--success-text)" : "var(--warning-text)" }}>
                        {w.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function CommunityTab() {
  return (
    <div className="rounded-xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)" }}>
      <div className="flex items-center gap-3 mb-2">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ color: "#5865F2" }}>
          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
        </svg>
        <h3 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>ClipProfit Community</h3>
      </div>
      <p className="text-sm mb-5" style={{ color: "var(--text-secondary)" }}>
        Connect with other creators, get campaign tips, and stay updated on new opportunities.
      </p>

      <div
        style={{
          borderRadius: "16px",
          overflow: "hidden",
          border: "1px solid var(--border-default)",
        }}
      >
        <iframe
          src="https://discord.com/widget?id=1486482870272000102&theme=dark"
          width="100%"
          height="400"
          allowTransparency={true}
          frameBorder="0"
          sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
          title="ClipProfit Discord Community"
          style={{ display: "block" }}
        />
      </div>
    </div>
  );
}

function TabIcon({ type }: { type: string }) {
  const props = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (type) {
    case "user": return <svg {...props}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>;
    case "wallet": return <svg {...props}><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2.5" /><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" /></svg>;
    case "discord": return <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" /></svg>;
    default: return null;
  }
}
