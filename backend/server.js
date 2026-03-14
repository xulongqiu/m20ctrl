/**
 * M20 Robot Dog Controller Backend Server
 * WebSocket服务器，连接前端和M20机器狗
 */

const WebSocket = require('ws');
const { spawn, execSync, exec } = require('child_process');
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
        this.ffmpegAvailable = false;
        this.streams = new Map(); // camera_id -> { ffmpeg: process, wss: websocket_server }
    }

    /**
     * 启动服务器
     */
    async start() {
        try {
            // 检查ffmpeg是否可用
            this.checkFfmpeg();

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
                    message: '已连接到控制服务器',
                    ffmpegAvailable: this.ffmpegAvailable
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
     * 检查ffmpeg是否可用
     */
    checkFfmpeg() {
        try {
            execSync('ffmpeg -version', { stdio: 'ignore' });
            this.ffmpegAvailable = true;
            console.log('[Server] ✓ ffmpeg 已安装并可用');
        } catch (e) {
            this.ffmpegAvailable = false;
            console.warn('[Server] ✗ 警告: 未找到 ffmpeg，视频预览功能将不可用');
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

                case 'get_map_position':
                    this.handleGetMapPosition();
                    break;

                case 'get_nav_perception':
                    this.handleGetNavPerception();
                    break;

                case 'query_nav_status':
                    this.handleQueryNavTaskStatus();
                    break;

                case 'save_location':
                    this.handleSaveLocation(ws, data.payload);
                    break;

                case 'load_locations':
                    this.handleLoadLocations(ws);
                    break;

                case 'clear_locations':
                    this.handleClearLocations(ws);
                    break;
                
                case 'start_stream':
                    this.handleStartStream(ws, data.cameraId);
                    break;
                
                case 'stop_stream':
                    this.handleStopStream(data.cameraId);
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

        console.log(`[Server] 收到M20连接请求: ${newHost}:${newPort}`);
        
        // 即使配置相同，若用户手工点击也应当尝试重连
        this.m20Host = newHost;
        this.m20Port = newPort;

        // 如果已经有客户端，先断开
        if (this.m20Client) {
            this.m20Client.disconnect();
        }

        // 重新初始化并连接
        this.initM20Client();
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
     * 处理获取地图位置
     */
    handleGetMapPosition() {
        if (!this.m20Client.isConnected) {
            this.broadcastToClients({ type: 'error', message: '未连接到M20机器狗' });
            return;
        }
        const buffer = this.protocol.buildGetMapPosition();
        this.m20Client.send(buffer);
        console.log(`[Server] 已发送获取地图位置请求`);
    }

    /**
     * 处理获取导航感知状态
     */
    handleGetNavPerception() {
        if (!this.m20Client.isConnected) {
            this.broadcastToClients({ type: 'error', message: '未连接到M20机器狗' });
            return;
        }
        const buffer = this.protocol.buildGetNavPerception();
        this.m20Client.send(buffer);
        console.log(`[Server] 已发送获取导航感知状态请求`);
    }

    /**
     * 处理查询导航任务状态
     */
    handleQueryNavTaskStatus() {
        if (!this.m20Client.isConnected) {
            this.broadcastToClients({ type: 'error', message: '未连接到M20机器狗' });
            return;
        }
        const buffer = this.protocol.buildQueryNavTaskStatus();
        this.m20Client.send(buffer);
        console.log(`[Server] 已发送查询导航任务状态请求`);
    }

    /**
     * 处理保存位置点
     */
    handleSaveLocation(ws, location) {
        const fs = require('fs');
        const path = require('path');
        const filePath = path.join(__dirname, '..', 'data', 'locations.json');
        const dirPath = path.dirname(filePath);

        // 确保目录存在
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }

        // 读取现有数据
        let locations = [];
        try {
            if (fs.existsSync(filePath)) {
                locations = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            }
        } catch (e) {
            console.error(`[Server] 读取位置文件失败: ${e.message}`);
        }

        // 添加新位置
        const newLocation = {
            id: Date.now(),
            name: location.name || '未命名',
            mapId: location.mapId || 0,
            posX: location.posX || 0,
            posY: location.posY || 0,
            posZ: location.posZ || 0,
            yaw: location.yaw || 0,
            createdAt: new Date().toISOString()
        };
        locations.push(newLocation);

        // 保存
        fs.writeFileSync(filePath, JSON.stringify(locations, null, 2), 'utf-8');
        console.log(`[Server] 已保存位置点: ${newLocation.name}`);

        // 广播更新后的列表
        this.broadcastToClients({ type: 'locations_updated', data: locations });
    }

    /**
     * 处理加载位置点
     */
    handleLoadLocations(ws) {
        const fs = require('fs');
        const path = require('path');
        const filePath = path.join(__dirname, '..', 'data', 'locations.json');

        let locations = [];
        try {
            if (fs.existsSync(filePath)) {
                locations = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            }
        } catch (e) {
            console.error(`[Server] 读取位置文件失败: ${e.message}`);
        }

        ws.send(JSON.stringify({ type: 'locations_updated', data: locations }));
    }

    /**
     * 处理清空位置点
     */
    handleClearLocations(ws) {
        const fs = require('fs');
        const path = require('path');
        const filePath = path.join(__dirname, '..', 'data', 'locations.json');

        try {
            fs.writeFileSync(filePath, '[]', 'utf-8');
        } catch (e) {
            console.error(`[Server] 清空位置文件失败: ${e.message}`);
        }

        console.log(`[Server] 已清空所有位置点`);
        this.broadcastToClients({ type: 'locations_updated', data: [] });
    }

    /**
     * 获取视频流分辨率 (使用 ffprobe)
     */
    async getStreamResolution(url) {
        return new Promise((resolve) => {
            const cmd = `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "${url}"`;
            exec(cmd, { timeout: 3000 }, (error, stdout) => {
                if (error || !stdout) {
                    console.warn(`[Server] ffprobe 无法获取分辨率, 使用默认值: ${error?.message || 'timeout/no output'}`);
                    resolve({ width: 640, height: 480 });
                    return;
                }
                const parts = stdout.trim().split('x');
                if (parts.length === 2) {
                    const width = parseInt(parts[0]);
                    const height = parseInt(parts[1]);
                    console.log(`[Server] 检测到分辨率: ${width}x${height}`);
                    resolve({ width, height });
                } else {
                    resolve({ width: 640, height: 480 });
                }
            });
        });
    }

    /**
     * 处理开始视频流
     */
    async handleStartStream(ws, cameraId) {
        if (!this.ffmpegAvailable) {
            ws.send(JSON.stringify({ type: 'stream_error', cameraId, message: 'ffmpeg 未就绪' }));
            return;
        }

        if (this.streams.has(cameraId)) {
            console.log(`[Server] 流 ${cameraId} 已经启动`);
            // 重发一次已启动的消息，方便 UI 状态同步
            const existing = this.streams.get(cameraId);
            ws.send(JSON.stringify({ 
                type: 'stream_started', 
                cameraId, 
                streamUrl: `ws://localhost:${existing.port}`,
                width: existing.width,
                height: existing.height
            }));
            return;
        }

        const rtspUrl = cameraId === 'front' 
            ? `rtsp://${this.m20Host}:8554/video1` 
            : `rtsp://${this.m20Host}:8554/video2`;
        
        // 1. 尝试获取分辨率
        const { width, height } = await this.getStreamResolution(rtspUrl);
        
        // 分配动态端口给每个相机的 WebSocket 推流器
        const streamPort = cameraId === 'front' ? 8081 : 8082;
        
        console.log(`[Server] 正在启动流 ${cameraId}: ${rtspUrl} -> ws://localhost:${streamPort} (${width}x${height})`);

        const videoWss = new WebSocket.Server({ port: streamPort });
        videoWss.on('connection', (socket) => {
            console.log(`[Server] JSMpeg 客户端连接到流 ${cameraId}`);
            socket.on('close', () => console.log(`[Server] JSMpeg 客户端断开流 ${cameraId}`));
        });

        // 重新设计: ffmpeg 输出到 stdout, 我们通过 ws 广播
        // 移除宽度限制，根据用户要求使用原始分辨率转发
        const ffmpegProcess = spawn('ffmpeg', [
            '-rtsp_transport', 'tcp',
            '-i', rtspUrl,
            '-f', 'mpegts',
            '-codec:v', 'mpeg1video',
            '-s', `${width}x${height}`, // 使用原始探测到的分辨率
            '-b:v', '2000k', // 增加码率以保证高分辨率下的画质
            '-r', '25',
            '-bf', '0',
            '-' // 輸出到 stdout
        ]);

        ffmpegProcess.stdout.on('data', (data) => {
            videoWss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(data);
                }
            });
        });

        ffmpegProcess.stderr.on('data', (data) => {
            // 将 ffmpeg 的日志输出到服务器控制台，方便调试
            process.stderr.write(`[FFmpeg ${cameraId}] ${data.toString()}`);
        });

        ffmpegProcess.on('error', (err) => {
            console.error(`[Server] ffmpeg 错误 (${cameraId}):`, err);
            this.broadcastToClients({ type: 'stream_error', cameraId, message: `FFmpeg 进程错误: ${err.message}` });
        });

        ffmpegProcess.on('exit', (code) => {
            console.log(`[Server] ffmpeg 退出 (${cameraId}) 代码:`, code);
            if (code !== 0 && code !== null) {
                // 如果不是正常退出（且不是被 kill 掉的，kill 掉通常是 null 或 0）
                this.broadcastToClients({ type: 'stream_error', cameraId, message: `视频流异常退出 (Exit Code: ${code})` });
            }
        });

        this.streams.set(cameraId, {
            ffmpeg: ffmpegProcess,
            wss: videoWss,
            port: streamPort,
            width,
            height
        });

        this.broadcastToClients({ 
            type: 'stream_started', 
            cameraId, 
            streamUrl: `ws://localhost:${streamPort}`,
            width,
            height
        });
    }

    /**
     * 处理停止视频流
     */
    handleStopStream(cameraId) {
        const stream = this.streams.get(cameraId);
        if (stream) {
            console.log(`[Server] 停止流 ${cameraId}`);
            stream.ffmpeg.kill('SIGINT');
            stream.wss.close();
            this.streams.delete(cameraId);
            this.broadcastToClients({ type: 'stream_stopped', cameraId });
        }
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
        // 停止所有视频流
        for (const cameraId of this.streams.keys()) {
            this.handleStopStream(cameraId);
        }
        
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
