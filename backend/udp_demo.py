#!/usr/bin/python3.5
#########################################################################
# File  : udp_demo.py
# Author: xulongqiu
# Mail  : xulongqiu@xiaomi.com
# Time  : 2026-03-06 11:20:22
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

	# 8~14 字节：预留 7 字节，已经默认是 0，无需设置

	return header

# =============================================
# 2. 基础配置
# =============================================
SERVER_IP = "10.21.31.103"  # 目标服务器 IP
PORT = 30000                # 目标端口

# =============================================
# 3. 构造 JSON 数据
# =============================================
json_data = """
{
    "PatrolDevice":{
        "Type":100,
         "Command":100,
         "Time":"2023-01-01 00:00:00",
         "Items":{
         }
     }
}
"""

# 转为 UTF-8 bytes，并计算长度（即 ASDU 长度）
asdu_data = json_data.encode('utf-8')
data_length = len(asdu_data)  # 用于协议头中的长度字段

# =============================================
# 4. 构造协议头
#    - 报文ID 示例为 1
#    - ASDU格式为 JSON（0x01）
# =============================================
header = build_protocol_header(
	data_length=data_length,
	msg_id=1,          # 可以设为变量，每次递增
	asdu_format=0x01   # 0x01 表示 JSON
)

# =============================================
# 5. 拼接完整消息：header + asdu_data（JSON）
# =============================================
message = header + asdu_data

# =============================================
# 6. 创建 UDP 套接字并发送
# =============================================
try:
	client_sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
	server_address = (SERVER_IP, PORT)

	send_len = client_sock.sendto(message, server_address)
	print(f"消息发送成功！send_len={send_len}")

	# =============================================
	# 7. 接收服务器响应
	# =============================================
	print("等待服务器响应...")
	# 设置超时时间为5秒
	client_sock.settimeout(5)
	try:
		# 接收数据（UDP使用recvfrom）
		response_data, server_addr = client_sock.recvfrom(4096)  # 4096是缓冲区大小
		print(f"接收到来自 {server_addr} 的响应")
		
		# 解析协议头
		if len(response_data) >= 16:
			header_data = response_data[:16]
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
			
			# 解析ASDU数据
			if data_length > 0 and len(response_data) >= 16 + data_length:
				asdu_data = response_data[16:16+data_length]
				try:
					asdu_str = asdu_data.decode('utf-8')
					print(f"ASDU数据（JSON）: {asdu_str}")
				except Exception as e:
					print(f"解析ASDU数据失败: {e}")
			else:
				print("ASDU数据长度不足")
		else:
			print("接收数据长度不足，无法解析协议头")
	except socket.timeout:
		print("接收响应超时")
	except Exception as e:
		print(f"接收响应失败: {e}")

except Exception as e:
	print(f"发送失败：{e}")

finally:
	client_sock.close()

