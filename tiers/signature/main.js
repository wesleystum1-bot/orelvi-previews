import * as THREE from 'three';

const capture = new URLSearchParams(location.search).has('capture');
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const eo = x => 1 - Math.pow(1 - x, 3);

// ---------- three.js embers over the hero: real 3D particles with depth and glow
const canvas = document.getElementById('embers');
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: capture });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100); camera.position.z = 12;
const N = 420, geo = new THREE.BufferGeometry(), pos = new Float32Array(N * 3), size = new Float32Array(N), seed = new Float32Array(N * 4);
let s = 9; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
for (let i = 0; i < N; i++) { seed[i * 4] = rnd() * 12 - 6; seed[i * 4 + 1] = rnd(); seed[i * 4 + 2] = rnd() * 10 - 6; seed[i * 4 + 3] = rnd(); size[i] = 0.4 + rnd() * 1.6; }
geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
geo.setAttribute('size', new THREE.BufferAttribute(size, 1));
const mat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  uniforms: { uPx: { value: renderer.getPixelRatio() } },
  vertexShader: `attribute float size; varying float vA; uniform float uPx;
    void main(){ vec4 mv = modelViewMatrix * vec4(position,1.); gl_Position = projectionMatrix * mv;
      gl_PointSize = size * uPx * 26. / -mv.z; vA = clamp((position.y + 7.) / 9., 0., 1.) * (1. - clamp((position.y - 3.) / 4., 0., 1.)); }`,
  fragmentShader: `varying float vA; void main(){ float d = length(gl_PointCoord - .5); float g = smoothstep(.5, 0., d);
      vec3 c = mix(vec3(1.,.35,.08), vec3(1.,.85,.5), g*g); gl_FragColor = vec4(c, g * vA); }`
});
scene.add(new THREE.Points(geo, mat));

function sizeGL() { const r = canvas.getBoundingClientRect(); renderer.setSize(r.width, r.height, false); camera.aspect = r.width / r.height; camera.updateProjectionMatrix(); }
addEventListener('resize', sizeGL); sizeGL();

const heroPh = document.getElementById('heroPh');
const mq = document.getElementById('mq');
const cards = [...document.querySelectorAll('#stage .card')];
const stage = document.getElementById('stage');
const tilt = document.getElementById('tilt');
const reveals = [...document.querySelectorAll('.reveal')];

function renderAt(t, y) {
  if (capture) window.scrollTo(0, y); else y = scrollY;
  const vh = innerHeight;
  // embers rise and drift with a little curl
  for (let i = 0; i < N; i++) {
    const x0 = seed[i * 4], u = seed[i * 4 + 1], z = seed[i * 4 + 2], w = seed[i * 4 + 3];
    const yy = ((u * 14 + t * (0.5 + w * 0.9)) % 14) - 7;
    pos[i * 3] = x0 + Math.sin(t * (0.6 + w) + i) * 0.5 + yy * 0.12; pos[i * 3 + 1] = yy - y * 0.004; pos[i * 3 + 2] = z;
  }
  geo.attributes.position.needsUpdate = true;
  scene.rotation.y = Math.sin(t * 0.2) * 0.15;
  renderer.render(scene, camera);
  // hero parallax + slow push
  heroPh.style.transform = `translate3d(0,${y * 0.35}px,0) scale(${1.04 + Math.sin(t * 0.15) * 0.02 + y * 0.0002})`;
  mq.style.transform = `translateX(${-((t * 40 + y * 0.5) % 900)}px)`;
  // reveal on view, staggered (hero copy uses time so it animates on load)
  for (const el of reveals) {
    const r = el.getBoundingClientRect(); const d = +(el.dataset.d || 0);
    const k = el.closest('.hero') ? eo(clamp((t - 0.3 - d * 0.18) / 0.8)) : eo(clamp((vh - r.top) / (vh * 0.35)));
    el.style.opacity = k; el.style.transform = `translate3d(0,${(1 - k) * 40}px,0)`;
  }
  // 3D card fan: cards spread and rotate in depth as the stage scrolls through
  const sr = stage.getBoundingClientRect(); const sp = clamp((vh - sr.top) / (vh + sr.height));
  const spread = eo(clamp((sp - 0.15) / 0.45));
  cards.forEach((c, i) => {
    const k = i - 1; const wob = Math.sin(t * 0.8 + i) * 2;
    c.style.transform = `translate3d(${k * 105 * spread}px,${30 + Math.abs(k) * 22 * spread}px,${-Math.abs(k) * 120 * spread + (k === 0 ? 40 : 0)}px) rotateY(${-k * 32 * spread + wob}deg) rotateZ(${k * 4 * spread}deg)`;
    c.style.zIndex = 10 - Math.abs(k);
    c.querySelector('.gl').style.backgroundPosition = `${(sp * 300 - 100)}px 0`;
  });
  // tilt photo: rotates as it passes through the viewport, badge floats in Z
  const tr = tilt.getBoundingClientRect(); const tp = clamp((vh - tr.top) / (vh + tr.height)) - 0.5;
  tilt.style.transform = `rotateX(${tp * -22}deg) rotateY(${Math.sin(t * 0.6) * 6 + tp * 10}deg)`;
}
window.renderAt = renderAt;
window.ready = document.fonts.ready.then(() => Promise.all([...document.querySelectorAll('img')].map(i => i.decode?.()))).then(() => true);
if (!capture) { const loop = now => { renderAt(now / 1000, scrollY); requestAnimationFrame(loop); }; requestAnimationFrame(loop); }
