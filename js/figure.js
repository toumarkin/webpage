// =====================================================================
//  ФИГУРА: шесть нарисованных поз тела + девять лиц.
//  Позы выровнены по ремню и низу джинсов (assets/figure/figure.json),
//  поэтому при смене меняются только руки. Голова садится на шею
//  той позы, что сейчас видна.
// =====================================================================
import * as THREE from './vendor/three.module.js';
import { POSE_KEYS, FACE_KEYS, HEAD_TILT, BODY_TILT, CROSSFADE, FIGURE_HEIGHT } from './config.js';
import { ss } from './util.js';

export async function createFigure(scene) {
  const meta = await (await fetch('assets/figure/figure.json')).json();
  const PX = FIGURE_HEIGHT / meta.pose.figureHeight;   // единиц сцены на пиксель рисунка
  const W = meta.pose.width, H = meta.pose.height, SOLE = meta.pose.sole;
  const loader = new THREE.TextureLoader();

  const plane = (src, w, h) => {
    const t = loader.load(src); t.anisotropy = 4;
    return new THREE.Mesh(
      new THREE.PlaneGeometry(w * PX, h * PX),
      new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, side: THREE.DoubleSide }),
    );
  };
  // координаты рисунка (px, y вниз) → координаты фигуры (ноль = подошвы, по центру)
  const toLocal = (x, y) => [(x - W / 2) * PX, (SOLE - y) * PX];

  const fig = new THREE.Group(); scene.add(fig);
  const body = new THREE.Group(); fig.add(body);

  // позы
  const poseMesh = {};
  for (const [name, P] of Object.entries(meta.poses)) {
    const m = plane(P.src, W, H);
    const [cx, cy] = toLocal(W / 2, H / 2);
    m.position.set(cx, cy, 0); m.visible = false;
    body.add(m); poseMesh[name] = m;
  }
  const allPoses = Object.values(poseMesh);

  // лица (все в одном «суставе» шеи)
  const neck = new THREE.Group(); body.add(neck);
  const k = meta.faceScale;
  const faces = meta.faces.map((F) => {
    const m = plane(F.src, F.width * k, F.height * k);
    m.position.set((F.width / 2 - F.neck[0]) * k * PX, -(F.height / 2 - F.neck[1]) * k * PX, 0);
    m.visible = false; neck.add(m); return m;
  });

  // мягкая тень, пока пол цел
  const shadowTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
    const g = x.createRadialGradient(64, 64, 4, 64, 64, 62);
    g.addColorStop(0, 'rgba(0,0,0,.28)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c);
  })();
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.9), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.set(0, -2.98, 0.1); scene.add(shadow);

  /* ---------- смена кадров ---------- */
  // → [текущий ключ, следующий, вес следующего 0…1]
  function swap(keys, s) {
    let i = 0; while (i < keys.length - 2 && s > keys[i + 1][0]) i++;
    const mid = (keys[i][0] + keys[i + 1][0]) / 2;
    return [keys[i][1], keys[i + 1][1], ss(mid - CROSSFADE, mid + CROSSFADE, s)];
  }
  // значение из массива на 6 кадров, плавно между кадрами
  function byStage(arr, s) {
    const i = Math.min(4, Math.floor(s)), f = ss(0.2, 0.8, s - i);
    return arr[i] + (arr[Math.min(5, i + 1)] - arr[i]) * f;
  }
  // старая картинка держится, новая проявляется поверх, потом старая гаснет
  function show(list, cur, nxt, w, order) {
    for (const m of list) m.visible = false;
    if (nxt === cur) w = 0;
    const a = Math.min(1, 2 - 2 * w), b = Math.min(1, 2 * w);
    if (a > 0.001) { cur.visible = true; cur.material.opacity = a; cur.renderOrder = order; }
    if (b > 0.001) { nxt.visible = true; nxt.material.opacity = b; nxt.renderOrder = order + 1; }
  }

  /* ---------- кадр анимации ---------- */
  // s = stage 0…5, t = время, ph = фазы мира
  function update(s, t, ph) {
    const { fr, own, crack, fall } = ph;

    const [p0, p1, pw] = swap(POSE_KEYS, s);
    show(allPoses, poseMesh[p0], poseMesh[p1], pw, 150);

    const n0 = meta.poses[p0].neck, n1 = meta.poses[p1].neck;
    const [hx, hy] = toLocal(n0[0] + (n1[0] - n0[0]) * pw, n0[1] + (n1[1] - n0[1]) * pw);
    neck.position.set(hx, hy, 0);

    const [f0, f1, fw] = swap(FACE_KEYS, s);
    show(faces, faces[f0 - 1], faces[f1 - 1], fw, 160);
    neck.rotation.z = -(byStage(HEAD_TILT, s) + Math.sin(t * 0.7) * 0.02);

    body.scale.set(1, 1 + Math.sin(t * 1.6) * 0.004, 1);   // дыхание
    fig.position.set(0, -2.6 + Math.sin(t * 1.1) * 0.05 * (0.3 + fr + fall) + fall * 0.35, 0);
    fig.rotation.set(0, 0, -byStage(BODY_TILT, s) + Math.sin(t * 0.25) * 0.06 * fr);
    shadow.material.opacity = 1 - crack;
  }

  return { update };
}
