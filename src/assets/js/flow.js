/* РусРесурс — «Течение»: общий пульс скролла (скорость, инерция) для всех эффектов */
(function () {
  'use strict';

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) {
    window.RRFlow = { vel: 0, smooth: window.scrollY, enabled: false };
    return;
  }

  const seams = Array.from(document.querySelectorAll('.wave-seam'));
  const floats = Array.from(document.querySelectorAll('[data-float]')).map((el) => ({
    el,
    speed: parseFloat(el.dataset.float) || 0.18,
    section: el.closest('section') || el.parentElement,
  }));

  let smooth = window.scrollY;
  let vel = 0;
  let lastY = window.scrollY;
  let lastT = performance.now();
  let raf = 0;
  let started = false;
  let writes = 0;

  function frame(now) {
    raf = requestAnimationFrame(frame);

    const y = window.scrollY;
    const dt = Math.min(64, now - lastT) || 16;
    lastT = now;

    // инерция: плавное «догоняние» позиции скролла
    smooth += (y - smooth) * 0.14;

    // скорость: мгновенная → сглаженная
    const inst = (y - lastY) / dt;
    lastY = y;
    const target = Math.max(-1.8, Math.min(1.8, inst * 0.9));
    vel += (target - vel) * 0.09;
    if (Math.abs(vel) < 0.001) vel = 0;

    // стили пишем редко: покой ≈ 6 раз в секунду, движение — каждый кадр
    const active = Math.abs(vel) > 0.02 || Math.abs(y - smooth) > 1;
    writes += 1;
    if (!active && writes % 6 !== 0) return;
    if (active && writes % 2 !== 0) return;

    const t = now / 1000;

    for (let i = 0; i < seams.length; i++) {
      const el = seams[i];
      const bob = vel * -8 + Math.sin(t * 0.8 + i * 1.7) * 1.5;
      el.style.setProperty('--wave-bob', bob.toFixed(2) + 'px');
    }

    const vh = window.innerHeight;
    for (let i = 0; i < floats.length; i++) {
      const f = floats[i];
      if (!f.section) continue;
      const r = f.section.getBoundingClientRect();
      if (r.bottom < -120 || r.top > vh + 120) continue;
      const ty = Math.max(-42, Math.min(42, r.top * f.speed * -1));
      f.el.style.transform = 'translate3d(0,' + ty.toFixed(1) + 'px,0)';
    }
  }

  function start() {
    if (started) return;
    started = true;
    raf = requestAnimationFrame(frame);
  }
  document.addEventListener('scroll', start, { passive: true });
  start();

  window.RRFlow = {
    get vel() { return vel; },
    get smooth() { return smooth; },
    enabled: true,
  };
})();
