/**
 * M20 Robot Dog Controller Backend Server
 * WebSocket服务器，连接前端和M20机器狗
 */

const WebSocket = require('ws');
const M20Client = require('./m20Client');
const M20Protocol = require('./m20Protocol');

class ControllerServer {
    constructor(options = {}) {
        this.wsPort = options.wsPort || 8080;
        this.m20Host = options.m20Host || '10.21.31.103';
        this.m20Port = options.m20Port || 30001;
        this.wss = null;
        this.m20Client = null;
        this.protocol = new M20Protocol();
        this.clients = new Set();
    }

    /**
     * 启动服务器
     */
    async start() {
        try {
            // 创建WebSocket服务器
            this.wss = new WebSocket.Server({ port: this.wsPort });
            console.log(`[Server] WebSocket服务器已启动，监听端口 ${this.wsPort}`);

            this.wss.on('connection', (ws) => {
                console.log(`[Server] 新客户端连接`);
                this.clients.add(ws);

                ws.on('message', (message) => {
                    this.handleClientMessage(ws, message);
                });

                ws.on('close', () => {
                    console.log(`[Server] 客户端断开连接`);
                    this.clients.delete(ws);
                });

                ws.on('error', (error) => {
                    console.error(`[Server] WebSocket错误: ${error.message}`);
                });

                // 发送连接成功消息
                ws.send(JSON.stringify({
                    type: 'connected',
                    message: '已连接到控制服务器'
                }));

                // 发送当前M20连接状态
                if (this.m20Client && this.m20Client.isConnected) {
                    ws.send(JSON.stringify({
                        type: 'robot_connected',
                        message: '已连接到M20机器狗'
                    }));
                }
            });

            // 初始化M20客户端
            this.initM20Client();

            console.log(`[Server] 控制服务器已启动`);
        } catch (error) {
            console.error(`[Server] 启动失败: ${error.message}`);
            throw error;
        }
    }

    /**
     * 初始化M20客户端
     */
    initM20Client() {
        if (this.m20Client) {
            this.m20Client.disconnect();
        }

        this.m20Client = new M20Client({
            host: this.m20Host,
            port: this.m20Port
        });

        // 设置状态更新回调
        this.m20Client.onStatusUpdate((asdu) => {
            const parsed = this.protocol.parseStatusReport(asdu);
            if (!parsed) {
                // 无法解析，透传原始数据
                this.broadcastToClients({
                    type: 'robot_status',
                    category: 'raw',
                    data: asdu
                });
                return;
            }

            // 忽略心跳响应
            if (parsed.category === 'heartbeat') {
                return;
            }

            // 命令响应单独处理
            if (parsed.category === 'command_response') {
                this.broadcastToClients({
                    type: 'command_response',
                    data: parsed.data,
                    commandType: parsed.type,
                    command: parsed.command
                });
                return;
            }

            // 主动上报的状态数据
            this.broadcastToClients({
                type: 'robot_status',
                category: parsed.category,
                command: parsed.command,
                data: parsed.data
            });
        });

        // 设置连接状态变化回调
        this.m20Client.onConnectionChange((connected) => {
            if (connected) {
                console.log(`[Server] M20已连接`);
                this.broadcastToClients({
                    type: 'robot_connected',
                    message: `已连接到M20机器狗 (${this.m20Host}:${this.m20Port})`
                });
            } else {
                console.log(`[Server] M20已断开`);
                this.broadcastToClients({
                    type: 'robot_disconnected',
                    message: `M20机器狗连接已断开`
                });
            }
        });

        // 连接到M20
        this.connectToM20();
    }

    /**
     * 连接到M20
     */
    connectToM20() {
        this.m20Client.connect()
            .then(() => {
                console.log(`[Server] 已连接到M20 (${this.m20Host}:${this.m20Port})`);
            })
            .catch(error => {
                console.error(`[Server] 连接M20失败: ${error.message}`);
            });
    }

    /**
     * 处理客户端消息
     */
    handleClientMessage(ws, message) {
        try {
            const data = JSON.parse(message);
            console.log(`[Server] 收到客户端消息:`, data.type);

            switch (data.type) {
                case 'config_m20':
                    this.handleM20Config(data);
                    break;

                case 'heartbeat':
                    ws.send(JSON.stringify({ type: 'heartbeat_ack' }));
                    break;

                case 'motion_control':
                    this.handleMotionControl(data.action);
                    break;

                case 'usage_mode':
                    this.handleUsageModeSwitch(data.mode);
                    break;

                case 'axis_control':
                    this.handleAxisControl(data.axes);
                    break;

                case 'gait_switch':
                    this.handleGaitSwitch(data.gait);
                    break;

                case 'light_control':
                    this.handleLightControl(data.light, data.state);
                    break;

                case 'nav_task':
                    this.handleNavTask(data.payload);
                    break;

                case 'nav_cancel':
                    this.handleNavCancel();
                    break;

                case 'init_localize':
                    this.handleInitLocalize(data.payload);
                    break;

                case 'charge_start':
                    this.handleChargeControl(true);
                    break;

                case 'charge_stop':
                    this.handleChargeControl(false);
                    break;

                default:
                    console.warn(`[Server] 未知的消息类型: ${data.type}`);
            }
        } catch (error) {
            console.error(`[Server] 消息处理错误: ${error.message}`);
        }
    }

    /**
     * 处理M20配置
     */
    handleM20Config(data) {
        const newHost = data.host || this.m20Host;
        const newPort = data.port || this.m20Port;

        if (newHost !== this.m20Host || newPort !== this.m20Port) {
            console.log(`[Server] M20配置已更新: ${newHost}:${newPort}`);
            this.m20Host = newHost;
            this.m20Port = newPort;
            this.initM20Client();
        }
    }

    /**
     * 处理运动控制
     */
    handleMotionControl(action) {
        if (!this.m20Client.isConnected) {
            this.broadcastToClients({
                type: 'error',
                message: '未连接到M20机器狗'
            });
            return;
        }

        const buffer = this.protocol.buildMotionControl(action);
        this.m20Client.send(buffer);
        console.log(`[Server] 已发送运动控制命令: ${action}`);
    }

    /**
     * 处理步态切换
     */
    handleGaitSwitch(gait) {
        if (!this.m20Client.isConnected) {
            this.broadcastToClients({
                type: 'error',
                message: '未连接到M20机器狗'
            });
            return;
        }

        const buffer = this.protocol.buildGaitSwitch(gait);
        this.m20Client.send(buffer);
        console.log(`[Server] 已发送步态切换命令: ${gait}`);
    }

    /**
     * 处理灯光控制
     */
    handleLightControl(light, state) {
        if (!this.m20Client.isConnected) {
            this.broadcastToClients({
                type: 'error',
                message: '未连接到M20机器狗'
            });
            return;
        }

        const buffer = this.protocol.buildLightControl(light, state);
        this.m20Client.send(buffer);
        console.log(`[Server] 已发送灯光控制命令: ${light} ${state ? 'ON' : 'OFF'}`);
    }

    /**
     * 处理使用模式切换
     */
    handleUsageModeSwitch(mode) {
        if (!this.m20Client.isConnected) {
            this.broadcastToClients({
                type: 'error',
                message: '未连接到M20机器狗'
            });
            return;
        }

        const modeNames = { 0: '常规', 1: '导航', 2: '辅助' };
        const buffer = this.protocol.buildUsageModeSwitch(mode);
        this.m20Client.send(buffer);
        console.log(`[Server] 已发送使用模式切换命令: ${modeNames[mode] || mode}`);
    }

    /**
     * 处理轴控制（摇杆）
     */
    handleAxisControl(axes) {
        if (!this.m20Client.isConnected) return;

        const buffer = this.protocol.buildAxisControl(axes);
        this.m20Client.send(buffer);
    }

    /**
     * 处理导航任务
     */
    handleNavTask(navTask) {
        if (!this.m20Client.isConnected) {
            this.broadcastToClients({
                type: 'error',
                message: '未连接到M20机器狗'
            });
            return;
        }

        const buffer = this.protocol.buildNavTask(navTask);
        this.m20Client.send(buffer);
        console.log(`[Server] 已发送导航任务`);
    }

    /**
     * 处理取消导航
     */
    handleNavCancel() {
        if (!this.m20Client.isConnected) {
            this.broadcastToClients({
                type: 'error',
                message: '未连接到M20机器狗'
            });
            return;
        }

        const buffer = this.protocol.buildNavCancel();
        this.m20Client.send(buffer);
        console.log(`[Server] 已发送取消导航命令`);
    }

    /**
     * 处理初始化定位
     */
    handleInitLocalize(localize) {
        if (!this.m20Client.isConnected) {
            this.broadcastToClients({
                type: 'error',
                message: '未连接到M20机器狗'
            });
            return;
        }

        const buffer = this.protocol.buildInitLocalize(localize);
        this.m20Client.send(buffer);
        console.log(`[Server] 已发送初始化定位命令`);
    }

    /**
     * 处理充电控制
     */
    handleChargeControl(start) {
        if (!this.m20Client.isConnected) {
            this.broadcastToClients({
                type: 'error',
                message: '未连接到M20机器狗'
            });
            return;
        }

        const buffer = this.protocol.buildChargeControl(start);
        this.m20Client.send(buffer);
        console.log(`[Server] 已发送充电控制命令: ${start ? '开始' : '停止'}`);
    }

    /**
     * 广播消息到所有客户端
     */
    broadcastToClients(message) {
        const data = JSON.stringify(message);
        this.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(data);
            }
        });
    }

    /**
     * 停止服务器
     */
    stop() {
        if (this.m20Client) {
            this.m20Client.disconnect();
        }
        if (this.wss) {
            this.wss.close();
        }
        console.log(`[Server] 服务器已停止`);
    }
}

// 启动服务器
const server = new ControllerServer({
    wsPort: 8080,
    m20Host: '10.21.31.103',
    m20Port: 30001
});

server.start().catch(error => {
    console.error(`[Server] 启动失败: ${error.message}`);
    process.exit(1);
});

// 优雅关闭
process.on('SIGINT', () => {
    console.log(`\n[Server] 正在关闭...`);
    server.stop();
    process.exit(0);
});

module.exports = server;
