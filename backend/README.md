# M20机器狗上位机控制系统

## 项目结构

```
.
├── index.html              # 前端Web页面
├── backend/
│   ├── package.json        # Node.js依赖配置
│   ├── server.js           # 主服务器文件
│   ├── m20Client.js        # M20机器狗TCP客户端
│   └── m20Protocol.js      # M20通信协议处理
└── README.md               # 本文件
```

## 核心架构

- **WebSocket服务器** (默认端口 `8080`): 处理 Web 前端的实时通信与控制指令发布。
- **M20 TCP客户端** (连接 `10.21.31.103:30001`): 与底层机器狗建立稳定的 TCP 连接。
- **协议解析**: 负责 M20 自定义数据帧编解码（16 字节头部校验 + JSON 载荷解析）。
- **保活机制**: 具备内置 5 秒心跳保活与指数退避的高可靠断线重连策略。

## 启动服务

**推荐使用项目根目录的一键启动脚本（如 `start.command` 或 `start_windows.bat`）。**

如果需单独启动后端：
```bash
cd backend
npm install
npm start
```

## 配置说明

### 后端配置

编辑 `backend/server.js` 中的配置：

```javascript
const server = new ControllerServer({
    wsPort: 8080,              // WebSocket服务端口
    m20Host: '10.21.31.103',   // M20机器狗IP
    m20Port: 30001             // M20 TCP端口
});
```

### 前端配置

在页面顶部输入框中配置：
- **服务器IP** - 后端服务器地址
- **服务器端口** - 后端服务器端口

## 通信协议简述

### 前端 ↔ 后端 (WebSocket JSON)
通过统一的 `{ type: "<命令类型>" }` 格式交互：
- `motion_control`: { action: "stand|walk|down" }
- `usage_mode`: { mode: 0|1|2 }
- `gait_switch`: { gait: 1|12|13|14 }
- `axis_control`: { axes: { X, Y, Z, Roll, Pitch, Yaw } }
- `nav_task`: 导航控制下发数据
- `heartbeat`: 会话保活探测

### 后端 ↔ M20 (TCP 二进制 + JSON)
采用 M20 官方协议架构：
- **Header**: 16字节协议头 (包含魔数 `0xEB91EB90` 与 ASDU 长度)。
- **Payload**: JSON 格式的数据内容 (ASDU)。支持 1.2 版本的控制指令和 1.3 的主动状态上报聚合。

## 故障排查

### 前端无法连接到后端
1. 检查后端服务是否启动
2. 检查防火墙设置
3. 检查IP和端口是否正确

### 后端无法连接到M20
1. 检查M20机器狗是否开启
2. 检查网络连接
3. 检查IP地址是否正确（默认 `10.21.31.103`）
4. 查看后端日志了解详细错误信息

### 命令无响应
1. 检查连接状态
2. 查看通信日志
3. 检查M20机器狗状态

## 日志输出

### 前端日志
- 在页面底部"通信日志"面板中显示
- 包括发送命令、接收响应、错误信息

### 后端日志
- 在控制台输出
- 包括连接状态、命令处理、错误信息

## 开发说明

### 添加新命令

1. 在 `m20Protocol.js` 中添加构建方法
2. 在 `server.js` 中添加处理方法
3. 在 `index.html` 中添加前端按钮和事件处理

### 修改协议

编辑 `m20Protocol.js` 中的命令码和参数

## 许可证

MIT
