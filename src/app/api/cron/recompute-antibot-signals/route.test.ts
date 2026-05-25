import { describe, expect, it, vi } from "vitest";
import { verifyCron } from "@/lib/cron-auth";
import { recomputeOpenAntiBotSignals } from "@/lib/metrics/anti-bot-signal";
import { GET } from "./route";

vi.mock("@/lib/cron-auth", () => ({
  verifyCron: vi.fn(),
}));

vi.mock("@/lib/metrics/anti-bot-signal", () => ({
  recomputeOpenAntiBotSignals: vi.fn(),
}));

describe("recompute-antibot-signals cron route", () => {
  it("rejects unauthorized requests", async () => {
    vi.mocked(verifyCron).mockReturnValue(false);

    const response = await GET(
      new Request("https://clipprofit.com/api/cron/recompute-antibot-signals"),
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
    expect(recomputeOpenAntiBotSignals).not.toHaveBeenCalled();
  });

  it("recomputes open anti-bot signals with an optional batch limit", async () => {
    vi.mocked(verifyCron).mockReturnValue(true);
    vi.mocked(recomputeOpenAntiBotSignals).mockResolvedValue({
      processed: 2,
      updated: 1,
      downgraded: 0,
      resolved: 1,
      unchanged: 0,
      failed: 0,
    });

    const response = await GET(
      new Request("https://clipprofit.com/api/cron/recompute-antibot-signals?limit=25"),
    );

    expect(response.status).toBe(200);
    expect(recomputeOpenAntiBotSignals).toHaveBeenCalledWith({ limit: 25 });
    expect(await response.json()).toEqual({
      success: true,
      processed: 2,
      updated: 1,
      downgraded: 0,
      resolved: 1,
      unchanged: 0,
      failed: 0,
    });
  });
});
