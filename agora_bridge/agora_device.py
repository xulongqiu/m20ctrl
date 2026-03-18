import socket
import struct
import json
import time
import threading
import logging

try:
    from agora.rtm.rtm_client import create_rtm_client, RTMClient
    from agora.rtm.rtm_base import (
        RtmConfig, IRtmEventHandler, MessageEvent, PublishOptions, 
        RtmChannelType, RtmMessageType, SubscribeOptions
    )
    HAS_AGORA_SDK = True
except ImportError:
    HAS_AGORA_SDK = False

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')

class M20Protocol:
    def __init__(self):
        self.msg_id = 0

    def generate_time(self):
        return time.strftime("%Y-%m-%d %H:%M:%S")

    def build_apdu(self, asdu_dict):
        asdu_str = json.dumps(asdu_dict)
        asdu_bytes = asdu_str.encode('utf-8')
        self.msg_id = (self.msg_id + 1) % 65536
        
        header = b'\xeb\x91\xeb\x90' + struct.pack('<HHB', len(asdu_bytes), self.msg_id, 1) + b'\x00' * 7
        return header + asdu_bytes

    def parse_apdu(self, data):
        if len(data) < 16:
            return False, None, data
        
        if data[:4] != b'\xeb\x91\xeb\x90':
            idx = data.find(b'\xeb\x91\xeb\x90')
            if idx > 0:
                data = data[idx:]
            else:
                return False, None, b''
                
        if len(data) < 16:
            return False, None, data
            
        asdu_len, msg_id, data_format = struct.unpack('<HHB', data[4:9])
        
        if len(data) < 16 + asdu_len:
            return False, None, data
            
        asdu_bytes = data[16:16+asdu_len]
        remainder = data[16+asdu_len:]
        
        try:
            asdu = json.loads(asdu_bytes.decode('utf-8'))
            return True, asdu, remainder
        except Exception as e:
            logging.error(f"ASDU JSON parse generated an error: {e}")
            return False, None, remainder

    def build_heartbeat(self):
        asdu = {
            "PatrolDevice": {
                "Type": 100,
                "Command": 100,
                "Time": self.generate_time(),
                "Items": {}
            }
        }
        return self.build_apdu(asdu)

    # ---- 状态解析转换为 WebUI 期望的格式 ----

    MOTION_STATE_MAP = {
        0: '空闲', 1: '站立', 2: '关节阻尼/软急停', 3: '开机阻尼',
        4: '趴下', 6: '标准运动模式', 8: '敏捷运动模式'
    }

    GAIT_MAP = {
        0: '未知', 1: '基础(标准)', 2: '高台(标准)',
        12: '平地(敏捷)', 13: '楼梯(敏捷)', 14: '楼梯(标准)'
    }

    CHARGE_STATE_MAP = {
        0: '空闲', 1: '前往充电桩', 2: '充电中',
        3: '退出充电桩', 4: '机器人异常', 5: '在桩上未充电'
    }

    USAGE_MODE_MAP = {
        0: '常规模式', 1: '导航模式', 2: '辅助模式'
    }

    OOA_MAP = {
        0: '未启动', 1: '空闲中', 2: '未触发避障', 3: '主动避障中'
    }

    def parse_status_report(self, asdu):
        pd = asdu.get("PatrolDevice", {})
        if not pd:
            return None

        cmd_type = pd.get("Type")
        cmd = pd.get("Command")
        items = pd.get("Items", {})

        if cmd_type == 100 and cmd == 100:
            return None # ignore heartbeats

        if cmd_type != 1002:
            return { "type": "command_response", "commandType": cmd_type, "command": cmd, "data": items }

        if cmd == 6: # Basic Status
            bs = items.get("BasicStatus", {})
            return {
                "type": "robot_status",
                "category": "basic_status",
                "data": {
                    "motionState": bs.get("MotionState"),
                    "motionStateLabel": self.MOTION_STATE_MAP.get(bs.get("MotionState"), f"未知({bs.get('MotionState')})"),
                    "gait": bs.get("Gait"),
                    "gaitLabel": self.GAIT_MAP.get(bs.get("Gait"), f"未知({bs.get('Gait')})"),
                    "charge": bs.get("Charge"),
                    "chargeLabel": self.CHARGE_STATE_MAP.get(bs.get("Charge"), f"未知({bs.get('Charge')})"),
                    "hes": bs.get("HES"),
                    "hesLabel": "已触发" if bs.get("HES") == 1 else "未触发",
                    "controlUsageMode": bs.get("ControlUsageMode"),
                    "usageModeLabel": self.USAGE_MODE_MAP.get(bs.get("ControlUsageMode"), f"未知({bs.get('ControlUsageMode')})"),
                    "direction": bs.get("Direction"),
                    "directionLabel": "后向" if bs.get("Direction") == 1 else "正向",
                    "ooa": bs.get("OOA"),
                    "ooaLabel": self.OOA_MAP.get(bs.get("OOA"), f"未知({bs.get('OOA')})"),
                    "powerManagement": bs.get("PowerManagement"),
                    "powerLabel": "单电池模式" if bs.get("PowerManagement") == 1 else "常规模式",
                    "sleep": bs.get("Sleep"),
                    "sleepLabel": "已休眠" if bs.get("Sleep") else "未休眠",
                    "version": bs.get("Version", "--")
                }
            }
        elif cmd == 4: # Motion Status
            ms = items.get("MotionStatus", {})
            return {
                "type": "robot_status",
                "category": "motion_status",
                "data": {
                    "roll": ms.get("Roll"), "pitch": ms.get("Pitch"), "yaw": ms.get("Yaw"),
                    "omegaZ": ms.get("OmegaZ"), "linearX": ms.get("LinearX"), "linearY": ms.get("LinearY"),
                    "height": ms.get("Height"), "remainMile": ms.get("RemainMile")
                }
            }
        elif cmd == 5: # Device Status
            bat = items.get("BatteryStatus", {})
            led = items.get("Led", {})
            gps = items.get("GPS", {})
            cpu = items.get("CPU", {})
            dev_enable = items.get("DevEnable", {})

            return {
                "type": "robot_status",
                "category": "device_status",
                "data": {
                    "battery": {
                        "voltageLeft": bat.get("VoltageLeft"),
                        "voltageRight": bat.get("VoltageRight"),
                        "levelLeft": bat.get("BatteryLevelLeft"),
                        "levelRight": bat.get("BatteryLevelRight"),
                        "tempLeft": bat.get("battery_temperatureLeft"),
                        "tempRight": bat.get("battery_temperatureRight"),
                        "chargeLeft": bat.get("chargeLeft"),
                        "chargeRight": bat.get("chargeRight")
                    },
                    "led": {
                        "front": led.get("Fill", {}).get("Front"),
                        "back": led.get("Fill", {}).get("Back")
                    },
                    "gps": {
                        "latitude": gps.get("Latitude"),
                        "longitude": gps.get("Longitude"),
                        "speed": gps.get("Speed"),
                        "course": gps.get("Course"),
                        "fixQuality": gps.get("FixQuality"),
                        "numSatellites": gps.get("NumSatellites"),
                        "altitude": gps.get("Altitude"),
                        "hdop": gps.get("HDOP"),
                        "vdop": gps.get("VDOP"),
                        "pdop": gps.get("PDOP"),
                        "visibleSatellites": gps.get("VisibleSatellites")
                    },
                    "cpu": {
                        "aos": cpu.get("AOS", {}),
                        "nos": cpu.get("NOS", {}),
                        "gos": cpu.get("GOS", {})
                    },
                    "devEnable": {
                        "fanSpeed": dev_enable.get("FanSpeed"),
                        "loadPower": dev_enable.get("LoadPower"),
                        "lidarFront": dev_enable.get("Lidar", {}).get("Front"),
                        "lidarBack": dev_enable.get("Lidar", {}).get("Back"),
                        "gpsPower": dev_enable.get("GPS"),
                        "videoFront": dev_enable.get("Video", {}).get("Front"),
                        "videoBack": dev_enable.get("Video", {}).get("Back")
                    }
                }
            }
        elif cmd == 3: # Error Status
            err_list = items.get("ErrorList", [])
            return {
                "type": "robot_status",
                "category": "error_status",
                "data": {
                    "hasError": len(err_list) > 0,
                    "errors": err_list
                }
            }
        return None

if HAS_AGORA_SDK:
    class RtmHandler(IRtmEventHandler):
        def __init__(self, bridge):
            self.bridge = bridge

        def on_message_event(self, event: MessageEvent):
            logging.info(f"[RTM Event] on_message_event triggered! publisher={getattr(event, 'publisher', '?')}, channel={getattr(event, 'channel_name', '?')}")
            logging.info(f"[RTM Event] message content: {event.message}")
            self.bridge.on_agora_message(event.message)

        def on_connection_state_changed(self, channel_name: str, state: int, reason: int):
            STATE_MAP = {
                1: 'DISCONNECTED', 2: 'CONNECTING', 3: 'CONNECTED',
                4: 'RECONNECTING', 5: 'FAILED'
            }
            REASON_MAP = {
                0: 'UNKNOWN', 1: 'LOGIN', 2: 'LOGIN_SUCCESS', 3: 'LOGIN_TIMEOUT',
                4: 'LOGIN_NOT_AUTHORIZED', 5: 'LOGIN_REJECTED', 6: 'RELOGIN',
                7: 'LOGOUT', 8: 'AUTO_RECONNECT', 9: 'RECONNECT_TIMEOUT',
                10: 'RECONNECT_SUCCESS', 16: 'INVALID_TOKEN', 17: 'TOKEN_EXPIRED',
                27: 'SAME_UID_LOGIN', 28: 'KICKED_OUT_BY_SERVER',
                10001: 'RECONNECT_SUCCESS_EXTENDED'
            }
            state_str = STATE_MAP.get(state, f'UNKNOWN({state})')
            reason_str = REASON_MAP.get(reason, f'UNKNOWN({reason})')
            logging.info(f"Agora RTM State: {state_str} | Reason: {reason_str}")
            
            # 在 CONNECTED 状态时订阅频道
            if state == 3 and not self.bridge.subscribed:
                self.bridge.do_subscribe()


class AgoraDeviceBridge:
    def __init__(self, m20_host='10.21.31.103', m20_port=30001, config_path='../agora_config.js'):
        self.m20_host = m20_host
        self.m20_port = m20_port
        
        # 加载配置文件 (支持 .js 格式以兼容 Web file:// 协议)
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                content = f.read().strip()
                # 去掉 JS 的前缀：window.AGORA_CONFIG = 
                if content.startswith('window.AGORA_CONFIG ='):
                    json_str = content.replace('window.AGORA_CONFIG =', '').strip().rstrip(';')
                else:
                    json_str = content
                
                agora_config = json.loads(json_str)
            
            self.app_id = agora_config.get('appId')
            self.channel = agora_config.get('channel')
            device_cfg = agora_config.get('device', {})
            self.uid = device_cfg.get('uid')
            self.token = device_cfg.get('rtmToken')
            logging.info(f"Loaded Agora config from {config_path}")
        except Exception as e:
            logging.error(f"Failed to load {config_path}: {e}. Falling back to defaults.")
            self.app_id = 'f37a493c9c3846b487c535ec03e9f555'
            self.channel = 'm20-ctrl'
            self.uid = 'dd_m20_xlq_mac'
            self.token = None
        
        self.sock = None
        self.protocol = M20Protocol()
        self.running = False
        self.rtm_client = None
        self.subscribed = False
        
        if HAS_AGORA_SDK:
            config = RtmConfig(app_id=self.app_id, user_id=self.uid, use_string_user_id=True, event_handler=RtmHandler(self))
            self.rtm_client = create_rtm_client(config)
            if self.rtm_client and self.rtm_client._is_valid():
                # 使用用户提供的 Token 登录
                ret, _ = self.rtm_client.login(self.token)
                if ret == 0:
                    logging.info(f"Agora RTM login request sent for {self.uid}, waiting for CONNECTED state...")
                    # subscribe 会在 on_connection_state_changed 回调中触发
                else:
                    logging.error(f"Agora RTM login failed (ret={ret}).")
            else:
                logging.error("Failed to initialize Agora RTM client")
    
    def do_subscribe(self):
        """CONNECTED 状态后订阅频道"""
        if self.subscribed:
            return
        try:
            opts = SubscribeOptions(with_message=True)
            ret_sub, _ = self.rtm_client.subscribe(self.channel, opts)
            if ret_sub == 0:
                self.subscribed = True
                logging.info(f"✅ Subscribed to channel: {self.channel} (after CONNECTED)")
            else:
                logging.error(f"❌ Subscribe failed! ret={ret_sub}, channel={self.channel}")
        except Exception as e:
            logging.error(f"❌ Subscribe exception: {e}")

    def m20_heartbeat_loop(self):
        """Keep sending heartbeat to M20 to trigger status reports"""
        while self.running:
            if self.sock:
                try:
                    hb_bytes = self.protocol.build_heartbeat()
                    self.send_to_m20(hb_bytes)
                except Exception as e:
                    logging.error(f"Failed to send heartbeat to M20: {e}")
            time.sleep(30)

    def start(self):
        self.running = True
        self.connect_m20()
        threading.Thread(target=self.m20_recv_loop, daemon=True).start()
        threading.Thread(target=self.m20_heartbeat_loop, daemon=True).start()
        logging.info("Bridge started. Waiting for messages.")

        try:
            while self.running:
                time.sleep(1)
        except KeyboardInterrupt:
            self.running = False
            if self.sock:
                self.sock.close()
            if self.rtm_client:
                self.rtm_client.logout()
                self.rtm_client.release()

    def connect_m20(self):
        # We will not block forever to connect M20, allowing RTM to still work
        # useful for local testing without the dog online
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.sock.settimeout(2.0)
        try:
            self.sock.connect((self.m20_host, self.m20_port))
            self.sock.settimeout(None)
            logging.info(f"Connected to M20 at {self.m20_host}:{self.m20_port}")
        except Exception as e:
            logging.warning(f"Failed to connect to M20 ({self.m20_host}:{self.m20_port}): {e}. Local test mode fallback.")
            self.sock.close()
            self.sock = None

    def m20_recv_loop(self):
        recv_buffer = b''
        while self.running:
            if not self.sock:
                time.sleep(2)
                # optionally try to reconnect
                # self.connect_m20()
                continue

            try:
                data = self.sock.recv(4096)
                if not data:
                    logging.warning("M20 disconnected.")
                    self.sock.close()
                    self.sock = None
                    continue
                    
                recv_buffer += data
                
                while True:
                    success, asdu, recv_buffer = self.protocol.parse_apdu(recv_buffer)
                    if not success:
                        break
                        
                    status_json = self.protocol.parse_status_report(asdu)
                    if status_json:
                        self.send_to_agora(status_json)
                        
            except Exception as e:
                logging.error(f"TCP Recv error: {e}")
                time.sleep(1)
                self.sock.close()
                self.sock = None

    def send_to_agora(self, json_msg):
        if not self.rtm_client:
            return
            
        msg_str = json.dumps(json_msg)
        opts = PublishOptions(
            channel_type=RtmChannelType.RTM_CHANNEL_TYPE_MESSAGE,
            message_type=RtmMessageType.RTM_MESSAGE_TYPE_STRING
        )
        ret, _ = self.rtm_client.publish(self.channel, msg_str, opts)
        if ret != 0:
            logging.error(f"Failed to publish to Agora RTM, error code: {ret}")

    def on_agora_message(self, text_msg):
        logging.info(f"<- Agora RTM (Control->Device): {text_msg}")
        try:
            cmd = json.loads(text_msg)
            cmd_type = cmd.get("type")
            asdu = None
            
            if cmd_type == "axis_control":
                axes = cmd.get("axes", {})
                asdu = {
                    "PatrolDevice": {
                        "Type": 2, "Command": 21, "Time": self.protocol.generate_time(),
                        "Items": {
                            "X": axes.get("X", 0), "Y": axes.get("Y", 0), "Z": axes.get("Z", 0),
                            "Roll": axes.get("Roll", 0), "Pitch": axes.get("Pitch", 0), "Yaw": axes.get("Yaw", 0)
                        }
                    }
                }
            elif cmd_type == "motion_control":
                action = cmd.get("action")
                act_map = {'idle':0, 'stand':1, 'damping':2, 'down':4, 'walk':6}
                asdu = {
                    "PatrolDevice": {
                        "Type": 2, "Command": 22, "Time": self.protocol.generate_time(),
                        "Items": { "MotionParam": act_map.get(action, 0) }
                    }
                }
            elif cmd_type == "usage_mode":
                asdu = {
                    "PatrolDevice": {
                        "Type": 1101, "Command": 5, "Time": self.protocol.generate_time(),
                        "Items": { "Mode": cmd.get("mode", 0) }
                    }
                }
            elif cmd_type == "gait_switch":
                asdu = {
                    "PatrolDevice": {
                        "Type": 2, "Command": 23, "Time": self.protocol.generate_time(),
                        "Items": { "GaitParam": cmd.get("gait", 1) }
                    }
                }
            elif cmd_type == "light_control":
                light = cmd.get("light")
                state = 1 if cmd.get("state") else 0
                front = state if light == 'front' else 0
                back = state if light == 'rear' else 0
                asdu = {
                    "PatrolDevice": {
                        "Type": 1101, "Command": 2, "Time": self.protocol.generate_time(),
                        "Items": { "Front": front, "Back": back }
                    }
                }
            elif cmd_type == "nav_task":
                asdu = {
                    "PatrolDevice": {
                        "Type": 1003, "Command": 1, "Time": self.protocol.generate_time(),
                        "Items": cmd.get("payload", {})
                    }
                }
            elif cmd_type == "nav_cancel":
                asdu = {
                    "PatrolDevice": {
                        "Type": 1004, "Command": 1, "Time": self.protocol.generate_time(),
                        "Items": {}
                    }
                }
            elif cmd_type == "init_localize":
                asdu = {
                    "PatrolDevice": {
                        "Type": 2101, "Command": 1, "Time": self.protocol.generate_time(),
                        "Items": {
                            "PosX": cmd.get("x", 0.0),
                            "PosY": cmd.get("y", 0.0),
                            "PosZ": cmd.get("z", 0.0),
                            "Yaw": cmd.get("yaw", 0.0)
                        }
                    }
                }
            elif cmd_type == "get_map_position":
                asdu = {
                    "PatrolDevice": {
                        "Type": 1007, "Command": 2, "Time": self.protocol.generate_time(),
                        "Items": {}
                    }
                }
            elif cmd_type == "get_nav_perception":
                asdu = {
                    "PatrolDevice": {
                        "Type": 2002, "Command": 1, "Time": self.protocol.generate_time(),
                        "Items": {}
                    }
                }
            elif cmd_type == "query_nav_status":
                asdu = {
                    "PatrolDevice": {
                        "Type": 1007, "Command": 1, "Time": self.protocol.generate_time(),
                        "Items": {}
                    }
                }

            if asdu:
                if not self.sock:
                    self._mock_m20_response(cmd)
                else:
                    self.send_to_m20(self.protocol.build_apdu(asdu))
            
        except Exception as e:
            logging.error(f"Parse Agora cmd error: {e}")
            
    def _mock_m20_response(self, cmd):
        """Mock response for local testing without the robot dog"""
        if cmd.get("type") == "motion_control":
            resp = {
                "type": "robot_status",
                "category": "basic_status",
                "data": {
                    "motionStateLabel": f"模拟({cmd.get('action')})",
                    "version": "v1.0-mock"
                }
            }
            # mock delay
            threading.Timer(0.5, self.send_to_agora, args=(resp,)).start()

    def send_to_m20(self, apdu_bytes):
        if self.sock:
            try:
                self.sock.sendall(apdu_bytes)
            except Exception as e:
                logging.error(f"TCP Send error: {e}")

if __name__ == '__main__':
    bridge = AgoraDeviceBridge()
    if not HAS_AGORA_SDK:
        logging.warning("Agora Python SDK is not installed. Bridge will not connect to Agora.")
    bridge.start()
