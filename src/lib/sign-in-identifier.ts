const USERNAME_PATTERN = /^[a-z0-9._-]{3,64}$/i;
const USERNAME_LOGIN_DOMAIN = "login.clipprofit.com";

export function resolveSignInEmail(identifier: string) {
  const normalized = identifier.trim().toLowerCase();

  if (normalized.includes("@")) return normalized;
  if (!USERNAME_PATTERN.test(normalized)) {
    throw new Error("Invalid sign-in identifier");
  }

  return `${normalized}@${USERNAME_LOGIN_DOMAIN}`;
}
