/* tests/consent.test.mjs · OWNER: the maintainer (analytics consent, added 2026-09-29)
   Google Analytics 4 is consent-gated (site/js/lib/consent.js decides, site/js/core/consent.js acts):
   1. the pure lib: the decision table, the stored record, the QA hook, the gtag calls, the cookie sweep, the words;
   2. the build: no page carries a Google script (the crawler fails one), <meta name="tbc-analytics"> is there iff
      site.config.json has an analyticsId, every page has the footer's "Analytics settings" button, about.html#privacy
      says what happens, and the claims elsewhere stay true;
   3. the docs: the storage key and the contract are written down.
   The browser behavior (no Google request before a yes, revoke, GPC) is checked with Playwright by hand
   (see build/CONTRACTS.md Changelog, 2026-09-29). */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { REPO, copyRepo, build, read, cleanup, edit, extraPage } from "./helpers.mjs";

const L = await import(path.join(REPO, "site", "js", "lib", "consent.js"));
const ID = "G-EWSGXNE3L2";
const LIVE = { id: ID, host: "fritzhand.github.io", protocol: "https:", webdriver: false, simulated: false, qa: false };
const rec = (analytics, v = 1) => JSON.stringify({ v, analytics, t: 1790000000000 });

/* ---------------------------------------------------------------- 1. the lib ---------------------------------------------------------------- */

test("decide: the table (stored choice, GPC, no choice)", () => {
  const d = (o) => L.decide({ ...LIVE, ...o });
  assert.deepEqual(d({ stored: rec("granted") }), { action: "load", reason: "granted" });
  assert.deepEqual(d({ stored: rec("denied") }), { action: "none", reason: "denied" });
  assert.deepEqual(d({ stored: null }), { action: "banner", reason: "ask" });
  assert.deepEqual(d({ stored: null, gpc: true }), { action: "none", reason: "gpc" }, "GPC with no choice: treated as No, no banner");
  assert.deepEqual(d({ stored: rec("granted"), gpc: true }), { action: "load", reason: "granted" }, "an explicit yes after GPC stands");
  assert.deepEqual(d({ stored: rec("denied"), gpc: true }), { action: "none", reason: "denied" });
  assert.deepEqual(d({ stored: null, gpc: "1" }), { action: "banner", reason: "ask" }, "only navigator.globalPrivacyControl === true counts");
  // anything that is not a v1 record is no choice
  for (const bad of ["granted", "{", "null", "[]", rec("maybe"), rec("granted", 2), JSON.stringify({ analytics: "granted" })]) assert.deepEqual(d({ stored: bad }), { action: "banner", reason: "ask" }, bad);
});

test("decide: no id, local, file:, automation and a simulated clock never ask or load", () => {
  const d = (o) => L.decide({ ...LIVE, stored: rec("granted"), ...o });
  assert.deepEqual(d({ id: "" }), { action: "none", reason: "no-id" });
  assert.deepEqual(d({ id: "UA-1234-1" }), { action: "none", reason: "no-id" });
  for (const host of ["localhost", "127.0.0.1", "127.1.2.3", "[::1]", "tbc.localhost", "0.0.0.0", ""]) assert.deepEqual(d({ host }), { action: "none", reason: "local" }, host);
  assert.deepEqual(d({ protocol: "file:", host: "" }), { action: "none", reason: "file" });
  assert.deepEqual(d({ webdriver: true }), { action: "none", reason: "automation" });
  assert.deepEqual(d({ simulated: true }), { action: "none", reason: "simulated" });
  assert.deepEqual(d({ host: "localhost", stored: null }), { action: "none", reason: "local" }, "no banner on localhost either");
  assert.deepEqual(d({ webdriver: true, stored: null }), { action: "none", reason: "automation" }, "no banner under Playwright (the audits, the promo renderer)");
});

test("decide: ?consent=show lifts the guard and nothing else", () => {
  const d = (o) => L.decide({ ...LIVE, host: "localhost", webdriver: true, simulated: true, qa: true, ...o });
  assert.deepEqual(d({ stored: null }), { action: "banner", reason: "ask" });
  assert.deepEqual(d({ stored: rec("granted") }), { action: "load", reason: "granted" });
  assert.deepEqual(d({ stored: rec("denied") }), { action: "none", reason: "denied" });
  assert.deepEqual(d({ stored: null, gpc: true }), { action: "none", reason: "gpc" });
  assert.deepEqual(d({ id: "" }), { action: "none", reason: "no-id" });
  assert.equal(L.qaForced("?consent=show"), true);
  assert.equal(L.qaForced("?now=2026-10-24T19:30&consent=show"), true);
  assert.equal(L.qaForced("consent=show"), true);
  for (const s of ["", "?consent=1", "?consent=hide", "?xconsent=show", "?consent=show%", "?q=consent%3Dshow"]) assert.equal(L.qaForced(s), false, s);
});

test("the stored record: { v: 1, analytics, t }", () => {
  assert.deepEqual(L.makeRecord("granted", 1790000000123.4), { v: 1, analytics: "granted", t: 1790000000123 });
  assert.deepEqual(L.makeRecord("denied", 5), { v: 1, analytics: "denied", t: 5 });
  assert.throws(() => L.makeRecord("yes", 1));
  assert.equal(L.CONSENT_KEY, "tbc-consent");
  assert.equal(L.parseChoice(JSON.stringify(L.makeRecord("granted", 1))), "granted");
  assert.equal(L.parseChoice({ v: 1, analytics: "denied" }), "denied");
  for (const bad of [null, undefined, "", "x", "1", "true", rec("granted", 0)]) assert.equal(L.parseChoice(bad), null, String(bad));
});

test("gtag: consent defaults first, then js, then config with Google signals and ad personalization off", () => {
  const calls = L.gtagCalls(ID, { now: 1790000000000, pageLocation: "https://fritzhand.github.io/visit-tampa-bay/trip.html" });
  assert.deepEqual(calls.map((c) => c.slice(0, 2).map(String)), [["consent", "default"], ["js", new Date(1790000000000).toString()], ["config", ID]]);
  assert.deepEqual(calls[0][2], { analytics_storage: "granted", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
  assert.ok(calls[1][1] instanceof Date);
  assert.deepEqual(calls[2][2], { allow_google_signals: false, allow_ad_personalization_signals: false, page_location: "https://fritzhand.github.io/visit-tampa-bay/trip.html" });
  assert.equal("page_location" in L.gtagCalls(ID)[2][2], false);
  assert.equal(L.gtagSrc(ID), "https://www.googletagmanager.com/gtag/js?id=G-EWSGXNE3L2");
  assert.deepEqual(L.revokeCalls(), [["consent", "update", { analytics_storage: "denied" }]]);
  assert.equal(L.disableKey(ID), "ga-disable-G-EWSGXNE3L2");
  assert.equal(L.withoutHash("https://x.io/a/trip.html?e=1#e=abcde;p=fghij"), "https://x.io/a/trip.html?e=1", "a shared trip's hash never reaches page_location");
});

test("revoke: every _ga cookie, on every domain and path it could be on", () => {
  assert.deepEqual(L.gaCookieNames(ID, ""), ["_ga", "_ga_EWSGXNE3L2"]);
  assert.deepEqual(L.gaCookieNames(ID, "tbc=1; _ga=GA1.1.1.2; _ga_OTHER1=GS1; _gid=GA1; _gat_UA-1=1; _gallery=x; ga=1").sort(), ["_ga", "_ga_EWSGXNE3L2", "_ga_OTHER1", "_gat_UA-1", "_gid"].sort());
  assert.deepEqual(L.cookieDomains("fritzhand.github.io"), ["", "fritzhand.github.io", ".fritzhand.github.io", "github.io", ".github.io"]);
  assert.deepEqual(L.cookieDomains("www.example.co.uk"), ["", "www.example.co.uk", ".www.example.co.uk", "example.co.uk", ".example.co.uk", "co.uk", ".co.uk"]);
  assert.deepEqual(L.cookieDomains("localhost"), ["", "localhost"]);
  assert.deepEqual(L.cookieDomains("127.0.0.1"), ["", "127.0.0.1"]);
  assert.deepEqual(L.cookiePaths("/visit-tampa-bay/places/florida-aquarium.html"), ["/", "/visit-tampa-bay", "/visit-tampa-bay/", "/visit-tampa-bay/places", "/visit-tampa-bay/places/", "/visit-tampa-bay/places/florida-aquarium.html"]);
  assert.deepEqual(L.cookiePaths("/"), ["/"]);
  const out = L.expireCookies(["_ga", "_ga_EWSGXNE3L2"], "fritzhand.github.io", "/visit-tampa-bay/index.html");
  assert.equal(out.length, 2 * 5 * 4);
  assert.ok(out.includes("_ga=; Max-Age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.fritzhand.github.io; SameSite=Lax"));
  assert.ok(out.includes("_ga_EWSGXNE3L2=; Max-Age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/visit-tampa-bay/; SameSite=Lax"), "host-only too");
  for (const c of out) assert.match(c, /^_ga(_EWSGXNE3L2)?=; Max-Age=0; /);
});

test("the words: the question, the two equal answers, the state", () => {
  assert.equal(L.COPY.title, "Count this visit?");
  assert.equal(L.COPY.body, "With your OK, this guide uses Google Analytics to count visits and see which pages people use. Google Analytics sets cookies. Nothing from Google loads unless you choose Allow. Your starred trip is never sent.");
  assert.equal(L.COPY.allow, "Allow analytics");
  assert.equal(L.COPY.deny, "No thanks");
  assert.equal(L.COPY.more, "Privacy details");
  assert.equal(L.COPY.toastOn, "Analytics on");
  assert.equal(L.COPY.toastOff, "Analytics off");
  assert.deepEqual(L.stateOf({ stored: rec("granted") }), { on: true, text: "Analytics is on", note: null });
  assert.deepEqual(L.stateOf({ stored: rec("denied") }), { on: false, text: "Analytics is off", note: null });
  assert.deepEqual(L.stateOf({ stored: null }), { on: false, text: "Analytics is off", note: null });
  assert.deepEqual(L.stateOf({ stored: null, gpc: true }), { on: false, text: "Analytics is off", note: L.COPY.gpc });
  for (const [k, v] of Object.entries(L.COPY)) assert.doesNotMatch(v, /!|\b(amazing|best|awesome|improve your experience)\b/i, `plain words: ${k}`);
});

test("the client reads the meta tag the shell writes, and the core wires the footer button", () => {
  const core = fs.readFileSync(path.join(REPO, "site", "js", "core", "consent.js"), "utf8");
  const shell = fs.readFileSync(path.join(REPO, "build", "core", "shell.mjs"), "utf8");
  assert.ok(core.includes(`meta[name="tbc-analytics"]`) && shell.includes(`<meta name="tbc-analytics"`));
  assert.ok(core.includes("[data-consent-open]") && shell.includes("data-consent-open"));
  assert.ok(core.includes('role", "region"') && core.includes('aria-labelledby", "consent-title"'), "a labelled, non-modal region");
  assert.doesNotMatch(core, /aria-modal|showModal\(/, "never a modal or a focus trap");
  assert.match(fs.readFileSync(path.join(REPO, "site", "js", "main.js"), "utf8"), /safe\("consent", initConsent\)/);
  assert.doesNotMatch(shell, /googletagmanager|gtag\(/, "the shell writes no Google script");
});

/* ---------------------------------------------------------------- 2. the build ---------------------------------------------------------------- */

const htmlFiles = (dir) => fs.readdirSync(dir, { withFileTypes: true, recursive: true }).filter((d) => d.isFile() && d.name.endsWith(".html")).map((d) => path.join(d.parentPath ?? d.path, d.name));

test("with an analyticsId: the meta tag and the footer button on every page, no Google script anywhere, about.html#privacy", () => {
  const dir = copyRepo();
  try {
    edit("site.config.json", (s) => s.replace(/"analyticsId": "[^"]*"/, `"analyticsId": "${ID}"`))(dir);
    const r = build(dir);
    assert.equal(r.status, 0, r.stderr);
    const files = htmlFiles(path.join(dir, "docs"));
    assert.ok(files.length > 30);
    for (const f of files) {
      const h = fs.readFileSync(f, "utf8"), n = path.relative(dir, f);
      assert.doesNotMatch(h, /googletagmanager|google-analytics\.com/, `${n}: no Google URL in any page`);
      assert.doesNotMatch(h, /<script\b[^>]*>[^<]*\bgtag\(/, `${n}: no gtag() script`);
      assert.equal((h.match(/<meta name="tbc-analytics" content="G-EWSGXNE3L2">/g) || []).length, 1, `${n}: the meta tag once`);
      assert.match(h, /<button class="footer-btn js-only" type="button" data-consent-open aria-expanded="false">Analytics settings<\/button>/, `${n}: the footer button`);
      assert.doesNotMatch(h, /href="#"/, `${n}: no href="#"`);
    }
    const about = read(dir, "docs/about.html");
    assert.match(about, /<section class="section" id="privacy"/);
    assert.match(about, /<a href="#privacy">Privacy and analytics<\/a>|href="#privacy"[^>]*>[^<]*Privacy and analytics/, "the TOC names it");
    assert.match(about, /href="https:\/\/policies\.google\.com\/privacy"/);
    assert.match(about, /href="https:\/\/support\.google\.com\/analytics\/answer\/6004245"/);
    assert.match(about, /only after you choose <b>Allow analytics<\/b>/);
    assert.match(about, /Google signals and ad personalization are off/);
    assert.match(about, /<code>tbc-consent<\/code>/);
    assert.match(about, /Global Privacy Control/);
    assert.match(about, /never sent anywhere/);
    assert.match(about, /static site built from JSON data files, with Google Analytics only after you allow it/, "the Code line stays true");
    assert.doesNotMatch(about, /with no analytics/);
    // the banner's and the footer's links land
    for (const f of ["index.html", "places/florida-aquarium.html", "404.html"]) assert.match(read(dir, `docs/${f}`), /about\.html#privacy/, f);
    assert.match(read(dir, "docs/trip.html"), /The list itself is never sent anywhere/);
    assert.doesNotMatch(read(dir, "docs/trip.html"), /Nothing is sent anywhere/);
  } finally { cleanup(dir); }
});

test("without an analyticsId: no meta tag, no button, and about.html#privacy says there is no analytics", () => {
  const dir = copyRepo();
  try {
    edit("site.config.json", (s) => s.replace(/"analyticsId": "[^"]*"/, `"analyticsId": ""`))(dir);
    const r = build(dir);
    assert.equal(r.status, 0, r.stderr);
    for (const f of htmlFiles(path.join(dir, "docs"))) {
      const h = fs.readFileSync(f, "utf8");
      assert.doesNotMatch(h, /tbc-analytics|data-consent-open|googletagmanager/, path.relative(dir, f));
    }
    const about = read(dir, "docs/about.html");
    assert.match(about, /<section class="section" id="privacy"/);
    assert.match(about, /This guide has no analytics/);
    assert.match(about, /, with no analytics\./);
  } finally { cleanup(dir); }
});

test("the crawler fails a page that loads Google Analytics (or any third-party script) itself", () => {
  const cases = [
    ['<h1>X</h1><script async src="https://www.googletagmanager.com/gtag/js?id=G-EWSGXNE3L2"></script>', "external <script src="],
    ['<h1>X</h1><script src="https://cdn.example.com/x.js"></script>', "no page loads a third-party script"],
    ['<h1>X</h1><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag("config","G-EWSGXNE3L2");</script>', "an inline script loads or calls Google Analytics"],
  ];
  for (const [body, expected] of cases) {
    const dir = copyRepo();
    try {
      extraPage(body)(dir);
      const r = build(dir);
      assert.notEqual(r.status, 0, `expected a failure for ${body}`);
      assert.ok(r.stderr.includes(expected), `stderr should mention ${JSON.stringify(expected)}:\n${r.stderr}`);
      assert.ok(!fs.existsSync(path.join(dir, "docs")), "a failed build writes nothing");
    } finally { cleanup(dir); }
  }
});

/* ---------------------------------------------------------------- 3. the docs ---------------------------------------------------------------- */

test("the storage key and the contract are written down", () => {
  assert.match(fs.readFileSync(path.join(REPO, "site", "js", "core", "store.js"), "utf8"), /tbc-consent\s+\{ v: 1, analytics: "granted" \| "denied", t:/);
  const claude = fs.readFileSync(path.join(REPO, "CLAUDE.md"), "utf8");
  assert.match(claude, /tbc-consent/);
  assert.doesNotMatch(claude, /analyticsId \(empty = no analytics\)/, "CLAUDE.md says the id is consent-gated");
  const contracts = fs.readFileSync(path.join(REPO, "build", "CONTRACTS.md"), "utf8");
  assert.match(contracts, /tbc-consent/);
  assert.match(contracts, /data-consent-open/);
  assert.match(contracts, /<meta name="tbc-analytics"/);
});
