/* ============================================================
   build/core/icons.mjs · OWNER: E1 (build engine; ported from Cincy Week)
   The inline SVG sprite every page carries once:
   - stroke icons  #i-<name>    24 grid, 2px, round caps; color = currentColor
   - sheet marks   #b-<region>  a chart-label cartouche with the sheet's chart code
                                ("TP"), painted only through custom properties
                                (--sheet-<id>, -on, -edge), so they theme inside <use>
   - the mark      #mark        a placeholder compass rose in a cigar-band ellipse
                                (the design agent replaces MARK and wordmark())
   Use icon(name) and bullet(region) in markup; never paste raw SVG paths.
   To add an icon: add it to ICONS (the build fails on an unknown name).
   Chart symbols are the icon language (SPEC.md §3): anchor = where to stay,
   landmark (circle with a center dot) = historic site, flag = event,
   daymark = experience departure, pin = a place on the map.
   ============================================================ */
import { REGIONS, REGION_IDS } from "./vocab.mjs";

export const ICONS = {
  /* ---- kept from Cincy Week ---- */
  search: '<circle cx="11" cy="11" r="7"/><path d="M16.2 16.2 21 21"/>',
  star: '<path d="M12 3.2l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 17l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
  moon: '<path d="M20 14.6A8 8 0 0 1 9.4 4a7.6 7.6 0 1 0 10.6 10.6z"/>',
  home: '<path d="M3.5 10.5 12 3.5l8.5 7V20a1 1 0 0 1-1 1h-5v-6h-5v6h-5a1 1 0 0 1-1-1z"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="1"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  map: '<path d="M9 4.5 3.5 6.5v13l5.5-2 6 2 5.5-2v-13l-5.5 2z"/><path d="M9 4.5v13M15 6.5v13"/>',
  pin: '<path d="M12 21s-6.5-5.9-6.5-11.2a6.5 6.5 0 0 1 13 0C18.5 15.1 12 21 12 21z"/><circle cx="12" cy="9.8" r="2.4"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  users: '<circle cx="9" cy="8.5" r="3.3"/><path d="M3 20c.6-3.4 3-5.3 6-5.3s5.4 1.9 6 5.3M15.5 5.3a3.3 3.3 0 0 1 0 6.4M17.5 14.9c1.9.6 3 2.3 3.4 5.1"/>',
  bed: '<path d="M3 19V6.5M3 15.5h18V19M21 15.5v-3.2a3 3 0 0 0-3-3h-7v6.2"/><circle cx="7" cy="11.5" r="1.8"/>',
  tram: '<rect x="5.5" y="3.5" width="13" height="13" rx="2"/><path d="M5.5 10h13M8.5 20.5l2-4M15.5 20.5l-2-4"/><path d="M9 13.3h.01M15 13.3h.01"/>',
  hood: '<path d="M12 15.5s-4.5-4.1-4.5-7.8a4.5 4.5 0 0 1 9 0c0 3.7-4.5 7.8-4.5 7.8z"/><path d="M8 18.5c-2.6.4-4.5 1.1-4.5 1.8 0 1 3.8 1.7 8.5 1.7s8.5-.7 8.5-1.7c0-.7-1.9-1.4-4.5-1.8"/>',
  utensils: '<path d="M6.5 3v7.5M4.5 3v4.5a2 2 0 0 0 4 0V3M6.5 10.5V21M17.5 21V3.2c-2 .9-3.5 3.4-3.5 7.3h3.5"/>',
  help: '<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.3a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01"/>',
  news: '<path d="M4 5h12.5v14.5a1 1 0 0 1-1 1"/><path d="M16.5 9H20v10a1.5 1.5 0 0 1-3 0M4 5v15.5h11.5M7 9h6.5M7 12.5h6.5M7 16h4"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8h.01"/>',
  "chev-r": '<path d="M9.5 6l6 6-6 6"/>',
  "chev-d": '<path d="M6 9.5l6 6 6-6"/>',
  "arrow-r": '<path d="M5 12h14M13.5 6.5 19 12l-5.5 5.5"/>',
  "arrow-up": '<path d="M12 19V5M6.5 10.5 12 5l5.5 5.5"/>',
  ext: '<path d="M14 4h6v6M20 4l-8.5 8.5M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  x: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
  sliders: '<path d="M4 7h9M17.5 7H20M4 17h3M11.5 17H20"/><circle cx="15.2" cy="7" r="2.2"/><circle cx="9.2" cy="17" r="2.2"/>',
  share: '<path d="M12 3.5v11M7.5 8 12 3.5 16.5 8M5 12.5v6.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-6.5"/>',
  download: '<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 20h14"/>',
  plus: '<path d="M12 5.5v13M5.5 12h13"/>',
  minus: '<path d="M5.5 12h13"/>',
  locate: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="7.5"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22"/>',
  warn: '<path d="M12 3.5 2.5 20h19z"/><path d="M12 10v4.5M12 17.2h.01"/>',
  walk: '<circle cx="13.5" cy="4.5" r="1.7"/><path d="M10 21l2.3-6.2 2.7 2.7V21M8.5 12.5l1.8-4.3 3.4 1.2 1.8 2.8h2.5M12.8 14.3 11 8.6"/>',
  fit: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  grid: '<rect x="4" y="4" width="6.5" height="6.5"/><rect x="13.5" y="4" width="6.5" height="6.5"/><rect x="4" y="13.5" width="6.5" height="6.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>',
  github: '<path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21"/>',
  wc: '<circle cx="7" cy="4.8" r="1.9"/><circle cx="17" cy="4.8" r="1.9"/><path d="M5 9h4l-.5 5.5h-3zM7 14.5V21M17 9l-3 7h6zM17 16v5"/>',
  spark: '<path d="M12 2.8l2.1 6.1 6.1 2.1-6.1 2.1-2.1 6.1-2.1-6.1-6.1-2.1 6.1-2.1z"/>',
  drop: '<path d="M12 3.2c3.3 4.2 5.8 7.4 5.8 10.4a5.8 5.8 0 0 1-11.6 0c0-3 2.5-6.2 5.8-10.4z"/>',
  bag: '<path d="M5.2 8.2h13.6l-1.1 12.3H6.3z"/><path d="M8.8 10.5V7a3.2 3.2 0 0 1 6.4 0v3.5"/>',
  eye: '<path d="M2.5 12s3.6-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.6 6.5-9.5 6.5S2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
  light: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.9 10.6c.6.6.9 1.3.9 2.2V16h6v-.2c0-.9.3-1.6.9-2.2A6 6 0 0 0 12 3z"/>',
  /* ---- Tampa Bay Chartbook: chart symbols and visitor icons ---- */
  anchor: '<circle cx="12" cy="5" r="2"/><path d="M12 7v14M8 10.5h8M4.5 13.5a7.5 7.5 0 0 0 15 0M4.5 13.5l-1.5 1.5M19.5 13.5l1.5 1.5"/>',
  landmark: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="1.3"/>',
  compass: '<circle cx="12" cy="12" r="8.5"/><path d="M15.6 8.4 13.4 13.4 8.4 15.6l2.2-5z"/><path d="M12 3.5v1.5M12 19v1.5M3.5 12H5M19 12h1.5"/>',
  flag: '<path d="M5.5 21V3.5M5.5 4.5h11.5l-2.2 4 2.2 4H5.5"/>',
  daymark: '<path d="M12 21v-9M6.5 3.5h11V12h-11z"/><path d="M9 21h6"/>',
  wave: '<path d="M3 9c2 0 2.3-2 4.5-2S9.8 9 12 9s2.3-2 4.5-2S19 9 21 9M3 15c2 0 2.3-2 4.5-2s2.3 2 4.5 2 2.3-2 4.5-2 2.5 2 4.5 2"/>',
  boat: '<path d="M3.5 16h17l-2.6 4.5H6.1z"/><path d="M12 3v13M12 4.5 18 13.5h-6"/>',
  ferry: '<path d="M3 14.5h18l-2.3 4H5.3z"/><path d="M6 14.5v-4h12v4M9.5 10.5V7h5v3.5"/><path d="M3 21.5c1.5 0 1.5-.8 3-.8s1.5.8 3 .8 1.5-.8 3-.8 1.5.8 3 .8 1.5-.8 3-.8 1.5.8 3 .8"/>',
  fish: '<path d="M3 12c3-4.5 9-6 14 0-5 6-11 4.5-14 0z"/><path d="M17 12l4-3v6zM7.5 11h.01"/>',
  palm: '<path d="M11.5 21c0-4.5.6-8 2-11"/><path d="M13.5 10C11 6.5 7 6 4 8M13.5 10c1-3.5 4-5 7-4.5M13.5 10c-3.5-1-7 .5-8.5 3.5M13.5 10c3 0 6 1.5 7 4.5"/>',
  umbrella: '<path d="M3.5 12a8.5 8.5 0 0 1 17 0z"/><path d="M12 12v7.5a1.75 1.75 0 0 1-3.5 0M12 2.5v1"/>',
  ticket: '<path d="M3.5 7.5h17v3a2 2 0 0 0 0 4v3h-17v-3a2 2 0 0 0 0-4z"/><path d="M14.5 8v1.5M14.5 11.3v1.4M14.5 14.5V16"/>',
  "fork-knife": '<path d="M6.5 3v7.5M4.5 3v4.5a2 2 0 0 0 4 0V3M6.5 10.5V21M17.5 21V3.2c-2 .9-3.5 3.4-3.5 7.3h3.5"/>',
  glass: '<path d="M5.5 3.5h13L12 12z"/><path d="M12 12v8.5M8 20.5h8"/>',
  trail: '<path d="M5 21c3-3 11-2 11-7s-9-4-9-8c0-1.5 1-2.5 2.5-3"/><path d="M17.5 4.5h.01M19.5 8h.01"/>',
  binoculars: '<circle cx="7" cy="15.5" r="3.5"/><circle cx="17" cy="15.5" r="3.5"/><path d="M10.5 15.5h3M3.8 13.8 6.5 5h3.5v8.5M20.2 13.8 17.5 5H14v8.5"/>',
  bus: '<rect x="4.5" y="3.5" width="15" height="14" rx="2"/><path d="M4.5 11h15M7.5 20.5v-3M16.5 20.5v-3M8 14.3h.01M16 14.3h.01"/>',
  plane: '<path d="M21 15.5 13.5 11V5a1.5 1.5 0 0 0-3 0v6L3 15.5V17l7.5-2.5v4L8.5 20v1.5l3.5-1 3.5 1V20l-2-1.5v-4L21 17z"/>',
  parking: '<rect x="3.5" y="3.5" width="17" height="17" rx="2"/><path d="M9.5 17V7h3.5a3 3 0 0 1 0 6H9.5"/>',
  car: '<path d="M4.5 16.5V12l2-5h11l2 5v4.5z"/><path d="M4.5 12h15M7 19.5v-3M17 19.5v-3M7.5 14.5h.01M16.5 14.5h.01"/>',
  bike: '<circle cx="6" cy="16" r="3.5"/><circle cx="18" cy="16" r="3.5"/><path d="M6 16l3.5-7h5L18 16M9.5 9 12 16H6M14.5 9l-1-2.5h-2"/>',
  phone: '<path d="M6.5 3.5h3l1.5 4-2 1.5a11 11 0 0 0 6 6l1.5-2 4 1.5v3a2 2 0 0 1-2 2A16.5 16.5 0 0 1 4.5 5.5a2 2 0 0 1 2-2z"/>',
  route: '<circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="6" r="2.5"/><path d="M8.5 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.5"/>',
};

/** Sheet ids (a closed set, in sheet order) and their chart codes (vocab.mjs REGIONS). */
export const REGION_CODES = Object.fromEntries(REGION_IDS.map((id) => [id, REGIONS[id].code]));
/** A chart-label cartouche (notched corners, like a cigar-box label panel) with the chart code. */
const CARTOUCHE = '<path d="M4 1.2h16L22.8 4v16L20 22.8H4L1.2 20V4z" style="fill:var(--sheet-R);stroke:var(--sheet-R-edge);stroke-width:1.4;stroke-linejoin:round"/>';
const sheetSymbol = (id) => `<symbol id="b-${id}" viewBox="0 0 24 24">${CARTOUCHE.replace(/R/g, id)}<text x="12" y="15.6" text-anchor="middle" style="fill:var(--sheet-${id}-on);font-family:var(--font-body);font-size:10px;font-weight:760;letter-spacing:-0.02em">${REGIONS[id].code}</text></symbol>`;

/** The placeholder mark: a compass rose inside a cigar-band ellipse (SPEC.md §3). currentColor only. */
export const MARK = '<symbol id="mark" viewBox="0 0 32 32"><ellipse cx="16" cy="16" rx="14.5" ry="11.5" style="fill:none;stroke:currentColor;stroke-width:1.6"/><path d="M16 6.5l2 7.5 7.5 2-7.5 2-2 7.5-2-7.5-7.5-2 7.5-2z" style="fill:currentColor"/></symbol>';

/** <svg class="i …"><use href="#i-name"/></svg>; unknown names throw (caught by the build as an error). */
export function icon(name, cls = "") {
  if (!ICONS[name]) throw new Error(`unknown icon "${name}"`);
  return `<svg class="i${cls ? " " + cls : ""}" aria-hidden="true" focusable="false"><use href="#i-${name}"/></svg>`;
}
/** Sheet mark: size "" (24), "lg" (32), "xl" (44). Decorative: always next to the region's name or code in text. */
export function bullet(region, size = "") {
  if (!REGIONS[region]) throw new Error(`unknown region "${region}"`);
  return `<svg class="bullet${size ? " " + size : ""}" aria-hidden="true" focusable="false"><use href="#b-${region}"/></svg>`;
}
/** The brand mark (placeholder compass medallion), decorative. */
export const mark = (cls = "brand-mark") => `<svg class="${cls}" viewBox="0 0 32 32" aria-hidden="true" focusable="false"><use href="#mark"/></svg>`;
/** The wordmark as text: "TAMPA BAY" in spaced caps above "Chartbook" (the design agent may replace the markup;
 *  keep the function name). With label: the text is the accessible name; without: decorative. */
export function wordmark(cls = "wordmark", label = true) {
  return `<span class="${cls}"${label ? "" : ' aria-hidden="true"'}><span class="wm-top">Tampa Bay</span> <span class="wm-main">Chartbook</span></span>`;
}

/** The sprite, emitted once per page right after <body>. */
export function sprite() {
  return `<svg class="sprite" width="0" height="0" aria-hidden="true" focusable="false"><defs>`
    + Object.entries(ICONS).map(([k, v]) => `<symbol id="i-${k}" viewBox="0 0 24 24">${v}</symbol>`).join("")
    + REGION_IDS.map(sheetSymbol).join("")
    + MARK
    + `</defs></svg>`;
}
