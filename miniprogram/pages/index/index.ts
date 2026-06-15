import { USE_LOCAL_DEMO } from "../../config";
import { loginWithWeChatCode, startFunfactRound } from "../../utils/api";
import { getLocalBestScore, startLocalRound } from "../../utils/local-game";
import type { AppInstance, PlayerProfile } from "../../types";

const app = getApp<AppInstance>();

Page({
  data: {
    loggingIn: false,
    starting: false,
    error: "",
    userName: "游客",
    bestScore: 0,
  },

  onLoad() {
    if (USE_LOCAL_DEMO) {
      this.useGuestSession();
      return;
    }

    void this.login();
  },

  useGuestSession() {
    app.globalData.token = "";
    app.globalData.user = null;
    app.globalData.bestScore = getLocalBestScore();
    this.setData({
      loggingIn: false,
      error: "",
      userName: "游客",
      bestScore: app.globalData.bestScore,
    });
  },

  login() {
    if (USE_LOCAL_DEMO) {
      this.useGuestSession();
      return;
    }

    this.setData({ loggingIn: true, error: "" });

    wx.login({
      success: (result: { code?: string }) => {
        if (!result.code) {
          this.setData({
            loggingIn: false,
            error: "微信登录失败：没有拿到登录 code",
          });
          return;
        }

        void this.finishLogin(result.code);
      },
      fail: (error: { errMsg?: string }) => {
        this.setData({
          loggingIn: false,
          error: error.errMsg ?? "微信登录失败",
        });
      },
    });
  },

  async finishLogin(code: string) {
    try {
      const session = await loginWithWeChatCode(code);
      app.globalData.token = session.token;
      app.globalData.user = session.user;
      app.globalData.bestScore = session.user.soloHighScore;
      this.syncUser(session.user);
    } catch (error) {
      this.setData({
        error: error instanceof Error ? error.message : "登录失败",
      });
    } finally {
      this.setData({ loggingIn: false });
    }
  },

  syncUser(user: PlayerProfile) {
    this.setData({
      userName: user.name || "微信玩家",
      bestScore: user.soloHighScore,
    });
  },

  async startGame() {
    if (!USE_LOCAL_DEMO && !app.globalData.token) {
      this.login();
      return;
    }

    this.setData({ starting: true, error: "" });

    try {
      const result = USE_LOCAL_DEMO
        ? startLocalRound()
        : await startFunfactRound(app.globalData.token);
      if (result.questions.length === 0) {
        throw new Error("题库暂无可用题目");
      }

      app.globalData.questions = result.questions;
      app.globalData.lastResults = [];
      app.globalData.totalScore = 0;

      wx.navigateTo({ url: "/pages/quiz/quiz" });
    } catch (error) {
      this.setData({
        error: error instanceof Error ? error.message : "加载题目失败",
      });
    } finally {
      this.setData({ starting: false });
    }
  },
});
