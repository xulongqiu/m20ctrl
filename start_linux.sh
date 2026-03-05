#!/bin/bash

# 获取脚本所在目录的绝对路径
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

# 检查端口 30001 是否被占用 (判断后端是否已经运行)
PORT_IN_USE=0
if command -v lsof >/dev/null 2>&1; then
    if lsof -Pi :30001 -sTCP:LISTEN -t >/dev/null ; then PORT_IN_USE=1; fi
elif command -v ss >/dev/null 2>&1; then
    if ss -ltn | grep -q ":30001 " ; then PORT_IN_USE=1; fi
elif command -v netstat >/dev/null 2>&1; then
    if netstat -tln | grep -q ":30001 " ; then PORT_IN_USE=1; fi
fi

if [ $PORT_IN_USE -eq 1 ]; then
    echo "[!] M20 控制后端已经在运行中 (端口 30001 被占用)"
    echo "正在打开控制面板..."
    
    if which xdg-open > /dev/null; then xdg-open index.html
    elif which gnome-open > /dev/null; then gnome-open index.html
    else echo "无法自动打开浏览器，请手动在浏览器打开: file://$DIR/index.html"; fi
    
    echo "完成。本窗口将在 3 秒后关闭。"
    sleep 3
    exit 0
fi

echo "正在启动 M20 控制后端..."

# 启动 Node 后端
node backend/server.js &
NODE_PID=$!

# 等待两秒确保服务启动
sleep 2

echo "正在打开控制面板..."
# 尝试使用不同系统的默认浏览器打开命令
if which xdg-open > /dev/null; then xdg-open index.html
elif which gnome-open > /dev/null; then gnome-open index.html
else echo "无法自动打开浏览器，请手动在浏览器中打开: file://$DIR/index.html"; fi

echo "后端运行中 (PID: $NODE_PID)，关闭此终端窗口将停止服务。"
echo "按 Ctrl+C 停止"

# 捕获退出信号，清理后台 Node 进程
trap "kill $NODE_PID; exit" INT TERM EXIT

# 保持终端开启
wait $NODE_PID
