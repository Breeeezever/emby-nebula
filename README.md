# EmbyNebula

基于 Cloudflare Workers 的 Emby 反代多线路调度面板 —— 为每个媒体库配置独立反代线路、加密模式与访问限制，内置数据大厅、优选 IP、日志中心与 IP 访问控制。

当前版本：**v3.7.4**（基于上游 [MakkaPakka518/ProxyHub_Emby](https://github.com/MakkaPakka518/ProxyHub_Emby) v3.4.6 二次开发，v3.7.x 为本仓库独立演进版本）

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/Breeeezever/EmbyNebula)

> 一键部署：点击按钮 → 授权 GitHub → 选择本仓库 → Cloudflare 自动读取 `wrangler.toml` 构建部署。
> 部署完成后必须补齐绑定与变量（见下方「首次配置」），否则面板无法登录。

## 功能特性（主要功能由上游仓库提出构建，本仓库仅做适配优化）

- **反代全模式**：每媒体库独立线路，多节点故障转移、半开熔断、SSRF 校验
- **IP 访问控制**：白/黑名单、CIDR 网段、国家码、302 跳转，管理员 `/entry` 逃生入口
- **IP 默认脱敏**：面板内所有 IPv4/IPv6（访客 IP、优选 IP、DNS 解析）默认打码，顶栏「眼睛」按钮一键切换
- **播放器一键导入**：Senplayer / Rexus / Hills 深链导入
- **数据大厅**：3D 地球仪拓扑、24h/7d 流量统计、状态码与节点流量双保险持久化
- **优选 IP / 测速 / DNS**：内置测速页、优选 IP 历史缓存池、DNS 解析展示
- **日志中心**：18 类 Emby 行为识别、观看下限通知、TG Bot 播报
- **登录安全**：PBKDF2 密码哈希、HMAC 会话签名、恒时比较、登录限速、CSRF Origin 校验

## 仓库结构

```
worker.js                            Assets 版后端（261KB，路线 B）
public/login.html                    Assets 版登录页
public/app.html                      Assets 版面板页
public/speedtest.html                Assets 版测速页
wrangler.toml                        Assets 版部署配置
singlefile/worker-singlefile.js      单文件版（575KB，路线 A，Dashboard 直接粘贴）
tools/build.mjs                      从单文件版一键重新生成 Assets 版的构建脚本
.dev.vars.example                    本地开发变量模板
```

## 路线 A：Dashboard 粘贴（零门槛）

1. 打开 `singlefile/worker-singlefile.js` → Raw → 全选复制
2. Cloudflare Dashboard → Workers & Pages → Create → Worker → 粘贴全部代码 → Deploy
3. Settings → Bindings：绑定 D1 数据库，变量名必须是 `DB`
4. Settings → Variables：添加 `ADMIN_TOKEN`（Secret）、`CF_API_TOKEN`、`CF_ZONE_ID`、`CF_ACCOUNT_ID`、`CF_WORKER_NAME`、`CF_DOMAIN` 等变量
5. Settings → Triggers：添加定时任务（Cron，如 `0 3 * * *`）
6. Domains & Routes：绑定自己的域名

后续升级：面板内置「一键更新」（/api/deploy），或再次粘贴新版全文。

## 路线 B：GitHub 自动部署 / 一键部署（Assets 版）

1. Fork / 上传本仓库到 GitHub，或直接用上方一键部署按钮（先把按钮链接中的占位符替换为实际仓库地址）
2. Dashboard → Workers & Pages → Create → Import a repository，授权连接 GitHub
3. Cloudflare 读取 `wrangler.toml` 自动构建；push 即自动重新部署
4. Cron 已在 `wrangler.toml` 声明，无需手动添加

> 路线 B 与路线 A 可共用同一个 D1 数据库，切换部署方式不丢数据。

## 首次配置（两路线通用）

| 配置项 | 方式 |
|---|---|
| D1 数据库 | 绑定变量名必须是 `DB` |
| `ADMIN_TOKEN` | `npx wrangler secret put ADMIN_TOKEN` 或 Dashboard 加密变量 |
| `CF_API_TOKEN` / `CF_ZONE_ID` / `CF_ACCOUNT_ID` | Dashboard 变量，用于优选 IP 等功能 |
| `TG_BOT_TOKEN` / `TG_CHAT_ID` | 可选，TG 播报用 |
| `CF_WORKER_NAME` / `CF_DOMAIN` | 可选，面板展示用 |

## 本地开发

```bash
cp .dev.vars.example .dev.vars   # 填入本地测试变量
npx wrangler dev                 # 本地启动，自动加载 public/ 静态资产
node tools/build.mjs             # 修改单文件版后重新生成 Assets 版
```
## 致谢与许可

- 上游项目：[MakkaPakka518/ProxyHub_Emby](https://github.com/MakkaPakka518/ProxyHub_Emby)（v3.4.x ~ v3.6.x 基础能力）
- 图标：Waves by DiceBear（CC0 1.0）；面板图标运行时转换，无外部依赖
