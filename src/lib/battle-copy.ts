import { type AnimeLocale } from "~/lib/anime-locale";
import { type GameModeConfig, type GameModeSlug } from "~/lib/game-mode";

type BattleModeText = {
  title: string;
  description: string;
  tagline: string;
};

export type BattleCopy = {
  loading: string;
  backHome: string;
  backLobby: string;
  animeBattleKicker: string;
  lobbyTitle: string;
  lobbyDescription: string;
  createTab: string;
  joinTab: string;
  settingsTitle: string;
  gameType: string;
  rounds: string;
  roundCount: (round: number, total: number) => string;
  timePerRound: string;
  seconds: (value: number) => string;
  startingHp: string;
  createRoom: string;
  joinRoom: string;
  roomCode: string;
  roomCodePlaceholder: string;
  noBattleModes: string;
  createFailed: string;
  joinFailed: string;
  roomSyncFailed: string;
  joinRoomSyncFailed: string;
  copyRoom: string;
  players: string;
  host: string;
  minPlayersHint: string;
  syncingSettings: string;
  waitPlayers: string;
  generatingQuestions: string;
  startBattle: string;
  hostGenerating: string;
  waitHostStart: string;
  battlePrefix: string;
  submittedSummary: (submitted: number, total: number) => string;
  submitted: string;
  submitProgress: string;
  timeLeft: string;
  speedCompensationHint: string;
  submitNowMultiplier: (value: string) => string;
  selectAnswerFirst: string;
  submitAnswer: string;
  selectMapFirst: string;
  submitGuess: string;
  lockedTitle: string;
  lockedBody: string;
  tuxunInstructionTitle: string;
  tuxunInstructionBody: string;
  foreignInstructionTitle: string;
  foreignInstructionBody: string;
  animeClue: string;
  historyClue: string;
  nextClueIn: (seconds: number) => string;
  allCluesShown: string;
  tuxunGuessTitle: string;
  foreignGuessTitle: string;
  animeGuessTitle: string;
  historyGuessTitle: string;
  googleStreetViewFailed: string;
  unsupportedMode: string;
  insufficientGoogleScenes: (matched: number, count: number) => string;
  insufficientHistoryScenes: (matched: number, count: number) => string;
  insufficientAnimeScenes: (matched: number, count: number) => string;
  insufficientQuestions: string;
  questionLoadFailed: string;
  syncQuestionFailedRestart: string;
  syncQuestionFailedNetwork: string;
  incompleteRoomState: string;
  roundResultTitle: string;
  roundResultSubtitle: (round: number) => string;
  actualLocation: string;
  actualYear: string;
  quizScore: string;
  correct: string;
  incorrect: string;
  noSubmission: string;
  distanceScore: string;
  speedBonus: string;
  distanceAndElapsed: (distance: string, seconds?: number) => string;
  locationScore: string;
  yearScore: string;
  selectedYear: string;
  me: string;
  roundTotalScore: string;
  noDamage: string;
  topScore: (score: string) => string;
  scoreBreakthroughBadge: string;
  breakthroughDamageHint: string;
  ready: string;
  notReady: string;
  readyWaiting: string;
  readyFinal: string;
  readyNext: string;
  allReady: string;
  gameOverTitle: string;
  youWin: string;
  tiedFirst: string;
  playerWins: (name: string) => string;
  remainingHp: (hp: number) => string;
  finalResults: string;
  remaining: (hp: number) => string;
  totalScore: string;
  battleRecorded: string;
  battleRecordFailed: string;
  roundReview: string;
  playAgain: string;
};

export const BATTLE_COPY: Record<AnimeLocale, BattleCopy> = {
  zh: {
    loading: "加载中...",
    backHome: "返回首页",
    backLobby: "返回大厅",
    animeBattleKicker: "Anime battle",
    lobbyTitle: "对战模式",
    lobbyDescription:
      "创建房间或输入房间号，与朋友同时观察街景、抢答动漫圣地位置。",
    createTab: "创建房间",
    joinTab: "加入房间",
    settingsTitle: "游戏设置",
    gameType: "游戏类型",
    rounds: "轮数",
    roundCount: (round, total) => `第 ${round} / ${total} 轮`,
    timePerRound: "每轮时间",
    seconds: (value) => `${value} 秒`,
    startingHp: "初始血量",
    createRoom: "创建房间 →",
    joinRoom: "加入房间 →",
    roomCode: "房间号",
    roomCodePlaceholder: "6 位房间号",
    noBattleModes: "当前没有可用的对战玩法",
    createFailed: "进入房间失败，请稍后再试",
    joinFailed: "加入房间失败，请稍后再试",
    roomSyncFailed: "房间状态同步失败",
    joinRoomSyncFailed: "加入房间状态同步失败",
    copyRoom: "点击复制",
    players: "房间人数",
    host: "房主",
    minPlayersHint: "至少 2 人即可开局；更多玩家可继续加入同一房间。",
    syncingSettings: "正在同步房间设置...",
    waitPlayers: "等待玩家...",
    generatingQuestions: "正在生成题目...",
    startBattle: "开始对战",
    hostGenerating: "房主正在生成题目，请稍候...",
    waitHostStart: "等待房主开始游戏...",
    battlePrefix: "对战",
    submittedSummary: (submitted, total) => `${submitted} / ${total} 已提交`,
    submitted: "已提交，等待结算...",
    submitProgress: "提交进度",
    timeLeft: "剩余时间",
    speedCompensationHint: "提交越快，速度补偿越高",
    submitNowMultiplier: (value) => `现在提交 x${value}`,
    selectAnswerFirst: "请先选择答案",
    submitAnswer: "提交答案",
    selectMapFirst: "先在地图上选地点",
    submitGuess: "提交猜测",
    lockedTitle: "已锁定",
    lockedBody: "等待其他玩家或计时结束...",
    tuxunInstructionTitle: "观察全景，猜它在中国哪里",
    tuxunInstructionBody:
      "从道路、建筑、招牌和地形里找线索，在右下角 Google 地图中点选位置。",
    foreignInstructionTitle: "观察街景，猜它在日本哪里",
    foreignInstructionBody:
      "从道路、建筑、招牌和地形里找线索，在右下角 Google 地图中点选位置。",
    animeClue: "动漫线索",
    historyClue: "历史线索",
    nextClueIn: (seconds) => `下一条 ${seconds}s`,
    allCluesShown: "已全部给出",
    tuxunGuessTitle: "图寻猜点",
    foreignGuessTitle: "日本地图猜点",
    animeGuessTitle: "动漫对战猜点",
    historyGuessTitle: "历史图寻猜点",
    googleStreetViewFailed: "当前 Google 街景渲染失败，请返回大厅重新开局。",
    unsupportedMode: "暂不支持该对战模式",
    insufficientGoogleScenes: (matched, count) =>
      `只匹配到 ${matched} / ${count} 个 Google 日本街景点，未开始本局；请重新生成。`,
    insufficientHistoryScenes: (matched, count) =>
      `只匹配到 ${matched} / ${count} 道有 Google 街景的历史图寻题，未开始本局；请重新开始。`,
    insufficientAnimeScenes: (matched, count) =>
      `只匹配到 ${matched} / ${count} 道有 Google 街景的动漫题，未开始本局；请重新开始。`,
    insufficientQuestions: "题库题目不足",
    questionLoadFailed: "题库加载失败，请检查数据库连接",
    syncQuestionFailedRestart: "同步题目失败，请让房主重新开始",
    syncQuestionFailedNetwork: "同步题目失败，请检查网络连接",
    incompleteRoomState: "房间已开局，但题目状态不完整，请重新创建房间",
    roundResultTitle: "对战结算",
    roundResultSubtitle: (round) => `第 ${round} 轮结果`,
    actualLocation: "实际地点",
    actualYear: "实际",
    quizScore: "答题分",
    correct: "答对",
    incorrect: "答错",
    noSubmission: "本轮未提交答案",
    distanceScore: "距离分",
    speedBonus: "速度补偿",
    distanceAndElapsed: (distance, seconds) =>
      `偏差 ${distance}${seconds == null ? "" : ` · 用时 ${seconds} 秒`}`,
    locationScore: "地点分",
    yearScore: "年份分",
    selectedYear: "选择年份",
    me: "你",
    roundTotalScore: "本轮总分",
    noDamage: "本轮无人扣血",
    topScore: (score) => `本轮最高分 ${score}`,
    scoreBreakthroughBadge: "⚡ 超神一击 · 突破满分",
    breakthroughDamageHint:
      "这一击精准到令人窒息——突破满分的锋芒撕裂防线，对手承受了远超寻常的伤害！",
    ready: "已准备",
    notReady: "未准备",
    readyWaiting: "✓ 已准备，等待其他玩家...",
    readyFinal: "准备 · 查看最终结果",
    readyNext: "准备 · 下一轮",
    allReady: "所有玩家已准备，即将继续...",
    gameOverTitle: "对战结束",
    youWin: "你赢了！",
    tiedFirst: "并列第一！",
    playerWins: (name) => `${name} 获胜！`,
    remainingHp: (hp) => `剩余血量 ${hp} HP`,
    finalResults: "最终结果",
    remaining: (hp) => `剩余 ${hp} HP`,
    totalScore: "总得分",
    battleRecorded: "战绩已记录",
    battleRecordFailed: "战绩记录失败，请返回大厅重新登录后再试",
    roundReview: "各轮回顾",
    playAgain: "再来一局",
  },
  ja: {
    loading: "読み込み中...",
    backHome: "ホームへ戻る",
    backLobby: "ロビーへ戻る",
    animeBattleKicker: "Anime battle",
    lobbyTitle: "対戦モード",
    lobbyDescription:
      "ルームを作成するかコードを入力して、友だちと同時に聖地を推理します。",
    createTab: "作成",
    joinTab: "参加",
    settingsTitle: "ゲーム設定",
    gameType: "ゲームタイプ",
    rounds: "ラウンド数",
    roundCount: (round, total) => `第 ${round} / ${total} ラウンド`,
    timePerRound: "制限時間",
    seconds: (value) => `${value} 秒`,
    startingHp: "初期HP",
    createRoom: "ルーム作成 →",
    joinRoom: "ルーム参加 →",
    roomCode: "ルームコード",
    roomCodePlaceholder: "6桁のコード",
    noBattleModes: "利用できる対戦モードがありません",
    createFailed: "ルームに入れませんでした。後でもう一度お試しください。",
    joinFailed: "ルーム参加に失敗しました。後でもう一度お試しください。",
    roomSyncFailed: "ルーム状態の同期に失敗しました",
    joinRoomSyncFailed: "ルーム参加状態の同期に失敗しました",
    copyRoom: "コピー",
    players: "参加人数",
    host: "ホスト",
    minPlayersHint: "2人以上で開始できます。さらに同じルームへ参加できます。",
    syncingSettings: "ルーム設定を同期中...",
    waitPlayers: "プレイヤー待機中...",
    generatingQuestions: "問題を生成中...",
    startBattle: "対戦開始",
    hostGenerating: "ホストが問題を生成中です...",
    waitHostStart: "ホストの開始を待っています...",
    battlePrefix: "対戦",
    submittedSummary: (submitted, total) => `${submitted} / ${total} 提出済み`,
    submitted: "提出済み、結果待ち...",
    submitProgress: "提出状況",
    timeLeft: "残り時間",
    speedCompensationHint: "早く提出するほど速度ボーナスが上がります",
    submitNowMultiplier: (value) => `今提出 x${value}`,
    selectAnswerFirst: "先に答えを選んでください",
    submitAnswer: "答えを提出",
    selectMapFirst: "先に地図で場所を選んでください",
    submitGuess: "予想を提出",
    lockedTitle: "ロック済み",
    lockedBody: "他のプレイヤーまたはタイマー終了を待っています...",
    tuxunInstructionTitle: "パノラマを見て、中国の場所を推理",
    tuxunInstructionBody:
      "道路、建物、看板、地形から手がかりを探し、右下の Google マップで場所を選びます。",
    foreignInstructionTitle: "ストリートビューを見て、日本の場所を推理",
    foreignInstructionBody:
      "道路、建物、看板、地形から手がかりを探し、右下の Google マップで場所を選びます。",
    animeClue: "アニメヒント",
    historyClue: "歴史ヒント",
    nextClueIn: (seconds) => `次のヒント ${seconds}s`,
    allCluesShown: "すべて表示済み",
    tuxunGuessTitle: "図尋位置当て",
    foreignGuessTitle: "日本地図で予想",
    animeGuessTitle: "アニメ対戦予想",
    historyGuessTitle: "歴史図尋予想",
    googleStreetViewFailed:
      "Google ストリートビューの表示に失敗しました。ロビーに戻って作り直してください。",
    unsupportedMode: "この対戦モードはまだ対応していません",
    insufficientGoogleScenes: (matched, count) =>
      `Google 日本ストリートビュー地点は ${matched} / ${count} 件のみでした。再生成してください。`,
    insufficientHistoryScenes: (matched, count) =>
      `Google ストリートビュー付き歴史問題は ${matched} / ${count} 件のみでした。作り直してください。`,
    insufficientAnimeScenes: (matched, count) =>
      `Google ストリートビュー付きアニメ問題は ${matched} / ${count} 件のみでした。作り直してください。`,
    insufficientQuestions: "問題数が足りません",
    questionLoadFailed:
      "問題の読み込みに失敗しました。データベース接続を確認してください",
    syncQuestionFailedRestart:
      "問題同期に失敗しました。ホストが再開始してください",
    syncQuestionFailedNetwork:
      "問題同期に失敗しました。ネットワークを確認してください",
    incompleteRoomState:
      "ルームは開始済みですが問題状態が不完全です。作り直してください",
    roundResultTitle: "ラウンド結果",
    roundResultSubtitle: (round) => `第 ${round} ラウンド結果`,
    actualLocation: "正解地点",
    actualYear: "正解",
    quizScore: "クイズ得点",
    correct: "正解",
    incorrect: "不正解",
    noSubmission: "このラウンドは未提出",
    distanceScore: "距離点",
    speedBonus: "速度ボーナス",
    distanceAndElapsed: (distance, seconds) =>
      `誤差 ${distance}${seconds == null ? "" : ` · 所要 ${seconds} 秒`}`,
    locationScore: "地点点",
    yearScore: "年代点",
    selectedYear: "選択年",
    me: "あなた",
    roundTotalScore: "ラウンド得点",
    noDamage: "このラウンドはダメージなし",
    topScore: (score) => `最高得点 ${score}`,
    scoreBreakthroughBadge: "⚡ 神がかりの一撃 · 満点突破",
    breakthroughDamageHint:
      "息を呑むほどの精度――満点を超えた輝きが防御を貫き、相手に通常を遥かに超えるダメージを刻みました！",
    ready: "準備完了",
    notReady: "未準備",
    readyWaiting: "✓ 準備完了、他のプレイヤーを待機中...",
    readyFinal: "準備 · 最終結果へ",
    readyNext: "準備 · 次のラウンド",
    allReady: "全員準備完了。まもなく続行します...",
    gameOverTitle: "対戦終了",
    youWin: "勝利！",
    tiedFirst: "同率1位！",
    playerWins: (name) => `${name} の勝利！`,
    remainingHp: (hp) => `残りHP ${hp}`,
    finalResults: "最終結果",
    remaining: (hp) => `残り ${hp} HP`,
    totalScore: "合計得点",
    battleRecorded: "戦績を記録しました",
    battleRecordFailed:
      "戦績記録に失敗しました。ロビーに戻って再ログインしてください",
    roundReview: "ラウンド履歴",
    playAgain: "もう一戦",
  },
  en: {
    loading: "Loading...",
    backHome: "Back home",
    backLobby: "Back to lobby",
    animeBattleKicker: "Anime battle",
    lobbyTitle: "Battle mode",
    lobbyDescription:
      "Create a room or enter a room code, then race friends to identify the anime pilgrimage spot.",
    createTab: "Create",
    joinTab: "Join",
    settingsTitle: "Game settings",
    gameType: "Game type",
    rounds: "Rounds",
    roundCount: (round, total) => `Round ${round} / ${total}`,
    timePerRound: "Time per round",
    seconds: (value) => `${value}s`,
    startingHp: "Starting HP",
    createRoom: "Create room →",
    joinRoom: "Join room →",
    roomCode: "Room code",
    roomCodePlaceholder: "6-digit room code",
    noBattleModes: "No battle modes are available right now.",
    createFailed: "Could not enter the room. Please try again later.",
    joinFailed: "Could not join the room. Please try again later.",
    roomSyncFailed: "Room state failed to sync",
    joinRoomSyncFailed: "Room join state failed to sync",
    copyRoom: "Copy code",
    players: "Players",
    host: "Host",
    minPlayersHint:
      "Start with at least 2 players. More players can still join this room.",
    syncingSettings: "Syncing room settings...",
    waitPlayers: "Waiting for players...",
    generatingQuestions: "Generating questions...",
    startBattle: "Start battle",
    hostGenerating: "The host is generating questions...",
    waitHostStart: "Waiting for the host to start...",
    battlePrefix: "Battle",
    submittedSummary: (submitted, total) => `${submitted} / ${total} submitted`,
    submitted: "Submitted. Waiting for results...",
    submitProgress: "Submit progress",
    timeLeft: "Time left",
    speedCompensationHint: "Submit faster to earn a higher speed bonus",
    submitNowMultiplier: (value) => `Submit now x${value}`,
    selectAnswerFirst: "Choose an answer first",
    submitAnswer: "Submit answer",
    selectMapFirst: "Pick a place on the map first",
    submitGuess: "Submit guess",
    lockedTitle: "Locked in",
    lockedBody: "Waiting for other players or the timer...",
    tuxunInstructionTitle: "Study the panorama and guess where it is in China",
    tuxunInstructionBody:
      "Use roads, buildings, signs, and terrain, then pick a place on the Google map.",
    foreignInstructionTitle:
      "Study the Street View and guess where it is in Japan",
    foreignInstructionBody:
      "Use roads, buildings, signs, and terrain, then pick a place on the Google map.",
    animeClue: "Anime clue",
    historyClue: "History clue",
    nextClueIn: (seconds) => `Next clue ${seconds}s`,
    allCluesShown: "All clues shown",
    tuxunGuessTitle: "Tuxun map guess",
    foreignGuessTitle: "Japan map guess",
    animeGuessTitle: "Anime battle guess",
    historyGuessTitle: "History map guess",
    googleStreetViewFailed:
      "Google Street View failed to render. Return to the lobby and recreate the room.",
    unsupportedMode: "This battle mode is not supported yet.",
    insufficientGoogleScenes: (matched, count) =>
      `Only found ${matched} / ${count} Google Japan Street View spots. Regenerate the match.`,
    insufficientHistoryScenes: (matched, count) =>
      `Only found ${matched} / ${count} history questions with Google Street View. Recreate the room.`,
    insufficientAnimeScenes: (matched, count) =>
      `Only found ${matched} / ${count} anime questions with Google Street View. Recreate the room.`,
    insufficientQuestions: "Not enough questions in the bank",
    questionLoadFailed:
      "Question loading failed. Check the database connection.",
    syncQuestionFailedRestart:
      "Question sync failed. Ask the host to restart the room.",
    syncQuestionFailedNetwork: "Question sync failed. Check your network.",
    incompleteRoomState:
      "The room has started, but the question state is incomplete. Recreate the room.",
    roundResultTitle: "Battle results",
    roundResultSubtitle: (round) => `Round ${round} results`,
    actualLocation: "Actual location",
    actualYear: "Actual",
    quizScore: "Quiz score",
    correct: "Correct",
    incorrect: "Incorrect",
    noSubmission: "No answer submitted this round",
    distanceScore: "Distance score",
    speedBonus: "Speed bonus",
    distanceAndElapsed: (distance, seconds) =>
      `Off by ${distance}${seconds == null ? "" : ` · ${seconds}s`}`,
    locationScore: "Location score",
    yearScore: "Year score",
    selectedYear: "Selected year",
    me: "you",
    roundTotalScore: "Round score",
    noDamage: "No damage this round",
    topScore: (score) => `Top score ${score}`,
    scoreBreakthroughBadge: "⚡ Transcendent hit · Above the cap",
    breakthroughDamageHint:
      "A breathtakingly precise strike — breaking past the cap tore through their defense and dealt far heavier damage than usual!",
    ready: "ready",
    notReady: "not ready",
    readyWaiting: "✓ Ready. Waiting for other players...",
    readyFinal: "Ready · View final results",
    readyNext: "Ready · Next round",
    allReady: "Everyone is ready. Continuing soon...",
    gameOverTitle: "Battle over",
    youWin: "You won!",
    tiedFirst: "Tied for first!",
    playerWins: (name) => `${name} wins!`,
    remainingHp: (hp) => `${hp} HP remaining`,
    finalResults: "Final results",
    remaining: (hp) => `${hp} HP left`,
    totalScore: "Total score",
    battleRecorded: "Battle record saved",
    battleRecordFailed:
      "Could not save the battle record. Return to the lobby and log in again.",
    roundReview: "Round review",
    playAgain: "Play again",
  },
};

const BATTLE_MODE_COPY: Partial<
  Record<GameModeSlug, Record<AnimeLocale, BattleModeText>>
> = {
  anime: {
    zh: {
      title: "猜动漫模式",
      description: "观察现实街景，参考左上角动漫线索猜取景地",
      tagline: "动漫线索 + Google 街景 + 日本地图猜点",
    },
    ja: {
      title: "アニメ推理モード",
      description:
        "現実のストリートビューと左上のアニメヒントから聖地を推理します",
      tagline: "アニメヒント + Google ストリートビュー + 日本地図",
    },
    en: {
      title: "Anime Guessr",
      description:
        "Use a real Street View scene and the anime clue panel to find the location.",
      tagline: "Anime clues + Google Street View + Japan map",
    },
  },
  "anime-tuxun": {
    zh: {
      title: "动漫寻图模式",
      description: "根据动漫线索观察 Google 街景，猜对应的日本城市",
      tagline: "动漫线索 + Google 街景 + 日本地图猜点",
    },
    ja: {
      title: "アニメ聖地モード",
      description:
        "アニメのヒントを頼りに Google ストリートビューを観察し、日本の聖地を当てます",
      tagline: "アニメヒント + Google ストリートビュー + 日本地図",
    },
    en: {
      title: "Anime pilgrimage",
      description:
        "Use anime clues and Google Street View to find the real-world location in Japan.",
      tagline: "Anime clues + Google Street View + Japan map",
    },
  },
  tuxun: {
    zh: {
      title: "图寻模式",
      description: "观察街景猜位置",
      tagline: "全景线索 + 中国地图猜点",
    },
    ja: {
      title: "図尋モード",
      description: "ストリートビューから場所を推理します",
      tagline: "パノラマ + 中国地図",
    },
    en: {
      title: "Tuxun",
      description: "Panorama location guessing.",
      tagline: "Panorama clues + China map",
    },
  },
  foreign: {
    zh: {
      title: "国外模式",
      description: "Google 街景日本版 GeoGuessr，观察街景猜位置",
      tagline: "Google 街景 + 日本地图猜点",
    },
    ja: {
      title: "海外モード",
      description: "Google ストリートビューで日本の場所を推理します",
      tagline: "Google ストリートビュー + 日本地図",
    },
    en: {
      title: "Japan Street View",
      description: "GeoGuessr-style Japan guessing with Google Street View.",
      tagline: "Google Street View + Japan map",
    },
  },
  "history-tuxun": {
    zh: {
      title: "历史图寻模式",
      description: "根据历史线索观察现代街景，猜它对应的地点",
      tagline: "历史线索 + Google 街景 + 地图猜点",
    },
    ja: {
      title: "歴史図尋モード",
      description: "歴史ヒントと現代の街景から場所を推理します",
      tagline: "歴史ヒント + パノラマ + 中国地図",
    },
    en: {
      title: "History street hunt",
      description:
        "Use history clues and modern panorama scenes to find the place.",
      tagline: "History clues + panorama + map guess",
    },
  },
};

export function getBattleCopy(locale: AnimeLocale) {
  return BATTLE_COPY[locale];
}

export function getBattleModeText(mode: GameModeConfig, locale: AnimeLocale) {
  return BATTLE_MODE_COPY[mode.slug]?.[locale] ?? mode;
}

export function formatBattleDistance(distanceKm: number, locale: AnimeLocale) {
  if (distanceKm < 1) {
    const meters = Math.round(distanceKm * 1000);
    return locale === "zh" || locale === "ja" ? `${meters} 米` : `${meters} m`;
  }
  const kilometers = Math.round(distanceKm).toLocaleString(
    locale === "zh" ? "zh-CN" : locale === "ja" ? "ja-JP" : "en-US",
  );
  return locale === "zh" || locale === "ja"
    ? `${kilometers} 公里`
    : `${kilometers} km`;
}
