// =====================================================================
//  МИР: перспективная комната из панелей сетки, которая трескается,
//  гнётся, разлетается и собирается в новый порядок.
//  Всё управляется числом p (0…1) — долей прокрутки.
// =====================================================================
import * as THREE from './vendor/three.module.js';
import { COLORS, NOTES, WALL_TEXT, FONT } from './config.js';
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
      varying vec3 vN; varying vec2 vUv; varying float vD;
      void main(){
        float sh = 0.95 + 0.05*abs(dot(normalize(vN), normalize(vec3(0.3,0.85,0.45))));
        vec3 col = uColor*sh; float a = uOpacity;
        if(uUseMap > 0.5){
          vec4 t = texture2D(uMap, vUv);
          if(uInkMap > 0.5){ if(t.a < 0.05) discard; col = vec3(0.086,0.09,0.1); a *= t.a; }
          else { col = t.rgb*sh; a *= t.a; }
        }
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
  const CLUSTERS = [   // «листы» нового порядка в финале
    { c: [-5.6, 3.2, -4], e: [0.3, 0.9, 0.2] },
    { c: [5.4, 3.4, -5], e: [-0.2, -0.8, -0.3] },
    { c: [-5.8, -2.2, -2], e: [-1.1, 0.6, 0] },
    { c: [6.0, -1.6, -3], e: [0.1, -1.2, 0.4] },
    { c: [0.4, 6.4, -6], e: [1.3, 0, 0.2] },
    { c: [-2.4, 0.6, -9], e: [0, 0.4, -0.15] },
  ];
  const ACCENTS = COLORS.accents.map((c) => new THREE.Color(c));
  const WHITE = new THREE.Color(0xffffff);
  const order = panels.map((_, i) => i).sort(() => rnd() - 0.5);
  const clusterSlots = []; CLUSTERS.forEach((_, k) => { for (let j = 0; j < 8; j++) clusterSlots.push([k, j]); });
  const center = new THREE.Vector3(0, 1, -1);

  panels.forEach((p) => {
    // когда отрывается: сначала пол, потом стены, потолок, задняя стена
    const startBy = { floor: 0.44, left: 0.48, right: 0.49, ceil: 0.52, back: 0.57 }[p.face];
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
    const p = panels[idx], [k, j] = clusterSlots[n], C = CLUSTERS[k];
    const q = E(...C.e);
    const off = new THREE.Vector3(((j % 4) - 1.5) * 1.5, (Math.floor(j / 4) - 0.5) * 1.5, 0).applyQuaternion(q);
    p.cluster = true;
    p.Po = new THREE.Vector3(...C.c).add(off);
    p.Qo = q.clone().multiply(E(rr(-0.05, 0.05), rr(-0.05, 0.05), rr(-0.05, 0.05)));   // чуть неровно — «свои» правила
    p.So = 0.75;
    if (rnd() < 0.32) p.col = ACCENTS[Math.floor(rnd() * ACCENTS.length)];
  });

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
    const label = {
      cfg: L, mesh, bs: L.breakAt, so: L.finalScale,
      P0: V(L.wall), Q0: E(...L.wallRot), Pb: V(L.fly), Qb: E(...L.flyRot), Po: V(L.final), Qo: E(...L.finalRot),
    };
    layout(label);
    return label;
  });

  /* ---------- записки / сканы ----------
     Если в config.js в NOTES указаны картинки — берутся они,
     иначе рисуются серые заглушки. */
  function placeholderTexture(i) {
    const c = document.createElement('canvas'); c.width = 512; c.height = 384; const x = c.getContext('2d');
    x.fillStyle = ['#efede7', '#e9e8e3', '#f1efe9'][i % 3]; x.fillRect(0, 0, 512, 384);
    for (let k = 0; k < 1800; k++) { x.fillStyle = `rgba(0,0,0,${Math.random() * 0.035})`; x.fillRect(Math.random() * 512, Math.random() * 384, 2, 2); }
    x.strokeStyle = '#2a2a2e'; x.lineWidth = 2.2; x.lineCap = 'round';
    for (let l = 0; l < 5; l++) {
      let px = 40 + rr(0, 20); const py = 70 + l * 52; x.beginPath(); x.moveTo(px, py);
      const len = rr(260, 420);
      while (px < 40 + len) { const nx = px + rr(10, 22); x.quadraticCurveTo(px + rr(2, 8), py + rr(-14, 10), nx, py + rr(-4, 4)); px = nx; }
      x.stroke();
    }
    x.font = '400 18px "JetBrains Mono", Menlo, monospace'; x.fillStyle = '#8a8a8f';
    x.fillText('здесь ваш скан / записка', 40, 360);
    return new THREE.CanvasTexture(c);
  }
  const loader = new THREE.TextureLoader();
  const notes = [];
  const NOTE_HOME = [[-3.2, 2.6, -1], [3.4, -0.6, 0.5], [-2.6, -1.4, 1.2], [2.4, 3.4, -2], [-4, 0.6, -3], [1.9, -2.0, 2]];
  for (let i = 0; i < 6; i++) {
    const [m] = mats(); m.uniforms.uUseMap.value = 1; m.uniforms.uOpacity.value = 0;
    m.uniforms.uMap.value = placeholderTexture(i);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.98, 6, 6), m); scene.add(mesh);
    if (NOTES[i]) {
      loader.load(NOTES[i], (tex) => {   // подгоняем пропорции под скан
        m.uniforms.uMap.value = tex;
        const a = tex.image.width / tex.image.height;
        mesh.geometry.dispose(); mesh.geometry = new THREE.PlaneGeometry(1.15 * Math.sqrt(a), 1.15 / Math.sqrt(a), 6, 6);
      });
    }
    notes.push({ mesh, m, ph: rr(0, 6.28), r: rr(2.6, 4.4), y: rr(-1.8, 3.6), Po: new THREE.Vector3(...NOTE_HOME[i]), Qo: E(rr(-0.3, 0.3), rr(-0.6, 0.6), rr(-0.25, 0.25)) });
  }

  /* ---------- кадр анимации ---------- */
  const tq = new THREE.Quaternion(), tq2 = new THREE.Quaternion(), tv = new THREE.Vector3(), tc = new THREE.Color();
  const te = new THREE.Euler();

  // phases: { crack, fr (дрейф осколков), own (новый порядок) }
  function update(p, t, ph) {
    const { crack, fr, own } = ph;
    G.uTime.value = t;
    G.uWarp.value = ss(0.28, 0.48, p) * (1 - own * 0.85);
    G.uTwist.value = ss(0.32, 0.58, p) * 0.7 * (1 - own);

    for (const P of panels) {
      const b = ss(P.bs, P.bs + 0.12, p);
      tv.copy(P.P0).lerp(P.Pc, crack).lerp(P.Pb, b);
      tq.copy(P.Q0).slerp(P.Qc, crack).slerp(P.Qb, b);
      let sc = 1 + (P.Sb - 1) * b;
      if (fr > 0 || own > 0) {
        const d = Math.max(fr, own * (P.cluster ? 0 : 1));
        tv.x += Math.sin(t * 0.4 + P.ph) * 0.35 * d; tv.y += Math.cos(t * 0.33 + P.ph) * 0.45 * d;
        tq2.setFromAxisAngle(P.axis, d * (Math.sin(t * 0.5 * P.sp + P.ph) * 0.35 + t * 0.08 * P.sp)); tq.multiply(tq2);
      }
      if (P.cluster) { tv.lerp(P.Po, own); tq.slerp(P.Qo, own); sc += (P.So - sc) * own; }
      P.g.position.copy(tv); P.g.quaternion.copy(tq); P.g.scale.setScalar(sc);
      tc.copy(WHITE).lerp(P.col, own); P.fm.uniforms.uColor.value.copy(tc);
      const fade = P.cluster ? 1 : 1 - own * 0.8;
      P.fm.uniforms.uOpacity.value = (P.cluster ? 1 : 0.92) * fade * (P.cluster ? 1 : 1 - own * 0.15);
      P.lm.uniforms.uOpacity.value = fade;
    }

    // надписи
    labels.forEach((L, i) => {
      const b = ss(L.bs, L.bs + 0.14, p);
      tv.copy(L.P0).lerp(L.Pb, b); tq.copy(L.Q0).slerp(L.Qb, b);
      let sc = 1 + (L.so - 1) * b;
      tv.y += Math.sin(t * 0.5 + i * 2) * 0.2 * fr;
      tv.lerp(L.Po, own); tq.slerp(L.Qo, own); sc += (L.so - sc) * own;
      L.mesh.position.copy(tv); L.mesh.quaternion.copy(tq); L.mesh.scale.setScalar(sc);
    });

    // записки
    const nIn = ss(0.62, 0.74, p);
    notes.forEach((n, i) => {
      const a = n.ph + t * 0.18 * (i % 2 ? 1 : -1);
      tv.set(Math.cos(a) * n.r, n.y + Math.sin(t * 0.6 + n.ph) * 0.25, Math.sin(a) * n.r * 0.6 - 0.5);
      if (Math.abs(tv.x) < 1.4 && tv.z > -1.5) tv.x += tv.x < 0 ? -1.4 : 1.4;
      tq.setFromEuler(te.set(Math.sin(t * 0.4 + n.ph) * 0.4, a, Math.cos(t * 0.3 + n.ph) * 0.3));
      tv.lerp(n.Po, own); tq.slerp(n.Qo, own);
      n.mesh.position.copy(tv); n.mesh.quaternion.copy(tq);
      n.m.uniforms.uOpacity.value = nIn; n.mesh.visible = nIn > 0.01;
    });
  }

  return { update, labels, layout };
}
