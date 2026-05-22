import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SignalEvidence, getSignalRiskScore, getSignalTopReason } from "./signal-evidence";

describe("SignalEvidence", () => {
  it("renders anti-bot risk score and top reason", () => {
    const payload = {
      reason: "Anti-bot risk 78/100",
      riskScore: 78,
      confidence: "HIGH",
      reasons: ["Verdachte viewgroei met lage engagement", "Views exceed account audience"],
      evidence: [
        { kind: "VELOCITY_ANOMALY", label: "View growth anomaly", points: 35 },
        { kind: "ENGAGEMENT_COLLAPSE", label: "Engagement collapse", points: 45 },
      ],
      evaluatedAt: "2026-05-12T10:00:00.000Z",
      version: "anti-bot-v1",
    };

    const html = renderToStaticMarkup(<SignalEvidence payload={payload} />);

    expect(getSignalRiskScore(payload)).toBe(78);
    expect(getSignalTopReason(payload)).toBe("Verdachte viewgroei met lage engagement");
    expect(html).toContain("Risk 78");
    expect(html).toContain("Verdachte viewgroei met lage engagement");
    expect(html).toContain("2 signals");
  });

  it("falls back to the plain reason for non anti-bot payloads", () => {
    const payload = { reason: "Token expired" };
    const html = renderToStaticMarkup(<SignalEvidence payload={payload} />);

    expect(getSignalRiskScore(payload)).toBeNull();
    expect(getSignalTopReason(payload)).toBe("Token expired");
    expect(html).toContain("Token expired");
  });
});
