(function attachMapTools(root) {
    'use strict';

    function byteArrayFromBuffer(buffer) {
        if (buffer instanceof Uint8Array) return buffer;
        if (buffer instanceof ArrayBuffer) return new Uint8Array(buffer);
        if (ArrayBuffer.isView(buffer)) return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
        throw new Error('unsupported buffer type');
    }

    function isWhitespace(byte) {
        return byte === 9 || byte === 10 || byte === 13 || byte === 32;
    }

    function readToken(bytes, offset) {
        const n = bytes.length;
        while (offset < n) {
            if (bytes[offset] === 35) {
                while (offset < n && bytes[offset] !== 10) offset++;
                continue;
            }
            if (!isWhitespace(bytes[offset])) break;
            offset++;
        }
        if (offset >= n) throw new Error('truncated PGM header');
        const start = offset;
        while (offset < n && !isWhitespace(bytes[offset]) && bytes[offset] !== 35) {
            offset++;
        }
        const token = new TextDecoder('ascii').decode(bytes.slice(start, offset));
        return { token, offset };
    }

    function parsePgmBytes(buffer) {
        const bytes = byteArrayFromBuffer(buffer);
        let offset = 0;
        let t = readToken(bytes, offset);
        const format = t.token;
        offset = t.offset;
        if (format !== 'P5' && format !== 'P2') {
            throw new Error(`unsupported PGM format: ${format}`);
        }

        t = readToken(bytes, offset);
        const width = Number.parseInt(t.token, 10);
        offset = t.offset;
        t = readToken(bytes, offset);
        const height = Number.parseInt(t.token, 10);
        offset = t.offset;
        t = readToken(bytes, offset);
        const maxVal = Number.parseInt(t.token, 10);
        offset = t.offset;

        if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
            throw new Error('invalid PGM dimensions');
        }
        if (!Number.isFinite(maxVal) || maxVal <= 0 || maxVal > 65535) {
            throw new Error('invalid PGM max value');
        }

        const expected = width * height;
        let pixels;
        if (format === 'P5') {
            if (offset >= bytes.length || !isWhitespace(bytes[offset])) {
                throw new Error('truncated PGM raster delimiter');
            }
            offset += 1;
            const bytesPerPixel = maxVal > 255 ? 2 : 1;
            const rasterBytes = expected * bytesPerPixel;
            if (bytes.length - offset < rasterBytes) {
                throw new Error('truncated PGM raster data');
            }
            pixels = new Uint8Array(expected);
            if (bytesPerPixel === 1) {
                const raster = bytes.slice(offset, offset + expected);
                if (maxVal === 255) {
                    pixels.set(raster);
                } else {
                    for (let i = 0; i < expected; i++) {
                        pixels[i] = Math.round((raster[i] / maxVal) * 255);
                    }
                }
            } else {
                for (let i = 0; i < expected; i++) {
                    const raw = (bytes[offset + i * 2] << 8) | bytes[offset + i * 2 + 1];
                    pixels[i] = Math.round((raw / maxVal) * 255);
                }
            }
        } else {
            pixels = new Uint8Array(expected);
            for (let i = 0; i < expected; i++) {
                t = readToken(bytes, offset);
                offset = t.offset;
                const raw = Number.parseInt(t.token, 10);
                if (!Number.isFinite(raw)) throw new Error('invalid PGM pixel value');
                pixels[i] = Math.max(0, Math.min(255, Math.round((raw / maxVal) * 255)));
            }
        }
        return { format, width, height, maxVal, pixels };
    }

    function drawPgmToCanvas(canvas, pgm) {
        const ctx = canvas.getContext('2d');
        canvas.width = pgm.width;
        canvas.height = pgm.height;
        const image = ctx.createImageData(pgm.width, pgm.height);
        for (let i = 0; i < pgm.pixels.length; i++) {
            const v = pgm.pixels[i];
            const j = i * 4;
            image.data[j] = v;
            image.data[j + 1] = v;
            image.data[j + 2] = v;
            image.data[j + 3] = 255;
        }
        ctx.putImageData(image, 0, 0);
    }

    function parseYamlScalar(text) {
        const trimmed = text.trim();
        if (!trimmed.length) return '';
        if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
            (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
            return trimmed.slice(1, -1);
        }
        return trimmed;
    }

    function parseYamlArray(text) {
        const trimmed = text.trim();
        if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) {
            throw new Error(`expected yaml array, got: ${text}`);
        }
        return trimmed.slice(1, -1).split(',').map((part) => {
            const piece = parseYamlScalar(part);
            const num = Number(piece);
            return Number.isFinite(num) ? num : piece;
        });
    }

    const CACHE_DB_NAME = 'm20ctrl-map-cache';
    const CACHE_STORE = 'handles';
    const CACHE_KEY = 'lastMapFolder';

    function openCacheDb() {
        if (!root.indexedDB) return Promise.reject(new Error('indexedDB unavailable'));
        return new Promise((resolve, reject) => {
            const req = root.indexedDB.open(CACHE_DB_NAME, 1);
            req.onupgradeneeded = () => {
                req.result.createObjectStore(CACHE_STORE);
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    function idbPut(key, value) {
        return openCacheDb().then((db) => new Promise((resolve, reject) => {
            const tx = db.transaction(CACHE_STORE, 'readwrite');
            tx.objectStore(CACHE_STORE).put(value, key);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
            tx.onabort = () => reject(tx.error);
        }));
    }

    function idbGet(key) {
        return openCacheDb().then((db) => new Promise((resolve, reject) => {
            const tx = db.transaction(CACHE_STORE, 'readonly');
            const getReq = tx.objectStore(CACHE_STORE).get(key);
            getReq.onsuccess = () => resolve(getReq.result);
            getReq.onerror = () => reject(getReq.error);
        }));
    }

    function idbDelete(key) {
        return openCacheDb().then((db) => new Promise((resolve, reject) => {
            const tx = db.transaction(CACHE_STORE, 'readwrite');
            tx.objectStore(CACHE_STORE).delete(key);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        }));
    }

    function parseOccupancyGridYaml(text) {
        if (typeof text !== 'string') {
            throw new Error('yaml text must be string');
        }
        const result = {};
        text.split(/\r?\n/).forEach((rawLine) => {
            const line = rawLine.replace(/#.*$/, '').trim();
            if (!line) return;
            const idx = line.indexOf(':');
            if (idx < 0) return;
            const key = line.slice(0, idx).trim();
            const valueText = line.slice(idx + 1);
            const valueTrimmed = valueText.trim();
            if (!valueTrimmed.length) return;
            if (valueTrimmed.startsWith('[')) {
                result[key] = parseYamlArray(valueTrimmed);
            } else if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(valueTrimmed)) {
                result[key] = Number(valueTrimmed);
            } else {
                result[key] = parseYamlScalar(valueTrimmed);
            }
        });

        const resolution = Number(result.resolution);
        if (!Number.isFinite(resolution) || resolution <= 0) {
            throw new Error(`invalid yaml resolution: ${result.resolution}`);
        }
        const originArr = Array.isArray(result.origin) ? result.origin : [];
        const originX = Number(originArr[0]);
        const originY = Number(originArr[1]);
        if (!Number.isFinite(originX) || !Number.isFinite(originY)) {
            throw new Error(`invalid yaml origin: ${JSON.stringify(result.origin)}`);
        }
        const negate = result.negate != null ? Number(result.negate) : 0;
        return {
            image: result.image || 'occ_grid.pgm',
            resolution,
            origin: { x: originX, y: originY, yaw: Number(originArr[2]) || 0 },
            negate: negate ? 1 : 0,
            occupiedThresh: Number(result.occupied_thresh) || 0.65,
            freeThresh: Number(result.free_thresh) || 0.25,
            raw: result
        };
    }

    class MapFolderManager {
        constructor(options = {}) {
            this.statusEl = options.statusEl;
            this.canvasEl = options.canvasEl;
            this.metaEl = options.metaEl;
            this.previewEl = options.previewEl;
            this.logger = options.logger;
            this.feedback = options.feedback;
            this.onLocationsUpdated = options.onLocationsUpdated;
            this.onBaseMapUpdated = options.onBaseMapUpdated;
            this.dirHandle = null;
            this.folderName = '';
            this.locations = [];
            this.baseMap = null;
        }

        getBaseMap() {
            return this.baseMap;
        }

        hasWritableFolder() {
            return !!this.dirHandle;
        }

        setLocations(locations) {
            this.locations = Array.isArray(locations) ? locations.slice() : [];
        }

        async selectFolder() {
            if (!root.showDirectoryPicker) {
                throw new Error('当前浏览器不支持选择并写入文件夹，请用 Chrome/Edge 打开 index.html');
            }
            // Remember-last behavior:
            //   1) Pass `id` so the browser persists the last location keyed
            //      by this app (survives across page reloads / new tabs).
            //   2) Pass the previously-selected directory handle as `startIn`
            //      so the picker opens directly inside it.
            //   Both are best-effort: if either is unsupported the picker
            //   falls back to its default location.
            const opts = { mode: 'readwrite', id: 'm20-map-folder' };
            const cached = await this.peekCachedFolder();
            if (cached && cached.handle) {
                opts.startIn = cached.handle;
            }
            let handle;
            try {
                handle = await root.showDirectoryPicker(opts);
            } catch (err) {
                // Some browser versions reject when `startIn` references a
                // stale handle (e.g. the folder was moved/deleted). Retry
                // once without it so the user can still pick a folder.
                if (err && err.name === 'TypeError' && opts.startIn) {
                    const retryOpts = { mode: 'readwrite', id: 'm20-map-folder' };
                    handle = await root.showDirectoryPicker(retryOpts);
                } else {
                    throw err;
                }
            }
            await this.adoptHandle(handle, { requestPermission: true });
        }

        async adoptHandle(handle, { requestPermission = false } = {}) {
            const perm = await this.ensurePermission(handle, requestPermission);
            if (!perm) {
                throw new Error('没有地图文件夹写入权限');
            }
            this.dirHandle = handle;
            this.folderName = handle.name || 'selected map';
            this.setStatus(`已选择: ${this.folderName}`);
            await this.loadMapPreview();
            await this.loadLocations();
            await this.persistHandle(handle);
            this.logInfo(`地图文件夹已加载: ${this.folderName}`);
        }

        async ensurePermission(handle, allowPrompt = true) {
            const opts = { mode: 'readwrite' };
            if (await handle.queryPermission(opts) === 'granted') return true;
            if (!allowPrompt) return false;
            return await handle.requestPermission(opts) === 'granted';
        }

        async persistHandle(handle) {
            try {
                await idbPut(CACHE_KEY, handle);
            } catch (err) {
                this.logInfo(`地图文件夹缓存失败: ${err.message}`);
            }
        }

        async forgetCachedFolder() {
            try {
                await idbDelete(CACHE_KEY);
            } catch (err) {
                this.logInfo(`清除地图文件夹缓存失败: ${err.message}`);
            }
        }

        async peekCachedFolder() {
            try {
                const handle = await idbGet(CACHE_KEY);
                if (!handle) return null;
                const status = await handle.queryPermission({ mode: 'readwrite' });
                return { handle, name: handle.name || '', granted: status === 'granted' };
            } catch (err) {
                this.logInfo(`读取地图文件夹缓存失败: ${err.message}`);
                return null;
            }
        }

        async restoreCachedFolder({ promptIfNeeded = false } = {}) {
            const cached = await this.peekCachedFolder();
            if (!cached) return { restored: false };
            if (!cached.granted && !promptIfNeeded) {
                this.setStatus(`上次地图: ${cached.name}（点击「选择地图文件夹」或「恢复上次」授权）`);
                return { restored: false, needsPermission: true, name: cached.name };
            }
            try {
                await this.adoptHandle(cached.handle, { requestPermission: promptIfNeeded });
                return { restored: true, name: cached.name };
            } catch (err) {
                this.logInfo(`恢复上次地图文件夹失败: ${err.message}`);
                return { restored: false, error: err };
            }
        }

        async loadMapPreview() {
            if (!this.dirHandle) return;
            const pgmHandle = await this.dirHandle.getFileHandle('occ_grid.pgm');
            const pgmFile = await pgmHandle.getFile();
            const pgm = parsePgmBytes(await pgmFile.arrayBuffer());
            if (this.canvasEl) drawPgmToCanvas(this.canvasEl, pgm);
            if (this.previewEl) this.previewEl.style.display = 'block';

            let yaml = null;
            let yamlError = null;
            try {
                const yamlHandle = await this.dirHandle.getFileHandle('occ_grid.yaml');
                const yamlFile = await yamlHandle.getFile();
                yaml = parseOccupancyGridYaml(await yamlFile.text());
            } catch (err) {
                yamlError = err;
                if (err && err.name !== 'NotFoundError') {
                    this.logInfo(`occ_grid.yaml 解析失败: ${err.message}`);
                } else {
                    this.logInfo('未找到 occ_grid.yaml，导航视图世界坐标不可用');
                }
            }

            this.baseMap = {
                pgm,
                yaml,
                folderName: this.folderName
            };
            this.onBaseMapUpdated?.(this.baseMap);

            if (this.metaEl) {
                if (yaml) {
                    this.metaEl.textContent =
                        `${yaml.image || 'occ_grid.pgm'}  ${pgm.width}×${pgm.height}  ` +
                        `res=${yaml.resolution}m  origin=(${yaml.origin.x.toFixed(2)}, ${yaml.origin.y.toFixed(2)})`;
                } else {
                    this.metaEl.textContent = yamlError && yamlError.name !== 'NotFoundError'
                        ? `occ_grid.pgm  ${pgm.width}×${pgm.height}  (yaml 解析失败)`
                        : `occ_grid.pgm  ${pgm.width}×${pgm.height}  (无 yaml)`;
                }
            }
        }

        async loadLocations() {
            if (!this.dirHandle) return [];
            let locations = [];
            try {
                const fileHandle = await this.dirHandle.getFileHandle('locations.json');
                const file = await fileHandle.getFile();
                const text = await file.text();
                locations = text.trim() ? JSON.parse(text) : [];
                if (!Array.isArray(locations)) locations = [];
            } catch (err) {
                if (err && err.name !== 'NotFoundError') {
                    throw err;
                }
            }
            this.setLocations(locations);
            this.onLocationsUpdated?.(this.locations);
            return this.locations;
        }

        async saveLocation(location) {
            if (!this.dirHandle) throw new Error('未选择地图文件夹');
            const locations = await this.loadLocations();
            const newLocation = {
                id: Date.now(),
                name: location.name || '未命名',
                posX: location.posX || 0,
                posY: location.posY || 0,
                posZ: location.posZ || 0,
                yaw: location.yaw || 0,
                createdAt: new Date().toISOString()
            };
            locations.push(newLocation);
            await this.writeLocations(locations);
            this.logInfo(`已写入 locations.json: ${newLocation.name}`);
            return newLocation;
        }

        async clearLocations() {
            if (!this.dirHandle) throw new Error('未选择地图文件夹');
            await this.writeLocations([]);
            this.logInfo('已清空 locations.json');
        }

        async deleteLocation(id) {
            if (!this.dirHandle) throw new Error('未选择地图文件夹');
            const locations = await this.loadLocations();
            const filtered = locations.filter((l) => String(l.id) !== String(id));
            if (filtered.length === locations.length) {
                throw new Error(`地点 id=${id} 不存在`);
            }
            await this.writeLocations(filtered);
            this.logInfo(`已删除地点 id=${id}`);
            return filtered;
        }

        async updateLocation(id, updates) {
            if (!this.dirHandle) throw new Error('未选择地图文件夹');
            const locations = await this.loadLocations();
            const numericKeys = ['posX', 'posY', 'posZ', 'yaw'];
            let found = null;
            const next = locations.map((l) => {
                if (String(l.id) !== String(id)) return l;
                const patch = {};
                for (const key of Object.keys(updates || {})) {
                    if (numericKeys.includes(key)) {
                        const v = Number(updates[key]);
                        if (!Number.isFinite(v)) {
                            throw new Error(`字段 ${key} 不是有效数值: ${updates[key]}`);
                        }
                        patch[key] = v;
                    } else {
                        patch[key] = updates[key];
                    }
                }
                found = { ...l, ...patch, updatedAt: new Date().toISOString() };
                return found;
            });
            if (!found) {
                throw new Error(`地点 id=${id} 不存在`);
            }
            await this.writeLocations(next);
            this.logInfo(`已更新地点 id=${id}`);
            return found;
        }

        async writeLocations(locations) {
            const fileHandle = await this.dirHandle.getFileHandle('locations.json', { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(JSON.stringify(locations, null, 2));
            await writable.close();
            this.setLocations(locations);
            this.onLocationsUpdated?.(this.locations);
        }

        setStatus(text) {
            if (this.statusEl) this.statusEl.textContent = text;
        }

        logInfo(text) {
            if (this.logger && typeof this.logger.info === 'function') this.logger.info(text);
        }
    }

    const api = { parsePgmBytes, drawPgmToCanvas, parseOccupancyGridYaml, MapFolderManager };
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
    root.M20Map = api;
})(typeof window !== 'undefined' ? window : globalThis);
