/* РусРесурс — микро-взаимодействия: плавная смена страниц, «пилюля» в нижней панели */
(function () {
  'use strict';

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- ползунок активной вкладки ---------- */
  const bar = document.querySelector('.tabbar');
  if (bar && !reduce) {
    const pill = document.createElement('span');
    pill.className = 'tabbar__pill';
    pill.setAttribute('aria-hidden', 'true');
    bar.appendChild(pill);

    const moveTo = (item, animate) => {
      if (!item) return;
      const br = bar.getBoundingClientRect();
      const ir = item.getBoundingClientRect();
      pill.style.transition = animate ? 'transform .42s cubic-bezier(.22,1,.36,1), width .42s cubic-bezier(.22,1,.36,1), opacity .3s' : 'none';
      pill.style.width = ir.width + 'px';
      pill.style.height = ir.height + 'px';
      pill.style.transform = 'translate(' + (ir.left - br.left - 6) + 'px,' + (ir.top - br.top - 6) + 'px)';
      pill.style.opacity = '1';
    };

    const current = bar.querySelector('[aria-current="page"]:not(.tabbar__item--cta)');
    requestAnimationFrame(() => moveTo(current, false));

    bar.querySelectorAll('.tabbar__item').forEach((item) => {
      item.addEventListener('click', (e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
        moveTo(item, true);
        if (item.classList.contains('tabbar__item--cta')) return;
        e.preventDefault();
        const href = item.getAttribute('href');
        setTimeout(() => { window.location.href = href; }, 190);
      });
      item.addEventListener('pointerdown', () => item.classList.add('is-press'), { passive: true });
      item.addEventListener('pointerup', () => item.classList.remove('is-press'), { passive: true });
      item.addEventListener('pointercancel', () => item.classList.remove('is-press'), { passive: true });
    });
  }

  /* ---------- «проявление» фотографий при появлении ---------- */
  const imgs = Array.from(document.querySelectorAll(
    '.svc-row__media img, .ind-tile img, .post-card__media img, .case-card__media img, .media-split__media img'
  ));
  if (imgs.length && 'IntersectionObserver' in window && !reduce) {
    imgs.forEach((img) => img.classList.add('img-reveal'));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-shown');
        io.unobserve(entry.target);
      });
    }, { threshold: 0.15 });
    imgs.forEach((img) => io.observe(img));
  }
})();

