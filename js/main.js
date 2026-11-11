// =====================================================================
//  ТОЧКА ВХОДА: рендер, камера, прокрутка → шкала времени, подписи.
// =====================================================================
import * as THREE from './vendor/three.module.js';
import { COLORS, STAGES, STAGE_YEARS, DESIGN_PROJECTS, WORK_CATEGORIES } from './config.js';
import { ss } from './util.js';
import { createWorld } from './world.js';
import { createFigure } from './figure.js';

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const canvas = document.getElementById('gl');
const track = document.getElementById('scroll-track');

let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true }); }
catch (e) { document.getElementById('err').hidden = false; throw e; }
// 1.5 вместо 2: на Retina почти не видно разницы, а пикселей рисовать почти вдвое меньше
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
renderer.setClearColor(COLORS.paper, 1);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 120);

const world = createWorld(scene);
const figure = await createFigure(scene);

/* ---------- прокрутка → p (0…1) ---------- */
let target = 0, prog = 0;
function readScroll() {
  const max = track.offsetHeight - innerHeight;
  target = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
  document.body.classList.toggle('past-scene', scrollY > max + innerHeight * 0.3);
  wake();
}
addEventListener('scroll', readScroll, { passive: true });

// Время последнего действия пользователя: пока он скроллит или двигает мышь,
// сцена рисуется плавно, а в покое — реже, чтобы не грузить компьютер.
let lastInput = 0;
function wake() { lastInput = performance.now(); }

// Режим редактирования: откройте страницу с ?edit в адресе (index.html?edit)
const EDIT = new URLSearchParams(location.search).has('edit');

let mx = 0, my = 0;   // лёгкий параллакс от мыши (в режиме редактирования выключен)
addEventListener('pointermove', (e) => {
  if (!EDIT) { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; }
  wake();
}, { passive: true });

/* ---------- клик по работе → окно с описанием ---------- */
const dlg = document.getElementById('project');
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function projectAt(e) {
  ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  return world.pick(ray);
}
function openProject(i) {
  const P = DESIGN_PROJECTS[i]; if (!P) return;
  const L = P.look || {};
  const hero = document.getElementById('pj-hero');
  hero.style.setProperty('--pj-bg', L.bg || P.colors?.[0] || '#16171a');
  hero.style.setProperty('--pj-ink', L.ink || '#fff');
  hero.style.color = L.text || '';
  hero.querySelector('.pj-hero-title').style.justifyContent = L.titleTop ? 'flex-start' : '';   // мелкие подписи героя на светлом фото — тёмные
  hero.classList.toggle('is-full', !!L.full); hero.classList.toggle('has-wire', !!L.wire);
  hero.style.gridTemplateColumns = L.titleAt ? `${L.titleAt * 100}% 1fr` : '';   // заголовок правее рисунка на фото
  const img = document.getElementById('pj-img');
  img.src = P.hero || P.board || P.src; img.alt = P.title;
  // картинка всегда целиком; пустое место вокруг — цветом её же угла, чтобы не было полос
  img.style.objectFit = L.full ? 'cover' : 'contain';
  img.onload = () => {
    hero.style.setProperty('--hr', img.naturalWidth / img.naturalHeight);   // пропорции картинки — для телефона
    try {
      // средний цвет всей кромки картинки
      const c = document.createElement('canvas'), N = 64; c.width = c.height = N;
      const x = c.getContext('2d'); x.drawImage(img, 0, 0, N, N);
      const d = x.getImageData(0, 0, N, N).data; let r = 0, g = 0, b = 0, n = 0;
      for (let k = 0; k < N; k++) for (const [px, py] of [[k, 0], [k, N - 1], [0, k], [N - 1, k]]) {
        const o = (py * N + px) * 4; r += d[o]; g += d[o + 1]; b += d[o + 2]; n++;
      }
      r = Math.round(r / n); g = Math.round(g / n); b = Math.round(b / n);
      const box = L.full ? document.getElementById('pj-hero') : img.parentElement;   // фото на весь блок — красим весь блок
      box.style.background = `rgb(${r},${g},${b})`;
    } catch { img.parentElement.style.background = ''; }
  };
  // заголовок: строки из look.lines, строка со «*» — контуром
  document.getElementById('pj-title').replaceChildren(...(L.lines || [P.title]).map((t) =>
    el('span', t.endsWith('*') ? 'is-outline' : null, t.replace(/\*$/, ''))));
  document.getElementById('pj-title').dataset.scale = L.titleScale || 1;
  document.getElementById('pj-kind').textContent = `${String(i + 1).padStart(2, '0')} / ${L.kind || P.sub}`;
  document.getElementById('pj-place').textContent = L.place || '';
  document.getElementById('pj-headline').textContent = L.headline || P.title;
  document.getElementById('pj-lede').textContent = L.lede || P.text || '';
  const live = document.getElementById('pj-live');
  live.hidden = !P.link; if (P.link) { live.href = P.link; live.textContent = `Visit ${P.link.replace(/^https?:\/\//, '').replace(/\/(index\.html)?$/, '')} ↗`; }
  // блоки ниже; главы — заголовки h, ссылки на них в блоке концепции
  const blocks = P.caseStudy || P.gallery || [];
  const nodes = blocks.map(caseBlock);
  const chapters = nodes.filter((n) => n.classList.contains('cs-h'));
  chapters.forEach((n, k) => { n.id = `pj-ch-${k}`; });
  document.getElementById('pj-chapters').replaceChildren(...chapters.map((n, k) => {
    const a = el('a', null, `${blocks.filter((B) => B.h)[k].nav || blocks.filter((B) => B.h)[k].h} ↗`); a.href = `#pj-ch-${k}`; return a;
  }));
  document.getElementById('pj-count').textContent = chapters.length ? `01—${String(chapters.length).padStart(2, '0')}` : '';
  document.getElementById('pj-case').replaceChildren(...nodes);
  document.getElementById('pj-case').style.setProperty('--cs-red', P.accent || L.accent || '#c8202a');
  document.documentElement.classList.add('modal-open');   // страница под окном не крутится
  dlg.showModal(); dlg.scrollTop = 0;
  fitTitle(); drawWire(L.wire);
}
// заголовок героя: уменьшаем, пока самая длинная строка не влезет в колонку (слова не рвём)
function fitTitle() {
  const h = document.getElementById('pj-title'); h.style.fontSize = '';
  let size = parseFloat(getComputedStyle(h).fontSize) * (h.dataset.scale || 1);   // titleScale — заголовок мельче
  h.style.fontSize = `${size}px`;
  const widest = () => Math.max(...[...h.children].map((s) => s.scrollWidth));
  const col = h.parentElement;   // колонка заголовка: в широком окне её высота = высоте фото, текст не должен вылезать
  const tooTall = () => col.scrollHeight > col.clientHeight + 1;
  while (size > 28 && (widest() > h.clientWidth || tooTall())) { size *= 0.94; h.style.fontSize = `${size}px`; }
}
addEventListener('resize', () => { if (dlg.open) { fitTitle(); drawWire(document.getElementById('pj-hero').classList.contains('has-wire')); } });

// колючая проволока у заголовка: две скрученные нити сверху вниз, два шипа, петля,
// и переход в линию цвета заголовка внизу
function drawWire(on) {
  const svg = document.getElementById('pj-wire'); svg.replaceChildren(); if (!on) return;
  const hero = document.getElementById('pj-hero'), title = hero.querySelector('.pj-hero-title');
  const W = hero.clientWidth, H = hero.clientHeight, x0 = title.offsetLeft - 28, yEnd = H * 0.84, base = H - 36;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const NS = 'http://www.w3.org/2000/svg';
  const add = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); svg.append(e); return e; };
  const ink = getComputedStyle(hero).getPropertyValue('--pj-ink').trim() || '#ff0';
  // основная кривая: вниз с лёгкой волной, петля, хвост влево к линии
  const pts = [];
  for (let k = 0; k <= 120; k++) { const t = k / 120; pts.push([x0 + Math.sin(t * 5.2) * 12 - t * 10, -10 + t * (yEnd + 10)]); }
  // петля: гладкий эллипс, начинается в конце кривой, после полного оборота уходит вниз-влево
  const [lx, ly] = pts[pts.length - 1], rx = 54, ry = 24, cx = lx - rx * 0.8, cy = ly + ry * 0.6;   // петля влево, к работе
  const a0 = Math.atan2((ly - cy) / ry, (lx - cx) / rx);
  for (let k = 1; k <= 70; k++) { const a = a0 + (k / 70) * (Math.PI * 2 + 0.9); pts.push([cx + Math.cos(a) * rx, cy - Math.sin(a) * ry]); }
  const [tx, ty] = pts[pts.length - 1];
  for (let k = 1; k <= 24; k++) { const t = k / 24; pts.push([tx - t * 46, ty + (base - ty) * (1 - (1 - t) * (1 - t))]); }
  // две нити вокруг кривой, перекручены
  for (const sgn of [1, -1]) {
    const d = pts.map(([x, y], k) => {
      const [nx, ny] = pts[Math.min(k + 1, pts.length - 1)], dx = nx - x, dy = ny - y, l = Math.hypot(dx, dy) || 1;
      const o = sgn * 2.4 * Math.sin(k * 0.9);
      return `${k ? 'L' : 'M'}${(x - dy / l * o).toFixed(1)},${(y + dx / l * o).toFixed(1)}`;
    }).join('');
    add('path', { d, fill: 'none', stroke: '#141414', 'stroke-width': 1.6, 'stroke-linecap': 'round' });
  }
  // линия цвета заголовка: слева до проволоки, мягко поворачивает вверх
  const ex = pts[pts.length - 1][0];
  add('path', { d: `M0,${base} L${ex.toFixed(1)},${base}`, fill: 'none', stroke: ink, 'stroke-width': 3, 'stroke-linecap': 'round' });
  // шипы: катушка и четыре острия
  for (const t of [0.26, 0.6]) {
    const [x, y] = pts[Math.round(t * 120)];
    add('rect', { x: x - 9, y: y - 9, width: 18, height: 18, rx: 3, fill: '#c2128a', stroke: '#141414', 'stroke-width': 1.6 });
    for (const yy of [-4, 0, 4]) add('line', { x1: x - 9, y1: y + yy, x2: x + 9, y2: y + yy, stroke: '#141414', 'stroke-width': 1.2 });
    for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) add('line', { x1: x, y1: y, x2: x + a * 26, y2: y + b * 16, stroke: '#141414', 'stroke-width': 1.6, 'stroke-linecap': 'round' });
  }
}
dlg.addEventListener('close', () => { document.documentElement.classList.remove('modal-open'); dlg.querySelectorAll('video').forEach((v) => v.pause()); });
// мини-помощник: элемент с классом и текстом/детьми
function el(tag, cls, ...kids) {
  const e = document.createElement(tag); if (cls) e.className = cls;
  for (const k of kids) if (k != null) e.append(k);
  return e;
}
const pic = (src, cls) => Object.assign(document.createElement('img'), { src, alt: '', loading: 'lazy', className: cls || '' });
// блок кейса (см. HAPOALIM_CASE в config.js)
function caseBlock(B) {
  if (B.h) return el('h3', 'cs-h', el('span', 'cs-n', B.n || ''), B.h);
  if (B.p) return el('p', 'cs-p', B.p);
  if (B.quote) return el('blockquote', 'cs-quote', `“${B.quote}”`);
  if (B.img) return el('figure', B.small ? 'cs-fig is-small' : B.narrow ? 'cs-fig is-narrow' : 'cs-fig', pic(B.img), B.cap ? el('figcaption', null, B.cap) : null);
  if (B.pair) {   // колонки по пропорциям картинок — тогда обе одной высоты
    const box = el('div', 'cs-pair', ...B.pair.map((s) => pic(s)));
    box.querySelectorAll('img').forEach((im, k) => im.addEventListener('load', () => box.style.setProperty(k ? '--b' : '--a', `${im.naturalWidth / im.naturalHeight}fr`)));
    return box;
  }
  if (B.pains) return el('ul', 'cs-pains', ...B.pains.map(([ic, t, d]) => el('li', null, pic(ic), el('b', null, t), el('span', null, d))));
  if (B.flows) return el('div', 'cs-flows', ...B.flows.map(([src, t, d]) => el('figure', null, pic(src, 'cs-phone'), el('figcaption', null, el('b', null, t), d))));
  if (B.voices) return el('div', 'cs-voices', ...B.voices.map((v) => el('p', null, `“${v}”`)));
  if (B.steps) return el('ol', 'cs-steps', ...B.steps.map(([t, d]) => el('li', null, el('b', null, t), d)));
  if (B.gallery) return el('ul', 'cs-gallery', ...B.gallery.map(([src, cap]) => el('li', null, pic(src), el('span', null, cap))));
  if (B.grid) return el('div', 'cs-grid', ...B.grid.map((s) => pic(s)));
  if (B.logos) return el('div', 'cs-logos', ...B.logos.map((s) => pic(s)));   // версии логотипа — в один ряд, без обрезки
  if (B.swatches) return el('ul', 'cs-swatches', ...B.swatches.map(([name, hex, role]) => {
    const chip = el('span', 'cs-chip'); chip.style.background = hex;
    return el('li', null, chip, el('b', null, name), el('span', null, `${hex.toUpperCase()} · ${role}`));
  }));
  if (B.fonts) return el('ul', 'cs-fonts', ...B.fonts.map(([name, role, css]) => {
    const sample = el('span', 'cs-font-sample', 'Aa'); sample.style.fontFamily = css;
    return el('li', null, sample, el('b', null, name), el('span', null, role));
  }));
  // meta — паспорт проекта [подпись, значение]; stats — крупные цифры [число, подпись, пояснение];
  // map — соответствие «теория → интерфейс» [слева, справа]; swot — четыре списка; timeline — точки на линии
  if (B.meta) return el('dl', 'cs-meta', ...B.meta.map(([k, v]) => el('div', null, el('dt', null, k), el('dd', null, v))));
  if (B.stats) return el('div', 'cs-stats-wrap',
    el('ul', 'cs-stats', ...B.stats.map(([n, t, d]) => el('li', null, el('b', null, n), el('span', null, t), d ? el('small', null, d) : null))),
    B.src ? el('p', 'cs-src', B.src) : null);
  if (B.map) return el('ul', 'cs-map', ...B.map.map(([a, b]) => el('li', null, el('b', null, a), el('span', null, '→'), el('em', null, b))));
  if (B.swot) return el('div', 'cs-swot', ...B.swot.map(([t, items]) => el('section', null, el('h4', null, t), el('ul', null, ...items.map((i) => el('li', null, i))))));
  if (B.timeline) return el('div', 'cs-timeline', el('ol', null, ...B.timeline.map(([t, hot]) => el('li', hot ? 'is-hot' : null, t))), B.note ? el('p', null, B.note) : null);
  if (B.big) return el('p', 'cs-big', B.big);
  if (B.video) {   // видео: без звука сам не играет — со звуком по кнопке, постер до загрузки
    // video — один файл или список [webm, mp4]: браузер берёт первый, который умеет играть
    const v = Object.assign(document.createElement('video'), { controls: true, playsInline: true, preload: 'none', poster: B.poster || '' });
    for (const src of [].concat(B.video)) v.append(Object.assign(document.createElement('source'), { src, type: src.endsWith('.webm') ? 'video/webm' : 'video/mp4' }));
    return el('figure', 'cs-fig cs-video', v, B.cap ? el('figcaption', null, B.cap) : null);
  }
  if (B.phone) return el('div', 'cs-final', pic(B.phone, 'cs-phone'), el('ol', null, ...B.list.map(([t, d]) => el('li', null, el('b', null, t), d))));
  return el('div');
}
dlg.addEventListener('click', (e) => {
  if (e.target === dlg || e.target.closest('.pj-close')) return dlg.close();   // мимо окна или × — закрыть
  const a = e.target.closest('a[href^="#pj-"]');                              // ссылки внутри окна — плавно к разделу
  if (a) { e.preventDefault(); dlg.querySelector(a.getAttribute('href'))?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
});   // мимо окна или × — закрыть
if (!EDIT) {
  let down = null;
  canvas.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY]; });
  canvas.addEventListener('pointerup', (e) => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6) return;   // это был не клик, а протяжка
    const h = projectAt(e); if (!h) return;
    if (h.cat) setCategory(h.cat); else openProject(h.project);
  });
  let hoverAt = 0;
  canvas.addEventListener('pointermove', (e) => {
    const now = performance.now(); if (now - hoverAt < 80) return; hoverAt = now;
    canvas.style.cursor = projectAt(e) ? 'pointer' : '';
  }, { passive: true });
}

/* ---------- разделы работ (финал) ----------
   Клик по разделу → его проекты; «← All work» или Назад в браузере → снова разделы.
   Раздел пишется в адрес (#graphic), ссылку можно отправить. */
const backBtn = document.getElementById('work-back'), catLabel = document.getElementById('work-cat');
function setCategory(key, push = true) {
  const C = WORK_CATEGORIES.find((K) => K.key === key);
  if (C) world.openCategory(key); else world.closeCategory();
  catLabel.textContent = C ? C.title : '';
  phoneFilter(C ? key : null);
  if (push && location.hash.slice(1) !== (key || '')) history.pushState(null, '', key ? `#${key}` : location.pathname + location.search);
  wake();
}
backBtn.addEventListener('click', () => setCategory(null));

/* ---------- телефон: разделы и проекты обычной страницей под сценой ----------
   Доски в 3D на узком экране слишком мелкие, поэтому там — кнопки разделов и карточки
   с теми же обложками (canvas из world.covers). Карточка открывает то же окно проекта. */
const mCats = document.getElementById('m-cats'), mList = document.getElementById('m-list');
const catsWithWork = WORK_CATEGORIES.filter((C) => DESIGN_PROJECTS.some((P) => [].concat(P.cat).includes(C.key)));
const chip = (key, label, C) => {
  const b = el('button', 'm-cat', label); b.type = 'button'; b.dataset.key = key;
  if (C) { b.style.setProperty('--c-bg', C.bg); b.style.setProperty('--c-ink', C.ink); }
  b.addEventListener('click', () => setCategory(key || null));
  return b;
};
mCats.replaceChildren(chip('', 'All'), ...catsWithWork.map((C) => chip(C.key, C.title, C)));
mList.replaceChildren(...DESIGN_PROJECTS.map((P, i) => {
  const cover = world.covers.projects[i]; cover.className = 'm-cover'; cover.setAttribute('aria-hidden', 'true');
  const btn = el('button', 'm-card', cover, el('span', 'm-name', P.title), el('span', 'm-sub', P.sub));
  btn.type = 'button'; btn.addEventListener('click', () => openProject(i));
  const li = el('li', null, btn); li.dataset.cats = [].concat(P.cat).join(' ');
  return li;
}));
function phoneFilter(key) {
  mCats.querySelectorAll('.m-cat').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.key === (key || ''))));
  mList.querySelectorAll('li').forEach((li) => { li.hidden = !!key && !li.dataset.cats.split(' ').includes(key); });
}
phoneFilter(null);
addEventListener('popstate', () => setCategory(location.hash.slice(1) || null, false));
if (location.hash.length > 1 && WORK_CATEGORIES.some((C) => C.key === location.hash.slice(1))) {
  setCategory(location.hash.slice(1), false);
  requestAnimationFrame(() => document.body.classList.contains('is-phone') ? document.getElementById('m-work').scrollIntoView() : scrollTo(0, track.offsetHeight - innerHeight));   // ссылка на раздел — сразу в финал
}

if (EDIT) {
  const { createEditor } = await import('./editor.js');
  createEditor({ canvas, camera, labels: world.labels, layout: world.layout, getProg: () => prog, wake });
}

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  const phone = w / h < 1 && w < 1100;   // вертикальный экран (телефон, планшет): разделы и проекты — страницей под сценой
  // Сцена собрана под экран 16:10. На более узком (квадратнее) экране держим ширину обзора как там,
  // иначе имя на стене и доски разделов уходят за края. На телефоне — прежнее мягкое расширение.
  const REF = 1.6, tan25 = Math.tan(THREE.MathUtils.degToRad(25));
  camera.fov = phone ? Math.min(78, 50 + Math.max(0, 1.2 - camera.aspect) * 36)
    : camera.aspect >= REF ? 50 : THREE.MathUtils.radToDeg(2 * Math.atan(tan25 * REF / camera.aspect));
  camera.updateProjectionMatrix();
  document.body.classList.toggle('is-phone', phone); world.setPhone(phone);
  wake();
}
addEventListener('resize', resize);
resize(); readScroll(); prog = target;

/* ---------- подписи ---------- */
const numEl = document.getElementById('num'), labelEl = document.getElementById('label'), noteEl = document.getElementById('note'), captionEl = document.querySelector('.caption');
const railEls = [...document.querySelectorAll('#rail li')], hintEl = document.getElementById('hint');
let shown = -1;
const LAST = STAGES.length - 1;
const NO_CAPTION = ['Descent', 'Fragments'];
const CALM = 2;   // экран, с которого начинается разрушение (Context) — до него грид цел
function hud(p) {
  const k = Math.min(LAST, Math.round(p * LAST));
  if (k !== shown) {
    shown = k;
    const off = k === 0 || NO_CAPTION.includes(STAGES[k][0]);   // на этих экранах подписи нет
    // текст меняем только у видимой подписи — иначе слово мелькает, пока подпись гаснет
    if (!off) {
      const num = STAGE_YEARS[k] ?? String(k + 1).padStart(2, '0');
      numEl.textContent = num; numEl.hidden = !num; numEl.classList.toggle('long', num.length > 4);
      labelEl.textContent = STAGES[k][0];
      noteEl.textContent = STAGES[k][2] || ''; noteEl.hidden = !STAGES[k][2];
    }
    captionEl.classList.toggle('is-off', off);
    railEls.forEach((li) => li.classList.toggle('on', +li.dataset.k === k));   // data-k — номер экрана
  }
  // подсказка: в начале — «scroll», на телефоне в финале — что ниже проекты
  const end = document.body.classList.contains('is-phone') && p > 0.97;
  hintEl.textContent = end ? 'projects ↓' : 'scroll ↓';
  captionEl.classList.toggle('is-end', end);   // на телефоне в финале вместо подписи — подсказка
  hintEl.style.opacity = p > 0.03 && !end ? 0 : 1;
}

/* ---------- цикл ---------- */
// Частота кадров: не больше 60 при движении (на 120-Гц экранах иначе вдвое больше работы)
// и 24 в покое. С «уменьшить движение» в покое не рисуем вовсе — картинка не меняется.
const FPS_ACTIVE = 60, FPS_IDLE = 24, IDLE_AFTER = 1500;
const clock = new THREE.Clock(); let t = 0, lastDraw = -Infinity;
function frame(now) {
  requestAnimationFrame(frame);
  const active = now - lastInput < IDLE_AFTER || Math.abs(target - prog) > 0.0005;
  if (!active && reduceMotion && lastDraw > 0) return;
  if (now - lastDraw < 1000 / (active ? FPS_ACTIVE : FPS_IDLE) - 2) return;
  lastDraw = now;

  const dt = Math.min(0.05, clock.getDelta());
  if (!reduceMotion) t += dt;
  prog += (target - prog) * Math.min(1, dt * 5);   // сглаживание прокрутки
  // p — вся прокрутка (0…1, все экраны); sf — номер экрана с дробью (0 = Order, 1 = University…).
  // q — шкала разрушения: стоит на 0 на спокойных экранах (Order, University, Context)
  // и проходит 0…1 от Context до конца.
  const p = prog, sf = p * LAST, q = Math.max(0, (sf - CALM) / (LAST - CALM)), s = q * 5;

  // фазы всей истории (по q)
  const own = ss(0.84, 0.97, q);                          // новый порядок
  const ph = {
    crack: ss(0.12, 0.3, q),                               // трещины в полу
    fr: ss(0.6, 0.76, q) * (1 - ss(0.84, 0.95, q)),        // осколки дрейфуют
    own,
    fall: ss(0.5, 0.68, q) * (1 - own),                    // фигура «всплывает»
  };

  world.update(q, t, ph, sf);
  figure.update(s, t, ph, sf);

  const cz = 7 - ss(0.15, 0.6, q) * 1.2 + own * 0.9;
  camera.position.set(mx * 0.6, 0.15 - my * 0.4 + ss(0.12, 0.3, q) * 0.3 * (1 - own), cz);
  camera.lookAt(0, -0.3, -4);
  camera.rotateZ((ss(0.3, 0.62, q) * 0.07 + ph.fr * Math.sin(t * 0.3) * 0.03) * (1 - own));

  hud(p);
  document.body.classList.toggle('in-category', !!world.category() && own > 0.85);
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);
