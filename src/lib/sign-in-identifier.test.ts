import { describe, expect, it } from "vitest";
import { resolveSignInEmail } from "./sign-in-identifier";

describe("resolveSignInEmail", () => {
  it("normalizes an email address", () => {
    expect(resolveSignInEmail(" Owner@Example.COM ")).toBe("owner@example.com");
  });

  it("maps a username to the internal login domain", () => {
    expect(resolveSignInEmail(" BramsFruit ")).toBe("bramsfruit@login.clipprofit.com");
  });

  it("rejects invalid usernames", () => {
    expect(() => resolveSignInEmail("brams fruit")).toThrow("Invalid sign-in identifier");
  });
});
