import { describe, expect, it, vi } from "vitest";
import type { Prisma } from "@prisma/client";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import {
  AuthIdentityConflictError,
  claimUserForAuthIdentity,
  extractDiscordIdentity,
  resolveUserForAuthIdentity,
  type AuthIdentityUser,
  type AuthIdentityUserDelegate,
} from "./auth-identity";

function user(overrides: Partial<AuthIdentityUser>): AuthIdentityUser {
  return {
    id: "user-1",
    supabaseId: "supabase-1",
    email: "creator@example.com",
    role: "creator",
    referralCode: null,
    referredBy: null,
    referralEarnings: {} as AuthIdentityUser["referralEarnings"],
    notifyCampaignAlerts: true,
    notifyPayoutAlerts: true,
    profilePublic: true,
    dismissedFacebookPageWarning: false,
    dismissedInstagramProfessionalWarning: false,
    discordId: null,
    discordUsername: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    creatorProfile: null,
    ...overrides,
  };
}

function delegateWith(users: AuthIdentityUser[]): AuthIdentityUserDelegate & {
  findUnique: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
} {
  const findUnique = vi.fn(async ({ where }: { where: Prisma.UserWhereUniqueInput }) => {
    if (where.supabaseId) return users.find((item) => item.supabaseId === where.supabaseId) ?? null;
    if (where.discordId) return users.find((item) => item.discordId === where.discordId) ?? null;
    const email = typeof where.email === "string" ? where.email : null;
    if (email) return users.find((item) => item.email.toLowerCase() === email.toLowerCase()) ?? null;
    return null;
  });
  const update = vi.fn(async ({ where, data }: { where: Prisma.UserWhereUniqueInput; data: Prisma.UserUpdateInput }) => {
    const existing = users.find((item) => item.id === where.id);
    if (!existing) throw new Error("Missing user");
    Object.assign(existing, data);
    return existing;
  });

  return { findUnique, update };
}

describe("auth identity helpers", () => {
  it("extracts Discord identity from Supabase OAuth metadata", () => {
    expect(
      extractDiscordIdentity({
        id: "supabase-1",
        email: "creator@example.com",
        app_metadata: { provider: "discord" },
        user_metadata: { provider_id: "discord-1", full_name: "Clipper" },
      }),
    ).toEqual({ id: "discord-1", username: "Clipper" });
  });

  it("matches the current Supabase user first", async () => {
    const current = user({ id: "user-current", supabaseId: "supabase-current" });
    const delegate = delegateWith([current]);

    const result = await resolveUserForAuthIdentity(
      { id: "supabase-current", email: "creator@example.com" },
      { delegate },
    );

    expect(result.user?.id).toBe("user-current");
    expect(delegate.update).not.toHaveBeenCalled();
  });

  it("claims a stale Discord user for the new Supabase session", async () => {
    const stale = user({
      id: "user-stale",
      supabaseId: "old-supabase",
      discordId: "discord-1",
      discordUsername: "Old Name",
    });
    const delegate = delegateWith([stale]);

    const claimed = await claimUserForAuthIdentity(
      {
        id: "new-supabase",
        email: "creator@example.com",
        app_metadata: { provider: "discord" },
        user_metadata: { provider_id: "discord-1", full_name: "New Name" },
      },
      { role: "creator", delegate },
    );

    expect(claimed?.id).toBe("user-stale");
    expect(claimed?.supabaseId).toBe("new-supabase");
    expect(claimed?.discordUsername).toBe("New Name");
    expect(delegate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-stale" },
        data: expect.objectContaining({
          supabaseId: "new-supabase",
          discordUsername: "New Name",
        }),
      }),
    );
  });

  it("claims by email when no Discord identity is present", async () => {
    const stale = user({ id: "user-email", supabaseId: "old-supabase", email: "creator@example.com" });
    const delegate = delegateWith([stale]);

    const claimed = await claimUserForAuthIdentity(
      { id: "new-supabase", email: "CREATOR@example.com" },
      { role: "creator", delegate },
    );

    expect(claimed?.id).toBe("user-email");
    expect(claimed?.supabaseId).toBe("new-supabase");
  });

  it("throws when Discord and email point to different Prisma users", async () => {
    const discordUser = user({
      id: "user-discord",
      supabaseId: "supabase-discord",
      email: "discord@example.com",
      discordId: "discord-1",
    });
    const emailUser = user({
      id: "user-email",
      supabaseId: "supabase-email",
      email: "creator@example.com",
      discordId: null,
    });
    const delegate = delegateWith([discordUser, emailUser]);

    await expect(
      claimUserForAuthIdentity(
        {
          id: "new-supabase",
          email: "creator@example.com",
          app_metadata: { provider: "discord" },
          user_metadata: { provider_id: "discord-1" },
        },
        { role: "creator", delegate },
      ),
    ).rejects.toBeInstanceOf(AuthIdentityConflictError);
  });
});
