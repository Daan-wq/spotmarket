import { beforeEach, describe, expect, test, vi } from "vitest";
import { updateCreatorProfile } from "./actions";

const actionMocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  revalidatePath: vi.fn(),
  cookies: vi.fn(),
  userFindUnique: vi.fn(),
  creatorProfileFindUnique: vi.fn(),
  creatorProfileUpdate: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: actionMocks.revalidatePath,
}));

vi.mock("next/headers", () => ({
  cookies: actionMocks.cookies,
}));

vi.mock("@/lib/auth", () => ({
  requireAuth: actionMocks.requireAuth,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: actionMocks.userFindUnique,
    },
    creatorProfile: {
      findUnique: actionMocks.creatorProfileFindUnique,
      update: actionMocks.creatorProfileUpdate,
    },
  },
}));

function profileForm({
  displayName = "Daan",
  username = "Clip_User",
  bio = "",
}: {
  displayName?: string;
  username?: string;
  bio?: string;
} = {}) {
  const formData = new FormData();
  formData.set("displayName", displayName);
  formData.set("username", username);
  formData.set("bio", bio);
  return formData;
}

describe("updateCreatorProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    actionMocks.requireAuth.mockResolvedValue({ userId: "supabase-1", role: "creator" });
    actionMocks.userFindUnique.mockResolvedValue({ id: "user-1" });
    actionMocks.creatorProfileFindUnique.mockResolvedValue(null);
    actionMocks.creatorProfileUpdate.mockResolvedValue({});
  });

  test("rejects a username that belongs to another account", async () => {
    actionMocks.creatorProfileFindUnique.mockResolvedValue({ userId: "user-2" });

    await expect(updateCreatorProfile(profileForm())).resolves.toEqual({
      ok: false,
      error: "Username is already taken.",
    });
    expect(actionMocks.creatorProfileUpdate).not.toHaveBeenCalled();
  });

  test("updates the current creator profile with a normalized username", async () => {
    await expect(updateCreatorProfile(profileForm())).resolves.toEqual({ ok: true });

    expect(actionMocks.creatorProfileFindUnique).toHaveBeenCalledWith({
      where: { username: "clip_user" },
      select: { userId: true },
    });
    expect(actionMocks.creatorProfileUpdate).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      data: {
        displayName: "Daan",
        username: "clip_user",
        bio: null,
      },
    });
  });
});
