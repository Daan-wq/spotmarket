import { prisma } from "../src/lib/prisma";
import { createSupabaseAdminClient } from "../src/lib/supabase/admin";
import {
  AuthIdentityConflictError,
  claimUserForAuthIdentity,
  extractDiscordIdentity,
  resolveUserForAuthIdentity,
  type AuthIdentityInput,
} from "../src/lib/auth-identity";

type AuditRow = {
  authUserId: string;
  email: string | null;
  discordId: string | null;
  matchedUserId: string | null;
  matchedSupabaseId: string | null;
  action: "noop" | "would_claim" | "claimed" | "conflict" | "unmatched";
  reason: string;
};

const apply = process.argv.includes("--apply");

async function listAuthUsers(): Promise<AuthIdentityInput[]> {
  const admin = createSupabaseAdminClient();
  const users: AuthIdentityInput[] = [];
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    users.push(
      ...data.users.map((user) => ({
        id: user.id,
        email: user.email ?? null,
        app_metadata: user.app_metadata ?? {},
        user_metadata: user.user_metadata ?? {},
      })),
    );

    if (data.users.length < perPage) break;
    page += 1;
  }

  return users;
}

async function auditUser(authUser: AuthIdentityInput): Promise<AuditRow> {
  const discordIdentity = extractDiscordIdentity(authUser);
  const base = {
    authUserId: authUser.id,
    email: authUser.email ?? null,
    discordId: discordIdentity?.id ?? null,
  };

  try {
    const resolved = await resolveUserForAuthIdentity(authUser, { discordIdentity });
    if (!resolved.user) {
      return {
        ...base,
        matchedUserId: null,
        matchedSupabaseId: null,
        action: "unmatched",
        reason: "No Prisma user matched by supabaseId, discordId, or email.",
      };
    }

    if (resolved.user.supabaseId === authUser.id) {
      return {
        ...base,
        matchedUserId: resolved.user.id,
        matchedSupabaseId: resolved.user.supabaseId,
        action: "noop",
        reason: "Prisma user already points at this Supabase auth user.",
      };
    }

    if (!apply) {
      return {
        ...base,
        matchedUserId: resolved.user.id,
        matchedSupabaseId: resolved.user.supabaseId,
        action: "would_claim",
        reason: "Safe one-to-one match; rerun with --apply to update supabaseId.",
      };
    }

    const claimed = await claimUserForAuthIdentity(authUser, { discordIdentity });
    return {
      ...base,
      matchedUserId: claimed?.id ?? resolved.user.id,
      matchedSupabaseId: claimed?.supabaseId ?? authUser.id,
      action: "claimed",
      reason: "Updated Prisma user supabaseId to the current Supabase auth user.",
    };
  } catch (error) {
    if (error instanceof AuthIdentityConflictError) {
      return {
        ...base,
        matchedUserId: null,
        matchedSupabaseId: null,
        action: "conflict",
        reason: "Discord, email, or supabaseId matched multiple Prisma users. Manual review required.",
      };
    }
    throw error;
  }
}

async function main() {
  const authUsers = await listAuthUsers();
  const rows = await Promise.all(authUsers.map((user) => auditUser(user)));
  const interesting = rows.filter((row) => row.action !== "noop" && row.action !== "unmatched");
  const summary = rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.action] = (acc[row.action] ?? 0) + 1;
    return acc;
  }, {});

  console.log(JSON.stringify({ apply, summary, rows: interesting }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
