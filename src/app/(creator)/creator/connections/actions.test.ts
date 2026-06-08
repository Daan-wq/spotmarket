import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  userFindUnique: vi.fn(),
  igFindFirst: vi.fn(),
  igDelete: vi.fn(),
  fbFindFirst: vi.fn(),
  fbDelete: vi.fn(),
  ytFindFirst: vi.fn(),
  ytDelete: vi.fn(),
  ttFindFirst: vi.fn(),
  ttDelete: vi.fn(),
  profileUpdate: vi.fn(),
  resolveIncident: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requireAuth: mocks.requireAuth,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: mocks.userFindUnique },
    creatorIgConnection: {
      findFirst: mocks.igFindFirst,
      delete: mocks.igDelete,
    },
    creatorFbConnection: {
      findFirst: mocks.fbFindFirst,
      delete: mocks.fbDelete,
    },
    creatorYtConnection: {
      findFirst: mocks.ytFindFirst,
      delete: mocks.ytDelete,
    },
    creatorTikTokConnection: {
      findFirst: mocks.ttFindFirst,
      delete: mocks.ttDelete,
    },
    creatorProfile: { update: mocks.profileUpdate },
  },
}));

vi.mock("@/lib/connection-health", () => ({
  resolveConnectionHealthIncident: mocks.resolveIncident,
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

import {
  removeFbPage,
  removePage,
  removeTikTokPage,
  removeYtPage,
} from "./actions";

describe("connection removal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue({ userId: "supabase-1", role: "creator" });
    mocks.userFindUnique.mockResolvedValue({
      id: "user-1",
      creatorProfile: { id: "profile-1" },
    });
    mocks.igFindFirst.mockResolvedValue({ id: "ig-1" });
    mocks.fbFindFirst.mockResolvedValue({ id: "fb-1" });
    mocks.ytFindFirst.mockResolvedValue({ id: "yt-1" });
    mocks.ttFindFirst.mockResolvedValue({ id: "tt-1" });
    mocks.igDelete.mockResolvedValue({});
    mocks.fbDelete.mockResolvedValue({});
    mocks.ytDelete.mockResolvedValue({});
    mocks.ttDelete.mockResolvedValue({});
    mocks.resolveIncident.mockResolvedValue(undefined);
    mocks.profileUpdate.mockResolvedValue({});
    mocks.igFindFirst
      .mockResolvedValueOnce({ id: "ig-1" })
      .mockResolvedValueOnce({ id: "ig-remaining" });
  });

  it.each([
    ["IG", "ig-1", removePage, mocks.igDelete],
    ["FB", "fb-1", removeFbPage, mocks.fbDelete],
    ["YT", "yt-1", removeYtPage, mocks.ytDelete],
    ["TT", "tt-1", removeTikTokPage, mocks.ttDelete],
  ] as const)(
    "resolves the active %s incident before deleting the connection",
    async (connectionType, connectionId, action, deleteMock) => {
      await action(connectionId);

      expect(mocks.resolveIncident).toHaveBeenCalledWith(
        connectionType,
        connectionId,
        "UNLINKED",
      );
      expect(deleteMock).toHaveBeenCalledWith({ where: { id: connectionId } });
      expect(
        mocks.resolveIncident.mock.invocationCallOrder[0],
      ).toBeLessThan(deleteMock.mock.invocationCallOrder[0]);
    },
  );
});
