import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const capture = new URLSearchParams(location.search).has('capture');
if (capture) document.body.classList.add('capture');

const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: capture });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.95;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x04050a);
scene.fog = new THREE.FogExp2(0x05060c, 0.012);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.55;

const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 400);

// ---------- lights
scene.add(new THREE.HemisphereLight(0x8fa4ff, 0x120c06, 0.35));
const key = new THREE.DirectionalLight(0xffd9a0, 2.2); key.position.set(-30, 40, 20); scene.add(key);
const rim = new THREE.DirectionalLight(0x6f8cff, 1.4); rim.position.set(30, 10, -30); scene.add(rim);

// ---------- the tower: 44 twisting floors
const FLOORS = 44, FH = 1.05;
const tower = new THREE.Group(); scene.add(tower);
const slabGeo = new THREE.BoxGeometry(6.4, 0.12, 6.4);
const glassGeo = new THREE.BoxGeometry(6.0, FH - 0.14, 6.0);
const coreGeo = new THREE.BoxGeometry(5.2, FH - 0.3, 5.2);
const finGeo = new THREE.BoxGeometry(0.06, FH, 0.5);
const slabMat = new THREE.MeshStandardMaterial({ color: 0x15161c, metalness: 0.9, roughness: 0.35 });
function windowTex(seed) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 32; const x = c.getContext('2d'); const rnd = mulberry(seed);
  x.fillStyle = '#000'; x.fillRect(0, 0, 256, 32);
  for (let k = 0; k < 16; k++) { const on = rnd(); if (on < 0.28) continue; const warm = on > 0.85 ? '255,236,205' : '255,184,104';
    const g = x.createLinearGradient(0, 4, 0, 30); g.addColorStop(0, `rgba(${warm},${0.35 + on * 0.5})`); g.addColorStop(1, `rgba(${warm},${0.1 + on * 0.25})`);
    x.fillStyle = g; x.fillRect(k * 16 + 2, 4, 12, 26); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x6f82aa, metalness: 0.3, roughness: 0.03, transparent: true, opacity: 0.2, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.4, depthWrite: false });
const finMat = new THREE.MeshStandardMaterial({ color: 0x6b5233, metalness: 1, roughness: 0.4 });
const floors = [];
for (let i = 0; i < FLOORS; i++) {
  const g = new THREE.Group();
  const slab = new THREE.Mesh(slabGeo, slabMat); slab.position.y = -FH / 2; g.add(slab);
  const coreMat = new THREE.MeshStandardMaterial({ color: 0x050608, emissive: 0xffffff, emissiveMap: windowTex(100 + i), emissiveIntensity: 0, roughness: 0.9 });
  const core = new THREE.Mesh(coreGeo, coreMat); g.add(core);
  const glass = new THREE.Mesh(glassGeo, glassMat); g.add(glass);
  for (let k = 0; k < 4; k++) for (let f = -1; f <= 1; f++) {
    const fin = new THREE.Mesh(finGeo, finMat);
    const a = k * Math.PI / 2; const off = f * 2.0;
    fin.position.set(Math.cos(a) * 3.05 - Math.sin(a) * off, 0, Math.sin(a) * 3.05 + Math.cos(a) * off);
    fin.rotation.y = -a; g.add(fin);
  }
  g.userData = { i, coreMat, seed: Math.random() };
  tower.add(g); floors.push(g);
}
// crown
const crownMat = new THREE.MeshStandardMaterial({ color: 0x0c0d12, emissive: 0xffd9a8, emissiveMap: null, emissiveIntensity: 0, metalness: 0.2 });
const crown = new THREE.Mesh(new THREE.BoxGeometry(4.2, 2.6, 4.2), new THREE.MeshPhysicalMaterial({ color: 0xffe2b0, transparent: true, opacity: 0.22, roughness: 0.02, clearcoat: 1, depthWrite: false }));
const crownCore = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.0, 3.4), crownMat);
const crownG = new THREE.Group(); crownG.add(crownCore, crown); tower.add(crownG);
const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.12, 7, 8), finMat); crownG.add(spire); spire.position.y = 4.8;

// halo rings
const rings = [];
for (let r = 0; r < 3; r++) {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(7.5 + r * 2.2, 0.025, 8, 200), new THREE.MeshBasicMaterial({ color: 0xffd08a, transparent: true, opacity: 0.6 }));
  ring.rotation.x = Math.PI / 2; scene.add(ring); rings.push(ring);
}

// ground: dark mirror-ish disc + grid
const ground = new THREE.Mesh(new THREE.CircleGeometry(120, 96), new THREE.MeshStandardMaterial({ color: 0x07080d, metalness: 0.85, roughness: 0.35 }));
ground.rotation.x = -Math.PI / 2; ground.position.y = -0.6; scene.add(ground);
const grid = new THREE.PolarGridHelper(60, 24, 12, 96, 0x2a2414, 0x1a1710); grid.position.y = -0.58; grid.material.transparent = true; grid.material.opacity = 0.5; scene.add(grid);

// city blocks around (low instanced boxes with lit windows)
const cityN = 260;
const city = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0x0b0c12, emissive: 0x2a3a66, emissiveIntensity: 0.25, metalness: 0.6, roughness: 0.5 }), cityN);
{ const m = new THREE.Matrix4(); const rnd = mulberry(7);
  for (let i = 0; i < cityN; i++) {
    const a = rnd() * Math.PI * 2, d = rnd() < 0.4 ? 30 + rnd() * 14 : 66 + rnd() * 44; const h = 1 + Math.pow(rnd(), 2.2) * 16 * Math.max(0.15, 1 - d / 120);
    const w = 1.5 + rnd() * 3;
    m.compose(new THREE.Vector3(Math.cos(a) * d, h / 2 - 0.6, Math.sin(a) * d), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rnd() * 3), new THREE.Vector3(w, h, w));
    city.setMatrixAt(i, m);
  } }
scene.add(city);

// particles: gold dust
const PN = 2600; const pGeo = new THREE.BufferGeometry(); const pPos = new Float32Array(PN * 3); const pSeed = new Float32Array(PN * 3);
{ const rnd = mulberry(3); for (let i = 0; i < PN; i++) { pSeed[i * 3] = rnd() * Math.PI * 2; pSeed[i * 3 + 1] = rnd(); pSeed[i * 3 + 2] = 4 + rnd() * 26; } }
pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
const dust = new THREE.Points(pGeo, new THREE.PointsMaterial({ color: 0xffd59a, size: 0.09, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
scene.add(dust);

// stars
{ const n = 1500, g = new THREE.BufferGeometry(), a = new Float32Array(n * 3), rnd = mulberry(11);
  for (let i = 0; i < n; i++) { const th = rnd() * Math.PI * 2, ph = rnd() * 1.3; a[i * 3] = Math.cos(th) * Math.cos(ph) * 180; a[i * 3 + 1] = Math.sin(ph) * 180 + 10; a[i * 3 + 2] = Math.sin(th) * Math.cos(ph) * 180; }
  g.setAttribute('position', new THREE.BufferAttribute(a, 3)); scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 0.5, sizeAttenuation: true, transparent: true, opacity: 0.6, fog: false }))); }

// post
{ const c = document.createElement('canvas'); c.width = 256; c.height = 64; const x = c.getContext('2d'); x.fillStyle = '#000'; x.fillRect(0,0,256,64); for (let k = 0; k < 8; k++) { x.fillStyle = `rgba(255,214,160,${0.5 + (k % 3) * 0.2})`; x.fillRect(k * 32 + 3, 6, 26, 54); } const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; crownMat.emissiveMap = tx; crownMat.needsUpdate = true; }
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.7, 0.5, 0.78); composer.addPass(bloom);
composer.addPass(new OutputPass());

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false); composer.setSize(w, h); camera.aspect = w / h;
  camera.fov = w < h ? 58 : 42; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

// ---------- helpers
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const seg = (x, a, b) => clamp((x - a) / (b - a));
const sm = x => x * x * (3 - 2 * x);
const eio = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const lerp = (a, b, p) => a + (b - a) * p;
const ov = [...Array(5)].map((_, i) => document.getElementById('o' + (i + 1)));
const bars = [...document.querySelectorAll('#prog i')];
const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
addEventListener('pointermove', e => { mouse.tx = e.clientX / innerWidth - .5; mouse.ty = e.clientY / innerHeight - .5; });

// camera keyframes along scroll progress p
const KEYS = [
  { p: 0.00, r: 26, h: 3.5, a: 0.55, ly: 14 },
  { p: 0.18, r: 21, h: 9, a: 1.25, ly: 16 },
  { p: 0.40, r: 15, h: 44, a: 2.6, ly: 40 },
  { p: 0.62, r: 46, h: 30, a: 3.5, ly: 26 },
  { p: 0.82, r: 16, h: 54, a: 4.4, ly: 46 },
  { p: 1.00, r: 50, h: 34, a: 5.3, ly: 24 },
];
function camAt(p) {
  let i = 0; while (i < KEYS.length - 2 && p > KEYS[i + 1].p) i++;
  const A = KEYS[i], B = KEYS[i + 1], q = eio(seg(p, A.p, B.p));
  return { r: lerp(A.r, B.r, q), h: lerp(A.h, B.h, q), a: lerp(A.a, B.a, q), ly: lerp(A.ly, B.ly, q) };
}
const windows = [[0, .2], [.22, .4], [.44, .64], [.68, .84], [.88, 1.01]];

function renderAt(t, p) {
  mouse.x += (mouse.tx - mouse.x) * 0.05; mouse.y += (mouse.ty - mouse.y) * 0.05;
  const explode = sm(seg(p, 0.45, 0.6)) * (1 - sm(seg(p, 0.64, 0.76)));
  // floors
  for (const g of floors) {
    const i = g.userData.i;
    const y = i * FH * (1 + explode * 0.9);
    g.position.y = y + Math.sin(t * 0.8 + i * 0.4) * 0.12 * explode;
    g.rotation.y = i * 0.035 + t * 0.04 + explode * Math.sin(i * 0.7) * 0.5;
    g.position.x = explode * Math.sin(i * 1.3) * 1.2;
    // lights come on as camera rises past them, plus a slow shimmer
    const camY = camAt(p).h;
    const lit = clamp(sm(seg(camY + 6, y - 2, y + 4)) + seg(p, 0, 0.05) * 0.25);
    const shimmer = 0.75 + 0.25 * Math.sin(t * 1.7 + g.userData.seed * 30);
    g.userData.coreMat.emissiveIntensity = (0.25 + lit * 1.6) * shimmer;
  }
  const top = FLOORS * FH * (1 + explode * 0.9);
  crownG.position.y = top + 1.0; crownG.rotation.y = FLOORS * 0.035 + t * 0.04;
  crownMat.emissiveIntensity = 0.5 + 0.8 * sm(seg(p, 0.66, 0.82)) + 0.2 * Math.sin(t * 2);
  rings.forEach((r, k) => { r.position.y = 2 + k * 14 + Math.sin(t * 0.5 + k) * 1.5 + p * 30 * (k + 1) * 0.5; r.rotation.z = t * (0.1 + k * 0.05); r.material.opacity = 0.35 + 0.25 * Math.sin(t + k); r.scale.setScalar(1 + explode * 0.6); });
  // dust spirals upward around tower
  const pa = pGeo.attributes.position.array;
  for (let i = 0; i < PN; i++) {
    const a0 = pSeed[i * 3], u = pSeed[i * 3 + 1], rad = pSeed[i * 3 + 2];
    const yy = ((u * 70 + t * (0.6 + u)) % 70) - 2;
    const ang = a0 + t * 0.12 * (1.5 - u) + yy * 0.03;
    pa[i * 3] = Math.cos(ang) * rad; pa[i * 3 + 1] = yy; pa[i * 3 + 2] = Math.sin(ang) * rad;
  }
  pGeo.attributes.position.needsUpdate = true;
  // camera
  const c = camAt(p); const a = c.a + t * 0.025 + mouse.x * 0.3;
  camera.position.set(Math.cos(a) * c.r, c.h + mouse.y * -2, Math.sin(a) * c.r);
  camera.lookAt(0, c.ly, 0);
  bloom.strength = 0.6;
  // overlays
  ov.forEach((el, k) => { const [a0, b0] = windows[k]; const o = Math.min(seg(p, a0, a0 + 0.04), 1 - seg(p, b0 - 0.04, b0)); el.style.opacity = o; el.style.transform = `translateY(${(1 - o) * 24}px)`; });
  bars.forEach((b, k) => b.classList.toggle('on', p >= windows[k][0]));
  document.getElementById('hint').style.opacity = 1 - seg(p, 0, 0.05);
  composer.render();
}
window.renderAt = (t, p) => { if (!window.__warm) { window.__warm = 1; renderAt(t, p); } renderAt(t, p); };
window.ready = document.fonts.ready.then(() => true);

if (!capture) {
  let sp = 0;
  const loop = now => {
    const max = document.body.scrollHeight - innerHeight;
    const target = max > 0 ? scrollY / max : 0; sp += (target - sp) * 0.08;
    renderAt(now / 1000, sp); requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
