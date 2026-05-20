const assert = require('assert');
const { parsePgmBytes, parseOccupancyGridYaml, MapFolderManager } = require('../map_manager.js');

function bytesFromAscii(text) {
  return new TextEncoder().encode(text).buffer;
}

function concatBytes(header, body) {
  const h = new TextEncoder().encode(header);
  const out = new Uint8Array(h.length + body.length);
  out.set(h, 0);
  out.set(body, h.length);
  return out.buffer;
}

const p5 = parsePgmBytes(concatBytes('P5\n# comment\n3 2\n255\n', Uint8Array.from([0, 205, 254, 10, 20, 30])));
assert.strictEqual(p5.format, 'P5');
assert.strictEqual(p5.width, 3);
assert.strictEqual(p5.height, 2);
assert.strictEqual(p5.maxVal, 255);
assert.deepStrictEqual(Array.from(p5.pixels), [0, 205, 254, 10, 20, 30]);

const p2 = parsePgmBytes(bytesFromAscii('P2\n2 2\n255\n0 1\n205 254\n'));
assert.strictEqual(p2.format, 'P2');
assert.strictEqual(p2.width, 2);
assert.strictEqual(p2.height, 2);
assert.deepStrictEqual(Array.from(p2.pixels), [0, 1, 205, 254]);

assert.throws(() => parsePgmBytes(bytesFromAscii('P5\n2 2\n255\n1')), /truncated/i);
assert.throws(() => parsePgmBytes(bytesFromAscii('P9\n1 1\n255\n0')), /unsupported/i);

const yaml = parseOccupancyGridYaml([
  'image: occ_grid.pgm',
  '# comment line',
  'resolution: 0.05',
  'origin: [-3.5, -4.0, 0]',
  'negate: 0',
  'occupied_thresh: 0.65',
  'free_thresh: 0.25'
].join('\n'));
assert.strictEqual(yaml.image, 'occ_grid.pgm');
assert.strictEqual(yaml.resolution, 0.05);
assert.deepStrictEqual(yaml.origin, { x: -3.5, y: -4.0, yaw: 0 });
assert.strictEqual(yaml.negate, 0);
assert.strictEqual(yaml.occupiedThresh, 0.65);
assert.strictEqual(yaml.freeThresh, 0.25);

assert.throws(() => parseOccupancyGridYaml('resolution: -1\norigin: [0,0,0]'), /resolution/);
assert.throws(() => parseOccupancyGridYaml('resolution: 0.05\norigin: [a,b,c]'), /origin/);

class MemoryFileHandle {
  constructor(store, name) {
    this.store = store;
    this.name = name;
  }

  async getFile() {
    const text = this.store[this.name] || '[]';
    return { async text() { return text; } };
  }

  async createWritable() {
    return {
      write: async (text) => {
        this.store[this.name] = text;
      },
      close: async () => {}
    };
  }
}

class MemoryDirectoryHandle {
  constructor(store) {
    this.store = store;
  }

  async getFileHandle(name, options = {}) {
    if (!options.create && !(name in this.store)) {
      const err = new Error('not found');
      err.name = 'NotFoundError';
      throw err;
    }
    if (!(name in this.store)) this.store[name] = '';
    return new MemoryFileHandle(this.store, name);
  }
}

(async () => {
  const store = {};
  const manager = new MapFolderManager();
  manager.dirHandle = new MemoryDirectoryHandle(store);

  await manager.saveLocation({
    name: 'door',
    mapId: 7,
    posX: 1.25,
    posY: -0.5,
    yaw: 0.1
  });

  const saved = JSON.parse(store['locations.json']);
  assert.strictEqual(saved.length, 1);
  assert.strictEqual(saved[0].name, 'door');
  assert.strictEqual(saved[0].posX, 1.25);
  assert.strictEqual(Object.prototype.hasOwnProperty.call(saved[0], 'mapId'), false);

  const savedId = saved[0].id;

  // updateLocation rewrites coords in place.
  await manager.updateLocation(savedId, { posX: 3.5, posY: 2.0 });
  const afterUpdate = JSON.parse(store['locations.json']);
  assert.strictEqual(afterUpdate.length, 1);
  assert.strictEqual(afterUpdate[0].posX, 3.5);
  assert.strictEqual(afterUpdate[0].posY, 2.0);
  assert.strictEqual(afterUpdate[0].name, 'door');
  assert.ok(afterUpdate[0].updatedAt, 'updatedAt timestamp should be set');

  // updateLocation rejects non-numeric numeric fields and leaves the file untouched.
  await assert.rejects(
    () => manager.updateLocation(savedId, { posX: 'abc' }),
    /有效数值/
  );

  // updateLocation throws when id missing.
  await assert.rejects(
    () => manager.updateLocation('nonexistent', { posX: 1 }),
    /不存在/
  );

  // deleteLocation removes the entry and persists the empty list.
  await manager.deleteLocation(savedId);
  const afterDelete = JSON.parse(store['locations.json']);
  assert.strictEqual(afterDelete.length, 0);

  await assert.rejects(
    () => manager.deleteLocation(savedId),
    /不存在/
  );

  console.log('map_manager_test passed');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
