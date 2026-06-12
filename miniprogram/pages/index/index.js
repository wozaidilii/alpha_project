// @ts-nocheck

const { loginWithWeChatCode, startFunfactRound } = require("../../utils/api");

const app = getApp();

Page({
  data: {
    loggingIn: false,
    starting: false,
    error: "",
    userName: "未登录",
    bestScore: 0,
  },

  onLoad() {
    this.login();
  },

  login() {
    this.setData({ loggingIn: true, error: "" });

    wx.login({
      success: (result) => {
        if (!result.code) {
          this.setData({
            loggingIn: false,
            error: "微信登录失败：没有拿到登录 code",
          });
          return;
        }

        this.finishLogin(result.code);
      },
      fail: (error) => {
        this.setData({
          loggingIn: false,
          error: error.errMsg || "微信登录失败",
        });
      },
    });
  },

  async finishLogin(code) {
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

  syncUser(user) {
    this.setData({
      userName: user.name || "微信玩家",
      bestScore: user.soloHighScore,
    });
  },

  async startGame() {
    if (!app.globalData.token) {
      this.login();
      return;
    }

    this.setData({ starting: true, error: "" });

    try {
      const result = await startFunfactRound(app.globalData.token);
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
