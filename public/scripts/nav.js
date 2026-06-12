/* =================================================================
   CMGT Site Navigation — shared header + footer renderer.
   Per the Alloy Blueprint sitemap nav spec:
   - Primary: About ▾ · Management ▾ (Services + Solutions) · Locations ▾ · Resources ▾
   - Utility (never in primary nav): Login · Pay Dues · Order Documents · Owners & Renters
   - Exactly one conversion endpoint: Request a Proposal
   - Footer: pillars · solutions · geo (only chrome placement) · trust · utility · legal
   Usage: <div id="site-header"></div> … <div id="site-footer"></div>
          <script src="site-nav/nav.js" defer></script>
   Pages not yet built point to "#" — swap in real files as they're created.
   ================================================================= */
(function () {
  var HOME = 'index.html';
  var PROPOSAL = 'Request a Proposal.html';

  /* Locations map (Google Maps embed): click a state to fly the map there.
     view = clean Astro route (injected dynamically, after the .html href
     rewriter has already run, so these must be final routes — not .html). */
  var MK = [
    { key: 'la', label: 'Louisiana',         hq: true,  q: 'Baton Rouge, LA', z: 8, view: '/louisiana-hoa-management',   dir: 'CMGT, Baton Rouge, LA' },
    { key: 'tx', label: 'Texas',             hq: false, q: 'Houston, TX',     z: 7, view: '/texas-hoa-management',       dir: 'Houston, TX' },
    { key: 'ms', label: 'Mississippi',       hq: false, q: 'Gulfport, MS',    z: 9, view: '/mississippi-hoa-management', dir: 'Gulfport, MS' },
    { key: 'al', label: 'Alabama',           hq: false, q: 'Fairhope, AL',    z: 9, view: '/alabama-hoa-management',     dir: 'Fairhope, AL' },
    { key: 'fl', label: 'Florida Panhandle', hq: false, q: 'Pensacola, FL',   z: 9, view: '/developer-hoa-management',   dir: 'Pace, FL' },
  ];

  var NAV = [
    {
      label: 'About',
      type: 'dropdown',
      hub: 'About.html',
      items: [
        { t: 'Our Story', d: 'From one community in Denham Springs to 400+ across five states', href: 'Our Story.html' },
        { t: 'How We Work', d: 'The pod: one dedicated CAM, a whole specialist team behind them', href: 'How We Work.html' },
        { t: 'Team & Careers', d: '≈91 teammates — remote-first, with Gulf South roots', href: 'Team & Careers.html' },
        { t: 'CMGT Cares', d: 'Giving back to our communities since 2012', href: 'CMGT Cares.html' },
      ],
      meta: 'Independent since 2007 · 100% organic growth · no PE, no acquisitions',
    },
    {
      label: 'Management',
      type: 'mega',
      aside: {
        eyebrow: 'Management',
        statement: 'We manage communities, not buildings.',
        d: 'Every community gets a dedicated manager backed by a whole team \u2014 interactional, not transactional.',
        cta: 'Not sure which fits? Let\u2019s talk',
        href: PROPOSAL,
        stats: [
          { v: '400+', l: 'communities' },
          { v: '96%', l: 'retention' },
          { v: '4.2★', l: '535 reviews' },
        ],
      },
      services: [
        { t: 'HOA Management Services', d: 'Full-service or on-site — a dedicated CAM backed by specialist teams', href: 'HOA Management Services.html' },
        { t: 'Condo & Townhome Management', d: 'Condo, COA & luxury high-rise, with on-site staff where it calls for it', href: 'Condo & Townhome Management.html' },
        { t: 'HOA Financial Management', d: 'Right-sized financials & reporting for smaller communities', href: 'HOA Financial Management.html' },
        { t: 'Developer HOA Management', d: 'Declarant control through homeowner turnover, with one accountable team', href: 'Developer HOA Management.html' },
      ],
      solutions: [
        { t: 'Switching Management Companies', d: 'Slow responses? Rising delinquency? What a clean transition looks like', href: 'Switching HOA Management Companies.html' },
        { t: 'Self-Managed HOA vs. Professional', d: 'The honest math on when volunteer management stops working', href: 'Self-Managed HOA.html' },
      ],
    },
    {
      label: 'Locations',
      type: 'map',
      items: [
        { t: 'Louisiana', d: 'Where it started \u2014 Baton Rouge, New Orleans, the Northshore & beyond', href: 'Louisiana HOA Management.html' },
        { t: 'Texas', d: 'Communities across the Lone Star State', href: 'Texas HOA Management.html' },
        { t: 'Mississippi', d: 'The largest manager on the Mississippi Gulf Coast', href: 'Mississippi HOA Management.html' },
        { t: 'Alabama', d: 'Gulf Coast communities \u2014 Fairhope, Foley & the Eastern Shore', href: 'Alabama HOA Management.html' },
        { t: 'Florida Panhandle', d: 'Developer-run communities on the Panhandle', href: 'Developer HOA Management.html' },
      ],
      meta: 'Local teams, neighbors in every market we serve',
    },
    {
      label: 'Resources',
      type: 'dropdown',
      hub: 'Resources.html',
      items: [
        { t: 'Board Education Hub', d: 'Plain-language guides for volunteer board leaders', href: 'Resources.html' },
        { t: 'FAQ', d: 'Straight answers — no industry-speak', href: 'FAQ.html' },
        { t: 'Blog', d: 'News & community stories across five states', href: 'Resources.html' },
      ],
      featured: {
        eyebrow: 'Featured guide',
        t: 'Hurricane prep for Gulf South boards',
        d: 'Insurance, reserves, vendors, and the communication plan — before the season hits.',
        cta: 'Read the guide',
        href: 'Hurricane Preparedness for HOAs.html',
      },
    },
  ];

  var UTILITY = [
    { t: 'Homeowner / Board Login', href: '#', hideSm: false },
    { t: 'Pay Dues', href: '#', hideSm: false },
    { t: 'Order Documents', href: '#', hideSm: true },
    { t: 'Owners & Renters', href: '#', hideSm: true },
  ];

  var FOOTER = [
    {
      h: 'Management',
      links: [
        { t: 'HOA Management', href: 'HOA Management Services.html' },
        { t: 'Condo & Townhome', href: 'Condo & Townhome Management.html' },
        { t: 'Financial Management', href: 'HOA Financial Management.html' },
        { t: 'Developer Services', href: 'Developer HOA Management.html' },
        { t: 'Switching Managers', href: 'Switching HOA Management Companies.html' },
        { t: 'Self-Managed vs. Pro', href: 'Self-Managed HOA.html' },
        { t: 'Rentals', href: 'Rentals.html' },
        { t: 'The Fix-It Squad', href: 'Fix-It Squad.html' },
      ],
    },
    {
      h: 'Communities',
      links: [
        { t: 'Louisiana', href: 'Louisiana HOA Management.html' },
        { t: 'Texas', href: 'Texas HOA Management.html' },
        { t: 'Mississippi', href: 'Mississippi HOA Management.html' },
        { t: 'Alabama', href: 'Alabama HOA Management.html' },
        { t: 'Florida Panhandle', href: 'Developer HOA Management.html' },
      ],
    },
    {
      h: 'Company',
      links: [
        { t: 'About CMGT', href: 'About.html' },
        { t: 'Our Story', href: 'Our Story.html' },
        { t: 'Team & Careers', href: 'Team & Careers.html' },
        { t: 'How We Work', href: 'How We Work.html' },
        { t: 'CMGT Cares', href: 'CMGT Cares.html' },
        { t: 'FAQ', href: 'FAQ.html' },
        { t: 'Contact', href: 'Request a Proposal.html' },
        { t: 'Testimonials', href: 'Testimonials.html' },
        { t: 'Blog', href: 'Resources.html' },
      ],
    },
    {
      h: 'Owners & Boards',
      links: [
        { t: 'Login', href: '#' },
        { t: 'Pay Dues', href: '#' },
        { t: 'Order Documents', href: '#' },
        { t: 'Owners & Renters', href: '#' },
        { t: 'Request a Proposal', href: PROPOSAL },
      ],
    },
  ];

  var ASSETS = '/assets/';
  var CHEV = '<span class="chev"><svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 8 11 13 6"></polyline></svg></span>';
  var ICONS = {
    home: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="m3 10.5 9-7.5 9 7.5"></path><path d="M5.5 8.7V20a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V8.7"></path><path d="M9.5 21v-6.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1V21"></path></svg>',
    condo: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"></path><path d="M5 21V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16"></path><path d="M15 21V9h3a1 1 0 0 1 1 1v11"></path><path d="M8 7h2M8 11h2M8 15h2"></path></svg>',
  };

  function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;'); }

  function panelItem(it) {
    return '<a class="nav-panel-item" href="' + it.href + '"><span class="t">' + esc(it.t) + '</span><span class="d">' + esc(it.d) + '</span></a>';
  }

  /* Locations map — the Google Maps embed + state-list rail.
     Defaults to Louisiana (HQ); clicking a row re-flies the embed. */
  function mapPanelHTML() {
    var first = MK[0];
    var h = '<div class="nav-panel nav-panel-map"><div class="lm">';
    h += '<div class="gm-wrap">';
    h += '<div class="gm-tag" data-gm-tag><span class="dot"></span> ' + esc(first.label) + ' · HQ</div>';
    h += '<iframe data-gm-map loading="lazy" referrerpolicy="no-referrer-when-downgrade" ';
    h += 'src="https://www.google.com/maps?q=' + encodeURIComponent(first.q) + '&z=' + first.z + '&output=embed" title="CMGT markets map"></iframe>';
    h += '</div>';
    h += '<aside class="lm-rail">';
    h += '<p class="lm-rail-eyebrow">We’re Local</p>';
    h += '<h3 class="lm-rail-h">Find your market.</h3>';
    h += '<div class="gm-list" data-gm-list>';
    h += MK.map(function (m, i) {
      return '<button class="gm-row' + (i === 0 ? ' on' : '') + '" type="button" data-key="' + m.key + '">' +
        '<span class="pin"></span>' + esc(m.label) + (m.hq ? '<span class="hq">HQ</span>' : '') + '</button>';
    }).join('');
    h += '</div>';
    h += '<div class="lm-actions">';
    h += '<a class="lm-btn lm-btn-primary" data-gm-view href="' + first.view + '">View ' + esc(first.label) + ' communities <span class="arr">→</span></a>';
    h += '<a class="lm-btn lm-btn-ghost" data-gm-dir target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(first.dir) + '">Get directions <span class="arr">↗</span></a>';
    h += '</div>';
    h += '</aside>';
    h += '</div></div>';
    return h;
  }

  function headerHTML() {
    var h = '';
    /* utility bar */
    h += '<div class="util-bar"><div class="util-in">';
    h += '<a class="util-phone" href="tel:2255032648">Call us — <strong>(225) 503-2648</strong> · Mon–Fri, 8a–5p CT</a>';
    h += '<nav class="util-links" aria-label="Utility">';
    UTILITY.forEach(function (u, i) {
      if (i > 0) h += '<span class="sep"></span>';
      h += '<a href="' + u.href + '"' + (u.hideSm ? ' class="util-hide-sm"' : '') + '>' + esc(u.t) + '</a>';
    });
    h += '</nav></div></div>';

    /* primary nav */
    h += '<div class="nav-main"><div class="nav-in">';
    h += '<a class="nav-brand" href="' + HOME + '" aria-label="CMGT home"><img src="' + ASSETS + 'logo.svg" alt="CMGT"></a>';
    h += '<nav class="nav-links" aria-label="Primary">';
    NAV.forEach(function (n, i) {
      if (n.type === 'link') {
        h += '<div class="nav-item"><a class="nav-link" href="' + n.href + '">' + esc(n.label) + '</a></div>';
        return;
      }
      h += '<div class="nav-item' + (n.type === 'mega' ? ' nav-item-mega' : '') + (n.type === 'map' ? ' nav-item-map' : '') + (n.featured ? ' nav-item-feat' : '') + '" data-nav-i="' + i + '">';
      h += '<button class="nav-link" type="button" aria-expanded="false" aria-haspopup="true">' + esc(n.label) + CHEV + '</button>';
      if (n.type === 'mega') {
        h += '<div class="nav-panel nav-panel-mega"><div class="mm-grid">';
        h += '<aside class="mm-aside">';
        h += '<span class="mm-aside-eyebrow">' + esc(n.aside.eyebrow) + '</span>';
        h += '<p class="mm-statement">' + esc(n.aside.statement) + '</p>';
        h += '<p class="mm-aside-d">' + esc(n.aside.d) + '</p>';
        h += '<a class="mm-aside-cta" href="' + n.aside.href + '">' + esc(n.aside.cta) + ' \u2192</a>';
        h += '<div class="mm-aside-stats">';
        n.aside.stats.forEach(function (st) {
          h += '<div class="mm-stat"><span class="mm-stat-v">' + esc(st.v) + '</span><span class="mm-stat-l">' + esc(st.l) + '</span></div>';
        });
        h += '</div>';
        h += '</aside>';
        h += '<div class="mm-body">';
        h += '<p class="mm-eyebrow">Services</p><div class="mm-services">';
        n.services.forEach(function (sv, si) {
          h += '<a class="mm-svc" href="' + sv.href + '">';
          h += '<span class="mm-num">0' + (si + 1) + '</span>';
          h += '<span class="mm-svc-t">' + esc(sv.t) + '</span>';
          h += '<span class="mm-svc-d">' + esc(sv.d) + '</span>';
          h += '</a>';
        });
        h += '</div>';
        h += '<p class="mm-eyebrow">Solutions</p><div class="mm-services mm-sols-grid">';
        n.solutions.forEach(function (sv) {
          h += '<a class="mm-svc mm-sol" href="' + sv.href + '">';
          h += '<span class="mm-svc-t">' + esc(sv.t) + '</span>';
          h += '<span class="mm-svc-d">' + esc(sv.d) + '</span>';
          h += '</a>';
        });
        h += '</div></div>';
        h += '</div></div>';
      } else if (n.type === 'map') {
        h += mapPanelHTML();
      } else {
        h += '<div class="nav-panel nav-panel-list' + (n.featured ? ' nav-panel-has-feat' : '') + '">';
        h += '<div class="np-cols">';
        h += '<div class="np-list">';
        if (n.hub) {
          h += '<a class="mm-eyebrow mm-eyebrow-link" href="' + n.hub + '">' + esc(n.label) + ' \u2192</a>';
        } else {
          h += '<p class="mm-eyebrow">' + esc(n.label) + '</p>';
        }
        n.items.forEach(function (it, ii) {
          h += '<a class="mm-svc" href="' + it.href + '">';
          h += '<span class="mm-num">0' + (ii + 1) + '</span>';
          h += '<span class="mm-svc-t">' + esc(it.t) + '</span>';
          h += '<span class="mm-svc-d">' + esc(it.d) + '</span>';
          h += '</a>';
        });
        h += '</div>';
        if (n.featured) {
          h += '<a class="np-feat" href="' + n.featured.href + '">';
          h += '<span class="mm-eyebrow">' + esc(n.featured.eyebrow) + '</span>';
          h += '<span class="np-feat-t">' + esc(n.featured.t) + '</span>';
          h += '<span class="np-feat-d">' + esc(n.featured.d) + '</span>';
          h += '<span class="np-feat-cta">' + esc(n.featured.cta) + ' \u2192</span>';
          h += '</a>';
        }
        h += '</div>';
        if (n.meta) h += '<p class="np-meta">' + esc(n.meta) + '</p>';
        h += '</div>';
      }
      h += '</div>';
    });
    h += '</nav>';
    h += '<div class="nav-actions">';
    h += '<a class="nav-cta" href="' + PROPOSAL + '">Request a Proposal / Contact</a>';
    h += '<button class="nav-burger" type="button" aria-label="Open menu"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg></button>';
    h += '</div></div></div>';

    /* mobile drawer */
    h += '<div class="nav-drawer" role="dialog" aria-label="Menu">';
    h += '<div class="nav-drawer-top"><img src="' + ASSETS + 'logo.svg" alt="CMGT"><button class="nav-drawer-close" type="button" aria-label="Close menu">✕</button></div>';
    NAV.forEach(function (n) {
      if (n.type === 'link') {
        h += '<div class="nd-group"><a class="nd-toggle" href="' + n.href + '">' + esc(n.label) + '</a></div>';
        return;
      }
      h += '<div class="nd-group">';
      h += '<button class="nd-toggle" type="button">' + esc(n.label) + CHEV + '</button>';
      h += '<div class="nd-sub">';
      if (n.type === 'mega') {
        h += '<p class="nav-group-label">Services</p>';
        n.services.forEach(function (it) { h += panelItem(it); });
        h += '<p class="nav-group-label">Solutions</p>';
        n.solutions.forEach(function (it) { h += panelItem(it); });
      } else {
        n.items.forEach(function (it) { h += panelItem(it); });
      }
      h += '</div></div>';
    });
    h += '<div class="nd-cta-row"><a class="nav-cta" style="justify-content:center;" href="' + PROPOSAL + '">Request a Proposal / Contact</a></div>';
    h += '<div class="nd-util">';
    UTILITY.forEach(function (u) { h += '<a href="' + u.href + '">' + esc(u.t) + '</a>'; });
    h += '<a href="tel:2255032648">(225) 503-2648</a>';
    h += '</div></div>';
    return h;
  }

  function footerHTML() {
    var h = '<footer class="ft">';
    h += '<div class="ft-main">';
    h += '<div class="ft-brand-col">';
    h += '<img src="' + ASSETS + 'logo-1C-white.svg" alt="CMGT">';
    h += '<p class="ft-brand-tagline">Commit<span class="dot">.</span> Communicate<span class="dot">.</span> Care<span class="dot">.</span></p>';
    h += '<p class="ft-brand-copy">Gulf South HOA management — 400+ communities across five states, independently owned since 2007.</p>';
    h += '</div>';
    FOOTER.forEach(function (col) {
      h += '<div><p class="ft-col-h">' + esc(col.h) + '</p><ul class="ft-list">';
      col.links.forEach(function (l) { h += '<li><a href="' + l.href + '">' + esc(l.t) + '</a></li>'; });
      h += '</ul></div>';
    });
    h += '</div>';
    h += '<div class="ft-cta"><div class="ft-cta-in">';
    h += '<div><h2 class="ft-cta-h">Board insights, in your inbox<span class="dot">.</span></h2>';
    h += '<p class="ft-cta-p">Plain-English guides on reserves, budgets, and Gulf South HOA law \u2014 a few times a year, never spam.</p></div>';
    h += '<div><form class="ft-nl" novalidate>';
    h += '<input type="email" placeholder="you@email.com" aria-label="Email address" required>';
    h += '<button class="ft-nl-btn" type="submit">Subscribe <span class="arrow">\u2192</span></button>';
    h += '</form><p class="ft-nl-ok">Thanks \u2014 you\u2019re on the list.</p>';
    h += '<p class="ft-nl-note">For HOA boards &amp; homeowners. Unsubscribe anytime.</p></div>';
    h += '</div></div>';
    h += '<div class="ft-bottom"><div class="ft-bottom-in">';
    h += '<span>© ' + new Date().getFullYear() + ' CMGT, LLC · We Manage. You Live.</span>';
    h += '<nav class="ft-legal" aria-label="Legal"><a href="Privacy Policy.html">Privacy</a><a href="Terms of Service.html">Terms</a><a href="Cookie Policy.html">Cookies</a><a href="#">Accessibility</a></nav>';
    h += '</div></div></footer>';
    return h;
  }

  function init() {
    var headerSlot = document.getElementById('site-header');
    var footerSlot = document.getElementById('site-footer');
    if (headerSlot) {
      headerSlot.style.display = 'contents';
      headerSlot.innerHTML = headerHTML();
    }
    if (footerSlot) {
      footerSlot.style.display = 'contents';
      footerSlot.innerHTML = footerHTML();
    }
    /* breadcrumbs */
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

    if (!headerSlot) return;

    /* scroll behavior: ease away on scroll-down, ease back + glassy on scroll-up.
       page scrim dims the page behind an open dropdown tray. */
    var navMain = headerSlot.querySelector('.nav-main');
    var scrim = document.createElement('div');
    scrim.className = 'nav-scrim';
    document.body.appendChild(scrim);
    function updateScrim() {
      var anyOpen = !!headerSlot.querySelector('.nav-item.open');
      scrim.classList.toggle('on', anyOpen);
      if (anyOpen && navMain) navMain.classList.remove('is-hidden');
    }
    var lastY = window.scrollY || 0;
    var ticking = false;
    function onScroll() {
      var y = window.scrollY || 0;
      if (navMain) {
        navMain.classList.toggle('is-scrolled', y > 12);
        var anyOpen = !!headerSlot.querySelector('.nav-item.open');
        if (y > 150 && y > lastY + 4 && !anyOpen) navMain.classList.add('is-hidden');
        else if (y < lastY - 4 || y <= 12) navMain.classList.remove('is-hidden');
      }
      lastY = y;
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { window.requestAnimationFrame(onScroll); ticking = true; }
    }, { passive: true });
    onScroll();

    /* dropdown behavior: open on hover (desktop) or click; close on outside/Esc */
    var items = headerSlot.querySelectorAll('.nav-item[data-nav-i]');
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
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeAll(null); closeDrawer(); } });

    /* mobile drawer */
    var drawer = headerSlot.querySelector('.nav-drawer');
    var burger = headerSlot.querySelector('.nav-burger');
    var closeBtn = headerSlot.querySelector('.nav-drawer-close');
    function openDrawer() { drawer.classList.add('open'); document.body.style.overflow = 'hidden'; }
    function closeDrawer() { drawer.classList.remove('open'); document.body.style.overflow = ''; }
    if (burger) burger.addEventListener('click', openDrawer);
    if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
    drawer.querySelectorAll('.nd-group').forEach(function (g) {
      var tg = g.querySelector('button.nd-toggle');
      if (tg) tg.addEventListener('click', function () { g.classList.toggle('open'); });
    });

    /* Locations map: click a state row -> highlight + re-fly the Google Maps embed */
    var mapPanel = headerSlot.querySelector('.nav-panel-map');
    if (mapPanel) {
      var gmMap = mapPanel.querySelector('[data-gm-map]');
      var gmTag = mapPanel.querySelector('[data-gm-tag]');
      var gmView = mapPanel.querySelector('[data-gm-view]');
      var gmDir = mapPanel.querySelector('[data-gm-dir]');
      var gmRows = mapPanel.querySelectorAll('.gm-row');
      function gmSelect(m, rowEl) {
        gmRows.forEach(function (r) { r.classList.toggle('on', r === rowEl); });
        if (gmMap) gmMap.src = 'https://www.google.com/maps?q=' + encodeURIComponent(m.q) + '&z=' + m.z + '&output=embed';
        if (gmTag) gmTag.innerHTML = '<span class="dot"></span> ' + esc(m.label) + (m.hq ? ' · HQ' : '');
        if (gmView) { gmView.href = m.view; gmView.innerHTML = 'View ' + esc(m.label) + ' communities <span class="arr">→</span>'; }
        if (gmDir) gmDir.href = 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(m.dir);
      }
      gmRows.forEach(function (row) {
        var m = MK.filter(function (x) { return x.key === row.getAttribute('data-key'); })[0];
        if (!m) return;
        row.addEventListener('click', function (e) { e.stopPropagation(); gmSelect(m, row); });
      });
    }

    /* footer newsletter signup (front-end only — wire to email provider at build) */
    if (footerSlot) {
      var nl = footerSlot.querySelector('.ft-nl');
      if (nl) {
        nl.addEventListener('submit', function (e) {
          e.preventDefault();
          var input = nl.querySelector('input');
          if (input && !input.checkValidity()) { input.reportValidity(); return; }
          var ok = footerSlot.querySelector('.ft-nl-ok');
          if (ok) ok.classList.add('on');
          nl.reset();
        });
      }
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();


/* ─── Astro port: rewrite .html hrefs → clean routes after chrome renders ─── */
(function () {
  function slug(href) {
    if (!href) return href;
    if (/^(https?:|tel:|mailto:|#|\/)/.test(href)) return href;
    if (href === 'index.html') return '/';
    return '/' + href.replace(/\.html$/, '').toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  function rewrite() {
    document.querySelectorAll('#site-header a[href], #site-footer a[href]').forEach(function (a) {
      a.setAttribute('href', slug(a.getAttribute('href')));
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', rewrite);
  else rewrite();
})();
