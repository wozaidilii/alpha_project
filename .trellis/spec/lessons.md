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
