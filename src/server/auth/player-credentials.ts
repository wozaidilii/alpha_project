export const PLAYER_USERNAME_MAX_LENGTH = 12;

export function normalizeUsername(username: string) {
  return username
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, PLAYER_USERNAME_MAX_LENGTH);
}

export function normalizeUsernameKey(username: string) {
  return normalizeUsername(username).toLocaleLowerCase();
}

export function isEmailIdentifier(identifier: string) {
  return identifier.includes("@");
}
