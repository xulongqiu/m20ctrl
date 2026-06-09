# 环境变量与配置说明 (env-notes.md)

> 记录重要的环境变量、配置文件和部署注意事项。
> 不要在此记录实际的密钥值，只记录说明和注意点。

---

## 环境变量说明

| 变量名 | 用途 | 注意事项 |
|--------|------|---------|
| `DATABASE_URL` | 数据库连接 | 本地用 `.env.local`，不要提交到 git |
| `REDIS_URL` | Redis 连接 | **必须带端口号**，例：`redis://localhost:6380` |
| `JWT_SECRET` | JWT 签名密钥 | 生产环境至少 64 位随机字符串 |

---

## 地图管理文件约定

- 上位机页面继续直接打开 `index.html`；8080 端口是后端 WebSocket，不作为 HTTP 页面入口。
- 地图管理选择的目录需要包含 `occ_grid.pgm` + `occ_grid.yaml`（resolution/origin 供导航视图世界坐标投影）；地点数据读写同目录下的 `locations.json`。
- 目录读写依赖 Chromium/Edge 的 File System Access API；如果浏览器不支持，地图文件夹读写不可用。
- 选择文件夹后会把 `FileSystemDirectoryHandle` 缓存到 IndexedDB (`m20ctrl-map-cache`/`handles`/`lastMapFolder`)。刷新页面后 `restoreCachedFolder` 静默尝试；若权限失效会在地图工具栏显示「恢复上次: <名称>」按钮，点击后浏览器才会弹授权（用户手势策略要求）。


## 配置文件说明

| 文件 | 用途 | 备注 |
|------|------|------|
| `.env.local` | 本地开发环境变量 | 不提交 git，从 `.env.example` 复制 |
| `.env.test` | 测试环境变量 | 使用独立的测试数据库 |

---

## 本地开发环境搭建步骤

```bash
# 1. 复制环境变量文件
cp .env.example .env.local

# 2. 安装依赖并启动
npm install && docker-compose up -d

# 3. 执行数据库迁移并启动开发服务器
npx prisma migrate dev && npm run dev
```

---

## NOS 上位机部署环境

- `nos` 当前指向 `10.21.31.106`，SSH 可达；远端用户家目录为 `/home/user`。
- NOS 系统为 Linux `aarch64`，Python 3.8 可用；未安装 `node` / `npm`。
- apt 源中有 `nodejs`/`npm`，但候选版本为 Ubuntu 20.04 的 Node.js 10.19 / npm 6.14，可能不满足当前 `ws@8` 后端依赖。
- NOS 已安装 Docker，但根分区空间紧张（约 18G 总量，仅约 1G 可用），拉镜像或安装运行时前需注意空间。
- `30011/tcp` 和 `30012/udp` 已被 NOS 自研导航服务占用；`8000`/`8080` 当前未见监听。
- 仅用 `python3 -m http.server 8000` 可以托管静态 `index.html`，但完整控制仍需要 WebSocket 后端；手机页面不能继续使用硬编码 `ws://localhost:8080`。
- 手机必备版运行目录为 `/home/user/m20ctrl`；旧 `/home/user/m20ctrl_mobile` 仅为历史目录，不作为当前运行路径。
- systemd service：`m20ctrl.service`，unit 文件 `/etc/systemd/system/m20ctrl.service`，已 `enable` 开机自启并由 systemd 管理。
- service 常用命令：
  `sudo systemctl status m20ctrl.service --no-pager -l`
  `sudo systemctl restart m20ctrl.service`
  `journalctl -u m20ctrl.service -n 80 --no-pager`
- `start_nos_python.sh` 在 NOS 上若未显式设置 `MAP_ROOT` 且 `/home/user/m20-fastlio/maps` 存在，会默认使用该目录；否则回退到部署目录下的 `data/`。
- 当前 Python 后端监听：`8000/tcp` 静态页面、`8080/tcp` WebSocket、`30013/udp` nav_viz 接收；nav_viz register 目标为 `127.0.0.1:30012`。
- 手机访问地址：`http://10.21.31.106:8000/index.html`。HTTP 模式下前端自动连接 `ws://10.21.31.106:8080`，并从 `/map/occ_grid.pgm`、`/map/occ_grid.yaml`、`/map/locations.json` 加载地图。

---

## 部署注意事项

- staging 环境：<!-- 说明 -->
- production 环境：<!-- 说明 -->

*最后更新：2026-05-19*
