/* ============================================================
   build/core/search.mjs · OWNER: E1 (build engine; ported from Cincy Week)
   Builds docs/assets/data/search.json: every page module's search(ctx)
   entries first, then the core's default entry for every record (so the
   index always covers the whole guide; a module's entry with the same
   kind + id wins, which is how a page lane enriches its entries), then one
   "pg" entry per nav page. Entries are validated and de-duplicated by
   kind + id.
   Entry: { k, id, t, s?, u, r?, g?, i?, st?, en? }. u is root-relative and is
   checked by the crawler like any link, anchors included, so the pages must
   carry the ids the default entries point at (build/CONTRACTS.md §9):
     pl places/<id>.html · st stays/<id>.html · ar areas/<id>.html · rg <region page>.html
     ex experiences.html?x=<id> · ev whats-on.html?e=<id> · se whats-on.html#s-<id>
     fq faq.html#fq-<id> · tr getting-around.html#t-<id> · tl history.html#tl-<id> · pg passages.html#r-<route id>
   ============================================================ */
import { KINDS } from "../../site/js/lib/search.js";
import { PLACE_KIND_LABEL, STAY_KIND_LABEL, EXPERIENCE_KIND_LABEL, EVENT_KIND_LABEL, MODE_LABEL, ERA_NAME, TOPIC_LABEL, FEATURE_LABEL, REGIONS } from "./vocab.mjs";
import { REGION_PAGES } from "../nav.mjs";
import { fmtDateRange, fmtDate, fmtTime, fmtThrough } from "./time.mjs";

const KEYS = new Set(["k", "id", "t", "s", "u", "r", "g", "i", "st", "en"]);
const words = (...xs) => [...new Set(xs.flat().filter(Boolean).map(String))].join(" ");

/** The default entry for every record (build/CONTRACTS.md §9). */
export function coreEntries(ctx) {
  const { db, img } = ctx;
  const areaName = (a) => db.byId.area.get(a)?.name || "";
  const out = [];
  for (const p of db.places) out.push({ k: "pl", id: p.id, t: p.name, s: [PLACE_KIND_LABEL[p.kind], areaName(p.area)].filter(Boolean).join(" · "), u: `places/${p.id}.html`, r: p.region, g: words(p.aliases, (p.kinds || []).map((k) => PLACE_KIND_LABEL[k]), (p.topics || []).map((t) => TOPIC_LABEL[t]), p.tags, p.city), i: img.path("p", p.id) });
  for (const s of db.stays) out.push({ k: "st", id: s.id, t: s.name, s: [STAY_KIND_LABEL[s.kind], areaName(s.area)].filter(Boolean).join(" · "), u: `stays/${s.id}.html`, r: s.region, g: words(s.aliases, s.brand, s.collection, (s.features || []).map((f) => FEATURE_LABEL[f]), s.city), i: img.path("s", s.id) });
  for (const x of db.experiences) out.push({ k: "ex", id: x.id, t: x.name, s: [EXPERIENCE_KIND_LABEL[x.kind], x.operator].filter(Boolean).join(" · "), u: `experiences.html?x=${x.id}`, r: x.region, g: words(x.operator, areaName(x.area), x.departs?.name, x.departs_text, (x.topics || []).map((t) => TOPIC_LABEL[t])), i: img.path("x", x.id) });
  for (const e of db.events) {
    const i0 = e.instances[0];
    const when = e.run ? `${fmtDate(i0.date)} · ${fmtThrough(e.end_date, i0.date)}` : e.end_date && e.end_date !== e.date ? fmtDateRange(e.date, e.end_date) : `${fmtDate(e.date)}${e.start ? ` · ${fmtTime(e.start)}` : ""}`;
    const timed = i0 && !e.run && !i0.timeUnknown && !i0.allDay;
    const last = e.instances[e.instances.length - 1];
    out.push({ k: "ev", id: e.id, t: e.title, s: [when, e.venue?.name || e.location_text].filter(Boolean).join(" · "), u: `whats-on.html?e=${e.id}`, r: e.region, g: words(EVENT_KIND_LABEL[e.kind], e.seriesRec?.name, areaName(e.area), e.tags, e.status !== "scheduled" ? e.status : ""), st: timed ? i0.s : null, en: timed ? last.e : null });
  }
  for (const s of db.series) out.push({ k: "se", id: s.id, t: s.name, s: s.when_text, u: `whats-on.html#s-${s.id}`, r: s.region, g: words(EVENT_KIND_LABEL[s.kind], s.venue?.name, s.location_text, "annual") });
  for (const a of db.areas) out.push({ k: "ar", id: a.id, t: a.name, s: `${REGIONS[a.region].name} · Sheet ${REGIONS[a.region].n}`, u: `areas/${a.id}.html`, r: a.region, g: words(a.known_for), i: img.path("a", a.id) });
  for (const r of db.regions) out.push({ k: "rg", id: r.id, t: r.name, s: `Sheet ${r.n} · ${r.code}`, u: `${REGION_PAGES.find((p) => p.region === r.id).slug}.html`, r: r.id, g: words(r.known_for, r.areas.map((a) => a.name)) });
  for (const f of db.faqs) out.push({ k: "fq", id: f.id, t: f.q, s: f.topic, u: `faq.html#fq-${f.id}` });
  for (const t of db.transport) out.push({ k: "tr", id: t.id, t: t.name, s: [MODE_LABEL[t.mode], t.operator].filter(Boolean).join(" · "), u: `getting-around.html#t-${t.id}`, g: words(t.code, (t.stops || []).map((s) => s.name)) });
  for (const t of db.timeline) out.push({ k: "tl", id: t.id, t: t.title, s: `${t.date || t.year} · ${ERA_NAME[t.era]}`, u: `history.html#tl-${t.id}`, r: t.region, g: words(t.links.map((l) => l.rec.name)), i: img.path("t", t.id) });
  for (const rt of db.routes) out.push({ k: "pg", id: `route-${rt.id}`, t: rt.title, s: `Passage · ${REGIONS[rt.region].name}`, u: `passages.html#r-${rt.id}`, r: rt.region });
  return out;
}

export function buildIndex(entriesByModule, pages, fail) {
  const items = [];
  const seen = new Set();
  for (const [mod, entries] of entriesByModule) {
    if (!Array.isArray(entries)) { fail(`build/pages/${mod}.mjs`, "search() must return an array"); continue; }
    for (const e of entries) {
      const where = mod === "core" ? "build/core/search.mjs coreEntries()" : `build/pages/${mod}.mjs search()`;
      if (!e || typeof e !== "object") { fail(where, "entry is not an object"); continue; }
      for (const k of Object.keys(e)) if (!KEYS.has(k)) fail(where, `entry ${e.id || "?"}: unknown key "${k}"`);
      if (!KINDS[e.k]) fail(where, `entry ${e.id || "?"}: unknown kind "${e.k}"`);
      if (!e.t || typeof e.t !== "string") fail(where, `entry ${e.id || "?"}: needs a title "t"`);
      if (!e.u || typeof e.u !== "string" || /^(\/|https?:)/.test(e.u)) fail(where, `entry ${e.id || "?"}: "u" must be a root-relative URL`);
      const key = `${e.k}:${e.id || e.u}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const clean = {};
      for (const k of KEYS) if (e[k] !== undefined && e[k] !== null && e[k] !== "") clean[k] = e[k];
      items.push(clean);
    }
  }
  const covered = new Set(items.map((e) => e.u));
  for (const p of pages) {
    if (!p.navLabel || covered.has(p.path)) continue;
    items.push({ k: "pg", id: p.slug, t: p.navLabel, s: p.description, u: p.path });
  }
  return { v: 1, items };
}
