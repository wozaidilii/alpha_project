## 百度全景检索异常需要降级

- 问题：百度地图全景脚本加载后，`PanoramaService` 构造或 `getPanoramaByLocation` 调用仍可能同步抛出第三方脚本内部异常，导致图寻随机点位生成直接失败。
- 根因：代码只处理了脚本加载失败和异步超时，没有把全景服务构造、调用和单个候选点查询都视为不可信边界。
- 修复：在全景服务构造和调用外层增加 `try/catch`，单个候选点查询失败时返回 `null`，让既有备用点位降级逻辑继续生效。
- 预防：接入第三方地图或全景 API 时，脚本加载成功不等于服务可用；每个服务入口都要能失败并回落到本地可用体验。

## 远程数据库迁移需要先确认目标环境

- 问题：代码验证阶段需要执行 `npm run db:migrate`，但当前 `DATABASE_URL` 指向远程 Neon 数据库，提权重试被安全策略拒绝。
- 根因：迁移命令会直接修改远程数据库状态，未先确认该库是否为可写入的开发环境。
- 修复：本次停止执行远程迁移，只保留代码和 schema 变更，并在交付说明中标记迁移验证未完成。
- 预防：涉及数据库 schema 的任务，执行迁移前先确认 `DATABASE_URL` 指向本地或明确授权的开发数据库；远程共享库迁移需要用户显式确认。

## 微信小程序 TypeScript 页面需要启用编译插件

- 问题：微信开发者工具编译 `app.json` 时提示 `pages/index/index.js` 不存在，无法识别同名 `.ts` 页面文件。
- 根因：`miniprogram/project.config.json` 中 `setting.useCompilerPlugins` 被开发者工具写成 `false`，且部分开发者工具版本会在 `app.json` 页面校验阶段先寻找实体 `.js` 文件。
- 修复：为 `app.ts` 与页面 `.ts` 补齐等价 `.js` 运行入口，确保开发者工具无需等待 TS 插件也能通过页面文件校验。
- 预防：新增原生微信小程序工程时，如果开发者工具提示缺少 `pages/**.js`，优先补齐 `.js` 运行入口；`project.private.config.json` 属于本地 IDE 配置，应加入忽略列表。

## 微信小程序真机预览不能依赖 localhost

- 问题：小程序在其他 device 上打开时报 `request fail url not in domain list`，即使开发者工具本机已关闭合法域名校验。
- 根因：真机预览无法访问开发电脑的 `localhost`，且微信 request 需要 HTTPS 合法域名；本地 Next API 只适合开发者工具模拟器调试。
- 修复：本地演示模式默认关闭登录和后端请求，内置少量题目并用本机缓存保存最高分，确保任何 device 都能先跑通单人答题。
- 预防：小程序 MVP 在正式 HTTPS 域名配置完成前，不要把启动路径依赖后端登录或 localhost API；远程模式应通过显式开关启用。

## Next 页面浏览器验证不要只依赖 Turbopack dev

- 问题：`next dev --turbo` 在浏览器验证 `/game/history-tuxun` 时出现 Turbopack panic 并返回 500，但 `next build` 和非 Turbopack `next dev` 都能正常编译页面。
- 根因：Turbopack dev 的 endpoint 写入或增量编译路径可能出现工具链级 panic，不能直接等同于页面代码错误。
- 修复：保留 `next build` 作为生产编译验证；浏览器验证遇到 Turbopack panic 时，停掉 turbo dev，改用普通 `next dev` 复核页面行为。
- 预防：前端页面验证报告中区分“生产构建失败”和“Turbopack dev 工具链失败”；只有两者都失败或错误指向源码时才按代码缺陷处理。

## Demo 构建不要依赖隐藏功能的环境变量

- 问题：历史寻图 demo 已隐藏登录、对战和模式选择入口，但 `next build` 仍因缺少 `NEXT_PUBLIC_PUSHER_KEY` / `NEXT_PUBLIC_PUSHER_CLUSTER` 在加载 `next.config.js` 阶段失败。
- 根因：全局 env schema 把 Pusher 配置设为构建期必填，即使当前 demo 入口不会加载对战模式，也会在配置校验阶段阻断部署。
- 修复：将 Pusher env 改为可选，并在 Pusher client/server 实际运行时做局部校验和清晰失败。
- 预防：临时 demo 或灰度入口隐藏某个功能时，该功能的第三方密钥不应保持全局构建必填；改成运行到对应功能边界时校验。

## 第三方地图 Overlay 类型不要用空接口

- 问题：为百度地图 Marker / Polyline 抽象共享 Overlay 类型时使用了空 `interface`，`next lint` 触发 `@typescript-eslint/no-empty-object-type` 并阻断验证。
- 根因：空接口在 TypeScript 中等价于允许任意非 nullish 值，不能准确表达“第三方 SDK 返回的不透明对象”。
- 修复：将共享 Overlay 类型改成 `object` 类型别名，具体 Marker 继续保留实际使用到的可选方法。
- 预防：为第三方 SDK 建模时，如果代码不读取对象成员，用 `object` / `unknown` 等不透明类型；只有真实访问成员时才声明接口。

## Next dev 与 build 不要并发写 .next

- 问题：浏览器 smoke test 的 `next dev --turbo` 仍在运行时并行执行 `next build` / `tsc --noEmit`，dev server 输出 `.next/server/app/.../app-paths-manifest.json` 和 `_buildManifest.js.tmp.*` 缺失，单独 `tsc` 也读到 `.next/types` 临时缺失文件。
- 根因：Next dev、build 和项目 tsconfig 都会读写或引用 `.next` 目录，并发执行会制造工具链临时文件竞争，容易被误判为源码错误。
- 修复：停止 dev server 后重新执行 `next build` 和 `tsc --noEmit`，验证通过。
- 预防：涉及 Next 项目的最终验证前先停掉本地 dev server；不要把 `next build`、`next dev` 和依赖 `.next/types` 的 `tsc --noEmit` 并发运行。

## 街景题必须先确认全景再进入游戏

- 问题：历史寻图模式先随机出题并进入页面，再由全景组件尝试加载百度街景；无街景点会落到静态图或底图 fallback，玩家实际看到的是不可作答的非街景题。
- 根因：第三方全景可用性判断放在渲染阶段，题目选择阶段没有把“可用街景点”作为进入游戏的前置条件。
- 修复：题目加载后先在答案附近随机候选点并用 `PanoramaService` 确认可用全景，命中后才创建 play state；找不到则自动换题继续匹配。
- 预防：所有街景类玩法都应把“存在可用街景/全景 ID 或坐标”作为题目生成契约，UI 层只负责渲染已验证资源，不负责把无街景题降级给玩家。

## 图寻模式不能混入非街景 fallback

- 问题：普通图寻随机生成百度全景点不足时，会把本地备用点位补进同一局，再由 UI 降级到静态图或基础底图，破坏“街景猜点”的玩法契约。
- 根因：点位生成器把“凑够轮次数”放在“每轮都有可用街景”之前，页面也没有过滤 `source`，显示层仍承担 fallback 展示职责。
- 修复：普通图寻只接受 `source: "baidu-random"` 的点位；随机生成不足一整局时直接报错重试；展示组件统一使用百度 JS 全景，不再提供静态图/底图降级。
- 预防：街景玩法的生成层、页面层和渲染层都要保持同一契约：生成层只返回可用街景点，页面层过滤非街景来源，渲染层失败只跳过或报错，不展示非街景替代物。

## Pusher presence 事件要过滤本客户端回声

- 问题：对战房主在大厅收到自己发出的 `player-joined` 事件后继续广播房间设置并再次 announce presence，形成持续的 `/api/pusher/trigger` 请求循环。
- 根因：事件处理只在 `upsertPlayer` 内部忽略了当前玩家，但后续房主广播逻辑仍会执行；第三方实时通道可能把客户端触发的事件回送给同一页面。
- 修复：在 `player-joined` 事件入口先判断 `data.playerId === myId.current` 并直接返回，再处理其他玩家加入后的同步。
- 预防：Pusher / WebSocket 这类 presence 或广播事件处理器必须在入口层过滤本客户端回声；不要只在局部 state 更新函数里过滤，否则副作用仍可能重复触发。

## 交互地图同步 marker 不要重置用户视角

- 问题：右下角百度答题地图选点后，玩家手动放大到街道级时会被反复弹回默认比例尺，无法查看街道细节。
- 根因：父组件计时器和 hover 状态会让浮动地图重渲染并新建 `guess` 对象，`BaiduGuessMap` 的 marker 同步 effect 随后对单个猜测点执行 `centerAndZoom(..., 7)`，覆盖了用户手动 zoom。
- 修复：在 `FloatingGuessMap` 中 memoize `guess` 引用；答题阶段只有猜测点、没有答案点时只同步 marker，不再自动 center/zoom，也不绘制会遮挡街道的大范围圆形覆盖物。
- 预防：第三方地图组件的 overlay 同步应和 viewport 同步分离；只有初始化、结果页 fit bounds 或明确用户动作才允许改变 center/zoom，普通 props 重渲染不能覆盖用户视角。

## 服务端模块测试需要 mock server-only

- 问题：为 `src/server/data/*` 增加 Vitest 单元测试时，导入带有 `import "server-only"` 的模块会在测试环境直接抛错，导致测试套件 0 tests 失败。
- 根因：`server-only` 是 Next 的运行边界 marker 包，不是普通业务依赖；Vitest 直接导入服务端模块时不会自动按 Next Server Component 语义处理它。
- 修复：在对应测试文件顶部使用 `vi.mock("server-only", () => ({}))`，只在测试环境替换 marker 包，保留生产代码的服务端边界。
- 预防：后续给服务端 data/store 模块补测试时，先检查模块是否导入 `server-only`；如果有，测试入口要显式 mock marker 包，避免把框架边界误判成业务失败。

## 街景组件生命周期不要依赖易变回调

- 问题：对战模式进入国外街景回合后，双方画面会随着倒计时和状态重渲染不断刷新、重置视角。
- 根因：`GoogleStreetView` 创建/销毁第三方 `StreetViewPanorama` 的 effect 依赖了父组件传入的内联 `onUnavailable` 回调；对战页频繁重渲染会生成新函数引用，触发 cleanup 并重建街景实例。
- 修复：将最新 `onUnavailable` 保存到 ref，街景实例 effect 只依赖 `lat`、`lng`、`panoId`、`heading`、`pitch` 等真实场景参数。
- 预防：第三方地图、全景、播放器等昂贵实例的生命周期 effect 不应依赖每次 render 都可能变化的回调或对象 props；回调用 ref 保鲜，实例只在实际资源参数变化时重建。

## 生成题库要复用前端运行时 guard

- 问题：动漫巡礼题库转换后，浏览器页面提示“动漫题库格式不正确”，导致模式无法进入游戏。
- 根因：转换脚本只按坐标、图片和置信度过滤源 JSON，没有把 `location` 等 nullable 字段归一成前端 `isAnimeGuessrQuestion` guard 要求的形状；单元测试只覆盖了手写样例，未校验生成产物。
- 修复：转换时将缺失地区归一为 `subject_city` 或“日本”，并要求 id、标题、描述、年份等基础字段完整；重新生成 public JSON 后用字段检查确认 4909 条均合法。
- 预防：所有由外部大 JSON 生成的前端 public 数据，都要在生成后用同一套前端 guard 或等价 schema 校验完整产物，不只校验少量样例。

## 线索媒介不能替换街景核心玩法

- 问题：猜动漫模式初版把动漫题图作为主画面展示，只把 Google 地图作为猜点地图，偏离了“现实街景为主、动漫图只是线索”的玩法。
- 根因：实现时把“题目会有配图”理解成主视觉，而没有回到图寻/GeoGuessr 类模式的核心契约：玩家主要观察现实街景，再结合线索判断地点。
- 修复：`/game/anime` 主区域改为复用 `GoogleStreetView`，把动漫图和文字收进左上角线索卡，猜点和结果地图继续复用 Google Maps。
- 预防：以后新增带图片、文字、视频等线索的街景模式时，先判定核心观察媒介；如果模式是 street-view-first，任何额外素材都只能作为 overlay clue，不能替代主 panorama viewport。

## 全仓库格式检查失败时不要扩大无关 diff

- 问题：账号登录改动后补跑 `npm run format:check`，检查失败列出 11 个既有未格式化文件，但这些文件均不属于本次改动。
- 根因：项目 `format:check` 扫全仓库 TS/TSX/JS/MDX，历史格式漂移会让一次局部任务的验证结果变红；若直接运行全仓库 `format:write` 会引入大量无关 diff。
- 修复：仅对本次触达文件运行 Prettier，并继续以 `npm run check`、`npm test`、`npm run build` 和浏览器烟测作为本次功能验证依据。
- 预防：局部任务收尾时先格式化触达文件；若全仓库 `format:check` 因无关文件失败，在最终说明中标注失败文件属于既有漂移，不为通过格式检查而重排无关模块。

## 未配置邮件服务时不要把验证码作为默认登录

- 问题：生产或远端环境未配置 `RESEND_API_KEY` / `EMAIL_FROM` / `EMAIL_VERIFICATION_SECRET` 时，用户点击默认登录页的“发送验证码”会看到“邮箱登录服务未配置”，无法进入游戏。
- 根因：登录页把邮箱验证码作为默认入口，但验证码流依赖邮件服务；密码账号已经存在时，普通登录不应依赖邮件发送。
- 修复：将默认登录改为邮箱或用户名 + 密码；邮箱验证码仅保留在独立的忘记密码流程中，服务端支持用户名唯一索引和按邮箱/用户名查找密码账号。
- 预防：任何需要第三方邮件、短信或外部服务的认证流程都不能作为唯一默认登录路径；默认登录必须能在账号密码已设置时不触发外部验证码服务。

## 邮箱验证码旧账号需要密码迁移路径

- 问题：用户曾经通过邮箱验证码创建了 `players.email` 账号但没有 `password_hash`，改成密码登录后注册同一邮箱会被“邮箱已注册”卡住，重置密码也不会发送验证码。
- 根因：注册逻辑把任何已有 email 都视为密码账号；重置逻辑只查询 `password_hash is not null` 的账号，旧验证码账号既不能注册密码，也不能重置密码。
- 修复：注册时允许 `password_hash = null` 的同邮箱旧账号补设唯一用户名和密码；重置密码对任何已有 email 账号发送验证码并设置新 `password_hash`。
- 预防：认证方式迁移时要为旧账号建立显式升级路径；不能只按新 schema 的完整账号判断注册、登录和重置流程。

## 防枚举假成功不能绕过配置检查

- 问题：重置密码为了避免暴露邮箱是否存在，对未知邮箱返回通用成功，但这会在生产邮件配置缺失时显示“验证码会发送”，实际没有任何邮件。
- 根因：配置校验只发生在生成并发送真实验证码的分支；未知邮箱的假成功分支提前返回，绕过了 `RESEND_API_KEY`、`EMAIL_FROM` 和 `EMAIL_VERIFICATION_SECRET` 检查。
- 修复：请求邮箱验证码和重置验证码时，在分支判断前统一校验生产邮件发送配置和验证码密钥。
- 预防：防枚举响应只能隐藏账号存在性，不能隐藏基础设施不可用；所有认证验证码请求都要先通过环境配置 gate，再进入账号存在性分支。
