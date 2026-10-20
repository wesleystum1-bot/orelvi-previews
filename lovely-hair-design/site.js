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
  var rows = document.querySelectorAll('[data-pj]');
  var plates = document.querySelectorAll('[data-plate]');
  if (!rows.length || !plates.length || !('IntersectionObserver' in window)) return;
  var current = -1;
  var set = function(i){
    if (i === current) return;
    current = i;
    for (var k = 0; k < plates.length; k++) plates[k].classList.toggle('is-on', k === i);
    for (var j = 0; j < rows.length; j++) rows[j].classList.toggle('is-on', j === i);
  };
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(en){
      if (en.isIntersecting) set(parseInt(en.target.getAttribute('data-pj'), 10) || 0);
    });
  }, { rootMargin: '-46% 0px -46% 0px', threshold: 0 });
  for (var k = 0; k < rows.length; k++) io.observe(rows[k]);
})();