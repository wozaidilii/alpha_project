import { API_BASE_URL } from "../config";
import type { FunfactQuestion, PlayerSession, PlayerProfile } from "../types";

interface ApiErrorBody {
  error?: {
    code?: string;
    message?: string;
  };
}

interface StartRoundResponse {
  questions: FunfactQuestion[];
  warning?: "INSUFFICIENT_QUESTIONS";
}

interface HighScoreResponse {
  soloHighScore: number;
  user: PlayerProfile;
}

function request<T>(path: string, data: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    wx.request<T | ApiErrorBody>({
      url: `${API_BASE_URL}${path}`,
      method: "POST",
      data,
      header: {
        "content-type": "application/json",
      },
      success: (result) => {
        if (result.statusCode >= 200 && result.statusCode < 300) {
          resolve(result.data as T);
          return;
        }

        const body = result.data as ApiErrorBody;
        reject(
          new Error(body.error?.message ?? `请求失败：${result.statusCode}`),
        );
      },
      fail: (error) => {
        reject(new Error(error.errMsg ?? "网络请求失败"));
      },
    });
  });
}

export function loginWithWeChatCode(code: string) {
  return request<PlayerSession>("/api/miniprogram/auth/login", { code });
}

export function startFunfactRound(token: string) {
  return request<StartRoundResponse>("/api/miniprogram/funfact/start", {
    token,
  });
}

export function updateHighScore(token: string, score: number) {
  return request<HighScoreResponse>("/api/miniprogram/player/high-score", {
    token,
    score,
  });
}
