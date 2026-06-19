import "server-only";

import { env } from "~/env";

export interface EmailDeliveryResult {
  mode: "email" | "debug";
  debugCode?: string;
}

type VerificationPurpose = "login" | "password_reset";

function buildVerificationEmail(code: string, purpose: VerificationPurpose) {
  const isPasswordReset = purpose === "password_reset";
  const actionLabel = isPasswordReset ? "重置密码" : "登录";

  return {
    subject: `AniGuessr ${actionLabel}验证码`,
    text: `你的 AniGuessr ${actionLabel}验证码是 ${code}，10 分钟内有效。若不是你本人操作，可以忽略这封邮件。`,
    html: `<p>你的 AniGuessr ${actionLabel}验证码是 <strong>${code}</strong>，10 分钟内有效。</p><p>若不是你本人操作，可以忽略这封邮件。</p>`,
  };
}

export async function sendEmailVerificationCode(input: {
  email: string;
  code: string;
  purpose?: VerificationPurpose;
}): Promise<EmailDeliveryResult> {
  const apiKey = env.RESEND_API_KEY;
  const from = env.EMAIL_FROM;
  const purpose = input.purpose ?? "login";
  const message = buildVerificationEmail(input.code, purpose);

  if (apiKey && from) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: input.email,
        subject: message.subject,
        text: message.text,
        html: message.html,
      }),
    });

    if (!response.ok) {
      throw new Error("Email verification delivery failed");
    }

    return { mode: "email" };
  }

  if (env.NODE_ENV === "production") {
    throw new Error("Email delivery is not configured");
  }

  console.info(
    `[${purpose}] verification code for ${input.email}: ${input.code}`,
  );
  return { mode: "debug", debugCode: input.code };
}
