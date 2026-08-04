#!/usr/bin/env python3
"""Port the CMGT city-page template + data into Astro pages on the live framework.

Reads city-page-template.html + city-pages-data.json, substitutes tokens, strips the
standalone-HTML chrome (head, nav.js-injected header/footer, script tags), rewrites
the .html links to real Astro routes, and emits one .astro page per market that uses
BaseLayout (which already supplies Nav, Footer, canonical and the shared scripts).
"""
import json, re, sys, pathlib

SRC = pathlib.Path('/tmp/cmgt-cities/cmgt-city-pages')
ROOT = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else '.') / 'src/pages/hoa-management'

# .html handoff links -> real routes on the live site
LINKS = {
    'Condo &amp; Townhome Management.html': '/condo-management',
    'Condo & Townhome Management.html': '/condo-management',
    'Developer HOA Management.html': '/developer-hoa-management',
    'HOA Financial Management.html': '/hoa-financial-management',
    'HOA Management Services.html': '/hoa-management-services',
    'HOA Reserve Study.html': '/resources/hoa-reserve-study',
    'Louisiana HOA Management.html': '/hoa-management/louisiana',  # rewritten per-state below
    'Request a Proposal.html': '/request-a-proposal',
    'Switching HOA Management Companies.html': '/switching-hoa-management-companies',
    'Hurricane Preparedness for HOAs.html': '/resources/hurricane-preparedness-for-hoas',
    'Self-Managed HOA.html': '/self-managed-hoa',
    'index.html': '/',
}

# Real coordinates for every place these pages claim to serve, so the map shows
# actual geography instead of decorative pins. Office locations first.
COORDS = {
    'Denham Springs': (30.4863, -90.9559), 'Baton Rouge': (30.4515, -91.1871),
    'Prairieville': (30.3060, -90.9773), 'Zachary': (30.6485, -91.1565),
    'Gonzales': (30.2386, -90.9201), 'Central': (30.5546, -91.0367),
    'Walker': (30.4913, -90.8618), 'New Orleans': (29.9511, -90.0715),
    'Shreveport': (32.5252, -93.7502), 'Bossier City': (32.5160, -93.7321),
    'Monroe': (32.5093, -92.1193),
    'Lafayette': (30.2241, -92.0198), 'Carencro': (30.3160, -92.0468),
    'Broussard': (30.1471, -91.9629), 'Youngsville': (30.0977, -92.0121),
    'Lake Charles': (30.2266, -93.2174),
    # Alabama Gulf Coast (Baldwin County + Mobile)
    'Daphne': (30.6035, -87.9036), 'Fairhope': (30.5229, -87.9033),
    'Foley': (30.4066, -87.6836), 'Silverhill': (30.5443, -87.7508),
    'Mobile': (30.6954, -88.0399),
    # Mississippi Gulf Coast (Harrison / Hancock / Jackson)
    'Biloxi': (30.3960, -88.8853), 'Gulfport': (30.3674, -89.0928),
    'Ocean Springs': (30.4113, -88.8278), 'Bay St. Louis': (30.3097, -89.3300),
}
# Which city each office actually sits in (the GBP locality).
OFFICE_CITY = {'baton-rouge': 'Denham Springs', 'shreveport': 'Shreveport',
               'lafayette': 'Carencro', 'daphne': 'Daphne', 'biloxi': 'Biloxi'}

# Google Place ID + the office's own geocode, pulled live from the Places API
# (places:searchText on each GBP name) rather than typed by hand, so `sameAs` points
# at the real profile and `geo` matches what Google already has for that listing.
# These are what tie each page to its own GBP: without sameAs there is nothing
# explicit telling Google which of the five listings a page belongs to.
PLACES = {
    'baton-rouge': ('ChIJNcLCkoG8JoYR4ECncPYIcKI', 30.45989, -90.95374),
    'shreveport':  ('ChIJF0aljwrNNoYR-IAl06KcDkU', 32.50919, -93.75029),
    'lafayette':   ('ChIJ1wgFszubJIYRzFHm5mWnVB4', 30.30223, -92.02862),
    'daphne':      ('ChIJbZ-eHQlPmogRZXIcLFkoCcE', 30.60586, -87.87277),
    'biloxi':      ('ChIJtdwiyKURnIgR9_gMwu5E4tc', 30.39488, -88.88799),
}

# Real site photography for the slots the handoff left empty. Chosen from
# public/photos/PHOTO-MANIFEST.md so each slot gets something that actually fits
# it, rather than a camera placeholder.
PHOTOS = {
    # wide Louisiana community banner for the hero
    'hero': ('/photos/la-geo-hero-photo.webp', 'A Louisiana community neighborhood CMGT manages'),
    'hero-alabama': ('/photos/al-geo-hero-photo.webp', 'An Alabama Gulf Coast community CMGT manages'),
    'hero-mississippi': ('/photos/ms-geo-hero-photo.webp', 'A Mississippi Gulf Coast community CMGT manages'),
    # board/team imagery for the "local team" slot
    'team': ('/photos/hoa-board-members-financials.webp', 'A CMGT manager reviewing financials with an HOA board'),
}

tpl = (SRC / 'city-page-template.html').read_text(encoding='utf-8')
data = json.loads((SRC / 'city-pages-data.json').read_text(encoding='utf-8'))

# page-specific CSS lives in the template's inline <style>; reuse verbatim (Astro scopes it)
style = '\n'.join(re.findall(r'<style[^>]*>(.*?)</style>', tpl, re.S)).strip()
# ImageSlot renders <img class="image-slot">, so the template's element selectors
# become class selectors and all the page's sizing rules keep applying.
style = re.sub(r'(?<![-.\w])image-slot(?![-\w])', ':global(.image-slot)', style)
# the three JSON-LD blocks, tokens still in place
ldblocks = re.findall(r'<script type="application/ld\+json">(.*?)</script>', tpl, re.S)

def subst(text, rec):
    for k, v in rec.items():
        if k.startswith('_'):
            continue
        text = text.replace('{{%s}}' % k, str(v))
    return text

def rewrite_links(t):
    for old, new in LINKS.items():
        t = t.replace('href="%s"' % old, 'href="%s"' % new)
    return t

results = []
for key, rec in data.items():
    if key.startswith('_'):
        continue

    body = tpl
    # drop the award block for markets with no award
    if not rec.get('HAS_AWARD'):
        body = re.sub(r'<!-- IF_AWARD.*?/IF_AWARD -->', '', body, flags=re.S)

    body = subst(body, rec)

    # isolate the page body: after the injected-header div, before the injected-footer div
    m = re.search(r'<div id="site-header"></div>(.*?)<div id="site-footer"></div>', body, re.S)
    if not m:
        raise SystemExit('could not isolate body for %s' % key)
    inner = m.group(1)

    # BaseLayout renders the visible breadcrumbs itself from data-crumbs; keep the nav but
    # point it at real routes.
    st = rec.get('STATE', 'louisiana')
    st_name = st.capitalize()
    ABBR = {'louisiana': 'LA', 'alabama': 'AL', 'mississippi': 'MS',
            'texas': 'TX', 'florida': 'FL'}
    abbr = ABBR[st]
    crumbs = json.dumps([
        {"t": "Home", "href": "/"},
        {"t": st_name, "href": "/hoa-management/%s" % st},
        {"t": rec['CITY']},
    ])
    inner = re.sub(r'<nav id="site-breadcrumbs".*?></nav>',
                   "<nav id=\"site-breadcrumbs\" aria-label=\"Breadcrumb\" data-crumbs='%s'></nav>" % crumbs,
                   inner, flags=re.S)

    if abbr != 'LA':
        # the template hardcodes the Louisiana abbreviation in the NAP block
        inner = inner.replace('%s, LA ' % rec['LOCALITY'], '%s, %s ' % (rec['LOCALITY'], abbr))
    inner = rewrite_links(inner).strip()

    # The template's "statewide" related card is written for Louisiana; point it at
    # the page's own state hub so an Alabama or Mississippi page doesn't send readers
    # to the wrong state.
    if st != 'louisiana':
        inner = inner.replace('href="/hoa-management/louisiana"',
                              'href="/hoa-management/%s"' % st)
        inner = inner.replace('HOA management across Louisiana',
                              'HOA management across %s' % st_name)
        # NOTE: deliberately NOT a blanket Louisiana->state replace. That mangled
        # real sentences ("not from Louisiana" became "not from Alabama") and
        # double-substituted headings. Only the state hub card is rewritten above;
        # per-market copy comes from the data record.

    # ---- <image-slot> -> our ImageSlot component -------------------------------
    # The handoff ships a custom <image-slot> element sized by page CSS and hydrated
    # by its own image-slot.js, which this site doesn't load — so the slots rendered
    # as blank space (and 404'd on a relative asset). ImageSlot.astro is the built-in
    # replacement: it renders <img class="image-slot"> and falls back to the branded
    # placeholder, so every slot is visible while real photography is pending.
    # alt text is taken from the slot's own placeholder copy, which is already
    # geo-specific ("a Shreveport community / neighborhood photo").
    def slot_to_component(m):
        attrs = m.group(1)
        def a(name, default=None):
            g = re.search(r'%s="([^"]*)"' % name, attrs)
            return g.group(1) if g else default
        shape = a('shape', 'rounded')
        radius = a('radius')
        hint = (a('placeholder', '') or '').strip()
        slot_id = a('id', '') or ''

        # Jeff's real headshot — PHOTO-MANIFEST lists lead-jeff.jpg as
        # "Jeff Harman, Founder & CEO (circle)". (lead-jeff.webp is a different,
        # unrelated group photo — not him.)
        if slot_id.endswith('mgr-headshot'):
            return ('<ImageSlot src="/photos/lead-jeff.jpg" alt="%s, Founder and CEO of CMGT"'
                    ' shape="circle" class="mgr-headshot" />'
                    % rec['CONTACT_NAME'].replace('&amp;', 'and'))
        # Wide neighbourhood banner in the hero.
        if slot_id.endswith('city-hero-photo'):
            st = rec.get('STATE', 'louisiana')
            p = PHOTOS.get('hero-' + st, PHOTOS['hero'])
            return '<ImageSlot src="%s" alt="%s near %s" shape="rect" />' % (p[0], p[1], rec['CITY'])
        # Team / board photo beside the manager copy.
        if slot_id.endswith('mgr-photo'):
            p = PHOTOS['team']
            rad = ' radius={%s}' % radius if radius else ''
            return '<ImageSlot src="%s" alt="%s in %s" shape="%s"%s />' % (p[0], p[1], rec['CITY'], shape, rad)
        # office-photo is replaced by the real office map (handled below).
        src = ''
        alt = 'alt="%s"' % re.sub(r'^Drop (a|an) ', '', hint).replace('"', '')
        rad = ' radius={%s}' % radius if radius else ''
        return '<ImageSlot%s %s shape="%s"%s />' % (src, alt, shape, rad)

    inner = re.sub(r'<image-slot([^>]*)>\s*</image-slot>|<image-slot([^>]*)/?>',
                   lambda m: slot_to_component(
                       type('M', (), {'group': lambda s, i: (m.group(1) or m.group(2) or '')})()),
                   inner)

    # ---- Jeff's photo + name sit side by side in the manager card --------------
    # (the headshot slot above now carries the real photo; the card just needs to
    # lay them out as a row, which the added CSS below handles)

    # ---- Office map (replaces the empty "map screenshot or exterior" slot) -----
    # The NAP section's right-hand slot asked for "a map screenshot or exterior
    # photo of the office". A real, brand-styled Google map of the actual office is
    # better than either — it's the proof the section is making.
    office_city = OFFICE_CITY[rec['SLUG']]
    olat, olng = COORDS[office_city]
    office_map = (
        '<ServiceAreaMap\n'
        '        points={[{ name: "%s", lat: %s, lng: %s }]}\n'
        '        zoom={13}\n'
        '        ariaLabel="Map of the CMGT %s office"\n'
        '        caption="Our %s office — %s"\n'
        '      />' % (office_city, olat, olng, office_city, office_city, rec['STREET'])
    )
    inner = re.sub(r'<ImageSlot\s+alt="[^"]*(?:map screenshot|exterior)[^"]*"[^>]*/>',
                   lambda _m: office_map, inner, count=1)

    # ---- Service-area map ------------------------------------------------------
    # The handoff asks for a map near the coverage list. Rather than embed a
    # third-party iframe (an LCP risk the handoff itself flags), draw a brand-styled
    # SVG panel and pin the page's own stated coverage areas, parsed from the chips
    # so the map can never disagree with the copy.
    areas = re.findall(r'<span class="geo-chip static">([^<]+)</span>', inner)
    known = [a for a in areas if a in COORDS]
    if known:
        # Office first (it anchors the map and gets the green marker), then the rest
        # of the areas this page claims — all at their real coordinates.
        ordered = [office_city] + [a for a in known if a != office_city]
        pts = ',\n          '.join(
            '{ name: "%s", lat: %s, lng: %s }' % (n, COORDS[n][0], COORDS[n][1]) for n in ordered)
        # Zoom to fit the spread of the markers rather than guessing.
        lats = [COORDS[n][0] for n in ordered]; lngs = [COORDS[n][1] for n in ordered]
        span = max(max(lats) - min(lats), (max(lngs) - min(lngs)) * 0.8)
        zoom = 11 if span < 0.35 else 10 if span < 0.7 else 9 if span < 1.4 else 8
        svcmap = ('\n      <ServiceAreaMap\n'
                  '        points={[\n          %s\n        ]}\n'
                  '        zoom={%d}\n'
                  '        ariaLabel="Map of the areas CMGT serves around %s"\n'
                  '        caption="Communities we manage across this market. Marker positions are the cities themselves, not service boundaries."\n'
                  '      />' % (pts, zoom, rec['CITY']))
        inner = inner.replace('</div>\n      <ul class="geo-svc reveal"',
                              '</div>' + svcmap + '\n      <ul class="geo-svc reveal"', 1)

    # ---- Unknown rating: never render a placeholder or inherited number --------
    # Two profiles have no rating supplied yet. Rather than print another market's
    # numbers (or a 0.0), hide the rating rail item and the NAP Reviews row until the
    # live pull returns real values, and drop aggregateRating from the schema — a
    # made-up aggregateRating is a structured-data violation.
    rating_known = bool(str(rec.get('RATING', '')).strip())
    if not rating_known:
        # Cut the whole rr-score block by index rather than regex — the nested
        # closing divs made a pattern brittle, and a partial match left an empty
        # 38px score box on the page.
        i = inner.find('data-rv-rating')
        if i != -1:
            s0 = inner.rfind('<div class="rr-score">', 0, i)
            marker = 'Google reviews</div>'
            m0 = inner.find(marker, i)
            if s0 != -1 and m0 != -1:
                e0 = m0 + len(marker)
                for _ in range(2):  # close the wrapper div, then rr-score
                    e0 = inner.find('</div>', e0) + len('</div>')
                inner = inner[:s0] + inner[e0:]
        inner = re.sub(r'<div class="nap-row"><div class="nap-k">Reviews</div>.*?</div></div>',
                       '', inner, count=1, flags=re.S)

    # ---- Hooks the live-review script updates in place -------------------------
    # Rating rail number + "N Google reviews", the proof-band counter, and the NAP's
    # "Read them on our Google Business Profile" (which had no href at all — the
    # handoff flags the missing reciprocal GBP link as a P0).
    inner = inner.replace('<div class="rr-num">%s' % rec['RATING'],
                          '<div class="rr-num" data-rv-rating>%s' % rec['RATING'], 1)
    inner = inner.replace('<div class="rr-meta">%s Google reviews' % rec['REVIEW_COUNT'],
                          '<div class="rr-meta"><span data-rv-count>%s</span> Google reviews' % rec['REVIEW_COUNT'], 1)
    inner = inner.replace('data-count-to="%s"' % rec['REVIEW_COUNT'],
                          'data-count-to="%s" data-rv-count-to' % rec['REVIEW_COUNT'], 1)
    inner = inner.replace('Read them on our Google Business Profile',
                          '<a data-rv-link href="%s" target="_blank" rel="noopener">Read them on our Google Business Profile</a>'
                          % ('https://www.google.com/maps/search/?api=1&amp;query=' +
                             rec['GBP_NAME'].replace('&amp;', 'and').replace(' ', '+')), 1)

    # ---- Live Google reviews block --------------------------------------------
    # Handoff P0: surface real, location-specific review text. The card block did not
    # exist in the template; slot it between coverage and the proof band, as directed.
    # Content is fetched client-side from /api/reviews?city=<slug> (edge-cached daily,
    # never a per-view upstream call) and only rendered if that location returns
    # reviews — so nothing appears until the Places key is live. No Review schema is
    # emitted: these are third-party reviews, and marking them up would be a
    # structured-data violation (also called out in the handoff).
    reviews_block = f'''
  <section class="revs" data-screen-label="Google reviews" hidden data-city="{rec['SLUG']}">
    <div class="container">
      <div class="eyebrow eyebrow-blue reveal">From our {rec['CITY']} Google profile</div>
      <h2 class="revs-h">What neighbors near {rec['CITY']} actually say.</h2>
      <div class="revs-grid" id="revs-grid-{rec['SLUG']}"></div>
      <a class="revs-all" id="revs-all-{rec['SLUG']}" href="#" target="_blank" rel="noopener">Read all reviews on Google <span class="arrow">→</span></a>
    </div>
  </section>
'''
    inner = inner.replace('<section class="proof-band"', reviews_block + '\n  <section class="proof-band"', 1)

    # JSON-LD. Two blocks in the template are real JSON (BreadcrumbList, LocalBusiness);
    # the third is a bare {{FAQ_JSONLD}} token that the data file never supplies — a gap in
    # the handoff. Compose FAQPage from the page's own visible accordion instead, so the
    # schema can't drift from the rendered Q&A.
    lds = {}
    for raw in ldblocks:
        s = subst(raw, rec).strip()
        if s.startswith('{{') or not s.startswith('{'):
            continue  # unsupplied token (FAQ) — composed below
        # the handoff hardcodes www + trailing slash; this site canonicalises to
        # https://cmgt.org with no trailing slash. Normalise or we fight our own canonical.
        s = s.replace('https://www.cmgt.org', 'https://cmgt.org')
        if abbr != 'LA':
            s = s.replace('"addressRegion":"LA"', '"addressRegion":"%s"' % abbr)
        if st != 'louisiana':
            s = s.replace('/hoa-management/louisiana/', '/hoa-management/%s/' % st)
            s = s.replace('"Louisiana"', '"%s"' % st_name)
        s = re.sub(r'(https://cmgt\.org/[^"]*?)/(?=["#])', r'\1', s)
        if not str(rec.get('RATING', '')).strip():
            s = re.sub(r',"aggregateRating":\{[^}]*\}', '', s)
        obj = json.loads(s)
        lds[obj.get('@type')] = obj

    # Enrich LocalBusiness. The handoff emits only the bare minimum (name/url/phone/
    # address/areaServed/hours); everything below is either a Google-recommended
    # property or the signal that ties this page to its own GBP listing.
    lb = lds.get('LocalBusiness')
    if lb is not None:
        pid, olat_g, olng_g = PLACES[key]
        # sameAs → the actual Google profile. The `?cid=` form is the canonical
        # public URL for a listing; the place_id form is the stable machine one.
        # Both are given so the reconciliation isn't relying on a single format.
        lb['sameAs'] = [
            'https://www.google.com/maps/place/?q=place_id:%s' % pid,
            'https://cmgt.org/',
        ]
        lb['hasMap'] = 'https://www.google.com/maps/place/?q=place_id:%s' % pid
        # Office geocode from the listing itself, so page and GBP agree.
        lb['geo'] = {'@type': 'GeoCoordinates', 'latitude': olat_g, 'longitude': olng_g}
        # Real photography already rendered on the page — schema should reference the
        # same asset, absolute per Google's requirement.
        hero_key = 'hero-%s' % st if ('hero-%s' % st) in PHOTOS else 'hero'
        lb['image'] = ['https://cmgt.org' + PHOTOS[hero_key][0],
                       'https://cmgt.org' + PHOTOS['team'][0]]
        # Ties the five listings together as branches of one company instead of five
        # unrelated businesses that happen to share a name.
        # Deliberately no @id here. site.ts already emits a site-wide LocalBusiness on
        # every page (name "CMGT", url https://cmgt.org) and that node carries no @id,
        # so any @id written here would be a dangling reference that resolves to nothing
        # — worse than none. name+url is valid and Google reconciles on the url.
        lb['parentOrganization'] = {
            '@type': 'Organization',
            'name': 'CMGT',
            'url': 'https://cmgt.org',
        }
        lb['priceRange'] = '$$'
        # Reuse the page's own meta description rather than inventing a second one.
        desc = str(rec.get('META_DESCRIPTION', '')).strip()
        if desc:
            lb['description'] = desc
        lb['currenciesAccepted'] = 'USD'

    faqs = list(zip(
        re.findall(r'<button class="acc-q"[^>]*>(.*?)(?:<span|</button>)', inner, re.S),
        re.findall(r'<div class="acc-panel-in">(.*?)</div>', inner, re.S),
    ))
    def plain(h):
        return re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', h)).strip()
    faq_ld = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        'mainEntity': [
            {'@type': 'Question', 'name': plain(q),
             'acceptedAnswer': {'@type': 'Answer', 'text': plain(a)}}
            for q, a in faqs
        ],
    }
    if not faq_ld['mainEntity']:
        raise SystemExit('no FAQ pairs parsed for %s' % key)

    lds_list = [lds['LocalBusiness'], lds['BreadcrumbList'], faq_ld]

    def js(o):
        return json.dumps(o, indent=2, ensure_ascii=False).replace('</', '<\\/')

    astro = f"""---
// {rec['CITY']} HOA management — GBP-matched city page.
// Ported from the Alloy city-page handoff (template + city-pages-data.json) onto the
// live framework: BaseLayout supplies Nav, Footer, canonical and shared scripts.
//
// GBP: {rec['GBP_NAME']}
// NAP MUST match the live Google listing character-for-character — do not normalize
// the street line or abbreviate it. Rating/review count are still hardcoded from the
// handoff; wiring them to live GBP data is the open P0 (see the dev handoff).
import BaseLayout from '~/layouts/BaseLayout.astro';
import ImageSlot from '~/components/ImageSlot.astro';
import ServiceAreaMap from '~/components/ServiceAreaMap.astro';
import {{ LOCATION_REVIEWS }} from '~/data/reviews';

// Rating/count render from the committed per-location fallback so the page always
// shows a real number, then /api/reviews swaps in the live values client-side.
const rv = LOCATION_REVIEWS['{rec['SLUG']}'];

const localBusiness = {js(lds_list[0])};

const breadcrumb = {js(lds_list[1])};

// Composed from the visible FAQ below — the handoff template's {{FAQ_JSONLD}} token had
// no value in city-pages-data.json, so regenerating from it would emit a literal token.
const faq = {js(lds_list[2])};
---
<BaseLayout
  title="{rec['TITLE']}"
  description="{rec['META_DESCRIPTION']}"
  pageSchema={{[localBusiness, breadcrumb, faq]}}
>
{inner}
</BaseLayout>

<script is:inline>
  /* Live Google reviews for THIS location. /api/reviews is edge-cached for 24h and
     warmed by a daily cron, so this is a cheap cached read, not a Places call per
     view. Rating/count are swapped in place; review cards render only when the
     location actually returns review text. Fails silently — the committed
     fallback rating stays on screen. */
  (function () {{
    var citySlug = '{rec['SLUG']}';
    var stars = function (n) {{
      var full = Math.round(n), s = '';
      for (var i = 0; i < 5; i++) s += i < full ? '★' : '☆';
      return s;
    }};
    fetch('/api/reviews?city=' + citySlug)
      .then(function (r) {{ return r.json(); }})
      .then(function (d) {{
        if (!d || typeof d.rating !== 'number') return;
        // Rating rail
        document.querySelectorAll('[data-rv-rating]').forEach(function (el) {{
          el.textContent = d.rating.toFixed(1);
        }});
        document.querySelectorAll('[data-rv-count]').forEach(function (el) {{
          el.textContent = d.count;
        }});
        // Proof-band counter (data-count-to is animated by shared.js)
        var pc = document.querySelector('[data-rv-count-to]');
        if (pc) pc.setAttribute('data-count-to', d.count);
        // "Read them on our Google Business Profile" -> the real profile link
        if (d.reviewsUrl) {{
          document.querySelectorAll('[data-rv-link]').forEach(function (a) {{
            a.href = d.reviewsUrl;
          }});
        }}
        // Review cards
        var sec = document.querySelector('.revs[data-city="' + citySlug + '"]');
        var grid = document.getElementById('revs-grid-' + citySlug);
        if (!sec || !grid || !d.reviews || !d.reviews.length) return;
        grid.innerHTML = d.reviews.map(function (rv) {{
          var body = rv.text.length > 320 ? rv.text.slice(0, 317) + '…' : rv.text;
          var esc = function (s) {{
            return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
          }};
          return '<figure class="rev-card">' +
            '<div class="rev-stars" aria-label="' + rv.rating + ' out of 5">' + stars(rv.rating) + '</div>' +
            '<blockquote class="rev-text">' + esc(body) + '</blockquote>' +
            '<figcaption class="rev-meta"><span class="rev-who">' + esc(rv.author) + '</span>' +
            (rv.relative ? '<span class="rev-when">' + esc(rv.relative) + '</span>' : '') +
            '</figcaption></figure>';
        }}).join('');
        var all = document.getElementById('revs-all-' + citySlug);
        if (all && d.reviewsUrl) all.href = d.reviewsUrl;
        sec.hidden = false;
      }})
      .catch(function () {{ /* keep the committed fallback on screen */ }});
  }})();
</script>

<style>
{style}

/* ── Port additions ─────────────────────────────────────────────────────────
   The handoff's <image-slot> element is replaced by ImageSlot.astro, which
   renders <img class="image-slot">, so the template's `image-slot` selectors are
   rewritten to `.image-slot` (done in the port) and sizing carries over. */

/* Manager card: real headshot beside the name. */
.mgr-card {{ display: flex; align-items: center; gap: 18px; }}
/* Square box + circle radius, so the headshot is a true circle rather than the
   oval the flex row was stretching it into. */
.mgr-card :global(.mgr-headshot) {{
  width: 92px; height: 92px; flex: none;
  border-radius: 50%; object-fit: cover; object-position: 50% 22%;
}}

/* (Service-area + office maps are styled inside ServiceAreaMap.astro.) */

/* Live Google review cards (rendered by the script above). */
.revs {{ padding: 84px 0; background: #fff; }}
.revs-h {{ font-family: var(--font-display, inherit); font-weight: 900; font-size: clamp(26px, 3.2vw, 40px); line-height: 1.06; letter-spacing: -.02em; margin: 8px 0 28px; color: var(--freedom-blue, #1E1E77); text-wrap: balance; }}
.revs-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 18px; }}
.rev-card {{ margin: 0; background: #F4F6FB; border: 1px solid var(--rule, #E2E6F0); border-radius: 14px; padding: 20px 22px; display: flex; flex-direction: column; gap: 12px; }}
.rev-stars {{ color: #F0B400; font-size: 15px; letter-spacing: 2px; }}
.rev-text {{ margin: 0; font-size: 14.5px; line-height: 1.6; color: var(--ink, #171733); }}
.rev-meta {{ display: flex; flex-direction: column; gap: 2px; margin-top: auto; }}
.rev-who {{ font-family: var(--font-heading, inherit); font-weight: 700; font-size: 13px; color: var(--freedom-blue, #1E1E77); }}
.rev-when {{ font-size: 12px; color: var(--muted, #5B6079); }}
.revs-all {{ display: inline-flex; align-items: center; gap: 8px; margin-top: 24px; font-family: var(--font-heading, inherit); font-weight: 700; font-size: 14px; color: var(--freedom-blue, #1E1E77); text-decoration: none; }}
.revs-all:hover {{ text-decoration: underline; }}

/* Port fix: the handoff template was authored against its own standalone shared.css.
   On the dark hero the light-outline button ends up with the navy body colour here,
   which is invisible against var(--freedom-blue). Restore the intended treatment
   explicitly rather than relying on cascade order between global.css and this
   page's scoped styles. */
.city-hero .btn-outline-light,
.cta .btn-outline-light {{
  color: #fff;
  border-color: rgba(255, 255, 255, .7);
}}
.city-hero .btn-outline-light:hover,
.cta .btn-outline-light:hover {{ background: rgba(255, 255, 255, .12); }}

/* Port fix: the pre-footer CTA sits on the green band, and the template's
   `.cta {{ color: var(--freedom-blue) }}` was winning over global .btn-blue's own
   colour — navy text on the navy button. Global .btn-blue is navy bg + #fff text,
   so restore that rather than inventing a new treatment. */
.cta .btn-blue {{ color: #fff; }}
</style>
"""
    dest = ROOT / rec.get('STATE', 'louisiana') / ('%s.astro' % rec['SLUG'])
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(astro, encoding='utf-8')

    assert '{{' not in astro, 'unsubstituted token left in %s' % key
    results.append((rec["SLUG"], len(astro.splitlines()), rec["HAS_AWARD"], len(lds_list)))

for slug, lines, award, nld in results:
    print(f'  wrote {slug}.astro  ({lines} lines, award={award}, {nld} JSON-LD blocks)')
print('OK — no unsubstituted tokens')
