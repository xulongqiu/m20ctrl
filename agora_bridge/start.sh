#!/bin/bash
# 启动 Agora 控制桥接与视频推流

APP_ID="f37a493c9c3846b487c535ec03e9f555"
UID="device_m20"
CHANNEL="m20-ctrl"
# 如果使用测试，目前可不需要 token (传空值)
TOKEN=""
RTSP_URL="rtsp://10.21.31.103:8554/video1"

echo "=== 启动 Agora RTM 控制桥接 ==="
# 注意：正式环境需确保已安装 agora-python-sdk
python3 agora_device.py &
RTM_PID=$!

echo "=== 启动 FFmpeg RTC 视频推流 ==="
# 使用 FFmpeg 抓取 M20 的 RTSP 并将其推送到声网 (RTMP 协议)
# 推流地址格式需要按照声网 RTMP 转 RTC 的规则（如果使用服务端推流），
# 这里提供基于声网服务或通用 RTMP 服务器的示例替代方案：
# ffmpeg -i $RTSP_URL -c:v copy -f flv "rtmp://your-agora-push-url" &
# FFMPEG_PID=$!

# 等待退出
wait $RTM_PID
