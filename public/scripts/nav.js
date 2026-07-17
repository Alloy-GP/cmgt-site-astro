/* =================================================================
   CMGT site chrome — BEHAVIOR ONLY.
   The header + footer markup is now server-rendered by
   src/components/Nav.astro and src/components/Footer.astro. This script
   only wires up interactivity against that existing DOM:
   dropdowns (hover/click), scroll-hide + glass + scrim, mobile drawer,
   the Locations Google-Maps re-fly, the footer newsletter, and the
   breadcrumb rendering from each page's #site-breadcrumbs[data-crumbs].
   Kept is:inline + served from /public so the stg Pastel review proxy
   (which strips bundled JS) still runs it.
   ================================================================= */
(function () {
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }

  function init() {
    /* ── breadcrumbs (rendered from the page's data-crumbs) ── */
    var bc = document.getElementById('site-breadcrumbs');
    if (bc && bc.dataset.crumbs) {
      try {
        var crumbs = JSON.parse(bc.dataset.crumbs);
        var ch = '<div class="crumbs"><div class="crumbs-in">';
        crumbs.forEach(function (c, ci) {
          if (ci > 0) ch += '<span class="crumbs-sep">/</span>';
          ch += c.href ? '<a href="' + c.href + '">' + esc(c.t) + '</a>'
                       : '<span class="cur">' + esc(c.t) + '</span>';
        });
        ch += '</div></div>';
        bc.style.display = 'contents';
        bc.innerHTML = ch;
      } catch (e) { /* malformed crumbs JSON — skip */ }
    }

    var navMain = document.querySelector('.nav-main');
    if (!navMain) return;

    /* ── scroll behavior: hide on scroll-down, return + glass on scroll-up.
       scrim dims the page behind an open dropdown tray. ── */
    var scrim = document.createElement('div');
    scrim.className = 'nav-scrim';
    document.body.appendChild(scrim);
    function updateScrim() {
      var anyOpen = !!document.querySelector('.nav-item.open');
      scrim.classList.toggle('on', anyOpen);
      if (anyOpen) navMain.classList.remove('is-hidden');
    }
    var lastY = window.scrollY || 0;
    var ticking = false;
    function onScroll() {
      var y = window.scrollY || 0;
      navMain.classList.toggle('is-scrolled', y > 12);
      var anyOpen = !!document.querySelector('.nav-item.open');
      if (y > 150 && y > lastY + 4 && !anyOpen) navMain.classList.add('is-hidden');
      else if (y < lastY - 4 || y <= 12) navMain.classList.remove('is-hidden');
      lastY = y;
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { window.requestAnimationFrame(onScroll); ticking = true; }
    }, { passive: true });
    onScroll();

    /* ── dropdowns: open on hover (desktop) or click; close on outside/Esc ── */
    var items = document.querySelectorAll('.nav-item[data-nav-i]');
    function closeAll(except) {
      items.forEach(function (it) {
        if (it !== except) {
          it.classList.remove('open');
          var b = it.querySelector('.nav-link');
          if (b) b.setAttribute('aria-expanded', 'false');
        }
      });
      updateScrim();
    }
    items.forEach(function (it) {
      var btn = it.querySelector('.nav-link');
      if (!btn) return;
      var hoverable = window.matchMedia('(hover: hover)').matches;
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var willOpen = !it.classList.contains('open');
        closeAll(it);
        it.classList.toggle('open', willOpen);
        btn.setAttribute('aria-expanded', String(willOpen));
        updateScrim();
      });
      if (hoverable) {
        var t;
        it.addEventListener('mouseenter', function () {
          clearTimeout(t);
          closeAll(it);
          it.classList.add('open');
          btn.setAttribute('aria-expanded', 'true');
          updateScrim();
        });
        it.addEventListener('mouseleave', function () {
          t = setTimeout(function () {
            it.classList.remove('open');
            btn.setAttribute('aria-expanded', 'false');
            updateScrim();
          }, 260);
        });
      }
    });
    document.addEventListener('click', function () { closeAll(null); });

    /* ── mobile drawer ── */
    var drawer = document.querySelector('.nav-drawer');
    var burger = document.querySelector('.nav-burger');
    var closeBtn = drawer ? drawer.querySelector('.nav-drawer-close') : null;
    function openDrawer() { if (drawer) { drawer.classList.add('open'); document.body.style.overflow = 'hidden'; } }
    function closeDrawer() { if (drawer) { drawer.classList.remove('open'); document.body.style.overflow = ''; } }
    if (burger) burger.addEventListener('click', openDrawer);
    if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
    if (drawer) {
      drawer.querySelectorAll('.nd-group').forEach(function (g) {
        var tg = g.querySelector('button.nd-toggle');
        if (tg) tg.addEventListener('click', function () { g.classList.toggle('open'); });
      });
    }

    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeAll(null); closeDrawer(); } });

    /* ── Locations map: click a state row -> highlight + re-fly the embed.
       Per-state data comes from the row's data-* attributes (set in Nav.astro). ── */
    var mapPanel = document.querySelector('.nav-panel-map');
    if (mapPanel) {
      var gmMap = mapPanel.querySelector('[data-gm-map]');
      var gmTag = mapPanel.querySelector('[data-gm-tag]');
      var gmView = mapPanel.querySelector('[data-gm-view]');
      var gmDir = mapPanel.querySelector('[data-gm-dir]');
      var gmRows = mapPanel.querySelectorAll('.gm-row');
      gmRows.forEach(function (row) {
        row.addEventListener('click', function (e) {
          e.stopPropagation();
          var d = row.dataset;
          gmRows.forEach(function (r) { r.classList.toggle('on', r === row); });
          if (gmMap) gmMap.src = 'https://www.google.com/maps?q=' + encodeURIComponent(d.q) + '&z=' + d.z + '&output=embed';
          if (gmTag) gmTag.innerHTML = '<span class="dot"></span> ' + esc(d.label) + (d.hq ? ' · HQ' : '');
          if (gmView) { gmView.href = d.view; gmView.innerHTML = 'View ' + esc(d.label) + ' communities <span class="arr">→</span>'; }
          if (gmDir) gmDir.href = 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(d.dir);
        });
      });
    }

    /* ── footer newsletter signup (front-end only — wire to provider at build) ── */
    var nl = document.querySelector('.ft-nl');
    if (nl) {
      nl.addEventListener('submit', function (e) {
        e.preventDefault();
        var input = nl.querySelector('input');
        if (input && !input.checkValidity()) { input.reportValidity(); return; }
        var ok = document.querySelector('.ft-nl-ok');
        if (ok) ok.classList.add('on');
        nl.reset();
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
