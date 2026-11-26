/* РусРесурс — интерфейс */
(function () {
  'use strict';

  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- header ---------- */
  const head = $('[data-site-head]');
  let lastStuck = false;
  const onScroll = () => {
    if (!head) return;
    const stuck = window.scrollY > 12;
    if (stuck !== lastStuck) {
      head.classList.toggle('is-stuck', stuck);
      lastStuck = stuck;
    }
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- mobile nav (нижняя панель, шторка отключена) ---------- */
  const burger = $('[data-burger]');
  const backdrop = document.createElement('div');
  backdrop.className = 'nav-backdrop';
  backdrop.hidden = true;
  if (burger) {
    document.body.appendChild(backdrop);
    let navOpen = false;
    const nav = $('[data-nav]');
    const setNav = (open) => {
      navOpen = open;
      document.body.classList.toggle('nav-open', open);
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
      backdrop.hidden = !open;
      if (open && nav) {
        const first = nav.querySelector('.nav__link');
        if (first) setTimeout(() => first.focus({ preventScroll: true }), 120);
      }
    };
    burger.addEventListener('click', () => setNav(!navOpen));
    backdrop.addEventListener('click', () => setNav(false));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && navOpen) setNav(false);
    });
  }

  /* ---------- dropdowns ---------- */
  $$('[data-nav-toggle]').forEach((btn) => {
    const group = btn.closest('[data-nav-group]');
    btn.addEventListener('click', () => {
      const open = !group.classList.contains('is-open');
      $$('[data-nav-group]').forEach((g) => {
        g.classList.remove('is-open');
        const b = g.querySelector('[data-nav-toggle]');
        if (b) b.setAttribute('aria-expanded', 'false');
      });
      group.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', String(open));
    });
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('[data-nav-group]')) {
      $$('[data-nav-group]').forEach((g) => {
        g.classList.remove('is-open');
        const b = g.querySelector('[data-nav-toggle]');
        if (b) b.setAttribute('aria-expanded', 'false');
      });
    }
  });

  /* ---------- active nav ---------- */
  const current = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  const tabOf = {
    'services.html': 'services.html',
    'outsourcing.html': 'services.html',
    'outstaffing.html': 'services.html',
    'personnel.html': 'services.html',
    'industries.html': 'services.html',
    'prices.html': 'prices.html',
    'vacancies.html': 'vacancies.html',
    'contacts.html': 'contacts.html',
    'index.html': 'index.html',
  };
  const activeTab = tabOf[current] || (current.indexOf('blog-') === 0 ? '' : '');
  $$('[data-page]').forEach((a) => {
    if (a.dataset.page.toLowerCase() === current) a.setAttribute('aria-current', 'page');
  });
  if (activeTab) {
    const tab = $('.tabbar [data-page="' + activeTab + '"]');
    if (tab) tab.setAttribute('aria-current', 'page');
  }
  if (current.indexOf('blog-') === 0) {
    const blog = $('[data-page="blog.html"]');
    if (blog) blog.setAttribute('aria-current', 'page');
  }

  /* ---------- reveal ---------- */
  const revealItems = $$('[data-reveal]');
  const waveGrids = $$('.prof-grid, .post-grid, .case-grid, .card-grid');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' });
    revealItems.forEach((el) => io.observe(el));
    waveGrids.forEach((el) => io.observe(el));
  } else {
    revealItems.forEach((el) => el.classList.add('is-in'));
    waveGrids.forEach((el) => el.classList.add('is-in'));
  }

  /* ---------- counters ---------- */
  const fmt = (n) => new Intl.NumberFormat('ru-RU').format(n).replace(/\u00A0/g, ' ');
  const counters = $$('[data-count]');
  if (counters.length && !reduced) {
    const run = (el) => {
      const target = Number(el.dataset.count);
      const suffix = el.dataset.suffix || '';
      const dur = 1300;
      const start = performance.now();
      const tick = (now) => {
        const p = Math.min(1, (now - start) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = fmt(Math.round(target * eased)) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      };
      el.textContent = '0' + suffix;
      requestAnimationFrame(tick);
    };
    if ('IntersectionObserver' in window) {
      const co = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            run(entry.target);
            co.unobserve(entry.target);
          }
        });
      }, { threshold: 0.4 });
      counters.forEach((el) => co.observe(el));
    } else {
      counters.forEach(run);
    }
  }

  /* ---------- slider ---------- */
  $$('[data-slider]').forEach((slider) => {
    const track = $('[data-track]', slider);
    const prev = $('[data-prev]', slider);
    const next = $('[data-next]', slider);
    if (!track || !prev || !next) return;
    const step = () => {
      const card = track.querySelector('.rev-card');
      if (!card) return 320;
      const gap = parseFloat(getComputedStyle(track).columnGap || '16') || 16;
      return card.getBoundingClientRect().width + gap;
    };
    prev.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: reduced ? 'auto' : 'smooth' }));
    next.addEventListener('click', () => track.scrollBy({ left: step(), behavior: reduced ? 'auto' : 'smooth' }));
    const update = () => {
      const max = track.scrollWidth - track.clientWidth - 2;
      prev.disabled = track.scrollLeft <= 2;
      next.disabled = track.scrollLeft >= max;
    };
    track.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  });

  /* ---------- filters ---------- */
  $$('[data-filter-scope]').forEach((scope) => {
    const chips = $$('[data-filter]', scope);
    const items = $$('[data-item]', scope);
    const input = $('[data-search-input]', scope);
    const empty = $('[data-empty]', scope);
    let active = 'all';
    const apply = () => {
      const q = (input ? input.value : '').trim().toLowerCase();
      let visible = 0;
      items.forEach((item) => {
        const cat = item.dataset.cat || item.dataset.type || '';
        const okCat = active === 'all' || cat === active;
        const okSearch = !q || (item.dataset.search || item.textContent.toLowerCase()).indexOf(q) !== -1;
        const show = okCat && okSearch;
        item.hidden = !show;
        if (show) visible++;
      });
      if (empty) empty.classList.toggle('is-visible', visible === 0);
    };
    chips.forEach((chip) => chip.addEventListener('click', () => {
      chips.forEach((c) => c.classList.toggle('is-active', c === chip));
      active = chip.dataset.filter;
      apply();
    }));
    if (input) input.addEventListener('input', apply);
    apply();
  });

  /* ---------- accordions ---------- */
  const accs = $$('.acc');
  accs.forEach((acc) => {
    acc.addEventListener('toggle', () => {
      if (acc.open && !reduced) {
        // закрываем соседние только внутри одной группы вопросов
      }
    });
  });

  /* ---------- modal + forms ---------- */
  const modal = $('#order-modal');
  const form = modal && $('form[data-form="order"]', modal);
  const success = modal && $('[data-success]', modal);
  const titleEl = modal && $('[data-modal-title]', modal);
  const kickerEl = modal && $('[data-modal-kicker]', modal);
  const leadEl = modal && $('[data-modal-lead]', modal);
  const lastFocus = { el: null };

  const fieldWraps = modal ? $$('[data-field]', modal) : [];
  const setFieldVisible = (name, visible) => {
    fieldWraps.forEach((w) => { if (w.dataset.field === name) w.hidden = !visible; });
  };

  function openOrder(opts) {
    if (!modal) return;
    opts = opts || {};
    lastFocus.el = document.activeElement;
    if (form) {
      form.hidden = false;
      form.reset();
      form.dataset.mode = opts.mode || 'order';
      $$('.field', form).forEach((f) => f.classList.remove('has-error'));
    }
    if (success) success.hidden = true;
    const banner = $('[data-order-summary]', modal);
    if (banner) banner.remove();

    if (opts.mode === 'vacancy') {
      if (titleEl) titleEl.textContent = 'Отклик на вакансию';
      if (kickerEl) kickerEl.textContent = 'Работа в «РусРесурс»';
      if (leadEl) leadEl.textContent = 'Перезвоним, уточним опыт и график, пригласим на оформление.';
      setFieldVisible('company', false);
      setFieldVisible('profession', false);
      setFieldVisible('people', false);
      const summary = document.createElement('p');
      summary.className = 'note';
      summary.dataset.orderSummary = '';
      summary.textContent = 'Вакансия: ' + (opts.vacancy || '') + (opts.salary ? ' · ' + opts.salary + ' ₽ за смену' : '');
      const fields = $('.form', modal);
      if (fields) fields.parentNode.insertBefore(summary, fields);
      if (form) {
        const comment = form.elements.comment;
        if (comment) comment.value = '';
      }
    } else {
      if (titleEl) titleEl.textContent = opts.title || 'Рассчитаем смену и перезвоним';
      if (kickerEl) kickerEl.textContent = 'Заявка на персонал';
      if (leadEl) leadEl.textContent = 'Ответим в рабочее время, в течение 15 минут. Если смена нужна срочно — позвоните: +7 (4012) 00-00-00.';
      setFieldVisible('company', true);
      setFieldVisible('profession', true);
      setFieldVisible('people', true);
      if (form) {
        if (opts.profession) {
          const sel = form.elements.profession;
          if (sel) {
            const opt = Array.from(sel.options).find((o) => o.value === opts.profession);
            if (opt) sel.value = opts.profession;
          }
        }
        if (opts.people) form.elements.people.value = opts.people;
        if (opts.comment) form.elements.comment.value = opts.comment;
      }
    }

    if (typeof modal.showModal === 'function') modal.showModal();
    else modal.setAttribute('open', '');
    document.body.classList.add('modal-open');
    const firstInput = form && form.querySelector('input[name="name"]');
    if (firstInput) setTimeout(() => firstInput.focus({ preventScroll: true }), 80);
  }

  function closeOrder() {
    if (!modal) return;
    if (typeof modal.close === 'function') modal.close();
    else modal.removeAttribute('open');
    document.body.classList.remove('modal-open');
    if (lastFocus.el && lastFocus.el.focus) lastFocus.el.focus({ preventScroll: true });
  }

  window.RR = { openOrder: openOrder, closeOrder: closeOrder };

  if (modal) {
    $$('[data-close]', modal).forEach((btn) => btn.addEventListener('click', closeOrder));
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeOrder();
    });
    modal.addEventListener('close', () => document.body.classList.remove('modal-open'));
    modal.addEventListener('cancel', () => document.body.classList.remove('modal-open'));
  }

  $$('[data-order]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openOrder({ profession: btn.dataset.profession || '' });
    });
  });
  $$('[data-vacancy]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openOrder({ mode: 'vacancy', vacancy: btn.dataset.vacancy, salary: btn.dataset.salary });
    });
  });
  $$('[data-open-order]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openOrder({ title: btn.dataset.title || '', comment: btn.dataset.comment || '' });
    });
  });

  /* phone mask */
  const maskPhone = (value) => {
    let d = value.replace(/\D/g, '');
    if (d.startsWith('8')) d = '7' + d.slice(1);
    if (!d.startsWith('7')) d = '7' + d;
    d = d.slice(0, 11);
    let out = '+7';
    if (d.length > 1) out += ' (' + d.slice(1, 4);
    if (d.length >= 5) out += ') ' + d.slice(4, 7);
    if (d.length >= 8) out += '-' + d.slice(7, 9);
    if (d.length >= 10) out += '-' + d.slice(9, 11);
    return out;
  };
  $$('input[type="tel"]').forEach((input) => {
    input.addEventListener('input', () => {
      input.value = maskPhone(input.value);
    });
    input.addEventListener('focus', () => {
      if (!input.value) input.value = '+7 (';
    });
  });

  /* validation + submit */
  const setError = (field, on) => {
    const wrap = field.closest('.field');
    if (wrap) wrap.classList.toggle('has-error', on);
  };

  const bindOrderForm = (f) => {
    const scope = f.closest('.modal__box') || f.parentElement;
    const successEl = scope ? scope.querySelector('[data-success]') : null;
    const summaryEl = scope ? scope.querySelector('[data-success-text]') : null;

    f.addEventListener('submit', (e) => {
      e.preventDefault();
      let ok = true;
      const name = f.elements.name;
      const phone = f.elements.phone;
      const consent = f.elements.consent;

      if (!name || !name.value.trim() || name.value.trim().length < 2) { if (name) setError(name, true); ok = false; } else setError(name, false);
      const digits = phone ? phone.value.replace(/\D/g, '') : '';
      if (digits.length < 11) { if (phone) setError(phone, true); ok = false; } else setError(phone, false);
      if (consent && !consent.checked) {
        consent.closest('.check').classList.add('has-error');
        ok = false;
      } else if (consent) {
        consent.closest('.check').classList.remove('has-error');
      }

      const firstInvalid = $('.field.has-error .field__input', f);
      if (firstInvalid) firstInvalid.focus({ preventScroll: true });
      if (!ok) return;

      const mode = f.dataset.mode || 'order';
      if (summaryEl) {
        summaryEl.textContent = mode === 'vacancy'
          ? 'Перезвоним в рабочее время, уточним опыт и пригласим на оформление.'
          : 'Перезвоним в рабочее время и уточним детали: объект, график и дату старта.';
      }
      f.hidden = true;
      if (successEl) {
        successEl.hidden = false;
        successEl.scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' });
      }
    });

    f.addEventListener('input', (e) => {
      const field = e.target.closest('.field');
      if (field) field.classList.remove('has-error');
      const check = e.target.closest('.check');
      if (check) check.classList.remove('has-error');
    });
  };

  $$('form[data-form="order"]').forEach(bindOrderForm);

  /* ---------- TOC ---------- */
  const articleBody = $('.article-body');
  const tocBox = $('[data-toc]');
  if (articleBody && tocBox) {
    const heads = $$('h2', articleBody);
    const list = $('ol', tocBox);
    if (heads.length && list) {
      heads.forEach((h, i) => {
        if (!h.id) h.id = 'razdel-' + (i + 1);
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = '#' + h.id;
        a.textContent = h.textContent;
        li.appendChild(a);
        list.appendChild(li);
      });
      const links = $$('a', list);
      if ('IntersectionObserver' in window) {
        const map = new Map();
        heads.forEach((h) => map.set(h, links[heads.indexOf(h)]));
        const to = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              links.forEach((l) => l.classList.remove('is-active'));
              const link = map.get(entry.target);
              if (link) link.classList.add('is-active');
            }
          });
        }, { rootMargin: '-20% 0px -70% 0px' });
        heads.forEach((h) => to.observe(h));
      }
    } else {
      tocBox.hidden = true;
    }
  }

  /* ---------- прогресс чтения ---------- */
  const progressBar = $('[data-progress]');
  if (progressBar) {
    let raf = 0;
    const updateProgress = () => {
      raf = 0;
      const h = document.documentElement.scrollHeight - window.innerHeight;
      const p = h > 0 ? Math.min(1, Math.max(0, window.scrollY / h)) : 0;
      progressBar.style.width = (p * 100).toFixed(2) + '%';
    };
    window.addEventListener('scroll', () => {
      if (!raf) raf = requestAnimationFrame(updateProgress);
    }, { passive: true });
    window.addEventListener('resize', updateProgress);
    updateProgress();
  }

  /* ---------- подсветка под курсором ---------- */
  const spotTargets = $$('.prof-card, .vac-card, .doc-card, .scenario, .mini-card, .rev-card, .case-card, .post-card, .svc-row');
  spotTargets.forEach((el) => {
    el.classList.add('spot');
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', ((e.clientX - r.left) / r.width) * 100 + '%');
      el.style.setProperty('--my', ((e.clientY - r.top) / r.height) * 100 + '%');
    }, { passive: true });
  });

  /* ---------- лёгкое магнитное притяжение кнопок ---------- */
  if (!reduced && window.matchMedia('(hover: hover)').matches) {
    $$('.btn--copper').forEach((btn) => {
      btn.addEventListener('pointermove', (e) => {
        const r = btn.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
        const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
        btn.style.transform = 'translate(' + (dx * 4).toFixed(2) + 'px,' + (dy * 3 - 2).toFixed(2) + 'px)';
      }, { passive: true });
      btn.addEventListener('pointerleave', () => { btn.style.transform = ''; });
    });
  }

  /* ---------- бегущая строка: гарантируем бесшовность ---------- */
  $$('[data-ticker]').forEach((track) => {
    const rows = $$('.ticker__row', track);
    if (rows.length === 2) {
      const width = rows[0].offsetWidth;
      track.style.setProperty('--ticker-w', width + 'px');
    }
  });

  /* ---------- misc ---------- */
  $$('.table-wrap').forEach((el) => {
    el.tabIndex = 0;
    el.setAttribute('role', 'region');
    el.setAttribute('aria-label', 'Таблица, прокручивается по горизонтали');
  });
  $$('.article-body table').forEach((table) => {
    const wrap = document.createElement('div');
    wrap.className = 'table-scroll';
    wrap.tabIndex = 0;
    wrap.setAttribute('role', 'region');
    wrap.setAttribute('aria-label', 'Таблица, прокручивается по горизонтали');
    table.parentNode.insertBefore(wrap, table);
    wrap.appendChild(table);
  });

  $$('[data-now]').forEach((el) => { el.textContent = new Date().toLocaleDateString('ru-RU'); });
})();
