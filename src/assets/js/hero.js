/* РусРесурс — полутоновый портрет с «водяной» волной и плавным скроллом */
(function () {
  'use strict';

  const media = document.querySelector('.hero__media');
  const canvas = media && media.querySelector('[data-hero-canvas]');
  const img = media && media.querySelector('img');
  if (!media || !canvas || !img) return;

  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  // слабые устройства: меньше точек и ниже частота кадров
  const lowEnd = (navigator.hardwareConcurrency || 8) <= 3 || (navigator.deviceMemory || 8) <= 4;

  const BUCKETS = 4;
  const P = {
    cream: 'rgba(243, 239, 230, 0.8)',
    light: 'rgba(217, 154, 108, 0.76)',
    copper: 'rgba(200, 122, 67, 0.7)',
    deep: 'rgba(168, 90, 43, 0.58)',
  };
  const KEYS = ['cream', 'light', 'copper', 'deep'];

  const state = {
    W: 0, H: 0, dpr: 1,
    groups: null,
    visible: true,
    raf: 0,
    start: 0,
    lastFrame: 0,
    fps: lowEnd ? 1000 / 26 : 1000 / 32,
    slowFrames: 0,
    quality: lowEnd ? 0.62 : 1,
    pointer: { x: -9999, y: -9999 },
    pointerActive: false,
    flow: 0,
    flowVel: 0,
    lastScroll: 0,
    scanStart: -1,
    scanY: -1,
    lastScan: 0,
    revealed: false,
    time: 0,
    inView: true,
  };

  /* ---------- построение точек ---------- */
  function build() {
    const rect = media.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    // на телефоне не гонимся за плотностью: точек меньше, кадры стабильнее
    const dpr = Math.min(1.5, window.devicePixelRatio || 1);

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

    let dx; let dy; let dw; let dh;
    if (w > 760) {
      dw = w * 1.5;
      dh = (dw * ih) / iw;
      dx = 0;
      dy = (h - dh) * 0.26;
    } else {
      const s = Math.max(w / iw, h / ih);
      dw = iw * s;
      dh = ih * s;
      dx = (w - dw) * 0.55;
      dy = (h - dh) * 0.26;
    }
    octx.drawImage(img, dx, dy, dw, dh);

    let data;
    try {
      data = octx.getImageData(0, 0, w, h).data;
    } catch (e) {
      return false;
    }

    // бюджет точек: ~2400 на телефоне, ~4200 на десктопе
    const base = w < 760 ? 3000 : w < 1200 ? 3800 : 4600;
    const budget = Math.max(900, Math.round(base * state.quality));
    const spacing = Math.max(7, Math.sqrt((w * h) / budget));

    const groups = [];
    for (let i = 0; i < BUCKETS; i++) groups.push({ x: [], y: [], r: [], ph: [], delay: [], ox: [], oy: [] });

    const rowStep = spacing;
    const colStep = spacing;
    for (let y = rowStep * 0.55; y < h; y += rowStep) {
      for (let x = colStep * 0.55; x < w; x += colStep) {
        const ix = x | 0;
        const iy = y | 0;
        if (ix >= w) continue;
        if (iy >= h) continue;
        const p = (iy * w + ix) * 4;
        const lum = (0.2126 * data[p] + 0.7152 * data[p + 1] + 0.0722 * data[p + 2]) / 255;
        if (lum < 0.05) continue;

        const radius = Math.max(0.65, spacing * 0.5 * (0.2 + Math.pow(lum, 0.8) * 1.14));
        const b = lum > 0.62 ? 0 : lum > 0.4 ? 1 : lum > 0.22 ? 2 : 3;
        const g = groups[b];
        g.x.push(x);
        g.y.push(y);
        g.r.push(radius);
        g.ph.push(Math.random() * Math.PI * 2);
        g.delay.push(Math.random() * 0.45 + (x / w) * 0.45);
        g.ox.push((Math.random() * 2 - 1) * Math.min(150, w * 0.13));
        g.oy.push((Math.random() * 2 - 1) * Math.min(85, h * 0.12));
      }
    }

    state.groups = groups;
    canvas.dataset.dots = String(groups.reduce((s, g) => s + g.x.length, 0));
    canvas.dataset.budget = String(budget);
    canvas.dataset.quality = String(state.quality);
    return true;
  }

  /* ---------- кадр ---------- */
  function render(now) {
    const W = state.W;
    const H = state.H;
    if (!W || !H || !state.groups) return;

    const t = (now - state.start) / 1000;
    state.time = t;
    const intro = reduce ? 1 : Math.min(1, Math.max(0, t / 1.15));

    // затухание «волны» после скролла
    state.flow += (0 - state.flow) * 0.07;
    const flow = state.flow;

    const scanOn = !reduce;

    ctx.clearRect(0, 0, W, H);

    if (scanOn) {
      if (now - state.lastScan > 12000) {
        state.lastScan = now;
        state.scanStart = now;
      }
      if (state.scanStart > 0) {
        const p = (now - state.scanStart) / 3000;
        if (p >= 1) { state.scanStart = -1; state.scanY = -1; } else { state.scanY = p * H; }
      }
    }

    const pointerOn = state.pointerActive && canHover;
    const px = state.pointer.x;
    const py = state.pointer.y;

    for (let bi = 0; bi < BUCKETS; bi++) {
      const g = state.groups[bi];
      const n = g.x.length;
      if (!n) continue;

      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const x0 = g.x[i];
        const y0 = g.y[i];

        // появление: пружинка, с лёгким перелётом
        let e = 1;
        if (!reduce && !state.revealed) {
          const p = (t - g.delay[i]) / 0.85;
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

        // вода: две волны низкой частоты, амплитуда растёт при скролле
        const a = (1.2 + flow * 9) * intro;
        const w1 = Math.sin(x0 * 0.012 + t * 0.75 + g.ph[i]);
        const w2 = Math.sin(y0 * 0.017 - t * 0.55 + g.ph[i] * 0.7);
        let x = x0 + w1 * a * 0.55;
        let y = y0 + w2 * a;

        if (e < 1) {
          x += (1 - e) * g.ox[i];
          y += (1 - e) * g.oy[i];
        }

        let r = g.r[i] * intro * (0.4 + 0.6 * e);

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

        if (scanOn && state.scanStart > 0) {
          const band = Math.abs(y - state.scanY);
          if (band < 70) {
            const k = 1 - band / 70;
            r *= 1 + k * 0.7;
            x += (x < W / 2 ? -1 : 1) * k * 5;
          }
        }

        if (r < 0.25) continue;
        ctx.moveTo(x + r, y);
        ctx.arc(x, y, r, 0, 6.2831853);
      }
      ctx.fillStyle = P[KEYS[bi]];
      ctx.fill();
    }

    if (!reduce && !state.revealed && t > 2.1) state.revealed = true;

    if (scanOn && state.scanStart > 0 && state.scanY >= 0) {
      const grad = ctx.createLinearGradient(0, 0, W, 0);
      grad.addColorStop(0, 'rgba(200, 122, 67, 0)');
      grad.addColorStop(0.5, 'rgba(217, 154, 108, 0.65)');
      grad.addColorStop(1, 'rgba(200, 122, 67, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, state.scanY - 1, W, 2);
      ctx.globalAlpha = 0.1;
      ctx.fillRect(0, state.scanY - 26, W, 52);
      ctx.globalAlpha = 1;
    }
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

    // авто-деградация: если кадры стабильно тяжёлые — режем плотность точек
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

    media.classList.add('hero--canvas');
    state.start = performance.now();
    state.lastFrame = 0;
    state.lastScan = state.start;

    render(state.start);

    if (!reduce) {
      state.raf = requestAnimationFrame(frame);
    } else {
      // без движения — один статичный кадр, никаких циклов
      return;
    }

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        state.visible = entries[0].isIntersecting;
      }, { threshold: 0 });
      io.observe(media);
    }

    if (canHover) {
      media.addEventListener('pointermove', (e) => {
        const r = media.getBoundingClientRect();
        state.pointer.x = e.clientX - r.left;
        state.pointer.y = e.clientY - r.top;
        state.pointerActive = true;
      }, { passive: true });
      media.addEventListener('pointerleave', () => {
        state.pointerActive = false;
      }, { passive: true });
    }

    // «вода»: скорость скролла превращается в амплитуду волны
    let lastY = window.scrollY;
    let lastT = performance.now();
    window.addEventListener('scroll', () => {
      const now = performance.now();
      const y = window.scrollY;
      const dt = Math.max(16, now - lastT);
      const v = Math.abs(y - lastY) / dt; // px/ms
      lastY = y;
      lastT = now;
      if (v > 0.02) {
        state.flow = Math.min(1.15, state.flow + Math.min(0.55, v * 1.8));
      }
    }, { passive: true });

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





