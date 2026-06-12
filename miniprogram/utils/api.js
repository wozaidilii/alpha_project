// @ts-nocheck

const { API_BASE_URL } = require("../config");

function request(path, data) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${API_BASE_URL}${path}`,
      method: "POST",
      data,
      header: {
        "content-type": "application/json",
      },
      success: (result) => {
        if (result.statusCode >= 200 && result.statusCode < 300) {
          resolve(result.data);
          return;
        }

        const body = result.data || {};
        reject(
          new Error(body.error?.message || `请求失败：${result.statusCode}`),
        );
      },
      fail: (error) => {
        reject(new Error(error.errMsg || "网络请求失败"));
      },
    });
  });
}

function loginWithWeChatCode(code) {
  return request("/api/miniprogram/auth/login", { code });
}

function startFunfactRound(token) {
  return request("/api/miniprogram/funfact/start", { token });
}

function updateHighScore(token, score) {
  return request("/api/miniprogram/player/high-score", { token, score });
}

module.exports = {
  loginWithWeChatCode,
  startFunfactRound,
  updateHighScore,
};
