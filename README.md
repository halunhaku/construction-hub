# 统一施工管理平台

单一项目统一管理：

- 多项目首页与项目施工位置清单
- Excel 批量导入施工位置、桩号和计划信息
- 施工前、施工中、施工后三阶段影像证据
- 高速公路作业区参数计算、SVG 布置图与 A4 PNG/JPG/PDF 导出
- Cloudflare Pages Functions、D1 数据库与 R2 照片存储

## 目录

```text
src/             React 前端
src/zone/        作业区计算、道路图与导出引擎
functions/       Cloudflare Pages API
migrations/      D1 数据库迁移
public/          静态资源
miniprogram/     同一平台的微信小程序客户端（保留）
schema.sql       D1 完整表结构
wrangler.toml    Cloudflare 配置
```

## 本地开发

```bash
npm install
npm run build
npm run dev:api  # API: http://localhost:8788
npm run dev      # Web: http://localhost:5173
```

首次初始化本地数据库：

```bash
npx wrangler d1 execute three-photos-db --local --file=schema.sql
```

## 验证

```bash
npm run build
npm run lint
```

## 部署

```bash
npm run db:migrate:excel:remote
npm run deploy
```

Cloudflare Pages Git 集成应使用仓库根目录：

| 配置项 | 值 |
|---|---|
| Root directory | `/` |
| Install command | `npm ci` |
| Build command | `npm run build` |
| Build output directory | `dist` |

现有生产域名：`https://project.halunhaku.top`

正式实施作业区布置前，请按道路等级、设计速度、施工类型和当地现行规范复核。
