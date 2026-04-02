"use client";

interface Campaign {
  id: string;
  name: string;
  contentType: string | null;
  creatorCpv: string;
  deadline: string;
}

interface CampaignWithApp {
  applicationId: string;
  campaign: Campaign;
}

interface CampaignSelectorProps {
  campaigns: CampaignWithApp[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function CampaignSelector({ campaigns, selectedId, onSelect }: CampaignSelectorProps) {
  function formatCpv(cpv: string): string {
    const num = parseFloat(cpv);
    return `$${(num * 1000000).toFixed(0)}/1K views`;
  }

  function getDaysRemaining(deadline: string): number {
    return Math.ceil((new Date(deadline).getTime() - new Date().getTime()) / 86400000);
  }

  function getStatusBadge(daysRemaining: number): { label: string; color: string; bg: string } {
    if (daysRemaining < 3) {
      return { label: "ENDING SOON", color: "#d97706", bg: "#fef3c7" };
    }
    return { label: "ACTIVE", color: "#059669", bg: "#ecfdf5" };
  }

  return (
    <div className="p-4 space-y-2">
      {campaigns.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            No active campaigns
          </p>
        </div>
      ) : (
        campaigns.map(({ campaign }) => {
          const daysRemaining = getDaysRemaining(campaign.deadline);
          const status = getStatusBadge(daysRemaining);
          const isSelected = campaign.id === selectedId;

          return (
            <button
              key={campaign.id}
              onClick={() => onSelect(campaign.id)}
              className="w-full text-left p-3 rounded-lg transition-all duration-200"
              style={{
                background: isSelected ? "var(--accent-bg)" : "var(--bg-primary)",
                borderLeft: `3px solid ${isSelected ? "var(--accent)" : "transparent"}`,
              }}
              onMouseEnter={e => {
                if (!isSelected) {
                  (e.currentTarget as HTMLElement).style.background = "var(--bg-primary)";
                }
              }}
              onMouseLeave={e => {
                if (!isSelected) {
                  (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)";
                }
              }}
            >
              <div className="flex items-start justify-between mb-2">
                <h3
                  className="text-sm font-semibold truncate"
                  style={{ color: "var(--text-primary)" }}
                  title={campaign.name}
                >
                  {campaign.name}
                </h3>
              </div>

              <p className="text-xs mb-2" style={{ color: "var(--text-secondary)" }}>
                {campaign.contentType || "Instagram Reel"}
              </p>

              <p className="text-xs font-semibold mb-2" style={{ color: "var(--accent)" }}>
                {formatCpv(campaign.creatorCpv)}
              </p>

              <div className="flex items-center justify-between">
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{ color: status.color, background: status.bg }}
                >
                  {status.label}
                </span>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {daysRemaining}d left
                </span>
              </div>
            </button>
          );
        })
      )}
    </div>
  );
}
