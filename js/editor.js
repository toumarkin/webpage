// =====================================================================
//  РЕДАКТОР РАСКЛАДКИ. Включается, если открыть страницу с ?edit
//  (например localhost:8888/web-page/?edit). Обычные посетители его не видят.
//
//  В начале прокрутки (кадр Order) двигается место надписи на стене,
//  в самом конце (Own rules) — её место в финале.
//  Перетаскивание — сдвинуть. Alt/Option + колесо — размер.
//  Shift + колесо — отступ между блоками (например, имя ↔ роль).
//  «Скопировать» — новые числа для js/config.js (WALL_TEXT).
// =====================================================================
import * as THREE from './vendor/three.module.js';

// Границы комнаты (центр надписи на стене не уходит дальше)
const ROOM_MIN = new THREE.Vector3(-5, -3, -10), ROOM_MAX = new THREE.Vector3(5, 5, 8);

export function createEditor({ canvas, camera, labels, layout, getProg, wake }) {
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const plane = new THREE.Plane(), hit = new THREE.Vector3(), off = new THREE.Vector3(), n = new THREE.Vector3();
  let drag = null;

  /* ---------- панель ---------- */
  const panel = document.createElement('div');
  panel.style.cssText = `position:fixed;right:16px;bottom:16px;z-index:10;width:min(360px,calc(100vw - 32px));
    background:#fff;border:1px solid #16171a;padding:12px;font:12px/1.45 "JetBrains Mono",Menlo,monospace;color:#16171a;
    box-shadow:0 6px 24px rgba(0,0,0,.12)`;
  panel.innerHTML = `
    <div id="ed-head" style="display:flex;justify-content:space-between;align-items:center;cursor:move;user-select:none;
      margin:-12px -12px 0;padding:10px 12px;border-bottom:1px solid #d9d8d2;touch-action:none">
      <b>⠿ Редактор раскладки</b>
      <button id="ed-fold" title="Свернуть" style="cursor:pointer">–</button>
    </div>
    <div id="ed-body"></div>`;
  const body = panel.querySelector('#ed-body');
  body.innerHTML = `
    <div id="ed-mode" style="margin:6px 0;color:#5d5f66"></div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">
      <button data-go="0">↑ Начало (стены)</button>
      <button data-go="1">↓ Финал</button>
      <button id="ed-copy">Скопировать</button>
    </div>
    <pre id="ed-out" style="margin:0;max-height:34vh;overflow:auto;background:#f3f2ee;padding:8px;white-space:pre-wrap"></pre>`;
  document.body.appendChild(panel);

  // Панель можно таскать за заголовок; место и «свёрнуто» запоминаются в браузере
  const head = panel.querySelector('#ed-head'), fold = panel.querySelector('#ed-fold');
  const KEY = 'layout-editor-panel';
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ x: panel.offsetLeft, y: panel.offsetTop, folded: body.hidden })); } catch {} };
  const place = (x, y) => {
    x = Math.max(0, Math.min(innerWidth - panel.offsetWidth, x));
    y = Math.max(0, Math.min(innerHeight - head.offsetHeight, y));
    Object.assign(panel.style, { left: `${x}px`, top: `${y}px`, right: 'auto', bottom: 'auto' });
  };
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (s) { body.hidden = !!s.folded; place(s.x, s.y); }
  } catch {}
  fold.textContent = body.hidden ? '+' : '–';
  fold.addEventListener('click', () => { body.hidden = !body.hidden; fold.textContent = body.hidden ? '+' : '–'; save(); });
  let pd = null;
  head.addEventListener('pointerdown', (e) => {
    if (e.target === fold) return;
    pd = { dx: e.clientX - panel.offsetLeft, dy: e.clientY - panel.offsetTop };
    head.setPointerCapture(e.pointerId); e.preventDefault();
  });
  head.addEventListener('pointermove', (e) => { if (pd) place(e.clientX - pd.dx, e.clientY - pd.dy); });
  head.addEventListener('pointerup', () => { if (pd) { pd = null; save(); } });
  addEventListener('resize', () => { if (panel.style.left) place(panel.offsetLeft, panel.offsetTop); });
  const modeEl = panel.querySelector('#ed-mode'), outEl = panel.querySelector('#ed-out');
  panel.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => {
    scrollTo({ top: b.dataset.go === '1' ? document.documentElement.scrollHeight : 0, behavior: 'smooth' });
  }));
  panel.querySelector('#ed-copy').addEventListener('click', async (e) => {
    try { await navigator.clipboard.writeText(outEl.textContent); e.target.textContent = 'Скопировано ✓'; }
    catch { e.target.textContent = 'Выделите текст вручную'; }
    setTimeout(() => { e.target.textContent = 'Скопировать'; }, 1500);
  });

  /* ---------- что сейчас можно двигать ---------- */
  const mode = () => { const p = getProg(); return p < 0.01 ? 'wall' : p > 0.99 ? 'final' : null; };
  setInterval(() => {
    const m = mode();
    modeEl.textContent = m === 'wall' ? 'Двигаете: места на стенах'
      : m === 'final' ? 'Двигаете: места в финале'
      : 'Двигать можно только в начале или в конце прокрутки';
  }, 200);

  const r2 = (v) => Math.round(v * 100) / 100;
  const vec = (v) => `[${r2(v.x)}, ${r2(v.y)}, ${r2(v.z)}]`;
  function output() {
    outEl.textContent = labels.map((L) => {
      const g = L.cfg.lines.find((l) => l.gap !== undefined);
      return `// ${L.cfg.lines.map((l) => l.text).join(' ')}\n` +
        `width: ${r2(L.cfg.width)},\nwall: ${vec(L.P0)},\nfinal: ${vec(L.Po)}, finalScale: ${r2(L.so)},` +
        (g ? `\ngap «${g.text}»: ${g.gap},` : '');
    }).join('\n\n');
  }
  output();

  /* ---------- мышь ---------- */
  function pick(e) {
    ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const h = ray.intersectObjects(labels.map((L) => L.mesh), false)[0];
    return h ? { L: labels.find((L) => L.mesh === h.object), point: h.point } : null;
  }

  canvas.addEventListener('pointerdown', (e) => {
    const m = mode(), h = m && pick(e);
    if (!h) return;
    const target = m === 'wall' ? h.L.P0 : h.L.Po;
    // двигаем в плоскости самой надписи — на стене она так и остаётся на стене
    n.set(0, 0, 1).applyQuaternion(h.L.mesh.quaternion);
    plane.setFromNormalAndCoplanarPoint(n, h.point);
    off.copy(target).sub(h.point);
    drag = { target, wall: m === 'wall' };
    canvas.setPointerCapture(e.pointerId);
    canvas.style.cursor = 'grabbing';
    e.preventDefault();
  });

  canvas.addEventListener('pointermove', (e) => {
    if (drag) {
      ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      if (ray.ray.intersectPlane(plane, hit)) {
        drag.target.copy(hit).add(off);
        if (drag.wall) drag.target.clamp(ROOM_MIN, ROOM_MAX);   // не выходить за стены комнаты
        output();
      }
      return;
    }
    canvas.style.cursor = mode() && pick(e) ? 'grab' : '';
  });

  const end = () => { drag = null; canvas.style.cursor = ''; };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);

  // Alt/Option + колесо над надписью — размер; Shift + колесо — отступ (gap) между блоками
  canvas.addEventListener('wheel', (e) => {
    if (!e.altKey && !e.shiftKey) return;
    const m = mode(), h = m && pick(e);
    if (!h) return;
    e.preventDefault();
    const d = e.deltaY || e.deltaX;   // на Mac с Shift колесо крутит по горизонтали
    const k = Math.exp(-d * 0.0015), L = h.L;
    if (e.shiftKey) {
      const line = L.cfg.lines.find((l) => l.gap !== undefined);
      if (line) { line.gap = Math.max(0, Math.round(line.gap - d * 0.3)); layout(L); }
    } else if (m === 'wall') {
      L.cfg.width = Math.max(0.3, L.cfg.width * k);
      layout(L);
    } else {
      L.so = Math.max(0.1, L.so * k);
    }
    output(); wake();
  }, { passive: false });
}
