#!/usr/bin/env python3
"""
NOS nav_viz UDP sniffer for m20ctrl debugging.

Sends a register/ping packet to the NOS streamer (so NOS learns this client's
addr/port and streams back), then prints the schema of received packets. Uses
only stdlib — no pip install needed.

Run on the upper-computer (so the source IP matches what the backend would use).
Pick a `--listen` port different from the m20ctrl backend's nav_viz port
(default 30012) so they don't fight for the socket.

Examples:
  # Most common: backend is busy on 30012, sniff on 30013.
  python3 tests/nav_viz_sniffer.py --target 10.21.31.106:30012 --listen 30013

  # Stop the backend first if you want to sniff exactly what it would receive:
  python3 tests/nav_viz_sniffer.py --target 10.21.31.106:30012 --listen 30012

  # Dump the full first packet body too (useful when fields look unexpected):
  python3 tests/nav_viz_sniffer.py --dump

Output is intentionally schema-focused so you can paste a top section here and
we can adapt nav_view.js to match the real field names.
"""

import argparse
import json
import socket
import sys
import time


def parse_target(text):
    if ':' not in text:
        raise argparse.ArgumentTypeError(f'target must be host:port (got {text!r})')
    host, port = text.rsplit(':', 1)
    return host, int(port)


def send_register(sock, target, reason):
    payload = json.dumps({
        'type': 'register',
        'client': 'm20ctrl_sniffer',
        'want': 'nav_view',
        'reason': reason,
        'ts': time.time(),
    }).encode('utf-8')
    sock.sendto(payload, target)
    print(f'[Sniffer] register → {target[0]}:{target[1]} ({reason})', flush=True)


def describe(name, value, depth=0):
    indent = '  ' * depth
    if isinstance(value, dict):
        keys = ', '.join(value.keys())
        print(f'{indent}{name}: dict({keys})')
        # Recurse into structures most likely relevant to nav_view rendering.
        if name in {'pose', 'goal', 'orientation', 'position', 'origin',
                    'header', 'robot_pose', 'current_pose'}:
            for k, v in value.items():
                describe(k, v, depth + 1)
        elif depth == 0:
            for k, v in value.items():
                describe(k, v, depth + 1)
    elif isinstance(value, list):
        if not value:
            print(f'{indent}{name}: list[empty]')
            return
        head = value[0]
        if isinstance(head, list):
            print(f'{indent}{name}: list[len={len(value)}] of list[len={len(head)}]')
            print(f'{indent}  sample[0]: {head[:6]}')
        elif isinstance(head, dict):
            print(f'{indent}{name}: list[len={len(value)}] of dict({", ".join(head.keys())})')
            print(f'{indent}  sample[0]: {head}')
        else:
            print(f'{indent}{name}: list[len={len(value)}] of {type(head).__name__}')
            print(f'{indent}  sample[:6]: {value[:6]}')
    elif isinstance(value, str):
        if len(value) > 80:
            print(f'{indent}{name}: str[len={len(value)}] starts with {value[:40]!r}')
        else:
            print(f'{indent}{name}: str = {value!r}')
    else:
        print(f'{indent}{name}: {type(value).__name__} = {value}')


def summarize_packet(obj):
    if not isinstance(obj, dict):
        print(f'  payload is {type(obj).__name__}, not a JSON object')
        return
    for k, v in obj.items():
        describe(k, v, depth=1)


def main():
    parser = argparse.ArgumentParser(description='NOS nav_viz UDP sniffer')
    parser.add_argument('--target', type=parse_target, default=('10.21.31.106', 30012),
                        help='NOS streamer addr:port to register with (default 10.21.31.106:30012)')
    parser.add_argument('--listen', type=int, default=30013,
                        help='Local UDP port to bind for incoming stream (default 30013)')
    parser.add_argument('--count', type=int, default=3,
                        help='Number of packets to inspect before exiting (default 3)')
    parser.add_argument('--keepalive', type=float, default=2.0,
                        help='Seconds between register pings; 0 to disable (default 2.0)')
    parser.add_argument('--timeout', type=float, default=15.0,
                        help='Give up after this many seconds without enough packets (default 15)')
    parser.add_argument('--dump', action='store_true',
                        help='Print the full JSON body of the first packet')
    args = parser.parse_args()

    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    try:
        sock.bind(('', args.listen))
    except OSError as err:
        print(f'[Sniffer] cannot bind udp/{args.listen}: {err}', file=sys.stderr)
        print('         (the m20ctrl backend probably owns that port; pass --listen <free port>)', file=sys.stderr)
        sys.exit(2)
    sock.settimeout(1.0)
    print(f'[Sniffer] listening on udp/{args.listen}', flush=True)

    send_register(sock, args.target, 'startup')
    last_ping = time.time()
    deadline = time.time() + args.timeout
    received = 0
    seen_senders = set()

    while received < args.count and time.time() < deadline:
        try:
            data, addr = sock.recvfrom(65535)
        except socket.timeout:
            if args.keepalive > 0 and time.time() - last_ping >= args.keepalive:
                send_register(sock, args.target, 'keepalive')
                last_ping = time.time()
            continue

        try:
            text = data.decode('utf-8', errors='replace')
            obj = json.loads(text)
        except Exception as err:
            print(f'[Sniffer] non-JSON packet from {addr[0]}:{addr[1]} ({len(data)} bytes): {err}')
            print(f'  first 120 bytes: {data[:120]!r}')
            continue

        # Skip the loopback echo of our own register ping.
        if isinstance(obj, dict) and obj.get('type') == 'register':
            continue

        seen_senders.add(addr)
        received += 1
        print(f'\n=== packet {received} from {addr[0]}:{addr[1]} ({len(data)} bytes) ===', flush=True)
        summarize_packet(obj)
        if args.dump and received == 1:
            print('\n--- raw json ---')
            print(json.dumps(obj, ensure_ascii=False, indent=2)[:4000])

    print('', flush=True)
    if received == 0:
        print(f'[Sniffer] no nav_view packets received within {args.timeout}s.')
        print('  - Confirm NOS nav_viz_streamer is running and reachable.')
        print(f'  - Confirm the streamer treats incoming UDP at {args.target[0]}:{args.target[1]} as registration.')
        print(f'  - Confirm no firewall blocks inbound udp/{args.listen} on this host.')
        sock.close()
        sys.exit(1)

    print(f'[Sniffer] saw {received} packets from {seen_senders}; schema printed above.')
    sock.close()


if __name__ == '__main__':
    main()
