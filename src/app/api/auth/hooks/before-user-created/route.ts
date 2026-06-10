import { NextResponse } from "next/server";
import { Webhook } from "standardwebhooks";
import { evaluateBanRisk, type BanIndicatorType } from "@/lib/ban-evasion/risk-engine";
import {
  canonicalizeIp,
  hashSignal,
  maskSignal,
} from "@/lib/ban-evasion/signals";
import {
  countRecentDistinctSignupsForIp,
  findActiveIndicatorMatches,
  logEnforcementEvent,
  type SignalObservation,
} from "@/lib/ban-evasion/store";

type HookIdentity = {
  id?: string;
  provider?: string;
  identity_data?: Record<string, unknown>;
};

type BeforeUserCreatedEvent = {
  metadata?: {
    name?: string;
    ip_address?: string;
  };
  user?: {
    id?: string;
    app_metadata?: Record<string, unknown>;
    user_metadata?: Record<string, unknown>;
    identities?: HookIdentity[];
  };
};

export async function POST(request: Request) {
  const hookSecret = process.env.SUPABASE_AUTH_HOOK_SECRET;
  const signalSecret = process.env.BAN_SIGNAL_HASH_SECRET;
  if (!hookSecret || !signalSecret) {
    console.error("[before-user-created] Missing hook configuration");
    return NextResponse.json({ error: "Hook unavailable" }, { status: 503 });
  }

  const payload = await request.text();
  let event: BeforeUserCreatedEvent;
  try {
    event = new Webhook(hookSecret).verify(payload, {
      "webhook-id": request.headers.get("webhook-id") ?? "",
      "webhook-timestamp": request.headers.get("webhook-timestamp") ?? "",
      "webhook-signature": request.headers.get("webhook-signature") ?? "",
    }) as BeforeUserCreatedEvent;
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (
    event.metadata?.name !== "before-user-created" ||
    !event.user?.id
  ) {
    return NextResponse.json({ error: "Invalid hook payload" }, { status: 400 });
  }

  if (hookRole(event) !== "creator") {
    return NextResponse.json({});
  }

  const observations = collectHookObservations(event, signalSecret);
  const matches = await findActiveIndicatorMatches(observations);
  const ip = observations.find((observation) => observation.type === "IP");
  const hasIpMatch = matches.some((match) => match.type === "IP");
  const signupCount =
    ip && hasIpMatch
      ? await countRecentDistinctSignupsForIp(ip.valueHash)
      : 0;
  const mode =
    process.env.BAN_EVASION_MODE === "enforce" ? "enforce" : "observe";
  const result = evaluateBanRisk({
    subjectRole: "creator",
    accountBanned: false,
    matches,
    turnstilePassed: null,
    recentDistinctSignupCount: signupCount,
    mode,
  });

  if (result.observedDecision !== "ALLOW") {
    try {
      await logEnforcementEvent({
        accountBanId: matches[0]?.accountBanId ?? null,
        decision: result.decision,
        observedDecision: result.observedDecision,
        reasonCode: result.reasonCode,
        matchedIndicatorIds: matches.map((match) => match.id),
        metadata: {
          path: "/api/auth/hooks/before-user-created",
          mode,
        },
      });
    } catch (error) {
      console.error("[before-user-created] Failed to log decision", error);
    }
  }

  if (result.decision !== "ALLOW") {
    return NextResponse.json(
      { error: { http_code: 403, message: "Access unavailable." } },
      { status: 403 },
    );
  }

  return NextResponse.json({});
}

function hookRole(event: BeforeUserCreatedEvent) {
  const appMetadataRole =
    stringValue(event.user?.app_metadata?.user_role) ??
    stringValue(event.user?.app_metadata?.role);
  return appMetadataRole === "admin" || appMetadataRole === "brand"
    ? appMetadataRole
    : "creator";
}

function collectHookObservations(
  event: BeforeUserCreatedEvent,
  secret: string,
): SignalObservation[] {
  const observations: SignalObservation[] = [];
  const seen = new Set<string>();

  const rawIp = event.metadata?.ip_address;
  if (rawIp) {
    const ip = canonicalizeIp(rawIp);
    if (ip) {
      addObservation(observations, seen, "IP", ip, secret);
    }
  }

  for (const identity of event.user?.identities ?? []) {
    const type = providerSignalType(identity.provider);
    const value =
      stringValue(identity.identity_data?.provider_id) ??
      stringValue(identity.identity_data?.sub) ??
      stringValue(identity.identity_data?.id) ??
      stringValue(identity.id);
    if (type && value) addObservation(observations, seen, type, value, secret);
  }

  const provider = stringValue(event.user?.app_metadata?.provider);
  const providerType = providerSignalType(provider);
  const providerValue =
    stringValue(event.user?.user_metadata?.provider_id) ??
    stringValue(event.user?.user_metadata?.sub);
  if (providerType && providerValue) {
    addObservation(
      observations,
      seen,
      providerType,
      providerValue,
      secret,
    );
  }

  return observations;
}

function addObservation(
  observations: SignalObservation[],
  seen: Set<string>,
  type: BanIndicatorType,
  value: string,
  secret: string,
) {
  const valueHash = hashSignal(type, value, secret);
  const key = `${type}:${valueHash}`;
  if (seen.has(key)) return;
  seen.add(key);
  observations.push({
    type,
    valueHash,
    maskedValue: maskSignal(type, value),
  });
}

function providerSignalType(
  provider: string | undefined,
): BanIndicatorType | null {
  const types: Record<string, BanIndicatorType> = {
    discord: "DISCORD",
    instagram: "INSTAGRAM",
    tiktok: "TIKTOK",
    youtube: "YOUTUBE",
    facebook: "FACEBOOK",
  };
  return provider ? types[provider.toLowerCase()] ?? null : null;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
