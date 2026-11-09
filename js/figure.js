// =====================================================================
//  ФИГУРА: шесть нарисованных поз тела + девять лиц.
//  Позы выровнены по ремню и низу джинсов (assets/figure/figure.json),
//  поэтому при смене меняются только руки. Голова садится на шею
//  той позы, что сейчас видна.
// =====================================================================
import * as THREE from './vendor/three.module.js';
import { POSE_KEYS, FACE_KEYS, HEAD_TILT, BODY_TILT, CROSSFADE, FIGURE_HEIGHT } from './config.js';
import { ss, rr } from './util.js';

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

  /* ---------- костюм выпускницы (экран University) ----------
     Мантия с отдельной поднятой кистью (машет) и голова в шапочке.
     Ткань мантии и шапочка вырезаны отдельно: они падают сверху и «надеваются». */
  const GW = meta.gown;
  const gown = new THREE.Group(); gown.visible = false; body.add(gown);
  const gownBody = plane(GW.src, W, H);
  gownBody.position.set(...toLocal(W / 2, H / 2), 0); gownBody.renderOrder = 150; gown.add(gownBody);
  // кисть крутится вокруг места, где предплечье уходит в рукав
  const [hx0, hy0, hw, hh] = GW.hand.box;
  const wrist = new THREE.Group(); wrist.position.set(...toLocal(...GW.hand.pivot), 0); gown.add(wrist);
  const handMesh = plane(GW.hand.src, hw, hh); handMesh.renderOrder = 151;
  const [hcx, hcy] = toLocal(hx0 + hw / 2, hy0 + hh / 2);
  handMesh.position.set(hcx - wrist.position.x, hcy - wrist.position.y, 0); wrist.add(handMesh);
  // шапочка (вырезана из рисунка) надевается на обычные лица — лицо остаётся тем же, что на других экранах
  const [, , cw, ch] = GW.cap.box;
  const cap = plane(GW.cap.src, cw * k, ch * k); cap.visible = false; cap.renderOrder = 165;
  cap.material.depthTest = false; scene.add(cap);
  // голова на мантии садится на 40 px ниже «пенька» шеи (иначе шея длинная)
  const gNeck = toLocal(GW.neck[0], GW.neck[1] + 40);
  // где шапочка сидит на голове: центр относительно точки шеи лица, в единицах лиц (подобрано по превью)
  const CAP_ON_HEAD = [2, 257.5];
  const capHome = new THREE.Vector3(gNeck[0] + CAP_ON_HEAD[0] * k * PX, gNeck[1] + CAP_ON_HEAD[1] * k * PX, 0.02);

  // мантия отдельно (только ткань) — она падает сверху и «надевается»
  const robe = plane(GW.robe, W, H); robe.visible = false; robe.renderOrder = 170; body.add(robe);
  const robeHome = new THREE.Vector3(...toLocal(W / 2, H / 2), 0);

  /* ---------- костюм (экран Context, политика) ----------
     Три позы: руки вверх (виден, когда снимается мантия), машет, руки вниз. Потом костюм рассыпается на квадратики — под ним снова джинсы. */
  const SU = meta.suit;
  const suitMesh = {};
  for (const [name, P] of Object.entries(SU.poses)) {
    // pad — запас холста по бокам (руки в стороны), центр тот же
    const m = plane(P.src, W + 2 * (P.pad || 0), H); m.position.set(...toLocal(W / 2, H / 2), 0); m.visible = false;
    body.add(m); suitMesh[name] = m;
  }
  const allSuit = Object.values(suitMesh);
  const CC = SU.crumble.cell;
  const ys0 = SU.crumble.cells.map((c) => c[1]), yMin = Math.min(...ys0), yMax = Math.max(...ys0);
  const pieces = SU.crumble.cells.map(([x, y]) => {
    const g = new THREE.PlaneGeometry(CC * PX, CC * PX);
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (x + uv.getX(i) * CC) / W, 1 - (y + (1 - uv.getY(i)) * CC) / H);
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: suitMesh.down.material.map, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
    const [lx, ly] = toLocal(x + CC / 2, y + CC / 2);
    m.position.set(lx, ly, 0.01); m.renderOrder = 155; m.visible = false; body.add(m);
    return {
      m, home: m.position.clone(),
      d: (1 - (y - yMin) / (yMax - yMin || 1)) * 0.4 + rr(0, 0.15),   // снизу вверх, с разбросом
      v: new THREE.Vector3((lx >= 0 ? 1 : -1) * rr(0.2, 1.1), rr(-0.3, 0.7), rr(0.2, 1.3)),
      rot: [rr(-3, 3), rr(-3, 3), rr(-4, 4)],
    };
  });

  // мягкая тень, пока пол цел
  const shadowTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
    const g = x.createRadialGradient(64, 64, 4, 64, 64, 62);
    g.addColorStop(0, 'rgba(0,0,0,.28)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c);
  })();
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.55), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.set(0, -2.98, 0.1); scene.add(shadow);
  // тень рисуется поверх пола целиком (иначе её срезает стык панелей), но под фигурой
  shadow.material.depthTest = false; shadow.renderOrder = 100;

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
  const lerpNeck = (a, b, w) => toLocal(a[0] + (b[0] - a[0]) * w, a[1] + (b[1] - a[1]) * w);

  // s = stage 0…5, t = время, ph = фазы мира, sf = номер экрана (0 Order, 1 University, 2 Context…)
  function update(s, t, ph, sf = 0) {
    const { fr, own, crack, fall } = ph;
    /* Надевание (Order → University): руки вверх и взгляд вверх → сверху падает мантия
       и садится на плечи → потом сверху падает шапочка.
       Снятие (University → Context): подпрыгивает и подбрасывает шапочку → мантия
       уходит вверх, под ней снова джинсы и поднятые руки → руки опускаются. */
    const armsIn = ss(0.05, 0.22, sf) * (1 - ss(0.5, 0.56, sf));  // руки навстречу мантии
    const drop = ss(0.18, 0.55, sf);                               // мантия падает
    const settle = ss(0.55, 0.7, sf);                              // мантия «оседает» на плечах
    const capFall = ss(0.6, 0.9, sf);                               // шапочка падает и садится
    const toss = ss(1.15, 1.8, sf);                                // шапочку подбрасывают
    const lift = ss(1.3, 1.65, sf);                                // мантия уходит вверх
    const inGown = sf >= 0.55 && sf < 1.3;
    // костюм: под мантией руки вверх → машет → руки вниз → рассыпается
    const toPresent = ss(1.5, 1.72, sf), toDown = ss(2.45, 2.7, sf), crumble = ss(3.1, 3.85, sf);
    const inSuit = sf >= 1.3 && crumble < 1;
    const look = sf < 1.05
      ? ss(0.05, 0.22, sf) * (1 - ss(0.9, 0.97, sf))               // смотрит вверх, пока всё падает
      : ss(1.12, 1.25, sf) * (1 - ss(1.6, 1.75, sf));              // и вслед улетающей шапочке

    gown.visible = inGown;
    if (inGown) {
      for (const m of allPoses) m.visible = false;
      const sq = Math.sin(Math.PI * settle);
      gown.scale.set(1 + 0.03 * sq, 1 - 0.05 * sq, 1);
      wrist.rotation.z = Math.sin(t * 6) * 0.2 * ss(0.65, 0.85, sf);   // машет
    } else if (inSuit && crumble === 0) {
      for (const m of allPoses) m.visible = false;
    } else if (sf < 1) {
      show(allPoses, poseMesh.down, poseMesh.up, armsIn, 150);
    } else {
      const [p0, p1, pw] = swap(POSE_KEYS, s);
      show(allPoses, poseMesh[p0], poseMesh[p1], pw, 146);   // под рассыпающимся костюмом
    }
    if (inSuit && crumble === 0) {
      if (sf < 2.2) show(allSuit, suitMesh.up, suitMesh.wave, toPresent, 150);
      else show(allSuit, suitMesh.wave, suitMesh.down, toDown, 150);
    } else for (const m of allSuit) m.visible = false;
    for (const P of pieces) {
      const k = ss(P.d, P.d + 0.42, crumble);
      P.m.visible = inSuit && crumble > 0 && k < 1;
      if (!P.m.visible) continue;
      P.m.position.copy(P.home).addScaledVector(P.v, k * 1.4); P.m.position.y -= k * k * 1.6;   // разлетаются и падают
      P.m.rotation.set(P.rot[0] * k, P.rot[1] * k, P.rot[2] * k);
      P.m.scale.setScalar(1 - 0.45 * k);
      P.m.material.opacity = 1 - ss(0.55, 1, k);
    }

    // лицо всегда обычное (шапочка — отдельная картинка поверх)
    if (inGown) neck.position.set(...gNeck, 0);
    else if (sf < 1) neck.position.set(...lerpNeck(meta.poses.down.neck, meta.poses.up.neck, armsIn), 0);
    else {
      const [p0, p1, pw] = swap(POSE_KEYS, s);
      const jn = [0, 1].map((i) => meta.poses[p0].neck[i] + (meta.poses[p1].neck[i] - meta.poses[p0].neck[i]) * pw);
      const w = inSuit ? crumble : 1;   // в костюме — шея костюма, пока он рассыпается — к джинсам
      neck.position.set(...lerpNeck(SU.poses.down.neck, jn, w), 0);
    }
    if (sf < 2) show(faces, faces[0], faces[8], look, 160);
    else {
      const [f0, f1, fw] = swap(FACE_KEYS, s);
      show(faces, faces[f0 - 1], faces[f1 - 1], fw, 160);
    }
    neck.rotation.z = -(byStage(HEAD_TILT, s) + Math.sin(t * 0.7) * 0.02);

    body.scale.set(1, 1 + Math.sin(t * 1.6) * 0.004, 1);   // дыхание
    const hop = Math.sin(Math.PI * ss(1.1, 1.3, sf)) * 0.28;   // подпрыгивает, подбрасывая шапочку
    fig.position.set(0, -2.93 + Math.sin(t * 1.1) * 0.05 * (0.3 + fr + fall) + fall * 0.35 + hop, 0);
    fig.rotation.set(0, 0, -byStage(BODY_TILT, s) + Math.sin(t * 0.25) * 0.06 * fr);
    shadow.material.opacity = (1 - crack) * (1 - hop * 1.2);

    // отдельная мантия: падает сверху (надевание) / уходит вверх (снятие)
    if (drop > 0 && sf < 0.55) {
      const e = drop * drop;
      robe.visible = true;
      robe.position.set(robeHome.x, robeHome.y + (1 - e) * 3.6, 0.03);
      robe.scale.set(0.78 + 0.22 * e, 1, 1);
      robe.material.opacity = ss(0, 0.12, drop);
    } else if (sf >= 1.3 && lift < 1) {
      const e = lift * lift;
      robe.visible = true;
      robe.position.set(robeHome.x, robeHome.y + e * 4.2, 0.03);
      robe.scale.set(1 - 0.22 * e, 1, 1);
      robe.material.opacity = 1 - ss(0.7, 1, lift);
    } else robe.visible = false;

    // шапочка: падает и садится на голову / потом её подбрасывают
    if (inGown && capFall > 0 && sf < 1.13) {
      const e = capFall * capFall, bounce = Math.sin(Math.PI * ss(0.86, 0.95, sf)) * 0.07;
      cap.visible = true;
      cap.position.set(capHome.x, fig.position.y + capHome.y + (1 - e) * 2.8 + bounce, capHome.z);
      cap.rotation.set((1 - capFall) * 0.6, 0, (1 - capFall) * Math.PI * 2);
      cap.material.opacity = 1;
    } else if (sf >= 1.13 && toss < 1) {
      const up = 1 - (1 - toss) * (1 - toss);
      cap.visible = true;
      cap.position.set(capHome.x + toss * 0.9, fig.position.y - hop + capHome.y + hop * (1 - toss) + up * 3.4, capHome.z + toss * 1.2);
      cap.rotation.set(toss * 1.1, toss * 2.2, toss * Math.PI * 3);
      cap.material.opacity = 1 - ss(0.75, 1, toss);
    } else cap.visible = false;
  }

  return { update };
}
