/* РусРесурс — «Портрет в арке»: полутон, уровень воды, гребень, скан-линия */
(function () {
  'use strict';

  const porthole = document.querySelector('[data-porthole]');
  const canvas = porthole && porthole.querySelector('[data-hero-canvas]');
  const img = porthole && porthole.querySelector('img');
  if (!porthole || !canvas || !img) return;

  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const lowEnd = (navigator.hardwareConcurrency || 8) <= 3 || (navigator.deviceMemory || 8) <= 4;

  const BUCKETS = 4;
  const PAINTS = [
    'rgba(243, 239, 230, 0.8)',
    'rgba(217, 154, 108, 0.76)',
    'rgba(200, 122, 67, 0.7)',
    'rgba(168, 90, 43, 0.58)',
  ];
  const DEEP_PAINTS = [
    'rgba(217, 154, 108, 0.82)',
    'rgba(200, 122, 67, 0.8)',
    'rgba(168, 90, 43, 0.72)',
    'rgba(122, 58, 22, 0.68)',
  ];

  const state = {
    W: 0, H: 0, dpr: 1,
    groups: null,
    deepGroups: null,
    visible: true,
    raf: 0,
    start: 0,
    lastFrame: 0,
    fps: lowEnd ? 1000 / 26 : 1000 / 32,
    quality: lowEnd ? 0.66 : 1,
    slowFrames: 0,
    pointer: { x: -9999, y: -9999, on: false },
    scanStart: -1,
    lastScan: 0,
    revealed: false,
  };

  const mk = () => ({ x: [], y: [], r: [], ph: [], delay: [], ox: [], oy: [] });

  /* ---------- сборка точек ---------- */
  function build() {
    const rect = porthole.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    const dpr = Math.min(1.6, window.devicePixelRatio || 1);

    state.W = w;
    state.H = h;
    state.dpr = dpr;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const off = document.createElement('canvas');
    off.width = w;
    off.height = h;
    const octx = off.getContext('2d', { willReadFrequently: true });
    if (!octx) return false;

    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    if (!iw || !ih) return false;

    const s = Math.max(w / iw, h / ih);
    const dw = iw * s;
    const dh = ih * s;
    const dx = (w - dw) * 0.58;
    const dy = (h - dh) * 0.2;
    octx.drawImage(img, dx, dy, dw, dh);

    let data;
    try {
      data = octx.getImageData(0, 0, w, h).data;
    } catch (e) {
      return false;
    }

    const base = w < 500 ? 2600 : w < 760 ? 3000 : 4000;
    const budget = Math.max(1100, Math.round(base * state.quality));
    const spacing = Math.max(6.5, Math.sqrt((w * h) / budget));

    const dry = [mk(), mk(), mk(), mk()];
    const deep = [mk(), mk(), mk(), mk()];

    for (let y = spacing * 0.55; y < h; y += spacing) {
      for (let x = spacing * 0.55; x < w; x += spacing) {
        const ix = Math.min(w - 1, x | 0);
        const iy = Math.min(h - 1, y | 0);
        const p = (iy * w + ix) * 4;
        const lum = (0.2126 * data[p] + 0.7152 * data[p + 1] + 0.0722 * data[p + 2]) / 255;
        if (lum < 0.05) continue;

        const radius = Math.max(0.65, spacing * 0.5 * (0.2 + Math.pow(lum, 0.8) * 1.12));
        const b = lum > 0.62 ? 0 : lum > 0.4 ? 1 : lum > 0.22 ? 2 : 3;
        const under = y > h * 0.84;
        const g = (under ? deep : dry)[b];
        g.x.push(x);
        g.y.push(y);
        g.r.push(radius);
        g.ph.push(Math.random() * Math.PI * 2);
        g.delay.push(Math.random() * 0.45 + (x / w) * 0.45);
        g.ox.push((Math.random() * 2 - 1) * Math.min(150, w * 0.16));
        g.oy.push((Math.random() * 2 - 1) * Math.min(95, h * 0.13));
      }
    }

    state.groups = dry;
    state.deepGroups = deep;
    let total = 0;
    for (let i = 0; i < BUCKETS; i++) total += dry[i].x.length + deep[i].x.length;
    canvas.dataset.dots = String(total);
    return true;
  }

  /* ---------- отрисовка одной группы точек ---------- */
  function drawSet(g, paint, rMul, t, intro, amp, level, px, py, pointerOn, scanY) {
    const n = g.x.length;
    if (!n) return;

    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const x0 = g.x[i];
      const y0 = g.y[i];

      // появление с пружинкой
      let e = 1;
      if (!reduce && !state.revealed) {
        const p = (t - 0.25 - g.delay[i]) / 0.85;
        if (p <= 0) continue;
        if (p >= 1) {
          e = 1;
        } else {
          const c1 = 1.70158;
          const c3 = c1 + 1;
          const q = p - 1;
          e = 1 + c3 * q * q * q + c1 * q * q;
        }
      }
      if (e <= 0) continue;

      const w1 = Math.sin(x0 * 0.012 + t * 0.75 + g.ph[i]);
      const w2 = Math.sin(y0 * 0.017 - t * 0.55 + g.ph[i] * 0.7);
      let x = x0 + w1 * amp * 0.5;
      let y = y0 + w2 * amp;

      if (e < 1) {
        x += (1 - e) * g.ox[i];
        y += (1 - e) * g.oy[i];
      }

      let r = g.r[i] * intro * (0.4 + 0.6 * e) * rMul;

      if (pointerOn) {
        const ddx = x - px;
        const ddy = y - py;
        const dist = Math.sqrt(ddx * ddx + ddy * ddy);
        if (dist < 150 && dist > 0.01) {
          const k = 1 - dist / 150;
          x += (ddx / dist) * k * 9;
          y += (ddy / dist) * k * 7;
          r *= 1 + k * 0.32;
        }
      }

      if (scanY >= 0) {
        const band = Math.abs(y - scanY);
        if (band < 70) {
          const k = 1 - band / 70;
          r *= 1 + k * 0.7;
          x += (x < state.W / 2 ? -1 : 1) * k * 5;
        }
      }

      if (r < 0.25) continue;
      ctx.moveTo(x + r, y);
      ctx.arc(x, y, r, 0, 6.2831853);
    }
    ctx.fillStyle = paint;
    ctx.fill();
  }

  function nowScan(now) {
    if (state.scanStart <= 0) return -1;
    return (now - state.scanStart) / 3000;
  }

  /* ---------- кадр ---------- */
  function render(now) {
    const W = state.W;
    const H = state.H;
    if (!W || !H || !state.groups) return;

    const t = (now - state.start) / 1000;
    const flow = window.RRFlow && window.RRFlow.enabled ? window.RRFlow.vel : 0;
    const intro = reduce ? 1 : Math.min(1, Math.max(0, (t - 0.25) / 1.15));

    ctx.clearRect(0, 0, W, H);

    if (!reduce) {
      if (now - state.lastScan > 12000) {
        state.lastScan = now;
        state.scanStart = now;
      }
    }
    if (state.scanStart > 0 && (now - state.scanStart) / 3000 >= 1) {
      state.scanStart = -1;
    }

    const pointerOn = state.pointer.on && canHover;
    const px = state.pointer.x;
    const py = state.pointer.y;
    const amp = (1.1 + Math.min(1.2, Math.abs(flow)) * 7) * intro;
    const scanY = state.scanStart > 0 ? nowScan(now) * H : -1;

    // уровень воды: покачивается и приподнимается при скролле
    const level = H * 0.84
      + Math.sin(t * 0.55) * 5
      + Math.sin(t * 0.27 + 1.3) * 4
      - flow * 14;

    for (let bi = 0; bi < BUCKETS; bi++) {
      drawSet(state.groups[bi], PAINTS[bi], 1, t, intro, amp, level, px, py, pointerOn, scanY);
    }

    // толща воды: тёплый градиент ниже уровня
    if (level < H) {
      const top = Math.max(0, level);
      const grad = ctx.createLinearGradient(0, top, 0, H);
      grad.addColorStop(0, 'rgba(180, 99, 47, 0.12)');
      grad.addColorStop(1, 'rgba(140, 69, 32, 0.05)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, top, W, H - top);
    }

    // «под водой» точки наливаются медью и тяжелеют
    for (let bi = 0; bi < BUCKETS; bi++) {
      drawSet(state.deepGroups[bi], DEEP_PAINTS[bi], 1.22, t, intro, amp, level, px, py, pointerOn, scanY);
    }

    // гребень: светлая волна-линия
    if (level < H) {
      const top = Math.max(0, level);
      ctx.beginPath();
      for (let i = 0; i <= 34; i++) {
        const x = (i / 34) * W;
        const y = top + Math.sin(x * 0.02 + t * 1.4) * 3.2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = 'rgba(255, 238, 214, 0.55)';
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }

    if (!reduce && !state.revealed && t > 2.1) state.revealed = true;
  }

  function frame(now) {
    if (!state.visible || document.hidden) {
      state.raf = requestAnimationFrame(frame);
      return;
    }
    if (now - state.lastFrame < state.fps) {
      state.raf = requestAnimationFrame(frame);
      return;
    }
    const delta = now - state.lastFrame;
    state.lastFrame = now;
    render(now);

    if (state.quality > 0.45 && state.revealed) {
      if (delta > state.fps * 2.1) state.slowFrames += 1;
      else state.slowFrames = Math.max(0, state.slowFrames - 1);
      if (state.slowFrames > 45) {
        state.slowFrames = 0;
        state.quality = Math.max(0.45, state.quality - 0.25);
        build();
      }
    }

    state.raf = requestAnimationFrame(frame);
  }

  function start() {
    if (!img.naturalWidth) return;
    if (!build()) return;

    porthole.classList.add('hero--canvas');
    state.start = performance.now();
    state.lastFrame = 0;
    state.lastScan = state.start;

    render(state.start);

    if (reduce) return;

    state.raf = requestAnimationFrame(frame);

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        state.visible = entries[0].isIntersecting;
      }, { threshold: 0 });
      io.observe(porthole);
    }

    if (canHover) {
      porthole.addEventListener('pointermove', (e) => {
        const r = porthole.getBoundingClientRect();
        state.pointer.x = e.clientX - r.left;
        state.pointer.y = e.clientY - r.top;
        state.pointer.on = true;
      }, { passive: true });
      porthole.addEventListener('pointerleave', () => {
        state.pointer.on = false;
      }, { passive: true });
    }

    let timer = 0;
    window.addEventListener('resize', () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        state.revealed = true;
        build();
      }, 260);
    });
  }

  if (img.complete && img.naturalWidth) start();
  else img.addEventListener('load', start, { once: true });
})();


