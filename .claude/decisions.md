# 技术决策日志 (decisions.md)

> 记录重要的架构与技术选型决定，以及做出该决定的原因。
> 格式：`## [YYYY-MM-DD] 决策标题`

---

## [2026-05-19] 导航控制采用双连接架构：原厂控制链路 + 自研 APDU 导航链路

**决定**：m20ctrl 后端保留原有 M20 TCP 连接 `10.21.31.103:30001`，用于运动控制、步态、灯光、状态上报等原厂能力；新增一条连接到 NOS 自研导航服务的 navClient，导航相关 Type/Cmd 直接转发到 NOS APDU nav server。

**原因**：前端导航面板现有 payload 已经按厂家导航协议组织，后端只需增加连接和路由，不需要把导航请求翻译成私有 UDP 文本命令。协议兼容层放在 NOS 上，未来其它官方协议客户端也能复用自研导航。

**影响范围**：`backend/server.js` 增加 navClient 与导航消息路由；前端只增加导航链路状态/配置和导航视图入口，导航表单字段保持兼容。

---

## [2026-05-19] 导航视图悬浮窗最终设计：前端拼接静态底图 + 动态覆盖

**决定**：导航视图悬浮窗在前端做所有绘制，不让 Node 后端渲染图片。前端从已选地图文件夹读取 `occ_grid.pgm`（静态栅格底图）和 `occ_grid.yaml`（resolution/origin，世界→像素坐标转换）和 `locations.json`（地点）；后端只负责 (a) TCP APDU 导航控制/状态、(b) UDP nav_viz_streamer 数据透传到 WebSocket。悬浮窗以静态 PGM 为底图，`local_costmap` 用半透明色叠加，`global_path`/`local_path`/`pose`/`locations` 按 yaml 的 resolution/origin 投影。方向约定：画布右 = +X，上 = +Y，与「地图管理」预览一致。

**原因**：local_costmap 只覆盖机器人附近 4–8m，把静态地图作为底图更符合人对“整张地图 + 当前局部”的感知；同时让后端保持纯转发，不依赖 Node 端的图像库。

**影响范围**：`map_manager.js` 增加 `parseOccupancyGridYaml` 和 `onBaseMapUpdated`；`nav_view.js` 重写 `setBaseMap` / `computeViewport` / `worldToCanvas` / `drawCostmapOverlay`；`index.html` 把 `mapManager.onBaseMapUpdated` 连到 `navView.setBaseMap`。

## [2026-05-19] 导航视图与导航控制分离传输

**决定**：导航控制走可靠 APDU 请求/响应链路；导航视图（pose、global path、local costmap、goal 等）走独立轻量流，由浏览器 Canvas 浮窗渲染。

**原因**：控制链路需要可靠 ack/result；可视化链路高频且允许丢帧，不应塞进 APDU 控制连接。

**影响范围**：前端复用现有相机 floating-window 交互样式，新增导航视图浮窗；后端后续转发 nav_viz_streamer 数据到浏览器 WebSocket。

---

## [2026-05-19] 地图管理使用浏览器目录句柄读写地图文件夹

**决定**：上位机前端继续直接打开 `index.html`，后端 8080 只保留 WebSocket。地图管理通过浏览器 File System Access API 选择地图文件夹，读取 `occ_grid.pgm` 预览，并把地点保存到同一目录的 `locations.json`。

**原因**：8080 已被上位机后端 WebSocket 占用，不能改造成 HTTP 静态页面入口。地图文件夹仍应成为地图预览和地点数据的唯一来源，避免继续使用项目固定 `data/locations.json`。

**影响范围**：`backend/server.js` 继续只提供 WebSocket；`start.command` / `start_linux.sh` 继续打开 `index.html`；前端地图管理只读写所选文件夹，未选择地图文件夹时不保存地点。

## [2026-06-03] NOS 手机访问采用 Python 精简后端而非安装 Node

**决定**：在 NOS 上新增 `backend_py/server.py` 和 `start_nos_python.sh`，用 Python 3.8 标准库提供手机必备能力：HTTP 静态页面、WebSocket JSON 控制、M20/NOS APDU TCP 转发、nav_viz UDP 到 WebSocket 转发。不在 NOS 上安装 Node/npm，也不拉 Docker 镜像。

**原因**：NOS 当前没有 Node/npm，apt 候选 Node 版本仅 10.19，根分区剩余空间约 1GB；安装运行时或拉镜像风险高。手机端当前必须保证运动控制、导航控制、导航视图，暂不需要 ffmpeg 视频和 Agora。

**影响范围**：`index.html` HTTP 模式自动连接当前主机 `ws://<host>:8080`，并从 `/map/...` 加载底图；`backend_py/server.py` 默认连接 `127.0.0.1:30011`，监听 `30013/udp`，向 `127.0.0.1:30012` 发送 nav_viz register。


## [2026-05-19] 示例：选择 PostgreSQL 而非 MongoDB

**决定**：使用关系型数据库 PostgreSQL

**原因**：
- 业务数据关联性强，需要事务支持
- 团队对 SQL 更熟悉

**放弃的方案**：MongoDB（文档型，灵活但无强事务）

**影响范围**：整个数据层，使用 Prisma ORM

---

*在此之上添加新的决策记录 👆*
