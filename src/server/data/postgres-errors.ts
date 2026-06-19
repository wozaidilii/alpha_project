type UniqueViolationTarget = "email" | "username" | "unknown";

function getStringProperty(error: object, key: string) {
  return key in error && typeof error[key as keyof typeof error] === "string"
    ? String(error[key as keyof typeof error])
    : "";
}

export function classifyPlayerUniqueViolation(
  error: unknown,
): UniqueViolationTarget | null {
  if (
    typeof error !== "object" ||
    error === null ||
    !("code" in error) ||
    error.code !== "23505"
  ) {
    return null;
  }

  const source = [
    getStringProperty(error, "constraint_name"),
    getStringProperty(error, "constraint"),
    getStringProperty(error, "detail"),
    getStringProperty(error, "message"),
  ]
    .join(" ")
    .toLowerCase();

  if (source.includes("players_email_idx") || source.includes("(email)")) {
    return "email";
  }

  if (
    source.includes("players_username_key_idx") ||
    source.includes("(username_key)")
  ) {
    return "username";
  }

  return "unknown";
}
