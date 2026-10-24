// 揪居家服務地圖：全台 → 縣市 → 門市街區，三層 Drill-Down／Roll-Up；選取後其他區塊轉灰
// 門市清單與縣市人口為公開資料；訂閱家庭、技師位置等標示「模擬」；第三層工單、提醒、關懷事件讀取即時資料
import * as THREE from '../vendor/three.module.min.js';

const G = window.SMGEO, ST = window.SMSTORES, AGE = window.SMAGE65, PILOT = window.SMPILOT;
const TYN = { g: '一般門市', l: '大型門市', e: '體驗館門市', d: '百貨門市' };
const TYC = { g: '#F2C230', l: '#D4003C', e: '#2B5C9E', d: '#8A6D3B' };
const STAGES = { pilot: ['台中市'], expand: ['台北市', '新北市', '桃園市', '台中市', '台南市', '高雄市'], extend: null };
const STN = { pilot: '試點', expand: '擴展', extend: '延伸' };
const BRAND = '#D4003C', GRAY = '#C9C9CE';
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const short = n => n.replace('Digital City-', '').replace('Digital City ', '');
const hash = s => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; };

// ---------- 門市概略座標：行政區中心 + 螺旋錯開（位置為概略） ----------
const TOWN = {}; for (const [cn, ts] of Object.entries(G.towns)) for (const t of ts) TOWN[cn + t.n] = t;
const STORES = (() => {
  const seen = {};
  return ST.map(([code, name, type, dc, county, town, addr]) => {
    const t = TOWN[county + town], k = county + town, i = (seen[k] = (seen[k] || 0) + 1) - 1;
    const c = t ? t.c : (G.counties.find(x => x.n === county) || { c: [0, 0] }).c;
    const r = i ? 0.55 * Math.sqrt(i) + 0.25 : 0, a = i * 2.4 + hash(code) * 0.6;
    return { code, name, short: short(name), type, dc: !!dc, county, town, addr, x: c[0] + r * Math.cos(a), y: c[1] + r * Math.sin(a), pilot: !!PILOT[code] };
  });
})();

// ---------- 小工具 ----------
const MAT = {};
function mat(c, o = {}) { const k = c + JSON.stringify(o); return MAT[k] || (MAT[k] = new THREE.MeshStandardMaterial({ color: c, roughness: .85, metalness: 0, flatShading: true, ...o })); }
const GRAYM = {};
function grayOf(m) {
  const k = m.uuid; if (GRAYM[k]) return GRAYM[k];
  const c = m.color ? m.color.clone() : new THREE.Color('#ccc'); const l = c.r * .3 + c.g * .59 + c.b * .11, v = .8 + l * .15;
  const g = m.clone(); g.color = new THREE.Color(v, v, v * 1.01); if (g.emissive) g.emissive = new THREE.Color(0, 0, 0); if (g.map) g.color = new THREE.Color(.85, .85, .86); g.transparent = true; g.opacity = .75;
  return GRAYM[k] = g;
}
function bx(w, h, d, c, x = 0, y = 0, z = 0, o) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c, o)); m.position.set(x, y + h / 2, z); m.castShadow = m.receiveShadow = true; return m; }
function textTex(lines, { bg = BRAND, fg = '#fff', w = 512, h = 128, px = 54 } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.fillStyle = bg; x.fillRect(0, 0, w, h); x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle';
  const L = [].concat(lines); L.forEach((t, i) => { x.font = `bold ${i ? Math.round(px * .62) : px}px "Noto Sans TC","Noto Sans CJK TC",sans-serif`; x.fillText(t, w / 2, h / (L.length + 1) * (i + 1) + (L.length > 1 ? (i ? -4 : 6) : 0)); });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function sign(lines, w, h, o) { return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: textTex(lines, o) })); }
function windows(g, w, h, d, rows, cols, y0, col = '#FFE9A8') { for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const m = bx(w / cols * .5, h / rows * .45, .04, col, -w / 2 + w / cols * (c + .5), y0 + h / rows * (r + .5) - h / rows * .225, d / 2 + .02, { emissive: col, emissiveIntensity: .3 }); g.add(m); } }
function roof(w, d, h, c) { const s = new THREE.Shape(); s.moveTo(-w / 2 - .08, 0); s.lineTo(0, h); s.lineTo(w / 2 + .08, 0); s.lineTo(-w / 2 - .08, 0); const g = new THREE.ExtrudeGeometry(s, { depth: d + .16, bevelEnabled: false }); g.translate(0, 0, -(d + .16) / 2); const m = new THREE.Mesh(g, mat(c)); m.castShadow = true; return m; }
function tree(s = 1, c = '#9CCB8A') { const g = new THREE.Group(); const t = new THREE.Mesh(new THREE.CylinderGeometry(.06 * s, .08 * s, .4 * s, 6), mat('#9C7B5B')); t.position.y = .2 * s; g.add(t); const a = new THREE.Mesh(new THREE.IcosahedronGeometry(.32 * s, 0), mat(c)); a.position.y = .6 * s; a.castShadow = true; g.add(a); return g; }
function house(wall, rf, badge) { const g = new THREE.Group(), w = 1, d = 1.1, h = .85; g.add(bx(w, h, d, wall)); const r = roof(w, d, .55, rf); r.position.y = h; g.add(r); g.add(bx(.22, .4, .05, '#8B5E3C', .18, 0, d / 2)); g.add(bx(.25, .2, .04, '#FFE9A8', -.22, .4, d / 2 + .02, { emissive: '#FFE9A8', emissiveIntensity: .3 }));
  if (badge) { const b = new THREE.Mesh(new THREE.CylinderGeometry(.17, .17, .05, 20), mat(badge, { emissive: badge, emissiveIntensity: .35 })); b.rotation.x = Math.PI / 2; b.position.set(-.25, h + .22, d / 2 + .1); g.add(b); } return g; }
function van(stripe = BRAND) { const g = new THREE.Group(); g.add(bx(.9, .38, .45, '#FFFFFF', -.05, .1, 0)); g.add(bx(.32, .3, .44, '#FFFFFF', .48, .1, 0)); g.add(bx(.2, .18, .45, '#9FC3E8', .5, .25, 0)); g.add(bx(.92, .07, .46, stripe, -.04, .28, 0));
  [[-.32, .24], [-.32, -.24], [.42, .24], [.42, -.24]].forEach(([x, z]) => { const w = new THREE.Mesh(new THREE.CylinderGeometry(.1, .1, .06, 12), mat('#333')); w.rotation.x = Math.PI / 2; w.position.set(x, .1, z); g.add(w); }); return g; }
// 依官網店型建造有意義的建築
function storeBuilding(s) {
  const g = new THREE.Group();
  if (s.type === 'd') { g.add(bx(2.2, 2.8, 1.8, '#E9DCC8')); for (let i = 0; i < 4; i++) g.add(bx(2.24, .08, 1.84, '#C9A877', 0, .6 + i * .6, 0)); windows(g, 2, 2.4, 1.8, 4, 5, .3, '#FFF1C9'); const sg = sign(['百貨專櫃｜全國電子'], 1.6, .26, { w: 560, h: 92, px: 44 }); sg.position.set(0, .45, .92); g.add(sg); }
  else if (s.type === 'e') { g.add(bx(2.4, 1.1, 1.6, '#EEF1F5')); g.add(bx(2.2, .7, .05, '#A9CBEB', 0, .1, .8, { transparent: true, opacity: .9 })); g.add(bx(2.44, .22, 1.64, '#2B5C9E', 0, 1.1, 0)); const sg = sign(['數位家電體驗館'], 1.8, .3, { w: 560, h: 96, px: 48, bg: '#2B5C9E' }); sg.position.set(0, .95, .83); g.add(sg); }
  else if (s.type === 'l') { g.add(bx(3.2, 1.9, 2.4, '#F7F5F2')); g.add(bx(3.24, .42, 2.44, BRAND, 0, 1.9, 0)); g.add(bx(3, .9, .06, '#BFD9F0', 0, .15, 1.2, { transparent: true, opacity: .85 })); const sg = sign(s.dc ? ['全國電子', 'Digital City'] : ['全國電子', '大型門市'], 2.4, .6, { w: 640, h: 160 }); sg.position.set(0, 1.42, 1.23); g.add(sg);
    if (s.pilot) { const r = sign(['揪居家情境角'], 1.2, .28, { bg: '#FFFFFF', fg: BRAND, w: 400, h: 96, px: 46 }); r.position.set(.85, .75, 1.24); g.add(r); } }
  else { g.add(bx(1.4, 1, 1.1, '#FFF8EC')); const a = bx(1.5, .08, .45, '#F2C230', 0, .82, .7); a.rotation.x = .35; g.add(a); const sg = sign(['全國電子'], 1.2, .26, { w: 400, h: 96, px: 50 }); sg.position.set(0, .66, .56); g.add(sg); g.add(bx(1.1, .45, .04, '#BFD9F0', 0, .05, .56)); }
  if (s.dc && s.type !== 'l') { const f = bx(.5, .3, .06, '#1F2328', 0, 0, 0); f.position.set(0, (s.type === 'd' ? 2.95 : 1.4), .6); g.add(f); }
  return g;
}
function shapeOf(poly) { const s = new THREE.Shape(); poly.forEach(([x, y], i) => i ? s.lineTo(x, -y) : s.moveTo(x, -y)); return s; }
function extrude(polys, h, color, o) { const geo = new THREE.ExtrudeGeometry(polys.map(shapeOf), { depth: h, bevelEnabled: false }); geo.rotateX(-Math.PI / 2); const m = new THREE.Mesh(geo, mat(color, o)); m.castShadow = m.receiveShadow = true; return m; }
function ramp(v, lo = 15, hi = 24.5) { const t = Math.max(0, Math.min(1, (v - lo) / (hi - lo))); return new THREE.Color('#FBE3EA').lerp(new THREE.Color('#A3002E'), t).getStyle(); }
const bboxOf = polys => { let a = [1e9, 1e9, -1e9, -1e9]; polys.forEach(p => p.forEach(([x, y]) => { a = [Math.min(a[0], x), Math.min(a[1], y), Math.max(a[2], x), Math.max(a[3], y)]; })); return a; };

// ---------- 主元件 ----------
export function mountServiceMap(root, opt = {}) {
  const api = opt.api || (async () => ({})), toast = opt.toast || (() => {});
  const S = { level: 1, county: null, store: null, sel: null, stage: 'pilot', types: { g: 1, l: 1, e: 1, d: 1 }, dcOnly: false, tab: 'ops', mode: null, live: null, flat: false };
  const webgl = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } })();
  S.flat = !webgl || root.clientWidth < 720;
  root.innerHTML = `<div class="sm">
   <div class="smtop"><nav class="smbc" aria-label="服務地圖層級"></nav><button class="smup" data-sm="up">↑ 上一層</button><span class="smsp"></span><span class="smpre"></span><button class="smmode" data-sm="mode"></button></div>
   <div class="smk"></div><div class="smins" role="status"></div>
   <div class="smmain"><div class="smstage"><div class="smcv"></div><svg class="smsvg" hidden></svg><div class="smlb"></div><div class="smflt"></div><div class="smleg"></div><div class="smhint">拖曳旋轉｜滾輪縮放｜點選聚焦，再點「進入」往下一層</div></div><aside class="smside"></aside></div>
   <div class="smsrc"></div></div>`;
  const $ = s => root.querySelector(s);
  const cv = $('.smcv'), lb = $('.smlb'), svg = $('.smsvg');
  let R = null, scene, cam, raf, pick = [], labels = [], movers = [], target = new THREE.Vector3(), sph = { r: 260, th: -0.35, ph: 0.95 }, want = null;

  // ----- three.js 舞台 -----
  function initGL() {
    if (R) return;
    R = new THREE.WebGLRenderer({ antialias: true, alpha: true }); R.setPixelRatio(Math.min(2, devicePixelRatio || 1)); R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap; R.outputColorSpace = THREE.SRGBColorSpace;
    cv.appendChild(R.domElement); cam = new THREE.PerspectiveCamera(32, 1, .1, 5000);
    let drag = null;
    R.domElement.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, th: sph.th, ph: sph.ph, moved: 0, btn: e.button, shift: e.shiftKey, t: target.clone() }; R.domElement.setPointerCapture(e.pointerId); });
    R.domElement.addEventListener('pointermove', e => { if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.moved = Math.max(drag.moved, Math.abs(dx) + Math.abs(dy));
      if (drag.btn === 2 || drag.shift) { const k = sph.r / 600, c = Math.cos(sph.th), s = Math.sin(sph.th); target.set(drag.t.x - (dx * c + dy * s) * k * 1.2, 0, drag.t.z - (-dx * s + dy * c) * k * 1.2); }
      else { sph.th = drag.th - dx * .006; sph.ph = Math.max(.25, Math.min(1.35, drag.ph - dy * .005)); } want = null; });
    R.domElement.addEventListener('pointerup', e => { if (drag && drag.moved < 5) clickAt(e); drag = null; });
    R.domElement.addEventListener('contextmenu', e => e.preventDefault());
    R.domElement.addEventListener('wheel', e => { e.preventDefault(); sph.r = Math.max(4, Math.min(900, sph.r * (1 + Math.sign(e.deltaY) * .1))); want = null; }, { passive: false });
    R.domElement.addEventListener('dblclick', () => { if (S.sel) enter(); });
    new ResizeObserver(size).observe(cv); size(); loop();
  }
  function size() { if (!R) return; const w = cv.clientWidth, h = cv.clientHeight; R.setSize(w, h, false); R.domElement.style.width = w + 'px'; R.domElement.style.height = h + 'px'; cam.aspect = w / h; cam.updateProjectionMatrix(); }
  function newScene() {
    if (scene) scene.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    scene = new THREE.Scene(); pick = []; labels = []; movers = []; lb.innerHTML = '';
    scene.add(new THREE.HemisphereLight('#FFFFFF', '#D8D2E8', 1.7));
    const dl = new THREE.DirectionalLight('#FFF4E6', 2.1); dl.position.set(60, 120, 50); dl.castShadow = true; dl.shadow.mapSize.set(2048, 2048); scene.add(dl); scene.userData.dl = dl;
  }
  function setShadow(span) { const dl = scene.userData.dl; Object.assign(dl.shadow.camera, { left: -span, right: span, top: span, bottom: -span, near: .1, far: span * 8 }); dl.position.set(target.x + span * .6, span * 1.6, target.z + span * .5); dl.target.position.copy(target); scene.add(dl.target); dl.shadow.camera.updateProjectionMatrix(); }
  function fly(t, r, th, ph) { want = { t: new THREE.Vector3(t[0], 0, t[1]), r, th: th ?? sph.th, ph: ph ?? sph.ph }; }
  function loop() {
    raf = requestAnimationFrame(loop); if (!root.isConnected) { cancelAnimationFrame(raf); return; }
    if (want) { target.lerp(want.t, .12); sph.r += (want.r - sph.r) * .12; sph.th += (want.th - sph.th) * .12; sph.ph += (want.ph - sph.ph) * .12; if (Math.abs(want.r - sph.r) < .01 * want.r && target.distanceTo(want.t) < .01 * want.r) want = null; }
    cam.position.set(target.x + sph.r * Math.sin(sph.ph) * Math.sin(sph.th), sph.r * Math.cos(sph.ph), target.z + sph.r * Math.sin(sph.ph) * Math.cos(sph.th)); cam.lookAt(target);
    const t = performance.now() / 1000; movers.forEach(f => f(t));
    if (scene) R.render(scene, cam);
    const w = cv.clientWidth, h = cv.clientHeight, v = new THREE.Vector3();
    for (const L of labels) { v.copy(L.p).project(cam); const vis = v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1; L.el.style.display = vis ? '' : 'none'; if (vis) L.el.style.transform = `translate(${((v.x + 1) / 2 * w).toFixed(0)}px,${((1 - v.y) / 2 * h).toFixed(0)}px) translate(-50%,-100%)`; }
  }
  function label(p, html, cls, key) { const el = document.createElement('div'); el.className = 'smL ' + (cls || ''); el.innerHTML = html; if (key) { el.dataset.key = key; el.addEventListener('click', () => select(key)); } lb.appendChild(el); labels.push({ p: new THREE.Vector3(...p), el, key }); return el; }
  function keyed(obj, key) { obj.userData.key = key; obj.traverse(o => { if (o.isMesh) { o.userData.key = key; pick.push(o); } }); return obj; }
  function clickAt(e) { const r = R.domElement.getBoundingClientRect(), m = new THREE.Vector2((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1), rc = new THREE.Raycaster(); rc.setFromCamera(m, cam); const hit = rc.intersectObjects(pick, false)[0]; select(hit ? hit.object.userData.key : null); }
  function applyDim() {
    if (S.flat) return draw2d();
    scene.traverse(o => { if (!o.isMesh || o.userData.base) return; const k = o.userData.key; if (!o.userData.m0) o.userData.m0 = o.material; const dim = S.sel && k && k !== S.sel && !(S.selGroup && S.selGroup.includes(k)); o.material = dim ? grayOf(o.userData.m0) : o.userData.m0; });
    labels.forEach(L => L.el.classList.toggle('dim', !!(S.sel && L.key && L.key !== S.sel && !(S.selGroup && S.selGroup.includes(L.key)))));
    labels.forEach(L => L.el.classList.toggle('on', !!(S.sel && L.key === S.sel)));
  }

  // ----- 資料 -----
  const visibleStores = list => list.filter(s => S.types[s.type] && (!S.dcOnly || s.dc));
  const inStage = cn => { const L = STAGES[S.stage]; return !L || L.includes(cn); };
  async function loadLive() {
    try {
      const [hh, wo, care, rem] = await Promise.all([api('/admin/households?store=' + encodeURIComponent('Digital City 台中逢甲店')), api('/admin/workorders?store=' + encodeURIComponent('Digital City 台中逢甲店')), api('/admin/care?store=' + encodeURIComponent('Digital City 台中逢甲店')), api('/admin/reminders?store=' + encodeURIComponent('Digital City 台中逢甲店'))]);
      S.live = { hh: hh.households || [], wo: wo.orders || [], care: care.events || [], rem: rem.reminders || [] };
    } catch (e) { S.live = { hh: [], wo: [], care: [], rem: [], err: e.message }; }
  }

  // ----- 第一層：全台縣市立體色塊 -----
  function buildL1() {
    newScene();
    const cnt = {}; visibleStores(STORES).forEach(s => cnt[s.county] = (cnt[s.county] || 0) + 1);
    for (const c of G.counties) {
      const n = cnt[c.n] || 0, h = 1 + n * .42, st = inStage(c.n);
      const m = extrude(c.p, h, ramp(AGE[c.n] || 15)); keyed(m, c.n); scene.add(m);
      if (n || c.n === '連江縣') label([c.c[0], h + .5, c.c[1]], `<b>${esc(c.n.replace(/[縣市]$/, ''))}</b>${n ? `<i>${n}</i>` : ''}${S.stage !== 'extend' && st ? `<em>${STN[S.stage]}</em>` : ''}`, 'cty' + (st ? '' : ' off'), c.n);
    }
    const base = new THREE.Mesh(new THREE.CircleGeometry(320, 64), new THREE.ShadowMaterial({ opacity: .12 })); base.rotation.x = -Math.PI / 2; base.position.y = -.05; base.receiveShadow = true; base.userData.base = 1; scene.add(base);
    label([150, 2, -40], '金門（內嵌）', 'note'); label([150, 2, -125], '連江（內嵌）', 'note');
    target.set(30, 0, 0); setShadow(240); fly([30, -6], 640, -0.12, 0.46);
  }
  // ----- 第二層：縣市內行政區與門市建築 -----
  function buildL2() {
    newScene(); const cn = S.county, towns = G.towns[cn] || [], cty = G.counties.find(c => c.n === cn);
    const stores = visibleStores(STORES.filter(s => s.county === cn)), byTown = {};
    // 視角對準門市分布（不是整個縣市，山區不佔畫面）
    const pts = (stores.length ? stores : STORES.filter(s => s.county === cn)).map(s => [s.x, s.y]), cb = pts.length ? pts.reduce((a, [x, y]) => [Math.min(a[0], x), Math.min(a[1], y), Math.max(a[2], x), Math.max(a[3], y)], [1e9, 1e9, -1e9, -1e9]) : bboxOf(cty.p);
    const span = Math.max(14, Math.max(cb[2] - cb[0], cb[3] - cb[1]) * 1.35), sc = span / 34, cx = (cb[0] + cb[2]) / 2, cy = (cb[1] + cb[3]) / 2; stores.forEach(s => (byTown[s.town] = byTown[s.town] || []).push(s));
    for (const t of towns) { const has = byTown[t.n]; const m = extrude(t.p, .25 * sc, has ? '#F4EEE6' : '#ECEAE7'); m.userData.base = 1; m.receiveShadow = true; scene.add(m);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry, 30), new THREE.LineBasicMaterial({ color: '#D9CFC4' })); edges.userData.base = 1; scene.add(edges);
      if (has) label([t.c[0], .3 * sc, t.c[1]], esc(t.n), 'twn'); }
    for (const s of stores) { const b = storeBuilding(s); b.scale.setScalar(sc * 1.15); b.position.set(s.x, .25 * sc, s.y); b.rotation.y = hash(s.code) * .6 - .3; keyed(b, s.code); scene.add(b);
      if (s.pilot || stores.length <= 18) label([s.x, (s.type === 'd' ? 3.2 : 2.4) * sc * 1.15 + .3 * sc, s.y], `${s.pilot ? '<em>試點</em>' : ''}${esc(s.short)}`, s.pilot ? 'st pil' : 'st', s.code); }
    // 技師出勤（模擬）：試點縣市才顯示
    if (cn === '台中市') { const home = STORES.find(s => s.code === '04129'), dst = [[home.x + 2.2, home.y - 1.6], [home.x - 1.8, home.y + 2.4], [home.x + 3.2, home.y + 1.2]];
      dst.forEach((d, i) => { const v = van(i ? '#2B5C9E' : BRAND); v.scale.setScalar(sc * 1.1); v.position.set(home.x, .3 * sc, home.y); keyed(v, '04129'); scene.add(v); const el = label([home.x, 1, home.y], i ? '陳師傅｜冷氣清洗' : '吳師傅｜安裝中', 'van', '04129');
        movers.push(t => { const k = (Math.sin(t * .35 + i * 2) + 1) / 2, x = home.x + (d[0] - home.x) * k, z = home.y + (d[1] - home.y) * k; v.position.x = x; v.position.z = z; v.rotation.y = Math.atan2(-(d[1] - home.y), d[0] - home.x) + (Math.cos(t * .35 + i * 2) < 0 ? Math.PI : 0); const L = labels.find(q => q.el === el); L.p.set(x, sc * 1.1, z); }); }); }
    target.set(cx, 0, cy); setShadow(span * 1.2); fly([cx, cy + span * .06], span * 1.35, -0.22, 0.78);
  }
  // ----- 第三層：逢甲店街區（一戶一棟房子） -----
  const HOUSES = (() => { const H = [], rng = (i, k) => hash('h' + i + k); let i = 0;
    for (let gx = -3; gx <= 3; gx++) for (let gz = -3; gz <= 3; gz++) { if (Math.abs(gx) < 1 && Math.abs(gz) < 1) continue; if (rng(i, 'skip') < .28) { i++; continue; }
      H.push({ id: 'H' + i, x: gx * 4.2 + (rng(i, 'x') - .5) * 1.2, z: gz * 4.2 + (rng(i, 'z') - .5) * 1.2, sub: rng(i, 's') < .38, heat: rng(i, 'h') }); i++; }
    return H; })();
  function houseLinks() { // 真實示範家庭（逢甲店）對應到街區裡的房子
    const hh = (S.live && S.live.hh) || []; const pos = ['H8', 'H17', 'H30', 'H38', 'H44', 'H12'], out = {};
    hh.forEach((h, i) => { const hid = HOUSES.find(x => x.id === pos[i]) ? pos[i] : HOUSES[i * 3].id; out[hid] = h; }); return out;
  }
  function houseState(h, real) {
    if (real) { const wo = (S.live.wo || []).find(o => o.household_id === real.id && o.status !== '已完成'); const ev = (S.live.care || []).find(e => e.household === real.name && !e.followed_up);
      if (ev) return ['ev', '#E07B12', '關懷事件待關心']; if (wo) return ['wo', '#2B5C9E', wo.kind + '｜' + wo.status]; if (real.phase >= 9) return ['ok', '#138F3B', '關懷中']; if (real.phase >= 1) return ['wait', '#E0A030', real.phase_label]; return ['new', '#9A9893', real.phase_label]; }
    return h.sub ? ['sim', '#9BC9A8', '訂閱中（模擬）'] : ['none', null, '未訂閱（模擬）'];
  }
  function buildL3() {
    newScene(); const links = houseLinks(); S.links = links;
    const ground = bx(34, .2, 34, '#E7F1DE'); ground.position.y = -.2; ground.userData.base = 1; scene.add(ground);
    for (let k = -3; k <= 3; k++) { const a = bx(34, .04, .9, '#C9CCD3', 0, 0, k * 4.2 + 2.1); a.userData.base = 1; scene.add(a); const b = bx(.9, .04, 34, '#C9CCD3', k * 4.2 + 2.1, 0, 0); b.userData.base = 1; scene.add(b); }
    // 訂閱熱度（模擬）：地面淡紅
    for (const h of HOUSES) if (h.sub) { const d = new THREE.Mesh(new THREE.CircleGeometry(1.6 + h.heat, 24), new THREE.MeshBasicMaterial({ color: '#F6C6D3', transparent: true, opacity: .35 + h.heat * .25 })); d.rotation.x = -Math.PI / 2; d.position.set(h.x, .03, h.z); d.userData.base = 1; scene.add(d); }
    const st = STORES.find(s => s.code === '04129'), sb = storeBuilding(st); sb.scale.setScalar(1.15); keyed(sb, '04129'); scene.add(sb); label([0, 3.4, 0], '全國電子 Digital City 逢甲店', 'st pil', '04129');
    for (const h of HOUSES) { const real = links[h.id], [k, col] = houseState(h, real); const g = house(real ? '#FFFFFF' : '#F4F1EC', real ? '#B9776B' : '#C9B8A6', col); g.position.set(h.x, 0, h.z); g.rotation.y = hash(h.id) > .5 ? 0 : Math.PI / 2; keyed(g, h.id); scene.add(g);
      if (real) label([h.x, 1.9, h.z], `${esc(real.name)}${k === 'ev' ? ' ⚠' : ''}`, 'hs ' + k, h.id);
      if (hash(h.id + 't') > .55) { const t = tree(1, hash(h.id) > .7 ? '#F2B8CB' : '#9CCB8A'); t.position.set(h.x + 1.3, 0, h.z - 1); t.userData.base = 1; t.traverse(o => o.userData.base = 1); scene.add(t); } }
    // 技師車（今日工單）
    const today = (S.live.wo || []).filter(o => o.status === '已指派' || o.status === '進行中');
    today.slice(0, 3).forEach((o, i) => { const hid = Object.keys(links).find(k => links[k].id === o.household_id); const h = HOUSES.find(x => x.id === hid); if (!h) return; const v = van(i ? '#2B5C9E' : BRAND); scene.add(keyed(v, hid)); const el = label([0, 1, 0], `${esc(o.assignee || '技師')}｜${esc(o.status)}`, 'van', hid);
      movers.push(t => { const k = Math.min(1, ((t * .08 + i * .3) % 1.3)), x = h.x * Math.min(1, k * 2), z = k < .5 ? 2.1 : 2.1 + (h.z - 2.1) * Math.min(1, (k - .5) * 2); v.position.set(x + 1, .02, z); v.rotation.y = k < .5 ? (h.x > 0 ? 0 : Math.PI) : (h.z > 2.1 ? -Math.PI / 2 : Math.PI / 2); labels.find(q => q.el === el).p.set(x + 1, 1.2, z); }); });
    // 關懷事件脈動
    Object.entries(links).forEach(([hid, real]) => { if (houseState(null, real)[0] !== 'ev') return; const h = HOUSES.find(x => x.id === hid); const ring = new THREE.Mesh(new THREE.RingGeometry(.9, 1.1, 32), new THREE.MeshBasicMaterial({ color: '#E07B12', transparent: true })); ring.rotation.x = -Math.PI / 2; ring.position.set(h.x, .06, h.z); ring.userData.base = 1; scene.add(ring); movers.push(t => { const k = (t % 1.6) / 1.6; ring.scale.setScalar(1 + k * 1.8); ring.material.opacity = 1 - k; }); });
    target.set(0, 0, 0); setShadow(22); fly([0, 1], 46, -0.6, 0.86);
  }

  // ----- 平面備援（手機或不支援 WebGL） -----
  function draw2d() {
    svg.hidden = false; cv.hidden = true; lb.innerHTML = '';
    let vb, body = '';
    const P = ps => ps.map(p => 'M' + p.map(([x, y]) => x.toFixed(1) + ' ' + y.toFixed(1)).join('L') + 'Z').join('');
    const dim = k => S.sel && k !== S.sel;
    if (S.level === 1) { const cnt = {}; visibleStores(STORES).forEach(s => cnt[s.county] = (cnt[s.county] || 0) + 1); vb = [-110, -210, 300, 400];
      for (const c of G.counties) body += `<path d="${P(c.p)}" fill="${dim(c.n) ? GRAY : inStage(c.n) ? ramp(AGE[c.n] || 15) : '#E6E2E4'}" stroke="#fff" stroke-width=".6" data-k="${esc(c.n)}"/>${cnt[c.n] ? `<text x="${c.c[0]}" y="${c.c[1]}" font-size="7" text-anchor="middle" data-k="${esc(c.n)}" fill="#222">${esc(c.n.replace(/[縣市]$/, ''))} ${cnt[c.n]}</text>` : ''}`; }
    else if (S.level === 2) { const cty = G.counties.find(c => c.n === S.county), bb = bboxOf(cty.p), pad = 3; vb = [bb[0] - pad, bb[1] - pad, bb[2] - bb[0] + pad * 2, bb[3] - bb[1] + pad * 2]; const f = (vb[2] / 100);
      for (const t of G.towns[S.county] || []) body += `<path d="${P(t.p)}" fill="#F4EEE6" stroke="#D9CFC4" stroke-width="${.3 * f}"/>`;
      for (const s of visibleStores(STORES.filter(s => s.county === S.county))) body += `<circle cx="${s.x}" cy="${s.y}" r="${(s.pilot ? 1.6 : 1.1) * f}" fill="${dim(s.code) ? GRAY : TYC[s.type]}" stroke="${s.dc ? '#1F2328' : '#fff'}" stroke-width="${.4 * f}" data-k="${s.code}"/>${s.pilot ? `<text x="${s.x}" y="${s.y - 2 * f}" font-size="${3 * f}" text-anchor="middle" fill="#222" data-k="${s.code}">${esc(s.short)}</text>` : ''}`; }
    else { vb = [-17, -17, 34, 34]; const links = houseLinks(); S.links = links; body += `<rect x="-17" y="-17" width="34" height="34" fill="#E7F1DE"/><rect x="-1.6" y="-1.2" width="3.2" height="2.4" fill="${BRAND}" data-k="04129"/>`;
      for (const h of HOUSES) { const real = links[h.id], [, col] = houseState(h, real); body += `<rect x="${h.x - .6}" y="${h.z - .6}" width="1.2" height="1.2" rx=".2" fill="${dim(h.id) ? GRAY : col || '#F4F1EC'}" stroke="#999" stroke-width=".05" data-k="${h.id}"/>${real ? `<text x="${h.x}" y="${h.z - .9}" font-size=".9" text-anchor="middle" data-k="${h.id}">${esc(real.name)}</text>` : ''}`; } }
    svg.setAttribute('viewBox', vb.join(' ')); svg.innerHTML = body;
  }
  svg.addEventListener('click', e => { const k = e.target.closest('[data-k]'); select(k ? k.dataset.k : null); });
  svg.addEventListener('dblclick', () => { if (S.sel) enter(); });

  // ----- 選取、往下鑽、往上捲 -----
  function select(k) { S.sel = k || null; S.selGroup = null; S.tab = S.level === 2 ? 'ops' : S.tab; applyDim(); panel(); kpis(); }
  function enter() {
    if (S.level === 1 && S.sel) { S.county = S.sel; S.level = 2; S.sel = null; build(); }
    else if (S.level === 2 && S.sel) { if (S.sel !== '04129') { toast('第三層街區先開放試點的逢甲店；其他門市於第二階段由企業提供資料後開放'); return; } S.store = S.sel; S.level = 3; S.sel = null; build(); }
  }
  function up() { if (S.level === 3) { S.level = 2; S.sel = S.store; } else if (S.level === 2) { S.level = 1; S.sel = S.county; } build(); applyDim(); panel(); }
  async function build() {
    if (S.level === 3 && !S.live) { await loadLive(); }
    if (S.flat) { draw2d(); } else { svg.hidden = true; cv.hidden = false; initGL(); size(); (S.level === 1 ? buildL1 : S.level === 2 ? buildL2 : buildL3)(); applyDim(); }
    top(); kpis(); panel(); legend(); filters(); src();
  }

  // ----- 介面 -----
  function top() {
    const bc = [['全台', 1]]; if (S.level >= 2) bc.push([S.county, 2]); if (S.level >= 3) bc.push(['逢甲店街區', 3]);
    $('.smbc').innerHTML = bc.map(([n, l], i) => i < bc.length - 1 ? `<button data-sm="bc" data-l="${l}">${esc(n)}</button><span>›</span>` : `<b>${esc(n)}</b>`).join('') + (S.level < 3 ? '<small>點選聚焦，雙擊或「進入」往下鑽</small>' : '');
    $('.smup').hidden = S.level === 1;
    const P = S.level === 1 ? [['pilot', '試點視角'], ['all', '全台門市'], ['dc', '只看 Digital City']] : S.level === 2 ? [['pilots', '試點門市'], ['fit', '整個縣市']] : [['wait', '等候安裝'], ['ev', '關懷事件'], ['fit', '整個街區']];
    $('.smpre').innerHTML = P.map(([k, n]) => `<button data-sm="pre" data-k="${k}">${n}</button>`).join('');
    $('.smmode').textContent = S.flat ? '切換 3D' : '切換平面'; $('.smmode').hidden = !webgl;
  }
  function kpis() {
    let K = [], ins = '';
    if (S.level === 1) { const v = visibleStores(STORES), dc = v.filter(s => s.dc).length, cs = new Set(v.map(s => s.county)).size;
      K = [['門市', v.length, '公開'], ['Digital City', dc, '公開'], ['涵蓋縣市', cs, '公開'], [STN[S.stage] + '範圍', S.stage === 'extend' ? '全台' : STAGES[S.stage].length + ' 縣市', '規劃']];
      ins = S.stage === 'pilot' ? '試點選台中市：逢甲、公益、北屯總站 3 家 Digital City 大型門市都在市區，同一組技師可以統一排程、合併到府。' : S.stage === 'expand' ? '擴展期往六都：台北市 65 歲以上占比 24.18% 全台最高，門市也最密集。' : '延伸期覆蓋 21 縣市 316 家門市；嘉義縣、南投縣 65 歲以上占比高但門市較少，適合由大型門市支援。'; }
    else if (S.level === 2) { const v = visibleStores(STORES.filter(s => s.county === S.county)), pil = v.filter(s => s.pilot);
      K = [['門市', v.length, '公開'], ['Digital City', v.filter(s => s.dc).length, '公開'], ['65 歲以上占比', (AGE[S.county] || '—') + '%', '公開'], [pil.length ? '試點門市' : '一般／大型', pil.length ? pil.length + ' 家' : v.filter(s => s.type === 'g').length + '／' + v.filter(s => s.type === 'l').length, pil.length ? '規劃' : '公開']];
      ins = S.county === '台中市' ? '逢甲店今天有合併到府工單：揪夥伴已完成扶手，吳師傅裝關懷設備、陳師傅洗冷氣，同一天到府。點逢甲店再「進入街區」。' : `${S.county}門市 ${v.length} 家，第二階段由企業提供營運資料後，才能看到揪居家與派工。`; }
    else { const L = S.live || {}, today = (L.wo || []).filter(o => o.status === '已指派' || o.status === '進行中'), wait = (L.wo || []).filter(o => o.status === '待排程' || o.status === '待確認'), ev = (L.care || []).filter(e => !e.followed_up);
      K = [['服務家庭', (L.hh || []).length + ' 戶', '即時'], ['今日到府', today.length + ' 張', '即時'], ['待排程／待確認', wait.length + ' 張', '即時'], ['待關心事件', ev.length + ' 件', '即時']];
      const r = (L.rem || []).filter(x => x.status === '待處理'); ins = wait.length ? `${wait[0].household}的${wait[0].kind}等門市確認時段；${r.length ? '另有 ' + r.length + ' 則主動提醒可轉成保養工單。' : ''}` : r.length ? `${r[0].household}的${r[0].device}${r[0].kind}到期，點房子即可建立保養工單草稿。` : '街區目前沒有待處理工單。'; }
    $('.smk').innerHTML = K.map(([n, v, t]) => `<div class="smkp"><span>${n}<i class="${t === '模擬' ? 'sim' : t === '即時' ? 'live' : t === '規劃' ? 'plan' : 'pub'}">${t}</i></span><b>${v}</b></div>`).join('');
    $('.smins').innerHTML = `<b>洞察</b> ${esc(ins)}`;
  }
  function panel() {
    const P = $('.smside'); let h = '';
    if (S.level === 1) {
      if (!S.sel) h = `<div class="smph">全台縣市</div><div class="smpb"><p class="mu">高度＝門市數，顏色＝65 歲以上人口占比。點選縣市後，其他縣市轉灰。</p>${G.counties.map(c => [c, STORES.filter(s => s.county === c.n).length]).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([c, n]) => `<button class="smrow" data-sm="sel" data-k="${esc(c.n)}"><span>${esc(c.n)}</span><b>${n}</b></button>`).join('')}</div>`;
      else { const v = visibleStores(STORES.filter(s => s.county === S.sel)); h = `<div class="smph">${esc(S.sel)}<small>已選取｜其他縣市已淡化</small></div><div class="smpb">
        ${['g', 'l', 'e', 'd'].map(t => `<div class="kv"><span><i class="dt" style="background:${TYC[t]}"></i>${TYN[t]}</span><b>${v.filter(s => s.type === t).length}</b></div>`).join('')}
        <div class="kv"><span>其中 Digital City</span><b>${v.filter(s => s.dc).length}</b></div><div class="kv"><span>65 歲以上人口占比</span><b>${AGE[S.sel] || '—'}%</b></div>
        <div class="kv"><span>導入階段</span><b>${STAGES.pilot.includes(S.sel) ? '試點' : STAGES.expand.includes(S.sel) ? '擴展' : '延伸'}</b></div>
        <button class="smgo" data-sm="enter">進入${esc(S.sel)} ›</button></div>`; }
    } else if (S.level === 2) {
      const s = STORES.find(x => x.code === S.sel);
      if (!s) h = `<div class="smph">${esc(S.county)}<small>${visibleStores(STORES.filter(x => x.county === S.county)).length} 家門市</small></div><div class="smpb"><p class="mu">建築依官網店型：一般門市＝小店面、大型門市＝紅色招牌大樓（Digital City 掛招牌）、體驗館＝藍色玻璃館、百貨＝百貨大樓。位置依行政區概略標示。</p>${STORES.filter(x => x.county === S.county && x.pilot).map(x => `<button class="smrow" data-sm="sel" data-k="${x.code}"><span>${esc(x.short)}</span><b>試點</b></button>`).join('')}</div>`;
      else { const T = [['ops', '營運'], ['jjj', '揪居家'], ['wo', '派工'], ['rv', '口碑'], ['loc', '選址']], tb = S.tab;
        let body = '';
        if (tb === 'ops') body = `<div class="kv"><span>官網類型</span><b>${TYN[s.type]}</b></div><div class="kv"><span>Digital City</span><b>${s.dc ? '是' : '否'}</b></div><div class="kv"><span>行政區</span><b>${esc(s.town)}</b></div><div class="mu" style="margin-top:6px">${esc(s.addr)}</div><div class="mu">門市代號 ${esc(s.code)}｜公開資料</div>`;
        else if (tb === 'jjj') body = s.pilot ? (s.code === '04129' ? `<div class="kv"><span>服務家庭</span><b>${S.live ? S.live.hh.length + ' 戶' : '進入街區後載入'}</b></div><div class="kv"><span>揪居家情境角</span><b>有</b></div><div class="mu">即時資料：由營運平台的家庭與工單帶入</div>` : `<div class="mu">試點門市｜示範資料只建立逢甲店與公益店</div>`) : '<div class="mu">第二階段由企業提供營運資料後開放</div>';
        else if (tb === 'wo') body = s.code === '04129' ? `<div class="mu">今日合併到府：揪夥伴扶手 → 吳師傅關懷設備 → 陳師傅冷氣清洗（統一排程）</div>` : '<div class="mu">尚無派工資料</div>';
        else if (tb === 'rv') body = `<div class="kv"><span>商家檔案星等</span><b>${(4.2 + hash(s.code) * .6).toFixed(1)}</b></div><div class="kv"><span>本月評論提及安裝</span><b>${Math.round(hash(s.code + 'r') * 9)} 則</b></div><div class="mu">模擬資料｜正式版接商家檔案彙總</div>`;
        else body = `<div class="kv"><span>縣市 65 歲以上占比</span><b>${AGE[s.county]}%</b></div><div class="kv"><span>同行政區門市</span><b>${STORES.filter(x => x.county === s.county && x.town === s.town).length} 家</b></div><div class="kv"><span>店型空間</span><b>${s.type === 'l' || s.type === 'e' ? '可設揪居家情境角' : '空間較小'}</b></div><div class="mu">選址評估：公開資料＋規則試算</div>`;
        h = `<div class="smph">${esc(s.short)}<small>${s.pilot ? '試點門市｜' : ''}其他門市已淡化</small></div><div class="smtb">${T.map(([k, n]) => `<button data-sm="tab" data-k="${k}" class="${tb === k ? 'on' : ''}">${n}</button>`).join('')}</div><div class="smpb">${body}
          ${s.code === '04129' ? '<button class="smgo" data-sm="enter">進入逢甲店街區 ›</button>' : s.pilot ? '<button class="smgo" disabled>街區示範先開放逢甲店</button>' : ''}</div>`; }
    } else {
      const hid = S.sel, real = S.links && S.links[hid], hs = HOUSES.find(x => x.id === hid);
      if (!hid || hid === '04129') { const r = ((S.live && S.live.rem) || []).filter(x => x.status === '待處理');
        h = `<div class="smph">逢甲店街區<small>一戶一棟房子｜地址不顯示</small></div><div class="smpb"><p class="mu">白色房子是示範系統裡的真實家庭；米色房子與地面淡紅熱度為模擬訂閱分布。</p>${(S.live.hh || []).map(x => `<button class="smrow" data-sm="selh" data-id="${x.id}"><span>${esc(x.name)}</span><b>${esc(x.phase_label)}</b></button>`).join('')}${r.length ? `<div class="mu" style="margin-top:8px">主動提醒 ${r.length} 則待處理</div>` : ''}</div>`; }
      else if (real) { const [k, col, txt] = houseState(hs, real), rem = (S.live.rem || []).filter(x => x.household_id === real.id), wo = (S.live.wo || []).filter(o => o.household_id === real.id && o.status !== '已完成');
        h = `<div class="smph">${esc(real.name)}<small>已選取｜負責門市與技師保留顏色</small></div><div class="smpb"><div class="kv"><span>狀態</span><b style="color:${col}">${esc(txt)}</b></div><div class="kv"><span>長輩</span><b>${esc(real.elder_note || '—')}</b></div><div class="kv"><span>子女帳號</span><b>${esc(real.owner)}</b></div>
         ${wo.map(o => `<div class="kv"><span>${esc(o.code)}</span><b>${esc(o.status)}${o.label && o.label !== '待排程' ? '｜' + esc(o.label) : ''}</b></div>`).join('')}
         ${rem.map(x => `<div class="kv"><span>${esc(x.device)}${esc(x.kind)}</span><b>${esc(x.status)}</b></div>`).join('')}
         <button class="smgo" data-sm="draft" data-id="${real.id}">建立保養工單草稿</button><div class="mu">草稿送到門市顧問，確認時段後派工｜地址只有負責顧問與技師可見</div></div>`; }
      else h = `<div class="smph">模擬戶<small>示意資料</small></div><div class="smpb"><div class="kv"><span>狀態</span><b>${hs && hs.sub ? '訂閱中（模擬）' : '未訂閱（模擬）'}</b></div><p class="mu">示意房子不連到真實資料；點白色房子可操作示範家庭。</p></div>`;
    }
    P.innerHTML = h;
  }
  function legend() {
    $('.smleg').innerHTML = S.level === 1 ? `<span>高度＝門市數</span><span><i class="ramp"></i>65 歲以上占比 15%→24%</span><span><em class="stg">試點</em>本階段縣市</span><span><i class="dt" style="background:${GRAY}"></i>未選取</span>`
      : S.level === 2 ? Object.entries(TYN).map(([k, n]) => `<span><i class="dt" style="background:${TYC[k]}"></i>${n}</span>`).join('') + '<span>黑框＝Digital City</span><span><i class="dt" style="background:#2B5C9E"></i>技師車（模擬）</span>'
        : `<span><i class="dt" style="background:#138F3B"></i>關懷中</span><span><i class="dt" style="background:#E0A030"></i>等候</span><span><i class="dt" style="background:#2B5C9E"></i>工單進行</span><span><i class="dt" style="background:#E07B12"></i>關懷事件</span><span><i class="dt" style="background:#F6C6D3"></i>訂閱熱度（模擬）</span>`;
  }
  function filters() {
    const F = $('.smflt'); if (S.level === 3) { F.innerHTML = ''; return; }
    F.innerHTML = `${Object.entries(TYN).map(([k, n]) => `<label><input type="checkbox" data-smt="${k}" ${S.types[k] ? 'checked' : ''}><i class="dt" style="background:${TYC[k]}"></i>${n}</label>`).join('')}<label><input type="checkbox" data-smdc ${S.dcOnly ? 'checked' : ''}>只看 Digital City</label>
     ${S.level === 1 ? `<span class="smseg">${Object.entries(STN).map(([k, n]) => `<button data-sm="stage" data-k="${k}" class="${S.stage === k ? 'on' : ''}">${n}</button>`).join('')}</span>` : ''}`;
  }
  function src() { $('.smsrc').innerHTML = '資料來源：門市＝全國電子官網門市據點（2026/10/24 整理，316 家，位置依行政區概略標示）｜65 歲以上人口占比＝內政部 2025 年底（中央社 2026/1/9）｜行政區界＝內政部國土測繪中心開放資料｜第三層家庭、工單、關懷事件＝示範系統即時資料；房子位置、訂閱熱度、技師車與口碑為模擬。'; }

  root.addEventListener('click', async e => {
    const b = e.target.closest('[data-sm]'); if (!b || b.disabled) return; const a = b.dataset.sm;
    if (a === 'up') up(); else if (a === 'enter') enter(); else if (a === 'sel') select(b.dataset.k);
    else if (a === 'bc') { const l = +b.dataset.l; while (S.level > l) { if (S.level === 3) { S.level = 2; S.sel = S.store; } else { S.level = 1; S.sel = S.county; } } build(); }
    else if (a === 'mode') { S.flat = !S.flat; build(); }
    else if (a === 'tab') { S.tab = b.dataset.k; panel(); }
    else if (a === 'stage') { S.stage = b.dataset.k; build(); }
    else if (a === 'selh') { const id = +b.dataset.id, hid = Object.keys(S.links || {}).find(k => S.links[k].id === id); select(hid); }
    else if (a === 'pre') { const k = b.dataset.k;
      if (k === 'pilot') { S.stage = 'pilot'; S.sel = '台中市'; build(); } else if (k === 'all') { S.stage = 'extend'; S.sel = null; S.dcOnly = false; build(); } else if (k === 'dc') { S.dcOnly = true; build(); }
      else if (k === 'pilots') { S.sel = null; S.selGroup = STORES.filter(s => s.pilot && s.county === S.county).map(s => s.code); S.sel = S.selGroup[0] || null; applyDim(); panel(); }
      else if (k === 'fit') { S.sel = null; build(); }
      else if (k === 'wait' || k === 'ev') { const want = k === 'wait' ? ['wait', 'wo'] : ['ev']; const ids = Object.entries(S.links || {}).filter(([, r]) => want.includes(houseState(null, r)[0])).map(([h]) => h); S.selGroup = ids; S.sel = ids[0] || null; applyDim(); panel(); if (!ids.length) toast('目前沒有符合的家庭'); } }
    else if (a === 'draft') { b.disabled = true; try { const d = await api('/advisor/households/' + b.dataset.id + '/draft', { method: 'POST', body: { device: '冷氣｜臥室', kind: '清洗保養', reason: '服務地圖建立' } }); toast('已建立保養工單草稿 ' + d.code + '，門市顧問確認後派工'); await loadLive(); kpis(); panel(); } catch (x) { toast(x.message); b.disabled = false; } }
  });
  root.addEventListener('change', e => { const t = e.target; if (t.dataset.smt) { S.types[t.dataset.smt] = t.checked ? 1 : 0; build(); } else if (t.dataset.smdc !== undefined) { S.dcOnly = t.checked; build(); } });
  build();
  return { refresh: async () => { await loadLive(); build(); } };
}
