(function (root) {
    'use strict';

    function decodeCostmapRle(rle, expectedLength) {
        if (!Array.isArray(rle)) {
            throw new Error('costmap rle must be an array');
        }
        const out = new Int8Array(expectedLength);
        let pos = 0;
        for (const pair of rle) {
            const value = Number(pair[0]);
            const count = Number(pair[1]);
            if (!Number.isFinite(value) || !Number.isFinite(count) || count < 0) {
                throw new Error('invalid costmap rle pair');
            }
            if (pos + count > expectedLength) {
                throw new Error('costmap rle length exceeds expected size');
            }
            out.fill(value, pos, pos + count);
            pos += count;
        }
        if (pos !== expectedLength) {
            throw new Error(`costmap rle length mismatch: ${pos} != ${expectedLength}`);
        }
        return out;
    }

    function normalizeAngle(angle) {
        let out = angle;
        while (out > Math.PI) out -= Math.PI * 2;
        while (out < -Math.PI) out += Math.PI * 2;
        return out;
    }

    function quaternionToYaw(o) {
        const z = Number(o.z) || 0;
        const w = Number(o.w) || 0;
        // assumes roll=pitch=0, which holds for 2D nav stacks.
        return Math.atan2(2 * w * z, 1 - 2 * z * z);
    }

    function extractYaw(p) {
        if (p == null) return 0;
        if (typeof p.yaw === 'number') return p.yaw;
        if (typeof p.theta === 'number') return p.theta;
        if (typeof p.heading === 'number') return p.heading;
        if (p.orientation) {
            const o = p.orientation;
            if (typeof o === 'number') return o;
            if (typeof o.yaw === 'number') return o.yaw;
            if (typeof o.theta === 'number') return o.theta;
            if (typeof o.z === 'number' && typeof o.w === 'number') return quaternionToYaw(o);
        }
        return 0;
    }

    function extractPose(p) {
        if (!p) return null;
        if (Array.isArray(p)) {
            const x = Number(p[0]);
            const y = Number(p[1]);
            if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
            return { x, y, yaw: Number(p[2] || 0) };
        }
        if (typeof p.x === 'number' && typeof p.y === 'number') {
            return { x: p.x, y: p.y, yaw: extractYaw(p) };
        }
        if (p.position && typeof p.position.x === 'number' && typeof p.position.y === 'number') {
            return { x: p.position.x, y: p.position.y, yaw: extractYaw(p) };
        }
        if (p.pose) return extractPose(p.pose);
        return null;
    }

    function extractPath(path) {
        if (!path) return null;
        let arr = null;
        if (Array.isArray(path)) arr = path;
        else if (Array.isArray(path.poses)) arr = path.poses;
        else if (Array.isArray(path.points)) arr = path.points;
        else if (Array.isArray(path.path)) arr = path.path;
        if (!arr) return null;
        const poses = [];
        for (const entry of arr) {
            const p = extractPose(entry);
            if (p) poses.push(p);
        }
        if (poses.length === 0) return null;
        return { poses, frame_id: path.frame || path.frame_id || '' };
    }

    function extractCostmap(grid) {
        if (!grid) return null;
        const width = Number(grid.width || grid.size_x);
        const height = Number(grid.height || grid.size_y);
        if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
            return null;
        }
        const resolution = Number(grid.resolution || grid.res || 0.1);
        const originSrc = grid.origin || grid.origin_pose || { x: 0, y: 0 };
        const origin = {
            x: Number(originSrc.x || (Array.isArray(originSrc) ? originSrc[0] : 0) || 0),
            y: Number(originSrc.y || (Array.isArray(originSrc) ? originSrc[1] : 0) || 0),
            yaw: Array.isArray(originSrc) ? Number(originSrc[2] || 0) : extractYaw(originSrc)
        };
        const out = {
            width, height, resolution, origin,
            frame_id: grid.frame || grid.frame_id || ''
        };
        if (Array.isArray(grid.data_rle)) {
            out.data_rle = grid.data_rle;
        } else if (Array.isArray(grid.data)) {
            out.data = grid.data;
        } else if (typeof grid.data === 'string') {
            // base64 encoded byte string of int8 values
            out.dataBase64 = grid.data;
        }
        return out;
    }

    function normalizeSnapshot(raw) {
        if (!raw || typeof raw !== 'object') return null;
        const snap = {
            seq: raw.seq,
            stamp: raw.stamp,
            localized: raw.localized === true || raw.is_localized === true,
            pose: extractPose(raw.pose || raw.robot_pose || raw.current_pose || raw.position),
            global_path: extractPath(raw.global_path || raw.path || raw.global || raw.plan),
            local_path: extractPath(raw.local_path || raw.local || raw.controller_path),
            local_costmap: extractCostmap(raw.local_costmap || raw.costmap || raw.local_grid)
        };
        const goalSrc = raw.goal || raw.target || raw.goal_pose;
        if (goalSrc) {
            const gp = extractPose(goalSrc);
            if (gp) snap.goal = { ...gp, name: goalSrc.name || '目标' };
        }
        return snap;
    }

    function buildBaseMapImage(pgm) {
        // PGM rows are stored top-down; ROS map_server emits the top row as
        // world-Y high (= origin.y + height*resolution). Copy 1:1 so that
        // canvas (0,0) corresponds to world (origin.x, origin.y + h*res),
        // matching the map manager preview (right = +X, up = +Y).
        const image = new ImageData(pgm.width, pgm.height);
        for (let i = 0; i < pgm.pixels.length; i += 1) {
            const v = pgm.pixels[i];
            const j = i * 4;
            image.data[j] = v;
            image.data[j + 1] = v;
            image.data[j + 2] = v;
            image.data[j + 3] = 255;
        }
        return image;
    }

    function decodeGridData(grid) {
        const width = Number(grid.width);
        const height = Number(grid.height);
        const expected = width * height;
        if (Array.isArray(grid.data_rle)) {
            return decodeCostmapRle(grid.data_rle, expected);
        }
        if (Array.isArray(grid.data)) {
            if (grid.data.length !== expected) {
                throw new Error(`costmap data length mismatch: ${grid.data.length} != ${expected}`);
            }
            return Int8Array.from(grid.data);
        }
        if (grid.dataBase64) {
            const bin = (typeof atob === 'function') ? atob(grid.dataBase64) : null;
            if (!bin || bin.length !== expected) {
                throw new Error(`costmap base64 length mismatch: ${bin ? bin.length : 'null'} != ${expected}`);
            }
            const out = new Int8Array(expected);
            for (let i = 0; i < expected; i += 1) {
                let v = bin.charCodeAt(i);
                if (v > 127) v -= 256;
                out[i] = v;
            }
            return out;
        }
        throw new Error('costmap is missing data/data_rle');
    }

    // RViz nav2 "costmap" color scheme:
    //   value == LETHAL_OBSTACLE (100)            → magenta (the obstacle itself)
    //   value == INSCRIBED_INFLATED_OBSTACLE (99) → cyan, full alpha
    //   1 <= value <= 98 (gradient inflation)     → cyan with cost-scaled alpha
    //   value == 0 (free) / value < 0 (unknown)   → transparent
    //
    // Many nav2 configs only produce 0 / 99 / 100 (no soft gradient), so we
    // grade by max value when there's no gradient — inscribed cells still
    // render as a clear cyan ring around the magenta obstacle.
    function colorForCost(maxVal, interpVal) {
        if (maxVal >= 100) {
            return { r: 255, g: 0, b: 255, a: 235 };
        }
        if (maxVal <= 0 && interpVal <= 0) {
            return { r: 0, g: 0, b: 0, a: 0 };
        }
        const v = Math.max(interpVal, 0);
        const t = Math.min(1, v / 99);
        return {
            r: 0,
            g: 230,
            b: 255,
            a: Math.round(90 + t * 165)
        };
    }

    // Bilinear upsample the int8 data grid by `factor` and colorize each output
    // pixel. factor=1 is nearest-neighbour (the legacy 1:1 behaviour). The Y
    // axis is flipped so image row 0 (canvas top) = world top = data row
    // height-1, matching `worldToCanvas`.
    function colorizeCostmapGrid(data, width, height, upsample) {
        const factor = Math.max(1, Math.floor(upsample || 1));
        const newW = width * factor;
        const newH = height * factor;
        const image = new ImageData(newW, newH);
        for (let imgY = 0; imgY < newH; imgY += 1) {
            const srcGy = (newH - 1 - imgY + 0.5) / factor - 0.5;
            const gy0 = Math.max(0, Math.floor(srcGy));
            const gy1 = Math.min(height - 1, gy0 + 1);
            const ty = Math.max(0, Math.min(1, srcGy - gy0));
            for (let imgX = 0; imgX < newW; imgX += 1) {
                const srcGx = (imgX + 0.5) / factor - 0.5;
                const gx0 = Math.max(0, Math.floor(srcGx));
                const gx1 = Math.min(width - 1, gx0 + 1);
                const tx = Math.max(0, Math.min(1, srcGx - gx0));
                const v00 = data[gy0 * width + gx0];
                const v01 = data[gy0 * width + gx1];
                const v10 = data[gy1 * width + gx0];
                const v11 = data[gy1 * width + gx1];
                // Lethal/inscribed boundary must not "shrink" under
                // interpolation, so anchor those cells via max-pool — but
                // only over cells that actually contribute to the bilinear
                // (zero-weight neighbors must not bleed in, otherwise a
                // factor=1 render would no longer be a clean nearest-neighbor).
                const useGy1 = ty > 0;
                const useGx1 = tx > 0;
                let maxV = v00;
                if (useGx1) maxV = Math.max(maxV, v01);
                if (useGy1) maxV = Math.max(maxV, v10);
                if (useGy1 && useGx1) maxV = Math.max(maxV, v11);
                // For inflation gradient we want a smooth ramp, so bilerp the
                // costs (treating unknown as 0 to avoid sharp seams).
                const c00 = v00 < 0 ? 0 : v00;
                const c01 = v01 < 0 ? 0 : v01;
                const c10 = v10 < 0 ? 0 : v10;
                const c11 = v11 < 0 ? 0 : v11;
                const a0 = c00 * (1 - tx) + c01 * tx;
                const a1 = c10 * (1 - tx) + c11 * tx;
                const interpVal = a0 * (1 - ty) + a1 * ty;
                const color = colorForCost(maxV, interpVal);
                const dst = (imgY * newW + imgX) * 4;
                image.data[dst] = color.r;
                image.data[dst + 1] = color.g;
                image.data[dst + 2] = color.b;
                image.data[dst + 3] = color.a;
            }
        }
        return image;
    }

    function buildCostmapImage(grid) {
        const data = decodeGridData(grid);
        return colorizeCostmapGrid(data, Number(grid.width), Number(grid.height), 1);
    }

    // Bucket the costmap values so we can tell, in one log line, whether the
    // streamer is actually publishing inflation gradient (1-98) or just binary
    // lethal/free. If `inflation` is 0 you almost certainly need to enable
    // inflation_layer on the nav2 local_costmap.
    function histogramCostmap(grid) {
        try {
            const data = decodeGridData(grid);
            const buckets = {
                total: data.length,
                unknown: 0,
                free: 0,
                inflation_low_1_25: 0,
                inflation_mid_26_75: 0,
                inflation_high_76_98: 0,
                inscribed_99: 0,
                lethal_100: 0,
                other: 0
            };
            for (let i = 0; i < data.length; i += 1) {
                const v = data[i];
                if (v < 0) buckets.unknown += 1;
                else if (v === 0) buckets.free += 1;
                else if (v >= 100) buckets.lethal_100 += 1;
                else if (v === 99) buckets.inscribed_99 += 1;
                else if (v >= 76) buckets.inflation_high_76_98 += 1;
                else if (v >= 26) buckets.inflation_mid_26_75 += 1;
                else if (v >= 1) buckets.inflation_low_1_25 += 1;
                else buckets.other += 1;
            }
            return buckets;
        } catch (_) {
            return null;
        }
    }

    function buildSmoothCostmapImage(grid, factor) {
        const data = decodeGridData(grid);
        return colorizeCostmapGrid(data, Number(grid.width), Number(grid.height), factor);
    }

    class NavViewWindow {
        constructor(options) {
            this.window = options.windowEl;
            this.canvas = options.canvasEl;
            this.loadingEl = options.loadingEl;
            this.header = options.headerEl;
            this.closeEl = options.closeEl;
            this.statusEl = options.statusEl;
            this.baseMapStatusEl = options.baseMapStatusEl;
            this.zoomInEl = options.zoomInEl;
            this.zoomOutEl = options.zoomOutEl;
            this.zoomResetEl = options.zoomResetEl;
            this.toolInspectEl = options.toolInspectEl;
            this.cursorInfoEl = options.cursorInfoEl;
            this.zoom = 1;
            this.minZoom = 0.5;
            this.maxZoom = 16;
            this.zoomStep = 1.5;
            this.viewCenter = null;
            this.tool = 'none';
            this.panState = null;
            this.costmapUpsample = 4;
            this.active = false;
            this.snapshot = null;
            this.baseMap = null;
            this.baseMapImage = null;
            this.baseMapCanvas = null;
            this.locations = [];
            this.goal = null;
            this.vizStats = null;
            this.initDrag();
            this.initZoomControls();
            this.initToolControls();
            this.initCanvasInteractions();
            if (this.closeEl) {
                this.closeEl.addEventListener('click', () => this.hide());
            }
        }

        initToolControls() {
            if (this.toolInspectEl) {
                this.toolInspectEl.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.setTool('inspect');
                });
            }
            this.updateToolButtons();
            this.updateCanvasCursor();
        }

        initCanvasInteractions() {
            if (!this.canvas) return;
            // Drag-to-pan is always on. Inspect tool only adds a coord readout.
            this.canvas.addEventListener('mousedown', (e) => {
                if (e.button !== 0) return;
                e.preventDefault();
                this.startPan(e);
            });
            this.canvas.addEventListener('mousemove', (e) => {
                if (this.tool === 'inspect') this.updateCursorInfo(e);
            });
            this.canvas.addEventListener('mouseleave', () => {
                if (this.cursorInfoEl) this.cursorInfoEl.style.display = 'none';
            });
            document.addEventListener('mousemove', (e) => {
                if (this.panState) this.continuePan(e);
            });
            document.addEventListener('mouseup', () => {
                if (this.panState) this.endPan();
            });
        }

        setTool(name) {
            const next = this.tool === name ? 'none' : name;
            this.tool = next;
            this.updateToolButtons();
            this.updateCanvasCursor();
            if (next !== 'inspect' && this.cursorInfoEl) {
                this.cursorInfoEl.style.display = 'none';
            }
        }

        updateToolButtons() {
            if (this.toolInspectEl) this.toolInspectEl.classList.toggle('active', this.tool === 'inspect');
        }

        updateCanvasCursor() {
            if (!this.canvas) return;
            if (this.panState) {
                this.canvas.style.cursor = 'grabbing';
            } else if (this.tool === 'inspect') {
                this.canvas.style.cursor = 'crosshair';
            } else {
                this.canvas.style.cursor = 'grab';
            }
        }

        resolveDefaultCenter() {
            const pgm = this.baseMap.pgm;
            const yaml = this.baseMap.yaml;
            if (this.zoom > 1.0001 && this.snapshot && this.snapshot.localized && this.snapshot.pose) {
                return { x: this.snapshot.pose.x, y: this.snapshot.pose.y };
            }
            return {
                x: yaml.origin.x + (pgm.width * yaml.resolution) / 2,
                y: yaml.origin.y + (pgm.height * yaml.resolution) / 2
            };
        }

        startPan(event) {
            if (!this.baseMap || !this.baseMap.yaml) return;
            if (!this.viewCenter) this.viewCenter = this.resolveDefaultCenter();
            this.panState = { x: event.clientX, y: event.clientY };
            this.updateCanvasCursor();
        }

        continuePan(event) {
            if (!this.panState || !this.baseMap || !this.baseMap.yaml || !this.canvas) return;
            const dpr = window.devicePixelRatio || 1;
            const dxCss = event.clientX - this.panState.x;
            const dyCss = event.clientY - this.panState.y;
            this.panState.x = event.clientX;
            this.panState.y = event.clientY;
            const rect = this.canvas.getBoundingClientRect();
            const width = Math.max(320, Math.floor(rect.width * dpr));
            const height = Math.max(220, Math.floor(rect.height * dpr));
            const fitScale = Math.min(width / this.baseMap.pgm.width, height / this.baseMap.pgm.height);
            const scale = fitScale * this.zoom;
            if (scale <= 0) return;
            // canvas pixels → grid pixels → world meters.
            // Canvas Y axis is flipped relative to world Y.
            const resolution = Number(this.baseMap.yaml.resolution) || 1;
            const metersPerCanvasPx = resolution / scale;
            this.viewCenter.x -= dxCss * dpr * metersPerCanvasPx;
            this.viewCenter.y += dyCss * dpr * metersPerCanvasPx;
            this.draw();
        }

        endPan() {
            this.panState = null;
            this.updateCanvasCursor();
        }

        updateCursorInfo(event) {
            if (!this.cursorInfoEl || !this.canvas || !this.baseMap || !this.baseMap.yaml) return;
            const coords = this.canvasEventToCoords(event);
            if (!coords) {
                this.cursorInfoEl.style.display = 'none';
                return;
            }
            this.cursorInfoEl.style.display = 'block';
            this.cursorInfoEl.textContent =
                `px(${coords.px}, ${coords.py})  世界(${coords.wx.toFixed(3)}, ${coords.wy.toFixed(3)}) m`;
        }

        canvasEventToCoords(event) {
            const rect = this.canvas.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            const cx = (event.clientX - rect.left) * dpr;
            const cy = (event.clientY - rect.top) * dpr;
            const viewport = this.computeViewport(this.canvas.width, this.canvas.height);
            if (!viewport) return null;
            const gx = (cx - viewport.offsetX) / viewport.scale;
            const gyFromBottom = (viewport.offsetY + viewport.drawHeight - cy) / viewport.scale;
            const wx = viewport.yaml.origin.x + gx * viewport.yaml.resolution;
            const wy = viewport.yaml.origin.y + gyFromBottom * viewport.yaml.resolution;
            return {
                px: Math.round(gx),
                py: Math.round(viewport.pgm.height - gyFromBottom),
                wx, wy
            };
        }

        initZoomControls() {
            if (this.zoomInEl) {
                this.zoomInEl.addEventListener('click', (e) => { e.stopPropagation(); this.zoomIn(); });
            }
            if (this.zoomOutEl) {
                this.zoomOutEl.addEventListener('click', (e) => { e.stopPropagation(); this.zoomOut(); });
            }
            if (this.zoomResetEl) {
                this.zoomResetEl.addEventListener('click', (e) => { e.stopPropagation(); this.resetZoom(); });
            }
        }

        zoomIn() { this.setZoom(this.zoom * this.zoomStep); }
        zoomOut() { this.setZoom(this.zoom / this.zoomStep); }
        resetZoom() {
            this.viewCenter = null;
            this.zoom = 1;
            if (this.active) this.draw();
        }

        setZoom(zoom) {
            const next = Math.max(this.minZoom, Math.min(this.maxZoom, zoom));
            if (Math.abs(next - this.zoom) < 1e-6) return;
            this.zoom = next;
            if (this.active) this.draw();
        }

        initDrag() {
            if (!this.window || !this.header) return;
            let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
            this.header.onmousedown = (e) => {
                if (e.target.classList.contains('fw-close')) return;
                e.preventDefault();
                pos3 = e.clientX;
                pos4 = e.clientY;
                const onMove = (moveEvent) => {
                    moveEvent.preventDefault();
                    pos1 = pos3 - moveEvent.clientX;
                    pos2 = pos4 - moveEvent.clientY;
                    pos3 = moveEvent.clientX;
                    pos4 = moveEvent.clientY;
                    this.window.style.top = `${this.window.offsetTop - pos2}px`;
                    this.window.style.left = `${this.window.offsetLeft - pos1}px`;
                };
                const onUp = () => {
                    document.removeEventListener('mousemove', onMove);
                    document.removeEventListener('mouseup', onUp);
                };
                document.addEventListener('mousemove', onMove);
                document.addEventListener('mouseup', onUp);
            };
        }

        setBaseMap(baseMap) {
            this.baseMap = baseMap || null;
            this.baseMapImage = null;
            this.baseMapCanvas = null;
            if (this.baseMap && this.baseMap.pgm && typeof ImageData !== 'undefined') {
                try {
                    this.baseMapImage = buildBaseMapImage(this.baseMap.pgm);
                    const off = document.createElement('canvas');
                    off.width = this.baseMap.pgm.width;
                    off.height = this.baseMap.pgm.height;
                    off.getContext('2d').putImageData(this.baseMapImage, 0, 0);
                    this.baseMapCanvas = off;
                } catch (err) {
                    console.warn('[NavView] base map decode failed:', err);
                }
            }
            this.updateBaseMapStatus();
            if (this.active) this.draw();
        }

        setLocations(locations) {
            this.locations = Array.isArray(locations) ? locations : [];
            if (this.active) this.draw();
        }

        updateBaseMapStatus() {
            if (!this.baseMapStatusEl) return;
            if (!this.baseMap) {
                this.baseMapStatusEl.textContent = '底图: 未选择地图文件夹';
                this.baseMapStatusEl.style.color = '#9ca3af';
                return;
            }
            if (!this.baseMap.yaml) {
                this.baseMapStatusEl.textContent = `底图: ${this.baseMap.folderName || ''} (缺少 occ_grid.yaml)`;
                this.baseMapStatusEl.style.color = '#f59e0b';
                return;
            }
            const yaml = this.baseMap.yaml;
            this.baseMapStatusEl.textContent =
                `底图: ${this.baseMap.folderName || ''}  res=${yaml.resolution}m  ` +
                `origin=(${yaml.origin.x.toFixed(2)}, ${yaml.origin.y.toFixed(2)})`;
            this.baseMapStatusEl.style.color = '#10b981';
        }

        show() {
            if (!this.window) return;
            this.active = true;
            this.window.style.display = 'block';
            this.draw();
        }

        hide() {
            if (!this.window) return;
            this.active = false;
            this.window.style.display = 'none';
        }

        update(snapshot) {
            const normalized = normalizeSnapshot(snapshot);
            this.rawSnapshot = snapshot;
            this.snapshot = normalized;
            if (!this._loggedFirstSnapshot && snapshot) {
                this._loggedFirstSnapshot = true;
                const summary = {
                    keys: Object.keys(snapshot),
                    localized: normalized && normalized.localized,
                    pose: normalized && normalized.pose
                        ? `(${normalized.pose.x.toFixed(3)}, ${normalized.pose.y.toFixed(3)}, yaw=${normalized.pose.yaw.toFixed(3)})`
                        : null,
                    global_path: normalized && normalized.global_path
                        ? { frame: normalized.global_path.frame_id, count: normalized.global_path.poses.length }
                        : null,
                    local_path: normalized && normalized.local_path
                        ? { frame: normalized.local_path.frame_id, count: normalized.local_path.poses.length }
                        : null,
                    local_costmap: normalized && normalized.local_costmap
                        ? {
                            frame: normalized.local_costmap.frame_id,
                            size: `${normalized.local_costmap.width}×${normalized.local_costmap.height}`,
                            resolution: normalized.local_costmap.resolution,
                            origin: `(${normalized.local_costmap.origin.x.toFixed(3)}, ${normalized.local_costmap.origin.y.toFixed(3)}, yaw=${normalized.local_costmap.origin.yaw.toFixed(3)})`,
                            hist: histogramCostmap(normalized.local_costmap)
                        }
                        : null
                };
                try { console.log('[NavView] first snapshot raw =', snapshot); } catch (_) {}
                try { console.log('[NavView] first snapshot summary =', summary); } catch (_) {}
                if (typeof window !== 'undefined' && window.logger && window.logger.info) {
                    window.logger.info(`导航视图首帧: ${JSON.stringify(summary)}`);
                }
            }

            // 每次 snapshot 都做一次帧一致性检测，发现 costmap/path 不在 map 帧时
            // 提醒一次（用以解释 pose 与 costmap 反向漂移之类的现象）。
            this._checkFrameConsistency(normalized);
            if (normalized && normalized.goal) {
                this.goal = normalized.goal;
            }
            this.renderStatus();
            if (this.active) this.draw();
        }

        updateVizStats(stats) {
            this.vizStats = stats || null;
            this.renderStatus();
        }

        _checkFrameConsistency(snap) {
            if (!snap) return;
            const refFrame = (snap.global_path && snap.global_path.frame_id) || 'map';
            const issues = [];
            if (snap.local_costmap && snap.local_costmap.frame_id
                && snap.local_costmap.frame_id !== refFrame) {
                issues.push(`local_costmap.frame=${snap.local_costmap.frame_id}`);
            }
            if (snap.local_path && snap.local_path.frame_id
                && snap.local_path.frame_id !== refFrame) {
                issues.push(`local_path.frame=${snap.local_path.frame_id}`);
            }
            if (issues.length && !this._frameWarned) {
                this._frameWarned = true;
                const msg = `导航视图帧不一致 (pose/global=${refFrame}, ${issues.join(', ')}); ` +
                    `streamer 未把 odom 帧字段投到 ${refFrame}，前端无 TF，叠加位置会按 map↔odom 偏移漂移`;
                try { console.warn('[NavView] ' + msg); } catch (_) {}
                if (typeof window !== 'undefined' && window.logger && window.logger.error) {
                    window.logger.error(msg);
                }
            }
        }

        setGoal(goal) {
            if (!goal || typeof goal.x !== 'number' || typeof goal.y !== 'number') {
                this.goal = null;
            } else {
                this.goal = {
                    x: Number(goal.x),
                    y: Number(goal.y),
                    yaw: Number(goal.yaw || 0),
                    name: goal.name || '目标'
                };
            }
            if (this.active) this.draw();
        }

        renderStatus() {
            if (!this.statusEl) return;
            const stats = this.vizStats;
            const snap = this.snapshot;
            let text = '未连接导航视图';
            let color = '#94a3b8';

            if (stats) {
                if (!stats.listening) {
                    text = `UDP未监听 (port ${stats.port})`;
                    color = '#ef4444';
                } else if (!stats.packetCount) {
                    const pingPart = stats.pingCount
                        ? ` · 已发 ${stats.pingCount} ping → ${stats.pingTarget}`
                        : '';
                    text = `UDP监听中 ${stats.port}，未收到数据${pingPart}`;
                    color = '#fbbf24';
                } else {
                    const fresh = stats.ageMs != null && stats.ageMs < 3000;
                    const ageStr = stats.ageMs == null ? '--' : `${(stats.ageMs / 1000).toFixed(1)}s`;
                    if (!fresh) {
                        text = `数据停顿 from ${stats.lastSender}, 上次 ${ageStr} 前`;
                        color = '#f97316';
                    } else if (snap) {
                        const snapAge = snap.stamp ? Math.max(0, Date.now() / 1000 - snap.stamp).toFixed(1) : '--';
                        const gp = snap.global_path && snap.global_path.poses ? snap.global_path.poses.length : 0;
                        const lp = snap.local_path && snap.local_path.poses ? snap.local_path.poses.length : 0;
                        const cm = snap.local_costmap ? `${snap.local_costmap.width}×${snap.local_costmap.height}` : '✗';
                        const fields = `全局路径 ${gp}点 · 局部路径 ${lp}点 · 局部代价图 ${cm}`;
                        const baseInfo = `${stats.packetCount} 包 · ${snapAge}s`;
                        if (snap.localized) {
                            text = `已定位 seq=${snap.seq || 0} · ${fields} · ${baseInfo}`;
                            color = '#10b981';
                        } else {
                            text = `未定位 (NOS map→base TF 缺失) · ${fields} · ${baseInfo}`;
                            color = '#f59e0b';
                        }
                    } else {
                        text = `接收中 from ${stats.lastSender}, ${stats.packetCount} 包`;
                        color = '#10b981';
                    }
                }
            } else if (snap) {
                text = snap.localized ? `已定位 seq=${snap.seq || 0}` : '未定位';
                color = snap.localized ? '#10b981' : '#f59e0b';
            }
            this.statusEl.textContent = text;
            this.statusEl.style.color = color;
        }

        draw() {
            if (!this.canvas) return;
            const ctx = this.canvas.getContext('2d');
            const rect = this.canvas.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            const width = Math.max(320, Math.floor(rect.width * dpr));
            const height = Math.max(220, Math.floor(rect.height * dpr));
            if (this.canvas.width !== width || this.canvas.height !== height) {
                this.canvas.width = width;
                this.canvas.height = height;
            }
            ctx.clearRect(0, 0, width, height);
            ctx.fillStyle = '#101820';
            ctx.fillRect(0, 0, width, height);

            const viewport = this.computeViewport(width, height);

            if (viewport) {
                this.drawBaseMap(ctx, viewport);
                this.drawLocations(ctx, viewport);
                this.drawCostmapOverlay(ctx, viewport);
                this.drawPath(ctx, this.snapshot && this.snapshot.global_path, viewport, '#7f1d1d', 3);
                this.drawPath(ctx, this.snapshot && this.snapshot.local_path, viewport, '#f97316', 3);
                this.drawGoal(ctx, this.goal, viewport);
                // NOS sets pose to (0,0,0) when TF map→base_link is unavailable.
                // Don't render a fake robot in that case.
                if (this.snapshot && this.snapshot.localized && this.snapshot.pose) {
                    this.drawPose(ctx, this.snapshot.pose, viewport);
                }
                this.setLoading('');
            } else {
                this.drawPlaceholder(ctx, width, height);
                this.setLoading('请选择地图文件夹，确保包含 occ_grid.pgm 与 occ_grid.yaml');
            }
        }

        computeViewport(width, height) {
            if (!this.baseMap || !this.baseMap.yaml || !this.baseMapCanvas) return null;
            const pgm = this.baseMap.pgm;
            const yaml = this.baseMap.yaml;
            const fitScale = Math.min(width / pgm.width, height / pgm.height);
            const scale = fitScale * this.zoom;
            const drawWidth = pgm.width * scale;
            const drawHeight = pgm.height * scale;

            // Pick the center in world coords: prefer current pose when
            // zoomed in, fall back to map center for fit view.
            let centerWorld;
            if (this.viewCenter) {
                centerWorld = this.viewCenter;
            } else if (this.zoom > 1.0001 && this.snapshot && this.snapshot.localized && this.snapshot.pose) {
                centerWorld = { x: this.snapshot.pose.x, y: this.snapshot.pose.y };
            } else {
                centerWorld = {
                    x: yaml.origin.x + (pgm.width * yaml.resolution) / 2,
                    y: yaml.origin.y + (pgm.height * yaml.resolution) / 2
                };
            }
            const gxCenter = (centerWorld.x - yaml.origin.x) / yaml.resolution;
            const gyCenter = (centerWorld.y - yaml.origin.y) / yaml.resolution;
            const offsetX = width / 2 - gxCenter * scale;
            const offsetY = height / 2 - (pgm.height - gyCenter) * scale;
            return {
                pgm,
                yaml,
                scale,
                drawWidth,
                drawHeight,
                offsetX,
                offsetY
            };
        }

        worldToCanvas(point, viewport) {
            const { yaml, pgm, scale, offsetX, offsetY, drawHeight } = viewport;
            const gx = (point.x - yaml.origin.x) / yaml.resolution;
            const gy = (point.y - yaml.origin.y) / yaml.resolution;
            return {
                x: offsetX + gx * scale,
                y: offsetY + drawHeight - gy * scale
            };
        }

        worldToCanvasOriented(point, viewport) {
            const c = this.worldToCanvas(point, viewport);
            return c;
        }

        costmapLocalToWorld(origin, localX, localY) {
            const yaw = normalizeAngle(Number(origin && origin.yaw) || 0);
            const c = Math.cos(yaw);
            const s = Math.sin(yaw);
            return {
                x: Number(origin.x || 0) + c * localX - s * localY,
                y: Number(origin.y || 0) + s * localX + c * localY
            };
        }

        setLoading(text) {
            if (!this.loadingEl) return;
            this.loadingEl.textContent = text;
            this.loadingEl.style.display = text ? 'block' : 'none';
        }

        drawPlaceholder(ctx, width, height) {
            ctx.strokeStyle = 'rgba(255,255,255,0.12)';
            ctx.lineWidth = 1;
            for (let x = 0; x < width; x += 40) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, height);
                ctx.stroke();
            }
            for (let y = 0; y < height; y += 40) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(width, y);
                ctx.stroke();
            }
            ctx.fillStyle = '#e5e7eb';
            ctx.font = '14px sans-serif';
            ctx.fillText('未加载静态底图', 16, 28);
        }

        drawBaseMap(ctx, viewport) {
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(
                this.baseMapCanvas,
                viewport.offsetX,
                viewport.offsetY,
                viewport.drawWidth,
                viewport.drawHeight
            );
        }

        drawCostmapOverlay(ctx, viewport) {
            const grid = this.snapshot && this.snapshot.local_costmap;
            if (!grid) return;
            const hasData = grid.data_rle || grid.data || grid.dataBase64;
            if (!hasData) return;
            let costImage;
            try {
                costImage = buildSmoothCostmapImage(grid, this.costmapUpsample);
            } catch (err) {
                console.warn('[NavView] costmap decode failed:', err);
                return;
            }
            const off = document.createElement('canvas');
            off.width = costImage.width;
            off.height = costImage.height;
            off.getContext('2d').putImageData(costImage, 0, 0);

            const origin = grid.origin || { x: 0, y: 0, yaw: 0 };
            const res = Number(grid.resolution || viewport.yaml.resolution);
            const gridWidthM = Number(grid.width) * res;
            const gridHeightM = Number(grid.height) * res;
            const topLeftWorld = this.costmapLocalToWorld(origin, 0, gridHeightM);
            const topRightWorld = this.costmapLocalToWorld(origin, gridWidthM, gridHeightM);
            const bottomLeftWorld = this.costmapLocalToWorld(origin, 0, 0);
            const topLeftCanvas = this.worldToCanvas(topLeftWorld, viewport);
            const topRightCanvas = this.worldToCanvas(topRightWorld, viewport);
            const bottomLeftCanvas = this.worldToCanvas(bottomLeftWorld, viewport);

            ctx.save();
            ctx.globalAlpha = 0.55;
            ctx.imageSmoothingEnabled = false;
            ctx.setTransform(
                (topRightCanvas.x - topLeftCanvas.x) / off.width,
                (topRightCanvas.y - topLeftCanvas.y) / off.width,
                (bottomLeftCanvas.x - topLeftCanvas.x) / off.height,
                (bottomLeftCanvas.y - topLeftCanvas.y) / off.height,
                topLeftCanvas.x,
                topLeftCanvas.y
            );
            ctx.drawImage(off, 0, 0);
            ctx.restore();
        }

        drawPath(ctx, path, viewport, color, lineWidth) {
            if (!path || !Array.isArray(path.poses) || path.poses.length < 2) return;
            ctx.strokeStyle = color;
            ctx.lineWidth = lineWidth;
            ctx.beginPath();
            path.poses.forEach((pose, idx) => {
                const p = Array.isArray(pose)
                    ? { x: pose[0], y: pose[1], yaw: pose[2] || 0 }
                    : pose;
                const c = this.worldToCanvas(p, viewport);
                if (idx === 0) ctx.moveTo(c.x, c.y);
                else ctx.lineTo(c.x, c.y);
            });
            ctx.stroke();
        }

        drawArrow(ctx, c, yaw, len, fill, stroke) {
            const shaftHalfWidth = Math.max(1.5, len * 0.06);
            const headLen = Math.max(8, len * 0.32);
            const headHalfWidth = Math.max(5, len * 0.18);
            const shaftEnd = Math.max(0, len - headLen);
            ctx.save();
            ctx.translate(c.x, c.y);
            ctx.rotate(-yaw);
            ctx.fillStyle = fill;
            ctx.strokeStyle = stroke;
            ctx.lineWidth = 1;
            // shaft
            ctx.beginPath();
            ctx.rect(0, -shaftHalfWidth, shaftEnd, shaftHalfWidth * 2);
            ctx.fill();
            ctx.stroke();
            // head
            ctx.beginPath();
            ctx.moveTo(len, 0);
            ctx.lineTo(shaftEnd, -headHalfWidth);
            ctx.lineTo(shaftEnd, headHalfWidth);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }

        drawPose(ctx, pose, viewport) {
            if (!pose) return;
            const c = this.worldToCanvas(pose, viewport);
            const yaw = normalizeAngle(Number(pose.yaw || 0));
            // RViz-style long arrow: ~0.7m in world (default arrow length),
            // with a min canvas size so it stays visible when zoomed out.
            const len = Math.max(36, viewport.scale * 0.7);
            this.drawArrow(ctx, c, yaw, len, '#ef4444', '#7f1d1d');
        }

        drawGoal(ctx, goal, viewport) {
            if (!goal) return;
            const c = this.worldToCanvas(goal, viewport);
            const yaw = normalizeAngle(Number(goal.yaw || 0));
            const len = Math.max(16, viewport.scale * 1.2 * 8);
            ctx.save();
            ctx.translate(c.x, c.y);
            ctx.rotate(-yaw);
            ctx.fillStyle = '#ef4444';
            ctx.strokeStyle = '#7f1d1d';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(len, 0);
            ctx.lineTo(-len * 0.45, -len * 0.35);
            ctx.lineTo(-len * 0.25, 0);
            ctx.lineTo(-len * 0.45, len * 0.35);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.restore();
            if (goal.name) {
                ctx.save();
                ctx.fillStyle = '#7f1d1d';
                ctx.font = 'bold 11px sans-serif';
                ctx.fillText(goal.name, c.x + 8, c.y - 8);
                ctx.restore();
            }
        }

        drawLocations(ctx, viewport) {
            if (!Array.isArray(this.locations) || this.locations.length === 0) return;
            ctx.save();
            ctx.fillStyle = 'rgba(59, 130, 246, 0.85)';
            ctx.strokeStyle = '#1e3a8a';
            ctx.lineWidth = 1;
            ctx.font = '11px sans-serif';
            this.locations.forEach((loc) => {
                if (loc == null || typeof loc.posX !== 'number' || typeof loc.posY !== 'number') return;
                const c = this.worldToCanvas({ x: loc.posX, y: loc.posY }, viewport);
                ctx.beginPath();
                ctx.arc(c.x, c.y, 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                if (loc.name) {
                    ctx.fillStyle = '#111827';
                    ctx.fillText(loc.name, c.x + 6, c.y - 6);
                    ctx.fillStyle = 'rgba(59, 130, 246, 0.85)';
                }
            });
            ctx.restore();
        }
    }

    const api = {
        decodeCostmapRle,
        buildBaseMapImage,
        buildCostmapImage,
        buildSmoothCostmapImage,
        colorizeCostmapGrid,
        NavViewWindow
    };
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
    root.M20NavView = api;
})(typeof window !== 'undefined' ? window : globalThis);
