#!/usr/bin/env node
/* design/tools/brand.mjs · Tampa Bay Chartbook · design system "Chart & Label"
   Writes the drawn brand files into design/brand/ (the lettered ones come from outline.py → parts.json):
     mark.svg          compass-rose medallion inside a cigar-band ellipse (self-contained colors: used as <img>)
     favicon.svg       the mark reduced for 16–32 px (self-contained)
     logo.svg          mark + stacked wordmark (self-contained; follows prefers-color-scheme)
     compass.svg       the full compass rose with degree ring (currentColor + CSS variables)
     corner.svg        the label frame's corner block (currentColor)
     label-frame.svg   the double-rule label frame with four corner blocks (CSS variables)
     ribbon.svg        the kicker ribbon, band + notched tails (CSS variables)
     water-lining.svg  the water-lining rule: a coast line and four engraved echoes (currentColor)
     sheet-<code>.svg  the six sheet badges TP SP GB CW AB DT (CSS variables, Canvas fallback for the code)
     sheets.svg        the six badges as a <symbol> sprite (#sheet-tampa …)
     symbols.svg       chart-symbol icons as a <symbol> sprite (#i-anchor …), 24 grid, 2px stroke
     icons.json        the same icons as { name: inner SVG } for build/core/icons.mjs ICONS
   Brand files never carry a raster texture. Files meant for inline use read currentColor and tokens;
   files used standalone (<img>, favicon) define their inks once, as custom properties, in their own <style>.
     node design/tools/brand.mjs
   Zero dependencies. */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SHAPES, TEXT_AT } from "./shapes.mjs";
import { SHEETS, DAY, NIGHT } from "./palette.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const B = join(HERE, "..", "brand");
const PARTS = JSON.parse(readFileSync(join(B, "parts.json"), "utf8"));
const f = (v) => (Math.round(v * 100) / 100).toString();
const put = (name, s) => { writeFileSync(join(B, name), s.replace(/\n\s*/g, "\n").trim() + "\n"); console.log("  " + name); };

/* ---------- compass-rose geometry: kites split in a dark and a light half (the engraved look) ---------- */
function kite(cx, cy, deg, len, half) {
  const a = ((deg - 90) * Math.PI) / 180, ux = Math.cos(a), uy = Math.sin(a), px = -uy, py = ux;
  const tip = [cx + ux * len, cy + uy * len], l = [cx + px * half, cy + py * half], r = [cx - px * half, cy - py * half];
  const P = (p) => `${f(p[0])} ${f(p[1])}`;
  return { dark: `M${P([cx, cy])}L${P(tip)}L${P(l)}Z`, light: `M${P([cx, cy])}L${P(tip)}L${P(r)}Z` };
}
function rose(cx, cy, specs) {
  return specs.map(([deg, len, half, cls = ""]) => ({ ...kite(cx, cy, deg, len, half), cls }));
}

/* ---------- mark: the compass-rose medallion inside a cigar-band ellipse ---------- */
const MARK_INKS = `svg{--mk-ink:${DAY.text};--mk-paper:${DAY.surface};--mk-gold:${DAY.gold};--mk-gold-hi:${DAY.goldHi};--mk-north:${DAY.magenta}}`;
const MARK_CSS = `${MARK_INKS}
.ink{fill:var(--mk-ink)}.paper{fill:var(--mk-paper)}.gold{fill:var(--mk-gold)}.hi{fill:var(--mk-gold-hi)}
.ring{fill:none;stroke:var(--mk-gold);stroke-width:1.1}.keyline{fill:none;stroke:var(--mk-gold);stroke-width:1.2}
.dk{fill:var(--mk-ink)}.dk.n{fill:var(--mk-north)}.lt{fill:var(--mk-paper);stroke:var(--mk-ink);stroke-width:.85;stroke-linejoin:round}
.hub{fill:var(--mk-gold);stroke:var(--mk-ink);stroke-width:.9}`;
function markBody() {
  const pts = rose(32, 32, [
    [45, 10.5, 2.3], [135, 10.5, 2.3], [225, 10.5, 2.3], [315, 10.5, 2.3],
    [90, 15, 3.5], [270, 15, 3.5], [180, 21, 3.5], [0, 21.5, 3.5, " n"],
  ]);
  const draw = (p) => `<path class="dk${p.cls}" d="${p.dark}"/><path class="lt" d="${p.light}"/>`;
  return `
  <rect class="ink" x=".6" y="21.6" width="62.8" height="20.8" rx="1.2"/>
  <rect class="gold" x="1.8" y="22.8" width="60.4" height="18.4" rx=".6"/>
  <path class="ink" d="M1.8 25.4h60.4v.9H1.8zM1.8 37.7h60.4v.9H1.8z"/>
  <path class="ink" d="M5.6 32 7.6 29.2 9.6 32 7.6 34.8zM54.4 32l2-2.8 2 2.8-2 2.8z"/>
  <ellipse class="gold" cx="32" cy="32" rx="23.4" ry="31.2"/>
  <ellipse class="ink" cx="32" cy="32" rx="22.3" ry="30.1"/>
  <ellipse class="gold" cx="32" cy="32" rx="20.3" ry="28.1"/>
  <ellipse class="paper" cx="32" cy="32" rx="19" ry="26.8"/>
  <ellipse class="ring" cx="32" cy="32" rx="17.1" ry="24.9"/>
  ${pts.map(draw).join("")}
  <circle class="hub" cx="32" cy="32" r="2.4"/>`;
}
const mark = (title = "Tampa Bay Chartbook") =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="${title}"><title>${title}</title><style>${MARK_CSS}</style>${markBody()}</svg>`;

/* favicon: the medallion alone, bolder, for 16–32 px; a gold keyline keeps it visible on dark tab bars */
function favicon() {
  const pts = rose(16, 16, [[0, 12, 2.6, " n"], [90, 8.2, 2.6], [180, 12, 2.6], [270, 8.2, 2.6]]);
  const draw = (p) => `<path class="dk${p.cls}" d="${p.dark}"/><path class="lt" d="${p.light}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><style>${MARK_INKS}
  .gold{fill:var(--mk-gold)}.ink{fill:var(--mk-ink)}.paper{fill:var(--mk-paper)}
  .dk{fill:var(--mk-ink)}.dk.n{fill:var(--mk-north)}.lt{fill:var(--mk-paper);stroke:var(--mk-ink);stroke-width:.7;stroke-linejoin:round}</style>
  <ellipse class="gold" cx="16" cy="16" rx="12.6" ry="15.6"/>
  <ellipse class="ink" cx="16" cy="16" rx="11.2" ry="14.2"/>
  <ellipse class="paper" cx="16" cy="16" rx="9.4" ry="12.4"/>
  ${pts.map(draw).join("")}
  <circle class="gold" cx="16" cy="16" r="1.5"/></svg>`;
}

/* ---------- logo: mark + stacked wordmark ---------- */
function logo() {
  const wm = PARTS.wordmark;
  const [, vy, vw, vh] = wm.viewBox.split(" ").map(Number);
  const s = 64 / vh * 1.0;             // wordmark scaled to the mark's height
  const gap = 14;
  const W = 64 + gap + vw * s;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${f(W)} 64" role="img" aria-label="Tampa Bay Chartbook"><title>Tampa Bay Chartbook</title>
  <style>${MARK_CSS}
  .wm{fill:var(--lg-ink)}.wm-accent{fill:var(--lg-accent)}
  svg{--lg-ink:${DAY.text};--lg-accent:${DAY.magenta}}
  @media (prefers-color-scheme: dark){svg{--lg-ink:${NIGHT.text};--lg-accent:${NIGHT.gold}}}</style>
  ${markBody()}
  <g transform="translate(${f(64 + gap)} ${f(-vy * s)}) scale(${f(s)})">
  <g class="wm-accent"><g transform="${wm.caps.transform}"><path d="${wm.caps.d}"/></g><path d="${wm.rules}"/></g>
  <g class="wm" transform="${wm.word.transform}"><path d="${wm.word.d}"/></g></g></svg>`;
}

/* ---------- compass rose: 32 points, degree ring, north star ---------- */
function compass() {
  const c = 100, R = 92;
  let ticks = "";
  for (let a = 0; a < 360; a += 5) {
    const long = a % 30 === 0, mid = a % 10 === 0;
    const r1 = R - (long ? 9 : mid ? 6 : 3.5), rad = ((a - 90) * Math.PI) / 180;
    ticks += `M${f(c + Math.cos(rad) * R)} ${f(c + Math.sin(rad) * R)}L${f(c + Math.cos(rad) * r1)} ${f(c + Math.sin(rad) * r1)}`;
  }
  const quarter = [], half = [], main = [];
  for (let i = 0; i < 32; i++) {
    const deg = i * 11.25;
    if (i % 8 === 0) main.push([deg, 78, 10, i === 0 ? " n" : ""]);
    else if (i % 4 === 0) half.push([deg, 58, 7.5]);
    else if (i % 2 === 0) quarter.push([deg, 44, 5.5]);
    else quarter.push([deg, 34, 4]);
  }
  // inline style attributes (no <style> block), so the rose can be inlined or used as a <symbol> anywhere
  const DK = "fill:var(--compass-dark, currentColor)", NORTH = "fill:var(--compass-north, currentColor)";
  const LT = "fill:var(--compass-light, none);stroke:currentColor;stroke-width:.9;stroke-linejoin:round";
  const draw = (p) => `<path style="${p.cls ? NORTH : DK}" d="${p.dark}"/><path style="${LT}" d="${p.light}"/>`;
  const layer = (specs) => rose(c, c, specs).map(draw).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" role="img" aria-label="Compass rose">
  <title>Compass rose</title>
  <g fill="none" stroke="currentColor">
  <circle cx="100" cy="100" r="96" stroke-width="1.6"/>
  <circle cx="100" cy="100" r="${R}" stroke-width=".8"/>
  <path d="${ticks}" stroke-width="1"/>
  <circle cx="100" cy="100" r="${R - 12}" stroke-width=".8"/>
  <circle cx="100" cy="100" r="30" stroke-width=".6" stroke-dasharray="1.5 2.5"/></g>
  ${layer(quarter)}${layer(half)}${layer(main)}
  <circle style="fill:var(--compass-hub, currentColor)" cx="100" cy="100" r="4.2"/>
  </svg>`;
}

/* ---------- label frame pieces ---------- */
const CORNER_D = "M10 0l1.9 7.2L19.9 10l-8 2.8L10 20l-1.9-7.2L.1 10l8-2.8z M10 8.3a1.7 1.7 0 1 0 0 3.4a1.7 1.7 0 1 0 0-3.4z";
const corner = () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path fill="currentColor" fill-rule="evenodd" d="${CORNER_D}"/></svg>`;
function labelFrame() {
  const W = 320, H = 180, o = 10, g = 5;
  const c = (x, y) => `<path transform="translate(${x} ${y})" fill-rule="evenodd" d="${CORNER_D}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Label frame">
  <title>Label frame: double rule with corner blocks</title>
  <rect x="${o}" y="${o}" width="${W - 2 * o}" height="${H - 2 * o}" fill="none" style="stroke:var(--frame-outer, currentColor)" stroke-width="2"/>
  <rect x="${o + g + 1.5}" y="${o + g + 1.5}" width="${W - 2 * (o + g + 1.5)}" height="${H - 2 * (o + g + 1.5)}" fill="none" style="stroke:var(--frame-inner, currentColor)" stroke-width="1"/>
  <g style="fill:var(--corner-ink, currentColor)">${c(0, 0)}${c(W - 20, 0)}${c(0, H - 20)}${c(W - 20, H - 20)}</g></svg>`;
}
function ribbon() {
  // mirrors the CSS ribbon: a 200 × 30 band with gold hairlines; tails 14 out and 7 down with a 7px swallowtail
  // notch, and the fold (a small triangle in --ribbon-fold) where each tail turns under the band
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 228 37" role="img" aria-label="Ribbon">
  <title>Kicker ribbon: band, folds and swallowtail tails</title>
  <path style="fill:var(--ribbon-bg, currentColor)" d="M0 7h14v30H0l7-15z M228 7h-14v30h14l-7-15z"/>
  <path style="fill:var(--ribbon-fold, currentColor)" d="M14 30h8l-8 7z M214 30h-8l8 7z"/>
  <rect x="14" y="0" width="200" height="30" style="fill:var(--ribbon-bg, currentColor)"/>
  <path style="fill:var(--ribbon-rule, currentColor)" d="M14 3h200v1H14z M14 26h200v1H14z"/></svg>`;
}
function waterLining() {
  const W = 480;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} 60" role="img" aria-label="Water lining">
  <title>Water lining: a coast line and its engraved echoes</title>
  <g fill="currentColor">
  <rect y="0" width="${W}" height="2"/>
  <rect y="5" width="${W}" height="1" opacity=".8"/>
  <rect y="9" width="${W}" height="1" opacity=".6"/>
  <rect y="14" width="${W}" height="1" opacity=".42"/>
  <rect y="21" width="${W}" height="1" opacity=".26"/></g>
  <g fill="none" stroke="currentColor" stroke-width="1.1" transform="translate(0 34)">
  <path d="${Array.from({ length: W / 20 }, (_, i) => `M${i * 20} 3.6c2.5 0 2.5-2.4 5-2.4s2.5 2.4 5 2.4 2.5-2.4 5-2.4 2.5 2.4 5 2.4`).join("")}"/>
  <path opacity=".55" transform="translate(10 7)" d="${Array.from({ length: W / 20 - 1 }, (_, i) => `M${i * 20} 3.6c2.5 0 2.5-2.4 5-2.4s2.5 2.4 5 2.4 2.5-2.4 5-2.4 2.5 2.4 5 2.4`).join("")}"/>
  <path opacity=".3" transform="translate(0 14)" d="${Array.from({ length: W / 20 }, (_, i) => `M${i * 20} 3.6c2.5 0 2.5-2.4 5-2.4s2.5 2.4 5 2.4 2.5-2.4 5-2.4 2.5 2.4 5 2.4`).join("")}"/></g></svg>`;
}

/* ---------- sheet badges: code + shape + ink ---------- */
const BW = 44, BH = 26;
function badgeInner(id) {
  const s = SHEETS[id], c = PARTS.codes[s.code];
  const [tx, ty] = TEXT_AT[id];
  const x = BW * tx - c.w / 2, y = BH * ty + c.cap / 2;
  const edge = `var(--sheet-${id}-edge, currentColor)`;
  return `<path d="${SHAPES[id](BW - 1.5, BH - 1.5)}" transform="translate(.75 .75)" style="fill:var(--sheet-${id}, currentColor);stroke:${edge};stroke-width:1.5;stroke-linejoin:round"/>` +
    `<path transform="translate(${f(x)} ${f(y)})" style="fill:var(--sheet-${id}-on, Canvas)" d="${c.d}"/>`;
}
const xml = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const badge = (id) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${BW} ${BH}" role="img" aria-label="${xml(`Sheet ${SHEETS[id].n}, ${SHEETS[id].name} (${SHEETS[id].code})`)}"><title>${xml(`Sheet ${SHEETS[id].n} · ${SHEETS[id].name} · ${SHEETS[id].code}`)}</title>${badgeInner(id)}</svg>`;
const sheetSprite = () => `<svg xmlns="http://www.w3.org/2000/svg" style="display:none">${Object.keys(SHEETS).map((id) => `<symbol id="sheet-${id}" viewBox="0 0 ${BW} ${BH}">${badgeInner(id)}</symbol>`).join("")}</svg>`;

/* ---------- chart-symbol icons (24 grid, 2px stroke, round caps; the engine's .i class paints them) ---------- */
const WAVE = (y) => `M2.5 ${y}c1.6 0 1.6-2 3.2-2s1.6 2 3.1 2 1.6-2 3.2-2 1.6 2 3.2 2 1.6-2 3.1-2 1.6 2 3.2 2`;
export const SYMBOLS = {
  anchor: '<circle cx="12" cy="4.6" r="2"/><path d="M12 6.6V21M8.3 9.8h7.4M4.3 13.4c.5 4.2 3.7 7.6 7.7 7.6s7.2-3.4 7.7-7.6M2.8 15.3l1.5-1.9 2 1.2M21.2 15.3l-1.5-1.9-2 1.2"/>',
  landmark: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="1.1"/>',
  flag: '<path d="M5.5 21.5V2.8M5.5 3.8h12.8l-2.9 4.4 2.9 4.4H5.5"/>',
  daymark: '<path d="M12 21.5v-8.8"/><path d="M12 2.8 18.4 12.7H5.6z"/>',
  buoy: `<path d="M8.4 16.2 9.6 7.6h4.8l1.2 8.6M5.8 16.2h12.4M12 7.6V4.2M10 4.2h4"/><path d="${WAVE(20.4)}"/>`,
  compass: '<circle cx="12" cy="12" r="9"/><path d="M12 5.2 14 12l-2 6.8L10 12z"/><path d="M5.2 12h1.6M17.2 12h1.6"/>',
  lighthouse: '<path d="M9.2 21.5 10.4 9.2h3.2l1.2 12.3M8.6 9.2h6.8M10.4 6.6h3.2v2.6h-3.2zM12 4v2.6M6.5 21.5h11M4.4 6.3l2.5.7M19.6 6.3l-2.5.7"/>',
  ferry: '<path d="M3 14.4h18l-2.4 5.1H5.4z"/><path d="M6.2 14.4V10.2h10.6l1.4 4.2M9 10.2V7.3h5v2.9"/>',
  wave: `<path d="${WAVE(9.5)}"/><path d="${WAVE(15.5)}"/>`,
  beach: '<path d="M3.6 11.6a8.4 8.4 0 0 1 16.8 0z"/><path d="M12 11.6v8.6M8 20.6h8"/>',
  palm: '<path d="M12.6 21.5c.3-4.7 0-8.5-1.3-12"/><path d="M11.3 9.5C9.7 6.8 6.1 6 3.6 7.6M11.3 9.5c1-3 4.4-4.4 7.3-3.2M11.3 9.5c2.8-.4 6 1.4 7.2 4.3M11.3 9.5c-2.5.8-4.8 3.4-4.9 6.4"/>',
  course: '<path d="M4.5 19.5 19.5 4.5" stroke-dasharray="2.6 3.2"/><path d="M13 4.5h6.5V11"/>',
  seal: '<path d="M12 2.8l1.9 1.4 2.3-.4.9 2.2 2.2.9-.4 2.3 1.4 1.9-1.4 1.9.4 2.3-2.2.9-.9 2.2-2.3-.4L12 21.2l-1.9-1.4-2.3.4-.9-2.2-2.2-.9.4-2.3L3.7 12l1.4-1.9-.4-2.3 2.2-.9.9-2.2 2.3.4z"/><circle cx="12" cy="12" r="3.2"/>',
  trolley: '<rect x="5" y="4.5" width="14" height="12" rx="2"/><path d="M5 10.5h14M9 20.5l1.5-4M15 20.5l-1.5-4M8.5 2.5h7"/>',
  cigar: '<path d="M3.2 16.9 16.4 6.8a2.4 2.4 0 0 1 3 3.7L6.2 20.6a2.4 2.4 0 0 1-3-3.7z"/><path d="M12.6 9.7l3 3.9M19.6 4.4l1.6-1.6"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
};
const symbolSprite = () => `<svg xmlns="http://www.w3.org/2000/svg" style="display:none">${Object.entries(SYMBOLS).map(([k, v]) => `<symbol id="i-${k}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${v}</symbol>`).join("")}</svg>`;

console.log("writing design/brand:");
put("mark.svg", mark());
put("favicon.svg", favicon());
put("logo.svg", logo());
put("compass.svg", compass());
put("corner.svg", corner());
put("label-frame.svg", labelFrame());
put("ribbon.svg", ribbon());
put("water-lining.svg", waterLining());
for (const id of Object.keys(SHEETS)) put(`sheet-${SHEETS[id].code.toLowerCase()}.svg`, badge(id));
put("sheets.svg", sheetSprite());
put("symbols.svg", symbolSprite());
writeFileSync(join(B, "icons.json"), JSON.stringify(SYMBOLS, null, 1) + "\n");
console.log("  icons.json");
