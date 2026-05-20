import { describe, expect, test, vi } from "vitest";
import {
  createUniqueUsername,
  createUsernameCandidate,
  normalizeUsernameInput,
  validateUsername,
} from "./username";

describe("username helpers", () => {
  test("normalizes user input before storage", () => {
    expect(normalizeUsernameInput(" @DaAn_01 ")).toBe("daan_01");
  });

  test("validates normalized username format", () => {
    expect(validateUsername("clip_profit123")).toEqual({
      ok: true,
      username: "clip_profit123",
    });
    expect(validateUsername("ab")).toEqual({
      ok: false,
      error: "Username must be at least 3 characters.",
    });
    expect(validateUsername("daan!")).toEqual({
      ok: false,
      error: "Username can only contain lowercase letters, numbers, and underscores.",
    });
  });

  test("creates a safe username candidate from a display name", () => {
    expect(createUsernameCandidate("Daan van ClipProfit!")).toBe("daan_van_clipprofit");
    expect(createUsernameCandidate("!!!")).toBe("creator");
  });

  test("finds the next available username when a candidate is taken", async () => {
    const isTaken = vi.fn(async (username: string) =>
      ["daan", "daan_1"].includes(username),
    );

    await expect(createUniqueUsername("Daan", isTaken)).resolves.toBe("daan_2");
    expect(isTaken).toHaveBeenCalledWith("daan");
    expect(isTaken).toHaveBeenCalledWith("daan_1");
    expect(isTaken).toHaveBeenCalledWith("daan_2");
  });
});
