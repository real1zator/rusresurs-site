/* РусРесурс — живой портрет в первом экране: печатный полутон, который собирается и реагирует на курсор */
(function () {
  'use strict';

  const media = document.querySelector('.hero__media');
  const canvas = media && media.querySelector('[data-hero-canvas]');
  const img = media && media.querySelector('img');
  if (!media || !canvas || !img) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const state = {
    W: 0, H: 0, dpr: 1,
    dots: [],
    off: null,
    visible: true,
    raf: 0,
    last: 0,
    start: 0,
    revealed: false,
    lastScan: 0,
    scanStart: -1,
    scanY: -1,
    pointer: { x: -9999, y: -9999 },
  };

  const rand = (a, b) => a + Math.random() * (b - a);

  function photoRect(w, h) {
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    if (!iw || !ih) return null;

    if (window.innerWidth > 760) {
      // тот же кроп, что был у фотографии в CSS: 150% ширины, фокус по вертикали 26%
      const dw = w * 1.5;
      const dh = (dw * ih) / iw;
      return { dx: 0, dy: (h - dh) * 0.26, dw, dh };
    }

    const s = Math.max(w / iw, h / ih);
    const dw = iw * s;
    const dh = ih * s;
    return { dx: (w - dw) * 0.55, dy: (h - dh) * 0.26, dw, dh };
  }

  function drawPhoto(target, w, h) {
    const r = photoRect(w, h);
    if (!r) return;
    target.drawImage(img, r.dx, r.dy, r.dw, r.dh);
  }

  function build() {
    const rect = media.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    const dpr = Math.min(2, window.devicePixelRatio || 1);

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
    drawPhoto(octx, w, h);

    let data;
    try {
      data = octx.getImageData(0, 0, w, h).data;
    } catch (e) {
      return false; // file:// и другие случаи, когда canvas нельзя читать
    }

    const spacing = w > 1100 ? 13 : w > 600 ? 11 : 9;
    const dots = [];

    for (let y = spacing * 0.55; y < h; y += spacing) {
      for (let x = spacing * 0.55; x < w; x += spacing) {
        const ix = Math.min(w - 1, Math.max(0, Math.floor(x)));
        const iy = Math.min(h - 1, Math.max(0, Math.floor(y)));
        const p = (iy * w + ix) * 4;
        const lum = (0.2126 * data[p] + 0.7152 * data[p + 1] + 0.0722 * data[p + 2]) / 255;
        if (lum < 0.055) continue;

        const r = Math.max(0.55, spacing * 0.48 * (0.16 + Math.pow(lum, 0.8) * 0.9));
        dots.push({
          x, y, r, lum,
          phase: rand(0, Math.PI * 2),
          delay: rand(0, 0.55) + (x / w) * 0.4,
          ox: rand(-1, 1) * Math.min(170, w * 0.14),
          oy: rand(-1, 1) * Math.min(95, h * 0.13),
        });
      }
    }

    state.off = off;
    state.dots = dots;
    canvas.dataset.dots = String(dots.length);
    return true;
  }

  function render(now) {
    const W = state.W;
    const H = state.H;
    if (!W || !H || !state.off) return;

    const life = (now - state.start) / 1000;
    const intro = reduce ? 1 : Math.min(1, Math.max(0, life / 1.1));
    const t = now / 1000;

    ctx.clearRect(0, 0, W, H);
    ctx.globalAlpha = intro;
    ctx.drawImage(state.off, 0, 0, W, H);
    ctx.globalAlpha = 1;

    if (!reduce) {
      if (now - state.lastScan > 10500) {
        state.lastScan = now;
        state.scanStart = now;
      }
      if (state.scanStart > 0) {
        const p = (now - state.scanStart) / 2800;
        if (p >= 1) {
          state.scanStart = -1;
          state.scanY = -1;
        } else {
          state.scanY = p * H;
        }
      }
    }

    const buckets = { cream: [], light: [], copper: [], deep: [] };

    for (let i = 0; i < state.dots.length; i++) {
      const d = state.dots[i];
      let e = 1;
      if (!reduce && !state.revealed) {
        const p = Math.min(1, Math.max(0, (life - d.delay) / 1.25));
        e = 1 - Math.pow(1 - p, 3);
        if (p >= 1 && life > 2.6) state.revealed = true;
      }

      let x = d.x + (1 - e) * d.ox;
      let y = d.y + (1 - e) * d.oy;
      let r = d.r * (0.35 + 0.65 * e);

      if (!reduce) {
        x += Math.sin(t * 0.55 + d.phase) * 1.1;
        y += Math.cos(t * 0.47 + d.phase) * 0.9;

        const dx = x - state.pointer.x;
        const dy = y - state.pointer.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 170 && dist > 0.001) {
          const k = 1 - dist / 170;
          x += (dx / dist) * k * 9;
          y += (dy / dist) * k * 7;
        }

        if (state.scanStart > 0 && state.scanY >= 0) {
          const band = Math.abs(y - state.scanY);
          if (band < 90) {
            const k = 1 - band / 90;
            r *= 1 + k * 0.85;
            x += (x < W / 2 ? -1 : 1) * k * 6;
          }
        }
      }

      const col = d.lum > 0.62 ? 'cream' : d.lum > 0.4 ? 'light' : d.lum > 0.22 ? 'copper' : 'deep';
      buckets[col].push([x, y, r]);
    }

    const paints = {
      cream: 'rgba(243, 239, 230, 0.52)',
      light: 'rgba(217, 154, 108, 0.5)',
      copper: 'rgba(200, 122, 67, 0.45)',
      deep: 'rgba(168, 90, 43, 0.36)',
    };

    ctx.globalCompositeOperation = 'screen';
    for (const key of Object.keys(buckets)) {
      const list = buckets[key];
      if (!list.length) continue;
      ctx.beginPath();
      for (let i = 0; i < list.length; i++) {
        const [x, y, r] = list[i];
        ctx.moveTo(x + r, y);
        ctx.arc(x, y, r, 0, Math.PI * 2);
      }
      ctx.fillStyle = paints[key];
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';

    if (state.scanStart > 0 && state.scanY >= 0) {
      const grad = ctx.createLinearGradient(0, 0, W, 0);
      grad.addColorStop(0, 'rgba(200, 122, 67, 0)');
      grad.addColorStop(0.5, 'rgba(217, 154, 108, 0.7)');
      grad.addColorStop(1, 'rgba(200, 122, 67, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, state.scanY - 1, W, 2);
      ctx.globalAlpha = 0.12;
      ctx.fillRect(0, state.scanY - 30, W, 60);
      ctx.globalAlpha = 1;
    }
  }

  function frame(now) {
    state.raf = requestAnimationFrame(frame);
    if (!state.visible || document.hidden) return;
    if (now - state.last < 33) return;
    state.last = now;
    render(now);
  }

  function start() {
    if (!img.naturalWidth) return;
    state.start = performance.now();
    state.last = 0;
    state.lastScan = state.start;
    if (!build()) return;

    media.classList.add('hero--canvas');
    render(state.start);

    if (!reduce) {
      state.raf = requestAnimationFrame(frame);
    }

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        state.visible = entries[0].isIntersecting;
      }, { threshold: 0 });
      io.observe(media);
    }

    media.addEventListener('pointermove', (e) => {
      const r = media.getBoundingClientRect();
      state.pointer.x = e.clientX - r.left;
      state.pointer.y = e.clientY - r.top;
    }, { passive: true });

    media.addEventListener('pointerleave', () => {
      state.pointer.x = -9999;
      state.pointer.y = -9999;
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

  if (img.complete && img.naturalWidth) {
    start();
  } else {
    img.addEventListener('load', start, { once: true });
  }
})();
