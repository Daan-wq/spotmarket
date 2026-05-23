type SignalPayloadLike = Record<string, unknown> | null;

export function getSignalRiskScore(payload: SignalPayloadLike): number | null {
  if (!payload) return null;
  const risk = payload.riskScore;
  return typeof risk === "number" && Number.isFinite(risk) ? risk : null;
}

export function getSignalTopReason(payload: SignalPayloadLike): string {
  if (!payload) return "";
  const reasons = payload.reasons;
  if (Array.isArray(reasons) && typeof reasons[0] === "string") return translateSignalReason(reasons[0]);
  const reason = payload.reason;
  return typeof reason === "string" ? translateSignalReason(reason) : "";
}

function evidenceCount(payload: SignalPayloadLike): number {
  if (!payload) return 0;
  const evidence = payload.evidence;
  return Array.isArray(evidence) ? evidence.length : 0;
}

function riskTone(risk: number): string {
  if (risk >= 70) return "border-red-200 bg-red-50 text-red-700";
  if (risk >= 40) return "border-orange-200 bg-orange-50 text-orange-700";
  return "border-neutral-200 bg-neutral-50 text-neutral-600";
}

export function SignalEvidence({ payload }: { payload: SignalPayloadLike }) {
  const risk = getSignalRiskScore(payload);
  const reason = getSignalTopReason(payload);
  const count = evidenceCount(payload);

  if (risk == null) {
    return <span className="text-xs text-neutral-500">{reason || "-"}</span>;
  }

  return (
    <div className="min-w-[180px] space-y-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${riskTone(risk)}`}>
          Risico {risk}
        </span>
        <span className="text-[11px] text-neutral-400">
          {count} {count === 1 ? "signaal" : "signalen"}
        </span>
      </div>
      <p className="text-xs text-neutral-600">{reason || "-"}</p>
    </div>
  );
}

function translateSignalReason(reason: string) {
  return reason
    .replace("Anti-bot risk", "Anti-bot risico")
    .replace("Views exceed account audience", "Views liggen boven de accountgrootte")
    .replace("View growth anomaly", "Ongebruikelijke viewgroei")
    .replace("Engagement collapse", "Engagementdaling")
    .replace("Token expired", "Token verlopen");
}
