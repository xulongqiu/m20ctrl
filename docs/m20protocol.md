# M20 通信协议文档

基于云深处 M20 软件接口手册 V0.1.0，本文档为项目实现中使用到的协议子集摘要。

## 1. 协议概述

| 项目 | 值 |
|------|-----|
| 机器狗 IP | 10.21.31.103 |
| TCP 端口 | 30001 |
| UDP 端口 | 30000 |
| 推荐 | TCP + JSON |

---

## 2. APDU 帧结构

### 2.1 协议头（固定 16 字节）

| 字节 | 字段 | 长度 | 说明 |
|------|------|------|------|
| 0-1 | 同步字符1 | 2B | 固定 `0xEB91` |
| 2-3 | 同步字符2 | 2B | 固定 `0xEB90` |
| 4-5 | ASDU 长度 | 2B | 小端序，JSON 体长度 |
| 6-7 | 消息 ID | 2B | 请求/响应匹配 |
| 8 | 数据格式 | 1B | `0x01`=JSON |
| 9-15 | 预留 | 7B | 填充 0 |

### 2.2 ASDU（JSON 体）

```json
{
  "PatrolDevice": {
    "Type": 100,
    "Command": 100,
    "Time": "2025-01-01 00:00:00",
    "Items": { ... }
  }
}
```

---

## 3. 协议 1.2 — 控制命令

### 3.1 心跳 (Type:100, Cmd:100)

周期 5s，保活连接。Items 为空对象。

```json
{
  "PatrolDevice": {
    "Type": 100,
    "Command": 100,
    "Time": "...",
    "Items": {}
  }
}
```

### 3.2 使用模式切换 (Type:1101, Cmd:5)

| 参数 | 类型 | 说明 |
|------|------|------|
| Value | int | 0=常规, 1=导航, 2=辅助 |

```json
{
  "PatrolDevice": {
    "Type": 1101,
    "Command": 5,
    "Time": "...",
    "Items": { "Value": 1 }
  }
}
```

### 3.3 运动状态转换 (Type:2, Cmd:22)

| 参数 | 类型 | 说明 |
|------|------|------|
| Value | int | 0=站立, 1=行走, 2=趴下 |

```json
{
  "PatrolDevice": {
    "Type": 2,
    "Command": 22,
    "Time": "...",
    "Items": { "Value": 1 }
  }
}
```

### 3.4 步态切换 (Type:2, Cmd:23)

| 参数 | 类型 | 说明 |
|------|------|------|
| GaitParam | int | 步态编码 |

**步态编码：**

| 编码 | 步态 | 模式 |
|------|------|------|
| 1 | 基础 | 标准 |
| 2 | 高台 | 标准 |
| 3 | 楼梯 | 标准 |
| 12 (0x3002) | 平地 | 敏捷 |
| 13 (0x3003) | 楼梯 | 敏捷 |
| 14 | 楼梯 | 标准（备选） |

```json
{
  "PatrolDevice": {
    "Type": 2,
    "Command": 23,
    "Time": "...",
    "Items": { "GaitParam": 12 }
  }
}
```

### 3.5 运动控制 / 轴指令 (Type:2, Cmd:21)

20Hz 发送，控制机器狗平移和旋转。

| 参数 | 类型 | 范围 | 说明 |
|------|------|------|------|
| X | float | -1.0 ~ 1.0 | 前后，正值前进 |
| Y | float | -1.0 ~ 1.0 | 左右，正值向右 |
| Yaw | float | -1.0 ~ 1.0 | 旋转，正值逆时针 |

> 仅在行走步态下 X/Y/Yaw 全部生效；基础/楼梯步态下仅 X/Yaw 生效。

```json
{
  "PatrolDevice": {
    "Type": 2,
    "Command": 21,
    "Time": "...",
    "Items": { "X": 0.5, "Y": 0.0, "Yaw": 0.2 }
  }
}
```

### 3.6 灯光控制 (Type:1101, Cmd:2)

| 参数 | 类型 | 说明 |
|------|------|------|
| Front | bool | 前灯开关 |
| Back | bool | 后灯开关 |

```json
{
  "PatrolDevice": {
    "Type": 1101,
    "Command": 2,
    "Time": "...",
    "Items": { "Front": true, "Back": false }
  }
}
```

---

## 4. 协议 1.3 — 主动上报状态

机器狗以约 1Hz 频率主动上报以下状态，Type 均为 `1002`。

### 4.1 运控状态 (Cmd:4, 约10Hz)

| 字段 | 类型 | 说明 |
|------|------|------|
| Roll / Pitch / Yaw | float | 当前姿态 (rad) |
| OmegaZ | float | Z轴角速度 (rad/s) |
| LinearX / LinearY | float | 线速度 (m/s) |
| Height | float | 机身高度 (m) |
| RemainMile | float | 续航里程 (km) |

### 4.2 设备状态 (Cmd:5, 约1Hz)

包含电池（左/右电量、电压、温度、充电状态）、GPS（经纬度、海拔、速度、航向、卫星数）、CPU（AOS/NOS/GOS 温度和负载）、LED 开关状态等。

### 4.3 基础状态 (Cmd:6, 约1Hz)

| 字段 | 类型 | 说明 |
|------|------|------|
| MotionState | int | 运动状态 (1=站立, 4=趴下, 6=行走) |
| Gait | int | 当前步态 |
| Charge | int | 充电状态 |
| ControlUsageMode | int | 使用模式 (0=常规, 1=导航, 2=辅助) |
| Direction | int | 方向 |
| OOA | int | 场外辅助状态 |
| Energy | int | 电量百分比 |
| SleepState | int | 休眠状态 |
| HES | int | 急停状态 (0=正常, 1=急停) |
| Version | string | 固件版本 |

### 4.4 异常状态 (Cmd:3)

| 字段 | 类型 | 说明 |
|------|------|------|
| ErrorCode | int | 错误码 |
| ErrorState | int | 异常状态 (0=正常, 1=故障) |
| ErrorLevel | int | 异常级别 (0~4) |

---

## 5. 协议 1.4 — 导航控制

### 5.1 初始化定位 (Type:2101, Cmd:1)

设置机器狗在地图坐标系中的初始位姿。

| 参数 | 类型 | 单位 | 说明 |
|------|------|------|------|
| PosX | float | m | 初始 X |
| PosY | float | m | 初始 Y |
| PosZ | float | m | 初始 Z |
| Yaw | float | rad | 初始朝向 |

```json
{
  "PatrolDevice": {
    "Type": 2101,
    "Command": 1,
    "Time": "...",
    "Items": { "PosX": 0.0, "PosY": 0.0, "PosZ": 0.0, "Yaw": 0.0 }
  }
}
```

### 5.2 获取地图坐标系下位置 (Type:1007, Cmd:2)

请求 Items 为空。响应字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| Location | int | 定位状态 (0=正常, 非0=异常) |
| PosX / PosY / PosZ | float | 位置 (m) |
| Roll / Pitch / Yaw | float | 姿态 (rad) |

### 5.3 获取导航感知软件状态 (Type:2002, Cmd:1)

请求 Items 为空。响应字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| Location | int | 定位状态 (0=正常) |
| ObsState | int | 避障状态 (0=无障碍) |

### 5.4 下发导航任务 (Type:1003, Cmd:1)

| 参数 | 类型 | 单位 | 说明 |
|------|------|------|------|
| Value | int | - | 目标点编号 |
| MapID | int | - | 栅格地图编号 |
| PointInfo | int | - | 0=过渡点, 1=任务点, 3=充电点 |
| PosX / PosY / PosZ | float | m | 目标坐标 |
| AngleYaw | float | rad | 目标朝向 |
| Gait | int | - | 步态编码 (0x3002/0x3003) |
| Speed | int | - | 0=正常, 1=低速, 2=高速 |
| Manner | int | - | 0=前进, 1=倒退 |
| NavMode | int | - | 0=直线, 1=自主 |
| ObsMode | int | - | 0=开启避障, 1=关闭 |

**响应字段：**

| 字段 | 类型 | 说明 |
|------|------|------|
| Value | int | 目标点编号 |
| Status | int | 任务状态（见下表） |
| ErrorCode | int | 错误码 (0=成功) |

**导航任务状态：**

| 值 | 状态 |
|----|------|
| 0 | 空闲 |
| 1 | 退出充电桩中 |
| 2 | 导航预处理 |
| 3 | 导航中 |
| 4 | 导航完成 |
| 5 | 进入充电桩中 |
| 0xFF | 暂停中 |

**导航注意事项：**
- 楼梯导航用直线方式，目标距楼梯边缘 ≥45cm，关闭停避障
- 自主导航仅支持平地步态 + 低速

```json
{
  "PatrolDevice": {
    "Type": 1003,
    "Command": 1,
    "Time": "...",
    "Items": {
      "Value": 0,
      "MapID": 0,
      "PosX": 5.0,
      "PosY": 3.0,
      "PosZ": 0.0,
      "AngleYaw": 0.0,
      "PointInfo": 1,
      "Gait": 12290,
      "Speed": 0,
      "Manner": 0,
      "NavMode": 0,
      "ObsMode": 0
    }
  }
}
```

### 5.5 取消导航任务 (Type:1004, Cmd:1)

请求 Items 为空。

```json
{
  "PatrolDevice": {
    "Type": 1004,
    "Command": 1,
    "Time": "...",
    "Items": {}
  }
}
```

### 5.6 查询导航任务执行状态 (Type:1007, Cmd:1)

请求 Items 为空。响应字段同 5.4 响应中的 Value / Status / ErrorCode。

---

## 6. 错误码

| 范围 | 说明 |
|------|------|
| 0x0000 | 成功 |
| 0x8001-0x8100 | 关节相关 |
| 0x8101-0x8200 | 电池相关 |
| 0x8201-0x8300 | 传感器相关 |
| 0x8301-0x8400 | 通信相关 |
| 0x8401-0x8500 | 导航相关 |

---

## 7. 参考

- 协议版本: V0.1.0 (2025-09-16)
- 源文档: `docs/m20_dev_manual.md`
- 实现: `backend/m20Protocol.js`
