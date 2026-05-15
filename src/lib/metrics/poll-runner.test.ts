import { beforeEach, describe, expect, it, vi } from "vitest";

const findFirstSignalMock = vi.fn();
const createSignalMock = vi.fn();
const publishEventMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    submissionSignal: {
      findFirst: (...args: unknown[]) => findFirstSignalMock(...args),
      create: (...args: unknown[]) => createSignalMock(...args),
    },
  },
}));

vi.mock("@/lib/event-bus", () => ({
  publishEvent: (...args: unknown[]) => publishEventMock(...args),
}));

import { emitFlag } from "./poll-runner";

beforeEach(() => {
  findFirstSignalMock.mockReset();
  createSignalMock.mockReset();
  publishEventMock.mockReset();

  findFirstSignalMock.mockResolvedValue(null);
  createSignalMock.mockResolvedValue({
    id: "sig_1",
    createdAt: new Date("2026-05-12T10:00:00.000Z"),
  });
});

describe("emitFlag", () => {
  it("creates and publishes a signal when no open signal exists for the same submission and type", async () => {
    await emitFlag("sub_1", {
      type: "BOT_SUSPECTED",
      severity: "WARN",
      payload: { reason: "low engagement on high view delta" },
    });

    expect(findFirstSignalMock).toHaveBeenCalledWith({
      where: {
        submissionId: "sub_1",
        type: "BOT_SUSPECTED",
        resolvedAt: null,
      },
      select: { id: true },
    });
    expect(createSignalMock).toHaveBeenCalledTimes(1);
    expect(publishEventMock).toHaveBeenCalledWith({
      type: "submission.flagged",
      submissionId: "sub_1",
      signalId: "sig_1",
      signal: "BOT_SUSPECTED",
      severity: "WARN",
      occurredAt: "2026-05-12T10:00:00.000Z",
    });
  });

  it("skips duplicate open signals for the same submission and type", async () => {
    findFirstSignalMock.mockResolvedValueOnce({ id: "sig_existing" });

    await emitFlag("sub_1", {
      type: "VELOCITY_DROP",
      severity: "INFO",
      payload: { reason: "views per hour dropped" },
    });

    expect(createSignalMock).not.toHaveBeenCalled();
    expect(publishEventMock).not.toHaveBeenCalled();
  });
});
