import "server-only";

import { env } from "~/env";
import {
  buildVerificationEmailMessage,
  type VerificationPurpose,
} from "~/lib/email-verification-message";

export interface EmailDeliveryResult {
  mode: "email" | "debug";
  debugCode?: string;
}

export async function sendEmailVerificationCode(input: {
  email: string;
  code: string;
  purpose?: VerificationPurpose;
}): Promise<EmailDeliveryResult> {
  const apiKey = env.RESEND_API_KEY;
  const from = env.EMAIL_FROM;
  const purpose = input.purpose ?? "login";
  const message = buildVerificationEmailMessage({
    code: input.code,
    purpose,
  });

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
