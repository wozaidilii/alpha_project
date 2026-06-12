// @ts-nocheck

const app = getApp();

Page({
  data: {
    totalScore: 0,
    bestScore: 0,
    results: [],
  },

  onLoad() {
    if (app.globalData.lastResults.length === 0) {
      wx.redirectTo({ url: "/pages/index/index" });
      return;
    }

    this.setData({
      totalScore: app.globalData.totalScore,
      bestScore: app.globalData.bestScore,
      results: app.globalData.lastResults,
    });
  },

  playAgain() {
    wx.redirectTo({ url: "/pages/index/index" });
  },

  onShareAppMessage() {
    return {
      title: `我在 Histroguessr 拿到 ${app.globalData.totalScore} 分`,
      path: "/pages/index/index",
    };
  },
});
