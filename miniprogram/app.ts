import type { AppGlobalData } from "./types";

const globalData: AppGlobalData = {
  token: "",
  user: null,
  questions: [],
  lastResults: [],
  totalScore: 0,
  bestScore: 0,
};

App({
  globalData,
});
