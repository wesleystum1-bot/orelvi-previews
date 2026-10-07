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
(function(){
  var wrap = document.querySelector('.rail-wrap');
  if (!wrap) return;
  var rail = wrap.querySelector('.rail');
  var update = function(){
    var max = rail.scrollWidth - rail.clientWidth;
    wrap.style.setProperty('--rail-progress', max > 0 ? (rail.scrollLeft / max) : 1);
    wrap.classList.toggle('at-end', max <= 0 || rail.scrollLeft >= max - 2);
  };
  rail.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
})();
;(function(){
  var TIER = 'custom';
  var doc = document, root = doc.documentElement;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia && matchMedia('(pointer: fine)').matches;
  /* the showpiece's photographic hero, when the build added one, stands in for the family's */
  var hero = doc.querySelector('.sp-hero') || doc.querySelector('.hero, .sv-hero');
  var showpiece = !!(hero && hero.classList.contains('sp-hero'));
  var custom = TIER === 'custom';

  function css(name){ return getComputedStyle(root).getPropertyValue(name).trim(); }

  /* the custom scene: drawn even under reduced motion, as one still frame */
  var stage = null;
  /* a photographic hero lights itself (the showpiece's motes); the drawn
     scene is for a family hero that has no photograph */
  if (custom && hero && !showpiece) {
    var canvas = doc.createElement('canvas');
    canvas.className = 'fx-stage';
    canvas.setAttribute('aria-hidden', 'true');
    /* appended, not prepended: a family's :first-child rules stay true */
    hero.appendChild(canvas);
    stage = scene(canvas);
  }

  if (reduce || !('IntersectionObserver' in window)) { if (stage) stage.still(); return; }

  /* reading progress */
  var bar = doc.createElement('div');
  bar.className = 'fx-progress';
  bar.setAttribute('aria-hidden', 'true');
  doc.body.appendChild(bar);

  /* what rises in: the blocks of every section after the hero */
  var sections = [].slice.call(doc.querySelectorAll('main section, body > section, footer'))
    .filter(function(s){ return s !== hero && !(hero && hero.contains(s)); });
  var rising = [];
  sections.forEach(function(s){
    /* the showpiece moves its own pieces; swinging its dark ground over a light page reads as grey */
    if (custom && s.tagName === 'SECTION' && !s.hasAttribute('data-showpiece')) s.setAttribute('data-fx', 'swing');
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
  root.classList.add('fx');

  /* cards: three or more like siblings of real size lean toward the pointer */
  if (fine) {
    var seen = [];
    [].slice.call(doc.querySelectorAll('ul, ol, div')).forEach(function(list){
      if (hero && hero.contains(list)) return;
      if (list.closest && list.closest('[data-showpiece]')) return;
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
  if (hero) hero.setAttribute('data-fx-depth', '');
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
    if (hero) {
      var h = hero.getBoundingClientRect();
      var t = Math.max(0, Math.min(1, -h.top / Math.max(1, h.height)));
      hero.style.setProperty('--fxh', t.toFixed(3));
      if (stage) stage.scroll(t);
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
    var ctx = cv.getContext('2d'); if (!ctx) return null;
    var accent = css('--accent') || '#c9a227', ink = css('--deep-ink') || css('--ink') || '#888';
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
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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
      var prev = project(knot[knot.length - 1], ca, sa, cb, sb);
      for (var k = 0; k < knot.length; k++) {
        var c = project(knot[k], ca, sa, cb, sb);
        /* nearer strands are brighter and thicker: depth you can read */
        ctx.lineWidth = 0.6 + c[2] * 1.6;
        ctx.strokeStyle = accent; ctx.globalAlpha = Math.max(0.22, Math.min(1, (c[2] - 0.5) * 2));
        ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(c[0], c[1]); ctx.stroke();
        if (k % 5 === 0) { ctx.fillStyle = ink; ctx.fillRect(c[0] - 1.5, c[1] - 1.5, 3 * c[2], 3 * c[2]); }
        prev = c;
      }
      ctx.globalAlpha = 1;
    }
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
  var TIER = 'custom';
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
