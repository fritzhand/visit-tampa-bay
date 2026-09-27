/* ============================================================
   tests/visit.test.mjs · OWNER: the Visit lane (getting-around.html, when-to-visit.html, faq.html, about.html)
   1. The parsers (build/pages/visit.mjs): climate strings, water temperatures, day of the year, operator stop numbers.
   2. The fixture build (tests/fixtures/mini): the contracts hold on tiny data (every t-<id>, every fq-<id>, #corrections,
      the independence line verbatim, unknowns printed as unknowns, twelve month cards, no "undefined"/"NaN").
   3. The real data (data/, skipped while data/ is still the fixture): every transport record once, in one section,
      its fare and hours verbatim or "… not listed"; every FAQ once with its topic chip and source; the climate table equal
      to the facts it is parsed from; each series in the month cards of its months; the dated-event counts per month;
      the About counts (sites cited, records citing them) recomputed here independently.
   Builds run in throwaway copies (tests/helpers.mjs); docs/ and data/ are never touched.
   ============================================================ */
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { REPO, fx, copyRepo, build, read, cleanup } from "./helpers.mjs";

const V = await import(path.join(REPO, "build", "pages", "visit.mjs"));
const A = await import(path.join(REPO, "build", "pages", "about.mjs"));
const { INDEPENDENCE, SOURCED } = await import(path.join(REPO, "build", "core", "shell.mjs"));
const { esc, slugify, hostOf } = await import(path.join(REPO, "site", "js", "lib", "text.js"));
const { paramValues } = await import(path.join(REPO, "build", "nav.mjs"));

const PAGES = ["getting-around.html", "when-to-visit.html", "faq.html", "about.html"];
/** the element with id="<id>" and everything up to the next element with an id of the same family */
const block = (html, id, next = /<article class="tx|<\/section>/) => { const i = html.indexOf(`id="${id}"`); if (i < 0) return ""; const rest = html.slice(i + 1); const m = rest.search(next); return html.slice(i, i + 1 + (m < 0 ? rest.length : m)); };
const count = (s, sub) => s.split(sub).length - 1;
const text = (html) => html.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<[^>]+>/g, " ");
const main = (html) => { const a = html.indexOf('<main'), b = html.indexOf('</main>'); return a > -1 && b > a ? html.slice(a, b) : html; };

/* ---------------------------------------------------------------- 1. parsers ---------------------------------------------------------------- */
test("parsers: climate normals, water temperature, day of year, operator stop numbers", () => {
  assert.deepEqual(V.parseNormals("Average high 81.0°F, average low 67.3°F, 1.93 in of rain"), { hi: 81, lo: 67.3, rain: 1.93, hiS: "81.0", loS: "67.3", rainS: "1.93" });
  assert.equal(V.parseNormals("Warm and sunny"), null, "a string that does not parse is not guessed at");
  assert.deepEqual(V.parseF("73°F (22.8°C)"), { f: 73, s: "73" });
  assert.equal(V.parseF("about seventy"), null);
  assert.equal(V.dayOfYear("June 1"), 151);
  assert.equal(V.dayOfYear("September 10"), 252);
  assert.equal(V.dayOfYear("November 30"), 333);
  assert.equal(V.dayOfYear("Sept. 10"), null);
  assert.equal(V.stopNo("Stop 7: Convention Center / Marriott Water Street"), 7);
  assert.equal(V.stopNo("Hattricks Station (#11), Franklin St & Whiting St"), 11);
  assert.equal(V.stopNo("Gateway Mall"), null);
  assert.equal(V.stopName("Stop 16: Armature Works / Ulele"), "Armature Works / Ulele");
  assert.equal(V.stopName("Hattricks Station (#11), Franklin St & Whiting St"), "Hattricks Station, Franklin St & Whiting St");
});

test("about: the source groups", () => {
  assert.equal(A.groupOf("en.wikipedia.org"), "wiki");
  assert.equal(A.groupOf("commons.wikimedia.org"), "wiki");
  assert.equal(A.groupOf("weather.gov"), "gov");
  assert.equal(A.groupOf("psta.net"), "gov");
  assert.equal(A.groupOf("visittampabay.com"), "tourism");
  assert.equal(A.groupOf("tampabay.com"), "news");
  assert.equal(A.groupOf("thedali.org"), "official");
  assert.deepEqual(A.GROUPS.map((g) => g.id), ["official", "gov", "tourism", "news", "wiki"]);
});

/* ---------------------------------------------------------------- 2. the fixture ---------------------------------------------------------------- */
describe("the fixture build", () => {
  let dir, docs, r;
  before(() => { dir = copyRepo(); r = build(dir); docs = path.join(dir, "docs"); });
  after(() => cleanup(dir));

  test("builds, and the four pages exist", () => {
    assert.equal(r.status, 0, `build failed:\n${r.stderr}${r.stdout}`);
    for (const p of PAGES) assert.ok(fs.existsSync(path.join(docs, p)), p);
  });

  test("getting-around: one t-<id> per transport record, unknowns printed as unknowns", () => {
    const html = read(docs, "getting-around.html");
    for (const t of fx("transport")) assert.equal(count(html, `id="t-${t.id}"`), 1, `t-${t.id}`);
    const ferry = block(html, "t-cross-bay-ferry");
    assert.match(ferry, /Fare not listed/, "no fare and not free → Fare not listed");
    assert.match(ferry, /Hours not listed/, "a ferry without hours → Hours not listed");
    assert.match(ferry, /Seasonal/, "a season_text is a word");
    assert.match(ferry, /Fixture: seasonal/, "the season as the source states it");
    const car = block(html, "t-teco-line-streetcar");
    assert.match(car, /badge-free">Free</, "free is a word");
    assert.match(car, /Checked Sep 27, 2026/, "the source line with its checked date");
  });

  test("faq: one fq-<id> per question, topic chips valid as ?topic= values, the filter wiring", () => {
    const html = read(docs, "faq.html");
    const faqs = fx("faqs");
    for (const f of faqs) assert.equal(count(html, `id="fq-${f.id}"`), 1, `fq-${f.id}`);
    for (const t of new Set(faqs.map((f) => f.topic))) assert.ok(html.includes(`data-filter-chip="topic=${slugify(t)}"`), `chip ${t}`);
    assert.match(html, /data-filter-list/);
    assert.match(html, /data-filter-q/);
    assert.match(html, /data-filter-empty/);
    assert.match(html, new RegExp(`Showing <b>${faqs.length}</b> of ${faqs.length}`));
    assert.match(html, /data-features="faq"/);
  });

  test("about: #corrections, the independence line verbatim, the build date", () => {
    const html = read(docs, "about.html");
    assert.match(html, /<section class="section" id="corrections"/);
    assert.ok(main(html).includes(esc(INDEPENDENCE)), "INDEPENDENCE verbatim in the page body");
    assert.ok(main(html).includes(esc(SOURCED)), "SOURCED verbatim in the page body");
    assert.match(html, /github\.com\/fritzhand\/visit-tampa-bay\/issues/);
    assert.match(html, /Last built \w+day, \w+ \d+, \d{4}/);
    assert.match(html, /openstreetmap\.org\/copyright/);
    assert.match(html, /assets\/fonts\/OFL-BodoniModa\.txt/);
  });

  test("when-to-visit: twelve month cards; nothing guessed when the climate facts are missing", () => {
    const html = read(docs, "when-to-visit.html");
    for (const m of ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]) assert.equal(count(html, `id="m-${m}"`), 1, `m-${m}`);
    assert.ok(!html.includes('class="wv-clim"'), "no chart without climate facts");
    assert.match(html, /Not listed/, "missing normals print as Not listed");
  });

  test("no undefined, NaN, null or [object Object] leaks into the pages", () => {
    for (const p of PAGES) {
      const t = text(main(read(docs, p)));
      assert.doesNotMatch(t, /\bundefined\b|\bNaN\b|\[object Object\]|\bnull\b|-Infinity|\bInfinity\b/, p);
    }
  });
});

/* ---------------------------------------------------------------- 3. the real data ---------------------------------------------------------------- */
const DATA = path.join(REPO, "data");
const load = (f) => JSON.parse(fs.readFileSync(path.join(DATA, `${f}.json`), "utf8"));
const isFixture = (() => { try { return load("transport").every((t) => /FIXTURE/.test(t.notes || "")); } catch { return true; } })();

describe("the real data", { skip: isFixture && "data/ is still the fixture" }, () => {
  let dir, docs, r;
  const transport = isFixture ? [] : load("transport"), faqs = isFixture ? [] : load("faqs"), facts = isFixture ? [] : load("facts"), series = isFixture ? [] : load("series");
  before(() => { dir = copyRepo({ data: DATA }); r = build(dir); docs = path.join(dir, "docs"); });
  after(() => cleanup(dir));

  test("builds", () => assert.equal(r.status, 0, `build failed:\n${r.stderr.slice(-4000)}${r.stdout.slice(-2000)}`));

  test("getting-around: every record once, in exactly one section, fares and hours verbatim or not listed", () => {
    const html = read(docs, "getting-around.html");
    const sections = [...html.matchAll(/<section class="section ga-sec" id="([a-z-]+)"[\s\S]*?<\/section>/g)].map((m) => [m[1], m[0]]);
    assert.ok(sections.length >= 5, "the sections are there");
    for (const t of transport) {
      assert.equal(count(html, `id="t-${t.id}"`), 1, `t-${t.id} once`);
      assert.equal(sections.filter(([, s]) => s.includes(`id="t-${t.id}"`)).length, 1, `t-${t.id} in exactly one section`);
      const card = block(html, `t-${t.id}`);
      if (t.fare_text) assert.ok(card.includes(esc(t.fare_text)), `${t.id}: fare_text verbatim`);
      else if (t.is_free !== true) assert.match(card, /not listed/, `${t.id}: no fare → "… not listed"`);
      if (t.hours_text) assert.ok(card.includes(esc(t.hours_text)), `${t.id}: hours_text verbatim`);
      if (t.season_text) assert.ok(card.includes(esc(t.season_text)), `${t.id}: season_text verbatim`);
      if (t.code) assert.ok(card.includes(`<span class="tx-code-v">${esc(t.code)}</span>`), `${t.id}: its code`);
      assert.ok(card.includes(`href="${esc(t.source_url)}"`), `${t.id}: its source is linked`);
      for (const s of t.stops || []) assert.ok(card.includes(esc(V.stopName(s.name))), `${t.id}: stop ${s.name}`);
    }
    const arriving = sections.find(([id]) => id === "arriving")?.[1] || "";
    for (const t of transport.filter((x) => x.mode === "airport")) assert.ok(arriving.includes(`id="t-${t.id}"`), `${t.id} is under Arriving`);
    const free = transport.filter((t) => t.is_free === true && t.mode !== "toll" && t.mode !== "parking");
    if (free.length) assert.match(html, new RegExp(`${free.length} rides? in the guide (is|are) free`), "the free rides are counted");
  });

  test("getting-around: a numbered line only where the operator numbers every stop, pins share the numbers", () => {
    const html = read(docs, "getting-around.html");
    for (const t of transport.filter((x) => (x.stops || []).length >= 2)) {
      const card = block(html, `t-${t.id}`);
      const numbered = t.stops.every((s) => V.stopNo(s.name) != null);
      assert.equal(card.includes('class="tx-line"'), numbered, `${t.id}: a line iff every stop carries the operator's number`);
      if (numbered) {
        const nums = [...card.matchAll(/<span class="tx-n" aria-hidden="true">(\d+)<\/span>/g)].map((m) => Number(m[1]));
        assert.deepEqual(nums, [...nums].sort((a, b) => a - b), `${t.id}: stations in the operator's order`);
        const pins = [...card.matchAll(/class="pin pin-place"[^>]*><span>(\d+)<\/span>/g)].map((m) => Number(m[1]));
        for (const p of pins) assert.ok(nums.includes(p), `${t.id}: pin ${p} is a listed stop`);
      }
    }
  });

  test("faq: every question once, every topic a chip and a section, every answer with its source", () => {
    const html = read(docs, "faq.html");
    const topics = [...new Set(faqs.map((f) => f.topic))];
    const valid = paramValues({ faqs, events: [], months: [], days: [], series: [], experiences: [], places: [] }).faq.topic;
    for (const t of topics) {
      assert.ok(valid(slugify(t)), `${t}: a valid ?topic= value`);
      assert.ok(html.includes(`data-filter-chip="topic=${slugify(t)}"`), `${t}: chip`);
      assert.ok(html.includes(`id="topic-${slugify(t)}"`), `${t}: section`);
    }
    for (const f of faqs) {
      assert.equal(count(html, `id="fq-${f.id}"`), 1, `fq-${f.id}`);
      const d = html.slice(html.indexOf(`id="fq-${f.id}"`), html.indexOf("</details>", html.indexOf(`id="fq-${f.id}"`)));
      assert.ok(d.includes(`data-topic="${slugify(f.topic)}"`), `${f.id}: its topic`);
      assert.ok(d.includes(`href="${esc(f.source_url)}"`), `${f.id}: its source`);
      assert.match(d, /Checked \w{3} \d+, \d{4}/, `${f.id}: checked date`);
    }
    assert.match(html, new RegExp(`Showing <b>${faqs.length}</b> of ${faqs.length} questions`));
  });

  test("when-to-visit: the climate table equals the facts it is parsed from", () => {
    const html = read(docs, "when-to-visit.html");
    const table = html.slice(html.indexOf('class="data wv-table"'), html.indexOf("</table>", html.indexOf('class="data wv-table"')));
    const rows = [...table.matchAll(/<tr><th scope="row">(\w+)<\/th>([\s\S]*?)<\/tr>/g)];
    assert.equal(rows.length, 12, "twelve months");
    const MON = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    rows.forEach(([, , cells], i) => {
      for (const city of ["tampa", "stpete"]) {
        const f = facts.find((x) => x.id === `climate-${city}-${MON[i]}`);
        if (!f) continue;
        const n = V.parseNormals(f.value);
        assert.ok(n, `${f.id} parses`);
        for (const v of [`${n.hiS}°F`, `${n.loS}°F`, `${n.rainS} in`]) assert.ok(cells.includes(v), `${MON[i]} ${city}: ${v}`);
      }
      const g = facts.find((x) => x.id === `gulf-water-temp-${MON[i]}`);
      if (g) assert.ok(cells.includes(esc(g.value)), `${MON[i]} Gulf: ${g.value}`);
    });
    const season = facts.find((f) => f.id === "hurricane-season");
    if (season) assert.ok(html.includes(esc(season.value)), "the season as NOAA states it");
  });

  test("when-to-visit: every annual event in the cards of its months, with the count", () => {
    const html = read(docs, "when-to-visit.html");
    const MON = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    MON.forEach((m, i) => {
      const card = html.slice(html.indexOf(`id="m-${m}"`), html.indexOf("</article>", html.indexOf(`id="m-${m}"`)));
      const inMonth = series.filter((s) => (s.months || []).includes(i + 1));
      for (const s of inMonth) assert.ok(card.includes(`whats-on.html#s-${s.id}"`), `${m}: ${s.id}`);
      assert.equal(count(card, "whats-on.html#s-"), inMonth.length, `${m}: nothing else`);
      if (inMonth.length) assert.ok(card.includes(`Every year · ${inMonth.length}`), `${m}: the count`);
    });
  });

  test("about: the sites cited and the records citing them, recomputed here", () => {
    const html = read(docs, "about.html");
    const hosts = new Set();
    let citing = 0;
    for (const f of ["places", "stays", "experiences", "events", "series", "timeline", "transport", "faqs", "facts", "media", "areas", "regions", "routes"]) {
      let recs = [];
      try { recs = load(f); } catch { continue; }
      for (const r0 of recs) {
        const u = [r0.source_url, r0.quote_source, ...(r0.also_sources || []), f === "media" ? r0.page_url : null,
          ...((r0.heritage && r0.heritage.sources) || []), ...((r0.heritage && r0.heritage.designations) || []).map((d) => d.url)].filter((x) => typeof x === "string" && x.startsWith("https://"));
        if (u.length) citing++;
        for (const x of u) hosts.add(hostOf(x));
      }
    }
    assert.ok(html.includes(`${hosts.size} sites are cited`), `${hosts.size} sites`);
    assert.ok(html.includes(`<b>${citing} records</b> cite at least one source page`), `${citing} records`);
    for (const k of hosts) assert.ok(html.includes(`>${esc(k)}<`), `host listed: ${k}`);
    assert.ok(main(html).includes(esc(INDEPENDENCE)));
    assert.match(html, /id="corrections"/);
  });

  test("no undefined, NaN, null or [object Object] leaks into the pages; nothing says TBA", () => {
    for (const p of PAGES) {
      const t = text(main(read(docs, p)));
      assert.doesNotMatch(t, /\bundefined\b|\bNaN\b|\[object Object\]|\bnull\b|-Infinity/, p);
      // (about.html names the placeholders the build rejects, in quotation marks: “TBA”)
      assert.doesNotMatch(t.replace(/“(TBA|TBD)”/g, ""), /\bTBA\b|\bTBD\b|\bN\/A\b/, `${p}: no placeholders`);
    }
  });
});
