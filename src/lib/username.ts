export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 30;
export const USERNAME_TAKEN_ERROR = "Username is already taken.";

const USERNAME_PATTERN = /^[a-z0-9_]+$/;

export type UsernameValidationResult =
  | { ok: true; username: string }
  | { ok: false; error: string };

export function normalizeUsernameInput(value: string): string {
  return value.trim().replace(/^@+/, "").toLowerCase();
}

export function validateUsername(value: string): UsernameValidationResult {
  const username = normalizeUsernameInput(value);

  if (username.length === 0) {
    return { ok: false, error: "Username is required." };
  }
  if (username.length < USERNAME_MIN_LENGTH) {
    return { ok: false, error: "Username must be at least 3 characters." };
  }
  if (username.length > USERNAME_MAX_LENGTH) {
    return { ok: false, error: "Username must be 30 characters or fewer." };
  }
  if (!USERNAME_PATTERN.test(username)) {
    return {
      ok: false,
      error: "Username can only contain lowercase letters, numbers, and underscores.",
    };
  }

  return { ok: true, username };
}

export function createUsernameCandidate(value: string): string {
  const candidate = normalizeUsernameInput(value)
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, USERNAME_MAX_LENGTH);

  return candidate.length >= USERNAME_MIN_LENGTH ? candidate : "creator";
}

export async function createUniqueUsername(
  value: string,
  isTaken: (username: string) => Promise<boolean>,
): Promise<string> {
  const base = createUsernameCandidate(value);

  if (!(await isTaken(base))) return base;

  for (let suffix = 1; suffix <= 99; suffix++) {
    const suffixText = `_${suffix}`;
    const trimmedBase = base.slice(0, USERNAME_MAX_LENGTH - suffixText.length);
    const candidate = `${trimmedBase}${suffixText}`;
    if (!(await isTaken(candidate))) return candidate;
  }

  throw new Error("Could not generate a unique username.");
}
