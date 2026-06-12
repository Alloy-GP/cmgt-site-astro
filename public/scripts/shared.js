/* CMGT Home Explorations — shared behavior: scroll reveal + count-up */
(function () {
  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Scroll reveal */
  var reveals = document.querySelectorAll('.reveal');
  if (reveals.length) {
    var rio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-visible'); rio.unobserve(e.target); }
      });
    }, { threshold: 0.08 });
    reveals.forEach(function (el) { rio.observe(el); });
  }

  /* Count-up numbers */
  var targets = document.querySelectorAll('[data-count-to]');
  function ease(t) { return 1 - Math.pow(1 - t, 3); }
  function fmt(n, plain) { return (!plain && n >= 1000) ? n.toLocaleString('en-US') : String(n); }
  function animateTo(el) {
    var target = parseFloat(el.dataset.countTo) || 0;
    var duration = parseInt(el.dataset.duration, 10) || 1500;
    var prefix = el.dataset.prefix || '';
    var suffix = el.dataset.suffix || '';
    var plain = el.dataset.plain != null;
    if (prefersReduced) { el.textContent = prefix + fmt(target, plain) + suffix; return; }
    var start = performance.now();
    function step(now) {
      var t = Math.min((now - start) / duration, 1);
      el.textContent = prefix + fmt(Math.round(target * ease(t)), plain) + suffix;
      if (t < 1) requestAnimationFrame(step);
      else el.textContent = prefix + fmt(target, plain) + suffix;
    }
    requestAnimationFrame(step);
  }
  if (targets.length) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { animateTo(e.target); cio.unobserve(e.target); }
      });
    }, { threshold: 0.4 });
    targets.forEach(function (el) { cio.observe(el); });
  }

  /* Year */
  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();
