// @ts-nocheck

const { USE_LOCAL_DEMO } = require("../../config");
const { updateHighScore } = require("../../utils/api");
const { updateLocalBestScore } = require("../../utils/local-game");
const { answerScore } = require("../../utils/scoring");

const app = getApp();

function firstQuestion() {
  return app.globalData.questions[0] || null;
}

Page({
  data: {
    total: 0,
    roundIndex: 0,
    question: null,
    selectedIndex: null,
    phase: "answering",
    isCorrect: false,
    score: 0,
    funfactText: "",
    saving: false,
    error: "",
  },

  onLoad() {
    const question = firstQuestion();
    if (!question) {
      wx.redirectTo({ url: "/pages/index/index" });
      return;
    }

    this.setData({
      total: app.globalData.questions.length,
      question,
      funfactText: (question.funfact || [])[0] || "",
    });
  },

  selectOption(event) {
    const index = Number(event.currentTarget.dataset.index);
    if (!Number.isInteger(index)) return;
    this.setData({ selectedIndex: index });
  },

  submitAnswer() {
    const question = this.data.question;
    const selectedIndex = this.data.selectedIndex;
    if (!question || selectedIndex === null) return;

    const isCorrect = selectedIndex === question.correctIndex;
    const roundScore = answerScore(isCorrect);
    const score = this.data.score + roundScore;

    const result = {
      questionId: question.id,
      title: question.title,
      selectedIndex,
      correctIndex: question.correctIndex,
      isCorrect,
      score: roundScore,
    };

    app.globalData.lastResults = app.globalData.lastResults.concat(result);

    this.setData({
      phase: "result",
      isCorrect,
      score,
      error: "",
    });
  },

  async nextQuestion() {
    const roundIndex = this.data.roundIndex;
    const total = this.data.total;

    if (roundIndex + 1 >= total) {
      await this.finishRound();
      return;
    }

    const nextIndex = roundIndex + 1;
    const question = app.globalData.questions[nextIndex];

    this.setData({
      roundIndex: nextIndex,
      question,
      selectedIndex: null,
      phase: "answering",
      isCorrect: false,
      funfactText: (question.funfact || [])[0] || "",
      error: "",
    });
  },

  async finishRound() {
    const score = this.data.score;
    app.globalData.totalScore = score;
    this.setData({ saving: true, error: "" });

    try {
      if (USE_LOCAL_DEMO) {
        app.globalData.bestScore = updateLocalBestScore(score);
      } else if (app.globalData.token) {
        const result = await updateHighScore(app.globalData.token, score);
        app.globalData.user = result.user;
        app.globalData.bestScore = result.soloHighScore;
      }
      wx.redirectTo({ url: "/pages/result/result" });
    } catch (error) {
      this.setData({
        error: error instanceof Error ? error.message : "保存成绩失败",
      });
    } finally {
      this.setData({ saving: false });
    }
  },
});
