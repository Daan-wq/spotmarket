import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SignalActions, type SignalRowData } from "./signal-row";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

function signal(overrides: Partial<SignalRowData> = {}): SignalRowData {
  return {
    id: "signal-1",
    submissionId: "submission-1",
    type: "BOT_SUSPECTED",
    severity: "WARN",
    payload: null,
    createdAt: "2026-05-28T10:00:00.000Z",
    resolvedAt: null,
    campaignName: "ClipProfit",
    creatorEmail: "creator@example.com",
    postUrl: "https://example.com/post",
    creatorId: "creator-1",
    creatorProfileId: "profile-1",
    ...overrides,
  };
}

describe("SignalActions", () => {
  it("shows a reject clip action for unresolved bot suspected signals", () => {
    const html = renderToStaticMarkup(<SignalActions signal={signal()} />);

    expect(html).toContain("Bot beoordelen");
    expect(html).toContain("Clip afwijzen");
  });
});
