export const EMAIL_LOGIN_CODE_LENGTH = 6;

export function normalizeEmailLoginCode(value: string) {
  return value.replace(/\D/g, "").slice(0, EMAIL_LOGIN_CODE_LENGTH);
}

export function isEmailLoginCode(value: string) {
  return /^\d{6}$/.test(value);
}

export function displayNameFromEmail(email: string) {
  const localPart = email.split("@")[0]?.trim() ?? "Player";
  const normalized = localPart.replace(/[^\p{L}\p{N}_-]+/gu, "").slice(0, 12);
  return normalized || "Player";
}
