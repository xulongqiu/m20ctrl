/**
 * M20 Robot Dog Protocol Handler
 * 处理与M20机器狗的TCP/UDP通信协议
 */

class M20Protocol {
    constructor() {
        this.PROTOCOL_HEADER = Buffer.from([0xEB, 0x91, 0xEB, 0x90]);
        this.HEADER_SIZE = 16;
        this.messageID = 0;
    }

    /**
     * 生成消息ID
     */
    generateMessageID() {
        this.messageID = (this.messageID + 1) % 65536;
        return this.messageID;
    }

    /**
     * 构建APDU（应用协议数据单元）
     * @param {Object} asdu - 应用服务数据单元
     * @returns {Buffer} 完整的APDU
     */
    buildAPDU(asdu) {
        const asduBuffer = Buffer.from(JSON.stringify(asdu), 'utf-8');
        const asduLength = asduBuffer.length;

        // 创建16字节头部
        const header = Buffer.alloc(16);

        // 字节0-3: 协议头标识
        this.PROTOCOL_HEADER.copy(header, 0);

        // 字节4-5: ASDU长度（小端字节序）
        header.writeUInt16LE(asduLength, 4);

        // 字节6-7: 消息ID
        header.writeUInt16LE(this.generateMessageID(), 6);

        // 字节8: 数据格式标志（0x01 = JSON）
        header.writeUInt8(0x01, 8);

        // 字节9-15: 预留（填充0）
        // 已在alloc时初始化为0

        return Buffer.concat([header, asduBuffer]);
    }

    /**
     * 解析APDU
     * @param {Buffer} buffer - 接收到的数据
     * @returns {Object} 解析结果 {header, asdu, valid}
     */
    parseAPDU(buffer) {
        if (buffer.length < this.HEADER_SIZE) {
            return { valid: false, error: '数据长度不足' };
        }

        // 验证协议头
        if (!buffer.slice(0, 4).equals(this.PROTOCOL_HEADER)) {
            return { valid: false, error: '协议头不匹配' };
        }

        // 解析头部
        const asduLength = buffer.readUInt16LE(4);
        const messageID = buffer.readUInt16LE(6);
        const dataFormat = buffer.readUInt8(8);

        if (buffer.length < this.HEADER_SIZE + asduLength) {
            return { valid: false, error: '数据不完整' };
        }

        // 解析ASDU
        let asdu = null;
        try {
            const asduBuffer = buffer.slice(this.HEADER_SIZE, this.HEADER_SIZE + asduLength);
            asdu = JSON.parse(asduBuffer.toString('utf-8'));
        } catch (e) {
            return { valid: false, error: 'ASDU解析失败: ' + e.message };
        }

        return {
            valid: true,
            header: {
                messageID,
                dataFormat,
                asduLength
            },
            asdu,
            totalLength: this.HEADER_SIZE + asduLength
        };
    }

    /**
     * 构建心跳指令
     */
    buildHeartbeat() {
        const asdu = {
            CommandCode: '0x0001',
            Items: {}
        };
        return this.buildAPDU(asdu);
    }

    /**
     * 构建运动控制指令
     * @param {string} action - 动作: stand/walk/down
     */
    buildMotionControl(action) {
        const actionMap = {
            'stand': 0,
            'walk': 1,
            'down': 2
        };

        const asdu = {
            CommandCode: '0x0101',
            Items: {
                Value: actionMap[action] || 0
            }
        };
        return this.buildAPDU(asdu);
    }

    /**
     * 构建步态切换指令
     * @param {string} gait - 步态编码
     */
    buildGaitSwitch(gait) {
        const asdu = {
            CommandCode: '0x0102',
            Items: {
                Value: parseInt(gait, 16)
            }
        };
        return this.buildAPDU(asdu);
    }

    /**
     * 构建灯光控制指令
     * @param {string} light - 灯光: front/rear
     * @param {boolean} state - 状态
     */
    buildLightControl(light, state) {
        const lightMap = {
            'front': 0,
            'rear': 1
        };

        const asdu = {
            CommandCode: '0x0201',
            Items: {
                Light: lightMap[light] || 0,
                State: state ? 1 : 0
            }
        };
        return this.buildAPDU(asdu);
    }

    /**
     * 构建导航任务指令
     * @param {Object} navTask - 导航任务参数
     */
    buildNavTask(navTask) {
        const asdu = {
            CommandCode: '0x0301',
            Items: navTask
        };
        return this.buildAPDU(asdu);
    }

    /**
     * 构建取消导航指令
     */
    buildNavCancel() {
        const asdu = {
            CommandCode: '0x0302',
            Items: {}
        };
        return this.buildAPDU(asdu);
    }

    /**
     * 构建初始化定位指令
     * @param {Object} localize - 定位参数 {x, y, yaw}
     */
    buildInitLocalize(localize) {
        const asdu = {
            CommandCode: '0x0303',
            Items: {
                PosX: localize.x,
                PosY: localize.y,
                AngleYaw: localize.yaw
            }
        };
        return this.buildAPDU(asdu);
    }

    /**
     * 构建充电控制指令
     * @param {boolean} start - true开始，false停止
     */
    buildChargeControl(start) {
        const asdu = {
            CommandCode: '0x0401',
            Items: {
                Command: start ? 1 : 0
            }
        };
        return this.buildAPDU(asdu);
    }
}

module.exports = M20Protocol;
