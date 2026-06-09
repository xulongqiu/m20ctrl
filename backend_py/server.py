#!/usr/bin/env python3
"""Mobile-friendly m20ctrl backend using only Python standard library."""

import argparse
import base64
import errno
import hashlib
import http.server
import json
import mimetypes
import os
import socket
import socketserver
import struct
import threading
import time
import traceback
import urllib.parse
import uuid


ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DEFAULT_MAP_ROOT = os.path.join(ROOT_DIR, "data")
STALE_COMMAND_MAX_AGE_SEC = 5.0
WS_IDLE_TIMEOUT_SEC = 30.0
WS_SEND_TIMEOUT_SEC = 0.5
FRESH_COMMAND_TYPES = {
    "motion_control", "usage_mode", "axis_control", "gait_switch", "light_control",
    "nav_task", "nav_cancel", "init_localize",
}


class M20ProtocolPy:
    HEADER = bytes([0xEB, 0x91, 0xEB, 0x90])
    HEADER_SIZE = 16
    MOTION_STATE_MAP = {
        0: "空闲", 1: "站立", 2: "关节阻尼/软急停", 3: "开机阻尼",
        4: "趴下", 6: "标准运动模式", 8: "敏捷运动模式",
    }
    GAIT_MAP = {
        0: "未知", 4097: "基础(标准)", 4098: "高台(标准)",
        12: "平地(敏捷)", 13: "楼梯(敏捷)", 4099: "楼梯(标准)",
    }
    CHARGE_STATE_MAP = {
        0: "空闲", 1: "前往充电桩", 2: "充电中",
        3: "退出充电桩", 4: "机器人异常", 5: "在桩上未充电",
    }
    USAGE_MODE_MAP = {0: "常规模式", 1: "导航模式", 2: "辅助模式"}
    OOA_MAP = {0: "未启动", 1: "空闲中", 2: "未触发避障", 3: "主动避障中"}

    def __init__(self):
        self.message_id = 0
        self.lock = threading.Lock()

    def _time(self):
        return time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())

    def _next_message_id(self):
        with self.lock:
            self.message_id = (self.message_id + 1) % 65536
            return self.message_id

    def build_apdu(self, asdu):
        body = json.dumps(asdu, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        header = bytearray(16)
        header[0:4] = self.HEADER
        struct.pack_into("<H", header, 4, len(body))
        struct.pack_into("<H", header, 6, self._next_message_id())
        header[8] = 0x01
        return bytes(header) + body

    def parse_apdu(self, frame):
        if len(frame) < self.HEADER_SIZE:
            raise ValueError("APDU frame too short")
        if frame[:4] != self.HEADER:
            raise ValueError("APDU header mismatch")
        length = struct.unpack_from("<H", frame, 4)[0]
        if len(frame) < self.HEADER_SIZE + length:
            raise ValueError("APDU frame incomplete")
        return json.loads(frame[self.HEADER_SIZE:self.HEADER_SIZE + length].decode("utf-8"))

    def find_next_header(self, buffer, start=1):
        return buffer.find(self.HEADER, start)

    def build_patrol(self, type_code, command, items=None):
        return self.build_apdu({
            "PatrolDevice": {
                "Type": type_code,
                "Command": command,
                "Time": self._time(),
                "Items": items or {},
            }
        })

    def build_heartbeat(self):
        return self.build_patrol(100, 100, {})

    def build_motion_control(self, action):
        action_map = {"idle": 0, "stand": 1, "damping": 2, "down": 4, "walk": 6}
        return self.build_patrol(2, 22, {"MotionParam": action_map.get(action, 0)})

    def build_usage_mode_switch(self, mode):
        return self.build_patrol(1101, 5, {"Mode": int(mode)})

    def build_gait_switch(self, gait):
        return self.build_patrol(2, 23, {"GaitParam": int(gait)})

    def build_axis_control(self, axes):
        axes = axes or {}
        return self.build_patrol(2, 21, {
            "X": float(axes.get("X", 0.0)),
            "Y": float(axes.get("Y", 0.0)),
            "Z": float(axes.get("Z", 0.0)),
            "Roll": float(axes.get("Roll", 0.0)),
            "Pitch": float(axes.get("Pitch", 0.0)),
            "Yaw": float(axes.get("Yaw", 0.0)),
        })

    def build_light_control(self, payload):
        payload = payload or {}
        if "front" in payload or "back" in payload:
            return self.build_patrol(1101, 2, {
                "Front": 1 if bool(payload.get("front")) else 0,
                "Back": 1 if bool(payload.get("back")) else 0,
            })
        light = payload.get("light")
        state = bool(payload.get("state"))
        return self.build_patrol(1101, 2, {
            "Front": 1 if light == "front" and state else 0,
            "Back": 1 if light == "rear" and state else 0,
        })

    def build_nav_task(self, payload):
        return self.build_patrol(1003, 1, payload or {})

    def build_nav_cancel(self):
        return self.build_patrol(1004, 1, {})

    def build_init_localize(self, payload):
        payload = payload or {}
        return self.build_patrol(2101, 1, {
            "PosX": float(payload.get("x", 0.0)),
            "PosY": float(payload.get("y", 0.0)),
            "PosZ": float(payload.get("z", 0.0)),
            "Yaw": float(payload.get("yaw", 0.0)),
        })

    def build_get_map_position(self):
        return self.build_patrol(1007, 2, {})

    def build_get_nav_perception(self):
        return self.build_patrol(2002, 1, {})

    def build_query_nav_task_status(self):
        return self.build_patrol(1007, 1, {})

    def parse_status_report(self, asdu):
        pd = asdu.get("PatrolDevice") if isinstance(asdu, dict) else None
        if not pd:
            return None
        type_code = pd.get("Type")
        command = pd.get("Command")
        items = pd.get("Items") or {}
        if type_code == 100 and command == 100:
            return {"category": "heartbeat", "command": command, "data": {}}
        if type_code != 1002:
            return {
                "category": "command_response",
                "command": command,
                "data": items,
                "type": type_code,
            }
        if command == 6:
            return self._parse_basic_status(items)
        if command == 4:
            return self._parse_motion_status(items)
        if command == 5:
            return self._parse_device_status(items)
        if command == 3:
            return self._parse_error_status(items)
        return {"category": "unknown", "command": command, "data": items}

    def _label(self, mapping, value):
        return mapping.get(value, f"未知({value})")

    def _parse_basic_status(self, items):
        bs = items.get("BasicStatus") or {}
        return {
            "category": "basic_status",
            "command": 6,
            "data": {
                "motionState": bs.get("MotionState"),
                "motionStateLabel": self._label(self.MOTION_STATE_MAP, bs.get("MotionState")),
                "gait": bs.get("Gait"),
                "gaitLabel": self._label(self.GAIT_MAP, bs.get("Gait")),
                "charge": bs.get("Charge"),
                "chargeLabel": self._label(self.CHARGE_STATE_MAP, bs.get("Charge")),
                "hes": bs.get("HES"),
                "hesLabel": "已触发" if bs.get("HES") == 1 else "未触发",
                "controlUsageMode": bs.get("ControlUsageMode"),
                "usageModeLabel": self._label(self.USAGE_MODE_MAP, bs.get("ControlUsageMode")),
                "direction": bs.get("Direction"),
                "directionLabel": "正向" if bs.get("Direction") == 0 else "后向",
                "ooa": bs.get("OOA"),
                "ooaLabel": self._label(self.OOA_MAP, bs.get("OOA")),
                "powerManagement": bs.get("PowerManagement"),
                "powerLabel": "常规模式" if bs.get("PowerManagement") == 0 else "单电池模式",
                "sleep": bs.get("Sleep"),
                "sleepLabel": "已休眠" if bs.get("Sleep") else "未休眠",
                "version": bs.get("Version") or "--",
            },
        }

    def _parse_motion_status(self, items):
        ms = items.get("MotionStatus") or {}
        motor = items.get("MotorStatus") or {}
        return {
            "category": "motion_status",
            "command": 4,
            "data": {
                "roll": ms.get("Roll"),
                "pitch": ms.get("Pitch"),
                "yaw": ms.get("Yaw"),
                "omegaZ": ms.get("OmegaZ"),
                "linearX": ms.get("LinearX"),
                "linearY": ms.get("LinearY"),
                "height": ms.get("Height"),
                "remainMile": ms.get("RemainMile"),
                "motorStatus": motor,
            },
        }

    def _parse_device_status(self, items):
        bat = items.get("BatteryStatus") or {}
        led = items.get("Led") or {}
        gps = items.get("GPS") or {}
        cpu = items.get("CPU") or {}
        dev_enable = items.get("DevEnable") or {}
        fill = led.get("Fill") or {}
        lidar = dev_enable.get("Lidar") or {}
        video = dev_enable.get("Video") or {}
        return {
            "category": "device_status",
            "command": 5,
            "data": {
                "battery": {
                    "voltageLeft": bat.get("VoltageLeft"),
                    "voltageRight": bat.get("VoltageRight"),
                    "levelLeft": bat.get("BatteryLevelLeft"),
                    "levelRight": bat.get("BatteryLevelRight"),
                    "tempLeft": bat.get("battery_temperatureLeft"),
                    "tempRight": bat.get("battery_temperatureRight"),
                    "chargeLeft": bat.get("chargeLeft"),
                    "chargeRight": bat.get("chargeRight"),
                },
                "led": {"front": fill.get("Front"), "back": fill.get("Back")},
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
                    "visibleSatellites": gps.get("VisibleSatellites"),
                },
                "cpu": {
                    "aos": cpu.get("AOS") or {},
                    "nos": cpu.get("NOS") or {},
                    "gos": cpu.get("GOS") or {},
                },
                "devEnable": {
                    "fanSpeed": dev_enable.get("FanSpeed"),
                    "loadPower": dev_enable.get("LoadPower"),
                    "lidarFront": lidar.get("Front"),
                    "lidarBack": lidar.get("Back"),
                    "gpsPower": dev_enable.get("GPS"),
                    "videoFront": video.get("Front"),
                    "videoBack": video.get("Back"),
                },
            },
        }

    def _parse_error_status(self, items):
        errors = items.get("ErrorList") or []
        return {
            "category": "error_status",
            "command": 3,
            "data": {
                "errors": [
                    {"errorCode": err.get("errorCode"), "component": err.get("component")}
                    for err in errors if isinstance(err, dict)
                ],
                "hasError": len(errors) > 0,
            },
        }


class WebSocketCodec:
    @staticmethod
    def feed(buffer):
        messages = []
        offset = 0
        while len(buffer) - offset >= 2:
            b1 = buffer[offset]
            b2 = buffer[offset + 1]
            opcode = b1 & 0x0F
            masked = (b2 & 0x80) != 0
            length = b2 & 0x7F
            pos = offset + 2
            if length == 126:
                if len(buffer) < pos + 2:
                    break
                length = struct.unpack("!H", buffer[pos:pos + 2])[0]
                pos += 2
            elif length == 127:
                if len(buffer) < pos + 8:
                    break
                length = struct.unpack("!Q", buffer[pos:pos + 8])[0]
                pos += 8
            if masked:
                if len(buffer) < pos + 4:
                    break
                mask = buffer[pos:pos + 4]
                pos += 4
            else:
                mask = b""
            if len(buffer) < pos + length:
                break
            payload = buffer[pos:pos + length]
            offset = pos + length
            if masked:
                payload = bytes(byte ^ mask[i % 4] for i, byte in enumerate(payload))
            if opcode == 0x1:
                messages.append(payload.decode("utf-8"))
            elif opcode == 0x8:
                raise ConnectionError("websocket closed")
        return messages, buffer[offset:]

    @staticmethod
    def encode_text(text):
        payload = text.encode("utf-8")
        if len(payload) < 126:
            header = bytes([0x81, len(payload)])
        elif len(payload) <= 0xFFFF:
            header = bytes([0x81, 126]) + struct.pack("!H", len(payload))
        else:
            header = bytes([0x81, 127]) + struct.pack("!Q", len(payload))
        return header + payload


class RobotTcpClient:
    def __init__(self, name, protocol, on_message):
        self.name = name
        self.protocol = protocol
        self.on_message = on_message
        self.host = None
        self.port = None
        self.sock = None
        self.connected = False
        self.stop_event = threading.Event()
        self.lock = threading.Lock()
        self.reader_thread = None
        self.heartbeat_thread = None

    def connect(self, host, port):
        self.disconnect()
        self.host = host
        self.port = int(port)
        sock = socket.create_connection((self.host, self.port), timeout=3)
        sock.settimeout(1.0)
        with self.lock:
            self.sock = sock
            self.connected = True
            self.stop_event.clear()
        self.reader_thread = threading.Thread(target=self._read_loop, daemon=True)
        self.heartbeat_thread = threading.Thread(target=self._heartbeat_loop, daemon=True)
        self.reader_thread.start()
        self.heartbeat_thread.start()

    def disconnect(self):
        self.stop_event.set()
        with self.lock:
            sock = self.sock
            self.sock = None
            self.connected = False
        if sock:
            try:
                sock.close()
            except OSError:
                pass

    def send(self, frame):
        with self.lock:
            sock = self.sock
            connected = self.connected
        if not sock or not connected:
            return False
        try:
            sock.sendall(frame)
            return True
        except OSError:
            self.disconnect()
            return False

    def _heartbeat_loop(self):
        while not self.stop_event.wait(5.0):
            self.send(self.protocol.build_heartbeat())

    def _read_loop(self):
        buffer = b""
        try:
            while not self.stop_event.is_set():
                with self.lock:
                    sock = self.sock
                if not sock:
                    break
                try:
                    chunk = sock.recv(65536)
                except socket.timeout:
                    continue
                except OSError as exc:
                    if self.stop_event.is_set() or exc.errno in (errno.EBADF, errno.ENOTCONN):
                        break
                    print(f"[{self.name}] read error: {exc}")
                    break
                if not chunk:
                    break
                buffer += chunk
                while len(buffer) >= self.protocol.HEADER_SIZE:
                    if buffer[:4] != self.protocol.HEADER:
                        idx = buffer.find(self.protocol.HEADER, 1)
                        buffer = buffer[idx:] if idx >= 0 else b""
                        break
                    length = struct.unpack_from("<H", buffer, 4)[0]
                    total = self.protocol.HEADER_SIZE + length
                    if len(buffer) < total:
                        break
                    frame = buffer[:total]
                    buffer = buffer[total:]
                    try:
                        self.on_message(self.name, self.protocol.parse_apdu(frame))
                    except (UnicodeDecodeError, json.JSONDecodeError):
                        next_header = self.protocol.find_next_header(frame + buffer, 1)
                        if next_header >= 0:
                            buffer = (frame + buffer)[next_header:]
                        else:
                            buffer = b""
                            break
                    except Exception as exc:
                        print(f"[{self.name}] parse error: {exc}")
        finally:
            with self.lock:
                self.connected = False


class MobileController:
    def __init__(self, args):
        self.args = args
        self.protocol = M20ProtocolPy()
        self.clients = set()
        self.clients_lock = threading.Lock()
        self.nav_route_mode = args.nav_route_mode
        self.m20 = RobotTcpClient("vendor", self.protocol, self._on_tcp_message)
        self.nav = RobotTcpClient("custom_nav", self.protocol, self._on_tcp_message)
        self.nav_viz_socket = None
        self.nav_viz_stop = threading.Event()
        self.nav_viz_lock = threading.Lock()
        self.nav_viz_packet_count = 0
        self.nav_viz_last_received_at = 0.0
        self.nav_viz_last_sender = None
        self.nav_viz_ping_count = 0
        self.last_nav_view = None
        self.locations_lock = threading.Lock()

    def start(self):
        self._try_connect_vendor()
        if self.nav_route_mode == "custom":
            self._try_connect_nav()
        threading.Thread(target=self._nav_viz_loop, daemon=True).start()
        threading.Thread(target=self._nav_viz_ping_loop, daemon=True).start()

    def add_ws(self, handler):
        with self.clients_lock:
            self.clients.add(handler)
        handler.send_json({"type": "connected", "message": "已连接到 Python 控制服务器"})
        if self.m20.connected:
            handler.send_json({
                "type": "robot_connected",
                "message": f"已连接到M20 ({self.args.m20_host}:{self.args.m20_port})",
            })
        else:
            handler.send_json({
                "type": "robot_disconnected",
                "message": f"未连接到M20 ({self.args.m20_host}:{self.args.m20_port})",
            })
        handler.send_json({"type": "nav_link_status", **self.nav_status()})
        handler.send_json(self.nav_viz_status())
        with self.nav_viz_lock:
            last_nav_view = self.last_nav_view
        if last_nav_view is not None:
            handler.send_json({"type": "nav_view", "data": last_nav_view})

    def remove_ws(self, handler):
        with self.clients_lock:
            self.clients.discard(handler)

    def broadcast(self, payload):
        with self.clients_lock:
            clients = list(self.clients)
        stale = []
        for client in clients:
            try:
                client.send_json(payload)
            except OSError:
                stale.append(client)
        if stale:
            with self.clients_lock:
                for client in stale:
                    self.clients.discard(client)

    def nav_status(self):
        return {
            "routeMode": self.nav_route_mode,
            "host": self.args.nav_host,
            "port": self.args.nav_port,
            "connected": self.nav.connected,
            "vizPort": self.args.nav_viz_port,
        }

    def handle_message(self, payload):
        msg_type = payload.get("type")
        try:
            if msg_type == "heartbeat":
                return {"type": "heartbeat_ack"}
            if msg_type == "config_m20":
                self.args.m20_host = payload.get("host") or self.args.m20_host
                self.args.m20_port = int(payload.get("port") or self.args.m20_port)
                self._try_connect_vendor()
                return None
            if msg_type == "config_nav":
                self.args.nav_host = payload.get("host") or self.args.nav_host
                self.args.nav_port = int(payload.get("port") or self.args.nav_port)
                self.nav_route_mode = "custom" if payload.get("routeMode") == "custom" else "vendor"
                if self.nav_route_mode == "custom":
                    self._try_connect_nav()
                    self.send_nav_viz_ping("config_nav")
                else:
                    self.nav.disconnect()
                self.broadcast({"type": "nav_link_status", **self.nav_status()})
                return None
            if msg_type == "nav_route":
                self.nav_route_mode = "custom" if payload.get("routeMode") == "custom" else "vendor"
                if self.nav_route_mode == "custom":
                    self._try_connect_nav()
                    self.send_nav_viz_ping("nav_route")
                else:
                    self.nav.disconnect()
                self.broadcast({"type": "nav_link_status", **self.nav_status()})
                return None
            if msg_type == "nav_viz_ping":
                self.send_nav_viz_ping(payload.get("reason") or "frontend")
                return self.nav_viz_status()
            if msg_type == "load_locations":
                return {"type": "locations_updated", "data": self.load_locations()}
            if msg_type == "save_location":
                self.save_location(payload.get("payload") or {})
                return None
            if msg_type == "delete_location":
                self.delete_location(payload.get("id"))
                return None
            if msg_type == "update_location":
                self.update_location(payload.get("id"), payload.get("updates") or {})
                return None
            if msg_type == "clear_locations":
                self.write_locations([])
                self.broadcast({"type": "locations_updated", "data": []})
                return None

            stale_reason = self.command_stale_reason(msg_type, payload)
            if stale_reason:
                print(f"[frontend] dropped command={msg_type} reason={stale_reason}", flush=True)
                return {"type": "command_dropped", "message": stale_reason, "command": msg_type}

            frame = self._build_frame(msg_type, payload)
            if frame is None:
                return None
            is_nav = msg_type in {
                "nav_task", "nav_cancel", "init_localize", "get_map_position",
                "get_nav_perception", "query_nav_status",
            }
            target = self.nav if is_nav and self.nav_route_mode == "custom" else self.m20
            sent = target.send(frame)
            print(
                f"[frontend] command={msg_type} target={target.name} "
                f"connected={target.connected} bytes={len(frame)} sent={sent}",
                flush=True,
            )
            if not sent:
                return {"type": "error", "message": f"{target.name} 未连接"}
        except Exception as exc:
            return {"type": "error", "message": f"{msg_type} 处理失败: {exc}"}
        return None

    def command_stale_reason(self, msg_type, payload):
        if msg_type not in FRESH_COMMAND_TYPES:
            return None
        client_ts = payload.get("clientTs")
        if client_ts is None:
            return "missing clientTs"
        try:
            age_sec = time.time() - (float(client_ts) / 1000.0)
        except (TypeError, ValueError):
            return f"invalid clientTs={client_ts!r}"
        if age_sec > STALE_COMMAND_MAX_AGE_SEC:
            return f"stale age={age_sec:.3f}s limit={STALE_COMMAND_MAX_AGE_SEC:.3f}s"
        return None

    def _build_frame(self, msg_type, payload):
        if msg_type == "motion_control":
            return self.protocol.build_motion_control(payload.get("action"))
        if msg_type == "usage_mode":
            return self.protocol.build_usage_mode_switch(payload.get("mode", 0))
        if msg_type == "axis_control":
            return self.protocol.build_axis_control(payload.get("axes") or {})
        if msg_type == "gait_switch":
            return self.protocol.build_gait_switch(payload.get("gait", 0))
        if msg_type == "light_control":
            return self.protocol.build_light_control(payload)
        if msg_type == "nav_task":
            return self.protocol.build_nav_task(payload.get("payload") or {})
        if msg_type == "nav_cancel":
            return self.protocol.build_nav_cancel()
        if msg_type == "init_localize":
            return self.protocol.build_init_localize(payload.get("payload") or {})
        if msg_type == "get_map_position":
            return self.protocol.build_get_map_position()
        if msg_type == "get_nav_perception":
            return self.protocol.build_get_nav_perception()
        if msg_type == "query_nav_status":
            return self.protocol.build_query_nav_task_status()
        return None

    def locations_path(self):
        return os.path.join(os.path.abspath(self.args.map_root), "locations.json")

    def load_locations(self):
        path = self.locations_path()
        try:
            with self.locations_lock:
                if not os.path.exists(path):
                    return []
                with open(path, "r", encoding="utf-8") as f:
                    data = json.load(f)
            return data if isinstance(data, list) else []
        except Exception as exc:
            print(f"[locations] load failed: {exc}", flush=True)
            return []

    def write_locations(self, locations):
        path = self.locations_path()
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with self.locations_lock:
            with open(path, "w", encoding="utf-8") as f:
                json.dump(locations, f, ensure_ascii=False, indent=2)

    def save_location(self, location):
        locations = self.load_locations()
        new_location = {
            "id": location.get("id") or f"loc-{int(time.time() * 1000)}-{uuid.uuid4().hex[:6]}",
            "name": location.get("name") or "未命名",
            "posX": float(location.get("posX") or 0.0),
            "posY": float(location.get("posY") or 0.0),
            "posZ": float(location.get("posZ") or 0.0),
            "yaw": float(location.get("yaw") or 0.0),
            "createdAt": time.strftime("%Y-%m-%dT%H:%M:%S%z", time.localtime()),
        }
        locations.append(new_location)
        self.write_locations(locations)
        print(f"[locations] saved {new_location['name']} -> {self.locations_path()}", flush=True)
        self.broadcast({"type": "locations_updated", "data": locations})
        return new_location

    def delete_location(self, loc_id):
        locations = self.load_locations()
        next_locations = [l for l in locations if str(l.get("id")) != str(loc_id)]
        if len(next_locations) == len(locations):
            raise ValueError(f"地点 id={loc_id} 不存在")
        self.write_locations(next_locations)
        print(f"[locations] deleted id={loc_id}", flush=True)
        self.broadcast({"type": "locations_updated", "data": next_locations})

    def update_location(self, loc_id, updates):
        locations = self.load_locations()
        numeric_keys = {"posX", "posY", "posZ", "yaw"}
        found = False
        next_locations = []
        for item in locations:
            if str(item.get("id")) != str(loc_id):
                next_locations.append(item)
                continue
            patch = {}
            for key, value in updates.items():
                patch[key] = float(value) if key in numeric_keys else value
            patch["updatedAt"] = time.strftime("%Y-%m-%dT%H:%M:%S%z", time.localtime())
            next_locations.append({**item, **patch})
            found = True
        if not found:
            raise ValueError(f"地点 id={loc_id} 不存在")
        self.write_locations(next_locations)
        print(f"[locations] updated id={loc_id}", flush=True)
        self.broadcast({"type": "locations_updated", "data": next_locations})

    def _try_connect_vendor(self):
        try:
            self.m20.connect(self.args.m20_host, self.args.m20_port)
            self.broadcast({"type": "robot_connected", "message": f"已连接到M20 ({self.args.m20_host}:{self.args.m20_port})"})
        except OSError as exc:
            print(f"[vendor] connect failed: {exc}")
            self.broadcast({"type": "robot_disconnected", "message": str(exc)})

    def _try_connect_nav(self):
        try:
            self.nav.connect(self.args.nav_host, self.args.nav_port)
            self.broadcast({"type": "nav_connected", "message": f"已连接到自研导航服务 ({self.args.nav_host}:{self.args.nav_port})"})
        except OSError as exc:
            print(f"[custom_nav] connect failed: {exc}")
            self.broadcast({"type": "error", "message": f"连接自研导航服务失败: {exc}"})

    def _on_tcp_message(self, source, asdu):
        parsed = self.protocol.parse_status_report(asdu)
        if not parsed or parsed["category"] == "heartbeat":
            return
        if parsed["category"] == "command_response":
            out = {
                "type": "command_response",
                "data": parsed["data"],
                "commandType": parsed["type"],
                "command": parsed["command"],
            }
            if source == "custom_nav":
                out["source"] = "custom_nav"
            self.broadcast(out)
        else:
            self.broadcast({
                "type": "robot_status" if source == "vendor" else "nav_status_report",
                "category": parsed["category"],
                "command": parsed["command"],
                "data": parsed["data"],
            })

    def _nav_viz_loop(self):
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        sock.bind(("0.0.0.0", self.args.nav_viz_port))
        self.nav_viz_socket = sock
        print(f"[nav_viz] listening UDP {self.args.nav_viz_port}")
        self.broadcast(self.nav_viz_status())
        while not self.nav_viz_stop.is_set():
            try:
                data, addr = sock.recvfrom(262144)
                text = data.decode("utf-8")
                if text.startswith('{"type":"register"') or text.startswith('{"type": "register"'):
                    continue
                snapshot = json.loads(text)
                self.record_nav_view(snapshot, addr)
                self.broadcast({"type": "nav_view", "data": snapshot})
                self.broadcast(self.nav_viz_status())
            except Exception as exc:
                print(f"[nav_viz] error: {exc}")

    def record_nav_viz_packet(self, addr):
        with self.nav_viz_lock:
            self.nav_viz_packet_count += 1
            self.nav_viz_last_received_at = time.time()
            self.nav_viz_last_sender = f"{addr[0]}:{addr[1]}"

    def record_nav_view(self, data, addr):
        with self.nav_viz_lock:
            self.nav_viz_packet_count += 1
            self.nav_viz_last_received_at = time.time()
            self.nav_viz_last_sender = f"{addr[0]}:{addr[1]}"
            self.last_nav_view = data
            count = self.nav_viz_packet_count
            sender = self.nav_viz_last_sender
        if count == 1 or count % 50 == 0:
            with self.clients_lock:
                client_count = len(self.clients)
            print(f"[nav_viz] packet={count} sender={sender} clients={client_count}", flush=True)

    def nav_viz_status(self):
        with self.nav_viz_lock:
            count = self.nav_viz_packet_count
            last_received = self.nav_viz_last_received_at
            last_sender = self.nav_viz_last_sender
            ping_count = self.nav_viz_ping_count
        return {
            "type": "nav_viz_status",
            "listening": self.nav_viz_socket is not None,
            "port": self.args.nav_viz_port,
            "packetCount": count,
            "lastReceivedAt": int(last_received * 1000) if last_received else 0,
            "lastSender": last_sender,
            "ageMs": int((time.time() - last_received) * 1000) if last_received else None,
            "pingCount": ping_count,
            "pingTarget": f"{self.args.nav_viz_host}:{self.args.nav_viz_register_port}",
        }

    def _nav_viz_ping_loop(self):
        while True:
            time.sleep(5.0)
            if self.nav_route_mode == "custom":
                self.send_nav_viz_ping("keepalive")

    def send_nav_viz_ping(self, reason):
        sock = self.nav_viz_socket
        if not sock:
            return
        payload = json.dumps({
            "type": "register",
            "client": "m20ctrl-python",
            "want": "nav_view",
            "reason": reason,
            "ts": time.time(),
        }, separators=(",", ":")).encode("utf-8")
        sock.sendto(payload, (self.args.nav_viz_host, self.args.nav_viz_register_port))
        with self.nav_viz_lock:
            self.nav_viz_ping_count += 1


class WebSocketHandler(socketserver.BaseRequestHandler):
    controller = None

    def handle(self):
        try:
            if not self._handshake():
                return
            self.request.settimeout(WS_IDLE_TIMEOUT_SEC)
            self._set_send_timeout(WS_SEND_TIMEOUT_SEC)
            self.controller.add_ws(self)
            buffer = b""
            while True:
                chunk = self.request.recv(65536)
                if not chunk:
                    break
                buffer += chunk
                messages, buffer = WebSocketCodec.feed(buffer)
                for text in messages:
                    try:
                        reply = self.controller.handle_message(json.loads(text))
                        if reply:
                            self.send_json(reply)
                    except Exception as exc:
                        self.send_json({"type": "error", "message": str(exc)})
        except ConnectionError:
            pass
        except socket.timeout:
            print("[websocket] idle timeout; closing client", flush=True)
        except Exception:
            traceback.print_exc()
        finally:
            self.controller.remove_ws(self)

    def _handshake(self):
        data = b""
        while b"\r\n\r\n" not in data:
            chunk = self.request.recv(4096)
            if not chunk:
                return False
            data += chunk
        headers = {}
        for line in data.decode("latin1").split("\r\n")[1:]:
            if ":" in line:
                key, value = line.split(":", 1)
                headers[key.strip().lower()] = value.strip()
        key = headers.get("sec-websocket-key")
        if not key:
            return False
        accept = base64.b64encode(hashlib.sha1((key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11").encode("ascii")).digest()).decode("ascii")
        self.request.sendall((
            "HTTP/1.1 101 Switching Protocols\r\n"
            "Upgrade: websocket\r\n"
            "Connection: Upgrade\r\n"
            f"Sec-WebSocket-Accept: {accept}\r\n\r\n"
        ).encode("ascii"))
        return True

    def _set_send_timeout(self, timeout_sec):
        seconds = int(timeout_sec)
        micros = int((timeout_sec - seconds) * 1000000)
        try:
            self.request.setsockopt(socket.SOL_SOCKET, socket.SO_SNDTIMEO, struct.pack("ll", seconds, micros))
        except OSError as exc:
            print(f"[websocket] failed to set send timeout: {exc}", flush=True)

    def send_json(self, payload):
        if isinstance(payload, dict) and "serverTimeMs" not in payload:
            payload = {**payload, "serverTimeMs": int(time.time() * 1000)}
        self.request.sendall(WebSocketCodec.encode_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":"))))


def resolve_map_path(map_root, request_path):
    prefix = "/map/"
    if not request_path.startswith(prefix):
        raise ValueError("not a map path")
    rel = urllib.parse.unquote(request_path[len(prefix):])
    full = os.path.abspath(os.path.join(map_root, rel))
    root = os.path.abspath(map_root)
    if full != root and not full.startswith(root + os.sep):
        raise ValueError("path escapes map root")
    return full


def make_http_handler(static_root, map_root):
    class Handler(http.server.SimpleHTTPRequestHandler):
        def translate_path(self, path):
            clean = urllib.parse.urlparse(path).path
            if clean.startswith("/map/"):
                try:
                    return resolve_map_path(map_root, clean)
                except ValueError:
                    return os.path.join(map_root, "__invalid__")
            if clean == "/":
                clean = "/index.html"
            rel = clean.lstrip("/")
            return os.path.abspath(os.path.join(static_root, rel))

        def end_headers(self):
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
            self.send_header("Pragma", "no-cache")
            self.send_header("Expires", "0")
            super().end_headers()

        def guess_type(self, path):
            if path.endswith(".pgm") or path.endswith(".yaml"):
                return "text/plain"
            return mimetypes.guess_type(path)[0] or "application/octet-stream"

    return Handler


class ReuseThreadingTCPServer(socketserver.ThreadingTCPServer):
    allow_reuse_address = True


def parse_args():
    parser = argparse.ArgumentParser(description="m20ctrl Python mobile backend")
    parser.add_argument("--http-port", type=int, default=8000)
    parser.add_argument("--ws-port", type=int, default=8080)
    parser.add_argument("--m20-host", default="10.21.31.103")
    parser.add_argument("--m20-port", type=int, default=30001)
    parser.add_argument("--nav-host", default="127.0.0.1")
    parser.add_argument("--nav-port", type=int, default=30011)
    parser.add_argument("--nav-route-mode", choices=["vendor", "custom"], default="custom")
    parser.add_argument("--nav-viz-host", default="127.0.0.1")
    parser.add_argument("--nav-viz-port", type=int, default=30013)
    parser.add_argument("--nav-viz-register-port", type=int, default=30012)
    parser.add_argument("--map-root", default=DEFAULT_MAP_ROOT)
    return parser.parse_args()


def main():
    args = parse_args()
    controller = MobileController(args)
    controller.start()

    WebSocketHandler.controller = controller
    ws_server = ReuseThreadingTCPServer(("0.0.0.0", args.ws_port), WebSocketHandler)
    ws_server.daemon_threads = True

    http_handler = make_http_handler(ROOT_DIR, args.map_root)
    http_server = ReuseThreadingTCPServer(("0.0.0.0", args.http_port), http_handler)
    http_server.daemon_threads = True

    threading.Thread(target=ws_server.serve_forever, daemon=True).start()
    print(f"[ws] listening 0.0.0.0:{args.ws_port}")
    print(f"[http] serving {ROOT_DIR} on 0.0.0.0:{args.http_port}")
    print(f"[map] serving {args.map_root} at /map/")
    try:
        http_server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        ws_server.shutdown()
        http_server.shutdown()


if __name__ == "__main__":
    main()
