# 项目文件清单

## 📁 项目结构

```
m20-controller/
│
├── 📄 README.md                    # 项目主文档（完整功能说明）
├── 📄 QUICKSTART.md                # 快速开始指南（5分钟上手）
├── 📄 PROJECT_SUMMARY.md           # 项目完成总结
├── 📄 FILES.md                     # 本文件（文件清单）
├── 📄 LICENSE                      # MIT许可证
├── 📄 .gitignore                   # Git忽略配置
│
├── 🌐 index.html                   # 前端Web应用（单文件）
│   ├── HTML结构
│   ├── CSS样式（现代化UI）
│   └── JavaScript逻辑
│       ├── Logger类（日志系统）
│       ├── Joystick类（虚拟摇杆）
│       ├── ConnectionManager类（连接管理）
│       └── 事件处理器
│
├── 📚 docs/                        # 文档目录
│   ├── m20protocol.md             # M20通信协议详细文档
│   │   ├── 协议概述
│   │   ├── APDU结构
│   │   ├── 命令类型（心跳、运动、灯光、导航、充电）
│   │   ├── 错误码
│   │   ├── Python示例
│   │   ├── Node.js示例
│   │   └── 常见问题
│   │
│   └── *.html                     # 原始开发文档（云深处官方）
│       ├── 软件开发指南
│       ├── 基于Python的二次开发教程
│       └── 基于C++的二次开发教程
│
└── 🔧 backend/                    # 后端服务目录
    ├── 📄 README.md               # 后端文档
    ├── 📄 package.json            # Node.js依赖配置
    │   └── 依赖: ws (WebSocket库)
    │
    ├── 🔌 server.js               # WebSocket服务器主文件
    │   ├── ControllerServer类
    │   │   ├── start()            # 启动服务器
    │   │   ├── initM20Client()    # 初始化M20客户端
    │   │   ├── handleClientMessage()  # 处理客户端消息
    │   │   ├── handleM20Config()  # 处理M20配置
    │   │   ├── handleMotionControl()  # 处理运动控制
    │   │   ├── handleGaitSwitch()     # 处理步态切换
    │   │   ├── handleLightControl()   # 处理灯光控制
    │   │   ├── handleNavTask()        # 处理导航任务
    │   │   ├── handleNavCancel()      # 处理取消导航
    │   │   ├── handleInitLocalize()   # 处理定位初始化
    │   │   ├── handleChargeControl()  # 处理充电控制
    │   │   ├── broadcastToClients()   # 广播消息
    │   │   └── stop()             # 停止服务器
    │   └── 启动脚本
    │
    ├── 🤖 m20Client.js            # M20 TCP客户端
    │   ├── M20Client类
    │   │   ├── connect()          # 连接M20
    │   │   ├── disconnect()       # 断开连接
    │   │   ├── attemptReconnect() # 自动重连
    │   │   ├── handleData()       # 处理接收数据
    │   │   ├── send()             # 发送命令
    │   │   ├── startHeartbeat()   # 启动心跳
    │   │   ├── stopHeartbeat()    # 停止心跳
    │   │   ├── onStatusUpdate()   # 状态更新回调
    │   │   └── onConnectionChange() # 连接状态变化回调
    │   └── 自动重连机制（2秒间隔，最多10次）
    │
    ├── 📡 m20Protocol.js          # M20通信协议编解码
    │   ├── M20Protocol类
    │   │   ├── buildAPDU()        # 构建APDU
    │   │   ├── parseAPDU()        # 解析APDU
    │   │   ├── buildHeartbeat()   # 构建心跳
    │   │   ├── buildMotionControl()   # 构建运动控制
    │   │   ├── buildGaitSwitch()      # 构建步态切换
    │   │   ├── buildLightControl()    # 构建灯光控制
    │   │   ├── buildNavTask()         # 构建导航任务
    │   │   ├── buildNavCancel()       # 构建取消导航
    │   │   ├── buildInitLocalize()    # 构建定位初始化
    │   │   └── buildChargeControl()   # 构建充电控制
    │   └── 协议头部处理（16字节固定）
    │
    └── 📦 node_modules/           # Node.js依赖包（npm install后生成）
        └── ws/                    # WebSocket库
```

## 📊 文件统计

| 类型 | 文件数 | 说明 |
|------|--------|------|
| 文档 | 7 | README、快速开始、协议、总结等 |
| 前端 | 1 | index.html（单页面应用） |
| 后端 | 3 | server.js、m20Client.js、m20Protocol.js |
| 配置 | 3 | package.json、.gitignore、LICENSE |
| **总计** | **14** | - |

## 🔑 关键文件说明

### 前端文件

#### index.html (~1200行)
- **用途**: 单页面Web应用
- **功能**:
  - 状态查询面板
  - 运动控制面板
  - 导航控制面板
  - 通信日志面板
- **技术**: HTML5 + CSS3 + JavaScript ES6+
- **特性**:
  - 虚拟摇杆控制
  - 自动重连
  - 实时日志
  - 响应式设计

### 后端文件

#### server.js (~300行)
- **用途**: WebSocket服务器主程序
- **功能**:
  - 接收前端连接
  - 路由消息处理
  - 广播状态更新
  - 管理M20连接
- **端口**: 8080

#### m20Client.js (~200行)
- **用途**: M20 TCP客户端
- **功能**:
  - TCP连接管理
  - 自动重连
  - 心跳保活
  - 数据接收处理
- **地址**: 10.21.31.103:30001

#### m20Protocol.js (~300行)
- **用途**: 协议编解码
- **功能**:
  - APDU构建
  - APDU解析
  - 命令编码
  - 协议头处理

### 文档文件

#### README.md
- 项目完整说明
- 功能介绍
- 使用指南
- 故障排查
- 开发说明

#### QUICKSTART.md
- 5分钟快速开始
- 前置条件
- 分步骤说明
- 常见问题

#### m20protocol.md
- 协议详细规范
- 命令类型说明
- 参数编码表
- 代码示例
- 常见问题

#### PROJECT_SUMMARY.md
- 项目完成总结
- 交付物清单
- 系统架构
- 技术栈
- 质量检查

## 🚀 使用流程

### 1. 查看文档
```
README.md          → 了解项目
QUICKSTART.md      → 快速开始
m20protocol.md     → 协议细节
```

### 2. 启动服务
```
backend/server.js  → 启动后端
index.html         → 打开前端
```

### 3. 开发扩展
```
backend/m20Protocol.js  → 添加新命令
backend/server.js       → 添加消息处理
index.html              → 添加UI控制
```

## 📝 文件修改历史

| 文件 | 创建时间 | 最后修改 | 状态 |
|------|---------|---------|------|
| index.html | 2026-03-06 | 2026-03-06 | ✅ 完成 |
| server.js | 2026-03-06 | 2026-03-06 | ✅ 完成 |
| m20Client.js | 2026-03-06 | 2026-03-06 | ✅ 完成 |
| m20Protocol.js | 2026-03-06 | 2026-03-06 | ✅ 完成 |
| README.md | 2026-03-06 | 2026-03-06 | ✅ 完成 |
| QUICKSTART.md | 2026-03-06 | 2026-03-06 | ✅ 完成 |
| m20protocol.md | 2026-03-06 | 2026-03-06 | ✅ 完成 |
| PROJECT_SUMMARY.md | 2026-03-06 | 2026-03-06 | ✅ 完成 |

## 🔍 文件查找指南

### 我想...

**了解项目**
→ 查看 `README.md`

**快速开始**
→ 查看 `QUICKSTART.md`

**学习协议**
→ 查看 `docs/m20protocol.md`

**修改前端**
→ 编辑 `index.html`

**修改后端**
→ 编辑 `backend/server.js`

**添加新命令**
→ 编辑 `backend/m20Protocol.js`

**处理新消息**
→ 编辑 `backend/server.js`

**查看项目总结**
→ 查看 `PROJECT_SUMMARY.md`

---

**项目完成日期**: 2026-03-06
**文档版本**: 1.0
