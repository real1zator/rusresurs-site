/* РусРесурс — движение: параллакс изображений и «живые» счётчики секций */
(function () {
  'use strict';

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;

  /* ---------- мягкий параллакс фотографий ---------- */
  const media = Array.from(document.querySelectorAll(
    '.media-split__media img, .svc-row__media img, .case-card__media img, .post-card__media img, .article-cover img'
  ));

  if (media.length) {
    let ticking = false;
    const update = () => {
      ticking = false;
      const vh = window.innerHeight;
      // сначала читаем все размеры, потом пишем стили — без лишних reflow
      const shifts = media.map((img) => {
        const r = img.parentElement.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return null;
        const progress = (r.top + r.height / 2 - vh / 2) / vh;
        return Math.max(-14, Math.min(14, progress * -16));
      });
      shifts.forEach((shift, i) => {
        if (shift === null) return;
        media[i].style.transform = 'translate3d(0,' + shift.toFixed(2) + 'px,0) scale(1.06)';
      });
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
  }

  /* ---------- волна-швы покачиваются через flow.js ---------- */
  const nums = Array.from(document.querySelectorAll('.eyebrow__num, .step__num, .svc-row__num'));
  if (nums.length && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.animate(
          [
            { opacity: 0, transform: 'translateY(8px) scale(.92)' },
            { opacity: 1, transform: 'none' },
          ],
          { duration: 620, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both' }
        );
        io.unobserve(entry.target);
      });
    }, { threshold: 0.6 });
    nums.forEach((el) => io.observe(el));
  }

  /* ---------- курсор-«прожектор» на тёмных секциях ---------- */
  const darkSections = Array.from(document.querySelectorAll('.section--dark, .cta-band, .page-hero--dark'));
  darkSections.forEach((section) => {
    section.addEventListener('pointermove', (e) => {
      const r = section.getBoundingClientRect();
      section.style.setProperty('--px', ((e.clientX - r.left) / r.width) * 100 + '%');
      section.style.setProperty('--py', ((e.clientY - r.top) / r.height) * 100 + '%');
    }, { passive: true });
  });
})();


