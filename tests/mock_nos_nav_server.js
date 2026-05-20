/**
 * Mock NOS 自研导航 APDU server + nav_viz UDP streamer.
 *
 * Listens on TCP port (default 30011) and answers the navigation Type/Cmd
 * pairs that m20ctrl backend routes to the custom nav link. Also broadcasts a
 * synthetic nav_viz snapshot over UDP (default 30012) so the floating window
 * can be exercised without real hardware.
 *
 * Usage:
 *   node tests/mock_nos_nav_server.js [--tcp 30011] [--udp 30012] [--target 127.0.0.1]
 */

const net = require('net');
const dgram = require('dgram');
const path = require('path');

const M20Protocol = require(path.join(__dirname, '..', 'backend', 'm20Protocol.js'));

function parseArgs(argv) {
    const out = { tcp: 30011, udp: 30012, target: '127.0.0.1', rate: 5 };
    for (let i = 2; i < argv.length; i += 2) {
        const key = argv[i];
        const value = argv[i + 1];
        if (key === '--tcp') out.tcp = parseInt(value, 10);
        else if (key === '--udp') out.udp = parseInt(value, 10);
        else if (key === '--target') out.target = value;
        else if (key === '--rate') out.rate = parseFloat(value);
    }
    return out;
}

function buildResponse(protocol, request, items) {
    const asdu = {
        PatrolDevice: {
            Type: request.Type,
            Command: request.Command,
            Time: protocol.generateCurrentTime(),
            Items: items
        }
    };
    return protocol.buildAPDU(asdu);
}

function handleRequest(protocol, request) {
    const { Type, Command, Items } = request;
    if (Type === 100 && Command === 100) {
        // Heartbeat ack — pass through.
        return buildResponse(protocol, request, {});
    }
    if (Type === 1003 && Command === 1) {
        // nav_task → reply nav started
        console.log(`[MockNav] nav_task -> ${JSON.stringify(Items)}`);
        return buildResponse(protocol, request, { Status: 3, ErrorCode: 0 });
    }
    if (Type === 1004 && Command === 1) {
        console.log('[MockNav] nav_cancel');
        return buildResponse(protocol, request, { ErrorCode: 0 });
    }
    if (Type === 2101 && Command === 1) {
        console.log(`[MockNav] init_localize -> ${JSON.stringify(Items)}`);
        return buildResponse(protocol, request, { ErrorCode: 0 });
    }
    if (Type === 1007 && Command === 2) {
        return buildResponse(protocol, request, {
            Location: 0,
            PosX: 1.25,
            PosY: -0.5,
            PosZ: 0,
            Roll: 0,
            Pitch: 0,
            Yaw: 0.3
        });
    }
    if (Type === 2002 && Command === 1) {
        return buildResponse(protocol, request, { Location: 0, ObsState: 0 });
    }
    if (Type === 1007 && Command === 1) {
        return buildResponse(protocol, request, { Value: 0, Status: 3, ErrorCode: 0 });
    }
    console.log(`[MockNav] unknown request Type=${Type} Cmd=${Command}`);
    return buildResponse(protocol, request, { ErrorCode: 0 });
}

function startTcpServer({ tcp }) {
    const protocol = new M20Protocol();
    const server = net.createServer((socket) => {
        console.log(`[MockNav] client connected: ${socket.remoteAddress}:${socket.remotePort}`);
        let buffer = Buffer.alloc(0);
        socket.on('data', (chunk) => {
            buffer = Buffer.concat([buffer, chunk]);
            while (buffer.length >= protocol.HEADER_SIZE) {
                const parsed = protocol.parseAPDU(buffer);
                if (!parsed.valid) {
                    if (parsed.error === '数据不完整') break;
                    console.warn(`[MockNav] parse error: ${parsed.error}`);
                    buffer = Buffer.alloc(0);
                    break;
                }
                buffer = buffer.slice(parsed.totalLength);
                const request = parsed.asdu.PatrolDevice || {};
                const reply = handleRequest(protocol, request);
                socket.write(reply);
            }
        });
        socket.on('close', () => console.log('[MockNav] client disconnected'));
        socket.on('error', (err) => console.warn(`[MockNav] socket error: ${err.message}`));
    });
    server.listen(tcp, () => {
        console.log(`[MockNav] APDU server listening on tcp:${tcp}`);
    });
    return server;
}

function startUdpStreamer({ udp, target, rate, requireRegister = false }) {
    const sock = dgram.createSocket('udp4');
    const interval = Math.max(100, Math.round(1000 / Math.max(rate, 1)));
    let seq = 0;
    let timer = null;
    const targets = new Set();

    const localCostmap = (() => {
        const w = 40;
        const h = 40;
        const rle = [];
        for (let y = 0; y < h; y += 1) {
            rle.push([0, w - 5]);
            rle.push([100, 5]);
        }
        return {
            width: w,
            height: h,
            resolution: 0.1,
            origin: { x: -0.5, y: -1.0 },
            data_rle: rle
        };
    })();

    function tick() {
        seq += 1;
        const t = seq * (interval / 1000);
        const snapshot = {
            seq,
            stamp: Date.now() / 1000,
            localized: true,
            pose: { x: Math.cos(t * 0.2), y: Math.sin(t * 0.2), yaw: t * 0.1 },
            global_path: {
                poses: [[0, 0, 0], [1, 0.2, 0.1], [2, 0.6, 0.2], [3, 1.2, 0.3]]
            },
            local_path: {
                poses: [
                    [Math.cos(t * 0.2), Math.sin(t * 0.2), t * 0.1],
                    [Math.cos(t * 0.2) + 0.2, Math.sin(t * 0.2) + 0.05, t * 0.1]
                ]
            },
            local_costmap: localCostmap
        };
        const payload = Buffer.from(JSON.stringify(snapshot), 'utf-8');
        for (const key of targets) {
            const [addr, port] = key.split(':');
            sock.send(payload, parseInt(port, 10), addr, (err) => {
                if (err) console.warn(`[MockNav] udp send to ${key} failed: ${err.message}`);
            });
        }
    }

    sock.on('message', (msg, rinfo) => {
        let parsed;
        try { parsed = JSON.parse(msg.toString('utf-8')); } catch (_) { return; }
        if (parsed && parsed.type === 'register') {
            const key = `${rinfo.address}:${rinfo.port}`;
            if (!targets.has(key)) {
                console.log(`[MockNav] register from ${key} (${parsed.client || 'unknown'})`);
                targets.add(key);
            }
            if (!timer) timer = setInterval(tick, interval);
        }
    });

    sock.bind(udp, () => {
        if (!requireRegister) {
            // legacy behaviour: blindly push to provided target.
            targets.add(`${target}:${udp}`);
            timer = setInterval(tick, interval);
        }
    });

    return {
        socket: sock,
        stop() {
            if (timer) clearInterval(timer);
            sock.close();
        }
    };
}

if (require.main === module) {
    const args = parseArgs(process.argv);
    console.log(`[MockNav] starting mock NOS: tcp=${args.tcp} udp=${args.udp} target=${args.target} rate=${args.rate}/s`);
    const tcp = startTcpServer(args);
    const udp = startUdpStreamer(args);
    process.on('SIGINT', () => {
        console.log('\n[MockNav] shutting down');
        tcp.close();
        udp.stop();
        process.exit(0);
    });
}

module.exports = { startTcpServer, startUdpStreamer, parseArgs };
