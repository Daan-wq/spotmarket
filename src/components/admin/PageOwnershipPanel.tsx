import { ContractStatus, PageTier } from "@prisma/client";

interface PageOwnershipPanelProps {
  operatorName: string | null;
  operatorEmail: string | null;
  contractStatus: ContractStatus;
  contractSignedAt: Date | null;
  copyrightAssigned: boolean;
  trademarkBOIP: boolean;
  trademarkRef: string | null;
  credentialVaultId: string | null;
  contentBacklogDays: number;
  tierLevel: PageTier;
  replacementReady: boolean;
  noticePeriodDays: number;
}

const CONTRACT_STATUS_STYLES: Record<ContractStatus, { bg: string; color: string; label: string }> = {
  NONE:    { bg: "var(--error-bg)", color: "var(--error-text)", label: "Geen contract" },
  SENT:    { bg: "var(--warning-bg)", color: "var(--warning-text)", label: "Verzonden" },
  SIGNED:  { bg: "var(--success-bg)", color: "var(--success-text)", label: "Getekend ✓" },
  EXPIRED: { bg: "var(--bg-secondary)", color: "var(--text-secondary)", label: "Verlopen" },
};

const TIER_STYLES: Record<PageTier, { bg: string; color: string }> = {
  A: { bg: "var(--success-bg)", color: "var(--success-text)" },
  B: { bg: "var(--accent-bg)", color: "var(--accent-foreground)" },
  C: { bg: "var(--bg-secondary)", color: "var(--text-secondary)" },
};

function BacklogIndicator({ days }: { days: number }) {
  if (days >= 30) {
    return (
      <span className="inline-flex items-center gap-1 text-sm font-medium" style={{ color: "var(--success-text)" }}>
        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
        {days} dagen ✓
      </span>
    );
  }
  if (days >= 14) {
    return (
      <span className="inline-flex items-center gap-1 text-sm font-medium" style={{ color: "var(--warning-text)" }}>
        <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />
        {days} dagen ⚠️
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-sm font-medium" style={{ color: "var(--error-text)" }}>
      <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
      {days} dagen — urgent
    </span>
  );
}

export function PageOwnershipPanel(props: PageOwnershipPanelProps) {
  const contractCfg = CONTRACT_STATUS_STYLES[props.contractStatus];
  const tierCfg = TIER_STYLES[props.tierLevel];

  return (
    <div
      className="rounded-xl overflow-hidden mb-8"
      style={{ border: "1px solid var(--border)" }}
    >
      <div
        className="px-5 py-3 flex items-center justify-between"
        style={{
          borderBottom: "1px solid var(--border)",
          background: "var(--bg-elevated)",
        }}
      >
        <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
          Ownership & Contract
        </p>
        <div className="flex items-center gap-2">
          <span
            className="text-xs px-2.5 py-0.5 rounded-full font-semibold"
            style={{ background: tierCfg.bg, color: tierCfg.color }}
          >
            Tier {props.tierLevel}
          </span>
          <span
            className="text-xs px-2.5 py-0.5 rounded-full font-medium"
            style={{ background: contractCfg.bg, color: contractCfg.color }}
          >
            {contractCfg.label}
          </span>
        </div>
      </div>

      {props.contractStatus !== "SIGNED" && (
        <div
          className="px-5 py-2 text-xs"
          style={{
            background: "var(--error-bg)",
            color: "var(--error-text)",
            borderBottom: "1px solid var(--error)",
          }}
        >
          ⚠️ Geen getekend contract — page heeft geen juridische bescherming
        </div>
      )}

      <div className="grid grid-cols-2 gap-px" style={{ background: "var(--border)" }}>
        <div className="px-5 py-4" style={{ background: "var(--bg-elevated)" }}>
          <p className="text-xs mb-1" style={{ color: "var(--text-secondary)" }}>
            OPERATOR
          </p>
          <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            {props.operatorName ?? "—"}
          </p>
          {props.operatorEmail && (
            <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
              {props.operatorEmail}
            </p>
          )}
        </div>

        <div className="px-5 py-4" style={{ background: "var(--bg-elevated)" }}>
          <p className="text-xs mb-1" style={{ color: "var(--text-secondary)" }}>
            CONTENT BACKLOG
          </p>
          <BacklogIndicator days={props.contentBacklogDays} />
          <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
            doel: 30–60 dagen
          </p>
        </div>

        <div className="px-5 py-4" style={{ background: "var(--bg-elevated)" }}>
          <p className="text-xs mb-1" style={{ color: "var(--text-secondary)" }}>
            COPYRIGHT
          </p>
          <p
            className="text-sm font-medium"
            style={{
              color: props.copyrightAssigned
                ? "var(--success-text)"
                : "var(--error-text)",
            }}
          >
            {props.copyrightAssigned ? "✓ Toegewezen" : "✗ Niet toegewezen"}
          </p>
        </div>

        <div className="px-5 py-4" style={{ background: "var(--bg-elevated)" }}>
          <p className="text-xs mb-1" style={{ color: "var(--text-secondary)" }}>
            BOIP TRADEMARK
          </p>
          <p
            className="text-sm font-medium"
            style={{
              color: props.trademarkBOIP
                ? "var(--success-text)"
                : "var(--text-secondary)",
            }}
          >
            {props.trademarkBOIP
              ? `✓ Geregistreerd${props.trademarkRef ? ` (${props.trademarkRef})` : ""}`
              : "— Niet geregistreerd"}
          </p>
        </div>

        <div className="px-5 py-4" style={{ background: "var(--bg-elevated)" }}>
          <p className="text-xs mb-1" style={{ color: "var(--text-secondary)" }}>
            CREDENTIAL VAULT
          </p>
          <p
            className="text-sm font-medium"
            style={{
              color: props.credentialVaultId
                ? "var(--success-text)"
                : "var(--error-text)",
            }}
          >
            {props.credentialVaultId
              ? `✓ ${props.credentialVaultId}`
              : "✗ Niet ingesteld"}
          </p>
        </div>

        <div className="px-5 py-4" style={{ background: "var(--bg-elevated)" }}>
          <p className="text-xs mb-1" style={{ color: "var(--text-secondary)" }}>
            BACKUP OPERATOR
          </p>
          <p
            className="text-sm font-medium"
            style={{
              color: props.replacementReady
                ? "var(--success-text)"
                : "var(--warning-text)",
            }}
          >
            {props.replacementReady ? "✓ Klaar" : "⚠️ Niet beschikbaar"}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
            Opzegtermijn: {props.noticePeriodDays} dagen
          </p>
        </div>
      </div>

      {props.contractSignedAt && (
        <div
          className="px-5 py-3"
          style={{
            background: "var(--bg-secondary)",
            borderTop: "1px solid var(--border)",
          }}
        >
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
            Contract getekend op{" "}
            <span style={{ color: "var(--text-primary)" }}>
              {new Date(props.contractSignedAt).toLocaleDateString("nl-NL", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
