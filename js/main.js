// =====================================================================
//  ТОЧКА ВХОДА: рендер, камера, прокрутка → шкала времени, подписи.
// =====================================================================
import * as THREE from './vendor/three.module.js';
import { COLORS, STAGES } from './config.js';
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

let mx = 0, my = 0;   // лёгкий параллакс от мыши
addEventListener('pointermove', (e) => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; wake(); }, { passive: true });

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.fov = camera.aspect >= 1.2 ? 50 : Math.min(78, 50 + (1.2 - camera.aspect) * 36);   // шире угол на телефоне
  camera.updateProjectionMatrix();
  wake();
}
addEventListener('resize', resize);
resize(); readScroll(); prog = target;

/* ---------- подписи ---------- */
const numEl = document.getElementById('num'), labelEl = document.getElementById('label'), descEl = document.getElementById('desc');
const railEls = [...document.querySelectorAll('#rail li')], hintEl = document.getElementById('hint');
let shown = -1;
function hud(p) {
  const k = Math.min(5, Math.round(p * 5));
  if (k !== shown) {
    shown = k;
    numEl.textContent = String(k + 1).padStart(2, '0');
    labelEl.textContent = STAGES[k][0];
    descEl.textContent = STAGES[k][1];
    railEls.forEach((li, i) => li.classList.toggle('on', i === k));
  }
  hintEl.style.opacity = p > 0.03 ? 0 : 1;
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
  const p = prog, s = p * 5;

  // фазы всей истории
  const own = ss(0.84, 0.97, p);                          // новый порядок
  const ph = {
    crack: ss(0.12, 0.3, p),                               // трещины в полу
    fr: ss(0.6, 0.76, p) * (1 - ss(0.84, 0.95, p)),        // осколки дрейфуют
    own,
    fall: ss(0.5, 0.68, p) * (1 - own),                    // фигура «всплывает»
  };

  world.update(p, t, ph);
  figure.update(s, t, ph);

  const cz = 7 - ss(0.15, 0.6, p) * 1.2 + own * 0.9;
  camera.position.set(mx * 0.6, 0.15 - my * 0.4 + ss(0.12, 0.3, p) * 0.3 * (1 - own), cz);
  camera.lookAt(0, -0.3, -4);
  camera.rotateZ((ss(0.3, 0.62, p) * 0.07 + ph.fr * Math.sin(t * 0.3) * 0.03) * (1 - own));

  hud(p);
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);
