# M20机器狗通信协议文档

## 1. 协议概述

M20机器狗采用基于TCP/UDP的自定义应用层协议进行通信。协议采用请求/响应机制，支持JSON和XML两种数据格式（推荐使用JSON）。

### 1.1 连接信息

| 项目 | 值 |
|------|-----|
| 机器狗IP | 10.21.31.103 |
| TCP端口 | 30001 |
| UDP端口 | 30000 |
| 推荐协议 | TCP + JSON |

### 1.2 协议特点

- 基于APDU（应用协议数据单元）
- 固定16字节头部 + 可变长度ASDU
- 支持消息ID匹配请求/响应对应关系
- 心跳保活机制
- 完整的错误码体系

---

## 2. APDU结构

### 2.1 协议头部（16字节固定）

| 字节位置 | 字段 | 长度 | 说明 |
|---------|------|------|------|
| 0-1 | 协议头标识1 | 2字节 | 固定值 0xEB91 |
| 2-3 | 协议头标识2 | 2字节 | 固定值 0xEB90 |
| 4-5 | ASDU长度 | 2字节 | 小端字节序，ASDU数据长度 |
| 6-7 | 消息ID | 2字节 | 用于匹配请求/响应 |
| 8 | 数据格式标志 | 1字节 | 0x00=XML, 0x01=JSON |
| 9-15 | 预留 | 7字节 | 填充0 |

### 2.2 ASDU结构（JSON格式）

```json
{
  "CommandCode": "0x0001",
  "Items": {
    "param1": "value1",
    "param2": "value2"
  }
}
```

### 2.3 完整APDU示例

```
协议头(16字节) + ASDU(JSON)
```

---

## 3. 命令类型

### 3.1 心跳指令

**功能**: 保活连接，检测连接状态

**命令码**: 0x0001

**请求**:
```json
{
  "CommandCode": "0x0001",
  "Items": {}
}
```

**响应**: 机器狗会回复相同格式的心跳应答

**发送频率**: 建议5秒一次

---

### 3.2 运动控制

#### 3.2.1 转换运动状态

**功能**: 切换机器狗的运动状态（站立/行走/趴下）

**命令码**: 0x0101

**参数**:

| 参数 | 类型 | 说明 |
|------|------|------|
| Value | int | 运动状态编码 |

**运动状态编码**:

| 编码 | 状态 | 说明 |
|------|------|------|
| 0 | 站立 | Stand |
| 1 | 行走 | Walk |
| 2 | 趴下 | Down |

**请求示例**:
```json
{
  "CommandCode": "0x0101",
  "Items": {
    "Value": 1
  }
}
```

#### 3.2.2 步态切换

**功能**: 切换机器狗的步态

**命令码**: 0x0102

**参数**:

| 参数 | 类型 | 说明 |
|------|------|------|
| Value | int | 步态编码（16进制） |

**步态编码**:

| 编码 | 步态 | 运动模式 | 说明 |
|------|------|---------|------|
| 0x1001 | 基础 | 标准运动模式 | 基础步态 |
| 0x1002 | 高台 | 标准运动模式 | 高台步态 |
| 0x1003 | 楼梯 | 标准运动模式 | 楼梯步态 |
| 0x3002 | 平地 | 敏捷运动模式 | 平地步态（性能更优） |
| 0x3003 | 楼梯 | 敏捷运动模式 | 楼梯步态（性能更优） |

**请求示例**:
```json
{
  "CommandCode": "0x0102",
  "Items": {
    "Value": 0x3002
  }
}
```

#### 3.2.3 运动控制（虚拟摇杆）

**功能**: 实时控制机器狗的平移和旋转

**命令码**: 0x0103

**参数**:

| 参数 | 类型 | 范围 | 说明 |
|------|------|------|------|
| X | float | -1.0 ~ 1.0 | 前后移动，正值前进 |
| Y | float | -1.0 ~ 1.0 | 左右移动，正值向右 |
| Yaw | float | -1.0 ~ 1.0 | 旋转，正值逆时针 |

**发送频率**: 建议20Hz（50ms一次）

**请求示例**:
```json
{
  "CommandCode": "0x0103",
  "Items": {
    "X": 0.5,
    "Y": 0.0,
    "Yaw": 0.2
  }
}
```

**注意**: 仅在行走步态下支持X、Y、Yaw参数

---

### 3.3 灯光控制

**功能**: 控制机器狗的前后照明灯

**命令码**: 0x0201

**参数**:

| 参数 | 类型 | 说明 |
|------|------|------|
| Light | int | 灯光位置：0=前灯，1=后灯 |
| State | int | 状态：0=关闭，1=开启 |

**请求示例**:
```json
{
  "CommandCode": "0x0201",
  "Items": {
    "Light": 0,
    "State": 1
  }
}
```

---

### 3.4 导航控制

#### 3.4.1 下发导航任务

**功能**: 下发导航任务，机器狗前往目标点

**命令码**: 0x0301

**参数**:

| 参数 | 类型 | 单位 | 说明 |
|------|------|------|------|
| Value | int | - | 导航任务目标点编号 |
| MapID | int | - | 目标点所在栅格地图编号（暂无意义） |
| PosX | float | m | 目标点X坐标 |
| PosY | float | m | 目标点Y坐标 |
| PosZ | float | m | 目标点Z坐标（通常为0） |
| AngleYaw | float | rad | 目标点朝向（弧度） |
| PointInfo | int | - | 目标点类型 |
| Gait | int | - | 步态编码 |
| Speed | int | - | 速度等级 |
| Manner | int | - | 运动方式 |
| NavMode | int | - | 导航方式 |
| ObsMode | int | - | 停避障功能 |

**点类型编码**:

| 编码 | 类型 | 说明 |
|------|------|------|
| 0 | 过渡点 | 路径中间点 |
| 1 | 任务点 | 目标点 |
| 3 | 充电点 | 充电桩位置 |

**步态编码**: 见3.2.2节

**速度编码**:

| 编码 | 速度 | 说明 |
|------|------|------|
| 0 | 正常 | 标准速度 |
| 1 | 低速 | 谨慎行走 |
| 2 | 高速 | 快速行走 |

**运动方式编码**:

| 编码 | 方式 | 说明 |
|------|------|------|
| 0 | 前进行走 | 正向行走 |
| 1 | 倒退行走 | 反向行走 |

**导航方式编码**:

| 编码 | 方式 | 说明 |
|------|------|------|
| 0 | 直线导航 | 两点间直线规划 |
| 1 | 自主导航 | 根据地形自主规划 |

**停避障功能编码**:

| 编码 | 状态 | 说明 |
|------|------|------|
| 0 | 开启 | 启用停避障 |
| 1 | 关闭 | 禁用停避障 |

**请求示例**:
```json
{
  "CommandCode": "0x0301",
  "Items": {
    "Value": 0,
    "MapID": 0,
    "PosX": 5.0,
    "PosY": 3.0,
    "PosZ": 0.0,
    "AngleYaw": 0.0,
    "PointInfo": 1,
    "Gait": 0x3002,
    "Speed": 0,
    "Manner": 0,
    "NavMode": 0,
    "ObsMode": 0
  }
}
```

**响应**:

| 参数 | 类型 | 说明 |
|------|------|------|
| Value | int | 导航任务目标点编号 |
| Status | int | 导航任务执行状态 |
| ErrorCode | int | 错误码 |

**导航状态编码**:

| 编码 | 状态 | 说明 |
|------|------|------|
| 0 | 空闲 | 无导航任务 |
| 1 | 退出充电桩中 | 正在退出充电桩 |
| 2 | 导航预处理 | 准备导航 |
| 3 | 导航中 | 正在导航 |
| 4 | 导航完成 | 已到达目标点 |
| 5 | 进入充电桩中 | 正在进入充电桩 |
| 0xff | 暂停中 | 导航已暂停 |

**特殊说明**:

- **楼梯导航**: 使用直线导航方式时，建议将目标点位标到距离最后一阶楼梯边缘45cm以外，同时需要关闭停避障功能
- **自主导航限制**: 仅支持平地步态与低速模式
- **停避障功能**: 地形图的停避障功能作为安全模块将始终保持开启

#### 3.4.2 取消导航任务

**功能**: 取消当前导航任务

**命令码**: 0x0302

**请求**:
```json
{
  "CommandCode": "0x0302",
  "Items": {}
}
```

#### 3.4.3 初始化定位

**功能**: 初始化机器狗的位置和朝向

**命令码**: 0x0303

**参数**:

| 参数 | 类型 | 单位 | 说明 |
|------|------|------|------|
| PosX | float | m | 初始X坐标 |
| PosY | float | m | 初始Y坐标 |
| AngleYaw | float | rad | 初始朝向（弧度） |

**请求示例**:
```json
{
  "CommandCode": "0x0303",
  "Items": {
    "PosX": 0.0,
    "PosY": 0.0,
    "AngleYaw": 0.0
  }
}
```

---

### 3.5 充电控制

**功能**: 控制机器狗的自主充电

**命令码**: 0x0401

**参数**:

| 参数 | 类型 | 说明 |
|------|------|------|
| Command | int | 命令：0=停止，1=开始 |

**请求示例**:
```json
{
  "CommandCode": "0x0401",
  "Items": {
    "Command": 1
  }
}
```

---

### 3.6 状态查询

#### 3.6.1 查询运动控制状态

**命令码**: 0x0501

#### 3.6.2 查询位置信息

**命令码**: 0x0502

#### 3.6.3 查询导航任务执行状态

**命令码**: 0x0503

#### 3.6.4 查询导航感知软件状态

**命令码**: 0x0504

---

## 4. 错误码

### 4.1 错误码范围

| 范围 | 说明 |
|------|------|
| 0x0000 | 成功 |
| 0x8001-0x8100 | 关节相关错误 |
| 0x8101-0x8200 | 电池相关错误 |
| 0x8201-0x8300 | 传感器相关错误 |
| 0x8301-0x8400 | 通信相关错误 |
| 0x8401-0x8500 | 导航相关错误 |
| 0x8501-0x8510 | 其他错误 |

### 4.2 常见错误码

| 错误码 | 说明 |
|--------|------|
| 0x0000 | 成功 |
| 0x8001 | 关节故障 |
| 0x8101 | 电池电量过低 |
| 0x8201 | 传感器故障 |
| 0x8301 | 通信超时 |
| 0x8401 | 导航失败 |

---

## 5. 使用示例

### 5.1 Python示例

```python
import socket
import json
import struct

class M20Protocol:
    def __init__(self, host='10.21.31.103', port=30001):
        self.host = host
        self.port = port
        self.socket = None
        self.message_id = 0

    def connect(self):
        self.socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.socket.connect((self.host, self.port))

    def build_apdu(self, asdu):
        """构建APDU"""
        asdu_json = json.dumps(asdu).encode('utf-8')
        asdu_len = len(asdu_json)

        # 构建16字节头部
        header = bytearray(16)
        header[0:2] = b'\xEB\x91'  # 协议头标识1
        header[2:4] = b'\xEB\x90'  # 协议头标识2
        struct.pack_into('<H', header, 4, asdu_len)  # ASDU长度

        self.message_id = (self.message_id + 1) % 65536
        struct.pack_into('<H', header, 6, self.message_id)  # 消息ID

        header[8] = 0x01  # JSON格式

        return bytes(header) + asdu_json

    def send_command(self, command_code, items):
        """发送命令"""
        asdu = {
            "CommandCode": command_code,
            "Items": items
        }
        apdu = self.build_apdu(asdu)
        self.socket.send(apdu)

    def send_heartbeat(self):
        """发送心跳"""
        self.send_command("0x0001", {})

    def send_motion_control(self, action):
        """发送运动控制"""
        action_map = {'stand': 0, 'walk': 1, 'down': 2}
        self.send_command("0x0101", {"Value": action_map[action]})

    def send_nav_task(self, x, y, yaw):
        """发送导航任务"""
        self.send_command("0x0301", {
            "Value": 0,
            "MapID": 0,
            "PosX": x,
            "PosY": y,
            "PosZ": 0,
            "AngleYaw": yaw,
            "PointInfo": 1,
            "Gait": 0x3002,
            "Speed": 0,
            "Manner": 0,
            "NavMode": 0,
            "ObsMode": 0
        })

# 使用示例
if __name__ == '__main__':
    m20 = M20Protocol()
    m20.connect()

    # 发送心跳
    m20.send_heartbeat()

    # 切换到行走状态
    m20.send_motion_control('walk')

    # 发送导航任务
    m20.send_nav_task(5.0, 3.0, 0.0)
```

### 5.2 Node.js示例

```javascript
const net = require('net');

class M20Protocol {
    constructor(host = '10.21.31.103', port = 30001) {
        this.host = host;
        this.port = port;
        this.socket = null;
        this.messageID = 0;
    }

    connect() {
        this.socket = net.createConnection({
            host: this.host,
            port: this.port
        });
    }

    buildAPDU(asdu) {
        const asduBuffer = Buffer.from(JSON.stringify(asdu), 'utf-8');
        const asduLength = asduBuffer.length;

        const header = Buffer.alloc(16);
        header.writeUInt8(0xEB, 0);
        header.writeUInt8(0x91, 1);
        header.writeUInt8(0xEB, 2);
        header.writeUInt8(0x90, 3);
        header.writeUInt16LE(asduLength, 4);

        this.messageID = (this.messageID + 1) % 65536;
        header.writeUInt16LE(this.messageID, 6);

        header.writeUInt8(0x01, 8);

        return Buffer.concat([header, asduBuffer]);
    }

    sendCommand(commandCode, items) {
        const asdu = {
            CommandCode: commandCode,
            Items: items
        };
        const apdu = this.buildAPDU(asdu);
        this.socket.write(apdu);
    }

    sendHeartbeat() {
        this.sendCommand('0x0001', {});
    }

    sendMotionControl(action) {
        const actionMap = { stand: 0, walk: 1, down: 2 };
        this.sendCommand('0x0101', { Value: actionMap[action] });
    }

    sendNavTask(x, y, yaw) {
        this.sendCommand('0x0301', {
            Value: 0,
            MapID: 0,
            PosX: x,
            PosY: y,
            PosZ: 0,
            AngleYaw: yaw,
            PointInfo: 1,
            Gait: 0x3002,
            Speed: 0,
            Manner: 0,
            NavMode: 0,
            ObsMode: 0
        });
    }
}

// 使用示例
const m20 = new M20Protocol();
m20.connect();
m20.sendHeartbeat();
m20.sendMotionControl('walk');
m20.sendNavTask(5.0, 3.0, 0.0);
```

---

## 6. 常见问题

### Q1: 心跳间隔应该多长？
A: 建议5秒发送一次心跳，保持连接活跃。

### Q2: 运动控制指令发送频率？
A: 虚拟摇杆控制建议20Hz（50ms一次）。

### Q3: 导航任务失败怎么办？
A: 检查ErrorCode，根据错误码判断原因。常见原因：
- 目标点不可达
- 地形复杂度过高
- 机器狗位置不确定

### Q4: 如何确保命令被执行？
A: 使用消息ID匹配请求/响应，确保命令被正确处理。

### Q5: 支持同时发送多个命令吗？
A: 建议按顺序发送命令，避免命令冲突。

---

## 7. 参考资源

- 协议版本: 1.0
- 最后更新: 2026-03-06
- 相关文件:
  - `backend/m20Protocol.js` - Node.js实现
  - `backend/m20Client.js` - TCP客户端实现
