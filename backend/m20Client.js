/**
 * M20 Robot Dog TCP Client
 * 处理与M20机器狗的TCP连接和通信
 */

const net = require('net');
const M20Protocol = require('./m20Protocol');

class M20Client {
    constructor(options = {}) {
        this.host = options.host || '10.21.31.103';
        this.port = options.port || 30001; // TCP端口
        this.socket = null;
        this.protocol = new M20Protocol();
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.reconnectDelay = 2000; // 2秒重试一次
        this.reconnectTimer = null;
        this.heartbeatTimer = null;
        this.heartbeatInterval = 5000; // 5秒心跳
        this.receiveBuffer = Buffer.alloc(0);
        this.callbacks = {};
        this.statusUpdateCallback = null;
        this.connectionChangeCallback = null;
    }

    /**
     * 连接到M20机器狗
     */
    connect() {
        return new Promise((resolve, reject) => {
            console.log(`[M20Client] 正在连接到 ${this.host}:${this.port}...`);

            this.socket = net.createConnection({
                host: this.host,
                port: this.port
            });

            this.socket.on('connect', () => {
                this.isConnected = true;
                this.reconnectAttempts = 0;
                console.log(`[M20Client] ✓ 已连接到M20机器狗`);
                if (this.connectionChangeCallback) {
                    this.connectionChangeCallback(true);
                }
                this.startHeartbeat();
                resolve();
            });

            this.socket.on('data', (data) => {
                this.handleData(data);
            });

            this.socket.on('error', (error) => {
                console.error(`[M20Client] 连接错误: ${error.message}`);
                if (!this.isConnected) {
                    // 连接阶段的错误，直接reject
                    reject(error);
                } else {
                    // 连接成功后的错误，标记为断开并尝试重连
                    this.isConnected = false;
                    if (this.connectionChangeCallback) {
                        this.connectionChangeCallback(false);
                    }
                    this.stopHeartbeat();
                    this.attemptReconnect();
                }
            });

            this.socket.on('close', () => {
                console.log(`[M20Client] ✗ 连接已断开`);
                this.isConnected = false;
                if (this.connectionChangeCallback) {
                    this.connectionChangeCallback(false);
                }
                this.stopHeartbeat();
                this.attemptReconnect();
            });

            this.socket.on('timeout', () => {
                console.error(`[M20Client] 连接超时`);
                this.socket.destroy();
            });
        });
    }

    /**
     * 断开连接
     */
    disconnect() {
        this.stopHeartbeat();
        clearTimeout(this.reconnectTimer);
        if (this.socket) {
            this.socket.destroy();
            this.socket = null;
        }
        this.isConnected = false;
        this.reconnectAttempts = 0;
    }

    /**
     * 尝试重新连接
     */
    attemptReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error(`[M20Client] 已达到最大重连次数(${this.maxReconnectAttempts})，停止重连`);
            return;
        }

        this.reconnectAttempts++;
        const delay = this.reconnectDelay; // 固定2秒
        console.log(`[M20Client] ${delay / 1000}秒后进行第${this.reconnectAttempts}次重连...`);

        this.reconnectTimer = setTimeout(() => {
            this.connect().catch(err => {
                console.error(`[M20Client] 重连失败: ${err.message}`);
            });
        }, delay);
    }

    /**
     * 处理接收到的数据
     * TCP是流协议，数据可能分片到达或多条消息粘包，需正确处理
     */
    handleData(data) {
        this.receiveBuffer = Buffer.concat([this.receiveBuffer, data]);

        // 循环解析，一次data事件可能包含多个APDU
        while (this.receiveBuffer.length >= this.protocol.HEADER_SIZE) {
            const result = this.protocol.parseAPDU(this.receiveBuffer);

            if (!result.valid) {
                if (result.error === '数据不完整') {
                    // 正常情况：TCP分片，头部已到达但ASDU尚未完整
                    // 不丢弃数据，等待下次data事件带来后续数据
                    break;
                }

                // 真正的错误：协议头不匹配或JSON解析失败
                // 需要在缓冲区中查找下一个有效的4字节协议头来重新对齐
                console.error(`[M20Client] 解析错误: ${result.error}`);
                const nextHeaderPos = this._findNextHeader(this.receiveBuffer, 1);
                if (nextHeaderPos > 0) {
                    console.warn(`[M20Client] 跳过 ${nextHeaderPos} 字节，尝试重新对齐`);
                    this.receiveBuffer = this.receiveBuffer.slice(nextHeaderPos);
                } else {
                    // 缓冲区中没有找到有效协议头，清空等待新数据
                    this.receiveBuffer = Buffer.alloc(0);
                    break;
                }
                continue; // 重新尝试解析
            }

            // 成功解析完整的APDU
            this.handleResponse(result.asdu);

            // 移除已处理的数据
            this.receiveBuffer = this.receiveBuffer.slice(result.totalLength);
        }

        // 防止缓冲区无限增长（异常保护）
        if (this.receiveBuffer.length > 1024 * 1024) {
            console.error(`[M20Client] 缓冲区过大(${this.receiveBuffer.length}字节)，清空`);
            this.receiveBuffer = Buffer.alloc(0);
        }
    }

    /**
     * 在缓冲区中查找下一个完整的4字节协议头 [0xEB, 0x91, 0xEB, 0x90]
     * @param {Buffer} buffer - 搜索的缓冲区
     * @param {number} startOffset - 起始搜索位置
     * @returns {number} 找到的位置，未找到返回 -1
     */
    _findNextHeader(buffer, startOffset) {
        const header = this.protocol.PROTOCOL_HEADER;
        for (let i = startOffset; i <= buffer.length - 4; i++) {
            if (buffer[i] === header[0] &&
                buffer[i + 1] === header[1] &&
                buffer[i + 2] === header[2] &&
                buffer[i + 3] === header[3]) {
                return i;
            }
        }
        return -1;
    }

    /**
     * 处理响应
     */
    handleResponse(asdu) {
        // 这里可以根据CommandCode处理不同的响应
        if (this.statusUpdateCallback) {
            this.statusUpdateCallback(asdu);
        }
    }

    /**
     * 发送命令
     */
    send(buffer) {
        if (!this.isConnected || !this.socket) {
            console.error(`[M20Client] 未连接到M20机器狗`);
            return false;
        }

        try {
            this.socket.write(buffer);
            console.log(`[M20Client] 已发送命令 (${buffer.length}字节)`);
            return true;
        } catch (error) {
            console.error(`[M20Client] 发送失败: ${error.message}`);
            return false;
        }
    }

    /**
     * 启动心跳
     */
    startHeartbeat() {
        this.stopHeartbeat();
        this.heartbeatTimer = setInterval(() => {
            if (this.isConnected) {
                const heartbeat = this.protocol.buildHeartbeat();
                this.send(heartbeat);
            }
        }, this.heartbeatInterval);
    }

    /**
     * 停止心跳
     */
    stopHeartbeat() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }

    /**
     * 设置状态更新回调
     */
    onStatusUpdate(callback) {
        this.statusUpdateCallback = callback;
    }

    /**
     * 设置连接状态变化回调
     */
    onConnectionChange(callback) {
        this.connectionChangeCallback = callback;
    }
}

module.exports = M20Client;
