import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(root, 'src');
const dist = path.join(root, 'dist');

const readJSON = (p) => JSON.parse(fs.readFileSync(path.join(src, 'data', p), 'utf8').replace(/^\uFEFF/, ''));
const site = readJSON('site.json');
const professions = readJSON('professions.json');
const industries = readJSON('industries.json');
const cases = readJSON('cases.json');
const reviews = readJSON('reviews.json');
const faq = readJSON('faq.json');
const vacancies = readJSON('vacancies.json');
const articles = readJSON('articles.json');

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');
const num = (n) => Number(n).toLocaleString('ru-RU').replace(/\u00A0/g, ' ');
const read = (p) => fs.readFileSync(path.join(src, p), 'utf8').replace(/^\uFEFF/, '');
const money = (n) => num(Math.round(n / 10) * 10);

/* ---------- renderers ---------- */

const professionCard = (p) => `
<article class="prof-card" data-item data-cat="${p.cat}" data-search="${esc((p.name + ' ' + p.desc + ' ' + p.tags.join(' ')).toLowerCase())}">
  <div class="prof-card__head">
    <h3 class="prof-card__name">${esc(p.name)}</h3>
    <p class="prof-card__rate"><span>от</span> ${num(p.rate)}&nbsp;₽<small>/час</small></p>
  </div>
  <p class="prof-card__desc">${esc(p.desc)}</p>
  <ul class="tags" aria-label="Особенности">${p.tags.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
  <div class="prof-card__foot">
    <span class="prof-card__min">${esc(p.min)}</span>
    <button class="link-more" type="button" data-order data-profession="${esc(p.name)}">Заказать</button>
  </div>
</article>`;

const professionsGrid = (list) => list.map(professionCard).join('\n');

const professionOptions = (list) => list
  .map((p) => `<option value="${esc(p.name)}" data-rate="${p.rate}">${esc(p.name)} — от ${num(p.rate)} ₽/час</option>`)
  .join('\n');

const ratesTable = () => `
<div class="table-wrap">
<table class="table rates-table">
  <caption class="visually-hidden">Ориентировочные ставки на рабочий персонал</caption>
  <thead>
    <tr><th scope="col">Профессия</th><th scope="col">Ставка, ₽/час</th><th scope="col">Смена 8 ч</th><th scope="col">Смена 12 ч</th><th scope="col">Минимальный заказ</th></tr>
  </thead>
  <tbody>
    ${professions.map((p) => `<tr>
      <th scope="row">${esc(p.name)}<span class="table__cat">${esc(p.catLabel)}</span></th>
      <td class="num">от ${num(p.rate)}</td>
      <td class="num">от ${money(p.rate * 8)}</td>
      <td class="num">от ${money(p.rate * 12)}</td>
      <td>${esc(p.min)}</td>
    </tr>`).join('\n')}
  </tbody>
</table>
</div>`;

const industryTile = (it, i) => `
<a class="ind-tile ${i < 2 ? 'ind-tile--wide' : ''}" href="industries.html#${it.id}">
  <img src="assets/img/${it.img}" alt="${esc(it.title)}" loading="lazy" decoding="async">
  <span class="ind-tile__shade"></span>
  <span class="ind-tile__body">
    <span class="ind-tile__kicker">${esc(it.kicker)}</span>
    <span class="ind-tile__title">${esc(it.title)}</span>
    <span class="ind-tile__more">Смотреть задачи</span>
  </span>
</a>`;

const industriesGrid = () => industries.map(industryTile).join('\n');

const caseCard = (c) => `
<article class="case-card">
  <figure class="case-card__media">
    <img src="assets/img/${c.img}" alt="${esc(c.title)}" loading="lazy" decoding="async">
    <span class="case-card__period">${esc(c.period)}</span>
  </figure>
  <div class="case-card__body">
    <p class="case-card__metric"><span class="case-card__num">${esc(c.metric)}</span><span class="case-card__label">${esc(c.metricLabel)}</span></p>
    <h3 class="case-card__title">${esc(c.title)}</h3>
    <p class="case-card__text">${esc(c.text)}</p>
    <ul class="tags tags--light">${c.tags.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
  </div>
</article>`;

const casesGrid = (n) => cases.slice(0, n).map(caseCard).join('\n');

const reviewCard = (r) => `
<article class="rev-card" role="group" aria-label="Отзыв">
  <blockquote class="rev-card__quote">«${esc(r.quote)}»</blockquote>
  <footer class="rev-card__author">
    <span class="rev-card__name">${esc(r.author)}</span>
    <span class="rev-card__role">${esc(r.role)}</span>
    <span class="rev-card__note">${esc(r.note)}</span>
  </footer>
</article>`;

const reviewsSlider = () => reviews.map(reviewCard).join('\n');

const faqItem = (item) => `
<details class="acc">
  <summary class="acc__btn">
    <span>${esc(item.q)}</span>
    <span class="acc__icon" aria-hidden="true"></span>
  </summary>
  <div class="acc__panel"><p>${esc(item.a)}</p></div>
</details>`;

const faqHome = () => {
  const flat = faq.flatMap((g) => g.items).slice(0, 5);
  return flat.map(faqItem).join('\n');
};

const faqFull = () => faq.map((g, gi) => `
<div class="faq-group" id="faq-${gi + 1}">
  <h3 class="faq-group__title">${esc(g.group)}</h3>
  ${g.items.map((it, i) => faqItem(it, g.group + i)).join('\n')}
</div>`).join('\n');

const faqNav = () => faq.map((g, i) => `<a href="#faq-${i + 1}">${esc(g.group)}</a>`).join('\n');

const vacancyCard = (v) => `
<article class="vac-card" data-item data-type="${esc(v.type)}" data-search="${esc((v.title + ' ' + v.city + ' ' + v.category + ' ' + v.type + ' ' + v.requirements).toLowerCase())}">
  <div class="vac-card__head">
    <div>
      <p class="vac-card__cat">${esc(v.category)}</p>
      <h3 class="vac-card__title">${esc(v.title)}</h3>
    </div>
    ${v.hot ? '<span class="badge">Срочно</span>' : ''}
  </div>
  <dl class="vac-card__meta">
    <div><dt>Оплата</dt><dd>${esc(v.salary)} ₽ / ${esc(v.unit)}</dd></div>
    <div><dt>График</dt><dd>${esc(v.schedule)}</dd></div>
    <div><dt>Город</dt><dd>${esc(v.city)}</dd></div>
  </dl>
  <p class="vac-card__req">${esc(v.requirements)}</p>
  <div class="vac-card__foot">
    <span class="vac-card__type">${esc(v.type)}</span>
    <button class="btn btn--sm btn--ghost" type="button" data-vacancy="${esc(v.title)}" data-salary="${esc(v.salary)}">Откликнуться</button>
  </div>
</article>`;

const vacanciesList = () => vacancies.map(vacancyCard).join('\n');

const blogCard = (a, featured = false) => `
<article class="post-card${featured ? ' post-card--featured' : ''}" data-item data-cat="${esc(a.category)}" data-search="${esc((a.title + ' ' + a.excerpt + ' ' + a.category).toLowerCase())}">
  <a class="post-card__link" href="blog-${a.slug}.html">
    <figure class="post-card__media">
      <img src="assets/img/${a.cover}" alt="${esc(a.coverAlt)}" loading="lazy" decoding="async">
    </figure>
    <div class="post-card__body">
      <p class="post-card__meta"><span>${esc(a.category)}</span><time datetime="${a.date}">${esc(a.dateLabel)}</time><span>${esc(a.read)}</span></p>
      <h3 class="post-card__title">${esc(a.title)}</h3>
      <p class="post-card__excerpt">${esc(a.excerpt)}</p>
      <span class="post-card__more">Читать</span>
    </div>
  </a>
</article>`;

const blogCards = (n, featured = false) => articles.slice(0, n).map((a, i) => blogCard(a, featured && i === 0)).join('\n');

const filters = (items, labelAll = 'Все') => `
<div class="filters" data-filters>
  <button class="chip is-active" type="button" data-filter="all">${labelAll}</button>
  ${items.map((it) => `<button class="chip" type="button" data-filter="${esc(it.id)}">${esc(it.label)}</button>`).join('')}
</div>`;

const professionFilters = () => {
  const cats = [...new Map(professions.map((p) => [p.cat, p.catLabel])).entries()]
    .map(([id, label]) => ({ id, label }));
  return filters(cats);
};

const vacancyFilters = () => filters([
  { id: 'Постоянная', label: 'Постоянная' },
  { id: 'Смены', label: 'Смены' },
  { id: 'Сезон', label: 'Сезон' },
], 'Все вакансии');

const blogFilters = () => {
  const cats = [...new Set(articles.map((a) => a.category))].map((c) => ({ id: c, label: c }));
  return filters(cats, 'Все статьи');
};

const orderModal = () => `
<dialog class="modal" id="order-modal" aria-labelledby="order-modal-title">
  <div class="modal__box">
    <button class="modal__close" type="button" data-close aria-label="Закрыть">
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M1 1l16 16M17 1L1 17" stroke="currentColor" stroke-width="1.5"/></svg>
    </button>
    <p class="modal__kicker" data-modal-kicker>Заявка на персонал</p>
    <h2 class="modal__title" id="order-modal-title" data-modal-title>Рассчитаем смену и перезвоним</h2>
    <p class="modal__lead" data-modal-lead>Ответим в рабочее время, в течение 15 минут. Если смена нужна срочно — позвоните: ${site.phoneDisplay}.</p>
    <form class="form" data-form="order" novalidate>
      <div class="form__row form__row--2">
        <label class="field">
          <span class="field__label">Ваше имя</span>
          <input class="field__input" type="text" name="name" autocomplete="name" placeholder="Как к вам обращаться" required>
          <span class="field__error">Напишите имя</span>
        </label>
        <label class="field">
          <span class="field__label">Телефон</span>
          <input class="field__input" type="tel" name="phone" autocomplete="tel" placeholder="+7 (___) ___-__-__" required>
          <span class="field__error">Введите телефон полностью</span>
        </label>
      </div>
      <div class="form__row form__row--2" data-field="company">
        <label class="field">
          <span class="field__label">Компания</span>
          <input class="field__input" type="text" name="company" autocomplete="organization" placeholder="Название или «частное лицо»">
        </label>
        <label class="field">
          <span class="field__label">Сколько человек</span>
          <input class="field__input" type="number" name="people" min="1" max="500" inputmode="numeric" placeholder="Например, 5">
        </label>
      </div>
      <label class="field" data-field="profession">
        <span class="field__label">Кто нужен</span>
        <select class="field__input" name="profession">
          <option value="">Выберите профессию</option>
          ${professionOptions(professions)}
          <option value="Другое">Другое — опишу в комментарии</option>
        </select>
      </label>
      <label class="field">
        <span class="field__label">Комментарий</span>
        <textarea class="field__input" name="comment" rows="3" placeholder="Объект, график, дата старта — всё, что важно знать"></textarea>
      </label>
      <label class="check">
        <input type="checkbox" name="consent" required>
        <span>Согласен на обработку персональных данных и принимаю <a href="privacy.html" target="_blank" rel="noopener">политику конфиденциальности</a></span>
      </label>
      <div class="form__actions">
        <button class="btn btn--copper" type="submit">Отправить заявку</button>
        <a class="form__phone" href="tel:${site.phoneHref}">${site.phoneDisplay}</a>
      </div>
    </form>
    <div class="form-success" data-success hidden role="status" aria-live="polite">
      <p class="form-success__mark">Заявка принята</p>
      <p class="form-success__text" data-success-text>Перезвоним в рабочее время и уточним детали.</p>
      <div class="form-success__actions">
        <a class="btn btn--copper" href="tel:${site.phoneHref}">Позвонить сейчас</a>
        <a class="btn btn--ghost" href="${site.whatsapp}" target="_blank" rel="noopener">Написать в WhatsApp</a>
      </div>
    </div>
  </div>
</dialog>`;

const header = read('layout/header.html')
  .replaceAll('{{PHONE}}', site.phoneDisplay)
  .replaceAll('{{PHONE_HREF}}', site.phoneHref)
  .replaceAll('{{EMAIL}}', site.email)
  .replaceAll('{{ADDRESS_SHORT}}', site.addressShort)
  .replaceAll('{{HOURS}}', site.hours)
  .replaceAll('{{LICENSE_LINE}}', site.licenseLine);

const footer = read('layout/footer.html')
  .replaceAll('{{PHONE}}', site.phoneDisplay)
  .replaceAll('{{PHONE_HREF}}', site.phoneHref)
  .replaceAll('{{EMAIL}}', site.email)
  .replaceAll('{{ADDRESS_FULL}}', site.addressFull)
  .replaceAll('{{HOURS}}', site.hours)
  .replaceAll('{{HOURS_NOTE}}', site.hoursNote)
  .replaceAll('{{WHATSAPP}}', site.whatsapp)
  .replaceAll('{{TELEGRAM}}', site.telegram)
  .replaceAll('{{INN}}', site.inn)
  .replaceAll('{{OGRN}}', site.ogrn)
  .replaceAll('{{LEGAL}}', site.legal)
  .replaceAll('{{LICENSE_LINE}}', site.licenseLine)
  .replaceAll('{{YEAR}}', new Date().getFullYear());

const jsonld = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'EmploymentAgency',
  name: site.legal,
  description: 'Кадровое агентство: аутсорсинг и аутстаффинг рабочего персонала в Калининграде и области.',
  url: site.url,
  telephone: site.phoneDisplay,
  email: site.email,
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Калининград',
    streetAddress: 'Московский проспект, 44, БЦ «Балтийский», 7 этаж, офис 702',
    addressRegion: 'Калининградская область',
    addressCountry: 'RU',
  },
  openingHours: 'Mo-Fr 09:00-18:00',
  areaServed: 'Калининградская область',
  founder: { '@type': 'Organization', name: site.legal },
}, null, 2);

/* ---------- page assembly ---------- */

const common = {
  '{{YEAR}}': String(new Date().getFullYear()),
  '{{PHONE}}': site.phoneDisplay,
  '{{PHONE_HREF}}': site.phoneHref,
  '{{EMAIL}}': site.email,
  '{{ADDRESS_FULL}}': site.addressFull,
  '{{ADDRESS_SHORT}}': site.addressShort,
  '{{HOURS}}': site.hours,
  '{{HOURS_NOTE}}': site.hoursNote,
  '{{WHATSAPP}}': site.whatsapp,
  '{{TELEGRAM}}': site.telegram,
  '{{INN}}': site.inn,
  '{{OGRN}}': site.ogrn,
  '{{LEGAL}}': site.legal,
  '{{SITE_URL}}': site.url,
  '{{PROFESSION_OPTIONS}}': professionOptions(professions),
  '{{IND_FOOTER}}': industries.map((i) => `<a href="industries.html#${i.id}">${esc(i.title)}</a>`).join('\n'),
};

const pages = [
  {
    file: 'index.html', layout: 'index.html',
    title: 'РусРесурс — рабочий персонал в Калининграде по договору',
    desc: 'Аутсорсинг и аутстаффинг рабочего персонала в Калининграде: грузчики, разнорабочие, комплектовщики, операторы линий. Смена от 24 часов, договор, документы, замена.',
    nav: 'home', bodyClass: 'page-home', og: 'hero-main.jpg', jsonld: true,
  },
  {
    file: 'services.html', layout: 'services.html',
    title: 'Услуги кадрового агентства — аутсорсинг и аутстаффинг | РусРесурс',
    desc: 'Чем отличается аутсорсинг от аутстаффинга, что входит в услугу, как выбрать формат под задачу. Рабочий персонал по договору в Калининграде.',
    nav: 'services', bodyClass: 'page-services', og: 'service-outsourcing.jpg',
  },
  {
    file: 'outsourcing.html', layout: 'outsourcing.html',
    title: 'Аутсорсинг персонала в Калининграде — работы под ключ | РусРесурс',
    desc: 'Аутсорсинг рабочего персонала: мы оформляем людей, ставим задачи и отвечаем за результат. Смены на складе, производстве, стройке. Ставки от 350 ₽/час.',
    nav: 'services', bodyClass: 'page-outsourcing', og: 'service-outsourcing.jpg',
  },
  {
    file: 'outstaffing.html', layout: 'outstaffing.html',
    title: 'Аутстаффинг персонала в Калининграде — аренда сотрудников | РусРесурс',
    desc: 'Аутстаффинг: выводим оформленных сотрудников на ваш объект, кадровый учёт и налоги берём на себя. Договор, табель, замена в течение смены.',
    nav: 'services', bodyClass: 'page-outstaffing', og: 'service-outstaffing.jpg',
  },
  {
    file: 'industries.html', layout: 'industries.html',
    title: 'Отрасли: заводы, агро, стройка, пищепром, склады | РусРесурс',
    desc: 'Рабочий персонал для автозаводов, агрохолдингов, строительства, пищевых производств, складов и частных заказчиков в Калининградской области.',
    nav: 'services', bodyClass: 'page-industries', og: 'industry-auto.jpg',
  },
  {
    file: 'personnel.html', layout: 'personnel.html',
    title: 'Персонал и ставки — кого выводим на объекты | РусРесурс',
    desc: 'Грузчики, комплектовщики, разнорабочие, операторы линий, уборщики: ставки от 350 ₽/час, минимальный заказ от 4 часов. Выберите профессию и оставьте заявку.',
    nav: 'services', bodyClass: 'page-personnel', og: 'hero-main.jpg',
  },
  {
    file: 'prices.html', layout: 'prices.html',
    title: 'Цены и калькулятор смены — от 350 ₽/час | РусРесурс',
    desc: 'Ориентировочные ставки на рабочий персонал в Калининграде и калькулятор стоимости смены: профессия, количество людей, часы, формат работы.',
    nav: 'prices', bodyClass: 'page-prices', og: 'hero-main.jpg',
  },
  {
    file: 'about.html', layout: 'about.html',
    title: 'О компании «РусРесурс» — кадровое агентство с 2018 года',
    desc: 'Работаем с 2018 года, 600+ человек в штате, 20 000+ сотрудников выведено на объекты. Лицензированное кадровое агентство в Калининграде.',
    nav: 'about', bodyClass: 'page-about', og: 'about-team.jpg',
  },
  {
    file: 'vacancies.html', layout: 'vacancies.html',
    title: 'Вакансии — работа в Калининграде с официальным оформлением | РусРесурс',
    desc: 'Грузчики, комплектовщики, операторы линий, уборщики: работа на складах, производствах и стройках Калининграда. Выплаты два раза в месяц, оформление по ТК.',
    nav: 'vacancies', bodyClass: 'page-vacancies', og: 'forklift.jpg',
  },
  {
    file: 'reviews.html', layout: 'reviews.html',
    title: 'Отзывы и кейсы клиентов — РусРесурс',
    desc: 'Как мы закрывали смены на автозаводе, агрохолдинге, стройке и пищевом производстве. Отзывы руководителей и разбор проектов.',
    nav: 'reviews', bodyClass: 'page-reviews', og: 'case-1.jpg',
  },
  {
    file: 'blog.html', layout: 'blog.html',
    title: 'Блог о персонале, аутсорсинге и аутстаффинге | РусРесурс',
    desc: 'Практические статьи: как выбрать подрядчика, рассчитать смену, укомплектовать сезон и пройти санитарный контроль.',
    nav: 'blog', bodyClass: 'page-blog', og: 'blog-contract.jpg',
  },
  {
    file: 'faq.html', layout: 'faq.html',
    title: 'Вопросы и ответы — договор, сроки, оплата, замены | РусРесурс',
    desc: 'Ответы на частые вопросы о выводе персонала: сроки, минимальный заказ, документы, оплата, замены, трудоустройство.',
    nav: 'faq', bodyClass: 'page-faq', og: 'hero-main.jpg',
  },
  {
    file: 'contacts.html', layout: 'contacts.html',
    title: 'Контакты — Калининград, Московский проспект, 44 | РусРесурс',
    desc: 'Офис в БЦ «Балтийский», Московский проспект, 44, 7 этаж, офис 702. Телефон, email, WhatsApp, Telegram, форма заявки.',
    nav: 'contacts', bodyClass: 'page-contacts', og: 'office.jpg', jsonld: true,
  },
  {
    file: 'privacy.html', layout: 'privacy.html',
    title: 'Политика конфиденциальности — РусРесурс',
    desc: 'Как мы обрабатываем и защищаем персональные данные, которые вы оставляете на сайте.',
    nav: '', bodyClass: 'page-legal', og: 'office.jpg',
  },
  {
    file: '404.html', layout: '404.html',
    title: 'Страница не найдена — РусРесурс',
    desc: 'Такой страницы нет. Вернитесь на главную или позвоните нам — подскажем, где искать.',
    nav: '', bodyClass: 'page-404', og: 'hero-main.jpg',
  },
];

const tokenMap = {
  '{{PROFESSIONS_6}}': professionsGrid(professions.slice(0, 6)),
  '{{PROFESSIONS_FULL}}': professionsGrid(professions),
  '{{PROFESSION_FILTERS}}': professionFilters(),
  '{{RATES_TABLE}}': ratesTable(),
  '{{INDUSTRIES}}': industriesGrid(),
  '{{CASES_3}}': casesGrid(3),
  '{{CASES_ALL}}': casesGrid(4),
  '{{REVIEWS}}': reviewsSlider(),
  '{{FAQ_HOME}}': faqHome(),
  '{{FAQ_FULL}}': faqFull(),
  '{{FAQ_NAV}}': faqNav(),
  '{{VACANCIES}}': vacanciesList(),
  '{{VACANCY_FILTERS}}': vacancyFilters(),
  '{{BLOG_3}}': blogCards(3),
  '{{BLOG_ALL}}': blogCards(articles.length, true),
  '{{BLOG_FILTERS}}': blogFilters(),
  '{{ORDER_MODAL}}': '',
};

const layoutTemplate = read('layout/base.html');

function renderLayout({ title, desc, file, bodyClass, og, content, jsonldFlag }) {
  const canonical = `${site.url}/${file === 'index.html' ? '' : file}`;
  const ogImage = `${site.url}/assets/img/${og || 'hero-main.jpg'}`;
  let html = layoutTemplate
    .replaceAll('{{TITLE}}', esc(title))
    .replaceAll('{{DESCRIPTION}}', esc(desc))
    .replaceAll('{{CANONICAL}}', canonical)
    .replaceAll('{{OG_IMAGE}}', ogImage)
    .replaceAll('{{BODY_CLASS}}', bodyClass || '')
    .replaceAll('{{HEADER}}', header)
    .replaceAll('{{FOOTER}}', footer)
    .replaceAll('{{ORDER_MODAL}}', orderModal())
    .replaceAll('{{CONTENT}}', content)
    .replaceAll('{{EXTRA_SCRIPTS}}', '')
    .replaceAll('{{PRELOAD}}', '<link rel="preload" href="assets/fonts/GolosText-400-cyrillic-2.woff2" as="font" type="font/woff2" crossorigin><link rel="preload" href="assets/fonts/Oranienbaum-400-cyrillic-6.woff2" as="font" type="font/woff2" crossorigin>');

  const ld = jsonldFlag ? `<script type="application/ld+json">${jsonld}</script>` : '';
  html = html.replace('{{JSONLD}}', ld);

  for (const [k, v] of Object.entries(common)) html = html.split(k).join(v);
  for (const [k, v] of Object.entries(tokenMap)) html = html.split(k).join(v);
  return html;
}

/* ---------- build ---------- */

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

for (const page of pages) {
  const content = read(`pages/${page.layout}`).replaceAll('{{JSONLD}}', '');
  const html = renderLayout({
    title: page.title, desc: page.desc, file: page.file,
    bodyClass: page.bodyClass, og: page.og, content, jsonldFlag: page.jsonld,
  });
  fs.writeFileSync(path.join(dist, page.file), html);
}

const articleTemplate = read('pages/article.html');
for (const a of articles) {
  const body = read(`articles/${a.slug}.html`);
  const content = articleTemplate
    .replaceAll('{{A_TITLE}}', esc(a.title))
    .replaceAll('{{A_EXCERPT}}', esc(a.excerpt))
    .replaceAll('{{A_CATEGORY}}', esc(a.category))
    .replaceAll('{{A_DATE_LABEL}}', esc(a.dateLabel))
    .replaceAll('{{A_DATE_ISO}}', a.date)
    .replaceAll('{{A_READ}}', esc(a.read))
    .replaceAll('{{A_COVER}}', a.cover)
    .replaceAll('{{A_COVER_ALT}}', esc(a.coverAlt))
    .replaceAll('{{A_BODY}}', body);
  const html = renderLayout({
    title: `${a.title} — РусРесурс`,
    desc: a.excerpt,
    file: `blog-${a.slug}.html`,
    bodyClass: 'page-article',
    og: a.cover,
    content,
    jsonldFlag: false,
  });
  fs.writeFileSync(path.join(dist, `blog-${a.slug}.html`), html);
}

/* assets */
const copyDir = (from, to) => {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const source = path.join(from, entry.name);
    const target = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(source, target);
    else if (entry.isFile()) fs.copyFileSync(source, target);
  }
};

fs.mkdirSync(path.join(dist, 'assets'), { recursive: true });
copyDir(path.join(src, 'assets', 'css'), path.join(dist, 'assets', 'css'));
copyDir(path.join(src, 'assets', 'js'), path.join(dist, 'assets', 'js'));
copyDir(path.join(src, 'fonts'), path.join(dist, 'assets', 'fonts'));
fs.mkdirSync(path.join(dist, 'assets', 'img'), { recursive: true });
for (const f of fs.readdirSync(path.join(src, 'img'))) {
  if (f.endsWith('.jpg') || f.endsWith('.svg') || f.endsWith('.png') || f.endsWith('.webp')) {
    fs.copyFileSync(path.join(src, 'img', f), path.join(dist, 'assets', 'img', f));
  }
}

/* sitemap + robots */
const urls = pages.filter((p) => p.file !== '404.html').map((p) => `  <url><loc>${site.url}/${p.file === 'index.html' ? '' : p.file}</loc><changefreq>monthly</changefreq><priority>${p.file === 'index.html' ? '1.0' : '0.7'}</priority></url>`);
for (const a of articles) urls.push(`  <url><loc>${site.url}/blog-${a.slug}.html</loc><changefreq>yearly</changefreq><priority>0.5</priority></url>`);
fs.writeFileSync(path.join(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`);
fs.writeFileSync(path.join(dist, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${site.url}/sitemap.xml\n`);
fs.writeFileSync(path.join(dist, '.nojekyll'), '');

console.log(`Built ${pages.length} pages + ${articles.length} articles into dist/`);

