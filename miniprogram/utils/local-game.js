// @ts-nocheck

const { LOCAL_QUESTIONS } = require("../data/local-questions");

const LOCAL_BEST_SCORE_KEY = "histroguessr_local_best_score";
const ROUND_QUESTION_COUNT = 5;

function shuffledQuestions() {
  return LOCAL_QUESTIONS.slice().sort(() => Math.random() - 0.5);
}

function startLocalRound() {
  return {
    questions: shuffledQuestions().slice(0, ROUND_QUESTION_COUNT),
  };
}

function getLocalBestScore() {
  const value = Number(wx.getStorageSync(LOCAL_BEST_SCORE_KEY) || 0);
  return Number.isFinite(value) ? value : 0;
}

function updateLocalBestScore(score) {
  const bestScore = Math.max(
    getLocalBestScore(),
    Math.max(0, Math.round(score)),
  );
  wx.setStorageSync(LOCAL_BEST_SCORE_KEY, bestScore);
  return bestScore;
}

module.exports = {
  getLocalBestScore,
  startLocalRound,
  updateLocalBestScore,
};
