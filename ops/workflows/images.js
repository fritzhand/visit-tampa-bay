export const meta = {
  name: 'tampa-images',
  description: 'Find rights-cleared Commons images for places, areas and stays, then download and process them',
  phases: [
    { title: 'Find', detail: 'Wikidata/Commons matches with verified licenses -> research/media-commons' },
    { title: 'Process', detail: 'download, resize to WebP, write data/images.json' },
  ],
}
const REPO = '/home/user/visit-tampa-bay'
const BASE = `You are working on **Tampa Bay Chartbook**, an independent, source-linked visitor's guide to Tampa Bay (repo ${REPO}). Read
${REPO}/CLAUDE.md (rules 1 and 8, the Images section), ${REPO}/SPEC.md §2, ${REPO}/research/SCHEMA.md (media), ${REPO}/data/README.md,
${REPO}/build/CONTRACTS.md (images.json / ctx.img). Seven page-lane agents are building pages in parallel and research verifiers are still
editing research/<other slices>: never write their files, never run a plain node build.mjs (use TBC_OUT=.cache/out-images), never run git.
Wikimedia rate-limits hard (HTTP 429 seen today): send a descriptive User-Agent ("tampa-bay-chartbook/1.0 (https://github.com/fritzhand/visit-tampa-bay)"),
at most 1 request per second per host, honor Retry-After, back off exponentially, cache every response on disk under .cache/commons/.`

const find = `${BASE}

## Task: FIND rights-cleared images (you own research/media-commons/ and research/tools/find-images.mjs)
Goal: an image for as many records as possible, in this priority: the 6 regions, the 45 areas, places with signature:true, places with
heritage, museums/attractions/theme parks/zoos/aquariums/landmarks/piers/districts, beaches/parks/state parks/gardens/springs, arenas and
theaters, historic stays (heritage), then other places. Skip restaurants/bars and ordinary chain hotels unless a Commons photo of that exact
building exists. data/media.json already holds 194 images from the history slices: do not duplicate a subject that already has one.
Method (write it as a re-runnable zero-dependency Node script research/tools/find-images.mjs with a cache):
1. Match each record to a Wikidata item: SPARQL (https://query.wikidata.org/sparql, works) for items with P18 (image) and P625 (coordinates)
   within ~1.5 km of the record's point, then pick the item whose label/alias matches the record's name (normalized); or, for areas/regions,
   the item for that neighborhood/city/beach. Accept only when name AND location agree; log rejections.
2. For the P18 file, read Commons extmetadata (https://commons.wikimedia.org/w/api.php?action=query&prop=imageinfo&iiprop=url|extmetadata|size&titles=File:...):
   LicenseShortName / License / LicenseUrl / Artist / Credit / ImageDescription / DateTimeOriginal. Accept ONLY public domain, CC0, CC BY
   (any version), CC BY-SA (any version) and US-government works; reject NC, ND, GFDL-only, fair use, "no license", unknown. Strip HTML from
   Artist to a plain creator name.
3. Write research/media-commons/media-commons.json in the slice format (slice "media-commons", checked "2026-09-27", records.media, report):
   each media record per SCHEMA (id "m-<subject>", title, creator, year, license, license_url, credit "Creator / Wikimedia Commons (CC BY-SA 4.0)",
   file_url (upload.wikimedia.org original), page_url (the Commons File: page), subject_kind (place|stay|area|region), subject (the data id),
   alt (plain, what the image shows, from the file's description/title; never invented detail), width, height). Validate with
   node research/tools/check-slice.mjs media-commons.
4. Add "media-commons" to the SLICES list in scripts/merge-research.mjs (it must merge media records from this slice like the others; keep
   everything else unchanged), run node scripts/merge-research.mjs --offline, and check the merge still validates.
Report counts by subject kind and license, rejections by reason, and records still without an image (by kind).`

const proc = (f) => `${BASE}

## Task: PROCESS the images (you own scripts/fetch-images.py, site/img/{p,s,a,t,x}/ (and r/ for regions if the engine supports it), data/images.json)
The finder reported: ${String(f).slice(0, 3000)}
Pillow is installed (python3 -c "import PIL"). Write scripts/fetch-images.py (incremental; flags --force, --offline, --only kind/id, --retry-failed),
modeled on /home/user/cincy-week/scripts/fetch-images.py: for each record in data/media.json that the build can use (read build/core/images.mjs
for the kinds and the manifest shape it expects: "<kind>/<id>": { file, w, h, credit, license, license_url?, page_url?, creator?, alt?, sm?, lg? }),
download from Commons (prefer a 1600px thumbnail URL over huge originals: https://upload.wikimedia.org/wikipedia/commons/thumb/<a>/<ab>/<File>/1600px-<File>),
cache originals in .cache/img-src/ (gitignored), and write WebP renditions: a large (1200 px wide max, quality ~72) and a small (480 px wide,
quality ~70), EXIF-orientation corrected, stripped of metadata. One primary image per subject (the first media record for it); if the engine
supports several per subject (timeline entries, galleries), follow its contract. If images.mjs needs a region kind or anything else to show
region/area images, make the smallest additive change there and note it in build/CONTRACTS.md's Changelog. Budget: keep site/img under ~60 MB.
Then: TBC_OUT=.cache/out-images node build.mjs must pass (it fails on a manifest entry whose file is missing or lacks credit/license);
screenshot a few pages that show images (a place with heritage, an area, the home page) with scripts/shots.mjs and LOOK at them (credit lines
visible, no distortion). Report counts, total size, failures.`

phase('Find')
const f = await agent(find, { label: 'find-images', phase: 'Find' })
phase('Process')
const p = await agent(proc(f), { label: 'process-images', phase: 'Process' })
return { find: f, process: p }
