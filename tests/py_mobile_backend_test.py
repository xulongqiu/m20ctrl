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


if __name__ == "__main__":
    unittest.main()
