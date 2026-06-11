import { describe, expect, it, vi } from "vitest";
import { POST } from "./route";

describe("POST /api/auth/sign-in-events", () => {
  it("logs an allowed client event without logging extra submitted fields", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);

    const response = await POST(
      new Request("https://app.clipprofit.com/api/auth/sign-in-events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          event: "form_opened",
          attemptId: "14c5d507-b59e-43b0-84b9-f078dc33d23d",
          brandFlow: true,
          password: "never-log-this",
        }),
      }),
    );

    expect(response.status).toBe(204);
    const logs = JSON.stringify(info.mock.calls);
    expect(logs).toContain("form_opened");
    expect(logs).not.toContain("never-log-this");

    info.mockRestore();
  });

  it("rejects unknown event names", async () => {
    const response = await POST(
      new Request("https://app.clipprofit.com/api/auth/sign-in-events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          event: "password_entered",
          attemptId: "14c5d507-b59e-43b0-84b9-f078dc33d23d",
          brandFlow: true,
        }),
      }),
    );

    expect(response.status).toBe(400);
  });
});
