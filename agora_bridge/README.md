# M20 机器狗声网 (Agora) 接入模块 - Python 版验证

本目录包含了设备端（M20）运行的用于对接声网 RTM 和 RTC 控制的前置网关脚本，主要用于快速验证控制通路。
长期上线建议使用 C++ 集成声网 IoT 智能硬件 SDK。

## 环境依赖
* Python 3.8+
* 仅运行于 M20 机器狗或与其处在同一局域网的设备上
* ffmpeg (可选，用于推送视频流)

## 快速运行
1. 安装依赖
```bash
python3 -m venv venv
source venv/bin/activate
pip3 install -r requirements.txt
```

2. 运行脚本
```bash
./start.sh
```

## 功能说明
1. **控制通道 (`agora_device.py`)**：脚本会自动连接到本地的 M20 运动控制 TCP 端口 (`127.0.0.1:30001`)。通过声网 RTM 监听频道 `m20-ctrl` 传来的前端控制命令，翻译为二进制 APDU 下发并接收狗反馈的状态上报 WebUI。
2. **视频通道 (`start.sh`)**：通过 `ffmpeg` 拉取 M20 的前置摄像头 RTSP 视频流，推流到声网。前端使用 AgoraRTC Web SDK 进行极低延迟视频展示。

## 实时控制通信协议 (RTM)
网关脚本当作 RTM 的一个客户端，使用 `dd_m20_xlq_mac` 登录，订阅频道 `m20-ctrl`。
支持的控制指令完全对齐 M20 原生 APDU，涵盖：
- 运动控制（前进/后退、虚拟摇杆等）
- 面板状态功能（使用模式切换、步态切换、开关灯）
- 全量主动上报能力封装（通过在 Python 中驻留 `5s` 一次的心跳，激活机器狗持续发送姿态、电量、错误码等数据），并通过 RTM 转发给 WebUI。

## 注意事项
当前脚本已使用 `agora-python-sdk` 的真实实现完成全双工通信（控制下发 + 状态上报）。
请确保使用的 RTM Token 符合 **AccessToken2** 标准（可以参考仓库根目录的 `generate_token.js` 生成的 token 填入 `agora_config.js`）。

AppID: `f37a493c9c3846b487c535ec03e9f555`
