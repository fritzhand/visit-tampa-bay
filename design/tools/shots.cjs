#!/usr/bin/env node
/* design/tools/shots.cjs · Tampa Bay Chartbook · design system "Chart & Label"
   Renders design/specimen.html with Playwright (Chromium) at 1440 and 390 px wide in both editions,
   writes design/shots/specimen-<day|night>-<width>.png (full page) and -top.png (first screen), and audits
   each render: horizontal overflow, text under 12px, touch targets under 44px, missing fonts, console errors.
   It also lints the specimen's <style> the way the build lints partials (no color literal, no font-size < 12px).
     NODE_PATH=/opt/node22/lib/node_modules PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node design/tools/shots.cjs [--only day-390]
   Exits 1 on any audit failure. */
const { chromium } = require("playwright");
const { readFileSync, mkdirSync, existsSync } = require("node:fs");
const { join, extname, normalize } = require("node:path");
const http = require("node:http");

const D = join(__dirname, "..");
const OUT = join(D, "shots");
const only = (process.argv.find((a) => a.startsWith("--only=")) || "").slice(7) || (process.argv.includes("--only") ? process.argv[process.argv.indexOf("--only") + 1] : "");
mkdirSync(OUT, { recursive: true });

/* ---------- lint the specimen's CSS like build/core/write.mjs lints the partials ---------- */
const COLOR_LITERAL = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(|\b(?:white|black|red|green|blue|yellow|orange|purple|pink|gray|grey|silver|navy|maroon|teal|olive|lime|aqua|fuchsia|brown|gold|beige|tan|coral|crimson|indigo|violet|magenta|cyan)\b/i;
const html = readFileSync(join(D, "specimen.html"), "utf8");
const css = (html.match(/<style>([\s\S]*?)<\/style>/) || [, ""])[1].replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
let fails = 0;
for (const m of css.matchAll(/([a-z-]+)\s*:\s*([^;{}]+)(?=[;}])/g)) {
  const [, prop, val] = m;
  const line = css.slice(0, m.index).split("\n").length;
  const v = val.replace(/var\(\s*--[\w-]+/g, "var(").replace(/--[\w-]+/g, "").replace(/color-mix\(in (srgb|oklab)/g, "mix(");
  if (!prop.startsWith("--") && COLOR_LITERAL.test(v)) { fails++; console.error(`lint: specimen <style> line ${line}: color literal in "${prop}: ${val.trim().slice(0, 70)}"`); }
  if (prop === "font-size") {
    const px = val.match(/^\s*(\d+(?:\.\d+)?)px\s*$/), rem = val.match(/^\s*(\d*\.?\d+)rem\s*$/);
    if ((px && +px[1] < 12) || (rem && +rem[1] < 0.75)) { fails++; console.error(`lint: specimen <style> line ${line}: font-size ${val.trim()} under 12px`); }
  }
}

/* a tiny static server for design/ (fonts need http: file:// blocks font preloads) */
const TYPES = { ".html": "text/html", ".css": "text/css", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".json": "application/json", ".png": "image/png" };
const server = http.createServer((req, res) => {
  const p = normalize(join(D, decodeURIComponent(req.url.split("?")[0])));
  if (!p.startsWith(D) || !existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": TYPES[extname(p)] || "application/octet-stream" });
  res.end(readFileSync(p));
});

(async () => {
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch();
  const runs = [];
  for (const theme of ["light", "dark"]) for (const width of [1440, 390]) runs.push({ theme, width });
  for (const { theme, width } of runs) {
    const name = `specimen-${theme === "light" ? "day" : "night"}-${width}`;
    if (only && !name.includes(only)) continue;
    const page = await browser.newPage({ viewport: { width, height: width > 600 ? 900 : 844 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.goto(base + "specimen.html?theme=" + theme, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(250);
    const audit = await page.evaluate(() => {
      const out = { overflow: document.documentElement.scrollWidth - window.innerWidth, small: [], targets: [], fonts: [] };
      for (const f of ["Bodoni Moda", "Figtree", "Archivo"]) if (![...document.fonts].some((x) => x.family.replace(/"/g, "") === f && x.status === "loaded")) out.fonts.push(f);
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const seen = new Set();
      while (walker.nextNode()) {
        const n = walker.currentNode, el = n.parentElement;
        if (!n.textContent.trim() || !el || seen.has(el)) continue;
        seen.add(el);
        const cs = getComputedStyle(el), r = el.getBoundingClientRect();
        if (cs.visibility === "hidden" || cs.display === "none" || r.width === 0 || el.closest(".sr-only, svg, [hidden]")) continue;
        if (parseFloat(cs.fontSize) < 11.99) out.small.push(`${el.tagName.toLowerCase()}.${el.className} "${n.textContent.trim().slice(0, 30)}" ${cs.fontSize}`);
      }
      const coarse = window.innerWidth < 1024;
      for (const el of document.querySelectorAll("a[href], button, [role=button]")) {
        const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
        if (!r.width || cs.display === "none" || cs.visibility === "hidden" || el.closest(".sr-only")) continue;
        if (el.matches(".stretched")) continue;              // the whole card is the target
        if (cs.display === "inline" && el.closest("p, cite, li, dd, blockquote") && !el.closest(".nav, .chip-row, .btn-row")) continue;   // inline links in running text (WCAG 2.5.8 inline exception)
        const min = coarse ? 44 : el.closest(".nav, .crumbs") ? 28 : 36;
        if (r.height < min - 0.5 || r.width < Math.min(min, 24) - 0.5) out.targets.push(`${el.tagName.toLowerCase()}.${el.className} "${(el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 24)}" ${Math.round(r.width)}×${Math.round(r.height)}`);
      }
      return out;
    });
    await page.screenshot({ path: join(OUT, `${name}.png`), fullPage: true });
    await page.screenshot({ path: join(OUT, `${name}-top.png`) });
    const problems = [];
    if (audit.overflow > 0) problems.push(`horizontal overflow ${audit.overflow}px`);
    if (audit.fonts.length) problems.push(`fonts not loaded: ${audit.fonts.join(", ")}`);
    if (audit.small.length) problems.push(`text under 12px: ${audit.small.slice(0, 6).join(" | ")}`);
    if (audit.targets.length) problems.push(`targets too small: ${audit.targets.slice(0, 8).join(" | ")}`);
    if (errors.length) problems.push(`console: ${errors.slice(0, 3).join(" | ")}`);
    fails += problems.length;
    console.log(`${name}: ${problems.length ? "\n  - " + problems.join("\n  - ") : "ok"}`);
    await page.close();
  }
  await browser.close();
  server.close();
  console.log(fails ? `${fails} problem(s)` : "all renders pass");
  process.exit(fails ? 1 : 0);
})();
