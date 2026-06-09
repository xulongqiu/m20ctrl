# 任务进度 (progress.md)

> 记录当前工作状态。每次完成阶段性工作后更新。
> 格式：`[YYYY-MM-DD HH:mm] 内容`

---

## 🎯 当前目标

将 m20ctrl 的导航控制接入 m20-fastlio 自研 Nav2/MPPI 导航，同时保持官方 APDU 协议兼容。

---

## ✅ 已完成

- [2026-06-06] 修复 NOS 地图模式地点写入：HTTP `/map` 加载成功后标记 `mapManager.remoteMap=true`，新增/删除/更新/清空地点改走 WebSocket 后端；Python 后端把地点数据写入 `args.map_root/locations.json`（当前 `/home/user/m20-fastlio/maps/locations.json`）。已同步 NOS 并重启，NOS 本机 WebSocket smoke 保存/删除测试通过且无测试点残留。
- [2026-06-06] 修复控制命令过期误判：Python 后端命令过期阈值从 1.5s 调整到 5s，并在所有 WebSocket JSON 响应附带 `serverTimeMs`；前端维护 `serverClockOffsetMs`，控制命令使用校准后的 `clientTs`，避免手机/NOS 时钟偏差导致即时命令被 drop。已同步 NOS 并重启，服务 active。
- [2026-06-05] 导航状态地图 X/Y/Yaw 显示保留负号：正数显示 `n.nn`，负数显示 `-n.nn`，接近 0 显示 `0.00`；已同步 NOS `/home/user/m20ctrl/index.html`，静态文件无需重启。
- [2026-06-04 22:55] 进一步修复导航视图停止刷新但控制命令可通的问题：Python WebSocket 不再在发送时临时改 socket timeout，改用 OS `SO_SNDTIMEO=0.5s` 限制 send 阻塞，避免 nav_viz UDP 广播线程被半断开手机卡住；idle timeout 调整为 30s，并新增 `[nav_viz] packet=<n> sender=<addr> clients=<n>` 低频诊断日志。已同步 NOS 并重启，服务 active，30013 监听正常。
- [2026-06-04 22:48] 修复灯光控制互相覆盖和 Python nav_view 初始空白：前端灯光命令发送完整 `front/back` 状态，Python/Node 后端按完整状态构造 `{Front,Back}`；Python 后端新增 `last_nav_view` 缓存，新 WebSocket 接入时补发最近导航视图快照，避免打开/重连时错过 UDP 帧导致 pose/costmap 空白。已同步 NOS 并重启，服务 active。
- [2026-06-03 16:52] Python 后端新增前端命令实时日志：收到非 heartbeat 命令并构建 APDU 后打印 `[frontend] command=<type> target=<vendor/custom_nav> connected=<bool> bytes=<n> sent=<bool>`，使用 `flush=True` 便于 `journalctl -u m20ctrl.service -f` 实时观察。已同步 NOS 并重启，服务 active。
- [2026-06-03 16:50] 修复 Python 后端厂家 30001 非 JSON/坏 JSON 回包刷屏：APDU 解析遇到 `UnicodeDecodeError/json.JSONDecodeError` 时不再输出普通 parse error，而是在缓冲中查找下一个协议头重同步；新增 `py_mobile_backend_test` 坏帧后好帧解析用例。已同步 NOS 并重启，服务 active，5 秒观察无新 parse error。
- [2026-06-03 16:47] 修复手机显示连接但运动/摇杆等命令不出的问题：前端 `ConnectionManager.send()` 现在把 `motion_control`、`usage_mode`、`axis_control`、`gait_switch`、`light_control`、四类状态查询全部强制走 NOS 本地 WebSocket，避免被 Agora RTM 优先分流。已同步 NOS `/home/user/m20ctrl/index.html`，HTTP 返回 200，`m20ctrl.service` active，30001 ESTAB。
- [2026-06-03 16:36] 修复 Python 后端 30001 状态快照与 WebSocket 僵尸连接问题：新手机/浏览器 WebSocket 接入时会立即收到当前 `robot_connected/robot_disconnected`，broadcast 写失败会移除断开客户端，避免 journal 刷 `[vendor] parse error: Broken pipe`。已同步 NOS 并重启，服务 active，`10.21.31.106 -> 10.21.31.103:30001` 为 ESTAB。
- [2026-06-03 15:36] 回退失败的 Chrome mobile touch fallback 后，改为修复静态资源缓存：`index.html` 使用 `nav_view.js?v=20260603-chrome-cache`，Python HTTP 响应增加 no-store/no-cache header；已同步 NOS 并重启 `m20ctrl.service`，远端 `/index.html` 和 `/nav_view.js?...` 均返回 no-cache header。
- [2026-06-03 15:27] 修复导航视图手机钢笔点选反馈：`nav_view.js` 点击后坐标 tip 和黄色十字 marker 持续显示最后一次点选位置，退出钢笔工具才清除；已同步到 NOS `/home/user/m20ctrl/nav_view.js`，重启 `m20ctrl.service` 后远端 HTTP `/nav_view.js` 返回 200。
- [2026-06-03 13:01] 将 NOS 上位机部署目录迁移为 `/home/user/m20ctrl`（不再使用 `_mobile` 作为运行目录），安装 systemd system service `/etc/systemd/system/m20ctrl.service` 并设置开机自启。当前服务由 systemd 管理，PID 23659，监听 `8000/tcp`、`8080/tcp`、`30013/udp`；HTTP `/index.html` 返回 200。CPU 占用很低：`top` 采样 0.0%，`ps` 累计平均约 3.7%，RSS 约 17MB。
- [2026-06-03 13:04] 修复 `m20ctrl.service` journal 中启动时 `OSError: [Errno 9] Bad file descriptor` traceback：Python 后端 TCP 读线程现在把本地 socket 关闭/重连产生的 `EBADF/ENOTCONN` 当作正常退出。已同步 `/home/user/m20ctrl/backend_py/server.py` 并重启 service，当前 PID 24138；重启后的 journal 无 traceback，远端 Python 测试 6 项通过。
- [2026-06-03 14:02] 完成手机导航视图点选与悬浮模式球优化并同步到 NOS：inspect 工具点击地图时会绘制短暂黄色十字/脉冲标记并显示坐标；右下模式切换控件改成圆形悬浮球，中心显示「常规/导航」，左/右/下显示线速度 X/Y 和角速度数值。已同步 `/home/user/m20ctrl/index.html`、`nav_view.js` 并重启 `m20ctrl.service`，当前 PID 4140；HTTP `/index.html` 返回 200，journal 无新 traceback。
- [2026-06-03 14:19] 修复手机导航视图拖动手势：`#navViewCanvas` 移动端设置 `touch-action:none`，`nav_view.js` 改用 pointer 事件处理 touch/mouse pan，事件在 canvas 层 `preventDefault + stopPropagation`，避免拖动传到底层 UI；inspect 点按在 pointerup/touchend 时绘制十字标记。已同步 NOS 并重启 `m20ctrl.service`。
- [2026-06-03 11:58] 新增手机端右下角悬浮使用模式切换按钮并部署到 NOS：按钮仅手机端显示，主文字显示当前 `常规模式/导航模式`，点击在 `usage_mode=0/1` 间切换；切回常规前先发送一次零 `axis_control`；小字显示与状态面板同源的实时运控状态 `linearX/linearY/omegaZ`。按钮 `z-index=3600`，导航视图浮窗打开时仍可点击。
- [2026-06-03 11:45] 完成手机导航 tab 精简并部署到 NOS：手机导航页移除地图文件夹选择入口，默认通过 HTTP `/map` 加载 NOS `/home/user/m20-fastlio/maps`；导航链路配置在手机布局下搬到日志 tab，导航页保留“打开导航视图”；导航任务合并目标点和路径属性，手机仅显示目标 X/Y/Yaw、步态、速度、停避障，目标点编号/点类型/底图编号等协议字段保留默认值；导航状态 6 项单行展示，刷新/记录当前位置放到下一行。同步 `index.html`、`start_nos_python.sh`，NOS Python 服务重启为 PID 12265。
- [2026-06-03 11:25] 修复 NOS Python 后端与原 Node 后端 `nav_viz_status` 不一致问题：Python 版现已维护 `packetCount`、`lastReceivedAt`、`lastSender`、`ageMs`、`pingCount`、`pingTarget`，新 WebSocket 连接会收到当前 nav_viz 状态；收到 UDP nav_view 后同步广播状态。已同步并重启 NOS 服务，新 PID 11470，监听 `8000/tcp`、`8080/tcp`、`30013/udp`。
- [2026-06-03 11:25] 加固手机全屏双摇杆息屏恢复：overlay/shell 使用 JS 计算的 viewport 像素尺寸，监听 `visualViewport`、`focus`、`pageshow`、`fullscreenchange`、`visibilitychange` 后分阶段刷新布局，并在亮屏恢复时重置左右摇杆指针状态。
- [2026-06-03 11:10] 完成手机端双摇杆与状态填充修复并部署到 NOS：手机点击原虚拟摇杆后进入全屏横屏双摇杆 overlay，左摇杆控制 X 前进/后退，右摇杆控制 Yaw 左右转，20Hz 发送 `axis_control`，退出时发送零值；修复 Python 后端 `Type=1002` 主动状态解析，输出前端需要的 `basic_status`、`motion_status`、`device_status`、`error_status`。NOS Python 服务已重启为 PID 9265。
- [2026-06-03 11:02] 优化手机端触屏布局并同步到 NOS：顶部 M20 IP/端口/连接条只在「日志」tab 显示，运动/导航/状态 tab 只保留紧凑连接状态；运动按钮组和状态卡片手机端以 3 列为主（超小屏 2 列），导航输入区保持 2-3 列。已同步 `/home/user/m20ctrl_mobile/index.html`。
- [2026-06-03 10:51] 完成手机端触屏布局首版并同步到 NOS：`index.html` 仅在 `max-width: 768px` 下启用移动布局，桌面端保留原网格/卡片布局；手机端新增底部四入口（运动/导航/状态/日志）、单主面板显示、触屏按钮尺寸、摇杆 `touch-action`/`preventDefault`、导航视图全屏浮层。已 rsync 到 `/home/user/m20ctrl_mobile/index.html`，Python 服务无需重启。
- [2026-06-03 10:17] 完成手机必备版 Python 后端：新增 `backend_py/server.py`（纯标准库 HTTP 8000 + WebSocket 8080 + M20/NOS APDU TCP + nav_viz UDP 30013 转发），新增 `start_nos_python.sh`；前端 HTTP 打开时自动连接当前主机 `ws://<host>:8080`，并从 `/map/occ_grid.pgm`、`/map/occ_grid.yaml`、`/map/locations.json` 加载导航视图底图/地点。
- [2026-06-03 10:17] 已部署到 NOS `/home/user/m20ctrl_mobile`（约 3MB），使用 `MAP_ROOT=/home/user/m20-fastlio/maps_all_5cm_0530` 启动；远端 Python 进程 PID 5850 正在监听 `8000/tcp`、`8080/tcp`、`30013/udp`。
- [2026-06-03 09:48] 新会话恢复上下文：已读取 `.claude/progress.md`、`decisions.md`、`lessons.md`、`env-notes.md`，并快速梳理 README、后端 WebSocket/TCP/APDU 路由、地图管理、导航视图与本地测试；确认当前重点仍是 NOS 实机验证自研导航链路。
- [2026-05-19 17:48] 阅读 m20protocol、Node 后端、前端导航面板与 m20-fastlio helper，确认双连接设计：原厂链路继续处理运动/状态，自研导航链路连接 NOS APDU nav server。
- [2026-05-19 22:25] 完成地图管理基础功能：前端直接打开 `index.html`，选择地图文件夹后读取 `occ_grid.pgm` 预览，地点只保存/加载该文件夹下的 `locations.json`，不再使用底图编号。
- [2026-05-19 23:30] 完成上位机自研导航接入前端/后端基础实现：后端新增 navClient + UDP nav_view 转发，前端新增”原厂/自研导航链路”切换、NOS 控制/视图端口配置、导航视图悬浮窗；导航命令和导航状态查询在自研模式下统一走自研 APDU 链路，原厂运动/基础状态链路保持在线。
- [2026-05-19 23:55] 加固自研导航后端：切换回 vendor 时主动断开 navClient（避免心跳/重连泄漏），视图 UDP 端口变更时使用 close→bind 顺序消除竞态；server.js 改为可作为库 require 启动。
- [2026-05-19 23:55] 重做导航视图渲染：底图改为前端读取 `occ_grid.pgm` + `occ_grid.yaml`（map_manager 新增 `parseOccupancyGridYaml` 与 `onBaseMapUpdated`），nav_view.js 用静态底图作画布，`local_costmap` 作半透明覆盖层，`global_path`/`local_path`/`pose`/`locations` 全部按 occ_grid.yaml 的 resolution/origin 投影。
- [2026-05-19 23:55] 端到端调试通过：`tests/mock_nos_nav_server.js` + `tests/e2e_custom_nav_test.js` 验证 (a) custom 模式下 navClient 连通且 nav_task 走自研链路并收到 command_response；(b) UDP nav_view 被后端转发到 WebSocket 客户端；(c) 切回 vendor 后 navClient 断开；原厂链路全程在线。
- [2026-05-20 00:05] 地图文件夹句柄持久化到 IndexedDB（库名 `m20ctrl-map-cache`/store `handles`/key `lastMapFolder`），刷新后 `restoreCachedFolder({promptIfNeeded:false})` 先静默尝试；浏览器丢失 readwrite 权限时显示「恢复上次: <name>」按钮等用户点击再走 `requestPermission`（受 File System Access 用户手势策略约束）。新增「清除缓存」按钮可删除 IDB 记录。
- [2026-05-20 15:10] 修复导航视图 local costmap 叠加旋转：`nav_view.js` 保留 `local_costmap.origin.yaw`，绘制 overlay 时用三角点 affine transform 按 map frame yaw 旋转贴图，避免 pose 看起来不在 rolling costmap 中心。

---

## 🔄 进行中

- 手机访问实测：用手机浏览器打开 `http://10.21.31.106:8000/index.html`，确认 WebSocket 自动连 `10.21.31.106:8080`，运动控制/导航控制/导航视图可用。
- 接到真实 NOS 节点后做一次现场冒烟：核对 `nav_task/get_map_position/query_nav_status` 字段、`nav_viz_streamer` 是否能把数据打到上位机 UDP 端口；地图文件夹下需放与机器人 NOS 一致的 `occ_grid.pgm` + `occ_grid.yaml`。

---

## 📋 待办

- [x] 后端新增 nav 连接配置与路由：导航 Type/Cmd 走自研 APDU server，其它控制仍走原厂 TCP。
- [x] 前端增加导航链路连接状态/配置入口，尽量复用现有导航控制表单。
- [x] 增加导航视图浮窗，Canvas 显示 pose、global path、local path、local costmap。
- [x] 与 m20-fastlio 的 nav_viz_streamer 数据协议对齐。
- [x] 端到端验证：本地 mock NOS 通过（tests/e2e_custom_nav_test.js）。
- [ ] NOS 实机验证：替换 mock，确认 NOS 自研 nav server 返回的 Items 字段与原厂兼容。

---

## 🔁 上下文恢复检查清单

上下文压缩后重新开始时，请依次确认：
- [ ] 已读取 `.claude/decisions.md`（了解技术选型背景）
- [ ] 已读取 `.claude/lessons.md`（避免重复踩坑）
- [ ] 已读取 `.claude/env-notes.md`（确认环境配置）
- [ ] 已了解当前「进行中」任务的断点位置
