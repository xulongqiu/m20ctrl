const assert = require('assert');

// Stub document/window so nav_view.js loads cleanly under Node.
global.window = global.window || {};
global.document = global.document || {
    createElement: () => ({
        width: 0,
        height: 0,
        getContext: () => ({ putImageData: () => {} })
    })
};

const { decodeCostmapRle, buildCostmapImage, NavViewWindow } = require('../nav_view.js');
const { isNavigationMessageType, normalizeRouteMode } = require('../backend/navRouting.js');

assert.strictEqual(isNavigationMessageType('nav_task'), true);
assert.strictEqual(isNavigationMessageType('nav_cancel'), true);
assert.strictEqual(isNavigationMessageType('get_map_position'), true);
assert.strictEqual(isNavigationMessageType('motion_control'), false);
assert.strictEqual(isNavigationMessageType('heartbeat'), false);

assert.strictEqual(normalizeRouteMode('custom'), 'custom');
assert.strictEqual(normalizeRouteMode('vendor'), 'vendor');
assert.strictEqual(normalizeRouteMode('bad'), 'vendor');
assert.strictEqual(normalizeRouteMode(undefined), 'vendor');

const decoded = decodeCostmapRle([[0, 2], [100, 3], [-1, 1]], 6);
assert.deepStrictEqual(Array.from(decoded), [0, 0, 100, 100, 100, -1]);
assert.throws(() => decodeCostmapRle([[1, 3]], 2), /length/i);

// Validate that costmap RLE decodes into an RGBA buffer with the expected size.
// We stub global ImageData so the helper works in Node without a real canvas.
global.ImageData = class {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.data = new Uint8ClampedArray(width * height * 4);
    }
};

const overlay = buildCostmapImage({
    width: 2,
    height: 2,
    resolution: 0.1,
    origin: { x: 0, y: 0 },
    data_rle: [[100, 1], [-1, 1], [0, 1], [50, 1]]
});
assert.strictEqual(overlay.width, 2);
assert.strictEqual(overlay.height, 2);
// src (gx=0, gy=0)=100 maps to canvas (x=0, y=1) after y-flip — RViz lethal = magenta.
const lethalIdx = (1 * 2 + 0) * 4;
assert.ok(overlay.data[lethalIdx] > 200, 'lethal cost should have high red (magenta)');
assert.ok(overlay.data[lethalIdx + 1] < 30, 'lethal cost should have low green (magenta)');
assert.ok(overlay.data[lethalIdx + 2] > 200, 'lethal cost should have high blue (magenta)');
assert.ok(overlay.data[lethalIdx + 3] > 150, 'lethal cost should be opaque');
// src (gx=1, gy=0)=-1 maps to canvas (x=1, y=1) after y-flip — transparent (unknown).
const unknownIdx = (1 * 2 + 1) * 4 + 3;
assert.strictEqual(overlay.data[unknownIdx], 0, 'unknown cost should be transparent');
// src (gx=0, gy=1)=0 maps to canvas (x=0, y=0) — free, transparent.
const freeIdx = (0 * 2 + 0) * 4 + 3;
assert.strictEqual(overlay.data[freeIdx], 0, 'free cost should be transparent');

// Smoke-test the 2× smooth path keeps the lethal cell magenta in the
// upsampled grid.
const upsampled = require('../nav_view.js').buildSmoothCostmapImage({
    width: 2,
    height: 2,
    resolution: 0.1,
    origin: { x: 0, y: 0 },
    data_rle: [[100, 1], [-1, 1], [0, 1], [50, 1]]
}, 2);
assert.strictEqual(upsampled.width, 4);
assert.strictEqual(upsampled.height, 4);
// Upsampled lethal pixel still magenta (max-pool guarantees this corner stays lethal).
const upLethalIdx = (3 * 4 + 0) * 4;  // bottom-left corner of upsampled image
assert.ok(upsampled.data[upLethalIdx] > 200);
assert.ok(upsampled.data[upLethalIdx + 1] < 30);
assert.ok(upsampled.data[upLethalIdx + 2] > 200);

// World-to-canvas orientation: right edge must be +X, top edge must be +Y.
const view = new NavViewWindow({});
view.baseMap = {
    pgm: { width: 100, height: 80 },
    yaml: { resolution: 0.05, origin: { x: -1.0, y: -2.0, yaw: 0 } }
};
view.baseMapCanvas = { width: 100, height: 80 };
const vp = view.computeViewport(200, 160); // 2× scale, drawWidth=200, drawHeight=160
const worldRight = view.worldToCanvas({ x: -1.0 + 100 * 0.05, y: -2.0 }, vp);
const worldLeft = view.worldToCanvas({ x: -1.0, y: -2.0 }, vp);
const worldTop = view.worldToCanvas({ x: -1.0, y: -2.0 + 80 * 0.05 }, vp);
assert.ok(worldRight.x > worldLeft.x, `+X should map to larger canvas X (right). got right=${worldRight.x} left=${worldLeft.x}`);
assert.strictEqual(worldRight.y, worldLeft.y, '+X step should not move on Y');
assert.ok(worldTop.y < worldLeft.y, `+Y should map to smaller canvas Y (up). got top=${worldTop.y} bottom=${worldLeft.y}`);
// Bottom-left of world maps to bottom-left of draw region.
assert.strictEqual(worldLeft.x, vp.offsetX);
assert.strictEqual(worldLeft.y, vp.offsetY + vp.drawHeight);

console.log('nav_integration_test passed');
