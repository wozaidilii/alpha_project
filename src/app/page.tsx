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
    myRank: string;
    points: string;
    loading: string;
  }
> = {
  zh: {
    lang: "中文",
    kicker: "二次元街景猜谜",
    title: "AniGuessr",
    subtitle: "看现实街景，凭左上角动漫线索猜出取景地。",
    start: "开始猜动漫",
    continue: "进入当前玩法",
    battle: "对战模式",
    login: "登录",
    logout: "退出登录",
    clue: "动漫截图线索",
    street: "现实街景观察",
    map: "日本地图猜点",
    round: "5 轮挑战",
    panelTitle: "现实与番剧重叠的瞬间",
    panelBody:
      "主画面保持真实街景，动漫图案只作为线索出现。当前地图锚定日本；可走动街景会作为后续玩法扩展。",
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
    myRank: "我的排名",
    points: "分",
    loading: "加载中...",
  },
  ja: {
    lang: "日本語",
    kicker: "アニメ聖地ストリートビュー",
    title: "AniGuessr",
    subtitle: "現実の街並みを見て、左上のアニメ手がかりから場所を当てよう。",
    start: "プレイ開始",
    continue: "ゲームへ",
    battle: "対戦モード",
    login: "ログイン",
    logout: "ログアウト",
    clue: "アニメ画像ヒント",
    street: "現実のストリートビュー",
    map: "日本地図で推理",
    round: "5 ラウンド",
    panelTitle: "現実と物語が重なる場所",
    panelBody:
      "メイン画面はあくまで実写の街景。アニメ画像はヒントとして表示され、現在の地図は日本に固定されています。",
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
    myRank: "自分の順位",
    points: "点",
    loading: "読み込み中...",
  },
  en: {
    lang: "English",
    kicker: "Anime street-view mystery",
    title: "AniGuessr",
    subtitle:
      "Read the anime clue, scan the real street view, and pin the filming spot.",
    start: "Start Anime Guessr",
    continue: "Open game",
    battle: "Battle mode",
    login: "Log in",
    logout: "Log out",
    clue: "Anime clue image",
    street: "Real street view",
    map: "Japan map guess",
    round: "5 rounds",
    panelTitle: "Where frames meet the real world",
    panelBody:
      "The main scene stays as real-world Street View. Anime artwork appears only as the clue, and the current map is anchored to Japan.",
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
    myRank: "My rank",
    points: "pts",
    loading: "Loading...",
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
  const [session, setSession] = useState<PlayerSession | null>(null);
  const [profileName, setProfileName] = useState("");
  const [profileCountryCode, setProfileCountryCode] = useState("");
  const [profileMessage, setProfileMessage] = useState("");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const copy = COPY[locale];
  const playUrl = withAnimeLocale("/game/anime", locale);
  const loginUrl = `/login?next=${encodeURIComponent(playUrl)}`;
  const battleUrl = session
    ? "/battle"
    : `/login?next=${encodeURIComponent("/battle")}`;
  const meQuery = api.player.me.useQuery(
    { token: session?.token ?? "" },
    { enabled: Boolean(session?.token), retry: false },
  );
  const leaderboardQuery = api.player.leaderboard.useQuery(
    { token: session?.token, limit: 8 },
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
    <main className="anime-shell min-h-screen overflow-hidden text-white">
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
                          className="grid grid-cols-6 gap-2"
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

        <div className="mx-auto grid min-h-[calc(100vh-92px)] w-full max-w-6xl items-center gap-8 py-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="max-w-2xl">
            <div className="anime-chip mb-5 w-fit">{copy.kicker}</div>
            <h1 className="text-[clamp(3.25rem,8vw,7rem)] leading-[0.86] font-black text-white">
              {copy.title}
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-pink-50/80 sm:text-xl">
              {copy.subtitle}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={playUrl}
                onClick={() =>
                  capturePostHogEvent(POSTHOG_EVENTS.homeStartClicked, {
                    locale,
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

            <div className="mt-9 grid max-w-xl gap-3 sm:grid-cols-3">
              {[copy.clue, copy.street, copy.map].map((item, index) => (
                <div key={item} className="anime-stat">
                  <div className="text-xs font-black text-cyan-200">
                    0{index + 1}
                  </div>
                  <div className="mt-2 text-sm font-bold text-white">
                    {item}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4">
            <div className="relative min-h-[360px] lg:min-h-[430px]">
              <div className="absolute top-2 right-2 left-10 h-[74%] overflow-hidden rounded-2xl border border-white/10 bg-black/30">
                <div className="h-full w-full bg-[url('/images/anime-placeholder.jpg')] bg-cover bg-center" />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.04),rgba(8,5,16,0.76))]" />
              </div>

              <div className="anime-panel absolute right-0 bottom-6 left-0 p-5 sm:p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="anime-chip mb-3 w-fit">{copy.round}</div>
                    <h2 className="text-2xl font-black text-white sm:text-3xl">
                      {copy.panelTitle}
                    </h2>
                  </div>
                  <div className="grid h-16 w-16 place-items-center rounded-full border border-cyan-200/40 bg-cyan-200/10 text-xl font-black text-cyan-100">
                    S
                  </div>
                </div>
                <p className="mt-4 text-sm leading-7 text-white/70">
                  {copy.panelBody}
                </p>
              </div>
            </div>

            <div>
              <section className="anime-panel p-4">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-black text-white">
                    {copy.leaderboardTitle}
                  </h2>
                  <span className="text-xs font-bold text-cyan-100/70">
                    Top 8
                  </span>
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
                          {countryCodeToFlagEmoji(entry.countryCode)}{" "}
                          {entry.name}
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
                          {currentUserEntry.score.toLocaleString()}{" "}
                          {copy.points}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
