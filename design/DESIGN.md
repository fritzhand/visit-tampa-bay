# Chart & Label — the design system of Tampa Bay Chartbook

Status: **v1, Sep 27, 2026.** Owner of this folder: the design lane (DA). The engine lane ports `design/tokens.css` to
`site/css/tokens.css`, `design/fonts/` to `site/fonts/`, `design/brand/` to `site/img/brand/` and the specimen's CSS
recipes into the partials (§14). The concept is fixed by `SPEC.md` §3; this file fixes everything else.

Open `design/specimen.html` over http (`node design/tools/shots.cjs` serves and renders it) to see every piece in both
editions; the renders are in `design/shots/`.

---

## 1. Concept

**A nautical chartbook printed like an Ybor City cigar-box label.**

A chartbook is the bound set of charts a skipper keeps for one body of water: one numbered sheet per stretch of coast,
each with a title block, a neatline, a compass rose and coastlines drawn with *water lining* (the engraved ripple echo
that follows a shore on old charts). Tampa made cigar labels by the million; the lithographed label, with its gold,
its double-ruled frames, its ribbons, cartouches and fat-face lettering, is the region's own graphic art.

The site takes its **structure** from the chart (sheets, codes, symbols, neatlines, water lining) and its **finish**
from the label (cream stock, gold, ornament, Didone lettering, ribbons). Two rules keep that honest:

1. **Ornament is drawn, never pictured.** Every frame, rose, ripple and seal is SVG or CSS painted with tokens. No
   paper, parchment, wood or foil texture images, ever.
2. **Chart linework is decoration, never data.** No soundings, depth contours, buoy numbers, light characteristics or
   coordinates that could be read as navigation information. Where a map shows latitude and longitude, the numbers are
   computed from its real georeference. The masthead says it plainly: *Not for navigation*.

How it differs from Cincy Week's "Interchange": that was a newspaper routed like a transit map (Newsreader, Public Sans,
Oxford rules, transit bullets, newsprint). Chartbook is centered, framed and engraved: Didone display type, expanded
caps, double rules with corner stars, ribbons, cartouche plates, water lining, buoys. Only the engine and its rigor carry
over.

## 2. Editions

| | **Day chart** (light, default) | **Night chart** (dark) |
|---|---|---|
| Ground | cream chart paper `#f6ecd5`, cards `#fcf8eb` | deep bay navy `#0c1d34`, cards `#13263e` |
| Ink | chart navy `#12264c` | cream `#f5ecd7` |
| House ink (links, focus, primary action) | chart magenta `#a7186f` / `#8d0e5d` | cigar gold `#e9bb5b` / `#f0d186` |
| Ornament | cigar gold `#c5953b` (never text on cream) | the same gold, brighter |
| Live flare | magenta | light magenta `#ee8ab2` |
| `--theme-color` | `#f6ecd5` | `#0c1d34` |

Light is the default. Dark follows `prefers-color-scheme` and the toggle (`:root[data-theme="dark"]`); tokens.css
repeats the Night block under `@media (prefers-color-scheme: dark) { :root:not([data-theme]) }` for readers without JS
(generated from the same table, so the two cannot drift; `contrast.mjs` checks they are equal). The Night chart drops
body weight to 380 and headline weight to 680 (light type on a dark ground reads heavier).

## 3. Sheets: code + shape + ink

The region is six sheets. A sheet is always shown as **its code, its shape and its ink, with its name in text nearby**,
so it never depends on color (the shapes differ in silhouette, not only in hue).

| No. | Sheet | Code | Shape | Why the shape | Ink (Day / Night fill) |
|---:|---|---|---|---|---|
| 1 | Tampa | **TP** | cartouche (concave corners) | the cigar-box label panel | Ybor brick `#af3436` / `#f6787f` |
| 2 | St. Petersburg | **SP** | roundel (ellipse) | the sun (the city calls itself the Sunshine City) | sunshine orange `#9b4f00` / `#fd9958` |
| 3 | Gulf Beaches | **GB** | lozenge (long hexagon) | a chart's range marker | Gulf turquoise `#007678` / `#6dd2cb` |
| 4 | Clearwater & North Pinellas | **CW** | shield | an escutcheon | sponge-dock blue `#2668ab` / `#81b4f6` |
| 5 | Around the Bay | **AB** | slant (parallelogram) | the drive around the bay | palmetto green `#3f7632` / `#94d186` |
| 6 | Day Trips | **DT** | burgee (swallowtail pennant) | setting out | sunset violet `#7052a6` / `#bfa4f0` |

Each sheet has five inks per edition, `--sheet-<id>{,-ink,-on,-tint,-edge}` with ids `tampa stpete beaches clearwater
around daytrips` (the region ids of `research/tools/schema.mjs`):

- `--sheet-<id>` **fill**: badges, stripes, the band of a buoy, a sheet ribbon. Day L 0.51, Night L 0.72–0.80 (OKLCH).
- `-ink`: the sheet's name or kicker as text on paper and on its tint (≥ 4.5:1 on both).
- `-on`: text on the fill (Day cream, Night bay navy).
- `-tint`: quiet ground (pressed chip, plate, quote callout).
- `-edge`: keyline (≥ 3:1 on paper and on map water); equal to the fill.

Non-color sheet tokens (in `:root`): `--sheet-<id>-code: "TP"`, `--sheet-<id>-n: "1"`, `--sheet-<id>-shape:
path(…)` (an 18 × 12 px clip path for the sheet dot).

**Scope rule** (replaces Cincy's `[data-prog]`): one rule per sheet maps the five inks to local names, and components
read only the locals:

```css
:root { --ink-fill: var(--rule-ink); --ink-text: var(--text); --ink-on: var(--primary-contrast); --ink-tint: var(--surface-alt); --ink-edge: var(--rule-ink); --ink-shape: inset(0); }
[data-sheet="tampa"] { --ink-fill: var(--sheet-tampa); --ink-text: var(--sheet-tampa-ink); --ink-on: var(--sheet-tampa-on);
  --ink-tint: var(--sheet-tampa-tint); --ink-edge: var(--sheet-tampa-edge); --ink-shape: var(--sheet-tampa-shape); }
/* … one per sheet */
```

**Badge sizes.** The sheet badge (`brand/sheets.svg`, symbols `#sheet-<id>`, viewBox 44 × 26) is never shown smaller
than **24 px tall** (its code is then 12 px, the floor): `.sheet-badge` 40 × 24, `.lg` 56 × 33. Below that size use the
**sheet dot** (`.sheet-dot`, the silhouette alone, 18 × 12) and always next to the sheet's name. A ribbon never contains
a badge (its text already names the sheet).

Hue spacing (OKLab distance between fills): the closest pair is Tampa / St. Petersburg in the Day chart (0.084) and
Clearwater / Day Trips in the Night chart (0.085); every Day fill is at least 0.11 from chart magenta and every Night
fill at least 0.09 from the Night gold (St. Petersburg's orange is the nearest, one reason gold never marks a sheet).
Hue alone is never the only difference: shape and code always come with it.

## 4. Color

All values live in `design/tokens.css` (generated by `design/tools/build-tokens.mjs` from `design/tools/palette.mjs`,
where every color is defined in OKLCH so ramps step evenly). Token names are Cincy Week's, so the partials port.

### 4.1 Core

| Token | Day | Night | Use |
|---|---|---|---|
| `--bg` | `#f6ecd5` | `#0c1d34` | page ground |
| `--surface` | `#fcf8eb` | `#13263e` | cards, frames, fields |
| `--surface-alt` | `#eee2c8` | `#1d2f47` | hover, sidebar (Day) |
| `--surface-sunken` | `#e6d8bc` | `#07162a` | disabled, sidebar (Night) |
| `--border` / `--border-strong` | `#d6c7ac` / `#63768f` | `#304157` / `#74889e` | hairlines / control borders (3:1) |
| `--text` = `--rule-ink` | `#12264c` | `#f5ecd7` | ink, rules |
| `--text-muted` / `--text-faint` | `#364865` / `#4d5d76` | `#d6cdb8` / `#bab09c` | secondary / meta and unknowns |
| `--accent` / `--accent-strong` | `#a7186f` / `#8d0e5d` | `#e9bb5b` / `#f0d186` | house ink: primary action, pressed chip |
| `--link` / `--focus` | `#8d0e5d` / `#a7186f` | `#f0d186` / `#e9bb5b` | links, focus ring |
| `--magenta` / `--magenta-ink` / `--magenta-tint` | `#a7186f` / `#8d0e5d` / `#fbdfeb` | `#ee8ab2` / `#f6a0c1` / `#482232` | courses, the live flare |
| `--gold` / `--gold-ink` / `--gold-tint` | `#c5953b` / `#7f5714` / `#f2e1be` | `#e9bb5b` / `#f0d186` / `#412f0d` | ornament / gold as text / designation boxes |
| `--gold-leaf` | gradient | gradient | foil: the signature seal, rare masthead rules |
| `--success` `--warning` `--danger` | `#006c4d` `#8d5406` `#ac2724` | `#7cd2ae` `#f7c473` `#fe8b83` | states (always with a word) |

Ornament tokens: `--frame-outer --frame-inner --corner-ink --ribbon-bg --ribbon-ink --ribbon-fold --ribbon-rule
--fold-shade --water-line --grat-ink --grat-paper --seal --seal-ink`. Map tokens: §9. Shell tokens keep Cincy's names
(`--hero-* --sidebar-bg --topbar-bg --dock-bg --code-bg --kbd-bg --scrim --plate*`).

Rules of use:
- **Gold is ornament.** `--gold` on cream is 2.3:1: never text on paper. Gold as text is `--gold-ink`. Text on gold is
  `--gold-leaf-ink` (navy in Day, bay navy at Night, 5.5 and 9.5:1).
- **Magenta is the chart's note color**: links, focus, the primary action ("Add to My Trip"), passages (course lines)
  and the live flare (a lit light is magenta on a chart). Nothing else.
- **A sheet ink marks that sheet's identity only**: never a state, never a link.

### 4.2 Contrast (WCAG 2.x, computed from tokens.css by `node design/tools/contrast.mjs`)

Thresholds: **4.5:1 for all text** (the system has no large-text exemption: labels are 12 px) and **3:1 for non-text
marks that carry meaning** (control borders, focus ring, sheet keylines, buoy rings, the shoreline, clusters).
Ornament (gold rules, corner stars, water lining, ripples) is decoration and exempt. 104 pairs × 2 editions; **all
pass; the lowest is 3.78:1** (the Gulf Beaches keyline on Day map water, a 3:1 pair). The lowest text pair is 4.75:1
(`--text-faint` on `--surface-sunken`, Day).

**Sheet inks**

| Sheet | Edition | fill | -ink | -tint | code on fill | name on paper | name on tint | keyline on paper | ring on water |
|---|---|---|---|---|---:|---:|---:|---:|---:|
| tampa | Day | `#af3436` | `#95282b` | `#fededb` | 5.87 | 6.83 | 6.38 | 5.31 | 4.33 |
| tampa | Night | `#f6787f` | `#ffa5a9` | `#482426` | 6.38 | 9.03 | 7.20 | 6.38 | 6.76 |
| stpete | Day | `#9b4f00` | `#834100` | `#fae1cf` | 5.63 | 6.57 | 6.15 | 5.09 | 4.16 |
| stpete | Night | `#fd9958` | `#ffb27f` | `#462814` | 7.96 | 9.61 | 7.58 | 7.96 | 8.43 |
| beaches | Day | `#007678` | `#006365` | `#cceeee` | 5.12 | 6.01 | 5.73 | 4.63 | 3.78 |
| beaches | Night | `#6dd2cb` | `#8bd8d2` | `#003936` | 9.45 | 10.36 | 7.84 | 9.45 | 10.02 |
| clearwater | Day | `#2668ab` | `#1d5791` | `#d6e8fe` | 5.41 | 6.33 | 5.96 | 4.90 | 4.00 |
| clearwater | Night | `#81b4f6` | `#a1caff` | `#1c314c` | 7.89 | 10.00 | 7.79 | 7.89 | 8.36 |
| around | Day | `#3f7632` | `#336328` | `#daedd6` | 5.14 | 6.05 | 5.77 | 4.64 | 3.79 |
| around | Night | `#94d186` | `#a6d79c` | `#21371c` | 9.45 | 10.33 | 7.88 | 9.45 | 10.01 |
| daytrips | Day | `#7052a6` | `#5e448d` | `#e9e2fc` | 5.73 | 6.65 | 6.23 | 5.19 | 4.23 |
| daytrips | Night | `#bfa4f0` | `#d0bbf9` | `#352a48` | 7.88 | 9.80 | 7.71 | 7.88 | 8.36 |

The full table (every pair, both editions, with the hex values) is in Appendix A.

## 5. Type

Three SIL OFL 1.1 families, self-hosted as woff2 in `design/fonts/`, latin and latin-ext subsets (unicode-range split,
so latin-ext loads only when a page needs it). Licenses: `OFL-BodoniModa.txt`, `OFL-Figtree.txt`, `OFL-Archivo.txt`.
None declares a Reserved Font Name.

| Role | Family | Token | Files (KB, latin + ext) | Why |
|---|---|---|---|---|
| Display: h1–h4, masthead, deks, water names, big numerals | **Bodoni Moda** (roman + italic, wght 500–900, opsz 11–28) | `--font-display` | 35 + 19, italic 41 + 21 | The Didone "modern face" is the letter of the 19th-century U.S. Coast Survey chart title and of the lithographed cigar label. Its italic is the chart's water-name italic. |
| Text and UI | **Figtree** (roman 300–900, italic 300–800) | `--font-body` | 19 + 10, italic 19 + 9 | Clear, open, friendly at 13–16 px on a phone in sun glare; real tabular figures (`tnum`) for times and prices; tiny files. It stays out of the way of the ornament. |
| Labels and numerals: kickers, badges, codes, ribbons, buoy numbers | **Archivo** (wdth 100–125, wght 500–800) | `--font-label` (new) | 56 + 54 | An expanded grotesque, set in spaced caps: the "extended gothic" of cigar bands and chart title blocks. Default figures are tabular. |

Choices and rejections: Bodoni Moda was tested against Playfair, Fraunces, Libre Bodoni, Gloock, DM Serif Display and
Old Standard; Figtree against Libre Franklin (no `tnum` in the Google build), Atkinson Hyperlegible Next (slashed zero
reads as code in prices and times), Red Hat Text, Schibsted Grotesk, Karla, Encode Sans; Archivo against Mona Sans and
Encode Sans Expanded. Work Sans and Crimson Pro are history-of-tampa's faces and Newsreader / Public Sans are Cincy
Week's: all four avoided.

**Optical size is clamped in the file.** `design/tools/fonts.py` narrows Bodoni Moda's `opsz` axis to 11–28 with the
fontTools instancer. Browsers apply `font-optical-sizing: auto`, so every size above 28 px uses the 28 master: the
hairlines stay about 2–3 px at headline sizes instead of going 1 px and breaking up on screen (tested; the full-range
font looks like a fashion magazine and shimmers in the Night chart). No CSS is needed for this. Archivo is narrowed to
the widths and weights used (90 → 56 KB).

**Preload** (`--fonts-preload`): `figtree-roman-latin.woff2 bodoni-moda-roman-latin.woff2 archivo-roman-latin.woff2`.
`--fonts-href: none`.

**Metric-matched fallbacks** (`fonts.py --metrics`, capsize method against the Liberation twins of Arial and Times):
`"Figtree Fallback"` (Arial, size-adjust 101.53%), `"Bodoni Moda Fallback"` (Times New Roman Bold, 113.36%), `"Archivo
Fallback"` (Arial Bold at the label width 108%, 105.97%). Ascent, descent and line-gap overrides are in tokens.css.

### 5.1 Scale (16 px root; floor 12 px)

| Token | Size | Use |
|---|---|---|
| `--fs-label` | 12 px | expanded caps: labels, badges, kickers, sheet codes, buoy numbers. **The floor.** |
| `--fs-xs` | 13 px | meta lines, captions, credits |
| `--fs-sm` | 14 px | secondary text, chips, nav |
| `--fs-base` | 16 px | body, UI |
| `--fs-md` | 19 px | card titles (Bodoni) |
| `--fs-lg` | 23 px | h3, deks |
| `--fs-xl` | 26 → 38 px | h2 |
| `--fs-2xl` | 34 → 60 px | h1 (a framed page head uses 40 → 72) |
| `--fs-3xl` | 48 → 104 px | masthead (usually the outlined wordmark) |
| `--fs-numeral` | 36 → 56 px | Bodoni stat numerals, date blocks |

Line heights `--lh-tight 1.02 --lh-head 1.08 --lh-snug 1.24 --lh-body 1.6 --lh-ui 1.35`. Weights `--wght-body 400
--wght-ui 500 --wght-strong 650 --wght-head 700 --wght-mast 880 --wght-label 680`. Tracking `--track-label 0.12em`,
`--track-label-wide 0.26em` (ribbons, TAMPA BAY), `--track-head -0.004em`. Width `--label-stretch 108%`,
`--label-stretch-wide 125%` (Archivo `font-stretch`).

Type rules:
- `.label` becomes `font-family: var(--font-label); font-stretch: var(--label-stretch); font-weight: var(--wght-label)`
  (the rest as in Cincy). Everything set in caps uses it.
- Deks, quotes and water names are Bodoni **italic** (weight 520–560). Body text is never italic Figtree except `<em>`.
- Times, prices, counts: `font-variant-numeric: tabular-nums` (Figtree and Archivo both honor it).
- Big numerals (a year built, a date, a count) are Bodoni 800 lining figures: the cigar-label numeral.

## 6. Space, radii, rules, layout

- Space: Cincy's 4 px scale (`--sp-1` 4 … `--sp-9` 96), `--gutter` 16 → 40 px, `--measure` 66ch.
- Layout (engine names): `--tap 44px`, `--topbar-h 60px`, `--sidebar-w 272px`, `--dock-h 64px`, `--content-max
  1220px`, `--sched-bar-h 76px`.
- Radii: square-cut like a printed label: `--radius-xs 1px --radius-sm 2px --radius-md 3px --radius-lg 6px`, pills
  (`--radius-pill`) only for the live pill and switches, circles only for buoys, clusters, medallions and the rose.
  **Concave "cartouche" corners** (`.cartouche`, `--notch 10px`) only on plates, the seal and the section number.
- Rules: `--rule-hair 1px` (between items), `--rule-mid 2px` (the coast line of a water-lining rule, input
  underlines), `--rule-heavy 4px` (quote callouts), `--stripe-w 5px`, `--line-w 6px`. Facts panels and tables open with
  a **double rule** (2 px ink, 3 px gap, 1 px ink): the label frame's rule, not Cincy's Oxford bar.

## 7. Ornaments (all drawn with tokens; CSS recipes in the specimen's `<style>`)

| Ornament | Where | How |
|---|---|---|
| **Label frame** `.frame` | the page head of every page (one per page); plate demos | `border: var(--frame-w) solid var(--frame-outer)` + `outline: 1px solid var(--frame-inner)` with a negative `outline-offset` (the inner hairline, `--frame-gap` inside) + `::after` painting four **corner stars** (`--mask-corner`, a pierced four-point compass star, 20 px, centered on each outer corner) in `--corner-ink`. Content is centered. `isolation: isolate` so the ribbon's tails sit behind its band. |
| **Ribbon kicker** `.ribbon > span` | straddling the top rule of a label frame; nowhere else except the specimen | a band (`--ribbon-h` 30 px, 12 px Archivo 125% caps, `--track-label-wide`, two gold hairlines inside) with two tails (`::before`/`::after`, `--ribbon-tail` 14 px out, 7 px down, `--ribbon-notch` 7 px swallowtail) and a fold triangle each. Default navy band with cream text (Day) / gold with navy (Night); inside `[data-sheet]` it takes the sheet fill and `-on`, with the fold mixed from `--fold-shade`. Wraps (balanced) on phones. |
| **Water lining** `hr.wl` | the section divider; under page heads | a 2 px coast line in `--rule-ink` and four echoes in `--water-line` at 5, 9, 14 and 21 px, fading 100 → 72 → 46 → 24 % (spacing widens seaward, as engraved). 22 px tall. |
| **Ripple** `.ripple` | under the masthead dek; plate feet | `--mask-ripple` (one engraved wave, 20 × 6 tile) painted `--water-line`. |
| **Compass rose** `brand/compass.svg` (`#compass`) | flanking the masthead; watermark on plates (`--mask-rose`) | 32 points in engraved halves (dark half `--compass-dark`, light half `--compass-light`, north `--compass-north` = magenta), a degree ring with 5° ticks. Decorative: `aria-hidden`. |
| **Graticule neatline** `.grat > .grat-in` | the masthead and every map box | a chart border: outer rule, a `--grat-w` 5 px band of alternating ink and paper ticks (`--grat-step` 24 px), inner rule. Carries no numbers unless they are the map's real coordinates. |
| **Cartouche** `.cartouche` | plates, the seal, section numbers if wanted | four radial-gradient masks cut concave corners of radius `--n`. |
| **Signature seal** `.seal` | a record the region's official guides lead with (`signature: true`) | gold-leaf ground, navy caps, the seal (rosette) symbol and the word "Signature". Sparingly: never more than one per card. |
| **Section number** `.sec-num` | nav groups and section kickers | a navy (Night cream) 22 px block with the number in Archivo. |

## 8. Cards and the plate

One card grammar for five kinds (`.card[data-sheet]`, `kind-*`):

```
┌ plate (or a rights-cleared photo with its credit) ┐   16:9, inset 6px, concave corners
│ kicker: [symbol] KIND · AREA            [badge]   │   12px Archivo caps, muted; the sheet badge right-aligned (40×24)
│ Title in Bodoni 19px (a stretched link)           │
│ Summary, 14px muted, clamped to 3 lines           │
│ meta: hours / price / address, 13px tabular       │
└ foot: source domain (caps, faint)         ☆ 44px  ┘
```

| Kind | Symbol | Card specifics |
|---|---|---|
| **Place** (`places.json`) | numbered buoy (`#i-buoy`), or the kind's own (beach umbrella, …) | hours or price in the meta line; `signature` → the seal |
| **Stay** (`stays.json`) | **anchor** | kind · rooms in the kicker; a "Has …" line from `features` (the hotel's own words only) |
| **Experience** (`experiences.json`) | **daymark** (a triangle board on a post: a departure) | "Departs …" from `departs_place`/`departs_text`; price text as the operator states it |
| **Event** (`events.json`) | **flag** | a **date box** on the left (weekday and month in caps over a Bodoni day numeral, the sheet's tint with its fill as top rule); time or "Time not listed"; status as a badge (Tentative, Changed, Cancelled) |
| **Historic site** (`heritage`) | **landmark** (circle with a center dot) | a double gold rule on top; era in the kicker; a gold-tint **designation box** (NRHP name, year, reference number) |

**The plate** (`.plate`), used whenever a record has no rights-cleared image: a cigar-label panel in the sheet's tint
with concave corners (`--n` 12 px), an inner double rule, a compass-rose watermark (10 % of the sheet edge ink), a
medallion (paper disc, sheet keyline, paper gap, second keyline) holding the record's chart symbol, the **name in
Bodoni italic**, a caps line with `Sheet N · CODE · kind` (or `Built 1836` for heritage), and a ripple foot. It is
typography, never a stock photo, map screenshot or operator image. `aria-hidden` on cards (the title follows); a
`role="img"` with a plain label when it stands alone. Sizes: 16:9 on cards, 3:2 `.lg` on detail pages.

Other components keep Cincy's markup and change finish: buttons (`.btn-primary` navy/cream, `.btn-house` for the one
"Add to My Trip" action in the house ink, `.btn-secondary`, `.btn-ghost`), chips (pressed = sheet tint + 2 px sheet
edge + check + bold; a sheet chip shows its dot), badges (24 px, Archivo caps, always a word), callouts (`tone-tip`,
`tone-warn` "Check before you go", `tone-quote` "In their words" with the quote in Bodoni italic and a named source),
the facts panel, tables (double rule; rows become cards under 700 px), the time-first list (`.tonight`, times in
Archivo tabular), unknowns (`.unk`: faint text with a dashed circle, e.g. "Time not listed", never a guess).

## 9. The map, in both editions

The basemap keeps Cincy's approach (a token-themed SVG with `style="fill:var(--map-…)"` paths and an HTML overlay for
labels and pins). The chart look comes from four things: buff land against blue water (Day), water darker than land
(Night), **water lining** along every shore, and numbered **buoys**.

| Token | Day | Night | Layer |
|---|---|---|---|
| `--map-bg` = `--map-land` | `#f5e6c4` | `#1c2c41` | land (the paper of the chart) |
| `--map-water` | `#b9ddea` | `#04182b` | water; at Night darker than land, as on a lit chart table |
| `--map-water-line` | `#73a7be` | `#13425b` | water-lining echoes |
| `--map-water-edge` | `#6693ab` | `#245571` | the first echo, hugging the shore |
| `--map-coast` | `#2f506f` | `#bd9851` | shoreline (1.4 px); gold at Night |
| `--map-sand` | `#faeec9` | `#41361f` | beaches |
| `--map-park` | `#cce1bc` | `#1a3728` | parks and preserves |
| `--map-road-minor` / `--map-road` | `#fcf8eb` / `#fdfaf1` | `#2d3b4f` / `#3c4b60` | streets |
| `--map-road-major` | `#edcd87` | `#8d6f35` | highways, causeways and bridges in label gold |
| `--map-casing` | `#c4b59b` | `#132237` | road casings |
| `--map-rail` | navy | cream | rail and streetcar, dashed |
| `--map-label` / `--map-label-water` / `--map-label-halo` | `#364865` / `#195579` / land | `#d6cdb8` / `#8bc8de` / land | land names in Archivo caps, water names in **Bodoni italic** (the chart convention) |
| `--map-pin-bg` / `--map-pin-ink` | cream / navy | card navy / cream | buoy body and number |
| `--map-cluster-bg` / `-ink` / `-ring` | navy / cream / gold | gold / navy / pale gold | cluster medallion |
| `--map-select-ring` | magenta | light magenta | the selected buoy |
| `--map-graticule` | navy | cream | neatline ticks around the map |

**Water-lining recipe** (in the basemap, drawn under the land fill; widths in map units, doubled because half of each
stroke is hidden under the land): stroke the land path with `--map-water-line` at 40, clear with `--map-water` at 38.2;
line 27, clear 25.3; line 16, clear 14.4; then `--map-water-edge` at 8; then fill the land and stroke the coast. The
result is four echoes about 4, 7, 13 and 20 units out, spacing widening seaward. At low zoom keep only the two inner
echoes.

**Buoys** (`.buoy[data-sheet]`, a `<button>` with a 44 px hit area): a numbered **can buoy** in paper, ringed 2 px in
the sheet edge ink, with the sheet fill as its top band, on a short stem over a **position circle** that sits exactly
on the point (the buoy is translated up so the circle, not the body, marks the place). Numbers are Archivo 12 px
tabular and match the list rows. Stays, historic sites, events and departures carry their chart symbol instead of a
number. Hover inverts to navy; the selected buoy gets a paper gap and a magenta ring (`--map-select-ring`), never a
color change alone (the list row and the card say "Selected").

**Clusters** (`.cluster`): a 40 px medallion (44 px target) in `--map-cluster-bg` with a double ring (the label's double
rule: 2 px of its own color, 2 px `--map-cluster-ring`, 1 px again) and the count in Bodoni 800 lining numerals.

**Never on the map**: soundings, depth contours, navigation buoys or lights, fake coordinates. Margin coordinates on
the neatline only when computed from the basemap's real bounds.

## 10. Iconography

Two sets, one drawing style: the engine's **24 px grid, 2 px stroke, round caps and joins, `currentColor`**, 18 px in
UI (`.i`), 22 px in the star and the dock.

**Chart symbols** (`brand/symbols.svg`, `brand/icons.json` for `ICONS` in `build/core/icons.mjs`):
`anchor` (a stay) · `landmark` (a historic site: circle with a center dot) · `flag` (an event; the star stays "save
to My Trip") · `daymark` (an experience's departure) · `buoy` (a place) · `compass` (areas, orientation) · `lighthouse`
· `ferry` · `wave` · `beach` · `palm` · `course` (a passage: a dashed course line with an arrow, in magenta when
drawn on a map) · `seal` (signature) · `trolley` · `cigar` · `sun`. The UI set (search, star, calendar, map, clock,
pin, ext, check, arrows, info, warn …) is Cincy's, unchanged.

Rules: a symbol always sits beside a word (a kicker, a legend line, a nav label), never alone as the only carrier of
meaning. Symbols take the sheet's text ink in card kickers and the text color elsewhere. No filled pictograms, no emoji.

## 11. Motion

`--speed 160ms` (hover, toggles), `--speed-slow 280ms` (drawer, dialogs), `--ease cubic-bezier(.2,.7,.2,1)`,
`--pulse 2400ms` for the live flare's ring. Nothing moves on its own except that ring. Under
`prefers-reduced-motion: reduce` every duration collapses to 0.01 ms and the pulse stops. No parallax, no animated
ornament.

## 12. Focus and accessibility

- Focus ring: `outline: 3px solid var(--focus); outline-offset: 2px` (magenta by day, gold by night; ≥ 3:1 on every
  ground). Buoys and clusters draw it around the 44 px target.
- Touch targets ≥ 44 px on phones (buoys, clusters, chips, stars, dock, nav rows below 1024 px); the specimen audit
  (`shots.cjs`) checks every render.
- Nothing under 12 px: the lint in `shots.cjs` (and the engine's build) fails on `font-size` under 12 px, the render
  audit on any computed text under 12 px. Sheet badges below 24 px tall are not allowed (§3).
- Every state is a word: Live now, Starts in 20 min, Tentative, Temporarily closed, Cancelled, In your trip,
  Signature, Selected. Unknowns print as unknowns.
- The outlined wordmark carries `role="img"` and a name; the rose, ripples and plates on cards are `aria-hidden`.

## 13. Do and don't

**Do**
- Show a sheet as code + shape + ink, with its name in text nearby.
- Use one label frame per page (the page head), one ribbon per frame, centered.
- Use gold for ornament and the signature seal; magenta for links, focus, the primary action, courses and the live flare.
- Put the plate wherever a rights-cleared image is missing.
- Set water names in Bodoni italic, land names in Archivo caps.
- Print unknowns as unknowns ("Time not listed", "Price not listed").

**Don't**
- Draw soundings, depth contours, buoys, lights or coordinates that read as navigation data.
- Put text in gold on cream, text under 12 px, or a sheet badge under 24 px tall.
- Use a paper, parchment, wood or foil texture image, a drop-shadowed "3D" ribbon, or a skeuomorphic frame image.
- Use a sheet ink for anything but its sheet (not for states, links or decoration).
- Frame cards, sections or dialogs (the frame belongs to the page head); stack ornaments (a ribbon inside a frame inside
  a neatline) anywhere but the masthead.
- Imitate Visit Tampa Bay, Visit St. Pete/Clearwater or any official tourism mark, palette or tagline.

## 14. Porting notes for the engine (from Cincy Week)

- **tokens.css**: drop in as `site/css/tokens.css`. Same blocks and selectors (`:root, :root[data-theme="light"]`,
  `:root[data-theme="dark"]`, the no-JS `:root:not([data-theme])` media block), `--theme-color` in both, `--fonts-href:
  none`, `--fonts-preload` with three files. The color blocks contain no `{`/`}` (the build's block parser stops at the
  first `}`). Masks are `data:` URIs (the crawler skips `data:`).
- `--prog-<id>{,-tint,-ink,-on,-edge}` becomes `--sheet-<id>{…}` (same five suffixes); `readTokens` should check the
  six region ids. `--prog-<id>-letter/-shape` becomes `--sheet-<id>-code/-shape` (+ `-n`).
- `[data-prog]` scope → `[data-sheet]` (§3); `.prog-badge` → `.sheet-tag`; `.prog-dot` → `.sheet-dot`; program bullets
  (`#b-<prog>`) → sheet badges (`#sheet-<id>` from `brand/sheets.svg`, or rebuilt in `icons.mjs` from `shapes.mjs` +
  a `<text>` in `var(--font-label)` at 13 px in a 44 × 26 box).
- New token `--font-label`; `.label`, `.badge`, `kbd`, `.sec-num`, `table.data th`, `.fact dt`, map labels and the
  dock's labels use it with `font-stretch: var(--label-stretch)`.
- `.oxford` (heavy bar over hairline) → the double rule (§6) or `hr.wl` (§7). `.halftone` → `.plate` (§8).
- `.btn-river` (Cincy's one "Add to My Plan" action) → `.btn-house` ("Add to My Trip"), same tokens (`--accent`). Every
  partial that reads `--accent`/`--link`/`--focus` gets magenta by day and gold by night with no change.
- Wordmark: `brand/parts.json` holds the outlined paths (`wordmark`: stacked; `word`: "Chartbook" alone for the top
  bar, 23 px tall beside the 36 px mark and a 12 px `TAMPA BAY` label in `--accent-strong`; `line`: one-line lockup).
  The TAMPA BAY group reads `var(--wordmark-accent, currentColor)`.
- `brand/mark.svg` and `brand/favicon.svg` are self-contained (they define their inks once, as custom properties, in
  their own `<style>`) because the shell uses them as `<img>`/icon; everything else is `currentColor` + tokens.
- The specimen's `<style>` is written like a partial (tokens only, lint-clean): copy its blocks into `00-base`,
  `10-shell`, `20-content`, `30-home` and `50-map` as the comments there indicate.

## 15. Files

```
design/DESIGN.md              this file
design/tokens.css             the drop-in tokens (generated)
design/specimen.html          both editions, every component (links tokens.css; sprite injected)
design/shots/                 specimen-{day,night}-{1440,390}.png (full page) and -top.png (first screen)
design/fonts/                 bodoni-moda-{roman,italic}-{latin,latin-ext}.woff2, figtree-{roman,italic}-{latin,latin-ext}.woff2,
                              archivo-roman-{latin,latin-ext}.woff2, OFL-BodoniModa.txt, OFL-Figtree.txt, OFL-Archivo.txt
design/brand/                 wordmark.svg, wordmark-line.svg, mark.svg, logo.svg, favicon.svg, compass.svg, corner.svg,
                              label-frame.svg, ribbon.svg, water-lining.svg, sheet-{tp,sp,gb,cw,ab,dt}.svg, sheets.svg,
                              symbols.svg, icons.json, parts.json
design/tools/                 palette.mjs, shapes.mjs, build-tokens.mjs, contrast.mjs, brand.mjs, inject.mjs, shots.cjs,
                              fonts.py, outline.py
```

Regenerate (Node ≥ 18 for the .mjs tools, zero dependencies; the Python tools need `pip install fonttools brotli
uharfbuzz` and are only for the fonts and the lettering):

```sh
python3 design/tools/fonts.py          # download + narrow the fonts, print fallback metrics (cache: design/.cache/)
python3 design/tools/outline.py        # wordmarks and sheet codes → brand/wordmark*.svg, brand/parts.json
node design/tools/build-tokens.mjs     # palette.mjs + shapes.mjs → tokens.css
node design/tools/contrast.mjs         # every pair, both editions; exit 1 on a failure (--md, --sheets for tables)
node design/tools/brand.mjs            # mark, favicon, logo, rose, frame, ribbon, lining, badges, symbols
node design/tools/inject.mjs           # the inline sprite of specimen.html
NODE_PATH=/opt/node22/lib/node_modules PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node design/tools/shots.cjs   # renders + audit
```

## Appendix A. Every contrast pair

| Pair | Use | Min | Day chart | Night chart |
|---|---|---:|---:|---:|
| **Text on paper** | | | | |
| `--text` on `--bg` | body text | 4.5:1 | 12.70 · `#12264c`/`#f6ecd5` | 14.39 · `#f5ecd7`/`#0c1d34` |
| `--text` on `--surface` | text on cards | 4.5:1 | 14.04 · `#12264c`/`#fcf8eb` | 13.00 · `#f5ecd7`/`#13263e` |
| `--text` on `--surface-sunken` |  | 4.5:1 | 10.60 · `#12264c`/`#e6d8bc` | 15.44 · `#f5ecd7`/`#07162a` |
| `--text-muted` on `--bg` | secondary text | 4.5:1 | 7.87 · `#364865`/`#f6ecd5` | 10.70 · `#d6cdb8`/`#0c1d34` |
| `--text-muted` on `--surface-alt` |  | 4.5:1 | 7.20 · `#364865`/`#eee2c8` | 8.57 · `#d6cdb8`/`#1d2f47` |
| `--text-faint` on `--bg` | meta, unknowns | 4.5:1 | 5.69 · `#4d5d76`/`#f6ecd5` | 7.88 · `#bab09c`/`#0c1d34` |
| `--text-faint` on `--surface` |  | 4.5:1 | 6.29 · `#4d5d76`/`#fcf8eb` | 7.11 · `#bab09c`/`#13263e` |
| `--text-faint` on `--surface-alt` |  | 4.5:1 | 5.20 · `#4d5d76`/`#eee2c8` | 6.31 · `#bab09c`/`#1d2f47` |
| `--text-faint` on `--surface-sunken` |  | 4.5:1 | 4.75 · `#4d5d76`/`#e6d8bc` | 8.45 · `#bab09c`/`#07162a` |
| `--text-muted` on `--past-bg` | past events | 4.5:1 | 7.53 · `#364865`/`#f0e7d5` | 10.26 · `#d6cdb8`/`#112136` |
| **Links and actions** | | | | |
| `--link` on `--bg` | links | 4.5:1 | 7.60 · `#8d0e5d`/`#f6ecd5` | 11.42 · `#f0d186`/`#0c1d34` |
| `--link` on `--surface` |  | 4.5:1 | 8.40 · `#8d0e5d`/`#fcf8eb` | 10.31 · `#f0d186`/`#13263e` |
| `--link` on `--surface-alt` |  | 4.5:1 | 6.95 · `#8d0e5d`/`#eee2c8` | 9.14 · `#f0d186`/`#1d2f47` |
| `--link-hover` on `--bg` |  | 4.5:1 | 9.65 · `#73054b`/`#f6ecd5` | 14.39 · `#f5ecd7`/`#0c1d34` |
| `--primary-contrast` on `--primary` | primary button | 4.5:1 | 14.04 · `#fcf8eb`/`#12264c` | 14.39 · `#0c1d34`/`#f5ecd7` |
| `--accent-contrast` on `--accent` | house-ink button | 4.5:1 | 6.58 · `#fcf8eb`/`#a7186f` | 9.45 · `#0c1d34`/`#e9bb5b` |
| `--accent-contrast` on `--accent-strong` | button hover | 4.5:1 | 8.40 · `#fcf8eb`/`#8d0e5d` | 11.42 · `#0c1d34`/`#f0d186` |
| `--accent-strong` on `--accent-tint` | pressed chip, tip callout | 4.5:1 | 7.16 · `#8d0e5d`/`#fbdfeb` | 8.65 · `#f0d186`/`#412f0d` |
| `--accent` on `--bg` | button fill vs paper | 3:1 | 5.95 · `#a7186f`/`#f6ecd5` | 9.45 · `#e9bb5b`/`#0c1d34` |
| `--focus` on `--bg` | focus ring | 3:1 | 5.95 · `#a7186f`/`#f6ecd5` | 9.45 · `#e9bb5b`/`#0c1d34` |
| `--focus` on `--surface` |  | 3:1 | 6.58 · `#a7186f`/`#fcf8eb` | 8.53 · `#e9bb5b`/`#13263e` |
| `--border-strong` on `--bg` | control borders | 3:1 | 3.96 · `#63768f`/`#f6ecd5` | 4.64 · `#74889e`/`#0c1d34` |
| `--border-strong` on `--surface` |  | 3:1 | 4.37 · `#63768f`/`#fcf8eb` | 4.19 · `#74889e`/`#13263e` |
| **Label inks** | | | | |
| `--magenta-ink` on `--bg` | magenta text | 4.5:1 | 7.60 · `#8d0e5d`/`#f6ecd5` | 8.64 · `#f6a0c1`/`#0c1d34` |
| `--magenta-ink` on `--magenta-tint` |  | 4.5:1 | 7.16 · `#8d0e5d`/`#fbdfeb` | 6.91 · `#f6a0c1`/`#482232` |
| `--gold-ink` on `--bg` | gold text | 4.5:1 | 5.46 · `#7f5714`/`#f6ecd5` | 11.42 · `#f0d186`/`#0c1d34` |
| `--gold-ink` on `--surface` |  | 4.5:1 | 6.03 · `#7f5714`/`#fcf8eb` | 10.31 · `#f0d186`/`#13263e` |
| `--gold-ink` on `--gold-tint` |  | 4.5:1 | 4.97 · `#7f5714`/`#f2e1be` | 8.65 · `#f0d186`/`#412f0d` |
| `--gold-leaf-ink` on `--gold` | text on gold (seal, Night ribbon) | 4.5:1 | 5.50 · `#12264c`/`#c5953b` | 9.45 · `#0c1d34`/`#e9bb5b` |
| `--ribbon-ink` on `--ribbon-bg` | kicker ribbon | 4.5:1 | 14.04 · `#fcf8eb`/`#12264c` | 9.45 · `#0c1d34`/`#e9bb5b` |
| `--seal-ink` on `--seal` | signature seal | 4.5:1 | 5.50 · `#12264c`/`#c5953b` | 9.45 · `#0c1d34`/`#e9bb5b` |
| `--frame-outer` on `--bg` | label frame outer rule | 3:1 | 12.70 · `#12264c`/`#f6ecd5` | 9.45 · `#e9bb5b`/`#0c1d34` |
| **States** | | | | |
| `--live-ink` on `--live-tint` | live badge | 4.5:1 | 7.16 · `#8d0e5d`/`#fbdfeb` | 6.91 · `#f6a0c1`/`#482232` |
| `--live` on `--bg` | live flare dot | 3:1 | 5.95 · `#a7186f`/`#f6ecd5` | 7.18 · `#ee8ab2`/`#0c1d34` |
| `--success` on `--success-tint` | in-trip badge | 4.5:1 | 5.32 · `#006c4d`/`#d6efe3` | 7.13 · `#7cd2ae`/`#18382b` |
| `--success` on `--bg` |  | 4.5:1 | 5.50 · `#006c4d`/`#f6ecd5` | 9.42 · `#7cd2ae`/`#0c1d34` |
| `--warning` on `--warning-tint` | warning badge | 4.5:1 | 5.01 · `#8d5406`/`#fae5c3` | 8.29 · `#f7c473`/`#3f2c10` |
| `--warning` on `--bg` |  | 4.5:1 | 5.25 · `#8d5406`/`#f6ecd5` | 10.55 · `#f7c473`/`#0c1d34` |
| `--danger` on `--danger-tint` | closed badge | 4.5:1 | 5.52 · `#ac2724`/`#ffe0db` | 5.94 · `#fe8b83`/`#4a2321` |
| `--danger` on `--bg` |  | 4.5:1 | 5.82 · `#ac2724`/`#f6ecd5` | 7.44 · `#fe8b83`/`#0c1d34` |
| **Map** | | | | |
| `--map-label` on `--map-bg` | land labels | 4.5:1 | 7.48 · `#364865`/`#f5e6c4` | 8.94 · `#d6cdb8`/`#1c2c41` |
| `--map-label-water` on `--map-water` | water labels | 4.5:1 | 5.58 · `#195579`/`#b9ddea` | 9.75 · `#8bc8de`/`#04182b` |
| `--map-pin-ink` on `--map-pin-bg` | buoy numbers | 4.5:1 | 14.04 · `#12264c`/`#fcf8eb` | 13.00 · `#f5ecd7`/`#13263e` |
| `--map-cluster-ink` on `--map-cluster-bg` | cluster counts | 4.5:1 | 14.04 · `#fcf8eb`/`#12264c` | 9.45 · `#0c1d34`/`#e9bb5b` |
| `--map-coast` on `--map-water` | shoreline vs water | 3:1 | 5.84 · `#2f506f`/`#b9ddea` | 6.64 · `#bd9851`/`#04182b` |
| `--map-coast` on `--map-bg` | shoreline vs land | 3:1 | 6.81 · `#2f506f`/`#f5e6c4` | 5.23 · `#bd9851`/`#1c2c41` |
| `--map-cluster-bg` on `--map-bg` | cluster vs land | 3:1 | 12.08 · `#12264c`/`#f5e6c4` | 7.89 · `#e9bb5b`/`#1c2c41` |
| `--map-cluster-bg` on `--map-water` | cluster vs water | 3:1 | 10.37 · `#12264c`/`#b9ddea` | 10.01 · `#e9bb5b`/`#04182b` |
| `--map-select-ring` on `--map-bg` | selected ring | 3:1 | 5.66 · `#a7186f`/`#f5e6c4` | 6.00 · `#ee8ab2`/`#1c2c41` |
| `--map-pin-ink` on `--map-bg` | buoy outline vs land | 3:1 | 12.08 · `#12264c`/`#f5e6c4` | 12.02 · `#f5ecd7`/`#1c2c41` |
| **Sheet tampa** | | | | |
| `--sheet-tampa-on` on `--sheet-tampa` | code on the badge | 4.5:1 | 5.87 · `#fcf8eb`/`#af3436` | 6.38 · `#0c1d34`/`#f6787f` |
| `--sheet-tampa-ink` on `--bg` | sheet name on paper | 4.5:1 | 6.83 · `#95282b`/`#f6ecd5` | 9.03 · `#ffa5a9`/`#0c1d34` |
| `--sheet-tampa-ink` on `--surface` |  | 4.5:1 | 7.55 · `#95282b`/`#fcf8eb` | 8.15 · `#ffa5a9`/`#13263e` |
| `--sheet-tampa-ink` on `--sheet-tampa-tint` | on its tint | 4.5:1 | 6.38 · `#95282b`/`#fededb` | 7.20 · `#ffa5a9`/`#482426` |
| `--text` on `--sheet-tampa-tint` | body text on the tint | 4.5:1 | 11.86 · `#12264c`/`#fededb` | 11.48 · `#f5ecd7`/`#482426` |
| `--sheet-tampa-edge` on `--bg` | keyline on paper | 3:1 | 5.31 · `#af3436`/`#f6ecd5` | 6.38 · `#f6787f`/`#0c1d34` |
| `--sheet-tampa-edge` on `--surface` |  | 3:1 | 5.87 · `#af3436`/`#fcf8eb` | 5.76 · `#f6787f`/`#13263e` |
| `--sheet-tampa-edge` on `--map-bg` | buoy ring on land | 3:1 | 5.05 · `#af3436`/`#f5e6c4` | 5.32 · `#f6787f`/`#1c2c41` |
| `--sheet-tampa-edge` on `--map-water` | buoy ring on water | 3:1 | 4.33 · `#af3436`/`#b9ddea` | 6.76 · `#f6787f`/`#04182b` |
| **Sheet stpete** | | | | |
| `--sheet-stpete-on` on `--sheet-stpete` | code on the badge | 4.5:1 | 5.63 · `#fcf8eb`/`#9b4f00` | 7.96 · `#0c1d34`/`#fd9958` |
| `--sheet-stpete-ink` on `--bg` | sheet name on paper | 4.5:1 | 6.57 · `#834100`/`#f6ecd5` | 9.61 · `#ffb27f`/`#0c1d34` |
| `--sheet-stpete-ink` on `--surface` |  | 4.5:1 | 7.26 · `#834100`/`#fcf8eb` | 8.68 · `#ffb27f`/`#13263e` |
| `--sheet-stpete-ink` on `--sheet-stpete-tint` | on its tint | 4.5:1 | 6.15 · `#834100`/`#fae1cf` | 7.58 · `#ffb27f`/`#462814` |
| `--text` on `--sheet-stpete-tint` | body text on the tint | 4.5:1 | 11.89 · `#12264c`/`#fae1cf` | 11.35 · `#f5ecd7`/`#462814` |
| `--sheet-stpete-edge` on `--bg` | keyline on paper | 3:1 | 5.09 · `#9b4f00`/`#f6ecd5` | 7.96 · `#fd9958`/`#0c1d34` |
| `--sheet-stpete-edge` on `--surface` |  | 3:1 | 5.63 · `#9b4f00`/`#fcf8eb` | 7.18 · `#fd9958`/`#13263e` |
| `--sheet-stpete-edge` on `--map-bg` | buoy ring on land | 3:1 | 4.84 · `#9b4f00`/`#f5e6c4` | 6.64 · `#fd9958`/`#1c2c41` |
| `--sheet-stpete-edge` on `--map-water` | buoy ring on water | 3:1 | 4.16 · `#9b4f00`/`#b9ddea` | 8.43 · `#fd9958`/`#04182b` |
| **Sheet beaches** | | | | |
| `--sheet-beaches-on` on `--sheet-beaches` | code on the badge | 4.5:1 | 5.12 · `#fcf8eb`/`#007678` | 9.45 · `#0c1d34`/`#6dd2cb` |
| `--sheet-beaches-ink` on `--bg` | sheet name on paper | 4.5:1 | 6.01 · `#006365`/`#f6ecd5` | 10.36 · `#8bd8d2`/`#0c1d34` |
| `--sheet-beaches-ink` on `--surface` |  | 4.5:1 | 6.65 · `#006365`/`#fcf8eb` | 9.35 · `#8bd8d2`/`#13263e` |
| `--sheet-beaches-ink` on `--sheet-beaches-tint` | on its tint | 4.5:1 | 5.73 · `#006365`/`#cceeee` | 7.84 · `#8bd8d2`/`#003936` |
| `--text` on `--sheet-beaches-tint` | body text on the tint | 4.5:1 | 12.10 · `#12264c`/`#cceeee` | 10.90 · `#f5ecd7`/`#003936` |
| `--sheet-beaches-edge` on `--bg` | keyline on paper | 3:1 | 4.63 · `#007678`/`#f6ecd5` | 9.45 · `#6dd2cb`/`#0c1d34` |
| `--sheet-beaches-edge` on `--surface` |  | 3:1 | 5.12 · `#007678`/`#fcf8eb` | 8.53 · `#6dd2cb`/`#13263e` |
| `--sheet-beaches-edge` on `--map-bg` | buoy ring on land | 3:1 | 4.40 · `#007678`/`#f5e6c4` | 7.89 · `#6dd2cb`/`#1c2c41` |
| `--sheet-beaches-edge` on `--map-water` | buoy ring on water | 3:1 | 3.78 · `#007678`/`#b9ddea` | 10.02 · `#6dd2cb`/`#04182b` |
| **Sheet clearwater** | | | | |
| `--sheet-clearwater-on` on `--sheet-clearwater` | code on the badge | 4.5:1 | 5.41 · `#fcf8eb`/`#2668ab` | 7.89 · `#0c1d34`/`#81b4f6` |
| `--sheet-clearwater-ink` on `--bg` | sheet name on paper | 4.5:1 | 6.33 · `#1d5791`/`#f6ecd5` | 10.00 · `#a1caff`/`#0c1d34` |
| `--sheet-clearwater-ink` on `--surface` |  | 4.5:1 | 7.00 · `#1d5791`/`#fcf8eb` | 9.03 · `#a1caff`/`#13263e` |
| `--sheet-clearwater-ink` on `--sheet-clearwater-tint` | on its tint | 4.5:1 | 5.96 · `#1d5791`/`#d6e8fe` | 7.79 · `#a1caff`/`#1c314c` |
| `--text` on `--sheet-clearwater-tint` | body text on the tint | 4.5:1 | 11.96 · `#12264c`/`#d6e8fe` | 11.21 · `#f5ecd7`/`#1c314c` |
| `--sheet-clearwater-edge` on `--bg` | keyline on paper | 3:1 | 4.90 · `#2668ab`/`#f6ecd5` | 7.89 · `#81b4f6`/`#0c1d34` |
| `--sheet-clearwater-edge` on `--surface` |  | 3:1 | 5.41 · `#2668ab`/`#fcf8eb` | 7.12 · `#81b4f6`/`#13263e` |
| `--sheet-clearwater-edge` on `--map-bg` | buoy ring on land | 3:1 | 4.66 · `#2668ab`/`#f5e6c4` | 6.59 · `#81b4f6`/`#1c2c41` |
| `--sheet-clearwater-edge` on `--map-water` | buoy ring on water | 3:1 | 4.00 · `#2668ab`/`#b9ddea` | 8.36 · `#81b4f6`/`#04182b` |
| **Sheet around** | | | | |
| `--sheet-around-on` on `--sheet-around` | code on the badge | 4.5:1 | 5.14 · `#fcf8eb`/`#3f7632` | 9.45 · `#0c1d34`/`#94d186` |
| `--sheet-around-ink` on `--bg` | sheet name on paper | 4.5:1 | 6.05 · `#336328`/`#f6ecd5` | 10.33 · `#a6d79c`/`#0c1d34` |
| `--sheet-around-ink` on `--surface` |  | 4.5:1 | 6.69 · `#336328`/`#fcf8eb` | 9.33 · `#a6d79c`/`#13263e` |
| `--sheet-around-ink` on `--sheet-around-tint` | on its tint | 4.5:1 | 5.77 · `#336328`/`#daedd6` | 7.88 · `#a6d79c`/`#21371c` |
| `--text` on `--sheet-around-tint` | body text on the tint | 4.5:1 | 12.13 · `#12264c`/`#daedd6` | 10.97 · `#f5ecd7`/`#21371c` |
| `--sheet-around-edge` on `--bg` | keyline on paper | 3:1 | 4.64 · `#3f7632`/`#f6ecd5` | 9.45 · `#94d186`/`#0c1d34` |
| `--sheet-around-edge` on `--surface` |  | 3:1 | 5.14 · `#3f7632`/`#fcf8eb` | 8.53 · `#94d186`/`#13263e` |
| `--sheet-around-edge` on `--map-bg` | buoy ring on land | 3:1 | 4.42 · `#3f7632`/`#f5e6c4` | 7.89 · `#94d186`/`#1c2c41` |
| `--sheet-around-edge` on `--map-water` | buoy ring on water | 3:1 | 3.79 · `#3f7632`/`#b9ddea` | 10.01 · `#94d186`/`#04182b` |
| **Sheet daytrips** | | | | |
| `--sheet-daytrips-on` on `--sheet-daytrips` | code on the badge | 4.5:1 | 5.73 · `#fcf8eb`/`#7052a6` | 7.88 · `#0c1d34`/`#bfa4f0` |
| `--sheet-daytrips-ink` on `--bg` | sheet name on paper | 4.5:1 | 6.65 · `#5e448d`/`#f6ecd5` | 9.80 · `#d0bbf9`/`#0c1d34` |
| `--sheet-daytrips-ink` on `--surface` |  | 4.5:1 | 7.35 · `#5e448d`/`#fcf8eb` | 8.85 · `#d0bbf9`/`#13263e` |
| `--sheet-daytrips-ink` on `--sheet-daytrips-tint` | on its tint | 4.5:1 | 6.23 · `#5e448d`/`#e9e2fc` | 7.71 · `#d0bbf9`/`#352a48` |
| `--text` on `--sheet-daytrips-tint` | body text on the tint | 4.5:1 | 11.90 · `#12264c`/`#e9e2fc` | 11.33 · `#f5ecd7`/`#352a48` |
| `--sheet-daytrips-edge` on `--bg` | keyline on paper | 3:1 | 5.19 · `#7052a6`/`#f6ecd5` | 7.88 · `#bfa4f0`/`#0c1d34` |
| `--sheet-daytrips-edge` on `--surface` |  | 3:1 | 5.73 · `#7052a6`/`#fcf8eb` | 7.12 · `#bfa4f0`/`#13263e` |
| `--sheet-daytrips-edge` on `--map-bg` | buoy ring on land | 3:1 | 4.93 · `#7052a6`/`#f5e6c4` | 6.58 · `#bfa4f0`/`#1c2c41` |
| `--sheet-daytrips-edge` on `--map-water` | buoy ring on water | 3:1 | 4.23 · `#7052a6`/`#b9ddea` | 8.36 · `#bfa4f0`/`#04182b` |

## Changelog
- 2026-09-27: v1 (DA): concept, both editions, six sheets, fonts, tokens, brand files, specimen, audit tools.
