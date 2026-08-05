# 三照系统

施工影像台账：现场用手机拍 **施工前 / 施工过程中 / 施工后** 三张照片，关联项目名称、施工位置（桩号）、施工内容、施工日期，上传后网页端随时汇总查看。

## 架构

```
手机/电脑浏览器 ──> Cloudflare Pages（同一域名）
                     ├─ 静态页面  React 19 + Vite（web/）
                     ├─ API       Pages Functions / Hono（web/functions/）
                     ├─ 照片      R2 对象存储（免费 10GB）
                     └─ 台账      D1 数据库（免费 5GB）
```

全部使用 Cloudflare 免费额度，无需服务器、无需域名备案。

## 目录结构

```
web/
  src/          前端页面（列表汇总 / 新建记录 / 三照详情）
  functions/    API（Hono，同域名部署）
  wrangler.toml Pages 配置（D1 + R2 绑定）
  schema.sql    数据库表结构
```

## 本地开发

```bash
cd web
npm install
npm run build        # 首次需构建 dist 供 pages dev 使用
npm run dev:api      # 终端 1：本地 API（localhost:8788，D1/R2 本地模拟）
npm run dev          # 终端 2：Vite 热更新（localhost:5173，代理 /api → 8788）
```

本地首次启动前初始化数据库表：

```bash
cd web
npx wrangler d1 execute three-photos-db --local --file=schema.sql
```

## 部署（首次，一次性）

需要 Cloudflare 账号：

```bash
cd web
npx wrangler login                                     # 浏览器授权登录
npx wrangler d1 create three-photos-db                 # 建数据库，把输出的 database_id 填入 wrangler.toml
npx wrangler r2 bucket create three-photos             # 建照片存储桶
npm run db:init                                        # 建表
npm run deploy                                         # 构建 + 部署
```

之后每次更新：

```bash
npm run deploy
```

## 线上访问

- 生产地址：**https://three.halunhaku.top**（Cloudflare Pages + 自定义域名）
- Pages 默认域名：https://three-photos.pages.dev（作为回退）

## 自动部署（GitHub Actions）

仓库 `halunhaku/three-photos`，push 到 `main` 分支自动构建并部署到 Cloudflare Pages：

```bash
git add -A && git commit -m "..." && git push
```

Workflow 文件：`.github/workflows/deploy.yml`，需要两个仓库 Secrets：

| Secret | 值 |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API Token（权限：Account → Cloudflare Pages → Edit） |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare 账户 ID |

也可以手动触发：仓库 Actions → Deploy to Cloudflare Pages → Run workflow。

## API

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/records` | 新建台账（项目/位置/内容/日期） |
| GET | `/api/records?project=&location=&from=&to=` | 列表/筛选 |
| GET | `/api/records/:id` | 详情 |
| DELETE | `/api/records/:id` | 删除（连带照片） |
| POST | `/api/records/:id/photos` | 上传照片（multipart：`phase`=before/during/after + `file`，每阶段不限张数） |
| GET | `/api/photos/:photoId` | 读取照片 |
| DELETE | `/api/photos/:photoId` | 删除单张照片 |

## 数据模型

- **records**：一条施工台账 = 项目名称 + 施工位置（高速公路 → 路段 → 桩号 → 方向 上行/下行）+ 施工内容 + 施工日期
- **photos**：每台账三个阶段（before / during / after），**每阶段不限张数**，前端选好照片后点"统一上传"按钮批量提交，也可单张删除

## 后续规划

- 与 RoadZone Control（高速公路作业区布置系统）打通，按项目名称 + 桩号关联
- 访问控制（简单口令 / 登录）
- 照片 GPS、时间水印
- 微信小程序端（届时需域名备案）
