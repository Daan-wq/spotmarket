import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AntiBotPayload } from "@/lib/contracts/signals";

const findFirstSignalMock = vi.fn();
const createSignalMock = vi.fn();
const updateSignalMock = vi.fn();
const publishEventMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    submissionSignal: {
      findFirst: (...args: unknown[]) => findFirstSignalMock(...args),
      create: (...args: unknown[]) => createSignalMock(...args),
      update: (...args: unknown[]) => updateSignalMock(...args),
    },
  },
}));

vi.mock("@/lib/event-bus", () => ({
  publishEvent: (...args: unknown[]) => publishEventMock(...args),
}));

import { AUTO_ANTIBOT_RESOLVED_BY, syncAntiBotSignal } from "./anti-bot-signal";

function payload(riskScore: number): AntiBotPayload {
  return {
    reason: `Anti-bot risk ${riskScore}/100`,
    riskScore,
    confidence: riskScore >= 70 ? "HIGH" : riskScore >= 40 ? "MEDIUM" : "LOW",
    reasons: riskScore > 0 ? ["risk"] : [],
    evidence: [],
    evaluatedAt: "2026-05-25T12:00:00.000Z",
    version: "anti-bot-v3",
  };
}

beforeEach(() => {
  findFirstSignalMock.mockReset();
  createSignalMock.mockReset();
  updateSignalMock.mockReset();
  publishEventMock.mockReset();

  findFirstSignalMock.mockResolvedValue(null);
  createSignalMock.mockResolvedValue({
    id: "sig_new",
    createdAt: new Date("2026-05-25T12:00:00.000Z"),
  });
  updateSignalMock.mockResolvedValue({ id: "sig_existing" });
});

describe("syncAntiBotSignal", () => {
  it("creates a new BOT_SUSPECTED signal when risk is above threshold", async () => {
    const result = await syncAntiBotSignal("sub_1", payload(78));

    expect(result).toEqual({ action: "created", signalId: "sig_new" });
    expect(createSignalMock).toHaveBeenCalledWith({
      data: {
        submissionId: "sub_1",
        type: "BOT_SUSPECTED",
        severity: "CRITICAL",
        payload: expect.objectContaining({ riskScore: 78, version: "anti-bot-v3" }),
      },
      select: { id: true, createdAt: true },
    });
    expect(publishEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "submission.flagged",
        submissionId: "sub_1",
        signalId: "sig_new",
        signal: "BOT_SUSPECTED",
        severity: "CRITICAL",
      }),
    );
  });

  it("refreshes an existing WARN signal payload when risk remains suspicious", async () => {
    findFirstSignalMock.mockResolvedValueOnce({
      id: "sig_existing",
      severity: "WARN",
      payload: payload(42),
    });

    const result = await syncAntiBotSignal("sub_1", payload(55));

    expect(result).toEqual({ action: "updated", signalId: "sig_existing" });
    expect(updateSignalMock).toHaveBeenCalledWith({
      where: { id: "sig_existing" },
      data: {
        severity: "WARN",
        payload: expect.objectContaining({ riskScore: 55, version: "anti-bot-v3" }),
      },
    });
  });

  it("downgrades an existing CRITICAL signal to WARN when risk drops but stays suspicious", async () => {
    findFirstSignalMock.mockResolvedValueOnce({
      id: "sig_existing",
      severity: "CRITICAL",
      payload: payload(75),
    });

    const result = await syncAntiBotSignal("sub_1", payload(45));

    expect(result).toEqual({ action: "downgraded", signalId: "sig_existing" });
    expect(updateSignalMock).toHaveBeenCalledWith({
      where: { id: "sig_existing" },
      data: {
        severity: "WARN",
        payload: expect.objectContaining({ riskScore: 45, version: "anti-bot-v3" }),
      },
    });
  });

  it("auto-resolves an existing open signal when recomputed risk is healthy", async () => {
    findFirstSignalMock.mockResolvedValueOnce({
      id: "sig_existing",
      severity: "CRITICAL",
      payload: payload(75),
    });
    const now = new Date("2026-05-25T13:00:00.000Z");

    const result = await syncAntiBotSignal("sub_1", payload(25), { now });

    expect(result).toEqual({ action: "resolved", signalId: "sig_existing" });
    expect(updateSignalMock).toHaveBeenCalledWith({
      where: { id: "sig_existing" },
      data: {
        severity: "INFO",
        payload: expect.objectContaining({ riskScore: 25, version: "anti-bot-v3" }),
        resolvedAt: now,
        resolvedBy: AUTO_ANTIBOT_RESOLVED_BY,
      },
    });
  });

  it("does nothing when healthy risk has no existing open signal", async () => {
    const result = await syncAntiBotSignal("sub_1", payload(0));

    expect(result).toEqual({ action: "unchanged" });
    expect(createSignalMock).not.toHaveBeenCalled();
    expect(updateSignalMock).not.toHaveBeenCalled();
  });
});
