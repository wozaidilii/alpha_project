import {
  type GameQuestion,
  type QuestionType,
  MODERN_CONTENT_MIN_YEAR,
  MODERN_CONTENT_MAX_YEAR,
  requiresMap,
  requiresQuizAnswer,
} from "~/types/question";

const TYPE_LABELS: Record<QuestionType, string> = {
  historical: "历史",
  funfact: "冷知识",
  nostalgia: "回忆杀",
  meme: "网络哏",
};

const TYPE_EMOJI: Record<QuestionType, string> = {
  historical: "🗺️",
  funfact: "📚",
  nostalgia: "📼",
  meme: "🌐",
};

const FUNFACT_CATEGORY_LABELS: Record<string, string> = {
  "历史funfact": "历史",
  "人物funfact": "人物",
  "文化作品funfact": "文化作品",
  "器具发明funfact": "器具发明",
  "生活funfact": "生活",
  funtest: "测试",
};

const NOSTALGIA_SUB_LABELS = {
  appliance: "家电",
  snack: "零食",
  toy: "玩具",
  anime: "动漫",
  comic: "漫画",
  movie: "电影",
  tv: "影视剧",
  celebrity: "艺人",
  game: "游戏",
  music: "音乐",
  other: "其他",
} as const;

const MEME_SUB_LABELS = {
  phrase: "流行语",
  image: "表情包",
  video: "视频梗",
  event: "事件梗",
  character: "人物梗",
} as const;

const CULTURAL_SCOPE_LABELS = {
  cn_mainland: "大陆",
  cn_hk_tw: "港台",
  global: "全球",
} as const;

export function getQuestionTypeLabel(type: QuestionType): string {
  return TYPE_LABELS[type];
}

export function getQuestionTypeEmoji(type: QuestionType): string {
  return TYPE_EMOJI[type];
}

export function getFunfactCategoryLabel(category: string): string {
  return FUNFACT_CATEGORY_LABELS[category] ?? category;
}

/** 题卡角标：题型 + 子类/历史分区 */
export function getQuestionBadge(question: GameQuestion): string {
  if (question.type === "historical") {
    const region = question.category === "china" ? "🇨🇳 中国" : "🌍 世界";
    return `${TYPE_EMOJI.historical} ${region}历史`;
  }
  if (question.type === "funfact") {
    const category = getFunfactCategoryLabel(question.category);
    const format =
      question.format === "multiple_choice" ? "四选一" : "判断题";
    return `${TYPE_EMOJI.funfact} ${category} · ${format}`;
  }
  if (question.type === "nostalgia") {
    const sub = NOSTALGIA_SUB_LABELS[question.subCategory];
    return `${TYPE_EMOJI.nostalgia} 回忆杀 · ${sub}`;
  }
  const sub = MEME_SUB_LABELS[question.subCategory];
  return `${TYPE_EMOJI.meme} 网络哏 · ${sub}`;
}

/** 结果页副标题 */
export function getQuestionResultSubtitle(question: GameQuestion): string {
  if (question.type === "historical") {
    return question.location;
  }
  if (question.type === "funfact") {
    const category = getFunfactCategoryLabel(question.category);
    const format =
      question.format === "multiple_choice" ? "选择题" : "判断题";
    return `${category} · ${format}`;
  }
  const scope = CULTURAL_SCOPE_LABELS[question.culturalScope];
  if (question.type === "meme") {
    const platforms = Array.isArray(question.platform)
      ? question.platform.join("/")
      : question.platform;
    return `${scope} · ${platforms}`;
  }
  return `${scope} · ${NOSTALGIA_SUB_LABELS[question.subCategory]}`;
}

/** 时间轴范围：现代内容题聚焦 1980–2022 */
export function getTimelineBounds(question: GameQuestion): {
  minYear: number;
  maxYear: number;
  defaultYear: number;
} {
  if (requiresQuizAnswer(question)) {
    return { minYear: 0, maxYear: 0, defaultYear: 0 };
  }
  if (requiresMap(question)) {
    return { minYear: -3000, maxYear: 2026, defaultYear: 1900 };
  }
  return {
    minYear: MODERN_CONTENT_MIN_YEAR,
    maxYear: MODERN_CONTENT_MAX_YEAR,
    defaultYear: 2005,
  };
}
