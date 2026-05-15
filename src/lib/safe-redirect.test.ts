import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "./safe-redirect";

describe("safeRedirectPath", () => {
  it("keeps relative app paths", () => {
    expect(safeRedirectPath("/creator/campaigns?tab=live")).toBe("/creator/campaigns?tab=live");
  });

  it("strips external origins down to their path", () => {
    expect(safeRedirectPath("https://evil.example/creator/campaigns")).toBe("/creator/campaigns");
  });

  it("uses the fallback for empty values", () => {
    expect(safeRedirectPath(null, "/sign-in")).toBe("/sign-in");
  });
});
