# 国外模式日本谷歌地图

## Goal

新增一个“国外模式”的最小可用版本，先支持选择国家中的“日本”，并实现 Google Street View 图寻回合：玩家观察日本街景，在 Google 地图上猜测位置，地图视野和可点击范围限制在日本。

## What I Already Know

- 用户要求新建分支，已创建并切换到 `codex/foreign-mode-japan-map`。
- 用户要求新建国外模式、允许选择国家、先新建日本地图、地图改成 Google Maps API、范围限定到日本。
- 当前项目是 Next.js / React 应用，个人模式入口在 `src/app/game/solo/page.tsx`，游戏模式配置在 `src/lib/game-mode.ts`。
- 当前普通历史地理地图使用 Leaflet + 中国范围，相关文件是 `src/lib/china-map.ts`、`src/lib/china-leaflet.ts`、`src/app/game/_components/GameMap.tsx`。
- 当前图寻 / 历史图寻交互猜点地图使用百度地图，入口是 `FloatingGuessMap -> BaiduGuessMap`。
- 用户已选择 MVP 范围 2：做成 Google Street View 图寻，而不是只有日本 Google 猜点地图。
- 当前普通图寻生成器 `generateRandomTuxunLocations` 的契约是：随机候选点 -> 第三方全景服务确认可用 -> 凑够整局轮数才开始，不用非街景 fallback 凑数。
- `.trellis/spec/lessons.md` 已记录第三方地图脚本加载成功不等于服务可用，以及交互地图同步 marker 不应重置用户视角。
- 用户已在本地环境中加入 `NEXT_PUBLIC_GOOGLE_MAP_AK`，实现应沿用这个变量名。

## Assumptions

- “国外模式”先做个人模式入口；用户后续要求加入对战模式，所以对战模式也纳入当前任务范围。
- “允许选择国家”先提供国家选择控件与数据结构；MVP 只有日本一个可选项，后续可追加国家。
- “新建一个日本地图”指新增日本国家配置、Google Street View 展示和 Google Maps 猜点/结果地图，不替换现有中国模式地图。
- “范围限定到日本”要求初始化视野、拖拽边界、点击结果都限制在日本 bounds 内。

## Requirements

- 在个人模式中新增一个国外模式入口。
- 国外模式页面提供国家选择，首个国家为日本。
- 日本街景和猜点地图使用 Google Maps JavaScript API，而不是百度地图或 Leaflet。
- 日本街景回合必须先通过 Google Street View 服务确认点位可用，凑够整局轮数才进入游戏。
- 日本猜点地图初始化在日本中心视野，并限制拖拽/缩放范围到日本。
- 玩家点击猜点地图时只产生日本范围内的坐标。
- 结果页展示实际地点、玩家猜测、偏差距离和得分。
- Google Maps API key 缺失或加载失败时，页面显示清晰错误，不崩溃。
- Google Maps API key 使用 `NEXT_PUBLIC_GOOGLE_MAP_AK`。
- 保留现有中国历史地理、图寻、历史图寻和对战模式行为。
- 对战模式可选择国外模式，并复用日本 Google Street View 点位生成与猜点/结果地图体验。
- 对战房主点击开始后，所有已加入玩家都应可靠进入游戏，不应只有房主进入。
- 房主点击开始游戏不应因为前端逐个生成第三方街景点而长时间阻塞；多人应共享同一套已生成题目。
- 房间内所有玩家退出后，应关闭/清理该对战 session，避免留下无人房间。

## Scope Update: 猜动漫模式题库接入

- 用户补充提供 `deepseek_anitabi_points.json`，要求把题目接入“猜动漫模式”。
- 动漫题目是 Anitabi/DeepSeek 生成的巡礼点数据，包含动漫作品、场景描述、年份、经纬度、真实地点、Anitabi 来源和后续配图路径。
- 猜动漫模式应作为独立个人模式入口，主画面仍是现实 Google Street View；左上角线索卡展示动漫图片/文字线索，并复用日本 Google Maps 猜点地图。
- 题目配图后续会上传到对象存储；客户端只保存相对图片路径，图片公网前缀通过 `NEXT_PUBLIC_ANIME_GUESSR_IMAGE_BASE_URL` 配置。
- 当前提供的 `https://catalog.cloudflarestorage.com/f07028ad4bec2b967e1636a74d77247d/anime-gussr` 以及按首图拼出的对象 URL 均返回 `HTTP/2 401 Missing Authorization header`，不能作为浏览器直连图片前缀。
- 已通过 Wrangler 登录 Cloudflare 账号 `f07028ad4bec2b967e1636a74d77247d`，确认 R2 bucket `anime-gussr` 存在并开启公开 `r2.dev` URL：`https://pub-fb0cf55dbd0b4c4cb42bf8312f34dbd4.r2.dev`。`NEXT_PUBLIC_ANIME_GUESSR_IMAGE_BASE_URL` 应使用该公网前缀，或后续替换为正式自定义域名。
- 本地已将用户提供的截图复制为 `public/images/anime-placeholder.jpg`，动漫模式在图片公网前缀缺失或题图加载失败时使用该占位图。
- 已将占位图上传到 R2：`npx wrangler r2 object put anime-gussr/anime-placeholder.jpg --file public/images/anime-placeholder.jpg --remote`。后续题图上传命令沉淀为 `npm run images:upload-anime -- <local-file> <object-key>`。

## Scope Update: 单一动漫模式与全球猜点

- 用户要求项目入口只保留“猜动漫模式”；`/` 作为三语首页，`/game`、`/game/solo`、`/battle` 都应导向 `/game/anime`。
- 首页需要提供中文、日文、英文三语切换，并把产品视觉统一为二次元猜谜游戏，而不是历史地图/多模式大厅。
- 猜动漫模式仍然以现实 Google Street View 为主画面，左上角只展示动漫图案和文字线索。
- 猜点地图不再限制日本：动漫题库 guard 只校验全球经纬度合法范围，Google 猜点地图在该模式下不设置日本 `restriction`，初始视野使用世界地图。
- 旧模式代码可暂时保留以便回滚，但普通用户入口不再展示或引导进入旧模式。

## Acceptance Criteria

- [ ] `/game/solo` 展示新的国外模式入口。
- [ ] 国外模式页面能选择国家，当前至少有“日本”。
- [ ] 日本模式能随机生成一整局可用 Google Street View 点位，失败时给出重试提示。
- [ ] 日本街景成功加载时使用 Google Street View。
- [ ] 日本猜点/结果地图成功加载时使用 Google Maps 底图。
- [ ] 猜点地图不能拖出日本范围，点击范围外不会产生越界坐标。
- [ ] 提交猜测后能看到结果地图、距离和本轮得分。
- [ ] 未配置 Google Maps key 时显示配置提示。
- [ ] 现有中国地图、百度图寻和历史图寻不被破坏。
- [ ] 对战模式可以选择并开始国外模式，日本题目对所有房间玩家一致。
- [ ] 两名玩家加入房间后，房主点击开始，双方都进入同一局游戏。
- [ ] 所有玩家离开房间后，房间 session 被清理或关闭。
- [ ] `/` 展示新的 AniGuessr 首页，并提供中文、日文、英文切换。
- [ ] `/game`、`/game/solo`、`/battle` 都导向 `/game/anime`，普通入口只保留猜动漫模式。
- [ ] `/game/anime` 能加载转换后的动漫巡礼题库并随机抽取整局题目。
- [ ] `/game/anime` 主画面展示题目对应现实 Google Street View，而不是把动漫图片作为主画面。
- [ ] 动漫线索图片展示在左上角线索卡中，用于辅助判断现实街景对应的作品/场景。
- [ ] 动漫题目答案只要求经纬度在全球合法范围内，玩家可以在不限制日本的 Google Maps 上猜点并查看偏差和得分。
- [ ] 未配置或无法访问图片公网前缀时，动漫题卡显示占位状态且游戏仍可进行。
- [ ] 动漫题库转换脚本从原始大 JSON 生成精简 public JSON，不把 100MB 级原始抓取数据打进客户端 bundle。
- [ ] TypeScript、lint、相关测试通过。

## Definition of Done

- Tests added or updated where practical for country bounds/config logic.
- `npm run check` passes.
- Focused tests for map bounds/config pass if added.
- Browser smoke check verifies country selector, Japan Google key fallback/loading state, and existing solo mode entry still renders.
- Rollback is limited to the new branch changes.

## Technical Approach

- Add a country map config module rather than hard-coding Japan across components.
- Add Google Maps client loader and typed wrapper following the existing Baidu integration style.
- Add Google Street View lookup/generator utilities that mirror the existing Baidu Tuxun generation contract.
- Add dedicated Google Street View, Google guess map, and Google result map components, then wire them into a new foreign-mode page.
- Extend the battle flow after the solo implementation: generate shared foreign-mode locations at start time, persist them in room state, and ensure clients react to the shared game-start state instead of local-only transitions.

## Decision (ADR-lite)

**Context**: A foreign-mode MVP could be just a Japan map, or a full Street View guessing game. The user chose the full Google Street View 图寻 direction.

**Decision**: Implement Japan as the first country in a reusable foreign-mode country catalog, with Google Street View for scene display and Google Maps for guess/result maps.

**Consequences**: This is a larger first slice than a static map because it needs Google API loading, Street View availability checks, failure states, result rendering, and now a shared battle-room start contract. It preserves the right gameplay contract and keeps the country-selection model ready for more countries.

## Research References

- [`research/google-maps-japan-mode.md`](research/google-maps-japan-mode.md) - Google Maps JS API loading, bounds restriction, and Street View availability constraints.

## Out of Scope

- Additional countries beyond Japan.
- Replacing existing China / Baidu map modes.
- Full international question bank or import pipeline.
- Additional battle-room matchmaking or persistence features beyond reliable start, shared locations, and empty-room cleanup.
