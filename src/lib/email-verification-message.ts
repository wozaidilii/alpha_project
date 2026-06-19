export type VerificationPurpose = "login" | "password_reset";

export function buildVerificationEmailMessage(input: {
  code: string;
  purpose?: VerificationPurpose;
}) {
  const purpose = input.purpose ?? "login";
  const actionLabel = purpose === "password_reset" ? "password reset" : "login";
  const subjectAction =
    purpose === "password_reset" ? "password reset" : "login";

  return {
    subject: `Your AniGuessr ${subjectAction} code`,
    text: `Your AniGuessr ${actionLabel} code is ${input.code}. It expires in 10 minutes. If you did not request this, you can ignore this email.`,
    html: `<p>Your AniGuessr ${actionLabel} code is <strong>${input.code}</strong>. It expires in 10 minutes.</p><p>If you did not request this, you can ignore this email.</p>`,
  };
}
