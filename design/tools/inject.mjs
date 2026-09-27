#!/usr/bin/env node
/* design/tools/inject.mjs · Tampa Bay Chartbook · design system "Chart & Label"
   Fills the inline sprite of design/specimen.html (between <!-- sprite:start --> and <!-- sprite:end -->)
   from design/brand/: the outlined wordmarks (parts.json), the six sheet badges (sheets.svg), the chart
   symbols (icons.json) and the UI icons below (the engine's own set, a subset). Idempotent.
     node design/tools/inject.mjs
   Zero dependencies. */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const D = join(dirname(fileURLToPath(import.meta.url)), "..");
const P = JSON.parse(readFileSync(join(D, "brand", "parts.json"), "utf8"));
const icons = JSON.parse(readFileSync(join(D, "brand", "icons.json"), "utf8"));
const compass = readFileSync(join(D, "brand", "compass.svg"), "utf8").replace(/^<svg[^>]*>|<\/svg>\s*$/g, "").replace(/<title>[^<]*<\/title>/, "");
const sheets = readFileSync(join(D, "brand", "sheets.svg"), "utf8").replace(/^<svg[^>]*>|<\/svg>\s*$/g, "");
const UI = {   // the engine's UI icons (Cincy Week build/core/icons.mjs), the few the specimen uses
  search: '<circle cx="11" cy="11" r="7"/><path d="M16.2 16.2 21 21"/>',
  star: '<path d="M12 3.2l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 17l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z"/>',
  moon: '<path d="M20 14.6A8 8 0 0 1 9.4 4a7.6 7.6 0 1 0 10.6 10.6z"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  home: '<path d="M3.5 10.5 12 3.5l8.5 7V20a1 1 0 0 1-1 1h-5v-6h-5v6h-5a1 1 0 0 1-1-1z"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="1"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  map: '<path d="M9 4.5 3.5 6.5v13l5.5-2 6 2 5.5-2v-13l-5.5 2z"/><path d="M9 4.5v13M15 6.5v13"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  pin: '<path d="M12 21s-6.5-5.9-6.5-11.2a6.5 6.5 0 0 1 13 0C18.5 15.1 12 21 12 21z"/><circle cx="12" cy="9.8" r="2.4"/>',
  ext: '<path d="M14 4h6v6M20 4l-8.5 8.5M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  "arrow-r": '<path d="M5 12h14M13.5 6.5 19 12l-5.5 5.5"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8h.01"/>',
  warn: '<path d="M12 3.5 2.5 20h19z"/><path d="M12 10v4.5M12 17.2h.01"/>',
  bed: '<path d="M3 19V6.5M3 15.5h18V19M21 15.5v-3.2a3 3 0 0 0-3-3h-7v6.2"/><circle cx="7" cy="11.5" r="1.8"/>',
  utensils: '<path d="M6.5 3v7.5M4.5 3v4.5a2 2 0 0 0 4 0V3M6.5 10.5V21M17.5 21V3.2c-2 .9-3.5 3.4-3.5 7.3h3.5"/>',
  help: '<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.3a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01"/>',
  plus: '<path d="M12 5.5v13M5.5 12h13"/>', minus: '<path d="M5.5 12h13"/>', x: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
};
const sym = (id, vb, inner, attrs = "") => `<symbol id="${id}" viewBox="${vb}"${attrs}>${inner}</symbol>`;
const stroke = ' fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
const w = P.wordmark;
const sprite = [
  sym("wm", w.viewBox, `<g style="fill:var(--wordmark-accent, currentColor)"><g transform="${w.caps.transform}"><path d="${w.caps.d}"/></g><path d="${w.rules}"/></g><g style="fill:currentColor" transform="${w.word.transform}"><path d="${w.word.d}"/></g>`),
  sym("wm-word", P.word.viewBox, `<path style="fill:currentColor" d="${P.word.d}"/>`),
  sym("compass", "0 0 200 200", compass),
  sheets,
  ...Object.entries(icons).map(([k, v]) => sym(`i-${k}`, "0 0 24 24", v, stroke)),
  ...Object.entries(UI).map(([k, v]) => sym(`i-${k}`, "0 0 24 24", v, stroke)),
].join("\n");

const file = join(D, "specimen.html");
const html = readFileSync(file, "utf8");
const a = html.indexOf("<!-- sprite:start -->"), b = html.indexOf("<!-- sprite:end -->");
if (a < 0 || b < 0) throw new Error("specimen.html has no sprite markers");
const out = html.slice(0, a) + `<!-- sprite:start -->\n<svg class="sprite" aria-hidden="true" focusable="false">\n${sprite}\n</svg>\n` + html.slice(b);
writeFileSync(file, out);
console.log(`specimen.html: sprite ${(sprite.length / 1024).toFixed(1)} KB`);
