/**
 * End-to-end smoke test for the custom navigation link.
 *
 * Spins up:
 *   - a stand-in vendor TCP server (so the m20Client can connect without retry storms)
 *   - the mock NOS APDU server + UDP nav_viz streamer
 *   - the m20ctrl ControllerServer with non-standard ports
 *
 * Then connects a WebSocket client and asserts:
 *   1. The link can be configured into custom mode and reaches "connected".
 *   2. A nav_task is forwarded over the custom navClient and a command_response
 *      flows back from the mock NOS.
 *   3. The UDP nav_view snapshot is forwarded to the WebSocket client.
 *   4. Switching back to vendor mode disconnects the navClient.
 */

const assert = require('assert');
const net = require('net');
const path = require('path');
const WebSocket = require(path.join(__dirname, '..', 'backend', 'node_modules', 'ws'));

const ControllerServer = require(path.join(__dirname, '..', 'backend', 'server.js'));
const M20Protocol = require(path.join(__dirname, '..', 'backend', 'm20Protocol.js'));
const { startTcpServer: startMockNav, startUdpStreamer } = require('./mock_nos_nav_server.js');

const TEST_PORTS = {
    ws: 18080,
    vendor: 31001,
    nav: 31011,
    viz: 31012,      // backend listens here
    nosViz: 31013    // mock NOS streamer listens here; backend pings this
};

function startVendorStub(port) {
    // Minimal TCP listener that consumes APDU frames and replies to heartbeats.
    const protocol = new M20Protocol();
    const server = net.createServer((socket) => {
        let buffer = Buffer.alloc(0);
        socket.on('data', (chunk) => {
            buffer = Buffer.concat([buffer, chunk]);
            while (buffer.length >= protocol.HEADER_SIZE) {
                const parsed = protocol.parseAPDU(buffer);
                if (!parsed.valid) {
                    if (parsed.error === '数据不完整') break;
                    buffer = Buffer.alloc(0);
                    break;
                }
                buffer = buffer.slice(parsed.totalLength);
                const req = parsed.asdu.PatrolDevice || {};
                if (req.Type === 100 && req.Command === 100) {
                    socket.write(protocol.buildAPDU({
                        PatrolDevice: {
                            Type: 100, Command: 100,
                            Time: protocol.generateCurrentTime(), Items: {}
                        }
                    }));
                }
            }
        });
        socket.on('error', () => {});
    });
    return new Promise((resolve) => server.listen(port, () => resolve(server)));
}

function waitForMessage(ws, predicate, timeout = 5000) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            ws.off('message', onMsg);
            reject(new Error(`timeout waiting for predicate (${predicate.toString().slice(0, 80)}...)`));
        }, timeout);
        const onMsg = (raw) => {
            let data;
            try { data = JSON.parse(raw.toString()); } catch (e) { return; }
            if (predicate(data)) {
                clearTimeout(timer);
                ws.off('message', onMsg);
                resolve(data);
            }
        };
        ws.on('message', onMsg);
    });
}

async function main() {
    // 1. Set up stand-in servers.
    const vendorServer = await startVendorStub(TEST_PORTS.vendor);
    const navServer = startMockNav({ tcp: TEST_PORTS.nav });
    // Mock NOS streamer listens for register pings on TEST_PORTS.nosViz and
    // streams back to the registered (addr, port).
    const navStreamer = startUdpStreamer({
        udp: TEST_PORTS.nosViz,
        target: '127.0.0.1',
        rate: 10,
        requireRegister: true
    });

    // 2. Boot the controller using test ports.
    const controller = new ControllerServer({
        wsPort: TEST_PORTS.ws,
        m20Host: '127.0.0.1',
        m20Port: TEST_PORTS.vendor,
        navHost: '127.0.0.1',
        navPort: TEST_PORTS.nav,
        navRouteMode: 'vendor',
        navVizPort: TEST_PORTS.viz,
        navVizRegisterPort: TEST_PORTS.nosViz,
        navVizPingIntervalMs: 500
    });
    await controller.start();

    let failure;
    let ws;
    try {
        // 3. Connect a WebSocket client.
        ws = new WebSocket(`ws://127.0.0.1:${TEST_PORTS.ws}`);
        await new Promise((resolve, reject) => {
            ws.once('open', resolve);
            ws.once('error', reject);
        });

        // 4. Apply custom-nav config and wait until navClient connects.
        ws.send(JSON.stringify({
            type: 'config_nav',
            routeMode: 'custom',
            host: '127.0.0.1',
            port: TEST_PORTS.nav,
            vizPort: TEST_PORTS.viz
        }));
        const connectedStatus = await waitForMessage(
            ws,
            (m) => m.type === 'nav_link_status' && m.routeMode === 'custom' && m.connected === true,
            5000
        );
        assert.strictEqual(connectedStatus.host, '127.0.0.1');
        assert.strictEqual(connectedStatus.port, TEST_PORTS.nav);

        // 5. Send a nav_task and expect a command_response from the mock.
        ws.send(JSON.stringify({
            type: 'nav_task',
            payload: {
                Value: 0, MapID: 0, PointInfo: 1,
                PosX: 1.0, PosY: 2.0, PosZ: 0, AngleYaw: 0,
                Gait: 0x3002, Speed: 1, Manner: 0, NavMode: 0, ObsMode: 0
            }
        }));
        const navTaskResp = await waitForMessage(
            ws,
            (m) => m.type === 'command_response' && m.commandType === 1003 && m.command === 1,
            5000
        );
        assert.strictEqual(navTaskResp.source, 'custom_nav');
        assert.strictEqual(navTaskResp.data.Status, 3);
        assert.strictEqual(navTaskResp.data.ErrorCode, 0);

        // 6. Verify the backend sent register pings and the mock NOS only
        // streams after registration.
        const vizStatus = await waitForMessage(
            ws,
            (m) => m.type === 'nav_viz_status' && m.listening && m.pingCount > 0,
            5000
        );
        assert.ok(vizStatus.pingCount > 0, 'backend should have sent at least one register ping');

        // Send an explicit ping via the WS API (simulates opening the floating
        // window) so we exercise the full path.
        ws.send(JSON.stringify({ type: 'nav_viz_ping', reason: 'open_window' }));

        const navView = await waitForMessage(
            ws,
            (m) => m.type === 'nav_view' && m.data && Array.isArray(m.data.global_path && m.data.global_path.poses),
            5000
        );
        assert.ok(navView.data.local_costmap, 'nav_view should contain local_costmap');
        assert.ok(navView.data.pose, 'nav_view should contain pose');

        // 7. Switch back to vendor and ensure the nav link disconnects.
        ws.send(JSON.stringify({ type: 'nav_route', routeMode: 'vendor' }));
        const disconnectedStatus = await waitForMessage(
            ws,
            (m) => m.type === 'nav_link_status' && m.routeMode === 'vendor' && m.connected === false,
            5000
        );
        assert.strictEqual(disconnectedStatus.routeMode, 'vendor');

        console.log('e2e_custom_nav_test passed');
    } catch (err) {
        failure = err;
    } finally {
        if (ws) {
            try { ws.terminate(); } catch (_) {}
        }
        controller.stop();
        navStreamer.stop();
        navServer.close();
        vendorServer.close();
    }

    if (failure) {
        console.error('e2e_custom_nav_test FAILED:', failure);
        process.exit(1);
    }
    // M20Client keeps a reconnect timer alive after disconnect, so exit
    // explicitly instead of waiting for the event loop to drain.
    process.exit(0);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
