import { describe, expect, it } from "vitest";
import enMessages from "../../messages/en.json";
import nlMessages from "../../messages/nl.json";

type MessageValue =
  | string
  | number
  | boolean
  | null
  | MessageValue[]
  | {
      [key: string]: MessageValue;
    };

function flattenKeys(value: MessageValue, prefix = ""): string[] {
  if (Array.isArray(value) || value === null || typeof value !== "object") {
    return prefix ? [prefix] : [];
  }

  return Object.entries(value).flatMap(([key, child]) =>
    flattenKeys(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe("localized messages", () => {
  it.each(["creator", "creatorSettings", "dashboard", "navigation"] as const)(
    "keeps Dutch %s keys in parity with English",
    (namespace) => {
      const enKeys = flattenKeys(enMessages[namespace]).sort();
      const nlKeys = flattenKeys(nlMessages[namespace]).sort();

      expect(nlKeys).toEqual(enKeys);
    },
  );

  it("includes the creator and admin dashboard namespaces", () => {
    const dashboardKeys = flattenKeys(enMessages.dashboard).sort();
    const creatorKeys = flattenKeys(enMessages.creator).sort();

    expect(dashboardKeys).toContain("creator.page.title");
    expect(dashboardKeys).toContain("admin.queue.followUps.title");
    expect(creatorKeys).toContain("campaigns.page.title");
    expect(creatorKeys).toContain("connections.page.headerTitle");
  });
});
