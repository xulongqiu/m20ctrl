import base64
import errno
import json
import os
import sys
import struct
import tempfile
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend_py.server import (
    M20ProtocolPy,
    MobileController,
    RobotTcpClient,
    WebSocketCodec,
    resolve_map_path,
)


class MobileBackendTest(unittest.TestCase):
    def make_args(self):
        class Args:
            nav_route_mode = "custom"
            m20_host = "10.21.31.103"
            m20_port = 30001
            nav_host = "127.0.0.1"
            nav_port = 30011
            nav_viz_host = "127.0.0.1"
            nav_viz_port = 30013
            nav_viz_register_port = 30012
            map_root = tempfile.mkdtemp()

        return Args()

    def test_apdu_round_trip_builds_navigation_task(self):
        protocol = M20ProtocolPy()
        frame = protocol.build_nav_task({"PosX": 1.25, "PosY": -0.5})
        parsed = protocol.parse_apdu(frame)

        self.assertEqual(parsed["PatrolDevice"]["Type"], 1003)
        self.assertEqual(parsed["PatrolDevice"]["Command"], 1)
        self.assertEqual(parsed["PatrolDevice"]["Items"]["PosX"], 1.25)
        self.assertEqual(frame[:4], bytes([0xEB, 0x91, 0xEB, 0x90]))
        self.assertEqual(struct.unpack("<H", frame[4:6])[0], len(frame) - 16)

    def test_websocket_codec_decodes_masked_text_and_encodes_extended_text(self):
        payload = json.dumps({"type": "nav_view", "data": "x" * 200}).encode("utf-8")
        mask = b"\x01\x02\x03\x04"
        header = bytes([0x81, 0x80 | 126]) + struct.pack("!H", len(payload)) + mask
        masked = bytes(b ^ mask[i % 4] for i, b in enumerate(payload))

        messages, remaining = WebSocketCodec.feed(header + masked)

        self.assertEqual(remaining, b"")
        self.assertEqual(json.loads(messages[0])["type"], "nav_view")
        encoded = WebSocketCodec.encode_text(messages[0])
        self.assertEqual(encoded[0], 0x81)
        self.assertEqual(encoded[1], 126)
        self.assertEqual(struct.unpack("!H", encoded[2:4])[0], len(messages[0].encode("utf-8")))

    def test_resolve_map_path_restricts_to_map_root(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = os.path.join(tmp, "map")
            os.mkdir(root)
            good = resolve_map_path(root, "/map/occ_grid.pgm")
            self.assertEqual(good, os.path.join(root, "occ_grid.pgm"))
            with self.assertRaises(ValueError):
                resolve_map_path(root, "/map/../secret")

    def test_parse_basic_status_report_matches_frontend_categories(self):
        protocol = M20ProtocolPy()
        parsed = protocol.parse_status_report({
            "PatrolDevice": {
                "Type": 1002,
                "Command": 6,
                "Items": {
                    "BasicStatus": {
                        "MotionState": 6,
                        "Gait": 4097,
                        "Charge": 0,
                        "HES": 0,
                        "ControlUsageMode": 1,
                        "Direction": 0,
                        "OOA": 2,
                        "PowerManagement": 0,
                        "Sleep": 0,
                        "Version": "v1",
                    }
                },
            }
        })

        self.assertEqual(parsed["category"], "basic_status")
        self.assertEqual(parsed["command"], 6)
        self.assertEqual(parsed["data"]["motionState"], 6)
        self.assertEqual(parsed["data"]["motionStateLabel"], "标准运动模式")
        self.assertEqual(parsed["data"]["usageModeLabel"], "导航模式")

    def test_nav_viz_status_tracks_received_packets_like_node_backend(self):
        controller = MobileController(self.make_args())

        controller.record_nav_viz_packet(("127.0.0.1", 30012))
        status = controller.nav_viz_status()

        self.assertEqual(status["type"], "nav_viz_status")
        self.assertEqual(status["packetCount"], 1)
        self.assertEqual(status["lastSender"], "127.0.0.1:30012")
        self.assertGreater(status["lastReceivedAt"], 0)
        self.assertIsNotNone(status["ageMs"])
        self.assertEqual(status["pingTarget"], "127.0.0.1:30012")

    def test_tcp_reader_treats_closed_socket_as_normal_shutdown(self):
        class ClosedSocket:
            def recv(self, _size):
                raise OSError(errno.EBADF, "Bad file descriptor")

        protocol = M20ProtocolPy()
        client = RobotTcpClient("test", protocol, lambda _name, _asdu: None)
        client.sock = ClosedSocket()
        client.connected = True

        client._read_loop()

        self.assertFalse(client.connected)

    def test_tcp_reader_resyncs_after_non_json_vendor_frame(self):
        class ChunkSocket:
            def __init__(self, chunks):
                self.chunks = list(chunks)

            def recv(self, _size):
                if self.chunks:
                    return self.chunks.pop(0)
                return b""

        protocol = M20ProtocolPy()
        bad_body = b"\xff\xfe-not-json"
        bad_header = bytearray(16)
        bad_header[0:4] = protocol.HEADER
        struct.pack_into("<H", bad_header, 4, len(bad_body))
        good_frame = protocol.build_apdu({
            "PatrolDevice": {
                "Type": 100,
                "Command": 100,
                "Items": {},
            }
        })
        received = []
        client = RobotTcpClient("test", protocol, lambda _name, asdu: received.append(asdu))
        client.sock = ChunkSocket([bytes(bad_header) + bad_body + good_frame])
        client.connected = True

        client._read_loop()

        self.assertEqual(len(received), 1)
        self.assertEqual(received[0]["PatrolDevice"]["Type"], 100)

    def test_stale_frontend_command_is_dropped_before_tcp_send(self):
        controller = MobileController(self.make_args())
        sends = []
        controller.m20.connected = True
        controller.m20.send = lambda frame: sends.append(frame) or True
        now_ms = int(__import__("time").time() * 1000)

        stale = controller.handle_message({
            "type": "motion_control",
            "action": "stand",
            "clientTs": now_ms - 6000,
        })
        skewed_but_accepted = controller.handle_message({
            "type": "motion_control",
            "action": "stand",
            "clientTs": now_ms - 2500,
        })
        fresh = controller.handle_message({
            "type": "motion_control",
            "action": "stand",
            "clientTs": now_ms,
        })

        self.assertEqual(stale["type"], "command_dropped")
        self.assertEqual(len(sends), 2)
        self.assertIsNone(skewed_but_accepted)
        self.assertIsNone(fresh)

    def test_broadcast_removes_dead_websocket_clients(self):
        class DeadClient:
            def send_json(self, _payload):
                raise OSError("broken pipe")

        class LiveClient:
            def __init__(self):
                self.payloads = []

            def send_json(self, payload):
                self.payloads.append(payload)

        controller = MobileController(self.make_args())
        dead = DeadClient()
        live = LiveClient()
        controller.clients.update({dead, live})

        controller.broadcast({"type": "robot_status"})

        self.assertNotIn(dead, controller.clients)
        self.assertIn(live, controller.clients)
        self.assertEqual(live.payloads, [{"type": "robot_status"}])

    def test_light_control_preserves_full_front_back_state(self):
        protocol = M20ProtocolPy()

        frame = protocol.build_light_control({
            "light": "rear",
            "state": True,
            "front": True,
            "back": True,
        })
        parsed = protocol.parse_apdu(frame)
        items = parsed["PatrolDevice"]["Items"]

        self.assertEqual(items["Front"], 1)
        self.assertEqual(items["Back"], 1)

    def test_new_websocket_receives_cached_nav_view_snapshot(self):
        class Handler:
            def __init__(self):
                self.messages = []

            def send_json(self, payload):
                self.messages.append(payload)

        controller = MobileController(self.make_args())
        controller.record_nav_view({"pose": {"x": 1.0}}, ("127.0.0.1", 30013))
        handler = Handler()

        controller.add_ws(handler)

        nav_messages = [msg for msg in handler.messages if msg.get("type") == "nav_view"]
        self.assertEqual(len(nav_messages), 1)
        self.assertEqual(nav_messages[0]["data"]["pose"]["x"], 1.0)

    def test_locations_are_saved_under_map_root(self):
        controller = MobileController(self.make_args())
        broadcasts = []
        controller.broadcast = lambda payload: broadcasts.append(payload)

        controller.save_location({
            "name": "dock",
            "posX": -1.25,
            "posY": 2.5,
            "yaw": -0.3,
        })
        locations = controller.load_locations()

        self.assertEqual(len(locations), 1)
        self.assertEqual(locations[0]["name"], "dock")
        self.assertEqual(locations[0]["posX"], -1.25)
        self.assertTrue(os.path.exists(os.path.join(controller.args.map_root, "locations.json")))
        self.assertEqual(broadcasts[-1]["type"], "locations_updated")

    def test_locations_update_delete_and_clear(self):
        controller = MobileController(self.make_args())
        controller.broadcast = lambda _payload: None
        first = controller.save_location({"name": "p1", "posX": 1, "posY": 2})
        loc_id = first["id"]

        controller.update_location(loc_id, {"posX": 3.5})
        self.assertEqual(controller.load_locations()[0]["posX"], 3.5)

        controller.delete_location(loc_id)
        self.assertEqual(controller.load_locations(), [])

        controller.save_location({"name": "p2", "posX": 4, "posY": 5})
        controller.write_locations([])
        self.assertEqual(controller.load_locations(), [])


if __name__ == "__main__":
    unittest.main()
