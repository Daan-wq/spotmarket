import type { Prisma, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const AUTH_IDENTITY_CONFLICT_MESSAGE =
  "Dit Discord-account is al gekoppeld aan een ander ClipProfit-account.";

export class AuthIdentityConflictError extends Error {
  readonly code = "AUTH_IDENTITY_CONFLICT";
  readonly status = 409;

  constructor(message = AUTH_IDENTITY_CONFLICT_MESSAGE) {
    super(message);
    this.name = "AuthIdentityConflictError";
  }
}

export type AuthIdentityUser = Prisma.UserGetPayload<{
  include: { creatorProfile: true };
}>;

export type DiscordIdentity = {
  id: string;
  username: string | null;
};

export type AuthIdentityInput = {
  id: string;
  email?: string | null;
  app_metadata?: Record<string, unknown> | null;
  user_metadata?: Record<string, unknown> | null;
};

const userInclude = { creatorProfile: true } satisfies Prisma.UserInclude;

type UserFindUniqueArgs = {
  where: Prisma.UserWhereUniqueInput;
  include: typeof userInclude;
};
type UserUpdateArgs = {
  where: Prisma.UserWhereUniqueInput;
  data: Prisma.UserUpdateInput;
  include: typeof userInclude;
};

export type AuthIdentityUserDelegate = {
  findUnique(args: UserFindUniqueArgs): Promise<AuthIdentityUser | null>;
  update(args: UserUpdateArgs): Promise<AuthIdentityUser>;
};

const defaultUserDelegate: AuthIdentityUserDelegate = {
  findUnique(args) {
    return prisma.user.findUnique(args);
  },
  update(args) {
    return prisma.user.update(args);
  },
};

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function normalizeAuthEmail(email: string | null | undefined): string | null {
  return stringValue(email)?.toLowerCase() ?? null;
}

export function extractDiscordIdentity(authUser: AuthIdentityInput): DiscordIdentity | null {
  if (authUser.app_metadata?.provider !== "discord") return null;

  const id = stringValue(authUser.user_metadata?.provider_id) ?? stringValue(authUser.user_metadata?.sub);
  if (!id) return null;

  const username =
    stringValue(authUser.user_metadata?.full_name) ??
    stringValue(authUser.user_metadata?.name) ??
    stringValue(authUser.user_metadata?.user_name);

  return { id, username };
}

function assertSameUser(
  primary: AuthIdentityUser | null,
  secondary: AuthIdentityUser | null,
) {
  if (primary && secondary && primary.id !== secondary.id) {
    throw new AuthIdentityConflictError();
  }
}

async function findUserMatches(
  authUser: AuthIdentityInput,
  discordIdentity: DiscordIdentity | null,
  delegate: AuthIdentityUserDelegate,
) {
  const email = normalizeAuthEmail(authUser.email);
  const bySupabaseId = await delegate.findUnique({
    where: { supabaseId: authUser.id },
    include: userInclude,
  });
  const byDiscordId = discordIdentity
    ? await delegate.findUnique({
        where: { discordId: discordIdentity.id },
        include: userInclude,
      })
    : null;
  const byEmail = email
    ? await delegate.findUnique({
        where: { email },
        include: userInclude,
      })
    : null;

  assertSameUser(bySupabaseId, byDiscordId);
  assertSameUser(bySupabaseId, byEmail);
  assertSameUser(byDiscordId, byEmail);

  return {
    user: bySupabaseId ?? byDiscordId ?? byEmail,
    bySupabaseId,
    byDiscordId,
    byEmail,
  };
}

export async function resolveUserForAuthIdentity(
  authUser: AuthIdentityInput,
  options: {
    discordIdentity?: DiscordIdentity | null;
    delegate?: AuthIdentityUserDelegate;
  } = {},
) {
  const delegate = options.delegate ?? defaultUserDelegate;
  const discordIdentity = options.discordIdentity ?? extractDiscordIdentity(authUser);
  return findUserMatches(authUser, discordIdentity, delegate);
}

export async function claimUserForAuthIdentity(
  authUser: AuthIdentityInput,
  options: {
    role?: UserRole;
    discordIdentity?: DiscordIdentity | null;
    delegate?: AuthIdentityUserDelegate;
  } = {},
): Promise<AuthIdentityUser | null> {
  const delegate = options.delegate ?? defaultUserDelegate;
  const discordIdentity = options.discordIdentity ?? extractDiscordIdentity(authUser);
  const { user } = await findUserMatches(authUser, discordIdentity, delegate);

  if (!user) return null;

  const data: Prisma.UserUpdateInput = {};
  if (user.supabaseId !== authUser.id) {
    data.supabaseId = authUser.id;
  }
  if (options.role && user.role !== options.role) {
    data.role = options.role;
  }
  if (discordIdentity) {
    if (user.discordId && user.discordId !== discordIdentity.id) {
      throw new AuthIdentityConflictError();
    }
    if (!user.discordId) {
      data.discordId = discordIdentity.id;
    }
    if (discordIdentity.username && user.discordUsername !== discordIdentity.username) {
      data.discordUsername = discordIdentity.username;
    }
  }

  if (Object.keys(data).length === 0) return user;

  return delegate.update({
    where: { id: user.id },
    data,
    include: userInclude,
  });
}

export function isAuthIdentityConflict(error: unknown): error is AuthIdentityConflictError {
  return error instanceof AuthIdentityConflictError;
}
