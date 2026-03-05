#!/usr/bin/python3.5
#########################################################################
# File  : demo.py
# Author: xulongqiu
# Mail  : xulongqiu@xiaomi.com
# Time  : 2026-03-06 10:58:07
#########################################################################

import socket

# =============================================
# 1. 协议头构造函数
# =============================================
def build_protocol_header(data_length: int, msg_id: int = 1, asdu_format: int = 0x01) -> bytearray:
    if not (0 <= data_length <= 65535):
        raise ValueError("data_length 必须在 0 ~ 65535 之间")
    if not (0 <= msg_id <= 65535):
        raise ValueError("msg_id 必须在 0 ~ 65535 之间")
    if asdu_format not in [0x00, 0x01]:
        raise ValueError("asdu_format 必须是 0x00（XML）或 0x01（JSON）")

    header = bytearray(16)
    header[0] = 0xeb
    header[1] = 0x91
    header[2] = 0xeb
    header[3] = 0x90
    header[4] = data_length & 0xFF
    header[5] = (data_length >> 8) & 0xFF
    header[6] = msg_id & 0xFF
    header[7] = (msg_id >> 8) & 0xFF
    header[8] = asdu_format  # 0x01 表示 JSON

    # 8~14 字节：预留 7 字节，默认 0，无需设置
    return header

# =============================================
# 2. 基础配置（IP 和端口）
# =============================================
SERVER_IP = "10.21.31.103"  # 目标服务器 IP
PORT = 30001                # 目标端口（确保服务端是 TCP 监听！）

# =============================================
# 3. 构造 JSON 数据
# =============================================
json_data = """
{
	"PatrolDevice": {
		"Type": 1101,
		"Command": 2,
		"Time": "2023-01-01 00:00:00",
		"Items": {
             "Front": 0,
             "Back": 0
		}
	}
}
"""
json1_data = """
{
    "PatrolDevice": {
        "Type": 100,
        "Command": 100,
        "Time": "2023-01-01 00:00:00",
        "Items": {}
    }
}
"""

# 转为 UTF-8 bytes，并计算长度（ASDU 长度）
asdu_data = json_data.encode('utf-8')
data_length = len(asdu_data)  # 用于协议头中的长度字段

# =============================================
# 4. 构造协议头
# =============================================
header = build_protocol_header(
    data_length=data_length,
    msg_id=1,          # 可自定义，比如递增
    asdu_format=0x01   # 0x01 表示 JSON 格式
)

# =============================================
# 5. 拼接完整消息：header + asdu_data
# =============================================
message = header + asdu_data

# =============================================
# 6. 创建 TCP 套接字并发送
# =============================================
try:
    # 创建 TCP 套接字（注意：不再是 SOCK_DGRAM，而是 SOCK_STREAM）
    client_sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)

    # 连接到服务器
    server_address = (SERVER_IP, PORT)
    print(f"正在连接到服务器 {SERVER_IP}:{PORT}...")
    client_sock.connect(server_address)

    # 发送完整消息（TCP 使用 sendall，确保全部发送）
    send_len = client_sock.sendall(message)
    # 注意：sendall() 没有返回值，它要么全部发送成功，要么抛异常
    print(f"消息发送成功！send_len={send_len}")

    # =============================================
    # 7. 接收服务器响应
    # =============================================
    print("等待服务器响应...")
    # 先接收协议头（16字节）
    header_data = client_sock.recv(16)
    if len(header_data) < 16:
        print("接收协议头失败")
    else:
        # 解析协议头
        magic1 = header_data[0:2]
        magic2 = header_data[2:4]
        data_length = (header_data[5] << 8) | header_data[4]
        msg_id = (header_data[7] << 8) | header_data[6]
        asdu_format = header_data[8]
        
        print(f"协议头解析成功：")
        print(f"  Magic: {magic1.hex()} {magic2.hex()}")
        print(f"  数据长度: {data_length}")
        print(f"  消息ID: {msg_id}")
        print(f"  ASDU格式: {asdu_format}")
        
        # 接收ASDU数据
        if data_length > 0:
            asdu_data = client_sock.recv(data_length)
            if len(asdu_data) < data_length:
                print("接收ASDU数据失败")
            else:
                # 解析ASDU数据（JSON格式）
                try:
                    asdu_str = asdu_data.decode('utf-8')
                    print(f"ASDU数据（JSON）: {asdu_str}")
                except Exception as e:
                    print(f"解析ASDU数据失败: {e}")


except Exception as e:
    print(f"发送失败：{e}")

finally:
    # 关闭套接字
    client_sock.close()
    print("TCP 连接已关闭")
