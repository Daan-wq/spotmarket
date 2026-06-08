import { describe, expect, it } from "vitest";
import { notifHref, notifText } from "./top-header";

describe("TOKEN_BROKEN notifications", () => {
  const notification = {
    id: "notification-1",
    type: "TOKEN_BROKEN",
    data: {
      accountLabel: "@example",
      message: "Token expired. Please connect your page again.",
      href: "/creator/connections?platform=ig&account=connection-1",
    },
    read: false,
    createdAt: "2026-06-08T12:00:00.000Z",
  };

  it("shows the affected account and readable action", () => {
    expect(notifText(notification)).toBe(
      "Token expired for @example. Please connect your page again.",
    );
  });

  it("links to the affected connection", () => {
    expect(notifHref(notification)).toBe(
      "/creator/connections?platform=ig&account=connection-1",
    );
  });
});
