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

function flattenStringValues(value: MessageValue): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(flattenStringValues);
  if (value === null || typeof value !== "object") return [];

  return Object.values(value).flatMap(flattenStringValues);
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

  it("keeps creator referral copy focused on campaign attribution, not cash rewards", () => {
    const referralCopy = [
      ...flattenStringValues(enMessages.creator.referral),
      ...flattenStringValues(nlMessages.creator.referral),
    ].join("\n");

    expect(referralCopy).not.toMatch(
      /€100|10%|commission|commissie|cap|earnings|earning|inkomsten|verdien/i,
    );
  });
});
