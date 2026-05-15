import { describe, expect, it, vi } from "vitest";
import { verifyCron } from "@/lib/cron-auth";
import { syncSiteAnalyticsSnapshots } from "@/lib/site-analytics/sync";
import { GET } from "./route";

vi.mock("@/lib/cron-auth", () => ({
  verifyCron: vi.fn(),
}));

vi.mock("@/lib/site-analytics/sync", () => ({
  syncSiteAnalyticsSnapshots: vi.fn(),
}));

describe("sync-site-analytics cron route", () => {
  it("rejects unauthorized requests", async () => {
    vi.mocked(verifyCron).mockReturnValue(false);

    const response = await GET(new Request("https://clipprofit.com/api/cron/sync-site-analytics"));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
    expect(syncSiteAnalyticsSnapshots).not.toHaveBeenCalled();
  });

  it("runs the snapshot sync for authorized requests", async () => {
    vi.mocked(verifyCron).mockReturnValue(true);
    vi.mocked(syncSiteAnalyticsSnapshots).mockResolvedValue({
      ok: true,
      snapshots: [],
    });

    const response = await GET(new Request("https://clipprofit.com/api/cron/sync-site-analytics"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, snapshots: [] });
  });
});
