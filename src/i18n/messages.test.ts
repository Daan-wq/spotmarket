import { describe, expect, it } from "vitest";
import enMessages from "../../messages/en.json";
import nlMessages from "../../messages/nl.json";

type MessageValue = string | number | boolean | null | MessageValue[] | {
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
  it("keeps Dutch dashboard keys in parity with English", () => {
    const enDashboardKeys = flattenKeys(enMessages.dashboard).sort();
    const nlDashboardKeys = flattenKeys(nlMessages.dashboard).sort();

    expect(nlDashboardKeys).toEqual(enDashboardKeys);
    expect(enDashboardKeys).toContain("creator.page.title");
    expect(enDashboardKeys).toContain("admin.queue.followUps.title");
  });
});
