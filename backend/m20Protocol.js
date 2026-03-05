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
     * 生成当前时间字符串，格式：YYYY-MM-DD HH:MM:SS
     */
    generateCurrentTime() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
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
            PatrolDevice: {
                Type: 100,
                Command: 100,
                Time: this.generateCurrentTime(),
                Items: {}
            }
        };
        return this.buildAPDU(asdu);
    }

    /**
     * 构建使用模式切换指令 (1.2.2)
     * @param {number} mode - 常规=0, 导航=1, 辅助=2
     */
    buildUsageModeSwitch(mode) {
        const asdu = {
            PatrolDevice: {
                Type: 1101,
                Command: 5,
                Time: this.generateCurrentTime(),
                Items: {
                    Mode: mode
                }
            }
        };
        return this.buildAPDU(asdu);
    }

    /**
     * 构建运动状态转换指令 (1.2.3)
     * @param {string} action - 动作: stand/walk/down/damping/idle
     */
    buildMotionControl(action) {
        // 协议定义: 空闲=0, 站立=1, 关节阻尼/软急停=2, 开机阻尼=3, 趴下=4, 标准运动模式=6
        const actionMap = {
            'idle': 0,
            'stand': 1,
            'damping': 2,
            'down': 4,
            'walk': 6
        };

        const asdu = {
            PatrolDevice: {
                Type: 2,
                Command: 22,
                Time: this.generateCurrentTime(),
                Items: {
                    MotionParam: actionMap[action] != null ? actionMap[action] : 0
                }
            }
        };
        return this.buildAPDU(asdu);
    }

    /**
     * 构建步态切换指令 (1.2.4)
     * @param {number} gaitParam - 基础(标准)=1, 平地(敏捷)=12, 楼梯(敏捷)=13, 楼梯(标准)=14
     */
    buildGaitSwitch(gaitParam) {
        const asdu = {
            PatrolDevice: {
                Type: 2,
                Command: 23,
                Time: this.generateCurrentTime(),
                Items: {
                    GaitParam: parseInt(gaitParam)
                }
            }
        };
        return this.buildAPDU(asdu);
    }

    /**
     * 构建运动控制轴指令 (1.2.5)
     * @param {Object} axes - {X, Y, Z, Roll, Pitch, Yaw} 范围 [-1, 1]
     */
    buildAxisControl(axes) {
        const asdu = {
            PatrolDevice: {
                Type: 2,
                Command: 21,
                Time: this.generateCurrentTime(),
                Items: {
                    X: axes.X || 0.0,
                    Y: axes.Y || 0.0,
                    Z: axes.Z || 0.0,
                    Roll: axes.Roll || 0.0,
                    Pitch: axes.Pitch || 0.0,
                    Yaw: axes.Yaw || 0.0
                }
            }
        };
        return this.buildAPDU(asdu);
    }

    /**
     * 构建灯光控制指令 (1.2.6)
     * @param {string} light - 灯光位置: front/rear
     * @param {boolean} state - 开关状态
     */
    buildLightControl(light, state) {
        // 获取当前灯光状态并只修改指定的灯
        const front = light === 'front' ? (state ? 1 : 0) : 0;
        const back = light === 'rear' ? (state ? 1 : 0) : 0;
        const asdu = {
            PatrolDevice: {
                Type: 1101,
                Command: 2,
                Time: this.generateCurrentTime(),
                Items: {
                    Front: front,
                    Back: back
                }
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
            PatrolDevice: {
                Type: 1101,
                Command: 1,
                Time: this.generateCurrentTime(),
                Items: navTask
            }
        };
        return this.buildAPDU(asdu);
    }

    /**
     * 构建取消导航指令
     */
    buildNavCancel() {
        const asdu = {
            PatrolDevice: {
                Type: 1101,
                Command: 3,
                Time: this.generateCurrentTime(),
                Items: {}
            }
        };
        return this.buildAPDU(asdu);
    }

    /**
     * 构建初始化定位指令
     * @param {Object} localize - 定位参数 {x, y, yaw}
     */
    buildInitLocalize(localize) {
        const asdu = {
            PatrolDevice: {
                Type: 1101,
                Command: 4,
                Time: this.generateCurrentTime(),
                Items: {
                    PosX: localize.x,
                    PosY: localize.y,
                    AngleYaw: localize.yaw
                }
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
            PatrolDevice: {
                Type: 1101,
                Command: 5,
                Time: this.generateCurrentTime(),
                Items: {
                    Command: start ? 1 : 0
                }
            }
        };
        return this.buildAPDU(asdu);
    }

    // ========== 主动上报数据解析 (协议1.3节) ==========

    /**
     * 运动状态码映射
     */
    static MOTION_STATE_MAP = {
        0: '空闲', 1: '站立', 2: '关节阻尼/软急停', 3: '开机阻尼',
        4: '趴下', 6: '标准运动模式', 8: '敏捷运动模式'
    };

    /**
     * 步态码映射
     */
    static GAIT_MAP = {
        0: '未知', 1: '基础(标准)', 2: '高台(标准)',
        12: '平地(敏捷)', 13: '楼梯(敏捷)', 14: '楼梯(标准)'
    };

    /**
     * 充电状态映射
     */
    static CHARGE_STATE_MAP = {
        0: '空闲', 1: '前往充电桩', 2: '充电中',
        3: '退出充电桩', 4: '机器人异常', 5: '在桩上未充电'
    };

    /**
     * 使用模式映射
     */
    static USAGE_MODE_MAP = {
        0: '常规模式', 1: '导航模式', 2: '辅助模式'
    };

    /**
     * 避障状态映射
     */
    static OOA_MAP = {
        0: '未启动', 1: '空闲中', 2: '未触发避障', 3: '主动避障中'
    };

    /**
     * 解析主动上报的状态数据 (Type:1002)
     * @param {Object} asdu - 收到的ASDU数据
     * @returns {Object|null} 解析结果 {category, command, data} 或 null(非状态上报)
     */
    parseStatusReport(asdu) {
        const pd = asdu?.PatrolDevice;
        if (!pd) return null;

        const type = pd.Type;
        const command = pd.Command;
        const items = pd.Items || {};

        // 心跳响应 (Type:100, Command:100) - 忽略
        if (type === 100 && command === 100) {
            return { category: 'heartbeat', command, data: {} };
        }

        // 非状态上报 (非Type:1002) - 作为命令响应透传
        if (type !== 1002) {
            return { category: 'command_response', command, data: items, type };
        }

        // Type:1002 主动上报数据
        switch (command) {
            case 6: // 基础状态上报
                return this._parseBasicStatus(items);
            case 4: // 运控状态上报
                return this._parseMotionControlStatus(items);
            case 5: // 设备状态上报
                return this._parseDeviceStatus(items);
            case 3: // 异常状态上报
                return this._parseErrorStatus(items);
            default:
                return { category: 'unknown', command, data: items };
        }
    }

    /**
     * 解析基础状态 (Command:6)
     */
    _parseBasicStatus(items) {
        const bs = items.BasicStatus || {};
        return {
            category: 'basic_status',
            command: 6,
            data: {
                motionState: bs.MotionState,
                motionStateLabel: M20Protocol.MOTION_STATE_MAP[bs.MotionState] || `未知(${bs.MotionState})`,
                gait: bs.Gait,
                gaitLabel: M20Protocol.GAIT_MAP[bs.Gait] || `未知(${bs.Gait})`,
                charge: bs.Charge,
                chargeLabel: M20Protocol.CHARGE_STATE_MAP[bs.Charge] || `未知(${bs.Charge})`,
                hes: bs.HES,
                hesLabel: bs.HES === 1 ? '已触发' : '未触发',
                controlUsageMode: bs.ControlUsageMode,
                usageModeLabel: M20Protocol.USAGE_MODE_MAP[bs.ControlUsageMode] || `未知(${bs.ControlUsageMode})`,
                direction: bs.Direction,
                directionLabel: bs.Direction === 0 ? '正向' : '后向',
                ooa: bs.OOA,
                ooaLabel: M20Protocol.OOA_MAP[bs.OOA] || `未知(${bs.OOA})`,
                powerManagement: bs.PowerManagement,
                powerLabel: bs.PowerManagement === 0 ? '常规模式' : '单电池模式',
                sleep: bs.Sleep,
                sleepLabel: bs.Sleep ? '已休眠' : '未休眠',
                version: bs.Version || '--'
            }
        };
    }

    /**
     * 解析运控状态 (Command:4)
     */
    _parseMotionControlStatus(items) {
        const ms = items.MotionStatus || {};
        const motor = items.MotorStatus || {};
        return {
            category: 'motion_status',
            command: 4,
            data: {
                // 整机运动状态
                roll: ms.Roll,
                pitch: ms.Pitch,
                yaw: ms.Yaw,
                omegaZ: ms.OmegaZ,
                linearX: ms.LinearX,
                linearY: ms.LinearY,
                height: ms.Height,
                remainMile: ms.RemainMile,
                // 关节状态
                motorStatus: motor
            }
        };
    }

    /**
     * 解析设备状态 (Command:5)
     */
    _parseDeviceStatus(items) {
        const bat = items.BatteryStatus || {};
        const led = items.Led || {};
        const gps = items.GPS || {};
        const cpu = items.CPU || {};
        const devEnable = items.DevEnable || {};

        return {
            category: 'device_status',
            command: 5,
            data: {
                battery: {
                    voltageLeft: bat.VoltageLeft,
                    voltageRight: bat.VoltageRight,
                    levelLeft: bat.BatteryLevelLeft,
                    levelRight: bat.BatteryLevelRight,
                    tempLeft: bat.battery_temperatureLeft,
                    tempRight: bat.battery_temperatureRight,
                    chargeLeft: bat.chargeLeft,
                    chargeRight: bat.chargeRight
                },
                led: {
                    front: led.Fill?.Front,
                    back: led.Fill?.Back
                },
                gps: {
                    latitude: gps.Latitude,
                    longitude: gps.Longitude,
                    speed: gps.Speed,
                    course: gps.Course,
                    fixQuality: gps.FixQuality,
                    numSatellites: gps.NumSatellites,
                    altitude: gps.Altitude,
                    hdop: gps.HDOP,
                    vdop: gps.VDOP,
                    pdop: gps.PDOP,
                    visibleSatellites: gps.VisibleSatellites
                },
                cpu: {
                    aos: cpu.AOS || {},
                    nos: cpu.NOS || {},
                    gos: cpu.GOS || {}
                },
                devEnable: {
                    fanSpeed: devEnable.FanSpeed,
                    loadPower: devEnable.LoadPower,
                    lidarFront: devEnable.Lidar?.Front,
                    lidarBack: devEnable.Lidar?.Back,
                    gpsPower: devEnable.GPS,
                    videoFront: devEnable.Video?.Front,
                    videoBack: devEnable.Video?.Back
                }
            }
        };
    }

    /**
     * 解析异常状态 (Command:3)
     */
    _parseErrorStatus(items) {
        const errorList = items.ErrorList || [];
        return {
            category: 'error_status',
            command: 3,
            data: {
                errors: errorList.map(e => ({
                    errorCode: e.errorCode,
                    component: e.component
                })),
                hasError: errorList.length > 0
            }
        };
    }
}

module.exports = M20Protocol;
