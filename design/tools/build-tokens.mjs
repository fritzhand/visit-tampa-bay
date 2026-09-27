#!/usr/bin/env node
/* design/tools/build-tokens.mjs · Tampa Bay Chartbook · design system "Chart & Label"
   Writes design/tokens.css from palette.mjs (colors) and shapes.mjs (sheet silhouettes).
   The Night block is written twice (the toggle's :root[data-theme="dark"] and the no-JS
   prefers-color-scheme block) from one table, so the two can never drift.
     node design/tools/build-tokens.mjs && node design/tools/contrast.mjs
   Zero dependencies (Node >= 18). */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DAY as d, NIGHT as n, SHEETS, sheetInks } from "./palette.mjs";
import { SHAPES } from "./shapes.mjs";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "tokens.css");
const S = sheetInks();
const rgbA = (hex, a) => `rgb(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(" ")} / ${a})`;
const svgUri = (svg) => `url("data:image/svg+xml,${encodeURIComponent(svg.replace(/\s+/g, " ").trim())}")`;

/* ---------- masks (alpha only: painted with a token through background-color + mask) ---------- */
const MASK = {
  // corner star: a four-point compass star with a pierced center (evenodd), 20 × 20, centered on each frame corner
  corner: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'><path fill-rule='evenodd' d='M10 0l1.9 7.2L19.9 10l-8 2.8L10 20l-1.9-7.2L.1 10l8-2.8z M10 8.3a1.7 1.7 0 1 0 0 3.4a1.7 1.7 0 1 0 0-3.4z'/></svg>`,
  // a single engraved ripple, tiled horizontally (20 × 6)
  ripple: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 6'><path d='M0 3.6c2.5 0 2.5-2.4 5-2.4s2.5 2.4 5 2.4 2.5-2.4 5-2.4 2.5 2.4 5 2.4' fill='none' stroke='black' stroke-width='1.1'/></svg>`,
  // compass rose silhouette for watermarks on plates (64 × 64): 8 points + ring
  rose: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><circle cx='32' cy='32' r='22' fill='none' stroke='black' stroke-width='1.2'/><circle cx='32' cy='32' r='19.5' fill='none' stroke='black' stroke-width='.6'/><path d='M32 2l4.2 25.8L62 32l-25.8 4.2L32 62l-4.2-25.8L2 32l25.8-4.2z'/><path d='M32 14l2.6 15.4L50 32l-15.4 2.6L32 50l-2.6-15.4L14 32l15.4-2.6z' transform='rotate(45 32 32)'/></svg>`,
};

/* ---------- the sheet dots: clip-path path() in an 18 × 12 px box ---------- */
const DOT = Object.fromEntries(Object.keys(SHEETS).map((id) => [id, `path("${SHAPES[id](18, 12)}")`]));

/* ---------- color blocks ---------- */
function block(e, night) {
  const sheet = night ? "night" : "day";
  const L = [];
  const t = (name, v, c = "") => L.push(`  --${name}: ${v};${c ? `  /* ${c} */` : ""}`);
  const h = (s) => L.push(`\n  /* ${s} */`);
  h("paper and ink");
  t("bg", e.bg, night ? "deep bay navy" : "cream chart paper");
  t("surface", e.surface); t("surface-alt", e.surfaceAlt); t("surface-sunken", e.surfaceSunken); t("past-bg", e.pastBg);
  t("border", e.border); t("border-strong", e.borderStrong, "3:1 on paper: chips, fields, frames of controls");
  t("rule-ink", e.text); t("text", e.text, night ? "cream ink" : "chart navy"); t("text-muted", e.textMuted); t("text-faint", e.textFaint);
  h(night ? "actions and the house ink: gold (Night chart)" : "actions and the house ink: chart magenta (Day chart)");
  t("primary", e.text); t("primary-contrast", night ? e.bg : e.surface);
  if (!night) {
    t("accent", e.magenta); t("accent-strong", e.magentaInk); t("accent-contrast", e.surface); t("accent-tint", e.magentaTint);
    t("link", e.magentaInk); t("link-hover", e.magentaDeep); t("focus", e.magenta);
  } else {
    t("accent", e.gold); t("accent-strong", e.goldInk); t("accent-contrast", e.bg); t("accent-tint", e.goldTint);
    t("link", e.goldInk); t("link-hover", e.text); t("focus", e.gold);
  }
  h("the two label inks: chart magenta and cigar gold (ornament, signature, courses, the live flare)");
  t("magenta", e.magenta); t("magenta-ink", e.magentaInk); t("magenta-tint", e.magentaTint);
  t("gold", e.gold, "ornament fill only (never text on paper in the Day chart)"); t("gold-ink", e.goldInk, "gold as text: 4.5:1 on paper");
  t("gold-tint", e.goldTint);
  t("gold-leaf", `linear-gradient(100deg, ${e.goldLo} 0%, ${e.goldHi} 34%, ${e.gold} 50%, ${e.goldHi} 66%, ${e.goldLo} 100%)`, "foil: masthead rule, signature seal; sparingly");
  t("gold-leaf-ink", night ? e.bg : e.text, "text on gold or gold leaf");
  h("states (always a word too, never color alone)");
  t("success", e.success); t("success-tint", e.successTint);
  t("warning", e.warning); t("warning-tint", e.warningTint); t("warning-edge", e.warningEdge);
  t("danger", e.danger); t("danger-tint", e.dangerTint);
  t("live", e.magenta, "the live flare: a lit light is magenta on a chart"); t("live-tint", e.magentaTint); t("live-ink", e.magentaInk);
  t("soon", e.text);
  h("shell surfaces (engine names)");
  t("hero-bg", e.bg); t("hero-text", e.text); t("hero-muted", e.textMuted);
  t("sidebar-bg", night ? e.surfaceSunken : e.surfaceAlt);
  t("topbar-bg", rgbA(e.bg, 0.92)); t("dock-bg", rgbA(e.bg, 0.96));
  t("code-bg", e.surfaceAlt); t("kbd-bg", night ? e.surfaceAlt : e.surface);
  t("scrim", night ? rgbA(e.surfaceSunken, 0.78) : rgbA(d.navyDeep, 0.52));
  t("plate", "#ffffff", "logo plates (org logos keep their own colors)"); t("plate-dark", "#000000");
  t("plate-border", e.border); t("plate-ink", d.text); t("plate-dark-ink", "#ffffff");
  t("theme-color", e.bg);
  h("ornaments: label frame, ribbon, water lining, graticule, seal");
  t("frame-outer", night ? e.gold : e.text, "outer rule of the label frame (2px)");
  t("frame-inner", night ? e.goldLo : e.gold, "inner hairline (1px)");
  t("corner-ink", night ? e.gold : e.gold, "corner blocks");
  t("ribbon-bg", night ? e.gold : e.text); t("ribbon-ink", night ? e.bg : e.surface);
  t("ribbon-fold", night ? e.goldDeep : d.navyDeep, "the tails' shadowed fold"); t("ribbon-rule", night ? e.goldHi : e.gold, "hairlines inside the band");
  t("fold-shade", night ? e.surfaceSunken : d.navyDeep, "mixed into a sheet ink for a ribbon's fold (color-mix)");
  t("water-line", e.waterLine, "the engraved echo lines under a coast or a rule");
  t("grat-ink", e.text); t("grat-paper", e.surface);
  t("seal", e.gold); t("seal-ink", night ? e.bg : e.text);
  h("sheet inks: fill (badges, stripes, pin rings) · -ink (text on paper and tint) · -on (text on fill) · -tint (quiet ground) · -edge (keyline, 3:1)");
  for (const id of Object.keys(SHEETS)) {
    const s = S[id][sheet];
    L.push(`  --sheet-${id}: ${s.fill}; --sheet-${id}-ink: ${s.ink}; --sheet-${id}-on: ${s.on}; --sheet-${id}-tint: ${s.tint}; --sheet-${id}-edge: ${s.edge};  /* ${SHEETS[id].n} ${SHEETS[id].code} ${SHEETS[id].name} · ${SHEETS[id].word} */`);
  }
  h("map: land, water with water lining, roads, labels, buoys, clusters");
  const m = e.map;
  t("map-bg", m.land, "land (the paper of the chart)"); t("map-land", m.land); t("map-water", m.water);
  t("map-water-line", m.waterLine, "water lining strokes"); t("map-water-edge", m.waterEdge, "first echo, hugging the coast");
  t("map-coast", m.coast, "the shoreline"); t("map-park", m.park); t("map-sand", m.sand, "beaches");
  t("map-road-minor", m.roadMinor); t("map-road", m.road); t("map-road-major", m.roadMajor, "highways and bridges in label gold"); t("map-casing", m.casing);
  t("map-rail", e.text); t("map-label", m.label); t("map-label-water", m.labelWater, "water names, italic, as on a chart"); t("map-label-halo", m.halo);
  t("map-pin-ink", e.text); t("map-pin-bg", e.surface);
  t("map-cluster-bg", night ? e.gold : e.text); t("map-cluster-ink", night ? e.bg : e.surface); t("map-cluster-ring", night ? e.goldHi : e.gold);
  t("map-graticule", m.graticule); t("map-select-ring", e.magenta);
  h("elevation: flat by default; rules do the structural work, shadows only float things");
  if (!night) {
    t("shadow-1", `0 1px 0 ${rgbA(d.text, 0.07)}`);
    t("shadow-2", `0 10px 24px -12px ${rgbA(d.text, 0.32)}, 0 2px 6px -2px ${rgbA(d.text, 0.1)}`);
    t("shadow-3", `0 24px 48px -16px ${rgbA(d.text, 0.4)}, 0 6px 14px -6px ${rgbA(d.text, 0.14)}`);
  } else {
    t("shadow-1", `0 1px 0 ${rgbA("#000000", 0.4)}`);
    t("shadow-2", `0 10px 24px -12px ${rgbA("#000000", 0.7)}, 0 2px 6px -2px ${rgbA("#000000", 0.5)}`);
    t("shadow-3", `0 24px 48px -16px ${rgbA("#000000", 0.8)}, 0 6px 14px -6px ${rgbA("#000000", 0.5)}`);
    h("type compensation: light text on a dark ground reads heavier");
    t("wght-body", 380); t("wght-head", 680);
  }
  return L.join("\n");
}

const fontFace = (fam, file, style, wght, range, extra = "") =>
  `@font-face {\n  font-family: "${fam}"; font-style: ${style}; font-weight: ${wght};${extra} font-display: swap;\n  src: url("fonts/${file}") format("woff2");\n  unicode-range: ${range};\n}`;
const LATIN = "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD";
const EXT = "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF";

const faces = [
  ["Bodoni Moda", "bodoni-moda-roman-latin.woff2", "normal", "500 900", LATIN],
  ["Bodoni Moda", "bodoni-moda-roman-latin-ext.woff2", "normal", "500 900", EXT],
  ["Bodoni Moda", "bodoni-moda-italic-latin.woff2", "italic", "500 900", LATIN],
  ["Bodoni Moda", "bodoni-moda-italic-latin-ext.woff2", "italic", "500 900", EXT],
  ["Figtree", "figtree-roman-latin.woff2", "normal", "300 900", LATIN],
  ["Figtree", "figtree-roman-latin-ext.woff2", "normal", "300 900", EXT],
  ["Figtree", "figtree-italic-latin.woff2", "italic", "300 800", LATIN],
  ["Figtree", "figtree-italic-latin-ext.woff2", "italic", "300 800", EXT],
  ["Archivo", "archivo-roman-latin.woff2", "normal", "500 800", LATIN, " font-stretch: 100% 125%;"],
  ["Archivo", "archivo-roman-latin-ext.woff2", "normal", "500 800", EXT, " font-stretch: 100% 125%;"],
].map((a) => fontFace(...a)).join("\n");

const sheetGeometry = Object.entries(SHEETS).map(([id, s]) =>
  `  --sheet-${id}-code: "${s.code}"; --sheet-${id}-n: "${s.n}"; --sheet-${id}-shape: ${DOT[id]};`).join("\n");

const dayBlock = block(d, false), nightBlock = block(n, true);

const css = `/* ======================================================================
   tokens.css · Tampa Bay Chartbook · design system "Chart & Label"
   A nautical chartbook printed like an Ybor City cigar-box label.
   Navy ink on cream chart paper; chart magenta for the house ink (links, focus, the live flare);
   cigar gold for ornament; one ink per sheet (region), always with its code and shape.

   Drop-in for the Cincy Week engine (site/css/tokens.css), same structure and token names:
     1. @font-face        self-hosted woff2 (SIL OFL 1.1), latin + latin-ext, + metric-matched fallbacks
     2. :root             non-color tokens: type, space, layout, shape, rules, ornaments, sheets, masks, motion
     3. :root, [data-theme="light"]   Day chart (default)
     4. [data-theme="dark"]           Night chart
     5. @media (prefers-color-scheme: dark) :root:not([data-theme])   the Night chart again, for readers without JS
   GENERATED by design/tools/build-tokens.mjs from palette.mjs and shapes.mjs. Edit those, not this file.
   Contrast is checked by design/tools/contrast.mjs (the table is in design/DESIGN.md §4).
   The partials read ONLY these custom properties. No color literal may appear anywhere else.
   Font URLs are relative to this file (served as docs/assets/tokens.css next to docs/assets/fonts/).
   ====================================================================== */

/* ---------- 1. fonts: files live in fonts/ next to this file ---------- */
/* Bodoni Moda (display): opsz axis clamped to 11–28 in the file, so headings never go hairline-thin on screens.
   Figtree (text and UI). Archivo (labels and numerals): wdth 100–125, set expanded for spaced caps. */
${faces}
/* metric-matched fallbacks (design/tools/fonts.py --metrics): text does not reflow when the web fonts swap in */
@font-face {
  font-family: "Figtree Fallback";
  src: local("Arial"), local("Liberation Sans"), local("Arimo"), local("Helvetica Neue"), local("Helvetica");
  size-adjust: 101.53%; ascent-override: 93.57%; descent-override: 24.62%; line-gap-override: 0%;
}
@font-face {
  font-family: "Bodoni Moda Fallback";
  src: local("Times New Roman Bold"), local("TimesNewRomanPS-BoldMT"), local("Liberation Serif Bold"), local("Tinos Bold"), local("Times New Roman"), local("Liberation Serif");
  size-adjust: 113.36%; ascent-override: 99.24%; descent-override: 35.29%; line-gap-override: 0%;
}
@font-face {
  font-family: "Archivo Fallback";
  src: local("Arial Bold"), local("Arial-BoldMT"), local("Liberation Sans Bold"), local("Arimo Bold"), local("Arial"), local("Liberation Sans");
  size-adjust: 105.97%; ascent-override: 82.85%; descent-override: 19.82%; line-gap-override: 0%;
}

/* ---------- 2. non-color tokens ---------- */
:root {
  /* families */
  --font-display: "Bodoni Moda", "Bodoni Moda Fallback", "Didot", "Bodoni 72", "Iowan Old Style", Georgia, serif;
  --font-body: "Figtree", "Figtree Fallback", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --font-label: "Archivo", "Archivo Fallback", "Arial", sans-serif;   /* caps labels, kickers, badges, codes, numerals */
  --font-mono: ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;
  --fonts-href: none;            /* self-hosted: the shell preloads the files below instead of a Google CSS link */
  --fonts-preload: "fonts/figtree-roman-latin.woff2 fonts/bodoni-moda-roman-latin.woff2 fonts/archivo-roman-latin.woff2";
  --label-stretch: 108%;         /* Archivo width for 12px caps labels (font-stretch) */
  --label-stretch-wide: 125%;    /* ribbons, the masthead's TAMPA BAY, sheet codes */

  /* type scale (16px root; fluid sizes clamp between 390 and 1440 px). The floor is 12px: nothing is smaller. */
  --fs-label: 0.75rem;           /* 12px expanded caps: labels, badges, kickers, codes */
  --fs-xs: 0.8125rem;            /* 13px meta lines, captions, credits */
  --fs-sm: 0.875rem;             /* 14px secondary text, chips, nav */
  --fs-base: 1rem;               /* 16px body, UI */
  --fs-md: 1.1875rem;            /* 19px card titles (Bodoni) */
  --fs-lg: 1.4375rem;            /* 23px h3, deks on desktop */
  --fs-xl: clamp(1.625rem, 1.3rem + 1.35vw, 2.375rem);   /* h2 26 to 38 */
  --fs-2xl: clamp(2.125rem, 1.45rem + 2.8vw, 3.75rem);   /* h1 34 to 60 */
  --fs-3xl: clamp(3rem, 1.85rem + 5.2vw, 6.5rem);        /* masthead 48 to 104 (usually the outlined SVG) */
  --fs-numeral: clamp(2.25rem, 1.8rem + 1.9vw, 3.5rem);  /* Bodoni stat numerals and date blocks */
  --fs-time: 1rem;               /* times, tabular */
  --fs-daynum: 1.5rem;           /* day numerals in date tabs (Bodoni) */

  --lh-tight: 1.02; --lh-head: 1.08; --lh-snug: 1.24; --lh-body: 1.6; --lh-ui: 1.35;

  --wght-body: 400;              /* Night chart drops to 380 */
  --wght-ui: 500;
  --wght-strong: 650;            /* Figtree is variable (300–900) */
  --wght-head: 700;              /* Bodoni Moda headlines (500–900); Night chart 680 */
  --wght-mast: 880;
  --wght-label: 680;             /* Archivo caps */
  --track-label: 0.12em; --track-label-wide: 0.26em; --track-head: -0.004em; --track-mast: -0.012em;

  /* space (4px base) */
  --sp-1: 4px; --sp-2: 8px; --sp-3: 12px; --sp-4: 16px; --sp-5: 24px;
  --sp-6: 32px; --sp-7: 48px; --sp-8: 64px; --sp-9: 96px;
  --gutter: clamp(16px, 3.4vw, 40px);   /* 16px side gutter on phones */
  --col-gap: clamp(16px, 2.2vw, 28px);
  --measure: 66ch;

  /* layout (engine contract names) */
  --tap: 44px;                   /* minimum touch target, everywhere */
  --topbar-h: 60px;
  --sidebar-w: 272px;
  --dock-h: 64px;
  --content-max: 1220px;
  --sched-bar-h: 76px;           /* sticky filter bar on What's On */
  --rail-time-w: 84px;
  --map-pin: 30px;               /* visible buoy height; hit area is always --tap */
  --map-buoy-w: 26px;            /* the numbered can buoy */
  --map-cluster: 40px;           /* the cluster medallion */

  /* shape: square-cut like a printed label; concave "cartouche" notches only on plates and frames;
     pills only for the live pill and switches; circles only for buoys and the compass */
  --radius-xs: 1px; --radius-sm: 2px; --radius-md: 3px; --radius-lg: 6px; --radius-pill: 999px;
  --notch: 10px;                 /* concave corner radius of the cartouche (plates, frames) */

  /* rules: the main structural device */
  --rule-hair: 1px;              /* between items and columns */
  --rule-mid: 2px;               /* the coast line of a water-lining rule, input underlines */
  --rule-heavy: 4px;             /* facts panels, tables */
  --stripe-w: 5px;               /* sheet stripe on cards */
  --line-w: 6px;                 /* month lanes on What's On */

  /* ornaments */
  --frame-w: 2px;                /* label frame: outer rule */
  --frame-inner-w: 1px;          /* label frame: inner hairline */
  --frame-gap: 5px;              /* space between the two rules */
  --corner: 20px;                /* corner star size (a four-point compass star, centered on the outer rule's corner) */
  --ribbon-h: 30px;              /* kicker ribbon band height */
  --ribbon-tail: 14px;           /* how far each tail sticks out */
  --ribbon-notch: 7px;           /* swallowtail cut depth */
  --wl-h: 22px;                  /* water-lining rule: coast line + four echoes (2, 5, 9, 14, 21 px) */
  --grat-w: 5px;                 /* graticule tick band width */
  --grat-step: 24px;             /* one tick (alternating ink / paper) */

  /* sheet geometry: every sheet is code + shape + ink (+ its name in text) */
${sheetGeometry}

  /* masks: alpha sources only (painted with a color token through background-color + mask) */
  --mask-ink: #000;
  --mask-corner: ${svgUri(MASK.corner)};
  --mask-ripple: ${svgUri(MASK.ripple)};
  --mask-rose: ${svgUri(MASK.rose)};

  /* effect toggles */
  --photo-filter: none;          /* e.g. sepia(.15) to unify a grid of archival photos */

  /* motion */
  --ease: cubic-bezier(0.2, 0.7, 0.2, 1);
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --speed: 160ms;                /* hovers, toggles */
  --speed-slow: 280ms;           /* drawer, dialogs, sheets */
  --pulse: 2400ms;               /* the live flare; 0s under reduced motion */

  /* stacking */
  --z-sticky: 40; --z-topbar: 60; --z-dock: 65; --z-scrim: 69; --z-drawer: 70; --z-modal: 80; --z-toast: 90;
}

/* ================= LIGHT · Day chart (default) ================= */
:root,
:root[data-theme="light"] {
  color-scheme: light;
${dayBlock}
}

/* ================= DARK · Night chart ================= */
:root[data-theme="dark"] {
  color-scheme: dark;
${nightBlock}
}

/* ============ Night chart for readers without JS (generated from the same table as the block above) ============ */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme]) {
    color-scheme: dark;
${nightBlock.split("\n").map((l) => (l ? "  " + l : l)).join("\n")}
  }
}

/* ============ reduced motion: every duration collapses, the flare stops ============ */
@media (prefers-reduced-motion: reduce) {
  :root { --speed: 0.01ms; --speed-slow: 0.01ms; --pulse: 0s; }
}
`;
writeFileSync(OUT, css);
console.log(`wrote ${OUT} (${(css.length / 1024).toFixed(1)} KB)`);
