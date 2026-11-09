// =====================================================================
//  МИР: перспективная комната из панелей сетки, которая трескается,
//  гнётся, разлетается и собирается в новый порядок.
//  Всё управляется числом p (0…1) — долей прокрутки.
// =====================================================================
import * as THREE from './vendor/three.module.js';
import { COLORS, DESIGN_PROJECTS, WORK_CATEGORIES, TOOLS, WALL_TEXT, WALL_IMAGES, IMAGE_GRADE, ISRAEL_WALLS, FONT } from './config.js';
import { rnd, rr, ss, E } from './util.js';

export function createWorld(scene) {
  /* ---------- общий изгиб пространства (шейдер) ----------
     Каждая вершина грида проходит через warp(): закрутка вокруг оси взгляда
     + синусоидальные волны. uWarp и uTwist растут с прокруткой. */
  const G = {
    uWarp: { value: 0 }, uTwist: { value: 0 }, uTime: { value: 0 },
    uBg: { value: new THREE.Color(COLORS.paper) },
  };
  const WARP = /* glsl */`
    uniform float uWarp; uniform float uTwist; uniform float uTime;
    vec3 warp(vec3 p){
      float a = uTwist * (p.z + 10.0) * 0.045;
      float s = sin(a), c = cos(a);
      p.xy = vec2(c*p.x - s*p.y, s*p.x + c*p.y);
      p.x += uWarp * sin(p.y*0.5 + p.z*0.32 + uTime*0.35) * 0.7;
      p.y += uWarp * sin(p.x*0.42 - p.z*0.27 + uTime*0.25) * 0.55;
      p.z += uWarp * sin(p.x*0.3 + p.y*0.4) * 0.4;
      return p;
    }`;

  // Заливка панели (и бумажек/имени, если задана текстура)
  const fillMatBase = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(0xffffff) }, uOpacity: { value: 1 },
      uMap: { value: null }, uUseMap: { value: 0 }, uInkMap: { value: 0 },
      uImg: { value: null }, uImgOn: { value: 0 }, uUvRect: { value: new THREE.Vector4(0, 0, 1, 1) },
    },
    vertexShader: WARP + /* glsl */`
      varying vec3 vN; varying vec2 vUv; varying float vD;
      void main(){
        vec4 w = modelMatrix*vec4(position,1.0);
        w.xyz = warp(w.xyz);
        vN = mat3(modelMatrix)*normal; vUv = uv;
        vec4 mv = viewMatrix*w; vD = -mv.z;
        gl_Position = projectionMatrix*mv;
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uColor; uniform float uOpacity; uniform sampler2D uMap;
      uniform float uUseMap; uniform float uInkMap; uniform vec3 uBg;
      uniform sampler2D uImg; uniform float uImgOn; uniform vec4 uUvRect;   // кусок работы на панели (финал)
      varying vec3 vN; varying vec2 vUv; varying float vD;
      void main(){
        float sh = 0.95 + 0.05*abs(dot(normalize(vN), normalize(vec3(0.3,0.85,0.45))));
        vec3 col = uColor*sh; float a = uOpacity;
        if(uUseMap > 0.5){
          vec4 t = texture2D(uMap, vUv);
          if(uInkMap > 0.5){ if(t.a < 0.05) discard; col = vec3(0.086,0.09,0.1); a *= t.a; }
          else { col = t.rgb*sh; a *= t.a; }
        }
        if(uImgOn > 0.001) col = mix(col, texture2D(uImg, uUvRect.xy + vUv*uUvRect.zw).rgb, uImgOn);
        col = mix(col, uBg, smoothstep(22.0, 46.0, vD));   // дальнее растворяется в фоне
        gl_FragColor = vec4(col, a);
      }`,
    side: THREE.DoubleSide, transparent: true,
    polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
  });

  // Линии сетки
  const lineMatBase = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(COLORS.line) }, uOpacity: { value: 1 } },
    vertexShader: WARP + /* glsl */`
      varying float vD;
      void main(){
        vec4 w = modelMatrix*vec4(position,1.0);
        w.xyz = warp(w.xyz);
        vec4 mv = viewMatrix*w; vD = -mv.z;
        gl_Position = projectionMatrix*mv;
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uColor; uniform float uOpacity; uniform vec3 uBg; varying float vD;
      void main(){
        float f = smoothstep(16.0, 44.0, vD);
        gl_FragColor = vec4(mix(uColor, uBg, f*0.85), uOpacity*(1.0-f*0.6));
      }`,
    transparent: true,
  });

  // Клон материала с общими (глобальными) uniform-ами изгиба
  function mats() {
    const f = fillMatBase.clone(), l = lineMatBase.clone();
    for (const m of [f, l]) {
      m.uniforms.uWarp = G.uWarp; m.uniforms.uTwist = G.uTwist;
      m.uniforms.uTime = G.uTime; m.uniforms.uBg = G.uBg;
    }
    return [f, l];
  }

  /* ---------- геометрия панели: 2×2 единицы, клетка 1×1 ---------- */
  const fillGeo = new THREE.PlaneGeometry(2, 2, 10, 10);
  const lineGeo = (() => {
    const pts = [], seg = 16;   // линии разбиты на отрезки, чтобы красиво гнуться
    for (const c of [-1, 0, 1]) {
      for (let i = 0; i < seg; i++) {
        const a = -1 + 2 * i / seg, b = -1 + 2 * (i + 1) / seg;
        pts.push(c, a, 0, c, b, 0, a, c, 0, b, c, 0);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return g;
  })();

  /* ---------- комната: x∈[-5,5], y∈[-3,5], z∈[-10,8] ---------- */
  const panels = [];
  function addPanel(pos, quat, face) {
    const g = new THREE.Group(); const [fm, lm] = mats();
    g.add(new THREE.Mesh(fillGeo, fm)); g.add(new THREE.LineSegments(lineGeo, lm));
    g.position.copy(pos); g.quaternion.copy(quat); scene.add(g);
    panels.push({ g, fm, lm, face, P0: pos.clone(), Q0: quat.clone() });
  }
  const zs = []; for (let z = -9; z <= 7; z += 2) zs.push(z);
  for (const x of [-4, -2, 0, 2, 4]) for (const z of zs) {
    addPanel(new THREE.Vector3(x, -3, z), E(-Math.PI / 2, 0, 0), 'floor');
    addPanel(new THREE.Vector3(x, 5, z), E(Math.PI / 2, 0, 0), 'ceil');
  }
  for (const y of [-2, 0, 2, 4]) for (const z of zs) {
    addPanel(new THREE.Vector3(-5, y, z), E(0, Math.PI / 2, 0), 'left');
    addPanel(new THREE.Vector3(5, y, z), E(0, -Math.PI / 2, 0), 'right');
  }
  for (const x of [-4, -2, 0, 2, 4]) for (const y of [-2, 0, 2, 4]) addPanel(new THREE.Vector3(x, y, -10), E(0, 0, 0), 'back');

  /* ---------- хореография каждой панели ----------
     P0/Q0 — место в комнате, Pc/Qc — трещина (пол), Pb/Qb — разлёт,
     Po/Qo — место в новом порядке (финал). */
  // доски нового порядка в финале: на каждой — работа из DESIGN_PROJECTS (по порядку).
  // Расставлены так, чтобы не лезть под надписи (слева) и подписи экрана (снизу слева).
  const CLUSTERS = [
    { c: [0.7, 3.1, -5.5], e: [0.1, -0.05, 0.02] },    // сверху по центру
    { c: [4.9, 3.35, -5.5], e: [0.1, -0.4, 0.04] },    // сверху справа
    { c: [4.1, 0.15, -2.6], e: [0, -0.5, -0.02] },     // справа
    { c: [3.5, -2.5, -1.0], e: [-0.3, -0.4, 0.02] },   // снизу справа
    { c: [-3.15, -3.7, -4.6], e: [-0.55, 0.35, 0] },   // снизу слева, между подписью экрана и фигурой
    { c: [-10.4, 3.3, -8.2], e: [0.1, 0.55, 0] },      // в левом верхнем углу, левее подписи под именем
    { c: [10.4, 2.9, -6.8], e: [0.1, -0.65, 0] },      // в правом верхнем углу, у края
  ];
  const BOARD = 0.5;   // масштаб панели на доске (доска 4 × 2 панели = 4 × 2 единицы)
  const ACCENTS = COLORS.accents.map((c) => new THREE.Color(c));
  const WHITE = new THREE.Color(0xffffff);
  const order = panels.map((_, i) => i).sort(() => rnd() - 0.5);
  // проект может входить в несколько разделов (cat — строка или массив)
  const inCat = (P, key) => [].concat(P.cat || []).includes(key);
  const FINAL_CAM = new THREE.Vector3(0, 0.15, 6.7);
  const texLoader = new THREE.TextureLoader();
  // доски финала: сначала разделы (WORK_CATEGORIES), потом проекты (DESIGN_PROJECTS); у каждой 4 × 2 панели
  // обложка доски проекта — как верх окна проекта: hero + крупный заголовок цветами проекта (look)
  const projTex = DESIGN_PROJECTS.map((P, i) => projectCover(P, i));
  function projectCover(P, i) {
    const W = 2048, H = 1024, c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d'), L = P.look || {}, tex = new THREE.CanvasTexture(c); tex.anisotropy = 8;
    const FAM = 'Anton, Impact, "Arial Narrow", sans-serif', MONO = '"JetBrains Mono", Menlo, monospace';
    let img = null;
    const draw = () => {
      x.fillStyle = L.bg || P.colors?.[0] || '#16171a'; x.fillRect(0, 0, W, H);
      const split = L.full ? (L.titleAt || 0.6) : 0.6;     // где начинается колонка заголовка
      if (img) {
        if (L.full) {   // фото на весь блок (как object-fit: cover, прижато влево)
          const sc = Math.max(W / img.width, H / img.height);
          x.drawImage(img, 0, (H - img.height * sc) / 2, img.width * sc, img.height * sc);
        } else {        // фото целиком слева, вокруг — цвет его кромки
          const bw = W * split, sc = Math.min(bw / img.width, H / img.height), dw = img.width * sc, dh = img.height * sc;
          const t = document.createElement('canvas'); t.width = t.height = 8; const tx = t.getContext('2d'); tx.drawImage(img, 0, 0, 8, 8);
          const d = tx.getImageData(0, 0, 8, 8).data; let r = 0, g = 0, b = 0, n = 0;
          for (let k = 0; k < 8; k++) for (const [px, py] of [[k, 0], [k, 7], [0, k], [7, k]]) { const o = (py * 8 + px) * 4; r += d[o]; g += d[o + 1]; b += d[o + 2]; n++; }
          x.fillStyle = `rgb(${r / n | 0},${g / n | 0},${b / n | 0})`; x.fillRect(0, 0, bw, H);
          x.drawImage(img, (bw - dw) / 2, (H - dh) / 2, dw, dh);
        }
      }
      // заголовок: подбираем размер под ширину колонки и высоту
      const left = W * split + 60, colW = W - left - 70, lines = L.lines || [P.title];
      let size = 260 * (L.titleScale || 1);
      const widest = () => Math.max(...lines.map((l) => { x.font = `400 ${size}px ${FAM}`; return x.measureText(l.replace(/\*$/, '').toUpperCase()).width; }));
      while (size > 40 && (widest() > colW || lines.length * size * 0.88 > H * 0.62)) size -= 6;
      const blockH = 50 + lines.length * size * 0.88 + 70;
      let y = L.titleTop ? 150 : (H - blockH) / 2 + 40;
      const ink = L.ink || '#fff', text = L.text || '#fff';
      x.fillStyle = text; x.font = `500 30px ${MONO}`; x.textBaseline = 'alphabetic';
      if ('letterSpacing' in x) x.letterSpacing = '4px';
      x.fillText(`${String(i + 1).padStart(2, '0')} / ${(L.kind || P.sub || '').toUpperCase()}`, left, y, colW);   // maxWidth — ужимается, не вылезает
      if ('letterSpacing' in x) x.letterSpacing = '0px';
      y += 24;
      for (const l of lines) {
        y += size * 0.88; const t = l.replace(/\*$/, '').toUpperCase(); x.font = `400 ${size}px ${FAM}`;
        if (l.endsWith('*')) { x.lineWidth = Math.max(3, size / 60); x.strokeStyle = ink; x.strokeText(t, left, y); }
        else { x.fillStyle = ink; x.fillText(t, left, y); }
      }
      if (L.place) {
        x.fillStyle = text; x.font = `500 30px ${MONO}`; if ('letterSpacing' in x) x.letterSpacing = '6px';
        x.fillText(L.place.toUpperCase(), left, y + 70, colW); if ('letterSpacing' in x) x.letterSpacing = '0px';
      }
      tex.needsUpdate = true;
    };
    const src = P.hero || P.board || P.src;
    if (src) { const im = new Image(); im.onload = () => { img = im; draw(); }; im.src = src; }
    draw();
    Promise.all([document.fonts?.load(`400 100px Anton`), document.fonts?.load(`500 30px "JetBrains Mono"`)]).then(draw).catch(() => {});
    return tex;
  }
  const catTex = WORK_CATEGORIES.map((C) => categoryTexture(C));
  const BOARDS = [
    ...WORK_CATEGORIES.map((C, i) => ({ kind: 'cat', idx: i, tex: catTex[i] })),
    ...DESIGN_PROJECTS.map((P, i) => ({ kind: 'proj', idx: i, tex: projTex[i] })),
  ];
  const clusterSlots = []; BOARDS.forEach((_, k) => { for (let j = 0; j < 8; j++) clusterSlots.push([k, j]); });
  // в каком порядке проекты раздела занимают места (CLUSTERS)
  const PROJECT_SLOTS = [2, 0, 1, 3, 5, 4, 6];   // 6-е место (у правого края) — только если проектов 7
  const CAT_SCALE = 0.46;
  // места досок-разделов: ровный столбик справа от фигуры, одинаковый размер и равные промежутки
  const CAT_SPOTS = [
    { c: [5.8, 4.3, -7.0], e: [0.06, -0.25, 0.01] },
    { c: [5.8, 1.95, -7.0], e: [0.02, -0.25, 0] },
    { c: [5.8, -0.4, -7.0], e: [-0.02, -0.25, 0] },
    { c: [5.8, -2.75, -7.0], e: [-0.06, -0.25, -0.01] },
  ];

  // обложка раздела: цвет, коллаж из работ, крупный заголовок, число проектов
  function categoryTexture(C) {
    const c = document.createElement('canvas'); c.width = 2048; c.height = 1024; const x = c.getContext('2d');
    const projects = DESIGN_PROJECTS.filter((P) => inCat(P, C.key));
    const tex = new THREE.CanvasTexture(c); tex.anisotropy = 8;
    const imgs = [];
    const draw = () => {
      x.fillStyle = C.bg; x.fillRect(0, 0, 2048, 1024);
      // коллаж: до трёх работ веером слева
      imgs.slice(0, 3).forEach((im, k) => {
        x.save(); x.translate(560 + k * 70, 300 + k * 230); x.rotate((k - 1) * 0.06);
        x.shadowColor = 'rgba(0,0,0,.35)'; x.shadowBlur = 40; x.shadowOffsetY = 16;
        x.drawImage(im, -460, -230, 920, 460); x.restore();
      });
      x.fillStyle = C.ink; x.textBaseline = 'alphabetic';
      const right = projects.length ? 1180 : 140, maxW = 2048 - right - 110;
      let size = 330; const fam = 'Anton, Impact, "Arial Narrow", sans-serif';
      const widest = () => Math.max(...C.lines.map((l) => { x.font = `400 ${size}px ${fam}`; return x.measureText(l.replace(/\*$/, '').toUpperCase()).width; }));
      while (size > 80 && widest() > maxW) size -= 8;
      C.lines.forEach((l, k) => {
        const txt = l.replace(/\*$/, '').toUpperCase(), y = 200 + (k + 1) * size * 0.9;
        x.font = `400 ${size}px ${fam}`;
        if (l.endsWith('*')) { x.lineWidth = 6; x.strokeStyle = C.ink; x.strokeText(txt, right, y); } else x.fillText(txt, right, y);
      });
      x.font = '500 46px "JetBrains Mono", Menlo, monospace';
      x.fillText(projects.length ? `${String(projects.length).padStart(2, '0')} ${projects.length === 1 ? 'PROJECT' : 'PROJECTS'}  ·  OPEN ↗` : 'COMING SOON', right, 900);
      tex.needsUpdate = true;
    };
    projects.slice(0, 3).forEach((P) => { const im = new Image(); im.onload = () => { imgs.push(im); draw(); }; im.src = P.board || P.src; });
    draw(); document.fonts?.load('400 100px Anton').then(draw).catch(() => {});
    return tex;
  }
  // поставить панель доски на место slot (масштаб scale); если доска смотрит от камеры — зеркалим картинку
  function placePanel(p, slot, scale) {
    const C = typeof slot === 'number' ? CLUSTERS[slot] : slot, q = E(...C.e), j = p.j;
    const off = new THREE.Vector3(((j % 4) - 1.5) * 2 * scale, (Math.floor(j / 4) - 0.5) * 2 * scale, 0).applyQuaternion(q);
    p.Po = new THREE.Vector3(...C.c).add(off);
    p.Qo = q.clone().multiply(p.jitter);
    p.So = scale;
    const col = j % 4, row = Math.floor(j / 4), w = 1 / 4, h = 1 / 2;
    const back = new THREE.Vector3(0, 0, 1).applyQuaternion(q).dot(FINAL_CAM.clone().sub(new THREE.Vector3(...C.c))) < 0;
    p.uv = back ? new THREE.Vector4((4 - col) * w, row * h, -w, h) : new THREE.Vector4(col * w, row * h, w, h);
    p.uvSet = false;
  }
  // раздел открыт → проекты раздела по местам
  function layoutCategory(key) {
    const list = DESIGN_PROJECTS.map((P, i) => i).filter((i) => inCat(DESIGN_PROJECTS[i], key));
    // 1–2 проекта — крупные доски столбиком между фигурой и меню; больше — по местам вокруг фигуры
    const FEW = list.length === 1 ? [{ c: [5.6, 0.7, -7.0], e: [0, -0.25, 0] }]
      : [{ c: [5.6, 2.7, -7.0], e: [0.04, -0.25, 0.01] }, { c: [5.6, -1.3, -7.0], e: [-0.04, -0.25, -0.01] }];
    for (const p of panels) if (p.kind === 'proj') {
      const n = list.indexOf(p.idx);
      p.inCat = n >= 0;
      if (p.inCat) list.length <= 2 ? placePanel(p, FEW[n], 0.75) : placePanel(p, PROJECT_SLOTS[n], BOARD);
    }
  }
  const center = new THREE.Vector3(0, 1, -1);

  panels.forEach((p) => {
    // когда отрывается: сначала пол, потом стены, потолок, задняя стена
    const startBy = { floor: 0.49, left: 0.53, right: 0.54, ceil: 0.57, back: 0.62 }[p.face];   // после того как рассыпется Израиль
    p.bs = startBy + rnd() * 0.08;
    // трещина (только пол, сильнее под ногами)
    const near = p.face === 'floor' ? Math.max(0, 1 - Math.hypot(p.P0.x, p.P0.z) / 9) : 0;
    p.Pc = p.P0.clone().add(new THREE.Vector3(0, -rr(0.1, 0.9) * near, 0));
    p.Qc = p.Q0.clone().multiply(E(rr(-0.4, 0.4) * near, rr(-0.4, 0.4) * near, rr(-0.2, 0.2) * near));
    // разлёт: 30% панелей становятся мелкими осколками рядом с фигурой
    if (rnd() < 0.3) {
      p.Pb = new THREE.Vector3(rr(-4.5, 4.5), rr(-2.2, 4.2), rr(-4, 2.5));
      if (Math.abs(p.Pb.x) < 1.3 && p.Pb.z > -2) p.Pb.x += p.Pb.x < 0 ? -2 : 2;   // не закрывать фигуру
      p.Sb = rr(0.3, 0.65);
    } else {
      const d = p.P0.clone().sub(center).normalize();
      p.Pb = p.P0.clone().add(d.multiplyScalar(rr(3, 9))).add(new THREE.Vector3(rr(-2, 2), rr(-2, 2), rr(-2, 2)));
      p.Sb = 1;
    }
    p.Qb = p.Q0.clone().multiply(E(rr(-1.6, 1.6), rr(-1.6, 1.6), rr(-1.6, 1.6)));
    p.axis = new THREE.Vector3(rr(-1, 1), rr(-1, 1), rr(-1, 1)).normalize();
    p.ph = rr(0, 6.28); p.sp = rr(0.4, 1.2) * (rnd() < 0.5 ? -1 : 1);
    p.col = WHITE; p.So = p.Sb;
  });
  order.slice(0, clusterSlots.length).forEach((idx, n) => {
    const p = panels[idx], [k, j] = clusterSlots[n], B = BOARDS[k];
    p.cluster = true; p.kind = B.kind; p.idx = B.idx; p.j = j; p.board = B.tex;
    p.jitter = E(rr(-0.03, 0.03), rr(-0.03, 0.03), rr(-0.03, 0.03));   // чуть неровно — «свои» правила
    if (B.kind === 'cat') { placePanel(p, CAT_SPOTS[WORK_CATEGORIES[B.idx].slot], CAT_SCALE); p.g.children[0].userData.cat = WORK_CATEGORIES[B.idx].key; }
    else { p.g.children[0].userData.project = B.idx; p.inCat = false; placePanel(p, 0, BOARD); }
  });
  const view = { cat: null, target: 0, sel: 0, lastT: 0 };   // открытый раздел и плавный переход 0 (разделы) → 1 (проекты)

  /* ---------- надписи на стенах ----------
     Текст из config.js (WALL_TEXT) рисуется в canvas шрифтом Helvetica и
     кладётся на стену. Вместе со стенами надписи отрываются (Pb/Qb),
     а в финале встают на свои места (Po/Qo). Позиция = центр надписи. */
  function textTexture(lines) {
    const c = document.createElement('canvas'), x = c.getContext('2d');
    const font = (L) => `${L.weight || 400} ${L.size}px ${FONT}`;
    const pad = 16;
    let w = 0, h = pad * 2;
    for (const L of lines) {
      x.font = font(L); if ('letterSpacing' in x) x.letterSpacing = `${(L.track || 0) * L.size}px`;
      w = Math.max(w, x.measureText(L.text).width);
      h += (L.gap || 0) + L.size * L.lh;
    }
    c.width = Math.ceil(w + pad * 2); c.height = Math.ceil(h);
    x.fillStyle = '#000'; x.textBaseline = 'alphabetic';
    let y = pad;
    for (const L of lines) {
      x.font = font(L); if ('letterSpacing' in x) x.letterSpacing = `${(L.track || 0) * L.size}px`;
      y += L.gap || 0;
      x.fillText(L.text, pad, y + L.size * (0.76 + (L.lh - 1) / 2));
      y += L.size * L.lh;
    }
    const t = new THREE.CanvasTexture(c); t.anisotropy = 8;
    return { tex: t, aspect: c.width / c.height };
  }
  // (пере)рисовать текст надписи по её cfg — нужно и при старте, и редактору
  function layout(label) {
    const { tex, aspect } = textTexture(label.cfg.lines);
    const old = label.mesh.material.uniforms.uMap.value;
    label.mesh.material.uniforms.uMap.value = tex; if (old) old.dispose();
    label.mesh.geometry.dispose();
    label.mesh.geometry = new THREE.PlaneGeometry(label.cfg.width, label.cfg.width / aspect, 12, 6);
    label.aspect = aspect;
  }
  const labels = WALL_TEXT.map((L) => {
    const [m] = mats(); m.uniforms.uUseMap.value = 1; m.uniforms.uInkMap.value = 1;
    m.depthTest = false; m.depthWrite = false;   // текст всегда читается поверх обломков…
    const mesh = new THREE.Mesh(new THREE.BufferGeometry(), m);
    mesh.renderOrder = 140;   // …но под фигурой (у неё 150+)
    scene.add(mesh);
    const V = (a) => new THREE.Vector3(...a);
    // у надписи «только для экранов» нет разлёта и финала — она стоит на стене
    const label = {
      cfg: L, mesh, bs: L.breakAt ?? 2, so: L.finalScale ?? 1,
      P0: V(L.wall), Q0: E(...L.wallRot), Pb: V(L.fly || L.wall), Qb: E(...(L.flyRot || L.wallRot)),
      Po: V(L.final || L.wall), Qo: E(...(L.finalRot || L.wallRot)),
    };
    layout(label);
    return label;
  });

  /* ---------- проекты (экран Design) ----------
     Карточки из DESIGN_PROJECTS: картинка проекта + подпись. Пока картинки нет —
     типографская карточка в цветах проекта. Кружат вокруг фигуры, в финале встают на home. */
  const CARD_W = 1.75;   // ширина карточки в единицах сцены
  function projectCard(P, img) {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 768; const x = c.getContext('2d');
    const [bg, ink, acc] = P.colors, IH = 640;   // IH — высота картинки, ниже подпись
    if (img) {
      const s = Math.max(1024 / img.width, IH / img.height);
      x.drawImage(img, (1024 - img.width * s) / 2, (IH - img.height * s) / 2, img.width * s, img.height * s);
    } else {
      x.fillStyle = bg; x.fillRect(0, 0, 1024, IH);
      x.fillStyle = acc; x.beginPath(); x.arc(780, 250, 190, 0, 6.283); x.fill();
      x.fillStyle = ink; x.textBaseline = 'alphabetic';
      const words = P.title.split(' '); let fs = 132;
      x.font = `800 ${fs}px ${FONT}`;
      while (fs > 40 && Math.max(...words.map((w) => x.measureText(w).width)) > 860) { fs -= 6; x.font = `800 ${fs}px ${FONT}`; }
      words.forEach((w, i) => x.fillText(w, 64, IH - 70 - (words.length - 1 - i) * fs * 0.98));
    }
    x.fillStyle = '#16171a'; x.fillRect(0, IH, 1024, 768 - IH);
    x.fillStyle = '#fafaf7'; x.font = `700 46px ${FONT}`; x.textBaseline = 'middle';
    x.fillText(P.title, 40, IH + 48);
    x.fillStyle = '#a7a9b0'; x.font = '500 26px "JetBrains Mono", Menlo, monospace';
    x.fillText(P.sub.toUpperCase(), 40, IH + 98);
    const t = new THREE.CanvasTexture(c); t.anisotropy = 8; return t;
  }
  const notes = [];
  DESIGN_PROJECTS.forEach((P, i) => {
    const [m] = mats(); m.uniforms.uUseMap.value = 1; m.uniforms.uOpacity.value = 0;
    m.uniforms.uMap.value = projectCard(P, null);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(CARD_W, CARD_W * 0.75, 6, 6), m);
    m.depthTest = false; mesh.renderOrder = 120; scene.add(mesh);   // поверх обломков, под надписями и фигурой
    let img = null;
    const redraw = () => { const old = m.uniforms.uMap.value; m.uniforms.uMap.value = projectCard(P, img); old.dispose(); };
    if (P.src) { const im = new Image(); im.onload = () => { img = im; redraw(); }; im.src = P.src; }
    document.fonts?.ready.then(redraw);   // подпись — загруженным шрифтом
    const C = CAT_SPOTS[(WORK_CATEGORIES.find((K) => inCat(P, K.key)) || WORK_CATEGORIES[0]).slot];   // в финале карточка улетает в доску своего раздела
    mesh.userData.project = i;
    notes.push({ mesh, m, ph: rr(0, 6.28), r: rr(2.8, 4.4), y: rr(-1.6, 3.2), Po: new THREE.Vector3(...C.c), Qo: E(...C.e) });
  });

  /* ---------- инструменты (экран Fragments) ----------
     Иконки программ и языков из TOOLS (config.js) рисуются в canvas и кружат вокруг фигуры. */
  function toolTexture(T) {
    const N = 256, c = document.createElement('canvas'); c.width = c.height = N; const x = c.getContext('2d');
    const rr2 = (r, fill) => { x.beginPath(); x.roundRect ? x.roundRect(8, 8, N - 16, N - 16, r) : x.rect(8, 8, N - 16, N - 16); x.fillStyle = fill; x.fill(); };
    const text = (str, size, color, y = N / 2, weight = 800, font = FONT) => {
      x.fillStyle = color; x.font = `${weight} ${size}px ${font}`; x.textAlign = 'center'; x.textBaseline = 'middle';
      let s = size; while (x.measureText(str).width > N - 56 && s > 20) { s -= 4; x.font = `${weight} ${s}px ${font}`; }
      x.fillText(str, N / 2, y);
    };
    x.shadowColor = 'rgba(0,0,0,.25)'; x.shadowBlur = 10; x.shadowOffsetY = 4;
    switch (T.key) {
      case 'figma': {
        rr2(48, '#1e1e1e'); x.shadowColor = 'transparent';
        const u = 34, cx = N / 2 - u / 2, y0 = N / 2 - u * 1.5;
        const blob = (bx, by, col, r = [u / 2, u / 2, u / 2, u / 2]) => { x.beginPath(); x.roundRect(bx, by, u, u, r); x.fillStyle = col; x.fill(); };
        blob(cx - u / 2, y0, '#f24e1e', [u / 2, 0, 0, u / 2]); blob(cx + u / 2, y0, '#ff7262', [0, u / 2, u / 2, 0]);
        blob(cx - u / 2, y0 + u, '#a259ff', [u / 2, 0, 0, u / 2]);
        x.beginPath(); x.arc(cx + u, y0 + u * 1.5, u / 2, 0, 6.283); x.fillStyle = '#1abcfe'; x.fill();
        blob(cx - u / 2, y0 + u * 2, '#0acf83', [u / 2, 0, u / 2, u / 2]);
        break;
      }
      case 'js': rr2(30, '#f7df1e'); x.shadowColor = 'transparent'; x.fillStyle = '#16171a'; x.font = `800 110px ${FONT}`; x.textAlign = 'right'; x.textBaseline = 'alphabetic'; x.fillText('JS', N - 34, N - 34); break;
      case 'angular': {
        x.shadowColor = 'transparent'; x.beginPath();
        x.moveTo(N / 2, 18); x.lineTo(N - 30, 58); x.lineTo(N - 46, 196); x.lineTo(N / 2, 240); x.lineTo(46, 196); x.lineTo(30, 58); x.closePath();
        x.fillStyle = '#dd0031'; x.fill(); text('A', 130, '#ffffff', N / 2 + 8, 900);
        break;
      }
      case 'php': x.shadowColor = 'transparent'; x.beginPath(); x.ellipse(N / 2, N / 2, N / 2 - 12, N / 2 - 60, 0, 0, 6.283); x.fillStyle = '#777bb4'; x.fill(); text('php', 84, '#ffffff', N / 2, 800, 'Georgia, serif'); break;
      case 'wordpress': x.shadowColor = 'transparent'; x.beginPath(); x.arc(N / 2, N / 2, N / 2 - 14, 0, 6.283); x.fillStyle = '#21759b'; x.fill();
        x.beginPath(); x.arc(N / 2, N / 2, N / 2 - 30, 0, 6.283); x.lineWidth = 8; x.strokeStyle = '#fff'; x.stroke(); text('W', 120, '#ffffff', N / 2 + 4, 700, 'Georgia, serif'); break;
      case 'unity': {
        rr2(36, '#16171a'); x.shadowColor = 'transparent'; x.strokeStyle = '#fff'; x.lineWidth = 12; x.lineJoin = 'round';
        const cx = N / 2, cy = 104, r = 54;
        x.beginPath(); x.moveTo(cx, cy - r); x.lineTo(cx + r, cy - r / 2); x.lineTo(cx + r, cy + r / 2); x.lineTo(cx, cy + r); x.lineTo(cx - r, cy + r / 2); x.lineTo(cx - r, cy - r / 2); x.closePath(); x.stroke();
        x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx, cy + r); x.moveTo(cx, cy); x.lineTo(cx + r, cy - r / 2); x.moveTo(cx, cy); x.lineTo(cx - r, cy - r / 2); x.stroke();
        text('unity', 46, '#ffffff', 206, 700);
        break;
      }
      default:
        if (T.style === 'adobe') {
          rr2(44, T.bg); x.shadowColor = 'transparent';
          x.lineWidth = 10; x.strokeStyle = T.ink; x.beginPath(); x.roundRect ? x.roundRect(26, 26, N - 52, N - 52, 30) : x.rect(26, 26, N - 52, N - 52); x.stroke();
          text(T.label, T.sub ? 110 : 120, T.ink, T.sub ? N / 2 - 14 : N / 2 + 4, 700);
          if (T.sub) text(T.sub, 34, T.ink, N / 2 + 62, 600, '"JetBrains Mono", monospace');
        } else {
          rr2(36, T.bg); x.shadowColor = 'transparent';
          text(T.label, 92, T.ink, T.sub ? N / 2 - 16 : N / 2, 800);
          if (T.sub) text(T.sub, 40, T.ink, N / 2 + 60, 600, '"JetBrains Mono", monospace');
        }
    }
    const t = new THREE.CanvasTexture(c); t.anisotropy = 8; return t;
  }
  const tools = TOOLS.map((T, i) => {
    const [m] = mats(); m.uniforms.uUseMap.value = 1; m.uniforms.uOpacity.value = 0; m.uniforms.uMap.value = toolTexture(T);
    m.depthTest = false;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.62), m); mesh.renderOrder = 126; mesh.visible = false; scene.add(mesh);
    document.fonts?.ready.then(() => { const old = m.uniforms.uMap.value; m.uniforms.uMap.value = toolTexture(T); old.dispose(); });
    return { mesh, m, ph: rr(0, 6.28), r: rr(2.3, 4.6), y: rr(-2.2, 3.8), sp: rr(0.12, 0.26) * (i % 2 ? 1 : -1), spin: rr(-0.5, 0.5), delay: rr(0, 0.05) };
  });

  /* ---------- картинки на стенах ----------
     Картинка из WALL_IMAGES (config.js) режется на квадратики ровно по клеткам
     грида. На экране Context квадратики переворачиваются и встают на стену,
     потом по одному дрожат, отрываются и разлетаются вместе с осколками. */
  const WALLS = {   // dir: куда идёт «вправо» по картинке вдоль оси стены
    left: { axis: 'z', dir: -1, q: E(0, Math.PI / 2, 0), n: new THREE.Vector3(1, 0, 0), at: (u, y) => new THREE.Vector3(-5, y, u) },
    right: { axis: 'z', dir: 1, q: E(0, -Math.PI / 2, 0), n: new THREE.Vector3(-1, 0, 0), at: (u, y) => new THREE.Vector3(5, y, u) },
    back: { axis: 'x', dir: 1, q: E(0, 0, 0), n: new THREE.Vector3(0, 0, 1), at: (u, y) => new THREE.Vector3(u, y, -10) },
  };
  const TONES = {   // цвета заглушек
    ink: ['#3a3d44', '#14161a'], steel: ['#a3acb8', '#4b5562'],
    warm: ['#c9b49a', '#6f6256'], navy: ['#2f4466', '#111d31'],
  };
  const CELL_PX = 160;   // пикселей текстуры на клетку

  // фото в прямоугольник (как object-fit: cover, с точкой фокуса) + общая цветокоррекция
  function drawPhoto(x, img, rx, ry, rw, rh, focus) {
    const s = Math.max(rw / img.width, rh / img.height), dw = img.width * s, dh = img.height * s;
    const [fx, fy] = focus || [0.5, 0.5], gr = IMAGE_GRADE;
    x.save(); x.beginPath(); x.rect(rx, ry, rw, rh); x.clip();
    x.filter = `saturate(${gr.saturate}) contrast(${gr.contrast})`;
    x.drawImage(img, rx + (rw - dw) * fx, ry + (rh - dh) * fy, dw, dh);
    x.filter = 'none';
    x.globalCompositeOperation = 'soft-light'; x.globalAlpha = gr.tintAmount;
    x.fillStyle = gr.tint; x.fillRect(rx, ry, rw, rh);
    x.globalCompositeOperation = 'screen'; x.globalAlpha = gr.lift;
    x.fillStyle = '#fafaf7'; x.fillRect(rx, ry, rw, rh);
    x.restore();
  }

  function paintImage(c, cfg, img) {
    const x = c.getContext('2d'), W = c.width, H = c.height, C = CELL_PX;
    if (img) drawPhoto(x, img, 0, 0, W, H, cfg.focus);
    else {     // графичная плашка: тон + растр точками
      const [a, b] = TONES[cfg.tone] || TONES.steel;
      const g = x.createLinearGradient(0, 0, W * 0.4, H); g.addColorStop(0, a); g.addColorStop(1, b);
      x.fillStyle = g; x.fillRect(0, 0, W, H);
      x.fillStyle = 'rgba(255,255,255,.13)';
      for (let yy = 6; yy < H; yy += 12) for (let xx = 6; xx < W; xx += 12) {
        const v = 0.5 + 0.5 * Math.sin(xx * 0.004 + yy * 0.007) * Math.cos(xx * 0.0023 - yy * 0.003);
        x.beginPath(); x.arc(xx, yy, 0.6 + v * 4.2, 0, 6.283); x.fill();
      }
    }
    if (cfg.tag) {   // плашка: высота и ширина — целое число клеток
      const lines = cfg.tag.toUpperCase().split('\n'), fs = Math.round(C * 0.42), lh = fs * 1.05;
      x.font = `700 ${fs}px ${FONT}`; if ('letterSpacing' in x) x.letterSpacing = `${-0.02 * fs}px`;
      const tw = Math.max(...lines.map((l) => x.measureText(l).width));
      const bw = Math.ceil((tw + C * 0.5) / C) * C, bh = Math.ceil((lines.length * lh + C * 0.4) / C) * C;
      const bx = cfg.tagSide === 'right' ? W - bw : 0;
      x.fillStyle = cfg.tagColor || '#d3262a'; x.fillRect(bx, 0, bw, bh);
      x.fillStyle = '#fff'; x.textBaseline = 'middle';
      const y0 = (bh - lines.length * lh) / 2 + lh / 2;
      lines.forEach((l, i) => x.fillText(l, bx + C * 0.25, y0 + i * lh));
      if ('letterSpacing' in x) x.letterSpacing = '0px';
    }
  }

  const tileMatBase = new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: null }, uCell: { value: new THREE.Vector4() }, uOpacity: { value: 1 },
      uLine: { value: new THREE.Color(COLORS.line) },
    },
    vertexShader: fillMatBase.vertexShader,
    fragmentShader: /* glsl */`
      uniform sampler2D uMap; uniform vec4 uCell; uniform float uOpacity; uniform vec3 uLine; uniform vec3 uBg;
      varying vec3 vN; varying vec2 vUv; varying float vD;
      void main(){
        float sh = 0.95 + 0.05*abs(dot(normalize(vN), normalize(vec3(0.3,0.85,0.45))));
        vec3 col = texture2D(uMap, uCell.xy + vUv*uCell.zw).rgb * sh;
        // тонкая линия грида по краю клетки (у соседей она сливается в одну)
        vec2 e = min(vUv, 1.0 - vUv) / max(fwidth(vUv), vec2(1e-5));
        col = mix(col, uLine, (1.0 - clamp(min(e.x, e.y) * 1.6, 0.0, 1.0)) * 0.7);
        col = mix(col, uBg, smoothstep(22.0, 46.0, vD));
        gl_FragColor = vec4(col, uOpacity);
      }`,
    side: THREE.DoubleSide, transparent: true,
    extensions: { derivatives: true },
  });
  const tileGeo = new THREE.PlaneGeometry(1, 1, 6, 6);
  const tiles = [];
  const gone = new Map();   // клетка стены → когда с неё улетела картинка политики
  const cellKey = (wall, P) => `${wall}|${Math.floor(P.x)}|${Math.floor(P.y)}|${Math.floor(P.z)}`;
  WALL_IMAGES.forEach((cfg, k) => {
    const W = WALLS[cfg.wall]; if (!W || !cfg[W.axis] || !cfg.y) return;
    const [u0, u1] = cfg[W.axis].map(Math.round).sort((a, b) => a - b);
    const [y0, y1] = cfg.y.map(Math.round).sort((a, b) => a - b);
    const cols = u1 - u0, rows = y1 - y0; if (cols < 1 || rows < 1) return;

    const c = document.createElement('canvas'); c.width = cols * CELL_PX; c.height = rows * CELL_PX;
    paintImage(c, cfg, null);
    const tex = new THREE.CanvasTexture(c); tex.anisotropy = 8;
    if (cfg.src) {
      const img = new Image();
      img.onload = () => { paintImage(c, cfg, img); tex.needsUpdate = true; };
      img.src = cfg.src;
    }

    const start = W.dir > 0 ? u0 : u1, ox = rr(0, cols);   // ox — откуда начинает осыпаться (низ картинки)
    for (let r = 0; r < rows; r++) for (let col = 0; col < cols; col++) {
      const m = tileMatBase.clone();
      m.uniforms.uWarp = G.uWarp; m.uniforms.uTwist = G.uTwist; m.uniforms.uTime = G.uTime; m.uniforms.uBg = G.uBg;
      m.uniforms.uMap.value = tex; m.uniforms.uCell.value.set(col / cols, r / rows, 1 / cols, 1 / rows);
      const mesh = new THREE.Mesh(tileGeo, m); mesh.visible = false; scene.add(mesh);

      const P0 = W.at(start + W.dir * (col + 0.5), y0 + r + 0.5).addScaledVector(W.n, 0.006);
      // разлёт: от стены внутрь комнаты и вниз, мимо фигуры и не в камеру
      const Pb = P0.clone().addScaledVector(W.n, rr(1.2, 4.5)).add(new THREE.Vector3(rr(-1.5, 1.5), rr(-2.4, 0.6), rr(-1.5, 1.5)));
      Pb.y = Math.min(4.4, Math.max(-2.4, Pb.y)); Pb.z = Math.min(3, Pb.z);
      if (Math.abs(Pb.x) < 1.4 && Pb.z > -2.5) Pb.x += Pb.x < 0 ? -1.6 : 1.6;
      const sweep = (col / cols + (rows - 1 - r) / rows) / 2;   // появление: от верхнего левого угла
      const crumble = Math.hypot(col + 0.5 - ox, r + 0.5) / Math.hypot(cols, rows);
      const T = {
        mesh, m, P0, Q0: W.q, Pb, Qb: W.q.clone().multiply(E(rr(-2.5, 2.5), rr(-2.5, 2.5), rr(-2.5, 2.5))),
        Sb: rr(0.45, 0.85),
        in: 1.4 + k * 0.04 + sweep * 0.3,                // по номеру экрана: University → Context
        bs: 0.17 + crumble * 0.1 + rr(0, 0.03), dur: rr(0.05, 0.07),  // по q (шкала разрушения)
        away: new THREE.Vector3(Pb.x < 0 ? -1 : 1, rr(0.3, 0.9), rr(-0.8, 0.2)).normalize().multiplyScalar(rr(9, 14)),   // потом улетает из кадра
        axis: new THREE.Vector3(rr(-1, 1), rr(-1, 1), rr(-1, 1)).normalize(),
        ph: rr(0, 6.28), sp: rr(0.4, 1.2) * (rnd() < 0.5 ? -1 : 1),
      };
      tiles.push(T);
      T.leave = T.bs + T.dur;   // клетка опустела (по q); дальше квадратик улетает из кадра
      gone.set(cellKey(cfg.wall, P0), 2 + 5 * T.leave);   // то же — номером экрана
    }
  });

  /* ---------- Израиль, 2016 (экран Distortion) ----------
     Элементы из ISRAEL_WALLS (config.js) встают на стены в те же клетки, откуда
     только что осыпалась политика, и держатся на панелях стен: когда стены
     разлетаются, они улетают вместе с ними. */
  const MONO_FONT = '"JetBrains Mono", Menlo, monospace';
  const photos = {};   // загруженные фото для блоков (src → картинка)
  function paintBlocks(c, cfg) {
    const x = c.getContext('2d'), C = CELL_PX;
    x.clearRect(0, 0, c.width, c.height);
    for (const B of cfg.blocks) {
      const [c0, r0, c1, r1] = B.cells, bx = c0 * C, by = r0 * C, bw = (c1 - c0) * C, bh = (r1 - r0) * C;
      if (B.src) {   // фото: пока не загрузилось — светлая плашка
        if (photos[B.src]) drawPhoto(x, photos[B.src], bx, by, bw, bh, B.focus);
        else { x.fillStyle = '#dfe5ee'; x.fillRect(bx, by, bw, bh); }
        continue;
      }
      x.fillStyle = B.bg; x.fillRect(bx, by, bw, bh);
      const lines = B.lines || [{ text: B.text }];
      const total = lines.reduce((t, L) => t + (L.rel || 1) * 1.2, 0);
      let size = Math.min(bh * 0.62 / total * 1.2, C * (B.max || 0.62));
      const width = (L, sz) => runsOf(L, B, sz).reduce((w, R) => { x.font = R.font; return w + x.measureText(R.text).width; }, 0);
      const widest = (sz) => Math.max(...lines.map((L) => width(L, sz * (L.rel || 1))));
      while (size > 8 && widest(size) > bw * 0.86) size *= 0.94;   // уменьшаем, пока не влезет
      x.textBaseline = 'middle'; x.textAlign = 'left';
      let y = by + (bh - total * size) / 2;
      for (const L of lines) {
        const sz = size * (L.rel || 1), w = width(L, sz);
        let tx = B.align === 'left' ? bx + C * 0.28 : bx + (bw - w) / 2;
        for (const R of runsOf(L, B, sz)) {
          x.font = R.font; x.fillStyle = R.color || B.ink;
          x.fillText(R.text, tx, y + sz * 0.62); tx += x.measureText(R.text).width;
        }
        y += sz * 1.2;
      }
    }
  }

  // Строка → куски со своим шрифтом и цветом:
  //  код (code: true) — подсветка как в редакторе; иначе иврит — книжным шрифтом, остальное — обычным.
  const HEB_FONT = '"Frank Ruhl Libre", "David Libre", "Times New Roman", serif';
  const SYNTAX = { kw: '#c792ea', str: '#c3e88d', fn: '#82aaff', tag: '#f07178', attr: '#ffcb6b', punct: '#89ddff', brace: '#ffd479', plain: '#eef1f6' };
  const CODE_RE = /("[^"]*"|'[^']*')|\b(const|let|var|return|function|import|export|new)\b|(<\/?>|<\/?[A-Za-z][\w-]*|\/?>)|([A-Za-z_][\w-]*)(?==)|([A-Za-z_]\w*)(?=\()|([{}])|([()[\];=.,:+])/g;
  function runsOf(L, B, sz) {
    const mono = (L.font || B.font) === 'mono';
    const weight = L.weight || B.weight || (mono ? 500 : 800);
    if (L.code ?? B.code) {
      const f = `${weight} ${sz}px ${MONO_FONT}`, out = []; let last = 0, m;
      CODE_RE.lastIndex = 0;
      while ((m = CODE_RE.exec(L.text))) {
        if (m.index > last) out.push({ text: L.text.slice(last, m.index), font: f, color: SYNTAX.plain });
        const kind = m[1] ? 'str' : m[2] ? 'kw' : m[3] ? 'tag' : m[4] ? 'attr' : m[5] ? 'fn' : m[6] ? 'brace' : 'punct';
        out.push({ text: m[0], font: f, color: SYNTAX[kind] }); last = m.index + m[0].length;
      }
      if (last < L.text.length) out.push({ text: L.text.slice(last), font: f, color: SYNTAX.plain });
      return out;
    }
    const base = `${weight} ${sz}px ${mono ? MONO_FONT : FONT}`;
    const heb = `${L.hebWeight || B.hebWeight || 700} ${sz * 1.08}px ${HEB_FONT}`;
    return L.text.split(/([\u0590-\u05FF][\u0590-\u05FF\s]*[\u0590-\u05FF]|[\u0590-\u05FF])/).filter(Boolean)
      .map((t) => ({ text: t, font: /[\u0590-\u05FF]/.test(t) ? heb : base }));
  }
  // шрифты для стен Израиля: дождаться и перерисовать
  const wallFonts = Promise.all([
    document.fonts?.load(`700 100px "Frank Ruhl Libre"`, 'שלום'),
    document.fonts?.load(`500 100px "JetBrains Mono"`, 'const'),
  ].filter(Boolean)).catch(() => {});
  const itiles = [];
  ISRAEL_WALLS.forEach((cfg) => {
    const W = WALLS[cfg.wall]; if (!W || !cfg[W.axis] || !cfg.y) return;
    const [u0, u1] = cfg[W.axis].map(Math.round).sort((a, b) => a - b);
    const [y0, y1] = cfg.y.map(Math.round).sort((a, b) => a - b);
    const cols = u1 - u0, rows = y1 - y0; if (cols < 1 || rows < 1) return;
    const c = document.createElement('canvas'); c.width = cols * CELL_PX; c.height = rows * CELL_PX;
    paintBlocks(c, cfg);
    const tex = new THREE.CanvasTexture(c); tex.anisotropy = 8;
    wallFonts.then(() => { paintBlocks(c, cfg); tex.needsUpdate = true; });   // со шрифтами, когда загрузятся
    for (const B of cfg.blocks) if (B.src) {
      const img = new Image();
      img.onload = () => { photos[B.src] = img; paintBlocks(c, cfg); tex.needsUpdate = true; };
      img.src = B.src;
    }
    const used = new Set();   // клетки, где есть элементы (пустые остаются белым гридом)
    for (const B of cfg.blocks) for (let r = B.cells[1]; r < B.cells[3]; r++) for (let q = B.cells[0]; q < B.cells[2]; q++) used.add(`${q},${r}`);
    const start = W.dir > 0 ? u0 : u1;
    for (let r = 0; r < rows; r++) for (let col = 0; col < cols; col++) {
      if (!used.has(`${col},${rows - 1 - r}`)) continue;
      const m = tileMatBase.clone();
      m.uniforms.uWarp = G.uWarp; m.uniforms.uTwist = G.uTwist; m.uniforms.uTime = G.uTime; m.uniforms.uBg = G.uBg;
      m.uniforms.uMap.value = tex; m.uniforms.uCell.value.set(col / cols, r / rows, 1 / cols, 1 / rows);
      const mesh = new THREE.Mesh(tileGeo, m); mesh.visible = false; scene.add(mesh);
      const P0 = W.at(start + W.dir * (col + 0.5), y0 + r + 0.5);
      // панель стены, на которой лежит клетка: элемент двигается вместе с ней
      const panel = panels.find((P) => P.face === cfg.wall && P.P0.distanceTo(P0) < 1.5);
      if (!panel) continue;
      const local = P0.clone().sub(panel.P0).applyQuaternion(panel.Q0.clone().invert()); local.z += 0.006;
      const g = gone.get(cellKey(cfg.wall, P0.clone().addScaledVector(W.n, 0.006)));
      // рассыпание (как у политики): от стены внутрь комнаты, мимо фигуры
      const Pb = P0.clone().addScaledVector(W.n, rr(1.2, 4.5)).add(new THREE.Vector3(rr(-1.5, 1.5), rr(-2.4, 0.6), rr(-1.5, 1.5)));
      Pb.y = Math.min(4.4, Math.max(-2.4, Pb.y)); Pb.z = Math.min(3, Pb.z);
      if (Math.abs(Pb.x) < 1.4 && Pb.z > -2.5) Pb.x += Pb.x < 0 ? -1.6 : 1.6;
      const crumble = Math.hypot(col + 0.5 - cols / 2, r + 0.5) / Math.hypot(cols, rows);
      itiles.push({ mesh, m, panel, local, in: (g ?? 3.4 + rr(0, 0.6)) + rr(0.03, 0.12),
        Pb, Qb: W.q.clone().multiply(E(rr(-2.5, 2.5), rr(-2.5, 2.5), rr(-2.5, 2.5))), Sb: rr(0.45, 0.85),
        bs: 0.45 + crumble * 0.07 + rr(0, 0.03), dur: rr(0.06, 0.08),   // по q: на Break, до того как полетят стены
        axis: new THREE.Vector3(rr(-1, 1), rr(-1, 1), rr(-1, 1)).normalize(),
        ph: rr(0, 6.28), sp: rr(0.4, 1.2) * (rnd() < 0.5 ? -1 : 1) });
    }
  });

  /* ---------- кадр анимации ---------- */
  const tq = new THREE.Quaternion(), tq2 = new THREE.Quaternion(), tv = new THREE.Vector3(), tc = new THREE.Color();
  const te = new THREE.Euler(), Y = new THREE.Vector3(0, 1, 0);

  // p — шкала разрушения (0 на спокойных экранах), sf — номер экрана с дробью
  // phases: { crack, fr (дрейф осколков), own (новый порядок) }
  let ownNow = 0;   // насколько собран финал
  let phone = false;   // телефон: досок в финале нет — разделы и проекты обычной страницей под сценой (main.js)
  const setPhone = (v) => { phone = v; };
  function update(p, t, ph, sf = 0) {
    const { crack, fr, own } = ph;
    ownNow = own;
    G.uTime.value = t;
    G.uWarp.value = ss(0.28, 0.48, p) * (1 - own * 0.85);
    G.uTwist.value = ss(0.32, 0.58, p) * 0.7 * (1 - own);

    // разделы ↔ проекты: плавно
    const dt = Math.min(0.1, Math.max(0, t - view.lastT)); view.lastT = t;
    view.sel += (view.target - view.sel) * Math.min(1, dt * 2.2);
    if (view.target === 0 && view.sel < 0.002) view.cat = null;

    for (const P of panels) {
      const b = ss(P.bs, P.bs + 0.12, p);
      tv.copy(P.P0).lerp(P.Pc, crack).lerp(P.Pb, b);
      tq.copy(P.Q0).slerp(P.Qc, crack).slerp(P.Qb, b);
      let sc = 1 + (P.Sb - 1) * b;
      // вес «стоять на доске»: раздел — пока раздел не открыт, проект — когда открыт его раздел
      const w = phone || !P.cluster ? 0 : P.kind === 'cat' ? own * (1 - ss(0, 0.8, view.sel)) : (P.inCat ? own * ss(0.2, 1, view.sel) : 0);
      if (fr > 0 || own > 0) {
        const d = Math.max(fr, own * (1 - w));
        tv.x += Math.sin(t * 0.4 + P.ph) * 0.35 * d; tv.y += Math.cos(t * 0.33 + P.ph) * 0.45 * d;
        tq2.setFromAxisAngle(P.axis, d * (Math.sin(t * 0.5 * P.sp + P.ph) * 0.35 + t * 0.08 * P.sp)); tq.multiply(tq2);
      }
      if (P.cluster) { tv.lerp(P.Po, w); tq.slerp(P.Qo, w); sc += (P.So - sc) * w; }
      P.g.position.copy(tv); P.g.quaternion.copy(tq); P.g.scale.setScalar(sc);
      P.fm.uniforms.uColor.value.copy(WHITE);
      if (P.board) {
        if (P.fm.uniforms.uImg.value !== P.board || !P.uvSet) { P.fm.uniforms.uImg.value = P.board; P.fm.uniforms.uUvRect.value.copy(P.uv); P.uvSet = true; }
        P.fm.uniforms.uImgOn.value = ss(0.35, 1, w);
        const onTop = w > 0.3;   // доска поверх летающих осколков
        if (P.fm.depthTest === onTop) {
          P.fm.depthTest = P.lm.depthTest = !onTop;
          P.g.children.forEach((o) => { o.renderOrder = onTop ? 110 : 0; });
        }
      }
      const fade = 1 - own * 0.8, base = 0.92 * fade * (1 - own * 0.15);
      P.fm.uniforms.uOpacity.value = base + (1 - base) * w;
      P.lm.uniforms.uOpacity.value = fade + (1 - fade) * w;
    }

    // Израиль: клетка за клеткой встаёт на место политики, на Break рассыпается на квадратики
    for (const T of itiles) {
      // осколки Израиля исчезают, как только оторвались от стены — в воздухе летают только пустые блоки и инструменты
      const a = ss(T.in, T.in + 0.2, sf), b = ss(T.bs, T.bs + T.dur, p), op = a * (1 - own) * (1 - ss(T.bs + T.dur * 0.3, T.bs + T.dur + 0.02, p));
      T.mesh.visible = op > 0.01; if (!T.mesh.visible) continue;
      const g = T.panel.g;
      tv.copy(T.local).multiplyScalar(g.scale.x).applyQuaternion(g.quaternion).add(g.position).lerp(T.Pb, b);
      tq.copy(g.quaternion);
      if (a < 1) tq.multiply(tq2.setFromAxisAngle(Y, (1 - a) * Math.PI / 2));   // переворачивается
      const shake = ss(T.bs - 0.04, T.bs, p) * (1 - b);                          // дрожит перед отрывом
      if (shake > 0) tq.multiply(tq2.setFromAxisAngle(T.axis, Math.sin(t * 22 + T.ph) * 0.06 * shake));
      tq.slerp(T.Qb, b);
      if (b > 0) {
        const d = Math.max(fr, own) * b;
        tv.x += Math.sin(t * 0.4 + T.ph) * 0.35 * d; tv.y += Math.cos(t * 0.33 + T.ph) * 0.45 * d;
        tq.multiply(tq2.setFromAxisAngle(T.axis, d * (Math.sin(t * 0.5 * T.sp + T.ph) * 0.35 + t * 0.08 * T.sp)));
      }
      T.mesh.position.copy(tv); T.mesh.quaternion.copy(tq);
      T.mesh.scale.setScalar((0.6 + 0.4 * a) * (1 + (T.Sb - 1) * b) * (1 - own * 0.6));
      T.m.uniforms.uOpacity.value = op;
    }

    // квадратики картинок
    for (const T of tiles) {
      const a = ss(T.in, T.in + 0.15, sf);           // встаёт на стену (переворот)
      const b = ss(T.bs, T.bs + T.dur, p);           // отрывается
      const w = T.away ? ss(T.leave, T.leave + 0.07, p) : 0;   // улетает из кадра
      const op = a * (1 - own) * (1 - w);
      T.mesh.visible = op > 0.01; if (!T.mesh.visible) continue;
      tv.copy(T.P0).lerp(T.Pb, b);
      tq.copy(T.Q0);
      if (a < 1) tq.multiply(tq2.setFromAxisAngle(Y, (1 - a) * Math.PI / 2));
      const shake = ss(T.bs - 0.05, T.bs, p) * (1 - b);   // дрожит перед отрывом
      if (shake > 0) tq.multiply(tq2.setFromAxisAngle(T.axis, Math.sin(t * 22 + T.ph) * 0.06 * shake));
      tq.slerp(T.Qb, b);
      if (b > 0) {
        const d = Math.max(fr, own) * b;
        tv.x += Math.sin(t * 0.4 + T.ph) * 0.35 * d; tv.y += Math.cos(t * 0.33 + T.ph) * 0.45 * d;
        tq.multiply(tq2.setFromAxisAngle(T.axis, d * (Math.sin(t * 0.5 * T.sp + T.ph) * 0.35 + t * 0.08 * T.sp)));
      }
      if (w > 0) tv.addScaledVector(T.away, w * w);
      T.mesh.position.copy(tv); T.mesh.quaternion.copy(tq);
      T.mesh.scale.setScalar((0.6 + 0.4 * a) * (1 + (T.Sb - 1) * b) * (1 - own * 0.6));
      T.m.uniforms.uOpacity.value = op;
    }

    // надписи: уходят, пока на стены встают картинки, и возвращаются, когда отрываются
    const hide = tiles.length ? ss(1.3, 1.55, sf) : 0;
    labels.forEach((L, i) => {
      const c = L.cfg;
      let op = c.screens
        ? ss(c.screens[0] - 0.2, c.screens[0] + 0.2, sf) * (1 - ss(c.screens[1] - 0.2, c.screens[1] + 0.2, sf))
        : Math.max(1 - Math.max(hide, c.away != null ? ss(c.away - 0.2, c.away + 0.2, sf) : 0), ss(0.3, 0.8, own));   // надписи не летают — возвращаются в финале
      if (phone) op *= 1 - own;   // на телефоне имя и контакты — на странице под сценой
      L.mesh.material.uniforms.uOpacity.value = op; L.mesh.visible = op > 0.01;
      const b = ss(L.bs, L.bs + 0.14, p);
      tv.copy(L.P0).lerp(L.Pb, b); tq.copy(L.Q0).slerp(L.Qb, b);
      let sc = 1 + (L.so - 1) * b;
      tv.y += Math.sin(t * 0.5 + i * 2) * 0.2 * fr;
      tv.lerp(L.Po, own); tq.slerp(L.Qo, own); sc += (L.so - sc) * own;
      L.mesh.position.copy(tv); L.mesh.quaternion.copy(tq); L.mesh.scale.setScalar(sc);
    });

    // проекты: появляются, когда стены разлетаются (Design), кружат, в финале встают на место
    const nIn = ss(0.55, 0.66, p);
    notes.forEach((n, i) => {
      const a = n.ph + t * 0.18 * (i % 2 ? 1 : -1);
      tv.set(Math.cos(a) * n.r, n.y + Math.sin(t * 0.6 + n.ph) * 0.25, Math.sin(a) * n.r * 0.6 - 0.5);
      if (Math.abs(tv.x) < 2 && tv.z > -1.5) tv.x += tv.x < 0 ? -2 : 2;   // мимо фигуры
      tq.setFromEuler(te.set(Math.sin(t * 0.4 + n.ph) * 0.4, a, Math.cos(t * 0.3 + n.ph) * 0.3));
      tv.lerp(n.Po, own); tq.slerp(n.Qo, own);
      n.mesh.position.copy(tv); n.mesh.quaternion.copy(tq);
      n.mesh.scale.setScalar(1 + own * 1.25);                // растёт до размера доски…
      const op = 0;   // карточки проектов не летают — проекты появляются только досками в финале
      n.m.uniforms.uOpacity.value = op; n.mesh.visible = op > 0.01;
    });

    // инструменты: появляются вслед за проектами, кружат вокруг фигуры, к финалу растворяются
    for (const T of tools) {
      const op = ss(0.56 + T.delay, 0.64 + T.delay, p) * (1 - ss(0.86, 0.93, p));   // Design и Fragments
      T.mesh.visible = op > 0.01; if (!T.mesh.visible) continue;
      const a = T.ph + t * T.sp;
      tv.set(Math.cos(a) * T.r, T.y + Math.sin(t * 0.7 + T.ph) * 0.3, Math.sin(a) * T.r * 0.55 - 0.6);
      if (Math.abs(tv.x) < 1.6 && tv.z > -1.8) tv.x += tv.x < 0 ? -1.6 : 1.6;   // мимо фигуры
      T.mesh.position.copy(tv);
      T.mesh.quaternion.setFromEuler(te.set(Math.sin(t * 0.5 + T.ph) * 0.35, Math.sin(t * 0.4 + T.ph) * 0.5, Math.sin(t * 0.3) * T.spin));
      T.mesh.scale.setScalar(0.8 + 0.2 * op);
      T.m.uniforms.uOpacity.value = op;
    }
  }

  /* ---------- клик в финале ----------
     pick(ray) → { cat } (доска раздела), { project } (доска проекта или карточка) или null. */
  // раздел без проектов («Coming soon») не нажимается
  const catMeshes = panels.filter((P) => P.kind === 'cat' && DESIGN_PROJECTS.some((D) => inCat(D, WORK_CATEGORIES[P.idx].key))).map((P) => P.g.children[0]);
  const projPanels = panels.filter((P) => P.kind === 'proj');
  function pick(ray) {
    if (phone) return null;
    const list = notes.filter((n) => n.mesh.visible && n.m.uniforms.uOpacity.value > 0.4).map((n) => n.mesh);
    if (ownNow > 0.7 && view.sel < 0.15) list.push(...catMeshes);
    if (ownNow > 0.7 && view.sel > 0.85) list.push(...projPanels.filter((P) => P.inCat).map((P) => P.g.children[0]));
    const h = ray.intersectObjects(list, false)[0]; if (!h) return null;
    const u = h.object.userData;
    return u.cat ? { cat: u.cat } : u.project != null ? { project: u.project } : null;
  }
  function openCategory(key) {
    if (!WORK_CATEGORIES.some((C) => C.key === key)) return;
    view.cat = key; layoutCategory(key); view.target = 1;
  }
  function closeCategory() { view.target = 0; }
  const category = () => (view.target === 1 ? view.cat : null);

  // обложки досок (canvas) — для карточек на телефоне
  const covers = { projects: projTex.map((t) => t.image), categories: catTex.map((t) => t.image) };
  return { update, labels, layout, pick, openCategory, closeCategory, category, setPhone, covers };
}
