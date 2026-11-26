/* РусРесурс — калькулятор смены */
(function () {
  'use strict';

  const fmt = (n) => new Intl.NumberFormat('ru-RU').format(Math.round(n)).replace(/\u00A0/g, ' ');
  const STORAGE = 'rr-calc-state';

  const readState = () => {
    try { return JSON.parse(sessionStorage.getItem(STORAGE) || 'null'); } catch (e) { return null; }
  };
  const saveState = (state) => {
    try { sessionStorage.setItem(STORAGE, JSON.stringify(state)); } catch (e) { /* noop */ }
  };

  document.querySelectorAll('[data-calc]').forEach((calc) => {
    const form = calc;
    const profession = form.querySelector('[name="profession"]');
    const people = form.querySelector('[name="people"]');
    const hours = form.querySelector('[name="hours"]');
    const shifts = form.querySelector('[name="shifts"]');
    const mode = form.querySelector('[name="mode"]');
    const totalEl = calc.querySelector('[data-calc-total]');
    const shiftEl = calc.querySelector('[data-calc-shift]');
    const personEl = calc.querySelector('[data-calc-person]');
    const hoursEl = calc.querySelector('[data-calc-hours]');
    const shiftsEl = calc.querySelector('[data-calc-shifts]');
    const orderBtn = calc.querySelector('[data-calc-order]');
    if (!profession || !people || !hours) return;

    const rate = () => {
      const opt = profession.options[profession.selectedIndex];
      return opt ? Number(opt.dataset.rate) || 400 : 400;
    };
    const factor = () => {
      if (!mode) return 1;
      const opt = mode.options[mode.selectedIndex];
      return opt ? Number(opt.dataset.factor) || 1 : 1;
    };
    const int = (el, def, min, max) => {
      const v = parseInt(el.value, 10);
      if (!Number.isFinite(v)) return def;
      return Math.max(min, Math.min(max, v));
    };

    const state = () => ({
      profession: profession.value,
      people: int(people, 1, 1, 500),
      hours: int(hours, 8, 4, 24),
      shifts: shifts ? int(shifts, 1, 1, 31) : 1,
      mode: mode ? mode.value : '',
    });

    const calcValues = () => {
      const s = state();
      const base = rate() * factor();
      const perShift = base * s.hours * s.people;
      const total = perShift * s.shifts;
      const rounded = Math.ceil(total / 100) * 100;
      return {
        ...s,
        rate: base,
        perShift: Math.ceil(perShift / 100) * 100,
        total: rounded,
        manHours: s.people * s.hours * s.shifts,
      };
    };

    const render = () => {
      const v = calcValues();
      if (totalEl) totalEl.innerHTML = 'от ' + fmt(v.total) + '&nbsp;₽';
      if (shiftEl) shiftEl.textContent = 'от ' + fmt(v.perShift) + ' ₽';
      if (personEl) personEl.textContent = fmt(v.rate) + ' ₽/час';
      if (hoursEl) hoursEl.textContent = fmt(v.manHours) + ' чел.-ч';
      if (shiftsEl) shiftsEl.textContent = v.shifts;
      saveState(v);
    };

    const restore = () => {
      const saved = readState();
      if (!saved) return;
      if (saved.profession) {
        const exists = Array.from(profession.options).some((o) => o.value === saved.profession);
        if (exists) profession.value = saved.profession;
      }
      if (saved.people) people.value = saved.people;
      if (saved.hours) hours.value = String(saved.hours);
      if (shifts && saved.shifts) shifts.value = saved.shifts;
      if (mode && saved.mode) mode.value = saved.mode;
    };
    restore();
    render();

    [profession, people, hours, shifts, mode].forEach((el) => {
      if (!el) return;
      el.addEventListener('input', render);
      el.addEventListener('change', render);
    });

    if (orderBtn) {
      orderBtn.addEventListener('click', () => {
        const v = calcValues();
        const label = profession.options[profession.selectedIndex]
          ? profession.options[profession.selectedIndex].text.split('—')[0].trim()
          : 'персонал';
        const modeLabel = mode ? mode.options[mode.selectedIndex].text : 'аутсорсинг';
        const comment = 'Расчёт: ' + v.people + ' чел.\n' + label + ', ' + v.hours + ' ч, ' + v.shifts + ' смен(а), ' + modeLabel + '. Ориентир — от ' + fmt(v.total) + ' ₽.';
        if (window.RR && window.RR.openOrder) {
          window.RR.openOrder({ profession: profession.value, people: v.people, comment: comment });
        }
      });
    }
  });
})();
