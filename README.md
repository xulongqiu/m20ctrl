# M20机器狗上位机控制系统

云深处 M20 机器狗的单页面 Web 控制系统，通过 WebSocket + TCP 与机器狗通信，提供实时状态监测、运动控制、导航任务管理等功能。

## 🎯 核心功能

- **实时状态监测** — 电量、运动姿态、GPS、CPU 负载等，机器狗主动上报，面板自动刷新
- **运动控制** — 使用模式切换（常规/导航/辅助）、运动状态（站立/行走/趴下）、步态切换、虚拟摇杆轴控制（20Hz）
- **导航任务** — 单点导航下发（目标坐标/步态/速度/导航方式等）、取消任务，执行结果实时反馈
- **导航状态监控** — 查询机器狗在地图坐标系中的位置、定位状态、避障状态、任务执行状态
- **地点管理** — 记录机器狗当前地图位置并命名保存，列表中一键填充至导航目标，支持清空
- **定位初始化** — 下发初始化定位指令，设置机器狗在地图中的初始位姿
- **设备控制** — 前后照明灯独立开关控制

## 🚀 快速启动（桌面本地）

### 前置条件

- Node.js 14+（桌面本地 Node 后端需要）
- 现代浏览器（Chrome/Edge 推荐，地图文件夹读写依赖 File System Access API）
- 能访问 M20 机器狗默认地址 `10.21.31.103:30001`

### 首次启动

> 首次 clone 后必须先安装 `backend/` 依赖；根目录一键脚本不会自动执行 `npm install`。

```bash
cd backend
npm install
npm start
```

然后在浏览器中打开项目根目录的 `index.html`，页面顶部确认 M20 地址后点击“连接”。

### 日常启动脚本

双击运行项目根目录下对应系统的启动脚本，自动拉起后端并打开浏览器：
- **Mac**: `start.command`
- **Windows**: `start_windows.bat`
- **Linux**: `./start_linux.sh`

> 脚本会检测后端是否已运行，如已运行则只打开前端。按 `Ctrl+C` 停止服务。
> 如果是新 clone 的目录，请先完成上面的 `cd backend && npm install`。

**手动启动**

```bash
cd backend && npm install && npm start
```
然后在浏览器中打开 `index.html`，页面顶部确认 M20 地址后点击"连接"。

## 📱 部署到 NOS（手机/AP 场景）

NOS 上没有 Node 运行环境时，使用项目内置的 Python 标准库后端，不需要 `pip install`：

- HTTP 静态页面：`8000/tcp`
- WebSocket 控制：`8080/tcp`
- nav_viz UDP 接收：`30013/udp`
- M20 原厂链路：`10.21.31.103:30001`
- 自研导航链路：`127.0.0.1:30011`
- nav_viz register 目标：`127.0.0.1:30012`
- 默认地图目录：`/home/user/m20-fastlio/maps`

### 1. 同步代码到 NOS

在本机项目根目录执行：

```bash
rsync -av --delete \
  --exclude '.git/' \
  --exclude 'node_modules/' \
  --exclude 'backend/node_modules/' \
  ./ user@10.21.31.106:/home/user/m20ctrl/
```

### 2. 安装 systemd service

```bash
ssh user@10.21.31.106
cd /home/user/m20ctrl
chmod +x start_nos_python.sh
sudo cp deploy/m20ctrl.service /etc/systemd/system/m20ctrl.service
sudo systemctl daemon-reload
sudo systemctl enable --now m20ctrl.service
```

### 3. 验证服务

```bash
sudo systemctl status m20ctrl.service --no-pager -l
journalctl -u m20ctrl.service -n 80 --no-pager
ss -ltnup | grep -E ':(8000|8080|30013)\b'
```

手机连接 NOS AP 后访问：

```text
http://10.21.31.106:8000/index.html
```

### NOS 地图文件要求

导航视图会从 `MAP_ROOT` 读取以下文件：

```text
/home/user/m20-fastlio/maps/occ_grid.pgm
/home/user/m20-fastlio/maps/occ_grid.yaml
/home/user/m20-fastlio/maps/locations.json
```

如果地图目录不是默认路径，修改 `/etc/systemd/system/m20ctrl.service` 里的 `Environment=MAP_ROOT=...`，然后执行：

```bash
sudo systemctl daemon-reload
sudo systemctl restart m20ctrl.service
```

## 📁 项目结构

```
m20ctrl/
├── index.html              # 前端单页应用
├── nav_view.js             # 导航视图 Canvas 渲染
├── map_manager.js          # 地图/地点管理
├── start.command            # macOS 启动脚本
├── start_windows.bat        # Windows 启动脚本
├── start_linux.sh           # Linux 启动脚本
├── start_nos_python.sh      # NOS Python 后端启动脚本
├── deploy/
│   └── m20ctrl.service      # NOS systemd service
├── data/
│   └── locations.json       # 地点记录持久化存储
├── docs/
│   ├── m20_dev_manual.md    # M20 软件开发手册
│   └── m20protocol.md       # 通信协议摘要
├── backend_py/
│   └── server.py            # NOS Python HTTP/WebSocket/APDU/nav_viz 后端
└── backend/
    ├── server.js            # WebSocket 服务器 + 消息路由
    ├── m20Client.js         # M20 TCP 客户端（含自动重连）
    ├── m20Protocol.js       # 协议编解码（APDU/ASDU）
    └── package.json
```

## 🏗️ 系统架构

```
桌面本地：
浏览器 (index.html) ←—WebSocket JSON—→ Node.js 后端 ←—TCP 二进制 APDU—→ M20 机器狗

NOS 手机/AP：
手机浏览器 ←—HTTP 8000 / WebSocket 8080—→ Python 后端 ←—TCP APDU—→ M20 / 自研导航服务
                                                ↑
                                       UDP 30013 nav_viz
```

- **前端 → 后端**：WebSocket JSON 消息（运动/导航/查询/地点管理）
- **前端 → Agora RTM**：优先通过声网 RTM 发送远端控制指令（如果已连接并登录声网）
- **后端 / Agora Bridge → M20**：按协议构建 APDU 帧发送（16字节头 + JSON ASDU）
- **M20 → 后端 / Agora Bridge → 前端**：机器狗主动上报状态数据（1Hz心跳触发），通过本地 WebSocket 或远端 RTM 分发

### 双链路路由重试 (Dual-Path Routing)

控制系统支持 **本地优先** / **远端优先** 动态路由智能切换：
- **心跳/本地配置**：强制走 WebSocket（不占用云端资源）。
- **运动/导航控制**：当右上角 **声网 RTM 已连接** 时，优先走高优先级的底层 RTM 信道送往 `agora_device.py`；当未连接外网时，平滑回退（Fallback）为本地 WebSocket 链路。


### 已实现的协议

| 章节 | 功能 | Type/Cmd |
|------|------|----------|
| 1.2.2 | 使用模式切换 | 1101/5 |
| 1.2.3 | 运动状态转换 | 2/22 |
| 1.2.4 | 步态切换 | 2/23 |
| 1.2.5 | 轴指令（摇杆） | 2/21 |
| 1.2.6 | 灯光控制 | 1101/2 |
| 1.3 | 主动上报状态 | 1002/3,4,5,6 |
| 1.4.1 | 初始化定位 | 2101/1 |
| 1.4.2 | 获取地图位置 | 1007/2 |
| 1.4.3 | 导航感知状态 | 2002/1 |
| 1.4.4 | 下发导航任务 | 1003/1 |
| 1.4.5 | 取消导航任务 | 1004/1 |
| 1.4.6 | 查询任务状态 | 1007/1 |

## 🔧 连接与保活

| 链路 | 重连策略 | 心跳 |
|------|----------|------|
| 前端 ↔ 后端 | 指数退避（1s~30s），最多10次 | 5s |
| 后端 ↔ M20 | 固定2s，最多10次 | 5s |

## 📖 参考文档

- [M20 通信协议摘要](docs/m20protocol.md)
- [后端 README](backend/README.md)
- [M20 软件开发手册](docs/m20_dev_manual.md)
