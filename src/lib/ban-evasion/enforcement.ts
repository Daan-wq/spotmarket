import {
  evaluateBanRisk,
  type BanEnforcementMode,
  type BanIndicatorType,
  type BanRiskResult,
  type BanSubjectRole,
} from "./risk-engine";
import {
  BAN_DEVICE_COOKIE,
  BAN_CHALLENGE_COOKIE,
  getTrustedClientIp,
  hashSignal,
  maskSignal,
  readChallengeProofValue,
  readDeviceCookieValue,
} from "./signals";
import {
  countRecentDistinctSignupsForIp,
  findActiveIndicatorMatches,
  getActiveAccountBan,
  logEnforcementEvent,
  type ActiveIndicatorMatch,
  type SignalObservation,
} from "./store";

type EnforcementDependencies = {
  getActiveAccountBan: typeof getActiveAccountBan;
  findActiveIndicatorMatches: typeof findActiveIndicatorMatches;
  countRecentDistinctSignupsForIp: typeof countRecentDistinctSignupsForIp;
  logEnforcementEvent: typeof logEnforcementEvent;
  verifyTurnstile: typeof verifyTurnstileToken;
};

const defaultDependencies: EnforcementDependencies = {
  getActiveAccountBan,
  findActiveIndicatorMatches,
  countRecentDistinctSignupsForIp,
  logEnforcementEvent,
  verifyTurnstile: verifyTurnstileToken,
};

function cookieValue(request: Request, name: string): string | undefined {
  const cookie = request.headers.get("cookie");
  if (!cookie) return undefined;

  for (const part of cookie.split(";")) {
    const [key, ...valueParts] = part.trim().split("=");
    if (key === name) return valueParts.join("=");
  }
  return undefined;
}

export function collectRequestObservations(
  request: Request,
  options: {
    secret?: string;
    isVercel?: boolean;
    identitySignals?: Array<{ type: BanIndicatorType; value: string }>;
  } = {},
): SignalObservation[] {
  const secret = options.secret ?? process.env.BAN_SIGNAL_HASH_SECRET ?? "";
  if (!secret) return [];

  const observations: SignalObservation[] = [];
  const ip = getTrustedClientIp(request, { isVercel: options.isVercel });
  if (ip) {
    observations.push({
      type: "IP",
      valueHash: hashSignal("IP", ip, secret),
      maskedValue: maskSignal("IP", ip),
    });
  }

  const deviceId = readDeviceCookieValue(
    cookieValue(request, BAN_DEVICE_COOKIE),
    secret,
  );
  if (deviceId) {
    observations.push({
      type: "DEVICE",
      valueHash: hashSignal("DEVICE", deviceId, secret),
      maskedValue: maskSignal("DEVICE", deviceId),
    });
  }

  observations.push(
    ...collectIdentityObservations(options.identitySignals ?? [], secret),
  );

  return observations;
}

export function collectIdentityObservations(
  identitySignals: Array<{ type: BanIndicatorType; value: string }>,
  secret = process.env.BAN_SIGNAL_HASH_SECRET ?? "",
): SignalObservation[] {
  if (!secret) return [];

  const observations: SignalObservation[] = [];
  const seen = new Set<string>();
  for (const signal of identitySignals) {
    const value = signal.value.trim();
    if (!value) continue;
    const valueHash = hashSignal(signal.type, value, secret);
    const key = `${signal.type}:${valueHash}`;
    if (seen.has(key)) continue;
    seen.add(key);
    observations.push({
      type: signal.type,
      valueHash,
      maskedValue: maskSignal(signal.type, value),
    });
  }

  return observations;
}

export async function verifyTurnstile(
  token: string,
  remoteIp: string | null,
  secret: string,
  fetcher: typeof fetch = fetch,
): Promise<boolean> {
  if (!token || !secret) return false;
  const body = new URLSearchParams({
    secret,
    response: token,
  });
  if (remoteIp) body.set("remoteip", remoteIp);

  try {
    const response = await fetcher(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      { method: "POST", body },
    );
    if (!response.ok) return false;
    const result = (await response.json()) as { success?: boolean };
    return result.success === true;
  } catch (error) {
    console.error("[ban-evasion] Turnstile verification failed", error);
    return false;
  }
}

async function verifyTurnstileToken(
  token: string,
  remoteIp: string | null,
): Promise<boolean> {
  return verifyTurnstile(
    token,
    remoteIp,
    process.env.TURNSTILE_SECRET_KEY ?? "",
  );
}

export async function assessBanEvasion(
  input: {
    request: Request;
    subjectRole?: BanSubjectRole;
    supabaseId?: string | null;
    identitySignals?: Array<{ type: BanIndicatorType; value: string }>;
    turnstileToken?: string | null;
    mode?: BanEnforcementMode;
    signalSecret?: string;
    isVercel?: boolean;
  },
  dependencies: EnforcementDependencies = defaultDependencies,
): Promise<BanRiskResult & {
  matches: ActiveIndicatorMatch[];
  observations: SignalObservation[];
}> {
  const subjectRole = input.subjectRole ?? "creator";
  const mode =
    input.mode ??
    (process.env.BAN_EVASION_MODE === "enforce" ? "enforce" : "observe");
  const observations = collectRequestObservations(input.request, {
    secret: input.signalSecret,
    isVercel: input.isVercel,
    identitySignals: input.identitySignals,
  });

  const accountBan = input.supabaseId
    ? await dependencies.getActiveAccountBan(input.supabaseId)
    : { active: false, banId: null };
  const matches = await dependencies.findActiveIndicatorMatches(observations);
  const ipObservation = observations.find(
    (observation) => observation.type === "IP",
  );
  const hasIpMatch = matches.some((match) => match.type === "IP");
  const recentDistinctSignupCount =
    ipObservation && hasIpMatch
      ? await dependencies.countRecentDistinctSignupsForIp(
          ipObservation.valueHash,
        )
      : 0;

  let turnstilePassed: boolean | null = null;
  if (input.turnstileToken !== undefined && input.turnstileToken !== null) {
    turnstilePassed = await dependencies.verifyTurnstile(
      input.turnstileToken,
      getTrustedClientIp(input.request, { isVercel: input.isVercel }),
    );
  } else if (
    readChallengeProofValue(
      cookieValue(input.request, BAN_CHALLENGE_COOKIE),
      new Date(),
      input.signalSecret ?? process.env.BAN_SIGNAL_HASH_SECRET ?? "",
    )
  ) {
    turnstilePassed = true;
  }

  const result = evaluateBanRisk({
    subjectRole,
    accountBanned: accountBan.active,
    matches,
    turnstilePassed,
    recentDistinctSignupCount,
    mode,
  });

  if (
    result.decision !== "ALLOW" ||
    result.observedDecision !== "ALLOW" ||
    result.reasonCode === "ACCOUNT_BANNED"
  ) {
    try {
      await dependencies.logEnforcementEvent({
        accountBanId: accountBan.banId ?? matches[0]?.accountBanId ?? null,
        decision: result.decision,
        observedDecision: result.observedDecision,
        reasonCode: result.reasonCode,
        matchedIndicatorIds: matches.map((match) => match.id),
        metadata: {
          path: new URL(input.request.url).pathname,
          mode,
        },
      });
    } catch (error) {
      console.error("[ban-evasion] enforcement event write failed", error);
    }
  }

  return { ...result, matches, observations };
}
