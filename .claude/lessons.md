# 经验教训 (lessons.md)

> 记录踩过的坑、用户纠正的错误理解、发现的特殊约定。
> 格式：`## [YYYY-MM-DD] [类型] 标题`
> 类型标签：`[BUG]` `[误解]` `[约定]` `[坑]` `[纠正]`

---

## [2026-06-06] [BUG] NOS 地图模式地点写入必须走后端 map_root

**现象**：手机导航 tab 点“新增记录”提示没有打开本地地图文件夹。

**根因**：前端在 HTTP `/map` 加载 NOS 地图后仍调用 `MapFolderManager.saveLocation()`，该方法依赖浏览器 File System Access 的本地目录句柄；Python 后端也未实现 `save_location/load_locations/clear_locations`，所以手机端无法写入 NOS 地图目录。

**修复**：HTTP `/map` 加载成功后标记 `mapManager.remoteMap=true`；新增/删除/更新/清空地点在 NOS 模式下走 WebSocket；Python 后端将 locations 操作写入 `args.map_root/locations.json`（当前 `/home/user/m20-fastlio/maps/locations.json`）。

## [2026-06-06] [BUG] 控制命令过期判断不能直接比较手机时间和 NOS 时间

**现象**：`init_localize/light_control/motion_control` 被 `stale age≈2.0s limit=1.5s` 丢弃，但用户确认是即时点击；手机和 NOS 时间不完全同步。

**根因**：前端 `clientTs` 使用手机 `Date.now()`，后端用 NOS `time.time()` 直接比较。两端时钟偏差或短暂网络/浏览器延迟会误判为旧命令。

**修复**：过期阈值从 1.5s 放宽到 5s；后端每个 WebSocket JSON 响应附带 `serverTimeMs`，前端用它估算 `serverClockOffsetMs`，控制命令发送校准后的 `clientTs`。仍保留 5s 过期丢弃，防止掉线积压命令恢复后执行。

## [2026-06-04] [BUG] 灯光控制必须发送前后灯完整状态

**现象**：先点前灯前灯亮，再点后灯，前灯反而灭。

**根因**：旧 `build_light_control()` 每次只把当前灯置 1，另一个灯默认发 0；点后灯时发出 `{Front:0, Back:1}`，导致前灯被关闭。

**修复**：前端灯光点击发送完整 `front/back` 状态；Python/Node 后端优先按完整状态构造 `{Front, Back}`，兼容旧 `light/state` 字段。

## [2026-06-04] [BUG] Python 后端需要缓存最近 nav_view 快照

**现象**：导航视图中 costmap/pose 一直不显示，刷新页面后又显示。

**根因**：Node 后端有 `lastNavView`，新 WebSocket 连接会补发最近一帧；Python 后端只补发 `nav_viz_status`，没有缓存并补发最近 `nav_view`。如果前端打开/重连时错过 UDP 帧，就会空白直到下一帧或刷新。

**修复**：Python 后端收到 UDP nav_view 后保存 `last_nav_view`；新 WebSocket 接入时在状态之后立即补发最近 `nav_view`。

**后续纠正**：用户补充现象是“导航视图一直不刷新，但控制命令仍可通，整页刷新后恢复”，这更像 nav_viz UDP 广播线程被半断开的 WebSocket 客户端阻塞，而不是单纯缺少最近一帧缓存。后续增加了 WebSocket send OS 级超时和 nav_viz 包计数日志。

## [2026-06-04] [BUG] nav_viz 广播大包不能被半断开的手机阻塞

**现象**：控制命令可以通，但导航视图不再刷新 costmap/pose/path；整页刷新后恢复。

**根因**：nav_viz UDP 线程收到大包后同步广播给所有 WebSocket 客户端；如果某个手机半断开，向该客户端 `sendall()` 大 nav_view 帧可能阻塞，导致 UDP 线程停止继续读取/广播新帧。控制命令走其它 WebSocket handler 线程，所以仍可通。

**修复**：WebSocket 使用 OS 级 `SO_SNDTIMEO=0.5s` 限制发送阻塞，不再在 send 前临时修改 socket timeout（会和 recv 线程冲突）；idle timeout 放宽到 30s；nav_viz 每 50 包打印一次 `packet/sender/clients` 诊断日志。

## [2026-06-04] [BUG] 多手机 WebSocket 中断不能阻塞其它手机命令

**现象**：手机 A 距离 NOS 远导致 Wi-Fi/WebSocket 半断开，手机 B 仍显示连接但控制命令不执行；A 恢复后，B 之前发送的命令一股脑执行，存在安全风险。

**根因**：B 刷新连接后会先发 `config_m20`，Python 后端在处理该消息时会 `broadcast(robot_connected)` 给所有 WebSocket 客户端；如果 A 是半断开的僵尸连接，旧 `send_json()` 可能长时间阻塞，导致 B 的同一 WebSocket 处理线程卡住，B 后续控制命令在 socket 缓冲里排队，等 A 恢复后才继续处理。

**修复**：WebSocket 发送设置短超时（0.5s），广播写失败/超时即移除僵尸客户端；控制/导航执行类命令必须带 `clientTs`，后端超过 1.5s 或缺失时间戳直接 `command_dropped`，避免旧命令恢复后补执行。

## [2026-06-03] [BUG] 厂家 30001 回包存在非 JSON/坏 JSON 帧，Python 后端要重同步

**现象**：journal 持续刷 `[vendor] parse error: 'utf-8' codec can't decode...` 或 `Expecting ',' delimiter`。

**根因**：Python 版 APDU 解析对每个厂家帧都无条件 `utf-8` 解码并 `json.loads()`；实际 30001 回包里会出现非 JSON/坏 JSON/误对齐帧。旧读循环直接打印 parse error 并按长度吃掉数据，容易刷屏且不如 Node 版有重同步逻辑。

**修复**：`RobotTcpClient._read_loop()` 对 `UnicodeDecodeError/json.JSONDecodeError` 不再打印普通 parse error，而是在当前 frame+buffer 中查找下一个 `EB 91 EB 90` 协议头重同步；找不到则清空等待新数据。新增测试覆盖坏帧后仍能解析后续好帧。

## [2026-06-03] [BUG] AP 离线手机控制命令必须强制走本地 WebSocket

**现象**：手机 UI 显示已连接，但运动控制/摇杆/步态/灯光/状态查询等命令没有发到机器人。

**根因**：前端 `ConnectionManager.send()` 只把导航命令列为 `localOnlyTypes`；运动控制类命令如果检测到 Agora RTM 在线，会优先走 RTM，而不是发给 NOS 本地 WebSocket。AP 离线/手机直连 NOS 的场景下，这会导致 8080 后端收不到命令。

**修复**：将 `motion_control`、`usage_mode`、`axis_control`、`gait_switch`、`light_control`、`query_*_status` 加入 `localOnlyTypes`，强制走本地 WebSocket。

## [2026-06-03] [BUG] Python 后端新 WebSocket 连接必须补发当前 M20 连接状态

**现象**：NOS 上 `m20ctrl.service` 正常运行，`10.21.31.103:30001` TCP 已 ESTAB，但手机/前端仍显示 30001 未连接。

**根因**：Python 后端启动时已连接 M20 并广播过 `robot_connected`，但后续新打开的 WebSocket 客户端只收到控制服务器连接、导航链路和 nav_viz 状态，未收到当前 M20 连接快照；另外断开的 WebSocket 未在 broadcast 失败时剔除，导致状态广播写到僵尸连接并在 vendor 回调里表现为 `Broken pipe`。

**修复**：`add_ws()` 在新客户端接入时按 `self.m20.connected` 立即发送 `robot_connected/robot_disconnected`；`broadcast()` 捕获 `OSError` 并移除失效 WebSocket 客户端。

## [2026-06-03] [BUG] Chrome mobile 调试前先排除静态 JS 缓存

**现象**：导航视图拖动/钢笔点选在浏览器 A 表现正常，但 Chrome mobile 仍表现为旧问题；尝试新增 touch fallback 后现象未变化。

**根因**：NOS Python 静态服务此前只返回 `Last-Modified`，没有 `Cache-Control`；`index.html` 固定引用 `nav_view.js`，Chrome mobile 可能继续执行缓存中的旧 JS，导致部署后的前端修复看起来“没生效”。

**修复**：`index.html` 给 `nav_view.js` 增加版本 query；`backend_py/server.py` 对静态响应增加 `Cache-Control: no-store, no-cache, must-revalidate`、`Pragma: no-cache`、`Expires: 0`。

## [2026-06-03] [BUG] TCP 读线程关闭 socket 时不要把 EBADF 打成 traceback

**现象**：`journalctl -u m20ctrl.service -f` 在服务启动后出现 `Exception in thread Thread-3 ... OSError: [Errno 9] Bad file descriptor`。

**根因**：`RobotTcpClient.disconnect()` 会关闭 socket，但 `_read_loop()` 可能正阻塞在 `self.sock.recv()`；socket 被本地关闭后读线程收到 `EBADF`，旧代码只处理 `socket.timeout`，导致线程异常 traceback 进入 journal。

**修复**：`_read_loop()` 每轮拿 socket 快照；若 socket 为空直接退出；`OSError(EBADF/ENOTCONN)` 或 `stop_event` 已置位时按正常关闭处理，不再冒泡。

## [2026-06-03] [纠正] 导航速度兼容应在 NOS 服务端支持厂家 `Speed`

**现象**：手机导航任务选择低/中/高速度，实测速度几乎一样；NOS 日志显示 `m20_nav_server` 收到的任务都是 `vel=default`。

**用户纠正**：m20ctrl 前端应保持厂家协议字段 `Speed`，不要额外塞 `SpeedMax/speed_max` 这类 NOS 私有别名；正确边界是在 NOS 自研 nav server 里实现对厂家 `Speed` 参数的支持。

**正确做法**：前端继续发送 `Speed: parseFloat(navSpeed)`；NOS 服务端在解析 `Type=1003/Command=1` 时读取 `Items.Speed` 并映射到已有 speed limit 机制。

## [2026-06-03] [BUG] Python nav_viz_status 必须和 Node 后端字段一致

**现象**：手机导航视图左上角提示“UDP监听中 30013，未收到数据”，但 pose/costmap 已经正常显示。

**用户纠正**：不能只看前端 `nav_view.js`，因为同一份 JS 在之前 Node 后端下能正常显示；应重点对比 Python 后端和原后端行为差异。

**根因**：Node 后端 `buildNavVizStatus()` 会维护并发送 `packetCount`、`lastReceivedAt`、`lastSender`、`ageMs` 等字段；Python 后端早期只返回 `listening/port`。前端拿不到包计数后会把状态渲染成“未收到数据”，即使 `nav_view` 数据已经转发成功。

**修复**：Python 后端收到非 register UDP 包时记录包计数/来源/时间，新 WebSocket 连接和 `nav_viz_ping` 都返回完整 `nav_viz_status`。

## [2026-05-19] [纠正] 自研导航链路切换不能关闭原厂控制连接

**纠正**：切换到自研导航链路时，原厂 `10.21.31.103:30001` 连接必须保持在线；但导航相关的命令控制和状态解析都应走自研链路。

**原因**：运动控制、灯光、步态、电池/基础状态等仍依赖原厂链路；`nav_task`、`nav_cancel`、`init_localize`、`get_map_position`、`get_nav_perception`、`query_nav_status` 这类导航控制和导航状态应统一路由到自研 APDU nav server。后端应维护两条并行连接，而不是把“切换导航链路”理解为替换整体机器人连接。

## [2026-05-19] [约定] 前端导航面板保持厂家协议字段，不直接绑定私有导航命令

**约定**：`nav_task`、`nav_cancel`、`init_localize`、`get_map_position`、`get_nav_perception`、`query_nav_status` 继续使用厂家 Type/Cmd 的语义和字段。前端不要直接发 `GOTO/STOP/SETPOSE` 这类私有命令。

**原因**：私有命令会把协议兼容逻辑散落在上位机；正确边界是 m20ctrl 后端只做连接路由，NOS 自研 nav server 负责 APDU 到 Nav2/MPPI 的映射。

---

## [2026-05-19] [约定] 浏览器不直接连接 ROS/DDS/UDP，导航视图通过后端转发

**约定**：导航视图浮窗只消费后端 WebSocket 数据，不能让浏览器直接访问 ROS topic 或裸 UDP。

**原因**：浏览器不适合作为 ROS/DDS 客户端；local costmap/path/pose 这类数据应由 NOS nav_viz_streamer 汇总，后端转发，前端 Canvas 绘制。

---

## [2026-05-19] [坑] 示例：环境变量必须带端口号

**现象**：连接 Redis 时报 "connection refused"

**原因**：REDIS_URL 默认不带端口，但项目跑在非标准端口 6380

**正确做法**：`REDIS_URL=redis://localhost:6380`

---

## [2026-05-19] [约定] 示例：API 返回格式统一规范

**约定**：所有接口返回 `{ data, error, meta }` 结构
- 成功：`{ data: {...}, error: null, meta: { timestamp } }`
- 失败：`{ data: null, error: { code, message }, meta: { timestamp } }`
- **不要**用旧格式 `{ success: true, result: ... }`

---

*在此之上添加新的经验记录 👇*

## [2026-05-19] [纠正] 上位机文件修改不要用 Python 脚本批量写

**纠正**：修改 `m20ctrl` 文件时应优先直接 patch/编辑目标文件，不要用 Python 脚本生成或批量改写源码。

**原因**：Python 写文件不利于审查具体变更，也容易让修改边界不清晰。若目录权限受限，需要先说明原因并请求合适的写权限。

## [2026-05-19] [纠正] 8080 是上位机后端 WebSocket 端口，不是页面 HTTP 入口

**纠正**：不要把 m20ctrl 改成 `http://localhost:8080` 静态页面服务。8080 已由上位机后端 WebSocket 使用，前端仍直接打开 `index.html`。

**原因**：把 8080 改成 HTTP+WebSocket 会和现有启动/访问方式冲突，也不符合用户当前使用习惯。

## [2026-05-19] [约定] 导航视图坐标轴方向：右 = +X，上 = +Y

**约定**：导航视图悬浮窗渲染遵循与「地图管理」预览一致的方向——画布右边对应世界 +X，上边对应世界 +Y。PGM 像素直接按文件顺序写入画布（top-row first）；`worldToCanvas` 反向映射 Y（`canvasY = offsetY + drawHeight - gy*scale`）保持上=+Y。

**为什么**：ROS map_server 输出的 PGM 文件首行就是世界 Y 最大的一行；如果在 nav_view 渲染时再上下翻转一次，就会和地图管理预览方向冲突，用户看着像是镜像。

**如何应用**：改动 `nav_view.js#buildBaseMapImage` 或 `worldToCanvas` 时，先回看 `map_manager.js#drawPgmToCanvas`（直接拷贝像素，无翻转）。`buildCostmapImage` 仍需做 Y 翻转，因为 Nav2 occupancy_grid `data[0]` 是世界左下角，与 PGM 约定相反。

## [2026-05-19] [坑] 切回 vendor 时必须主动断开 navClient

**现象**：用户切回原厂导航后，后端 navClient 仍在按 5s 间隔向已下线的 NOS 发心跳并不停重连，日志被刷屏。

**根因**：早先版本只在切到 custom 时 `initNavClient()`，切回 vendor 时没有调用 `disconnect()`。M20Client 的 `close` 事件会自动触发重连。

**正确做法**：`handleNavRoute` / `handleNavConfig` 在 `routeMode === 'vendor'` 路径上显式调用 `disconnectNavClient()`，并把 `this.navClient = null`。

## [2026-05-20] [纠正] nav_viz_streamer 必须把 odom 帧的字段投到 map 帧再上线

**纠正**：streamer 不能把 `pose`（在 map 帧）和 `local_costmap`/`local_path`（默认在 odom 帧）混着发。TF-less 的消费者（m20ctrl 浏览器端）无法在前端做帧对齐，会出现 "pose +X，costmap -X" 这种镜像漂移。

**根因**：以前的 `CostmapFromMsg` / `DownsamplePath` 只是把 `msg.header.frame_id` 透传，没有用 `tf_buffer_` 做坐标变换。

**正确做法**（已落在 `m20-fastlio/src/m20_nav/src/nav_viz_streamer.cpp`）：订阅回调里立刻用 `tf_buffer_.lookupTransform(map_frame_, src_frame, stamp, 50ms)` 把 origin / poses 投到 `map_frame_` 再缓存；TF 查不到就丢这帧 + 节流 WARN。新增 helper：`TryTransformPose` / `ApplyTransformInPlace` / `IngestPath` / `IngestCostmap`。`tf2_geometry_msgs` 在 `package.xml` 和 `CMakeLists.txt`（`find_package` + `ament_target_dependencies(nav_viz_streamer ...)`）里要加依赖。

**判定方式**：m20ctrl 前端 `nav_view.js#_checkFrameConsistency` 在帧不一致时会打 console.warn + 日志面板 ERROR。看到 `local_costmap.frame=odom` 就是 streamer 没升级。

## [2026-05-20] [BUG] local costmap overlay 必须使用 origin.yaw

**现象**：NOS 端 rolling local costmap 本身围绕 `base_link`，但上位机导航悬浮窗里 pose 看起来不在 local costmap 中心。

**根因**：`nav_viz_streamer` 已把 `/local_costmap/costmap` origin 转到 `map` frame，并在 JSON 中包含 `origin.yaw`；但前端 `extractCostmap()` 只保留 `origin.x/y`，`drawCostmapOverlay()` 也按未旋转矩形贴图。`map↔odom` 存在旋转时，costmap 叠加到静态地图会发生视觉偏移。

**修复**：前端保留 `origin.yaw`，绘制 overlay 时把 costmap 左上/右上/左下三个角点投到 canvas，用 affine transform 旋转贴图。

## [2026-05-19] [约定] backend/server.js 用作库时不要自动 listen

**约定**：`backend/server.js` 末尾必须用 `if (require.main === module)` 包住自动启动逻辑，导出 `ControllerServer` 类供测试 `require` 使用。

**为什么**：`tests/e2e_custom_nav_test.js` 需要用自定义端口启动控制器并和 mock NOS 端到端跑，如果 require 即 listen 会和默认端口/真实机器人配置冲突。

## [2026-06-03] [坑] 同步到 NOS 不要全量 rsync 仓库

**现象**：第一次全量 `rsync ./ nos:~/m20ctrl/` 误传了 `agora_bridge/venv` 和大量 SDK/缓存文件，传输约 241MB；NOS 根分区本来仅约 1GB 可用。

**正确做法**：手机部署只同步最小运行集到 `/home/user/m20ctrl_mobile`：`index.html`、`map_manager.js`、`nav_view.js`、`jsmpeg.min.js`、Agora 前端 SDK/config、`backend_py/`、`start_nos_python.sh`、`data/`。不要同步 `.git`、`node_modules`、`backend/node_modules`、`agora_bridge/venv`、`__pycache__`。

## [2026-06-03] [BUG] Python 后端必须解析 Type=1002 主动状态类别

**现象**：手机端状态查询 tab 没有数据填充。

**根因**：`backend_py/server.py` 早期把 M20 主动上报 `Type=1002` 统一转成 `raw_status`，但前端 `ConnectionManager.handleMessage` 只会把 `basic_status`、`motion_status`、`device_status`、`error_status` 交给状态面板更新。

**修复**：Python 后端按 Node `backend/m20Protocol.js` 的语义解析 `Command=6/4/5/3`，分别输出 `basic_status`、`motion_status`、`device_status`、`error_status`。新增 `tests/py_mobile_backend_test.py` 覆盖 basic status 解析。
