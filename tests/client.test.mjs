/* tests/client.test.mjs · OWNER: E2 (client runtime) · the client's static contract, without a browser:
   - every file under site/js parses as an ES module (node --check);
   - every static import names a file that exists and a name that file exports; every dynamic import exists;
   - core modules never import features, and pure libs (site/js/lib) never touch the DOM;
   - every attribute hook the build emits (build/CONTRACTS.md §8) is wired by some client module, and the
     fixture build really emits the shell's hooks;
   - storage keys are tbc-*: the documented set (core/store.js), the same the boot script reads.
   The browser behavior itself is checked with scripts/shots.mjs --states (Playwright, not a dependency). */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { REPO, copyRepo, build, read, cleanup } from "./helpers.mjs";

const JS = path.join(REPO, "site", "js");
const files = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? files(path.join(dir, d.name)) : d.name.endsWith(".js") ? [path.join(dir, d.name)] : []));
const ALL = files(JS);
const rel = (f) => path.relative(REPO, f);
const src = (f) => fs.readFileSync(f, "utf8");
const allSource = ALL.map(src).join("\n");

/** Names a module exports: export function|const|let|class|async function x, export { a, b as c }. */
function exportsOf(code) {
  const out = new Set();
  for (const m of code.matchAll(/export\s+(?:async\s+)?(?:function\*?|const|let|var|class)\s+([A-Za-z_$][\w$]*)/g)) out.add(m[1]);
  for (const m of code.matchAll(/export\s*\{([^}]*)\}/g)) for (const part of m[1].split(",")) { const p = part.trim(); if (p) out.add(p.split(/\s+as\s+/).pop().trim()); }
  return out;
}

test("every client file parses as an ES module", () => {
  assert.ok(ALL.length >= 20, `found only ${ALL.length} files under site/js`);
  for (const f of ALL) {
    const r = spawnSync(process.execPath, ["--check", f], { encoding: "utf8" });
    assert.equal(r.status, 0, `${rel(f)}: ${r.stderr}`);
  }
});

test("every import resolves to a file that exports what is imported", () => {
  const problems = [];
  for (const f of ALL) {
    const code = src(f);
    for (const m of code.matchAll(/import\s+(?:(\*\s+as\s+\w+)|\{([^}]*)\}|(\w+))?\s*(?:,\s*\{([^}]*)\})?\s*from\s*["']([^"']+)["']/g)) {
      const target = path.resolve(path.dirname(f), m[5]);
      if (!m[5].startsWith(".")) { problems.push(`${rel(f)}: bare import "${m[5]}" (zero dependencies)`); continue; }
      if (!fs.existsSync(target)) { problems.push(`${rel(f)}: imports a missing file ${m[5]}`); continue; }
      const names = [m[2], m[4]].filter(Boolean).flatMap((x) => x.split(",")).map((x) => x.trim().split(/\s+as\s+/)[0].trim()).filter(Boolean);
      const ex = exportsOf(src(target));
      for (const n of names) if (!ex.has(n)) problems.push(`${rel(f)}: ${m[5]} does not export ${n}`);
    }
    for (const m of code.matchAll(/import\(\s*["']([^"']+)["']\s*\)/g)) if (!fs.existsSync(path.resolve(path.dirname(f), m[1]))) problems.push(`${rel(f)}: dynamic import of a missing file ${m[1]}`);
  }
  assert.deepEqual(problems, []);
});

test("layering: core and views never import features, core never imports views; pure libs never touch the DOM or storage", () => {
  for (const f of ALL.filter((x) => x.includes(`${path.sep}core${path.sep}`) || x.includes(`${path.sep}views${path.sep}`))) assert.doesNotMatch(src(f), /(from\s*|import\()\s*["']\.\.\/features\//, rel(f));
  for (const f of ALL.filter((x) => x.includes(`${path.sep}core${path.sep}`))) assert.doesNotMatch(src(f), /(from\s*|import\()\s*["']\.\.\/views\//, `${rel(f)}: views load on demand from main.js only`);
  for (const f of ALL.filter((x) => x.includes(`${path.sep}lib${path.sep}`))) {
    const code = src(f).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    // (lib/time.js expand() takes a parameter called window: { start, end })
    assert.doesNotMatch(code, /\b(document|localStorage|sessionStorage|navigator|location)\s*[.[]|\bwindow\s*\.(?!start\b|end\b)/, `${rel(f)} must stay pure (the build and node:test import it)`);
    assert.doesNotMatch(code, /from\s+["']\.\.\/core\//, `${rel(f)} imports core`);
  }
});

/** The attribute hooks of build/CONTRACTS.md §8 and the markup the shell and the cards emit. */
const HOOKS = ["data-star", "data-star-kind", "data-trip-count", "data-trip-card", "data-trip-card-title", "data-trip-card-next",
  "data-open-event", "data-open-experience", "data-live-pill", "data-live-text", "data-search-open", "data-search-input",
  "data-search-results", "data-search-status", "data-k-hint", "data-theme-toggle", "data-nav-toggle", "data-scrim", "data-to-top",
  "data-toast", "data-toast-text", "data-toast-link", "data-evd-kicker", "data-evd-body", "data-xd-kicker", "data-xd-body",
  "data-trip-root", "data-filter-q", "data-filter", "data-result-count", "data-view", "data-modal", "data-close",
  "data-s", "data-e", "data-inst", "data-days", "data-end-unknown", "data-time-unknown", "data-run", "data-cancelled", "data-status", "data-now",
  "data-consent-open"];
const camel = (h) => h.replace(/^data-/, "").replace(/-([a-z])/g, (_, c) => c.toUpperCase());

test("every hook the build emits is wired by the client", () => {
  const missing = HOOKS.filter((h) => !allSource.includes(`[${h}`) && !allSource.includes(`"${h}"`) && !allSource.includes(`dataset.${camel(h)}`) && !new RegExp(`\\b${camel(h)}\\b`).test(allSource));
  assert.deepEqual(missing, []);
});

test("the fixture build emits the hooks, loads main.js, and ships the client files", () => {
  const dir = copyRepo();
  try {
    const r = build(dir);
    assert.equal(r.status, 0, r.stderr);
    const idx = read(dir, "docs/index.html"), wo = read(dir, "docs/whats-on.html"), xp = read(dir, "docs/experiences.html"), trip = read(dir, "docs/trip.html");
    assert.match(idx, /<script type="module" src="assets\/js\/main\.js\?v=[0-9a-f]{8}"><\/script>/);
    for (const h of ["data-trip-card", "data-trip-count", "data-live-pill", "data-search-open", "data-theme-toggle", "data-nav-toggle", "data-toast", "data-evd-body", "data-xd-body", "data-to-top"]) assert.ok(idx.includes(h), `index.html lacks ${h}`);
    assert.match(wo, /data-open-event="[a-z0-9-]+"/);
    assert.match(wo, /<button class="star" type="button" data-star="[a-z0-9-]+" data-star-kind="e"/);
    assert.match(wo, /data-run="\d{4}-\d\d-\d\d"/, "the fixture's long run");
    assert.match(wo, /data-cancelled="1"/, "the fixture's cancelled event");
    assert.match(xp, /data-open-experience="[a-z0-9-]+"/);
    assert.match(xp, /data-star-kind="x"/);
    assert.match(trip, /data-trip-root/);
    for (const f of ALL) assert.ok(fs.existsSync(path.join(dir, "docs", "assets", "js", path.relative(JS, f))), `docs/assets/js/${path.relative(JS, f)} is not shipped`);
    // the client JSON carries what the dialogs and the trip view read (build/core/client-data.mjs, E2 additions)
    const ev = JSON.parse(read(dir, "docs/assets/data/events.json")), xj = JSON.parse(read(dir, "docs/assets/data/experiences.json"));
    const pl = JSON.parse(read(dir, "docs/assets/data/places-lite.json")), st = JSON.parse(read(dir, "docs/assets/data/stays-lite.json"));
    assert.equal(ev.lb.k.festival, "Festival");
    assert.ok("map" in ev && "map" in xj);
    assert.ok(Object.values(ev.places).some((p) => /, FL \d{5}$/.test(p.ad || "")), "places carry an address line");
    for (const j of [xj, pl, st]) { assert.ok(j.regions.tampa && j.areas["ybor-city"], "regions and areas"); assert.ok(j.lb && j.lb.k && j.lb.st, "labels"); }
    for (const x of xj.experiences) assert.ok("im" in x);
  } finally { cleanup(dir); }
});

test("storage keys: tbc-* only, the documented set, the same the boot script reads", () => {
  assert.doesNotMatch(allSource, /["'`]cw-/, "a Cincy Week key survived the port");
  const used = new Set([...allSource.matchAll(/["'`](tbc-[a-z-]+)["'`]/g)].map((m) => m[1]).filter((k) => k !== "tbc-ready" && k !== "tbc-analytics")); // a class and a <meta name>, not storage keys
  const documented = ["tbc-theme", "tbc-rail", "tbc-trip", "tbc-prefs", "tbc-seen-shared", "tbc-debug", "tbc-consent"];
  for (const k of used) assert.ok(documented.includes(k), `undocumented storage key ${k} (document it in site/js/core/store.js)`);
  const store = src(path.join(JS, "core", "store.js"));
  for (const k of documented) assert.ok(store.includes(k), `core/store.js does not document ${k}`);
  const shell = fs.readFileSync(path.join(REPO, "build", "core", "shell.mjs"), "utf8");
  for (const k of ["tbc-theme", "tbc-rail", "tbc-debug"]) assert.ok(shell.includes(`"${k}"`), `the boot script does not read ${k}`);
});

test("the palette's page order is the sidebar's (build/nav.mjs NAV)", async () => {
  const { NAV } = await import("../build/nav.mjs");
  const m = /const NAV_ORDER = (\[[^\]]*\])/.exec(src(path.join(JS, "core", "search.js")));
  assert.ok(m, "core/search.js NAV_ORDER");
  assert.deepEqual(JSON.parse(m[1]), NAV.filter((g) => !g.regions).flatMap((g) => g.items.map((i) => i.slug)));
});
