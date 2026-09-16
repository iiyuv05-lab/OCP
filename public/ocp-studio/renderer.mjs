/** OCP canvas renderer with 3D projection, screen culling and LOD. No DOM per node. */
import { TIERS } from './core.mjs';
export function createRenderer(canvas, hooks = {}) {
  const ctx = canvas.getContext('2d', { alpha: false }),
    camera = {
      yaw: -0.1,
      pitch: 0.06,
      zoom: 1,
      panX: 0,
      panY: 0,
      centerX: 0,
      centerY: 0,
      centerZ: 0,
    };
  let pendingInitialFit = false;
  let width = 100,
    height = 100,
    scene = { placements: [], lines: [] },
    hit = [],
    dirty = true,
    frame,
    drag = null,
    selected = '',
    settings = {
      guides: true,
      billboard: true,
      thickness: true,
      opacity: 1,
      grab: false,
      gap: 1,
    };
  const colors = [
    '#dcd7af',
    '#afcdbd',
    '#a8c0d7',
    '#aabce8',
    '#ceb8e3',
    '#d5b7bc',
    '#dac3a8',
    '#c3d39b',
  ];
  function project(p) {
    const x = p.x - camera.centerX,
      y = p.y - camera.centerY,
      z = (p.z - camera.centerZ) * settings.gap;
    const xx = x * Math.cos(camera.yaw) + z * Math.sin(camera.yaw),
      zz = -x * Math.sin(camera.yaw) + z * Math.cos(camera.yaw);
    const yy = y * Math.cos(camera.pitch) - zz * Math.sin(camera.pitch),
      depth = y * Math.sin(camera.pitch) + zz * Math.cos(camera.pitch);
    return {
      x: width / 2 + xx * camera.zoom + camera.panX,
      y: height / 2 + yy * camera.zoom + camera.panY,
      z: depth,
    };
  }
  function poly(points, fill, stroke) {
    ctx.beginPath();
    points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.stroke();
    }
  }
  function draw() {
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#101714';
    ctx.fillRect(0, 0, width, height);
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#1e2924';
    const grid = 40;
    ctx.beginPath();
    for (let x = camera.panX % grid; x < width; x += grid) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (let y = camera.panY % grid; y < height; y += grid) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();
    if (settings.guides && scene.view === 'pipeline') {
      for (const [t, label, en] of TIERS) {
        const y = -(Number(t) - 4.5) * 260,
          a = project({ x: -20000, y: y + 126, z: 0 }),
          b = project({ x: 20000, y: y + 126, z: 0 });
        ctx.strokeStyle = '#344035';
        ctx.setLineDash([6, 7]);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        ctx.setLineDash([]);
        const p = project({ x: 0, y, z: 0 });
        if (p.y > -80 && p.y < height + 80) {
          ctx.fillStyle = colors[Number(t) - 1];
          ctx.font = '600 12px system-ui';
          ctx.fillText(`${t}  ${label}`, 15, p.y - 55);
          ctx.font = '9px monospace';
          ctx.fillStyle = '#7c9184';
          ctx.fillText(en, 15, p.y - 39);
        }
      }
    }
    const map = new Map(scene.placements.map((p) => [p.key, p]));
    ctx.globalAlpha = settings.opacity * 0.7;
    for (const e of scene.lines) {
      const aa = map.get(e.from),
        bb = map.get(e.to);
      if (!aa || !bb) continue;
      const a = project(aa),
        b = project(bb);
      ctx.strokeStyle =
        e.predicate === 'CONTAINS'
          ? '#577862'
          : e.stateKind === 'planned'
            ? '#455a50'
            : '#92b59e';
      ctx.setLineDash(e.stateKind === 'planned' ? [5, 5] : []);
      ctx.lineWidth = e.from === selected || e.to === selected ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      if (camera.zoom > 0.45) {
        const angle = Math.atan2(b.y - a.y, b.x - a.x),
          m = { x: a.x + (b.x - a.x) * 0.57, y: a.y + (b.y - a.y) * 0.57 };
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(
          m.x - 7 * Math.cos(angle - 0.4),
          m.y - 7 * Math.sin(angle - 0.4),
        );
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(
          m.x - 7 * Math.cos(angle + 0.4),
          m.y - 7 * Math.sin(angle + 0.4),
        );
        ctx.stroke();
      }
    }
    ctx.setLineDash([]);
    hit = [];
    const list = [...scene.placements].sort(
      (a, b) => project(a).z - project(b).z,
    );
    for (const p of list) {
      const c = project(p),
        w = p.width * camera.zoom,
        h = p.height * camera.zoom;
      if (c.x + w < 0 || c.y + h < 0 || c.x - w > width || c.y - h > height)
        continue;
      const tint =
        colors[Number(p.tier || p.node.tiers?.[0] || '02') - 1] || '#b6c8b8';
      ctx.globalAlpha = settings.opacity;
      if (w < 14) {
        ctx.fillStyle = tint;
        ctx.fillRect(
          c.x,
          c.y,
          Math.max(0.25, w * 0.06),
          Math.max(0.25, w * 0.06),
        );
        continue;
      }
      let points;
      if (settings.billboard)
        points = [
          { x: c.x - w / 2, y: c.y - h / 2 },
          { x: c.x + w / 2, y: c.y - h / 2 },
          { x: c.x + w / 2, y: c.y + h / 2 },
          { x: c.x - w / 2, y: c.y + h / 2 },
        ];
      else
        points = [
          [-0.5, -0.5],
          [0.5, -0.5],
          [0.5, 0.5],
          [-0.5, 0.5],
        ].map(([a, b]) =>
          project({ ...p, x: p.x + a * p.width, y: p.y + b * p.height }),
        );
      if (settings.thickness && !settings.billboard) {
        const back = points.map((q) => ({
          x: q.x + Math.sin(camera.yaw) * 14 * camera.zoom,
          y: q.y + Math.sin(camera.pitch) * 14 * camera.zoom,
        }));
        poly([...points.slice(1, 3), back[2], back[1]], '#526657', tint);
      }
      ctx.lineWidth = p.entityId === selected ? 2 : 1;
      ctx.setLineDash(p.node.stateKind === 'planned' ? [5, 4] : []);
      poly(
        points,
        p.entityId === selected
          ? '#314438'
          : p.node.kind === 'core'
            ? '#2f4334'
            : '#1c2922',
        p.entityId === selected ? '#d8ecc9' : tint,
      );
      ctx.setLineDash([]);
      const xs = points.map((x) => x.x),
        ys = points.map((x) => x.y),
        x = Math.min(...xs),
        y = Math.min(...ys),
        rw = Math.max(...xs) - x,
        rh = Math.max(...ys) - y;
      hit.push({ x, y, w: Math.max(rw, 8), h: rh, id: p.entityId, key: p.key });
      if (rw < 20 && settings.thickness) {
        ctx.save();
        ctx.translate(x + 5, y);
        ctx.rotate(Math.PI / 2);
        ctx.fillStyle = tint;
        ctx.font = '11px system-ui';
        ctx.fillText(p.node.title.slice(0, 35), 0, 0);
        ctx.restore();
        continue;
      }
      if (w < 75 || rw < 40) continue;
      ctx.save();
      ctx.beginPath();
      ctx.rect(x + 5, y + 5, rw - 10, rh - 10);
      ctx.clip();
      const scale = Math.min(camera.zoom, 2.4);
      ctx.font = `600 ${Math.max(8, 10 * scale)}px monospace`;
      ctx.fillStyle = tint;
      ctx.fillText(
        (p.node.kind || 'canvas').toUpperCase() +
          (p.tier ? ` · ${p.tier}` : ''),
        x + 12 * scale,
        y + 19 * scale,
      );
      ctx.font = `600 ${Math.max(11, 14 * scale)}px system-ui`;
      ctx.fillStyle = '#ecf1e8';
      const title = p.flowTitle || p.node.title;
      wrapText(
        title,
        x + 12 * scale,
        y + 43 * scale,
        rw - 24 * scale,
        19 * scale,
        2,
      );
      ctx.font = `${Math.max(9, 10 * scale)}px system-ui`;
      ctx.fillStyle = '#a7baaa';
      ctx.fillText(
        p.node.status || 'unknown',
        x + 12 * scale,
        y + rh - 15 * scale,
      );
      if (p.node.representations?.length) {
        ctx.font = `${Math.max(8, 9 * scale)}px monospace`;
        ctx.fillStyle = tint;
        ctx.fillText(
          p.node.representations.join(' · ') +
            (p.secondary ? '  ↳ 같은 ID' : ''),
          x + 12 * scale,
          y + rh - 32 * scale,
        );
      }
      if (p.node.image && rh > 120) {
        const im = image(p.node.image);
        if (im.complete && im.naturalWidth) {
          ctx.imageSmoothingEnabled = camera.zoom < 4;
          ctx.drawImage(
            im,
            x + 10 * scale,
            y + 68 * scale,
            rw - 20 * scale,
            Math.max(10, rh - 110 * scale),
          );
        }
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    hooks.onFrame?.({
      visible: hit.length,
      total: scene.placements.length,
      zoom: camera.zoom,
    });
  }
  function wrapText(text, x, y, max, lineHeight, lines) {
    const words = String(text).split('');
    let row = '',
      j = 0;
    for (const word of words) {
      if (ctx.measureText(row + word).width > max && row) {
        ctx.fillText(row, x, y + j * lineHeight);
        row = word;
        if (++j >= lines) return;
      } else row += word;
    }
    if (j < lines) ctx.fillText(row, x, y + j * lineHeight);
  }
  const cache = new Map();
  function image(url) {
    if (!cache.has(url)) {
      const im = new Image();
      im.onload = () => (dirty = true);
      im.src = hooks.resolveImage?.(url) || url;
      cache.set(url, im);
    }
    return cache.get(url);
  }
  function animate() {
    if (dirty) {
      dirty = false;
      draw();
    }
    frame = requestAnimationFrame(animate);
  }
  animate();
  const resize = new ResizeObserver(() => {
    const r = canvas.getBoundingClientRect();
    width = r.width;
    height = r.height;
    canvas.width = width * devicePixelRatio;
    canvas.height = height * devicePixelRatio;
    if (pendingInitialFit) fit();
    dirty = true;
  });
  resize.observe(canvas);
  const controller = new AbortController(),
    listen = (name, fn, opts = {}) =>
      canvas.addEventListener(name, fn, { ...opts, signal: controller.signal });
  listen('pointerdown', (e) => {
    if (e.button !== 0 && e.button !== 1 && e.button !== 2) return;
    canvas.focus();
    drag = {
      x: e.clientX,
      y: e.clientY,
      startX: e.clientX,
      startY: e.clientY,
      pan: settings.grab || e.shiftKey || e.button > 0 || space,
    };
    canvas.setPointerCapture(e.pointerId);
  });
  listen('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x,
      dy = e.clientY - drag.y;
    if (drag.pan) {
      camera.panX += dx;
      camera.panY += dy;
    } else {
      camera.yaw += dx * 0.005;
      camera.pitch = Math.max(-1.5, Math.min(1.5, camera.pitch + dy * 0.005));
    }
    drag.x = e.clientX;
    drag.y = e.clientY;
    dirty = true;
  });
  listen('pointerup', (e) => {
    if (
      drag &&
      Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) < 5
    ) {
      const r = canvas.getBoundingClientRect(),
        x = e.clientX - r.left,
        y = e.clientY - r.top;
      const found = [...hit]
        .reverse()
        .find((h) => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h);
      if (found) {
        selected = found.id;
        hooks.select?.(found.id);
      }
      dirty = true;
    }
    drag = null;
  });
  listen('pointercancel', () => (drag = null));
  listen('contextmenu', (e) => e.preventDefault());
  listen(
    'wheel',
    (e) => {
      e.preventDefault();
      const r = canvas.getBoundingClientRect(),
        x = e.clientX - r.left - width / 2,
        y = e.clientY - r.top - height / 2;
      zoom(camera.zoom * Math.exp(-e.deltaY * 0.0015), x, y);
    },
    { passive: false },
  );
  let space = false;
  function key(e) {
    if (e.target.matches('input,textarea,select') || e.target.isContentEditable)
      return;
    if (e.code === 'Space') {
      space = e.type === 'keydown';
      e.preventDefault();
      return;
    }
    if (e.type !== 'keydown') return;
    const step = e.shiftKey ? 100 : 35;
    const v = {
      KeyW: [0, step],
      ArrowUp: [0, step],
      KeyS: [0, -step],
      ArrowDown: [0, -step],
      KeyA: [step, 0],
      ArrowLeft: [step, 0],
      KeyD: [-step, 0],
      ArrowRight: [-step, 0],
    }[e.code];
    if (v) {
      e.preventDefault();
      camera.panX += v[0];
      camera.panY += v[1];
      dirty = true;
    }
    if (e.code === 'KeyR') fit();
    if (e.code === 'KeyH') {
      settings.grab = true;
      hooks.mode?.('grab');
    }
    if (e.code === 'KeyV') {
      settings.grab = false;
      hooks.mode?.('rotate');
    }
    if (e.code === 'Digit3' || e.code === 'Numpad3') {
      e.preventDefault();
      hooks.view?.('journey');
      hooks.key?.(e.code);
    }
    if (e.code === 'Digit1' || e.code === 'Numpad1') hooks.view?.('pipeline');
    if (e.code === 'Digit2' || e.code === 'Numpad2') hooks.view?.('hierarchy');
  }
  canvas.addEventListener('keydown', key, { signal: controller.signal });
  canvas.addEventListener('keyup', key, { signal: controller.signal });
  function zoom(value, x = 0, y = 0) {
    const next = Math.max(0.001, Math.min(512, value)),
      ratio = next / camera.zoom;
    camera.panX = x - (x - camera.panX) * ratio;
    camera.panY = y - (y - camera.panY) * ratio;
    camera.zoom = next;
    dirty = true;
  }
  function fit() {
    if (!scene.placements.length) return;
    // A synchronous adapter can resolve before ResizeObserver runs.
    const bounds = canvas.getBoundingClientRect();
    if (bounds.width < 120 || bounds.height < 120) {
      pendingInitialFit = true;
      return;
    }
    pendingInitialFit = false;
    width = bounds.width;
    height = bounds.height;
    canvas.width = Math.round(width * devicePixelRatio);
    canvas.height = Math.round(height * devicePixelRatio);
    const minX = Math.min(...scene.placements.map((p) => p.x - p.width / 2)),
      maxX = Math.max(...scene.placements.map((p) => p.x + p.width / 2)),
      minY = Math.min(...scene.placements.map((p) => p.y - p.height / 2)),
      maxY = Math.max(...scene.placements.map((p) => p.y + p.height / 2));
    camera.centerX = (minX + maxX) / 2;
    camera.centerY = (minY + maxY) / 2;
    camera.zoom = Math.max(
      0.001,
      Math.min(
        1.1,
        (width - 100) / (maxX - minX + 40),
        (height - 100) / (maxY - minY + 40),
      ),
    );
    camera.panX = 0;
    camera.panY = 0;
    dirty = true;
  }
  return {
    camera,
    setScene(next, refit = true) {
      scene = next;
      if (refit) fit();
      dirty = true;
    },
    select(id) {
      selected = id;
      dirty = true;
    },
    configure(v) {
      Object.assign(settings, v);
      dirty = true;
    },
    zoom,
    fit,
    setCamera(v) {
      Object.assign(camera, v);
      dirty = true;
    },
    destroy() {
      controller.abort();
      resize.disconnect();
      cancelAnimationFrame(frame);
    },
  };
}
