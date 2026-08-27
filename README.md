# 路安施工管理

统一施工管理平台（`construction-hub`，当前版本 `v1.6.0`）。

现场侧管施工位置台账和施工前 / 施工中 / 施工后三阶段照片；作业区侧按高速公路养护作业习惯计算分区、画布置图，并导出 A4 图纸。线上地址：https://project.halunhaku.top

微信小程序客户端已独立到上级目录 `微信小程序/`（原生小程序，单独运行，不依赖本仓库）。

## 实际能做什么

- **项目工作台**：按项目聚合施工记录，显示资料完整度；状态为进行中 / 资料待补充 / 已完成；支持搜索、筛选和最近访问。
- **施工台账**：高速公路 → 路段 → 桩号 → 方向（上行 / 下行）。支持单条新建、编辑，以及 Excel 批量导入。
- **三阶段影像**：每条记录按施工前、施工中、施工后上传照片（各阶段不限张数）。三阶段各至少 1 张才算资料完整。照片上传前会压缩；打包下载时带项目名、桩号、阶段和本地拍摄时间水印。
- **作业区布置图**：按警告区、上游过渡区、缓冲区、作业区、下游过渡区、终止区计算桩号范围。支持路侧或中央分隔带；中央分隔带可勾选双侧占路（上下行 180° 对称布控）。可导出 PNG / JPG / PDF（A4：布置图 + 一览表；双侧占路再拆成上行、下行两张布置图），也可和三照一起打成 ZIP 档案。
- **独立布控区域**：未登录可打开布置图页（`#/layout`）填参、预览、导出，不入库。登录后可保存到 `zones` 表并进入详情。列表页入口码指向公开布置图页。项目台账、三照、已保存布控需登录。
- **标志牌 SVG**：16 张高速公路养护作业区标志，可复制 SVG 源码。
- **施工日历**：按日查看记录；蓝点有记录，绿点当天三照齐全。
- **帮助中心**：使用步骤和常见问题。

正式实施作业区布置前，请按道路等级、设计速度、施工类型和当地现行规范复核。本系统按当前模板计算，不能替代现场规范判断。

## 作业区参数（当前模板）

| 参数 | 约束 |
|---|---|
| 起始桩号 | 如 `K123+800`；上行时起点须覆盖警告区 + 过渡区 + 缓冲区，否则会出现负桩号 |
| 作业区长度 | 10–4000 m；结束桩号由起点 + 长度自动计算 |
| 方向 | 上行 / 下行。上行从高桩号向低桩号延伸，下行反之 |
| 施工位置 | 路侧 / 中央分隔带；双侧占路仅限中央分隔带 |
| 警告区 | 固定 1600 m |
| 上游过渡区 | 120–200 m |
| 缓冲区 | 100–150 m |
| 下游过渡区 / 终止区 | 各至少 30 m |
| 设计速度 | 仅 80 或 100 km/h（对应逐级限速 60→40 或 80→60） |
| 锥桶间距 | 1–4 m |

## 页面（hash 路由）

| 地址 | 页面 |
|---|---|
| `#/` | 项目总览 |
| `#/project/:name` | 项目施工台账 |
| `#/new`、`#/new/:project` | 新建记录 |
| `#/record/:id` | 记录详情（三照 + 布置图） |
| `#/record/:id/edit` | 编辑记录 |
| `#/record/:id/zone` | 编辑该记录的布置图 |
| `#/zones` | 独立布控区域列表（含入口二维码，可下载发群或打印） |
| `#/zones/new`、`#/zones/:id`、`#/zones/:id/edit` | 独立布控的新建 / 详情 / 编辑。详情页含该条布置图二维码 |
| `#/calendar` | 施工日历 |
| `#/signs` | 标志牌 SVG |
| `#/help` | 帮助中心 |

## 技术栈

| 层 | 实现 |
|---|---|
| 前端 | React 19 + Vite 8 + TypeScript，hash 路由 |
| API | Cloudflare Pages Functions（Hono，入口 `functions/api/[[path]].ts`） |
| 数据库 | D1 `three-photos-db`：`records`、`photos`、`zones` |
| 对象存储 | R2 `three-photos`：照片文件 |
| 导出 | SVG 布置图 → PNG / JPG / PDF；Excel 用 `xlsx`；打包用 `jszip` |

## 目录

```text
src/                 React 前端
  pages/             页面
  components/        表单、导入、布置卡片等
  zone/              作业区计算、道路图、A4 导出
  signs.ts           标志牌 SVG 数据
  api.ts             前端 API 客户端
functions/           Cloudflare Pages API
migrations/          D1 增量迁移
  0002_excel_import_fields.sql   施工位置、结束桩号（已并入 schema.sql）
  0003_indexes.sql               查询索引
  0004_zones.sql                 独立布控区域表
tests/               作业区计算与接口校验
public/              静态资源
schema.sql           本地完整表结构（records + photos；zones 见 0004）
wrangler.toml        Cloudflare 项目、D1、R2 绑定
```

## 本地开发

需要两套进程：先构建再起 API（本地模拟 D1 / R2），再起前端（把 `/api` 代理到 8788）。

```bash
npm install
npm run build
npm run dev:api  # API: http://localhost:8788
npm run dev      # Web: http://localhost:5173
```

首次初始化本地数据库（`schema.sql` 不含独立布控表，需再跑 0003、0004）：

```bash
npx wrangler d1 execute three-photos-db --local --file=schema.sql
npx wrangler d1 execute three-photos-db --local --file=migrations/0003_indexes.sql
npx wrangler d1 execute three-photos-db --local --file=migrations/0004_zones.sql
npx wrangler d1 execute three-photos-db --local --file=migrations/0005_users.sql
```

已有本地库若还没有 `work_location` / `end_stake` 列，再执行：

```bash
npm run db:migrate:excel
```

## 验证

```bash
npm run build
npm run lint
npm test
```

## Excel 导入

在项目台账页下载模板或按下列表头填写，单次最多 1000 条。

| 列 | 必填 | 说明 |
|---|---|---|
| 项目名称 | 是 | 也识别「项目」 |
| 道路 | 是 | 也识别「高速公路」「公路名称」 |
| 路段 | 是 | |
| 起始桩号 | 是 | 也识别「作业桩号」「桩号」 |
| 施工日期 | 是 | `YYYY-MM-DD`，也识别 Excel 序列日期 |
| 方向 | 否 | 上行 / 下行（或 up / down） |
| 施工位置 | 否 | |
| 结束桩号 | 否 | |
| 施工内容 | 否 | |

导入只写台账字段，不生成作业区布置参数（`zone_params` 为 `NULL`）。布置图需在记录里单独编辑。

## 部署

```bash
npm run db:migrate:excel:remote
npx wrangler d1 execute three-photos-db --remote --file=migrations/0003_indexes.sql
npx wrangler d1 execute three-photos-db --remote --file=migrations/0004_zones.sql
npx wrangler d1 execute three-photos-db --remote --file=migrations/0005_users.sql
npm run deploy
```

`npm run deploy` 会先 `build`，再把 `dist` 发到 Cloudflare Pages 项目 `construction-hub`。

登录账号在 D1 `users` 表，不开放注册。本地 / 远程都要执行 `migrations/0005_users.sql`，再用内部脚本写入用户名和密码哈希。

Git 集成构建配置：

| 配置项 | 值 |
|---|---|
| Root directory | `/` |
| Install command | `npm ci` |
| Build command | `npm run build` |
| Build output directory | `dist` |

首次从零建 Cloudflare 资源时（已有生产环境可跳过）：

```bash
npx wrangler d1 create three-photos-db   # 把 database_id 填进 wrangler.toml
npx wrangler r2 bucket create three-photos
npx wrangler d1 execute three-photos-db --remote --file=schema.sql
npx wrangler d1 execute three-photos-db --remote --file=migrations/0003_indexes.sql
npx wrangler d1 execute three-photos-db --remote --file=migrations/0004_zones.sql
```
