(function(){
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var els = document.querySelectorAll('[data-reveal]');
  if (reduce || !('IntersectionObserver' in window)) {
    els.forEach(function(e){ e.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    els.forEach(function(e){ io.observe(e); });
  }

  var header = document.querySelector('[data-header]');
  if (header) {
    var onScroll = function(){ header.classList.toggle('is-stuck', window.scrollY > 24); };
    onScroll(); window.addEventListener('scroll', onScroll, { passive: true });
  }

  var toggle = document.querySelector('[data-menu-toggle]');
  var panel = document.querySelector('[data-menu]');
  if (toggle && panel) {
    var setOpen = function(open){
      toggle.setAttribute('aria-expanded', String(open));
      panel.toggleAttribute('data-open', open);
      document.documentElement.style.overflow = open ? 'hidden' : '';
    };
    toggle.addEventListener('click', function(){ setOpen(toggle.getAttribute('aria-expanded') !== 'true'); });
    panel.addEventListener('click', function(e){ if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', function(e){ if (e.key === 'Escape') setOpen(false); });
  }

  // Preview sites never collect or transmit anything on the business's behalf.
  document.querySelectorAll('form[data-demo]').forEach(function(f){
    f.addEventListener('submit', function(e){
      e.preventDefault();
      var out = f.querySelector('output');
      if (out) out.textContent = f.getAttribute('data-demo-message') || 'This is a design preview — the form is not connected, so nothing was sent.';
    });
  });
})();
;(function(){
  var TIER = 'signature';
  var doc = document, root = doc.documentElement;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia && matchMedia('(pointer: fine)').matches;
  var hero = doc.querySelector('.hero, .sv-hero');
  var custom = TIER === 'custom';

  /* Signature's fanned strip: up to three of the business's own photographs
     (never illustrative ones, which would read as their work without a
     label) laid over the lower part of the hero picture, so it never covers
     the headline. It needs two pictures besides the hero's, and a hero
     picture to stand on; otherwise the hero is left as the family drew it. */
  var PHOTOS = [];
  function signatureRail(){
    if (!hero) return;
    var art = hero.querySelector('.hero-fig, .hero-plate, figure');
    if (!art) return;
    var own = art.querySelector('img'), heroSrc = own ? own.getAttribute('src') : null;
    var srcs = PHOTOS.filter(function(s){ return s !== heroSrc; }).slice(0, 3);
    if (srcs.length < 2) return;
    var rail = doc.createElement('div'); rail.className = 'sig-rail'; rail.setAttribute('aria-hidden', 'true');
    srcs.forEach(function(src){ var card = doc.createElement('div'); card.className = 'sig-card'; card.style.backgroundImage = 'url("' + src + '")'; rail.appendChild(card); });
    var cap = doc.createElement('span'); cap.className = 'sig-cap'; cap.textContent = 'Photographs published by the business'; rail.appendChild(cap);
    if (getComputedStyle(hero).position === 'static') hero.style.position = 'relative';
    hero.appendChild(rail);
    function place(){
      var ar = art.getBoundingClientRect(), hr = hero.getBoundingClientRect();
      var ok = innerWidth > 720 && ar.width > innerWidth * .2 && ar.height > 220;
      rail.style.display = ok ? '' : 'none';
      if (!ok) return;
      /* the part of the picture the first screen shows, not its full height */
      var top = Math.max(ar.top, hr.top), bottom = Math.min(ar.bottom, top + innerHeight - Math.max(0, top));
      var w = Math.min(ar.width * .7, 500), h = Math.min((bottom - top) * .5, 330);
      var left = Math.max(ar.left + ar.width * .04, Math.min(ar.right - ar.width * .04 - w, ar.left + (ar.width - w) / 2));
      rail.style.width = w + 'px'; rail.style.height = h + 'px';
      rail.style.left = (left - hr.left) + 'px';
      rail.style.top = (bottom - hr.top - h - Math.min(70, (bottom - top) * .1)) + 'px';
    }
    place(); addEventListener('resize', place); addEventListener('load', place);
    setTimeout(function(){ rail.classList.add('sig-open'); }, reduce ? 0 : 450);
    return rail;
  }
  var sigRail = !custom ? signatureRail() : null;
  var sigEmbers = !custom && !reduce ? signatureParticles(hero) : null;

  function signatureParticles(target){
    if (!target) return null;
    var cv = doc.createElement('canvas'); cv.className = 'sig-embers'; cv.setAttribute('aria-hidden', 'true'); target.appendChild(cv);
    import('./assets/three.module.js').then(function(THREE){
      var renderer = new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(1.5, devicePixelRatio || 1));
      var scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(45, 1, .1, 30); camera.position.z = 10;
      var count = innerWidth < 720 ? 110 : 220, pos = new Float32Array(count * 3), seed = [], randomSeed = 17;
      function random(){ randomSeed = (randomSeed * 16807) % 2147483647; return randomSeed / 2147483647; }
      for (var i = 0; i < count; i++){ seed.push(random() * 12, random(), random() * 8 - 4); pos[i*3] = seed[i*3] - 6; pos[i*3+1] = -6; pos[i*3+2] = seed[i*3+2]; }
      var geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      var points = new THREE.Points(geo, new THREE.PointsMaterial({ color: css('--accent') || '#d89b4d', size: .09, transparent: true, opacity: .85, blending: THREE.AdditiveBlending, depthWrite: false })); scene.add(points);
      var sized = false;
      function render(time){ var r = cv.getBoundingClientRect(); if (!sized) { renderer.setSize(Math.max(1,r.width), Math.max(1,r.height), false); camera.aspect = r.width / Math.max(1,r.height); camera.updateProjectionMatrix(); sized = true; } for (var j=0;j<count;j++){ var u=seed[j*3+1], y=((u*14+time*.00045*(.6+u))%14)-7; pos[j*3]=seed[j*3]-6+Math.sin(time*.0006+j)*.35; pos[j*3+1]=y; } geo.attributes.position.needsUpdate=true; renderer.render(scene,camera); }
      addEventListener('resize', function(){ sized = false; });
      var frame = function(time){ if (!doc.hidden) render(time); requestAnimationFrame(frame); }; requestAnimationFrame(frame); render(0);
    }).catch(function(){});
    return cv;
  }

  function css(name){ return getComputedStyle(root).getPropertyValue(name).trim(); }

  /* the custom scene: drawn even under reduced motion, as one still frame */
  var stage = null;
  if (custom && hero) {
    var canvas = doc.createElement('canvas');
    canvas.className = 'fx-stage';
    canvas.setAttribute('aria-hidden', 'true');
    doc.body.appendChild(canvas);
    stage = scene(canvas);
    /* the see-through sections only make sense over the scene: a showpiece
       hero has no .hero to mount it on, so its sections keep their grounds */
    root.classList.add('fx-scene');
  }

  var chapters = [];
  root.classList.add('fx');

  if (reduce || !('IntersectionObserver' in window)) { if (stage) stage.still(); return; }

  /* reading progress */
  var bar = doc.createElement('div');
  bar.className = 'fx-progress';
  bar.setAttribute('aria-hidden', 'true');
  doc.body.appendChild(bar);
  var hint = doc.createElement('div'); hint.className = 'fx-scroll-hint'; hint.textContent = 'Scroll to explore'; doc.body.appendChild(hint);
  var ticks = doc.createElement('div'); ticks.className = 'fx-chapter-ticks'; ticks.setAttribute('aria-hidden', 'true');
  for (var tickIndex = 0; tickIndex < 5; tickIndex++) ticks.appendChild(doc.createElement('i'));
  doc.body.appendChild(ticks);

  /* what rises in: the blocks of every section after the hero */
  var sections = [].slice.call(doc.querySelectorAll('main section, body > section, footer'))
    .filter(function(s){ return s !== hero && !(hero && hero.contains(s)); });
  var rising = [];
  sections.forEach(function(s){
    if (custom && s.tagName === 'SECTION') s.setAttribute('data-fx', 'swing');
    [].slice.call(s.children).forEach(function(el, i){
      if (el.offsetHeight < 8) return;
      el.setAttribute('data-fx', 'rise');
      el.style.setProperty('--fxd', Math.min(i, 5) * 0.07 + 's');
      rising.push(el);
    });
  });
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(e){ if (e.isIntersecting) { e.target.classList.add('fx-in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  /* the first screen is never faded in: it is in place before motion turns
     on, so it paints at once and a screenshot never catches it half-drawn */
  rising.forEach(function(el){
    if (el.getBoundingClientRect().top < innerHeight) el.classList.add('fx-in');
    else io.observe(el);
  });
  /* cards: three or more like siblings of real size lean toward the pointer */
  if (fine) {
    var seen = [];
    [].slice.call(doc.querySelectorAll('ul, ol, div')).forEach(function(list){
      if (hero && hero.contains(list)) return;
      var kids = [].slice.call(list.children);
      if (kids.length < 3 || kids.length > 12) return;
      var tag = kids[0].tagName;
      if (!kids.every(function(k){ return k.tagName === tag && k.offsetWidth > 140 && k.offsetHeight > 90; })) return;
      if (kids.some(function(k){ return seen.indexOf(k) >= 0 || k.querySelector('form, input, iframe'); })) return;
      kids.forEach(function(k){ seen.push(k); tilt(k); });
    });
  }
  function tilt(el){
    el.setAttribute('data-fx', 'tilt');
    el.addEventListener('pointermove', function(ev){
      var r = el.getBoundingClientRect();
      var x = (ev.clientX - r.left) / r.width - 0.5, y = (ev.clientY - r.top) / r.height - 0.5;
      el.style.setProperty('--fxry', (x * 7).toFixed(2) + 'deg');
      el.style.setProperty('--fxrx', (-y * 7).toFixed(2) + 'deg');
      el.classList.add('fx-hover');
    });
    el.addEventListener('pointerleave', function(){
      el.style.setProperty('--fxry', '0deg'); el.style.setProperty('--fxrx', '0deg');
      el.classList.remove('fx-hover');
    });
  }

  /* scroll-driven depth: photographs, the hero, and (custom) the sections */
  var photos = [].slice.call(doc.querySelectorAll('[data-has-photo]'));
  if (hero && !custom) hero.setAttribute('data-fx-depth', '');
  var queued = false;
  function frame(){
    queued = false;
    var vh = innerHeight, max = root.scrollHeight - vh;
    bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, scrollY / max) : 0) + ')';
    photos.forEach(function(p){
      var r = p.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      p.style.setProperty('--fxp', (((r.top + r.height / 2) / vh - 0.5) * 2).toFixed(3));
    });
    var pageProgress = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
    if (stage) stage.scroll(pageProgress);
    hint.style.opacity = pageProgress < .05 ? '1' : '0';
    [].slice.call(ticks.children).forEach(function(tick, i){ tick.classList.toggle('is-on', Math.round(pageProgress * 4) === i); });
    if (chapters.length) chapters.forEach(function(panel, i){
      var center = (i + .5) / chapters.length, distance = Math.abs(pageProgress - center) * chapters.length;
      panel.classList.toggle('is-on', distance < .9);
    });
    if (hero) {
      var h = hero.getBoundingClientRect();
      var t = Math.max(0, Math.min(1, -h.top / Math.max(1, h.height)));
      hero.style.setProperty('--fxh', t.toFixed(3));
      if (sigRail) { sigRail.style.transform = 'translate3d(0,' + (t * -18).toFixed(2) + 'px,0) rotateX(' + (t * 5).toFixed(2) + 'deg)'; }
    }
    if (custom) sections.forEach(function(s){
      if (s.tagName !== 'SECTION') return;
      var r = s.getBoundingClientRect();
      var k = Math.max(0, Math.min(1, (vh - r.top) / (vh * 0.55)));
      s.style.setProperty('--fxs', k.toFixed(3));
    });
  }
  function ask(){ if (!queued) { queued = true; requestAnimationFrame(frame); } }
  addEventListener('scroll', ask, { passive: true });
  addEventListener('resize', ask);
  frame();
  if (stage) stage.run();

  /* ---------------------------------------------------------------- */
  /* a 3D scene projected onto a 2D canvas: a ribbon knot of points and */
  /* a field of motes, in the palette's accent and ink                  */
  function scene(cv){
    var ctx = null, webgl = null;
    var accent = css('--accent') || '#c9a227';
    var ground = getComputedStyle(hero).backgroundColor;
    var rgb = ground.match(/rgba?\(([^)]+)\)/i), channels = rgb ? rgb[1].split(',').map(function(v){ return parseFloat(v); }) : [];
    var lightGround = channels.length >= 3 && (0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]) > 150;
    var ink = lightGround ? 'rgba(20,25,20,.78)' : (css('--deep-ink') || css('--ink') || '#888');
    var strandFloor = lightGround ? 0.4 : 0.22;
    var mono = lightGround && accent.toLowerCase() === (css('--deep-ink') || '').toLowerCase();
    var W = 0, H = 0, dpr = Math.min(1.5, window.devicePixelRatio || 1);
    var knot = [], motes = [], i;
    var small = innerWidth < 720;
    var N = small ? 260 : 520, M = small ? 70 : 160;
    for (i = 0; i < N; i++) {
      var t = i / N * Math.PI * 2;
      /* a (2,3) torus knot */
      var r = 2 + Math.cos(3 * t);
      knot.push([r * Math.cos(2 * t), r * Math.sin(2 * t), -Math.sin(3 * t) * 1.15]);
    }
    var seed = 7;
    function rnd(){ seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    for (i = 0; i < M; i++) motes.push([(rnd() - 0.5) * 12, (rnd() - 0.5) * 8, (rnd() - 0.5) * 8, rnd()]);
    var ax = 0.5, ay = 0, px = 0, py = 0, tx = 0, ty = 0, sc = 0, alive = true, on = true, t0 = 0;

    function size(){
      var r = cv.getBoundingClientRect();
      W = Math.max(1, r.width); H = Math.max(1, r.height);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function project(p, ca, sa, cb, sb){
      var x = p[0] * ca + p[2] * sa, z = -p[0] * sa + p[2] * ca;
      var y = p[1] * cb - z * sb; z = p[1] * sb + z * cb;
      var d = 9 / (9 + z + 2.5);
      var s = Math.min(W, H) * (small ? 0.16 : 0.17);
      return [W * (small ? 0.5 : 0.76) + x * s * d, H * 0.44 + y * s * d, d];
    }
    /* a floor grid running toward a horizon, so the room reads as deep */
    function floor(time){
      var hz = H * 0.62, n = 14, i, y, k;
      var drift = (time * 0.00004 + sc * 0.6) % 1;
      ctx.strokeStyle = accent; ctx.lineWidth = 1;
      for (i = 0; i < n; i++) {
        k = (i + drift) / n; y = hz + (H - hz) * k * k;
        ctx.globalAlpha = 0.05 + 0.22 * k;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }
      var cx = W * (0.6 + px * 0.15);
      for (i = -12; i <= 12; i++) {
        ctx.globalAlpha = 0.1;
        ctx.beginPath(); ctx.moveTo(cx + i * W * 0.012, hz); ctx.lineTo(cx + i * W * 0.16, H); ctx.stroke();
      }
    }
    function draw(time){
      if (webgl) { webgl.draw(time, sc, px, py); return; }
      if (!ctx) return;
      ctx.clearRect(0, 0, W, H);
      floor(time);
      var ca = Math.cos(ay + px * 0.6), sa = Math.sin(ay + px * 0.6);
      var cb = Math.cos(ax + py * 0.4 + sc * 0.9), sb = Math.sin(ax + py * 0.4 + sc * 0.9);
      ctx.globalAlpha = 1;
      for (var j = 0; j < motes.length; j++) {
        var m = motes[j];
        var q = project([m[0], m[1] + Math.sin(time * 0.0004 + m[3] * 6) * 0.25, m[2]], ca, sa, cb, sb);
        ctx.fillStyle = ink; ctx.globalAlpha = 0.18 * q[2];
        ctx.fillRect(q[0], q[1], 1.6 * q[2], 1.6 * q[2]);
      }
      var floors = small ? 18 : 32, floorH = H / (small ? 9 : 12), towerX = W * (small ? .58 : .7);
      for (var k = 0; k < floors; k++) {
        var rise = ((k * floorH * 1.3 + sc * H * 1.2) % (H * 1.4)) - H * .22;
        var width = (small ? W * .22 : W * .18) * (1 - Math.max(0, rise / H) * .16);
        var sway = Math.sin(time * .0004 + k * .22) * W * .012 + px * W * .04;
        ctx.strokeStyle = accent; ctx.lineWidth = k % 4 === 0 ? 2 : 1;
        ctx.globalAlpha = Math.min(mono ? .55 : 1, Math.max(strandFloor, .16 + (1 - Math.abs(rise / H)) * .5));
        ctx.strokeRect(towerX - width / 2 + sway, rise, width, floorH * .72);
        ctx.strokeStyle = ink; ctx.globalAlpha = .22;
        ctx.beginPath(); ctx.moveTo(towerX - width / 2 + sway, rise); ctx.lineTo(towerX + width / 2 + sway, rise + floorH * .72); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    function fallback(){
      cv.style.display = 'none';
      var poster = doc.createElement('div'); poster.className = 'fx-poster'; poster.setAttribute('aria-hidden', 'true');
      var svg = '<svg viewBox="0 0 1200 800"><defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="#111522"/><stop offset=".55" stop-color="#263044"/><stop offset="1" stop-color="#8a5637"/></linearGradient><linearGradient id="car" x2="0" y2="1"><stop stop-color="#d59b54"/><stop offset="1" stop-color="#70401f"/></linearGradient></defs><rect width="1200" height="800" fill="url(#bg)"/><path d="M0 620h1200" stroke="#e9bf83" stroke-opacity=".3" stroke-width="2"/><path d="M170 560 260 470h170l95-105h255l120 96 118 35 42 64v54H170z" fill="url(#car)" stroke="#f4d49e" stroke-width="8"/><path d="m485 456 74-75h205l87 76z" fill="#7f9db8" fill-opacity=".72" stroke="#d4e4ef" stroke-width="5"/><circle cx="370" cy="614" r="62" fill="#0b0d13" stroke="#d8b37a" stroke-width="10"/><circle cx="900" cy="614" r="62" fill="#0b0d13" stroke="#d8b37a" stroke-width="10"/><circle cx="370" cy="614" r="22" fill="#667184"/><circle cx="900" cy="614" r="22" fill="#667184"/><text x="70" y="105" fill="#f7e5c4" font-family="sans-serif" font-size="26" letter-spacing="7">CUSTOM / DESIGN STUDY</text></svg>';
      poster.style.backgroundImage = 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '"), radial-gradient(circle at 70% 70%,rgba(213,155,84,.55),transparent 36%),linear-gradient(135deg,#111522,#263044 58%,#8a5637)';
      cv.parentNode.insertBefore(poster, cv);
    }
    function tower(THREE){
      var renderer = new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: true });
      renderer.setPixelRatio(dpr); renderer.setClearColor(0, 0);
      renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
      var scene3 = new THREE.Scene(), camera = new THREE.PerspectiveCamera(38, 1, .1, 200); scene3.fog = new THREE.Fog(0x12151c, 18, 40);
      var pm = new THREE.PMREMGenerator(renderer), studio = new THREE.Scene();
      [[0, 8, 0, 0xffe5c0], [-8, 3, 4, 0x9eb9ff], [8, 3, -4, 0xffc88a]].forEach(function(spec){ var panel = new THREE.Mesh(new THREE.PlaneGeometry(14, 8), new THREE.MeshBasicMaterial({ color: spec[3] })); panel.position.set(spec[0], spec[1], spec[2]); studio.add(panel); });
      scene3.environment = pm.fromScene(studio).texture; pm.dispose();
      var group = new THREE.Group(), parts = [];
      scene3.add(group); scene3.add(new THREE.HemisphereLight(0x9fb2ff, 0x1d1207, 1.2));
      var key = new THREE.DirectionalLight(0xffd49a, 3.5); key.position.set(-10, 20, 12); scene3.add(key);
      var rim = new THREE.DirectionalLight(0xdce7ff, 1.8); rim.position.set(10, 10, -14); scene3.add(rim);
      var fill = new THREE.PointLight(0xffc58a, 40, 0, 0); fill.position.set(0, 7, 10); scene3.add(fill);
      var bodyShape = new THREE.Shape(); bodyShape.moveTo(-3.4, 0); bodyShape.lineTo(-3.12, .55); bodyShape.lineTo(-2.2, .8); bodyShape.lineTo(-1.5, 1.25); bodyShape.lineTo(-.8, 1.55); bodyShape.lineTo(1.1, 1.55); bodyShape.lineTo(2.1, 1.1); bodyShape.lineTo(3.3, .78); bodyShape.lineTo(3.4, 0); bodyShape.lineTo(-3.4, 0);
      [-1.9, 1.9].forEach(function(x){ var arch = new THREE.Path(); arch.absellipse(x, .66, .76, .76, 0, Math.PI * 2, false, 0); bodyShape.holes.push(arch); });
      var bodyGeo = new THREE.ExtrudeGeometry(bodyShape, { depth: 2.3, bevelEnabled: true, bevelSegments: 4, bevelSize: .12, bevelThickness: .12 }); bodyGeo.center(); bodyGeo.computeVertexNormals();
      var body = new THREE.Mesh(bodyGeo, new THREE.MeshPhysicalMaterial({ color: 0xc8873a, metalness: .45, roughness: .28, clearcoat: 1, clearcoatRoughness: .05 })); body.position.y = .85; group.add(body); parts.push(body);
      var glassShape = new THREE.Shape(); glassShape.moveTo(-1.72, 0); glassShape.lineTo(-.92, .85); glassShape.lineTo(-.45, 1.25); glassShape.lineTo(1.02, 1.25); glassShape.lineTo(1.82, .68); glassShape.lineTo(2.02, 0); glassShape.lineTo(-1.72, 0);
      var glassGeo = new THREE.ExtrudeGeometry(glassShape, { depth: 1.72, bevelEnabled: true, bevelSegments: 4, bevelSize: .06, bevelThickness: .06 }); glassGeo.center();
      var glass = new THREE.Mesh(glassGeo, new THREE.MeshPhysicalMaterial({ color: 0x1a2433, metalness: .1, roughness: .05, transparent: true, opacity: .84, clearcoat: 1 })); glass.position.y = 1.18; group.add(glass); parts.push(glass);
      var tyreGeo = new THREE.CylinderGeometry(.72, .72, .42, 32), rimGeo = new THREE.CylinderGeometry(.4, .4, .18, 24), tyreMat = new THREE.MeshStandardMaterial({ color: 0x080a0e, roughness: .6 }), rimMat = new THREE.MeshStandardMaterial({ color: 0xb9c1cb, metalness: .9, roughness: .18 });
      [[-1.9, .72], [1.9, .72]].forEach(function(pos){ [-1,1].forEach(function(side){ var tyre = new THREE.Mesh(tyreGeo, tyreMat), rim = new THREE.Mesh(rimGeo, rimMat); tyre.rotation.x = Math.PI / 2; rim.rotation.x = Math.PI / 2; tyre.position.set(pos[0], pos[1], side * 1.3); rim.position.set(pos[0], pos[1], side * 1.53); group.add(tyre); group.add(rim); parts.push(tyre); parts.push(rim); }); });
      var lightMat = new THREE.MeshBasicMaterial({ color: 0xffe2a8 }); var frontBar = new THREE.Mesh(new THREE.BoxGeometry(.12, .16, 1.65), lightMat); frontBar.position.set(-3.42, .72, 0); group.add(frontBar); parts.push(frontBar); var rearBar = new THREE.Mesh(new THREE.BoxGeometry(.12, .16, 1.5), lightMat); rearBar.position.set(3.42, .68, 0); group.add(rearBar); parts.push(rearBar);
      var falloff = doc.createElement('canvas'); falloff.width = falloff.height = 128; var fctx = falloff.getContext('2d'), fg = fctx.createRadialGradient(64, 64, 8, 64, 64, 64); fg.addColorStop(0, 'rgba(255,255,255,1)'); fg.addColorStop(1, 'rgba(255,255,255,0)'); fctx.fillStyle = fg; fctx.fillRect(0, 0, 128, 128);
      var ground = new THREE.Mesh(new THREE.CircleGeometry(18, 64), new THREE.MeshStandardMaterial({ color: 0x252831, metalness: .1, roughness: .7, alphaMap: new THREE.CanvasTexture(falloff), transparent: true })); ground.rotation.x = -Math.PI / 2; ground.position.y = .02; group.add(ground);
      var pool = new THREE.Mesh(new THREE.CircleGeometry(6, 64), new THREE.MeshBasicMaterial({ color: 0x8d6b4e, transparent: true, opacity: .28 })); pool.rotation.x = -Math.PI / 2; pool.position.y = .04; group.add(pool);
      group.scale.setScalar(innerWidth < 720 ? .58 : .7); group.position.x = innerWidth < 720 ? 0 : 4;
      parts.forEach(function(part){ part.userData.baseX = part.position.x; part.userData.baseY = part.position.y; part.userData.baseZ = part.position.z; });
      var keys = [{ p: 0, r: 13, h: 4, a: .2, ly: 1 }, { p: .22, r: 10, h: 5, a: 1.2, ly: 1.2 }, { p: .5, r: 16, h: 8, a: 2.4, ly: 1 }, { p: .76, r: 11, h: 4.5, a: 3.8, ly: 1.3 }, { p: 1, r: 15, h: 6, a: 5.1, ly: 1 }];
      function camAt(progress){ var i = 0; while (i < keys.length - 2 && progress > keys[i + 1].p) i++; var a = keys[i], b = keys[i + 1], q = (progress - a.p) / Math.max(.001, b.p - a.p), smooth = q * q * (3 - 2 * q); return { r: a.r + (b.r - a.r) * smooth, h: a.h + (b.h - a.h) * smooth, a: a.a + (b.a - a.a) * smooth, ly: a.ly + (b.ly - a.ly) * smooth }; }
      function resize3(scroll){ var r = cv.getBoundingClientRect(), offsetX = innerWidth < 720 ? 0 : (scroll > .5 ? -r.width * .12 : -r.width * .2), heroLift = innerWidth < 720 ? 0 : Math.max(0, Math.min(1, (.12 - scroll) / .08)), offsetY = innerWidth < 720 ? r.height * .28 : r.height * .3 * heroLift; camera.fov = innerWidth < 720 ? 54 : 38; renderer.setSize(Math.max(1,r.width), Math.max(1,r.height), false); camera.aspect = r.width / Math.max(1,r.height); camera.setViewOffset(r.width, r.height, offsetX, offsetY, r.width, r.height); camera.updateProjectionMatrix(); }
      function draw3(time, scroll, mx, my){
        resize3(scroll); var p = Math.max(0, Math.min(1, (scroll - .35) / .35)), explode = p < .42 ? p / .42 : p < .58 ? 1 : (1 - p) / .42, c = camAt(scroll), angle = c.a + mx * .4;
        parts.forEach(function(part, i){ var lift = explode * (i % 2 ? .55 : -.3), side = i >= 3 ? (i % 2 ? 1 : -1) : 0, fore = i === 2 ? -1 : i === 0 ? .15 : 0; part.position.x = part.userData.baseX + explode * fore; part.position.y = part.userData.baseY + lift; part.position.z = part.userData.baseZ + explode * side * 1.05; part.rotation.z = explode * (i % 2 ? .04 : -.025); });
        var centerX = innerWidth < 720 ? 0 : 4, targetY = c.ly + (innerWidth < 720 ? -1.25 : 0); group.scale.setScalar(innerWidth < 720 ? .58 : (scroll < .2 ? .63 : .7)); group.position.x = centerX; group.position.y = innerWidth < 720 ? -1.45 : -.25; group.rotation.y = angle; group.rotation.x = my * -.08; camera.position.set(centerX + Math.cos(angle) * c.r, c.h + my * -2 + (innerWidth < 720 ? -1.1 : 0), Math.sin(angle) * c.r); camera.lookAt(centerX, targetY, 0); renderer.render(scene3, camera);
      }
      return { draw: draw3 };
    }
    import('./assets/three.module.js').then(function(THREE){ webgl = tower(THREE); size(); draw(performance.now()); }).catch(function(error){ console.error('[fx] scene failed', error); fallback(); });
    function loop(time){
      if (!alive) return;
      if (!on || doc.hidden) { t0 = 0; requestAnimationFrame(loop); return; }
      var dt = t0 ? Math.min(50, time - t0) : 16; t0 = time;
      ay += dt * 0.00012; ax = 0.5 + Math.sin(time * 0.00007) * 0.18;
      px += (tx - px) * 0.05; py += (ty - py) * 0.05;
      draw(time);
      requestAnimationFrame(loop);
    }
    size();
    addEventListener('resize', function(){ size(); draw(performance.now()); });
    return {
      still: function(){ draw(0); },
      scroll: function(v){ sc = v; },
      run: function(){
        if ('IntersectionObserver' in window) new IntersectionObserver(function(e){ on = e[0].isIntersecting; }).observe(cv);
        if (fine) addEventListener('pointermove', function(ev){ tx = ev.clientX / innerWidth - 0.5; ty = ev.clientY / innerHeight - 0.5; }, { passive: true });
        requestAnimationFrame(loop);
      },
    };
  }
})();

;(function(){
  var TIER = 'signature';
  var doc = document;
  var hero = doc.querySelector('.sp-hero');
  if (!hero) return;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var custom = TIER === 'custom';
  var ph = hero.querySelector('.sp-ph');
  var stage = doc.querySelector('[data-sp-stage]');
  var cards = stage ? [].slice.call(stage.querySelectorAll('.sp-card')) : [];
  var tilt = doc.querySelector('[data-sp-tilt] .sp-tilt-in');
  var small = innerWidth < 720;
  /* fit the hero to the first screen under the family's own header */
  var top = hero.getBoundingClientRect().top + (window.scrollY || 0);
  if (top > 0 && top < 240) hero.style.setProperty('--sp-top', Math.round(top) + 'px');
  function clamp(x){ return x < 0 ? 0 : x > 1 ? 1 : x; }
  function eo(x){ return 1 - Math.pow(1 - x, 3); }

  var motes = custom ? makeMotes() : null;
  if (reduce) { if (motes) motes.still(); return; }

  var t = 0, y = 0, queued = false, last = 0;
  function frame(now){
    queued = false;
    t = (now || 0) / 1000;
    y = window.scrollY || 0;
    var vh = innerHeight;
    if (ph) ph.style.transform = 'translate3d(0,' + (y * 0.3).toFixed(1) + 'px,0) scale(' + (1.04 + y * 0.00018 + (custom ? Math.sin(t * 0.15) * 0.015 : 0)).toFixed(4) + ')';
    if (stage) {
      var r = stage.getBoundingClientRect();
      var p = clamp((vh - r.top) / (vh + r.height));
      var s = eo(clamp((p - 0.12) / 0.42));
      cards.forEach(function(c, i){
        var k = i - 1, a = Math.abs(k);
        var wob = custom ? Math.sin(t * 0.8 + i) * 2 : 0;
        var x = small ? k * innerWidth * 0.26 : k * Math.min(innerWidth * 0.3, 300);
        c.style.transform = 'translate3d(' + (x * s).toFixed(1) + 'px,' + (20 + a * 26 * s).toFixed(1) + 'px,' + (-a * 120 * s + (k === 0 ? 40 * s : 0)).toFixed(1) + 'px) rotateY(' + (-k * (small ? 30 : 26) * s + wob).toFixed(2) + 'deg) rotateZ(' + (k * 3 * s).toFixed(2) + 'deg)';
        c.style.setProperty('--gx', (p * 160 - 30).toFixed(1) + '%');
      });
    }
    if (tilt) {
      var tr = tilt.getBoundingClientRect();
      var tp = clamp((vh - tr.top) / (vh + tr.height)) - 0.5;
      tilt.style.transform = 'rotateX(' + (tp * -18).toFixed(2) + 'deg) rotateY(' + ((custom ? Math.sin(t * 0.6) * 5 : 0) + tp * 9).toFixed(2) + 'deg)';
    }
  }
  function ask(){ if (!queued) { queued = true; requestAnimationFrame(frame); } }
  addEventListener('scroll', ask, { passive: true });
  addEventListener('resize', function(){ small = innerWidth < 720; ask(); });
  frame(0);
  if (custom) {
    /* Custom breathes: the cards wobble and the glare moves while the stage is on screen */
    var loop = function(now){ if (!doc.hidden) frame(now); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }
  if (motes) motes.run();

  /* drifting motes in the accent colour, lit additively over the photograph */
  function makeMotes(){
    var cv = doc.createElement('canvas');
    cv.className = 'sp-motes'; cv.setAttribute('aria-hidden', 'true');
    hero.insertBefore(cv, hero.querySelector('.sp-copy'));
    var ctx = cv.getContext('2d'); if (!ctx) return null;
    /* the accent lifted most of the way to a warm white: motes are light, never dark specks */
    var hex = (getComputedStyle(doc.documentElement).getPropertyValue('--accent').trim() || '#e8a050').replace('#', '');
    if (hex.length === 3) hex = hex.replace(/./g, '$&$&');
    var n = parseInt(hex.slice(0, 6), 16) || 0xe8a050;
    var mix = function(c, w){ return Math.round(c + (w - c) * 0.6); };
    var accent = 'rgb(' + mix(n >> 16 & 255, 255) + ',' + mix(n >> 8 & 255, 226) + ',' + mix(n & 255, 180) + ')';
    var W = 0, H = 0, dpr = Math.min(2, window.devicePixelRatio || 1), on = true;
    var N = innerWidth < 720 ? 90 : 200, P = [], seed = 9, i;
    function rnd(){ seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    for (i = 0; i < N; i++) P.push({ x: rnd(), u: rnd(), z: rnd(), w: rnd(), s: 0.5 + rnd() * 1.7 });
    function size(){ var r = cv.getBoundingClientRect(); W = r.width; H = r.height; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
    function draw(tt){
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      for (var j = 0; j < P.length; j++) {
        var q = P[j];
        var yy = ((q.u + tt * (0.025 + q.w * 0.05)) % 1);
        var py = H * (1.05 - yy * 1.1);
        var px = W * q.x + Math.sin(tt * (0.6 + q.w) + j) * 18 * (0.4 + q.z);
        var d = 0.35 + q.z * 0.9;
        var fade = Math.sin(Math.PI * yy);
        var rad = q.s * d * 3.2;
        var g = ctx.createRadialGradient(px, py, 0, px, py, rad);
        g.addColorStop(0, accent); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.globalAlpha = 0.55 * fade * d;
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(px, py, rad, 0, 6.283); ctx.fill();
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    size();
    addEventListener('resize', size);
    return {
      still: function(){ draw(4); },
      run: function(){
        if ('IntersectionObserver' in window) new IntersectionObserver(function(e){ on = e[0].isIntersecting; }).observe(hero);
        var go = function(now){ if (on && !doc.hidden) draw(now / 1000); requestAnimationFrame(go); };
        requestAnimationFrame(go);
      },
    };
  }
})();
