import { updateHighScore } from "../../utils/api";
import { answerScore } from "../../utils/scoring";
import type { AppInstance, FunfactQuestion, QuizResult } from "../../types";

const app = getApp<AppInstance>();

function firstQuestion(): FunfactQuestion | null {
  return app.globalData.questions[0] ?? null;
}

Page({
  data: {
    total: 0,
    roundIndex: 0,
    question: null as FunfactQuestion | null,
    selectedIndex: null as number | null,
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
      funfactText: (question.funfact ?? [])[0] ?? "",
    });
  },

  selectOption(event: { currentTarget: { dataset: { index?: number } } }) {
    const index = Number(event.currentTarget.dataset.index);
    if (!Number.isInteger(index)) return;
    this.setData({ selectedIndex: index });
  },

  submitAnswer() {
    const question = this.data.question as FunfactQuestion | null;
    const selectedIndex = this.data.selectedIndex as number | null;
    if (!question || selectedIndex === null) return;

    const isCorrect = selectedIndex === question.correctIndex;
    const roundScore = answerScore(isCorrect);
    const score = (this.data.score as number) + roundScore;

    const result: QuizResult = {
      questionId: question.id,
      title: question.title,
      selectedIndex,
      correctIndex: question.correctIndex,
      isCorrect,
      score: roundScore,
    };

    app.globalData.lastResults = [...app.globalData.lastResults, result];

    this.setData({
      phase: "result",
      isCorrect,
      score,
      error: "",
    });
  },

  async nextQuestion() {
    const roundIndex = this.data.roundIndex as number;
    const total = this.data.total as number;

    if (roundIndex + 1 >= total) {
      await this.finishRound();
      return;
    }

    const nextIndex = roundIndex + 1;
    const question = app.globalData.questions[nextIndex]!;

    this.setData({
      roundIndex: nextIndex,
      question,
      selectedIndex: null,
      phase: "answering",
      isCorrect: false,
      funfactText: (question.funfact ?? [])[0] ?? "",
      error: "",
    });
  },

  async finishRound() {
    const score = this.data.score as number;
    app.globalData.totalScore = score;
    this.setData({ saving: true, error: "" });

    try {
      if (app.globalData.token) {
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
