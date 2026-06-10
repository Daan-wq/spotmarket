export type BanSubjectRole = "creator" | "admin" | "brand" | null;
export type BanEnforcementMode = "observe" | "enforce";
export type BanDecision = "ALLOW" | "CHALLENGE" | "BLOCK";
export type BanIndicatorType =
  | "IP"
  | "DEVICE"
  | "DISCORD"
  | "INSTAGRAM"
  | "TIKTOK"
  | "YOUTUBE"
  | "FACEBOOK"
  | "PAYOUT";

export type IndicatorMatch = {
  type: BanIndicatorType;
  strength: "WEAK" | "STRONG";
  mode: "LAYERED" | "HARD";
};

export type BanRiskInput = {
  subjectRole: BanSubjectRole;
  accountBanned: boolean;
  matches: IndicatorMatch[];
  turnstilePassed: boolean | null;
  recentDistinctSignupCount: number;
  mode: BanEnforcementMode;
};

export type BanRiskResult = {
  decision: BanDecision;
  observedDecision: BanDecision;
  reasonCode:
    | "OUT_OF_SCOPE"
    | "NO_MATCH"
    | "ACCOUNT_BANNED"
    | "STRONG_INDICATOR"
    | "HARD_IP"
    | "IP_REQUIRES_CHALLENGE"
    | "IP_CHALLENGE_PASSED"
    | "IP_CHALLENGE_FAILED"
    | "IP_SIGNUP_VELOCITY";
};

function applyObservationMode(
  input: BanRiskInput,
  observedDecision: BanDecision,
  reasonCode: BanRiskResult["reasonCode"],
): BanRiskResult {
  return {
    decision: input.mode === "observe" ? "ALLOW" : observedDecision,
    observedDecision,
    reasonCode,
  };
}

export function evaluateBanRisk(input: BanRiskInput): BanRiskResult {
  if (input.subjectRole !== "creator") {
    return {
      decision: "ALLOW",
      observedDecision: "ALLOW",
      reasonCode: "OUT_OF_SCOPE",
    };
  }

  if (input.accountBanned) {
    return {
      decision: "BLOCK",
      observedDecision: "BLOCK",
      reasonCode: "ACCOUNT_BANNED",
    };
  }

  const hardIp = input.matches.some(
    (match) => match.type === "IP" && match.mode === "HARD",
  );
  if (hardIp) {
    return applyObservationMode(input, "BLOCK", "HARD_IP");
  }

  const strongMatch = input.matches.some(
    (match) => match.type !== "IP" && match.strength === "STRONG",
  );
  if (strongMatch) {
    return applyObservationMode(input, "BLOCK", "STRONG_INDICATOR");
  }

  const ipMatch = input.matches.some((match) => match.type === "IP");
  if (!ipMatch) {
    return {
      decision: "ALLOW",
      observedDecision: "ALLOW",
      reasonCode: "NO_MATCH",
    };
  }

  if (input.recentDistinctSignupCount >= 3) {
    return applyObservationMode(input, "BLOCK", "IP_SIGNUP_VELOCITY");
  }

  if (input.turnstilePassed === false) {
    return applyObservationMode(input, "BLOCK", "IP_CHALLENGE_FAILED");
  }

  if (input.turnstilePassed === true) {
    return {
      decision: "ALLOW",
      observedDecision: "ALLOW",
      reasonCode: "IP_CHALLENGE_PASSED",
    };
  }

  return applyObservationMode(input, "CHALLENGE", "IP_REQUIRES_CHALLENGE");
}
