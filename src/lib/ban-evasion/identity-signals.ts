import { prisma } from "@/lib/prisma";
import type { UserRole } from "@prisma/client";
import type { BanIndicatorType } from "./risk-engine";

type IdentitySignal = { type: BanIndicatorType; value: string };

type IdentityUser = {
  id: string;
  role: UserRole;
  discordId: string | null;
  creatorProfile: {
    walletAddress: string | null;
    tronsAddress: string | null;
    payoutIban: string | null;
    payoutSolanaAddress: string | null;
    stripeAccountId: string | null;
    igConnections: Array<{ igUserId: string | null }>;
    fbConnections: Array<{
      fbPageId: string | null;
      fbUserId: string | null;
    }>;
    ytConnections: Array<{ channelId: string }>;
    ttConnections: Array<{ tikTokOpenId: string | null }>;
  } | null;
};

type UserDelegate = {
  findUnique(args: Record<string, unknown>): Promise<IdentityUser | null>;
};

function addSignal(
  signals: IdentitySignal[],
  seen: Set<string>,
  type: BanIndicatorType,
  value: string | null | undefined,
) {
  const normalized = value?.trim();
  if (!normalized) return;
  const key = `${type}:${normalized}`;
  if (seen.has(key)) return;
  seen.add(key);
  signals.push({ type, value: normalized });
}

export async function getIdentitySignalsForSupabaseUser(
  supabaseId: string,
  delegate: UserDelegate = prisma.user as unknown as UserDelegate,
): Promise<{
  userId: string | null;
  role: UserRole | null;
  signals: IdentitySignal[];
}> {
  const user = await delegate.findUnique({
    where: { supabaseId },
    select: {
      id: true,
      role: true,
      discordId: true,
      creatorProfile: {
        select: {
          walletAddress: true,
          tronsAddress: true,
          payoutIban: true,
          payoutSolanaAddress: true,
          stripeAccountId: true,
          igConnections: { select: { igUserId: true } },
          fbConnections: { select: { fbPageId: true, fbUserId: true } },
          ytConnections: { select: { channelId: true } },
          ttConnections: { select: { tikTokOpenId: true } },
        },
      },
    },
  });

  if (!user) return { userId: null, role: null, signals: [] };

  const signals: IdentitySignal[] = [];
  const seen = new Set<string>();
  addSignal(signals, seen, "DISCORD", user.discordId);

  const profile = user.creatorProfile;
  if (profile) {
    for (const connection of profile.igConnections) {
      addSignal(signals, seen, "INSTAGRAM", connection.igUserId);
    }
    for (const connection of profile.fbConnections) {
      addSignal(signals, seen, "FACEBOOK", connection.fbPageId);
      addSignal(signals, seen, "FACEBOOK", connection.fbUserId);
    }
    for (const connection of profile.ytConnections) {
      addSignal(signals, seen, "YOUTUBE", connection.channelId);
    }
    for (const connection of profile.ttConnections) {
      addSignal(signals, seen, "TIKTOK", connection.tikTokOpenId);
    }

    addSignal(signals, seen, "PAYOUT", profile.walletAddress);
    addSignal(signals, seen, "PAYOUT", profile.tronsAddress);
    addSignal(signals, seen, "PAYOUT", profile.payoutIban);
    addSignal(signals, seen, "PAYOUT", profile.payoutSolanaAddress);
    addSignal(signals, seen, "PAYOUT", profile.stripeAccountId);
  }

  return { userId: user.id, role: user.role, signals };
}
