import {
  ANIME_LOCALES,
  type AnimeLocale,
} from "~/lib/anime-locale";

export type AuthMode = "password" | "register" | "reset";

export type LoginCopy = {
  lang: string;
  backHome: string;
  languageLabel: string;
  accountActionsLabel: string;
  modeLabel: Record<AuthMode, string>;
  heroTitle: string;
  heroBody: string;
  continueWithGoogle: string;
  emailOrUsername: string;
  emailOrUsernamePlaceholder: string;
  password: string;
  passwordPlaceholder: string;
  showPassword: string;
  hidePassword: string;
  show: string;
  hide: string;
  loggingIn: string;
  logIn: string;
  forgotPassword: string;
  username: string;
  usernamePlaceholder: string;
  usernameHint: string;
  email: string;
  emailPlaceholder: string;
  creating: string;
  createAccount: string;
  registeredEmail: string;
  sending: string;
  sendResetCode: string;
  checkEmailForCode: string;
  resetCodeHint: string;
  resetCodeLabel: string;
  resetCodePlaceholder: string;
  newPassword: string;
  changeEmail: string;
  resetting: string;
  resetAndLogIn: string;
  debugCodeLabel: string;
  resetCodeSentDebug: string;
  resetCodeSent: string;
  googleErrorDefault: string;
  googleErrors: Record<string, string>;
};

const COPY: Record<AnimeLocale, LoginCopy> = {
  zh: {
    lang: "中文",
    backHome: "返回首页",
    languageLabel: "语言",
    accountActionsLabel: "账号操作",
    modeLabel: {
      password: "登录",
      register: "注册",
      reset: "找回密码",
    },
    heroTitle: "进入圣地巡礼档案",
    heroBody:
      "使用邮箱或用户名和密码登录。用户名将用于对战、排行榜与历史记录，且不可重复。",
    continueWithGoogle: "使用 Google 继续",
    emailOrUsername: "邮箱或用户名",
    emailOrUsernamePlaceholder: "name@example.com / sakura",
    password: "密码",
    passwordPlaceholder: "至少 8 位",
    showPassword: "显示密码",
    hidePassword: "隐藏密码",
    show: "显示",
    hide: "隐藏",
    loggingIn: "登录中...",
    logIn: "登录",
    forgotPassword: "忘记密码？",
    username: "用户名",
    usernamePlaceholder: "对战显示名称",
    usernameHint: "最多 12 个字符，不区分大小写。",
    email: "邮箱",
    emailPlaceholder: "name@example.com",
    creating: "创建中...",
    createAccount: "创建账号",
    registeredEmail: "注册邮箱",
    sending: "发送中...",
    sendResetCode: "发送验证码",
    checkEmailForCode: "请查收该邮箱中的验证码",
    resetCodeHint: "仅当该邮箱已注册时才会发送验证码。",
    resetCodeLabel: "6 位验证码",
    resetCodePlaceholder: "000000",
    newPassword: "新密码",
    changeEmail: "更换邮箱",
    resetting: "重置中...",
    resetAndLogIn: "重置并登录",
    debugCodeLabel: "调试验证码：",
    resetCodeSentDebug:
      "开发环境未配置邮件发送，请使用下方调试验证码重置密码。",
    resetCodeSent: "若该邮箱已注册，验证码将发送到邮箱。",
    googleErrorDefault: "Google 登录失败，请稍后重试或改用邮箱登录。",
    googleErrors: {
      google: "Google 登录失败，请稍后重试或改用邮箱登录。",
      google_unknown: "Google 登录失败，请稍后重试或改用邮箱登录。",
      google_state:
        "Google 登录状态已过期。请从本页重新开始 Google 登录，并确保浏览器允许 Cookie。",
      google_config:
        "Google 登录缺少服务端配置。请检查 Vercel 中的 GOOGLE_CLIENT_ID、GOOGLE_CLIENT_SECRET 和 GOOGLE_REDIRECT_URI。",
      google_token:
        "Google 授权码交换失败。请确认 Vercel 中的 GOOGLE_CLIENT_SECRET 与 Google Cloud OAuth 客户端一致。",
      google_profile:
        "Google 授权成功，但获取资料失败。请稍后重试或改用邮箱登录。",
      google_database:
        "Google 授权成功，但无法保存用户数据。请确认生产数据库已包含 Google 登录相关字段。",
    },
  },
  ja: {
    lang: "日本語",
    backHome: "ホームへ戻る",
    languageLabel: "言語",
    accountActionsLabel: "アカウント操作",
    modeLabel: {
      password: "ログイン",
      register: "新規登録",
      reset: "パスワード再設定",
    },
    heroTitle: "聖地巡礼アーカイブへ",
    heroBody:
      "メールまたはユーザー名とパスワードでログインします。ユーザー名は対戦、ランキング、履歴で表示され、重複できません。",
    continueWithGoogle: "Google で続行",
    emailOrUsername: "メールまたはユーザー名",
    emailOrUsernamePlaceholder: "name@example.com / sakura",
    password: "パスワード",
    passwordPlaceholder: "8 文字以上",
    showPassword: "パスワードを表示",
    hidePassword: "パスワードを非表示",
    show: "表示",
    hide: "非表示",
    loggingIn: "ログイン中...",
    logIn: "ログイン",
    forgotPassword: "パスワードをお忘れですか？",
    username: "ユーザー名",
    usernamePlaceholder: "対戦で表示される名前",
    usernameHint: "最大 12 文字。大文字小文字は区別しません。",
    email: "メール",
    emailPlaceholder: "name@example.com",
    creating: "作成中...",
    createAccount: "アカウント作成",
    registeredEmail: "登録メール",
    sending: "送信中...",
    sendResetCode: "確認コードを送信",
    checkEmailForCode: "このメールで確認コードを確認してください",
    resetCodeHint:
      "確認コードは、このメールが既存アカウントに登録されている場合のみ送信されます。",
    resetCodeLabel: "6 桁コード",
    resetCodePlaceholder: "000000",
    newPassword: "新しいパスワード",
    changeEmail: "メールを変更",
    resetting: "再設定中...",
    resetAndLogIn: "再設定してログイン",
    debugCodeLabel: "デバッグコード:",
    resetCodeSentDebug:
      "開発環境ではメール送信が未設定です。下のデバッグコードでパスワードを再設定してください。",
    resetCodeSent:
      "このメールが登録済みの場合、確認コードが送信されます。",
    googleErrorDefault:
      "Google ログインに失敗しました。後でもう一度試すか、メールログインを使ってください。",
    googleErrors: {
      google:
        "Google ログインに失敗しました。後でもう一度試すか、メールログインを使ってください。",
      google_unknown:
        "Google ログインに失敗しました。後でもう一度試すか、メールログインを使ってください。",
      google_state:
        "Google ログイン状態の有効期限が切れました。このページから再度 Google ログインを開始し、Cookie が使えることを確認してください。",
      google_config:
        "Google ログインのサーバー設定が不足しています。Vercel の GOOGLE_CLIENT_ID、GOOGLE_CLIENT_SECRET、GOOGLE_REDIRECT_URI を確認してください。",
      google_token:
        "Google 認可コードの交換に失敗しました。Vercel の GOOGLE_CLIENT_SECRET が Google Cloud OAuth クライアントと一致しているか確認してください。",
      google_profile:
        "Google 認可は成功しましたが、プロフィール取得に失敗しました。後でもう一度試すか、メールログインを使ってください。",
      google_database:
        "Google 認可は成功しましたが、ユーザーデータを保存できませんでした。本番 DB に Google ログイン用フィールドが含まれているか確認してください。",
    },
  },
  en: {
    lang: "English",
    backHome: "Back home",
    languageLabel: "Language",
    accountActionsLabel: "Account actions",
    modeLabel: {
      password: "Log in",
      register: "Register",
      reset: "Reset password",
    },
    heroTitle: "Enter the pilgrimage archive",
    heroBody:
      "Log in with an email or username and password. Usernames are unique and appear in battles, leaderboards, and saved history.",
    continueWithGoogle: "Continue with Google",
    emailOrUsername: "Email or username",
    emailOrUsernamePlaceholder: "name@example.com / sakura",
    password: "Password",
    passwordPlaceholder: "At least 8 characters",
    showPassword: "Show password",
    hidePassword: "Hide password",
    show: "Show",
    hide: "Hide",
    loggingIn: "Logging in...",
    logIn: "Log in",
    forgotPassword: "Forgot password?",
    username: "Username",
    usernamePlaceholder: "Display name for battles",
    usernameHint: "Up to 12 characters. Uniqueness is case-insensitive.",
    email: "Email",
    emailPlaceholder: "name@example.com",
    creating: "Creating...",
    createAccount: "Create account",
    registeredEmail: "Registered email",
    sending: "Sending...",
    sendResetCode: "Send reset code",
    checkEmailForCode: "Check this email for the code",
    resetCodeHint:
      "A reset code is sent only when this email belongs to an existing account.",
    resetCodeLabel: "6-digit code",
    resetCodePlaceholder: "000000",
    newPassword: "New password",
    changeEmail: "Change email",
    resetting: "Resetting...",
    resetAndLogIn: "Reset and log in",
    debugCodeLabel: "Debug code:",
    resetCodeSentDebug:
      "Email delivery is not configured in development. Use the debug code below to reset your password.",
    resetCodeSent: "If this email is registered, a reset code will be sent to it.",
    googleErrorDefault:
      "Google login failed. Try again later or use email login.",
    googleErrors: {
      google:
        "Google login failed. Try again later or use email login.",
      google_unknown:
        "Google login failed. Try again later or use email login.",
      google_state:
        "The Google login state expired. Start Google login again from this page, and make sure this site can use cookies in private browsing.",
      google_config:
        "Google login is missing server configuration. Check GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI in Vercel.",
      google_token:
        "Google authorization code exchange failed. Make sure the Vercel GOOGLE_CLIENT_SECRET matches the current Google Cloud OAuth client secret.",
      google_profile:
        "Google authorization succeeded, but profile lookup failed. Try again later or use email login.",
      google_database:
        "Google authorization succeeded, but user data could not be saved. Confirm the production database migration includes the Google login fields.",
    },
  },
};

const AUTH_ERROR_MESSAGES: Record<
  AnimeLocale,
  Record<string, string>
> = {
  zh: {
    "Your session has expired. Please log in again.":
      "登录状态已过期，请重新登录。",
    "The code has expired. Request a new one.":
      "验证码已过期，请重新获取。",
    "The code is incorrect.": "验证码不正确。",
    "Too many incorrect attempts. Request a new code.":
      "错误次数过多，请重新获取验证码。",
    "Email verification is not configured. Try again later.":
      "邮件验证未配置，请稍后再试。",
    "Verification email failed to send. Try again later.":
      "验证邮件发送失败，请稍后再试。",
    "This email is already registered. Log in instead.":
      "该邮箱已注册，请直接登录。",
    "This username is already taken. Try another one.":
      "该用户名已被占用，请换一个。",
    "Incorrect account or password.": "账号或密码不正确。",
    "This account cannot reset a password.":
      "该账号无法重置密码。",
  },
  ja: {
    "Your session has expired. Please log in again.":
      "セッションの有効期限が切れました。再度ログインしてください。",
    "The code has expired. Request a new one.":
      "確認コードの有効期限が切れました。新しいコードを取得してください。",
    "The code is incorrect.": "確認コードが正しくありません。",
    "Too many incorrect attempts. Request a new code.":
      "試行回数が多すぎます。新しいコードを取得してください。",
    "Email verification is not configured. Try again later.":
      "メール認証が設定されていません。後でもう一度お試しください。",
    "Verification email failed to send. Try again later.":
      "確認メールの送信に失敗しました。後でもう一度お試しください。",
    "This email is already registered. Log in instead.":
      "このメールは既に登録されています。ログインしてください。",
    "This username is already taken. Try another one.":
      "このユーザー名は既に使われています。別の名前を試してください。",
    "Incorrect account or password.":
      "アカウントまたはパスワードが正しくありません。",
    "This account cannot reset a password.":
      "このアカウントはパスワードを再設定できません。",
  },
  en: {},
};

export function getLoginCopy(locale: AnimeLocale): LoginCopy {
  return COPY[locale];
}

export function translateAuthErrorMessage(
  message: string,
  locale: AnimeLocale,
): string {
  if (locale === "en") return message;
  return AUTH_ERROR_MESSAGES[locale][message] ?? message;
}

export function getGoogleLoginErrorMessage(
  error: string,
  locale: AnimeLocale,
): string {
  const copy = getLoginCopy(locale);
  return copy.googleErrors[error] ?? copy.googleErrorDefault;
}

export { ANIME_LOCALES };
