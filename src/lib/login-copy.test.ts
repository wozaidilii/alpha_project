import { describe, expect, it } from "vitest";
import {
  getGoogleLoginErrorMessage,
  getLoginCopy,
  translateAuthErrorMessage,
} from "~/lib/login-copy";

describe("login-copy", () => {
  it("returns localized login labels", () => {
    expect(getLoginCopy("zh").modeLabel.password).toBe("登录");
    expect(getLoginCopy("ja").modeLabel.register).toBe("新規登録");
    expect(getLoginCopy("en").forgotPassword).toBe("Forgot password?");
  });

  it("translates known auth error messages", () => {
    expect(
      translateAuthErrorMessage("Incorrect account or password.", "zh"),
    ).toBe("账号或密码不正确。");
    expect(
      translateAuthErrorMessage("Incorrect account or password.", "en"),
    ).toBe("Incorrect account or password.");
  });

  it("returns localized google login errors", () => {
    expect(getGoogleLoginErrorMessage("google_state", "zh")).toContain(
      "Google 登录状态已过期",
    );
  });
});
