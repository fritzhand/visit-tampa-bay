#!/usr/bin/env node
/* ============================================================
   scripts/og.mjs · OWNER: the design system ("Chart & Label", design/DESIGN.md)
   Renders the 1200×630 social cards with Playwright from the built site's own tokens, fonts, CSS, sprite and
   brand drawings, in the Day chart:
     site/og.png            the guide: a chart neatline, the date-free masthead line, rose · wordmark · rose,
                            the tagline, the six sheets with their badges
     site/og-<region>.png   one per sheet page (the region lane sets page.og = "og-<region>.png"): a label frame
                            with its ribbon ("Sheet 1 · TP"), the sheet's name, its badge and its fixed areas
   Only fixed facts are printed (the sheet names, codes and areas of research/tools/schema.mjs, via vocab.mjs),
   never data that changes, so the cards never go stale. Dev-time only; the build copies site/og*.png into docs/assets/.
   Usage: node build.mjs && NODE_PATH=/opt/node22/lib/node_modules node scripts/og.mjs && node build.mjs
          (TBC_OUT=.cache/out-me renders from a private build instead of docs/)
   ============================================================ */
import { createRequire } from "node:module";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sprite, bullet, wordmarkArt, rose } from "../build/core/icons.mjs";
import { REGIONS, REGION_IDS, AREAS, AREA_NAMES } from "../build/core/vocab.mjs";

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); } catch { console.error("Playwright not found (set NODE_PATH to a global install, e.g. NODE_PATH=/opt/node22/lib/node_modules)."); process.exit(1); }
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DOCS = process.env.TBC_OUT ? path.resolve(ROOT, process.env.TBC_OUT) : path.join(ROOT, "docs");
if (!fs.existsSync(path.join(DOCS, "assets", "tokens.css"))) { console.error(`Build first: ${process.env.TBC_OUT ? `TBC_OUT=${process.env.TBC_OUT} ` : ""}node build.mjs`); process.exit(1); }
const config = JSON.parse(fs.readFileSync(path.join(ROOT, "site.config.json"), "utf8"));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const R = "/";   // the og server serves the build at its root

const CSS = `
html, body { margin: 0; width: 1200px; height: 630px; overflow: hidden; background: var(--bg); color: var(--text); }
.og { box-sizing: border-box; width: 1200px; height: 630px; padding: 26px; }
/* the guide */
.og-home { height: 100%; display: flex; }
.og-home > .grat-in { flex: 1; display: flex; flex-direction: column; padding: 26px 56px 28px; text-align: center; }
.og-home .mast-line { font-size: 15px; padding-bottom: 12px; }
.og-home .mast-title { grid-template-columns: 1fr 620px 1fr; gap: 36px; margin: 34px 0 6px; }
.og-home .rose { width: 150px; }
.og-home .rose.r { transform: scaleX(-1); }
.og-home .og-dek { margin: 18px auto 0; max-width: 34ch; font: italic 520 34px/1.22 var(--font-display); color: var(--text-muted); }
.og-home .ripple { width: 520px; margin: 22px auto 0; }
.og-home .og-sheets { margin-top: auto; display: grid; grid-template-columns: repeat(3, max-content); justify-content: center; gap: 12px 44px; padding-top: 18px; border-top: 1px solid var(--border); }
.og-home .og-sheets span { display: inline-flex; align-items: center; gap: 12px; color: var(--ink-text); font: var(--wght-strong) 21px/1.2 var(--font-body); }
.og-home .og-sheets .bullet { width: 50px; height: 30px; }
/* a sheet */
.og-sheet { position: relative; height: 100%; display: flex; flex-direction: column; margin: 0; padding: 60px 64px 34px; text-align: left; }
.og-sheet.page-head::before { display: none; }
.og-sheet > .kicker { font-size: 17px; min-height: 42px; padding: 4px 26px; top: -22px; }
.og-sheet .og-head { display: flex; align-items: center; gap: 34px; margin-top: 18px; }
.og-sheet .bullet.xxl { width: 172px; height: 102px; flex: none; }
.og-sheet h1 { max-width: none; margin: 0; font-size: 104px; line-height: 0.98; letter-spacing: -0.01em; }
.og-sheet h1.long { font-size: 78px; }
.og-sheet .og-areas { position: relative; z-index: 1; margin-top: 30px; max-width: 1000px; font: italic 520 28px/1.3 var(--font-display); color: var(--text-muted); text-wrap: balance; }
.og-sheet .og-areas span { white-space: nowrap; }
.og-sheet .og-rose { position: absolute; right: 30px; top: 64px; width: 400px; height: 400px; background: var(--ink-edge); opacity: 0.08; -webkit-mask: var(--mask-rose) 0 0 / 100% 100% no-repeat; mask: var(--mask-rose) 0 0 / 100% 100% no-repeat; pointer-events: none; }
.og-sheet { overflow: visible; }
.og-sheet .og-head, .og-sheet .og-foot { position: relative; z-index: 1; }
.og-sheet .og-foot { margin-top: auto; display: flex; align-items: flex-end; justify-content: space-between; gap: 40px; padding-top: 22px;
  background: linear-gradient(var(--rule-ink) 0 0) 0 0 / 100% 2px no-repeat, linear-gradient(var(--water-line) 0 0) 0 5px / 100% 1px no-repeat, linear-gradient(var(--water-line) 0 0) 0 9px / 100% 1px no-repeat; }
.og-sheet .og-foot .wm-art { width: 250px; }
.og-sheet .og-foot span { font: 500 20px/1.3 var(--font-body); color: var(--text-muted); text-align: right; }
`;
const page = (inner) => `<!doctype html><html lang="en" data-theme="light" class="js"><head><meta charset="utf-8">
<link rel="stylesheet" href="/assets/tokens.css"><link rel="stylesheet" href="/assets/site.css"><style>${CSS}</style></head>
<body>${sprite()}${inner}</body></html>`;

const areasOf = (rid) => Object.keys(AREAS).filter((a) => AREAS[a] === rid).map((a) => AREA_NAMES[a]);
const home = page(`<div class="og"><section class="mast grat og-home"><div class="grat-in mast-in">
<div class="mast-line label"><span class="side">Sheets 1–6 · Tampa Bay</span><span class="mid">An independent guide</span><span class="side">Not for navigation</span></div>
<div class="mast-title">${rose(R, "rose")}${wordmarkArt(R, { cls: "wm-art" })}${rose(R, "rose r")}</div>
<p class="og-dek">Where to stay, what to see, what is on and where the history happened. Every entry linked to its source.</p>
<div class="ripple"></div>
<div class="og-sheets">${REGION_IDS.map((id) => `<span data-sheet="${id}">${bullet(id)}${esc(REGIONS[id].name)}</span>`).join("")}</div>
</div></section></div>`);

const sheet = (id) => {
  const r = REGIONS[id];
  const areas = areasOf(id);
  return page(`<div class="og"><header class="page-head og-sheet" data-sheet="${id}">
<p class="kicker label"><span>Sheet ${r.n} · ${esc(r.code)}</span></p>
<div class="og-head">${bullet(id).replace('class="bullet"', 'class="bullet xxl"')}<h1${r.name.length > 16 ? ' class="long"' : ""}>${esc(r.name)}</h1></div>
<p class="og-areas">${areas.map((a, i) => `<span>${esc(a)}${i < areas.length - 1 ? " ·" : ""}</span>`).join(" ")}</p>
<span class="og-rose" aria-hidden="true"></span>
<div class="og-foot">${wordmarkArt(R, { cls: "wm-art", label: "" })}<span>${esc(config.siteTagline)}</span></div>
</header></div>`);
};

const pages = new Map([["og.png", home], ...REGION_IDS.map((id) => [`og-${id}.png`, sheet(id)])]);
const TYPES = { ".css": "text/css", ".woff2": "font/woff2", ".svg": "image/svg+xml", ".png": "image/png" };
const server = http.createServer((req, res) => {
  const u = new URL(req.url, "http://x");
  if (u.pathname.startsWith("/og/")) { res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); res.end(pages.get(u.pathname.slice(4))); return; }
  const f = path.join(DOCS, u.pathname);
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream" }); res.end(d); });
}).listen(0);
const port = server.address().port;
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1, colorScheme: "light" });
const tab = await ctx.newPage();
const errs = [];
tab.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
tab.on("response", (r) => { if (r.status() >= 400) errs.push(`${r.status()} ${r.url()}`); });
for (const name of pages.keys()) {
  await tab.goto(`http://localhost:${port}/og/${name}`, { waitUntil: "networkidle" });
  await tab.evaluate(() => document.fonts.ready);
  await tab.waitForTimeout(150);
  await tab.screenshot({ path: path.join(ROOT, "site", name) });
  console.log(`site/${name}`);
}
await browser.close();
server.close();
if (errs.length) { console.error(`✗ ${errs.length} problem(s):\n  ${errs.join("\n  ")}`); process.exit(1); }
