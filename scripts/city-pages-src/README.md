# City page generator — reference only, do not re-run

## The .astro files are the source of truth

The five city pages were **generated once** from the files in this directory:

    src/pages/hoa-management/louisiana/baton-rouge.astro
    src/pages/hoa-management/louisiana/shreveport.astro
    src/pages/hoa-management/louisiana/lafayette.astro
    src/pages/hoa-management/alabama/daphne.astro
    src/pages/hoa-management/mississippi/biloxi.astro

From that point on those `.astro` files are hand-maintained. **Re-running
`scripts/port-city-pages.py` would overwrite them and destroy any copy edits made
since the port.** It is kept for reference — to see how a page was assembled, or to
stamp out a sixth market — not as a build step. Nothing in `npm run build` calls it.

Edit the `.astro` files directly.

## What's here

| File | What it is |
|---|---|
| `city-page-template.html` | The Alloy handoff template, tokens like `{{CITY}}` in place |
| `city-pages-data.json` | Per-market token values (copy, FAQs, coverage lists, ratings) |

The generator itself is `scripts/port-city-pages.py` one level up.

## If you do add a sixth market

The generator needs four things updated, or it will fail or emit something wrong:

1. A new record in `city-pages-data.json` (copy it from the closest existing market —
   and then actually read every field, see the gotcha below).
2. `COORDS` — real lat/lng for every place the new market claims to serve.
3. `OFFICE_CITY` — the city the office physically sits in, which is often not the
   city in the URL slug (Baton Rouge's office is in Denham Springs; Lafayette's is
   in Carencro).
4. `PLACES` — the Google Place ID and office geocode, pulled from the Places API by
   GBP name rather than typed by hand. This is what `sameAs` uses to tie the page to
   its own listing.

**The gotcha, learned the hard way:** Daphne and Biloxi were seeded from the
Shreveport record and silently inherited its values. That shipped an Alabama page
reading "Daphne, **LA** 36526" with `addressRegion: "LA"`, a Mississippi page saying
"Your **North Louisiana** point of contact", and both showing Shreveport's 4.5/14
rating. A copied record is wrong until every field is checked, and state abbreviation,
contact role and rating are the ones that hide.

Resist fixing state leakage with a blanket `Louisiana → Alabama` replace. That was
tried; it turned the sentence "the manager works from this market — not from
Louisiana" into "not from Alabama", which says the opposite of what's intended.
