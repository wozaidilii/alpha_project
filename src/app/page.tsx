"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import { COUNTRY_OPTIONS, countryCodeToFlagEmoji } from "~/lib/country";
import {
  ANIME_LOCALES,
  DEFAULT_ANIME_LOCALE,
  getStoredAnimeLocale,
  saveAnimeLocale,
  withAnimeLocale,
  type AnimeLocale,
} from "~/lib/anime-locale";
import { AnimeDifficultySelector } from "~/components/AnimeDifficultySelector";
import { AnimeRoundCountSelector } from "~/components/AnimeRoundCountSelector";
import {
  ANIME_GUESSR_DEFAULT_DIFFICULTY_TIER,
  getStoredAnimeGuessrDifficultyTier,
  getStoredAnimeGuessrRoundCount,
  saveAnimeGuessrDifficultyTier,
  saveAnimeGuessrRoundCount,
  type AnimeGuessrDifficultyTier,
  type AnimeGuessrRoundCount,
} from "~/lib/anime-guessr";
import {
  clearPlayerSession,
  getStoredPlayerSession,
  savePlayerSession,
} from "~/lib/player-session";
import {
  capturePostHogEvent,
  identifyPostHogUser,
  POSTHOG_EVENTS,
  resetPostHogUser,
} from "~/lib/posthog";
import { type PlayerSession } from "~/types/player";
import { api } from "~/trpc/react";

const COPY: Record<
  AnimeLocale,
  {
    lang: string;
    kicker: string;
    title: string;
    subtitle: string;
    start: string;
    continue: string;
    battle: string;
    login: string;
    logout: string;
    clue: string;
    street: string;
    map: string;
    round: string;
    panelTitle: string;
    panelBody: string;
    howTitle: string;
    howBody: string;
    steps: Array<{ title: string; body: string }>;
    profileTitle: string;
    profileGuest: string;
    username: string;
    country: string;
    countryUnset: string;
    saveProfile: string;
    saving: string;
    saved: string;
    leaderboardTitle: string;
    leaderboardEmpty: string;
    leaderboardRounds: (rounds: number) => string;
    myRank: string;
    points: string;
    loading: string;
    roundsLabel: string;
    roundsOption: (rounds: number) => string;
    difficultyLabel: string;
    difficultyOption: (tier: AnimeGuessrDifficultyTier) => string;
    difficultyHint: (tier: AnimeGuessrDifficultyTier) => string;
    contactTitle: string;
    contactPartnershipHint: string;
    contactBugHint: string;
    contactPartnership: string;
    contactBug: string;
  }
> = {
  zh: {
    lang: "中文",
    kicker: "第零观测班 · 街景圣地档案",
    title: "AniGuessr",
    subtitle:
      "次元裂缝把番剧画面投进现实街角。读取线索、审判街景、把坐标钉回世界地图。",
    start: "开启圣地判定",
    continue: "进入档案",
    battle: "对战模式",
    login: "登录",
    logout: "退出登录",
    clue: "截取命运画面",
    street: "读取现实痕迹",
    map: "封印世界坐标",
    round: "首轮契约 · 5 轮",
    panelTitle: "左眼看番剧，右眼校准现实",
    panelBody:
      "动漫图只是一枚线索碎片，真正的战场是街景里的路牌、天际线、店招和季节气味。猜中坐标，完成一次圣地封印。",
    howTitle: "巡礼者的三段仪式",
    howBody: "每局都从一张番剧线索开始，在真实街景中完成坐标审判。",
    steps: [
      {
        title: "召唤线索",
        body: "左上角出现动漫画面，不泄露地点，只留下构图、色彩和故事气息。",
      },
      {
        title: "观测街景",
        body: "主画面永远是真实街景，所有答案都藏在现实世界的微小痕迹里。",
      },
      {
        title: "钉下坐标",
        body: "在地图上落点，分数由距离、速度和判断力共同裁决。",
      },
    ],
    profileTitle: "玩家 Profile",
    profileGuest: "登录后可保存用户名、地区和排行榜成绩。",
    username: "用户名",
    country: "地区",
    countryUnset: "未设置地区",
    saveProfile: "保存资料",
    saving: "保存中...",
    saved: "已保存",
    leaderboardTitle: "排行榜",
    leaderboardEmpty: "暂无上榜成绩",
    leaderboardRounds: (rounds) => `${rounds} 轮榜`,
    myRank: "我的排名",
    points: "分",
    loading: "加载中...",
    roundsLabel: "局数",
    roundsOption: (rounds) => `${rounds} 轮`,
    difficultyLabel: "难度档位",
    difficultyOption: (tier) =>
      ({ beginner: "入门", intermediate: "进阶", master: "大师", miracle: "神迹" })[
        tier
      ],
    difficultyHint: (tier) =>
      ({
        beginner: "仅包含难度 1 的题目。",
        intermediate: "包含难度 1 与 2 的题目。",
        master: "包含难度 1、2、3 的题目。",
        miracle: "包含全部难度题目。",
      })[tier],
    contactTitle: "联系我们",
    contactPartnershipHint: "合作与方向建议",
    contactBugHint: "技术问题、宕机与 Bug 报告",
    contactPartnership: "kris@loamly.net",
    contactBug: "lewis@loamly.net",
  },
  ja: {
    lang: "日本語",
    kicker: "第零観測班 · 聖地座標記録",
    title: "AniGuessr",
    subtitle: "現実の街並みを見て、左上のアニメ手がかりから場所を当てよう。",
    start: "聖地判定を始める",
    continue: "記録へ",
    battle: "対戦モード",
    login: "ログイン",
    logout: "ログアウト",
    clue: "運命のカット",
    street: "現実痕跡の観測",
    map: "世界座標を封印",
    round: "初回契約 · 5 ラウンド",
    panelTitle: "片目はアニメ、片目は現実へ",
    panelBody:
      "アニメ画像は小さな手がかり。勝負の場はストリートビューに残る看板、地形、空気感。座標を当てて聖地を記録しよう。",
    howTitle: "巡礼者の三つの儀式",
    howBody:
      "一枚のアニメカットから始まり、現実の街景で答えを見抜く推理ゲームです。",
    steps: [
      {
        title: "手がかりを読む",
        body: "場所名は隠されたまま、構図や色、作品の気配だけが残ります。",
      },
      {
        title: "街景を観測",
        body: "主画面は現実のストリートビュー。答えは細部の違和感に潜みます。",
      },
      {
        title: "座標を刻む",
        body: "地図にピンを置き、距離と判断速度でスコアが裁定されます。",
      },
    ],
    profileTitle: "プレイヤー",
    profileGuest: "ログインすると名前、地域、ランキング記録を保存できます。",
    username: "ユーザー名",
    country: "地域",
    countryUnset: "未設定",
    saveProfile: "保存",
    saving: "保存中...",
    saved: "保存しました",
    leaderboardTitle: "ランキング",
    leaderboardEmpty: "まだ記録がありません",
    leaderboardRounds: (rounds) => `${rounds} ラウンド`,
    myRank: "自分の順位",
    points: "点",
    loading: "読み込み中...",
    roundsLabel: "ラウンド数",
    roundsOption: (rounds) => `${rounds} ラウンド`,
    difficultyLabel: "難易度",
    difficultyOption: (tier) =>
      ({
        beginner: "入門",
        intermediate: "進階",
        master: "マスター",
        miracle: "奇跡",
      })[tier],
    difficultyHint: (tier) =>
      ({
        beginner: "難易度 1 の問題のみ。",
        intermediate: "難易度 1 と 2 の問題。",
        master: "難易度 1、2、3 の問題。",
        miracle: "すべての難易度の問題。",
      })[tier],
    contactTitle: "お問い合わせ",
    contactPartnershipHint: "提携・方向性のご提案",
    contactBugHint: "技術不具合・障害・バグ報告",
    contactPartnership: "kris@loamly.net",
    contactBug: "lewis@loamly.net",
  },
  en: {
    lang: "English",
    kicker: "Zeroth Observation Unit",
    title: "AniGuessr",
    subtitle:
      "A frame tears through the veil. Read the anime clue, interrogate the real street, and seal the coordinate before the trace fades.",
    start: "Begin the rite",
    continue: "Open archive",
    battle: "Battle mode",
    login: "Log in",
    logout: "Log out",
    clue: "Summon the frame",
    street: "Read the real trace",
    map: "Seal the world point",
    round: "First contract · 5 rounds",
    panelTitle: "One eye on anime. One eye on reality.",
    panelBody:
      "The anime still is only a shard. The answer lives in Street View: signage, skyline, road texture, storefronts, and the uneasy overlap between fiction and the real map.",
    howTitle: "The pilgrim rite",
    howBody:
      "Each run is a compact deduction ritual: one clue, one real street, one coordinate judgment.",
    steps: [
      {
        title: "Invoke the clue",
        body: "The anime frame appears without the place name, leaving composition and atmosphere as evidence.",
      },
      {
        title: "Interrogate reality",
        body: "Street View is the main field. The smallest sign, road edge, or skyline can break the seal.",
      },
      {
        title: "Seal the point",
        body: "Drop your pin on the map. Distance, speed, and nerve decide the score.",
      },
    ],
    profileTitle: "Player profile",
    profileGuest: "Log in to save your name, region, and leaderboard score.",
    username: "Username",
    country: "Region",
    countryUnset: "No region set",
    saveProfile: "Save profile",
    saving: "Saving...",
    saved: "Saved",
    leaderboardTitle: "Leaderboard",
    leaderboardEmpty: "No ranked scores yet",
    leaderboardRounds: (rounds) => `${rounds}-round`,
    myRank: "My rank",
    points: "pts",
    loading: "Loading...",
    roundsLabel: "Rounds",
    roundsOption: (rounds) => `${rounds} rounds`,
    difficultyLabel: "Difficulty",
    difficultyOption: (tier) =>
      ({
        beginner: "Beginner",
        intermediate: "Intermediate",
        master: "Master",
        miracle: "Miracle",
      })[tier],
    difficultyHint: (tier) =>
      ({
        beginner: "Difficulty 1 questions only.",
        intermediate: "Difficulty 1 and 2 questions.",
        master: "Difficulty 1, 2, and 3 questions.",
        miracle: "All difficulty levels.",
      })[tier],
    contactTitle: "Contact",
    contactPartnershipHint: "Partnerships and product direction",
    contactBugHint: "Technical issues, outages, and bug reports",
    contactPartnership: "kris@loamly.net",
    contactBug: "lewis@loamly.net",
  },
};

function avatarImageStyle(
  url: string | null | undefined,
): CSSProperties | undefined {
  if (!url) return undefined;
  return { backgroundImage: `url("${url.replace(/"/g, "%22")}")` };
}

export default function Home() {
  const [locale, setLocale] = useState<AnimeLocale>(DEFAULT_ANIME_LOCALE);
  const [leaderboardRounds, setLeaderboardRounds] = useState<5 | 10>(5);
  const [selectedRoundCount, setSelectedRoundCount] =
    useState<AnimeGuessrRoundCount>(5);
  const [difficultyTier, setDifficultyTier] = useState<AnimeGuessrDifficultyTier>(
    ANIME_GUESSR_DEFAULT_DIFFICULTY_TIER,
  );
  const [session, setSession] = useState<PlayerSession | null>(null);
  const [profileName, setProfileName] = useState("");
  const [profileCountryCode, setProfileCountryCode] = useState("");
  const [profileMessage, setProfileMessage] = useState("");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const copy = COPY[locale];
  const playUrl = withAnimeLocale(
    `/game/anime?rounds=${selectedRoundCount}&difficulty=${difficultyTier}`,
    locale,
  );
  const loginUrl = withAnimeLocale("/login", locale);
  const localizedBattleUrl = withAnimeLocale("/battle", locale);
  const battleUrl = session
    ? localizedBattleUrl
    : withAnimeLocale(
        `/login?next=${encodeURIComponent(localizedBattleUrl)}`,
        locale,
      );
  const meQuery = api.player.me.useQuery(
    { token: session?.token ?? "" },
    { enabled: Boolean(session?.token), retry: false },
  );
  const leaderboardQuery = api.player.leaderboard.useQuery(
    { token: session?.token, limit: 8, rounds: leaderboardRounds },
    { retry: false },
  );
  const updateProfile = api.player.updateProfile.useMutation({
    onSuccess(user) {
      if (!session) return;
      const nextSession = { token: session.token, user };
      savePlayerSession(nextSession);
      identifyPostHogUser(user);
      setSession(nextSession);
      setProfileName(user.name);
      setProfileCountryCode(user.countryCode ?? "");
      setProfileMessage(copy.saved);
      capturePostHogEvent(
        POSTHOG_EVENTS.profileUpdated,
        { has_country: Boolean(user.countryCode) },
        user.id,
      );
      void leaderboardQuery.refetch();
    },
  });

  useEffect(() => {
    setLocale(getStoredAnimeLocale());
    setSelectedRoundCount(getStoredAnimeGuessrRoundCount());
    setDifficultyTier(getStoredAnimeGuessrDifficultyTier());
    const storedSession = getStoredPlayerSession();
    setSession(storedSession);
    if (storedSession) identifyPostHogUser(storedSession.user);
    setProfileName(storedSession?.user.name ?? "");
    setProfileCountryCode(storedSession?.user.countryCode ?? "");
  }, []);

  useEffect(() => {
    if (!meQuery.data) return;
    setSession((current) => {
      if (!current) return current;
      const nextSession = { token: current.token, user: meQuery.data };
      savePlayerSession(nextSession);
      identifyPostHogUser(meQuery.data);
      return nextSession;
    });
    setProfileName(meQuery.data.name);
    setProfileCountryCode(meQuery.data.countryCode ?? "");
  }, [meQuery.data]);

  function handleRoundCountChange(nextRoundCount: AnimeGuessrRoundCount) {
    setSelectedRoundCount(nextRoundCount);
    saveAnimeGuessrRoundCount(nextRoundCount);
  }

  function handleDifficultyTierChange(nextDifficultyTier: AnimeGuessrDifficultyTier) {
    setDifficultyTier(nextDifficultyTier);
    saveAnimeGuessrDifficultyTier(nextDifficultyTier);
  }

  function selectLocale(nextLocale: AnimeLocale) {
    setLocale(nextLocale);
    saveAnimeLocale(nextLocale);
  }

  function handleSaveProfile() {
    if (!session) return;
    setProfileMessage("");
    updateProfile.mutate({
      token: session.token,
      name: profileName,
      avatar: session.user.avatar,
      countryCode: profileCountryCode || null,
    });
  }

  function handleLogout() {
    clearPlayerSession();
    resetPostHogUser();
    setSession(null);
    setProfileName("");
    setProfileCountryCode("");
    setProfileMessage("");
    setProfileMenuOpen(false);
    void leaderboardQuery.refetch();
  }

  const leaderboard = leaderboardQuery.data?.entries ?? [];
  const currentUserEntry = leaderboardQuery.data?.currentUserEntry;
  const showDetachedCurrentUser =
    currentUserEntry &&
    !leaderboard.some((entry) => entry.userId === currentUserEntry.userId);

  return (
    <main className="anime-shell min-h-screen overflow-x-hidden text-white">
      <section className="relative min-h-screen px-5 py-5 sm:px-8 lg:px-12">
        <div className="absolute inset-0 -z-10">
          <div className="h-full w-full bg-[url('/images/anime-placeholder.jpg')] bg-cover bg-center opacity-35" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(10,6,18,0.98),rgba(20,9,32,0.86)_44%,rgba(10,6,18,0.78))]" />
        </div>

        <nav className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
          <Link
            href={playUrl}
            className="text-lg font-black tracking-[0.18em] text-pink-100 uppercase focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:outline-none"
          >
            AniGuessr
          </Link>

          <div className="relative flex flex-wrap items-center justify-end gap-2">
            <div
              className="grid grid-cols-3 rounded-xl border border-white/10 bg-black/40 p-1 text-xs font-bold text-white/70"
              aria-label="Language"
            >
              {ANIME_LOCALES.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => selectLocale(item)}
                  className={`min-h-10 rounded-lg px-3 transition focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:outline-none ${
                    locale === item
                      ? "bg-pink-300 text-slate-950"
                      : "hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {COPY[item].lang}
                </button>
              ))}
            </div>

            {session ? (
              <>
                <button
                  type="button"
                  aria-label={copy.profileTitle}
                  aria-expanded={profileMenuOpen}
                  aria-controls="home-profile-menu"
                  onClick={() =>
                    setProfileMenuOpen((value) => {
                      const nextValue = !value;
                      if (nextValue) {
                        capturePostHogEvent(
                          POSTHOG_EVENTS.profileOpened,
                          { source: "home" },
                          session.user.id,
                        );
                      }
                      return nextValue;
                    })
                  }
                  className="grid h-11 w-11 place-items-center overflow-hidden rounded-full border border-pink-200/40 bg-white/10 text-lg shadow-lg shadow-pink-950/20 transition hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:outline-none"
                >
                  {session.user.avatarUrl ? (
                    <span
                      aria-hidden="true"
                      className="h-full w-full bg-cover bg-center"
                      style={avatarImageStyle(session.user.avatarUrl)}
                    />
                  ) : (
                    <span>{session.user.avatar.icon}</span>
                  )}
                </button>

                {profileMenuOpen && (
                  <section
                    id="home-profile-menu"
                    className="anime-panel absolute top-full right-0 z-50 mt-3 w-[min(22rem,calc(100vw-2rem))] p-4 text-left"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="truncate text-lg font-black text-white">
                          {copy.profileTitle}
                        </h2>
                        <p className="mt-1 truncate text-xs text-pink-100/60">
                          {session.user.email ??
                            session.user.provider ??
                            "player"}
                        </p>
                      </div>
                      <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/10 bg-white/10 text-xl">
                        {session.user.avatarUrl ? (
                          <span
                            aria-hidden="true"
                            className="h-full w-full bg-cover bg-center"
                            style={avatarImageStyle(session.user.avatarUrl)}
                          />
                        ) : (
                          session.user.avatar.icon
                        )}
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3">
                      <label className="grid gap-1 text-xs font-bold text-pink-100/70">
                        {copy.username}
                        <input
                          value={profileName}
                          onChange={(event) =>
                            setProfileName(event.target.value)
                          }
                          maxLength={12}
                          className="min-h-11 rounded-xl border border-white/10 bg-black/35 px-3 text-sm font-bold text-white transition outline-none focus:border-pink-300"
                        />
                      </label>
                      <div className="grid gap-2 text-xs font-bold text-pink-100/70">
                        <span>{copy.country}</span>
                        <div
                          role="radiogroup"
                          aria-label={copy.country}
                          className="grid max-h-48 grid-cols-6 gap-2 overflow-y-auto pr-1"
                        >
                          <button
                            type="button"
                            role="radio"
                            aria-checked={profileCountryCode === ""}
                            aria-label={copy.countryUnset}
                            title={copy.countryUnset}
                            onClick={() => setProfileCountryCode("")}
                            className={`grid h-11 w-full min-w-0 place-items-center rounded-xl border text-lg transition focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:outline-none ${
                              profileCountryCode === ""
                                ? "border-pink-300 bg-pink-300 text-slate-950 shadow-[0_0_22px_rgba(249,168,212,0.24)]"
                                : "border-white/10 bg-black/35 hover:border-pink-200/50 hover:bg-white/10"
                            }`}
                          >
                            {countryCodeToFlagEmoji(null)}
                          </button>
                          {COUNTRY_OPTIONS.map((country) => {
                            const selected =
                              profileCountryCode === country.code;
                            return (
                              <button
                                key={country.code}
                                type="button"
                                role="radio"
                                aria-checked={selected}
                                aria-label={country.label}
                                title={country.label}
                                onClick={() =>
                                  setProfileCountryCode(country.code)
                                }
                                className={`grid h-11 w-full min-w-0 place-items-center rounded-xl border text-lg transition focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:outline-none ${
                                  selected
                                    ? "border-pink-300 bg-pink-300 text-slate-950 shadow-[0_0_22px_rgba(249,168,212,0.24)]"
                                    : "border-white/10 bg-black/35 hover:border-pink-200/50 hover:bg-white/10"
                                }`}
                              >
                                {countryCodeToFlagEmoji(country.code)}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleSaveProfile}
                          disabled={
                            updateProfile.isPending ||
                            profileName.trim().length === 0
                          }
                          className="anime-button min-h-11 flex-1 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          {updateProfile.isPending
                            ? copy.saving
                            : copy.saveProfile}
                        </button>
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="min-h-11 rounded-xl border border-white/10 bg-white/10 px-4 text-sm font-black text-pink-50 transition hover:bg-white/15"
                        >
                          {copy.logout}
                        </button>
                      </div>
                      {(profileMessage || updateProfile.error) && (
                        <p className="text-xs text-pink-100/70">
                          {updateProfile.error?.message ?? profileMessage}
                        </p>
                      )}
                    </div>
                  </section>
                )}
              </>
            ) : (
              <Link
                href={loginUrl}
                className="rounded-xl border border-white/10 bg-white/10 px-4 py-2.5 text-xs font-black text-pink-50 transition hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:outline-none"
              >
                {copy.login}
              </Link>
            )}
          </div>
        </nav>

        <div className="mx-auto grid min-h-[calc(100vh-92px)] w-full max-w-7xl items-start gap-6 py-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(240px,0.68fr)_minmax(240px,0.58fr)] xl:gap-8">
          <div className="relative z-10 max-w-2xl">
            <div className="anime-chip mb-5 w-fit">{copy.kicker}</div>
            <h1 className="text-[clamp(3.1rem,7vw,6rem)] leading-[0.9] font-black text-balance text-white">
              {copy.title}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-pretty text-pink-50/80 sm:text-xl">
              {copy.subtitle}
            </p>

            <div className="mt-8 flex flex-col gap-4">
              <AnimeDifficultySelector
                value={difficultyTier}
                copy={copy}
                onChange={handleDifficultyTierChange}
              />
              <AnimeRoundCountSelector
                value={selectedRoundCount}
                copy={copy}
                onChange={handleRoundCountChange}
              />
              <div className="flex flex-wrap gap-3">
              <Link
                href={playUrl}
                onClick={() =>
                  capturePostHogEvent(POSTHOG_EVENTS.homeStartClicked, {
                    locale,
                    rounds: selectedRoundCount,
                    difficulty: difficultyTier,
                  })
                }
                className="anime-button"
              >
                {copy.start}
              </Link>
              <Link
                href={battleUrl}
                onClick={() =>
                  capturePostHogEvent(POSTHOG_EVENTS.homeBattleClicked, {
                    locale,
                    loggedIn: Boolean(session),
                  })
                }
                className="anime-button-secondary"
              >
                {copy.battle}
              </Link>
              </div>
            </div>

            <div className="mt-6 max-w-2xl rounded-2xl border border-white/10 bg-black/25 p-4">
              <h2 className="text-sm font-black tracking-[0.18em] text-pink-100/70 uppercase">
                {copy.contactTitle}
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <a
                  href={`mailto:${copy.contactPartnership}`}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 transition hover:border-pink-200/40 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:outline-none"
                >
                  <span className="block text-xs font-bold text-pink-100/60">
                    {copy.contactPartnershipHint}
                  </span>
                  <span className="mt-1 block text-sm font-black text-white">
                    {copy.contactPartnership}
                  </span>
                </a>
                <a
                  href={`mailto:${copy.contactBug}`}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 transition hover:border-cyan-200/35 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:outline-none"
                >
                  <span className="block text-xs font-bold text-pink-100/60">
                    {copy.contactBugHint}
                  </span>
                  <span className="mt-1 block text-sm font-black text-white">
                    {copy.contactBug}
                  </span>
                </a>
              </div>
            </div>

            <div className="mt-10 max-w-2xl border-y border-white/10 py-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <h2 className="text-2xl font-black text-white">
                  {copy.howTitle}
                </h2>
                <p className="max-w-sm text-sm leading-6 text-pink-50/70">
                  {copy.howBody}
                </p>
              </div>
              <ol className="mt-5 grid gap-4 sm:grid-cols-3">
                {copy.steps.map((step, index) => (
                  <li key={step.title} className="flex gap-3">
                    <span className="mt-0.5 text-sm font-black text-cyan-200">
                      0{index + 1}
                    </span>
                    <span>
                      <span className="block text-sm font-black text-white">
                        {step.title}
                      </span>
                      <span className="mt-1 block text-sm leading-6 text-pink-50/60">
                        {step.body}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <div className="grid gap-4 lg:max-w-[320px] lg:justify-self-end lg:pt-8">
            <div className="relative">
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-white/10 bg-black/30 sm:aspect-[16/11] lg:aspect-[4/5]">
                <div className="h-full w-full bg-[url('/images/anime-placeholder.jpg')] bg-cover bg-center" />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.02),rgba(8,5,16,0.36))]" />
              </div>

              <div className="anime-chip absolute top-3 left-3 w-fit">
                {copy.round}
              </div>
            </div>

            <div className="anime-panel p-4 sm:p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl leading-tight font-black text-white sm:text-2xl">
                    {copy.panelTitle}
                  </h2>
                </div>
                <div
                  aria-hidden="true"
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-cyan-200/40 bg-cyan-200/10 text-sm font-black text-cyan-100"
                >
                  R1
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-white/70">
                {copy.panelBody}
              </p>
            </div>
          </div>

          <aside className="lg:pt-8">
            <section className="anime-panel p-4">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-black text-white">
                  {copy.leaderboardTitle}
                </h2>
                <div className="flex overflow-hidden rounded-full border border-white/10">
                  {([5, 10] as const).map((rounds) => (
                    <button
                      key={rounds}
                      type="button"
                      onClick={() => setLeaderboardRounds(rounds)}
                      className={`px-3 py-1 text-xs font-black transition ${
                        leaderboardRounds === rounds
                          ? "bg-cyan-200/20 text-cyan-50"
                          : "bg-white/5 text-pink-50/70 hover:bg-white/10"
                      }`}
                    >
                      {copy.leaderboardRounds(rounds)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-2">
                {leaderboard.length > 0 ? (
                  leaderboard.map((entry) => (
                    <div
                      key={entry.userId}
                      className={`grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-2 rounded-xl border px-3 py-2 ${
                        entry.isCurrentUser
                          ? "border-pink-300/50 bg-pink-400/15"
                          : "border-white/10 bg-white/5"
                      }`}
                    >
                      <span className="font-mono text-sm font-black text-cyan-100">
                        #{entry.rank}
                      </span>
                      <span className="min-w-0 truncate text-sm font-bold text-white">
                        {countryCodeToFlagEmoji(entry.countryCode)} {entry.name}
                      </span>
                      <span className="text-sm font-black text-pink-100">
                        {entry.score.toLocaleString()} {copy.points}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="rounded-xl border border-white/10 bg-white/5 px-3 py-4 text-center text-sm text-pink-100/60">
                    {leaderboardQuery.isLoading
                      ? copy.loading
                      : copy.leaderboardEmpty}
                  </p>
                )}

                {showDetachedCurrentUser && currentUserEntry && (
                  <div className="mt-2 rounded-xl border border-cyan-200/30 bg-cyan-200/10 px-3 py-2">
                    <div className="mb-1 text-xs font-bold text-cyan-100/70">
                      {copy.myRank}
                    </div>
                    <div className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-2">
                      <span className="font-mono text-sm font-black text-cyan-100">
                        #{currentUserEntry.rank}
                      </span>
                      <span className="min-w-0 truncate text-sm font-bold text-white">
                        {countryCodeToFlagEmoji(currentUserEntry.countryCode)}{" "}
                        {currentUserEntry.name}
                      </span>
                      <span className="text-sm font-black text-pink-100">
                        {currentUserEntry.score.toLocaleString()} {copy.points}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}
