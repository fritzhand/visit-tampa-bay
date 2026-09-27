/* ============================================================
   build/core/client-data.mjs · OWNER: E1 (build engine)
   The JSON the client runtime (E2) fetches lazily with app.data(name) — never
   inlined in pages. Compact keys keep them small. Additive changes only (new
   keys); never rename a key the client reads. Every file has v: 1.

   events.json = { v, tz, window: { start, end },
     regions: { id: { n: name, s: short, c: chart code, no: sheet number } },
     areas:   { id: { n: name, r: region } },
     places:  { id: { n: name, a: area|null, ll: [lat, lng]|null } }        only places some event is at
     series:  { id: { n: name, w: when_text } },
     events:  [{ id, x: share code, t: title, k: kind, kg: kind group, r: region|null, a: area|null,
                 pl: place id|null, lt: location_text|null, ll: [lat, lng]|null (own, else the place's),
                 se: series id|null, c: cost|null, f: is_free (1|0|null), u: url|null, tk: tickets_url|null,
                 src: source_url, st: status (scheduled|tentative|changed|postponed|cancelled), fe: featured (1|0),
                 tg: [tags], tp: [topics], tt: time_text|null, sm: summary|null, ck: checked,
                 ed: end_date|null (the full run's last day, even past the window),
                 i: [[day, s, e, flags]] }] }
       flags: 1 endUnknown · 2 timeUnknown · 4 allDay · 8 ongoing (a multi-day item) · 16 lateNight (00:00–04:59 start,
              listed under the day before) · 32 run (a run longer than 14 days: ONE instance from its first day in the
              window to its last, s..e span the run; say "Through <ed>" and never "Now")
       i lists every instance inside dataWindow, sorted by s; day = the listing day.
   event-text.json = { v, d: { eventId: description } }   verbatim descriptions, loaded on first dialog open or .ics
   experiences.json = { v, experiences: [{ id, x, n: name, op: operator, k: kind, kg: group, r, a, tp: [topics],
                 dp: departs_place|null, dt: departs_text|null, ad: address|null, ll, u: url|null, bu: booking_url|null,
                 ph: phone|null, du: duration_text|null, pr: price_text|null, f: is_free (1|0|null),
                 sc: schedule_text|null, ss: season_text|null, ag: ages_text|null, sm: summary|null, q: quote|null,
                 qs: quote_source|null, st: status (open|seasonal|temporarily-closed|opening-soon|closed),
                 sn: status_note|null, src, as: [also_sources], ck: checked, i: image path|null }],
                 places: { id: { n, u: "places/<id>.html" } } }   departure places
   places-lite.json = { v, regions: {…as above}, areas: {…as above},
                 places: [{ id, x, n, k: kind, ks: [secondary kinds], g: [groups], tp: [topics], r, a, ll,
                            st: status, sg: signature (1|0), h: heritage era|null (or "" for a heritage block with
                            no era), f: is_free (1|0|null), u: "places/<id>.html", i: image path|null }] }
   stays-lite.json = { v, stays: [{ id, x, n, k: kind, b: brand|null, co: collection|null, r, a, ll, ft: [features],
                            st: status, h: 1 when it has a heritage block, u: "stays/<id>.html", i: image path|null }] }
   A trip (trip.html) is decoded with site/js/lib/share.js decode(hash, codeToId): build codeToId from the `x`
   codes of events.json (e), experiences.json (x), places-lite.json (p) and stays-lite.json (s).
   ============================================================ */
import { REGIONS } from "./vocab.mjs";

const nz = (v) => (v === undefined || v === "" ? null : v);
const tri = (b) => (b === true ? 1 : b === false ? 0 : null);

export function clientData(db, images) {
  const regions = Object.fromEntries(db.regions.map((r) => [r.id, { n: r.name, s: REGIONS[r.id].short, c: r.code, no: r.n }]));
  const areas = Object.fromEntries(db.areas.map((a) => [a.id, { n: a.name, r: a.region }]));
  const flags = (x) => (x.endUnknown ? 1 : 0) | (x.timeUnknown ? 2 : 0) | (x.allDay ? 4 : 0) | (x.ongoing ? 8 : 0) | (x.lateNight ? 16 : 0) | (x.run ? 32 : 0);
  const evPlaces = [...new Set(db.events.map((e) => e.place).filter(Boolean))];
  const events = db.events.map((e) => ({
    id: e.id, x: db.code(e.id), t: e.title, k: e.kind, kg: e.kg, r: nz(e.region), a: nz(e.area), pl: nz(e.place), lt: nz(e.location_text),
    ll: e.ll, se: nz(e.series), c: nz(e.cost), f: tri(e.is_free), u: nz(e.url), tk: nz(e.tickets_url), src: e.source_url,
    st: e.status || "scheduled", fe: e.featured ? 1 : 0, tg: e.tags || [], tp: e.topics || [], tt: nz(e.time_text), sm: nz(e.summary),
    ck: e.checked, ed: nz(e.end_date), i: e.instances.map((x) => [x.day, x.s, x.e, flags(x)]),
  }));
  const experiences = db.experiences.map((x) => ({
    id: x.id, x: db.code(x.id), n: x.name, op: x.operator, k: x.kind, kg: x.kg, r: nz(x.region), a: nz(x.area), tp: x.topics || [],
    dp: nz(x.departs_place), dt: nz(x.departs_text), ad: nz(x.address), ll: x.ll, u: nz(x.url), bu: nz(x.booking_url), ph: nz(x.phone),
    du: nz(x.duration_text), pr: nz(x.price_text), f: tri(x.is_free), sc: nz(x.schedule_text), ss: nz(x.season_text), ag: nz(x.ages_text),
    sm: nz(x.summary), q: nz(x.quote), qs: nz(x.quote_source), st: x.status, sn: nz(x.status_note), src: x.source_url, as: x.also_sources || [],
    ck: x.checked, i: images.path("x", x.id),
  }));
  const places = db.places.map((p) => ({
    id: p.id, x: db.code(p.id), n: p.name, k: p.kind, ks: p.kinds || [], g: p.groups, tp: p.topics || [], r: nz(p.region), a: nz(p.area), ll: p.ll,
    st: p.status, sg: p.signature ? 1 : 0, h: p.heritage ? p.heritage.era || "" : null, f: tri(p.is_free), u: `places/${p.id}.html`, i: images.path("p", p.id),
  }));
  const stays = db.stays.map((s) => ({
    id: s.id, x: db.code(s.id), n: s.name, k: s.kind, b: nz(s.brand), co: nz(s.collection), r: nz(s.region), a: nz(s.area), ll: s.ll,
    ft: s.features || [], st: s.status, h: s.heritage ? 1 : 0, u: `stays/${s.id}.html`, i: images.path("s", s.id),
  }));
  return {
    "assets/data/events.json": {
      v: 1, tz: db.config.timezone, window: db.window, regions, areas,
      places: Object.fromEntries(evPlaces.map((id) => { const p = db.byId.place.get(id); return [id, { n: p.name, a: nz(p.area), ll: p.ll }]; })),
      series: Object.fromEntries(db.series.map((s) => [s.id, { n: s.name, w: s.when_text }])),
      events,
    },
    "assets/data/event-text.json": { v: 1, d: Object.fromEntries(db.events.filter((e) => e.description).map((e) => [e.id, e.description])) },
    "assets/data/experiences.json": {
      v: 1, experiences,
      places: Object.fromEntries([...new Set(db.experiences.map((x) => x.departs_place).filter(Boolean))].map((id) => [id, { n: db.byId.place.get(id).name, u: `places/${id}.html` }])),
    },
    "assets/data/places-lite.json": { v: 1, regions, areas, places },
    "assets/data/stays-lite.json": { v: 1, stays },
  };
}
