#!/usr/bin/env node
/* design/tools/contrast.mjs · Tampa Bay Chartbook · design system "Chart & Label"
   Reads design/tokens.css (or the path given), resolves the Day and Night blocks, and checks every pair
   the design uses against WCAG 2.x contrast: 4.5:1 for text (the system has no "large text" exemption:
   labels are 12px), 3:1 for non-text marks that carry meaning (control borders, focus, sheet keylines,
   pin rings, the shoreline). Ornament (gold rules, corner blocks, water lining) is decoration and exempt.
     node design/tools/contrast.mjs            # table + exit 1 on any failure
     node design/tools/contrast.mjs --md       # the full Markdown table for DESIGN.md
     node design/tools/contrast.mjs --sheets   # the compact per-sheet table
   Zero dependencies. */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const file = process.argv.find((a) => a.endsWith(".css")) || join(dirname(fileURLToPath(import.meta.url)), "..", "tokens.css");
const src = readFileSync(file, "utf8");
const MD = process.argv.includes("--md");

function blockOf(sel) {
  const i = src.indexOf(sel + " {");
  if (i < 0) throw new Error(`no ${sel} block in ${file}`);
  const a = src.indexOf("{", i), b = src.indexOf("}", a);
  return src.slice(a + 1, b);
}
function vars(block) {
  const out = {};
  for (const m of block.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/--([\w-]+):\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
}
const day = vars(blockOf(':root[data-theme="light"]'));
const night = vars(blockOf(':root[data-theme="dark"]'));
const noJs = vars(blockOf(":root:not([data-theme])"));

const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
function hex(v, table) {
  let x = v;
  for (let i = 0; i < 5 && /^var\(/.test(x); i++) x = table[x.match(/var\(--([\w-]+)/)[1]];
  if (!/^#[0-9a-f]{6}$/i.test(x || "")) return null;
  return x;
}
const L = (h) => { const [r, g, b] = [1, 3, 5].map((i) => lin(parseInt(h.slice(i, i + 2), 16) / 255)); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const x = L(a), y = L(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

const SHEETS = ["tampa", "stpete", "beaches", "clearwater", "around", "daytrips"];
const T = 4.5, G = 3; // text, graphics
const PAIRS = [
  // [group, fg, bg, min, what]
  ["Text on paper", "text", "bg", T, "body text"], ["Text on paper", "text", "surface", T, "text on cards"], ["Text on paper", "text", "surface-sunken", T, ""],
  ["Text on paper", "text-muted", "bg", T, "secondary text"], ["Text on paper", "text-muted", "surface-alt", T, ""],
  ["Text on paper", "text-faint", "bg", T, "meta, unknowns"], ["Text on paper", "text-faint", "surface", T, ""], ["Text on paper", "text-faint", "surface-alt", T, ""], ["Text on paper", "text-faint", "surface-sunken", T, ""],
  ["Text on paper", "text-muted", "past-bg", T, "past events"],
  ["Links and actions", "link", "bg", T, "links"], ["Links and actions", "link", "surface", T, ""], ["Links and actions", "link", "surface-alt", T, ""], ["Links and actions", "link-hover", "bg", T, ""],
  ["Links and actions", "primary-contrast", "primary", T, "primary button"], ["Links and actions", "accent-contrast", "accent", T, "house-ink button"],
  ["Links and actions", "accent-contrast", "accent-strong", T, "button hover"], ["Links and actions", "accent-strong", "accent-tint", T, "pressed chip, tip callout"],
  ["Links and actions", "accent", "bg", G, "button fill vs paper"], ["Links and actions", "focus", "bg", G, "focus ring"], ["Links and actions", "focus", "surface", G, ""],
  ["Links and actions", "border-strong", "bg", G, "control borders"], ["Links and actions", "border-strong", "surface", G, ""],
  ["Label inks", "magenta-ink", "bg", T, "magenta text"], ["Label inks", "magenta-ink", "magenta-tint", T, ""],
  ["Label inks", "gold-ink", "bg", T, "gold text"], ["Label inks", "gold-ink", "surface", T, ""], ["Label inks", "gold-ink", "gold-tint", T, ""],
  ["Label inks", "gold-leaf-ink", "gold", T, "text on gold (seal, Night ribbon)"],
  ["Label inks", "ribbon-ink", "ribbon-bg", T, "kicker ribbon"], ["Label inks", "seal-ink", "seal", T, "signature seal"],
  ["Label inks", "frame-outer", "bg", G, "label frame outer rule"],
  ["States", "live-ink", "live-tint", T, "live badge"], ["States", "live", "bg", G, "live flare dot"],
  ["States", "success", "success-tint", T, "in-trip badge"], ["States", "success", "bg", T, ""],
  ["States", "warning", "warning-tint", T, "warning badge"], ["States", "warning", "bg", T, ""],
  ["States", "danger", "danger-tint", T, "closed badge"], ["States", "danger", "bg", T, ""],
  ["Map", "map-label", "map-bg", T, "land labels"], ["Map", "map-label-water", "map-water", T, "water labels"],
  ["Map", "map-pin-ink", "map-pin-bg", T, "buoy numbers"], ["Map", "map-cluster-ink", "map-cluster-bg", T, "cluster counts"],
  ["Map", "map-coast", "map-water", G, "shoreline vs water"], ["Map", "map-coast", "map-bg", G, "shoreline vs land"],
  ["Map", "map-cluster-bg", "map-bg", G, "cluster vs land"], ["Map", "map-cluster-bg", "map-water", G, "cluster vs water"],
  ["Map", "map-select-ring", "map-bg", G, "selected ring"], ["Map", "map-pin-ink", "map-bg", G, "buoy outline vs land"],
];
for (const s of SHEETS) {
  PAIRS.push(
    [`Sheet ${s}`, `sheet-${s}-on`, `sheet-${s}`, T, "code on the badge"],
    [`Sheet ${s}`, `sheet-${s}-ink`, "bg", T, "sheet name on paper"],
    [`Sheet ${s}`, `sheet-${s}-ink`, "surface", T, ""],
    [`Sheet ${s}`, `sheet-${s}-ink`, `sheet-${s}-tint`, T, "on its tint"],
    [`Sheet ${s}`, "text", `sheet-${s}-tint`, T, "body text on the tint"],
    [`Sheet ${s}`, `sheet-${s}-edge`, "bg", G, "keyline on paper"],
    [`Sheet ${s}`, `sheet-${s}-edge`, "surface", G, ""],
    [`Sheet ${s}`, `sheet-${s}-edge`, "map-bg", G, "buoy ring on land"],
    [`Sheet ${s}`, `sheet-${s}-edge`, "map-water", G, "buoy ring on water"],
  );
}

let fails = 0;
const rows = [];
for (const [group, fg, bg, min, what] of PAIRS) {
  const r = {};
  for (const [ed, tbl] of [["day", day], ["night", night]]) {
    const a = hex(tbl[fg] || "", tbl), b = hex(tbl[bg] || "", tbl);
    if (!a || !b) { r[ed] = null; fails++; console.error(`missing ${ed}: --${fg} or --${bg}`); continue; }
    r[ed] = { a, b, v: ratio(a, b) };
    if (r[ed].v < min) { fails++; console.error(`FAIL ${ed}: --${fg} ${a} on --${bg} ${b} = ${r[ed].v.toFixed(2)} (< ${min})`); }
  }
  rows.push({ group, fg, bg, min, what, ...r });
}
// the no-JS Night block must equal the toggle's Night block
for (const k of new Set([...Object.keys(night), ...Object.keys(noJs)])) if (night[k] !== noJs[k]) { fails++; console.error(`no-JS Night block differs at --${k}`); }

if (process.argv.includes("--sheets")) {
  // compact per-sheet table: the pairs that matter for a sheet ink, both editions
  const get = (ed, fg, bg) => rows.find((r) => r.fg === fg && r.bg === bg)?.[ed];
  const out = ["| Sheet | Edition | fill | -ink | -tint | code on fill | name on paper | name on tint | keyline on paper | ring on water |", "|---|---|---|---|---|---:|---:|---:|---:|---:|"];
  for (const s of SHEETS) for (const ed of ["day", "night"]) {
    const t = ed === "day" ? day : night, v = (x) => x.v.toFixed(2);
    out.push(`| ${s} | ${ed === "day" ? "Day" : "Night"} | \`${t[`sheet-${s}`]}\` | \`${t[`sheet-${s}-ink`]}\` | \`${t[`sheet-${s}-tint`]}\` | ${v(get(ed, `sheet-${s}-on`, `sheet-${s}`))} | ${v(get(ed, `sheet-${s}-ink`, "bg"))} | ${v(get(ed, `sheet-${s}-ink`, `sheet-${s}-tint`))} | ${v(get(ed, `sheet-${s}-edge`, "bg"))} | ${v(get(ed, `sheet-${s}-edge`, "map-water"))} |`);
  }
  console.log(out.join("\n"));
} else if (MD) {
  let g = "";
  const out = ["| Pair | Use | Min | Day chart | Night chart |", "|---|---|---:|---:|---:|"];
  for (const r of rows) {
    if (r.group !== g) { out.push(`| **${r.group}** | | | | |`); g = r.group; }
    const c = (x) => (x ? `${x.v.toFixed(2)} · \`${x.a}\`/\`${x.b}\`` : "–");
    out.push(`| \`--${r.fg}\` on \`--${r.bg}\` | ${r.what} | ${r.min}:1 | ${c(r.day)} | ${c(r.night)} |`);
  }
  console.log(out.join("\n"));
} else {
  for (const r of rows) console.log(`${r.group.padEnd(18)} --${r.fg.padEnd(20)} on --${r.bg.padEnd(18)} min ${r.min}  day ${r.day ? r.day.v.toFixed(2).padStart(6) : "  –   "}  night ${r.night ? r.night.v.toFixed(2).padStart(6) : "  –"}`);
  const vals = rows.flatMap((r) => [r.day?.v, r.night?.v]).filter(Boolean);
  console.log(`\n${rows.length} pairs × 2 editions, lowest ${Math.min(...vals).toFixed(2)}:1, ${fails ? fails + " failures" : "all pass"}`);
}
process.exit(fails ? 1 : 0);
