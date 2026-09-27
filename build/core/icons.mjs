/* ============================================================
   build/core/icons.mjs · OWNER: E1 (build engine: the sprite plumbing, ICONS) · brand markup: the design system
   (the chart symbols, the sheet badges #b-<region>, the mark #mark, wordmark(), rose(), wordmarkArt()).
   The inline SVG sprite every page carries once:
   - stroke icons  #i-<name>    24 grid, 2px, round caps; color = currentColor
   - sheet badges  #b-<region>  "Chart & Label" (design/DESIGN.md §3): the sheet's shape (cartouche, roundel,
                                lozenge, shield, slant, burgee) filled with its ink and its chart code ("TP")
                                outlined in Archivo, viewBox 44 × 26, painted only through custom properties
                                (--sheet-<id>, -on, -edge), so they theme inside <use>. Never under 24px tall.
   - the mark      #mark        the compass-rose medallion in a cigar band (design/brand/mark.svg), fixed
                                --mark-* inks in both editions (tokens.css)
   The big drawings (the stacked wordmark, the rose) live in the external sprite assets/img/brand/brand.svg:
   wordmarkArt(root, …) and rose(root, …) reference it, so only pages that show them pay for them.
   Use icon(name) and bullet(region) in markup; never paste raw SVG paths.
   To add an icon: add it to ICONS (the build fails on an unknown name).
   Chart symbols are the icon language (SPEC.md §3, DESIGN.md §10): anchor = where to stay, landmark (circle
   with a center dot) = historic site, flag = event, daymark = experience departure, buoy = a place,
   course = a passage, seal = signature. A symbol always sits beside a word.
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
  anchor: '<circle cx="12" cy="4.6" r="2"/><path d="M12 6.6V21M8.3 9.8h7.4M4.3 13.4c.5 4.2 3.7 7.6 7.7 7.6s7.2-3.4 7.7-7.6M2.8 15.3l1.5-1.9 2 1.2M21.2 15.3l-1.5-1.9-2 1.2"/>',
  landmark: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="1.1"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="M12 5.2 14 12l-2 6.8L10 12z"/><path d="M5.2 12h1.6M17.2 12h1.6"/>',
  flag: '<path d="M5.5 21.5V2.8M5.5 3.8h12.8l-2.9 4.4 2.9 4.4H5.5"/>',
  daymark: '<path d="M12 21.5v-8.8"/><path d="M12 2.8 18.4 12.7H5.6z"/>',
  wave: '<path d="M2.5 9.5c1.6 0 1.6-2 3.2-2s1.6 2 3.1 2 1.6-2 3.2-2 1.6 2 3.2 2 1.6-2 3.1-2 1.6 2 3.2 2"/><path d="M2.5 15.5c1.6 0 1.6-2 3.2-2s1.6 2 3.1 2 1.6-2 3.2-2 1.6 2 3.2 2 1.6-2 3.1-2 1.6 2 3.2 2"/>',
  boat: '<path d="M3.5 16h17l-2.6 4.5H6.1z"/><path d="M12 3v13M12 4.5 18 13.5h-6"/>',
  ferry: '<path d="M3 14.4h18l-2.4 5.1H5.4z"/><path d="M6.2 14.4V10.2h10.6l1.4 4.2M9 10.2V7.3h5v2.9"/>',
  fish: '<path d="M3 12c3-4.5 9-6 14 0-5 6-11 4.5-14 0z"/><path d="M17 12l4-3v6zM7.5 11h.01"/>',
  palm: '<path d="M12.6 21.5c.3-4.7 0-8.5-1.3-12"/><path d="M11.3 9.5C9.7 6.8 6.1 6 3.6 7.6M11.3 9.5c1-3 4.4-4.4 7.3-3.2M11.3 9.5c2.8-.4 6 1.4 7.2 4.3M11.3 9.5c-2.5.8-4.8 3.4-4.9 6.4"/>',
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
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  buoy: '<path d="M8.4 16.2 9.6 7.6h4.8l1.2 8.6M5.8 16.2h12.4M12 7.6V4.2M10 4.2h4"/><path d="M2.5 20.4c1.6 0 1.6-2 3.2-2s1.6 2 3.1 2 1.6-2 3.2-2 1.6 2 3.2 2 1.6-2 3.1-2 1.6 2 3.2 2"/>',
  lighthouse: '<path d="M9.2 21.5 10.4 9.2h3.2l1.2 12.3M8.6 9.2h6.8M10.4 6.6h3.2v2.6h-3.2zM12 4v2.6M6.5 21.5h11M4.4 6.3l2.5.7M19.6 6.3l-2.5.7"/>',
  beach: '<path d="M3.6 11.6a8.4 8.4 0 0 1 16.8 0z"/><path d="M12 11.6v8.6M8 20.6h8"/>',
  course: '<path d="M4.5 19.5 19.5 4.5" stroke-dasharray="2.6 3.2"/><path d="M13 4.5h6.5V11"/>',
  seal: '<path d="M12 2.8l1.9 1.4 2.3-.4.9 2.2 2.2.9-.4 2.3 1.4 1.9-1.4 1.9.4 2.3-2.2.9-.9 2.2-2.3-.4L12 21.2l-1.9-1.4-2.3.4-.9-2.2-2.2-.9.4-2.3L3.7 12l1.4-1.9-.4-2.3 2.2-.9.9-2.2 2.3.4z"/><circle cx="12" cy="12" r="3.2"/>',
  trolley: '<rect x="5" y="4.5" width="14" height="12" rx="2"/><path d="M5 10.5h14M9 20.5l1.5-4M15 20.5l-1.5-4M8.5 2.5h7"/>',
  cigar: '<path d="M3.2 16.9 16.4 6.8a2.4 2.4 0 0 1 3 3.7L6.2 20.6a2.4 2.4 0 0 1-3-3.7z"/><path d="M12.6 9.7l3 3.9M19.6 4.4l1.6-1.6"/>',
};

/** Sheet ids (a closed set, in sheet order) and their chart codes (vocab.mjs REGIONS). */
export const REGION_CODES = Object.fromEntries(REGION_IDS.map((id) => [id, REGIONS[id].code]));
/** The sheet badges (design/brand/sheets.svg): [shape path, its transform, the outlined chart code, its transform].
 *  Shapes: cartouche (TP), roundel (SP), lozenge (GB), shield (CW), slant (AB), burgee (DT). */
const SHEET_ART = {
  tampa: ["M5.88 0H36.62A5.88 5.88 0 0 0 42.5 5.88V18.62A5.88 5.88 0 0 0 36.62 24.5H5.88A5.88 5.88 0 0 0 0 18.62V5.88A5.88 5.88 0 0 0 5.88 0Z", "translate(.75 .75)", "M4.2 0V-6.9H0.3V-8.9H10.6V-6.9H6.7V0Z M12.8 0V-8.9H19.7Q20.5 -8.9 21.2 -8.5Q21.8 -8.2 22.2 -7.5Q22.6 -6.8 22.6 -5.9Q22.6 -5 22.2 -4.3Q21.8 -3.7 21.2 -3.3Q20.5 -2.9 19.6 -2.9H15.3V0ZM15.3 -4.8H18.9Q19.5 -4.8 19.9 -5.1Q20.2 -5.4 20.2 -5.9Q20.2 -6.3 20 -6.5Q19.9 -6.8 19.6 -6.9Q19.3 -7.1 18.9 -7.1H15.3Z", "translate(10.56 17.46)"],
  stpete: ["M0 12.25A21.25 12.25 0 1 0 42.5 12.25A21.25 12.25 0 1 0 0 12.25Z", "translate(.75 .75)", "M5.8 0.2Q4.7 0.2 3.8 0Q2.9 -0.1 2.2 -0.4Q1.5 -0.7 1.1 -1.3Q0.7 -1.9 0.7 -2.8Q0.7 -2.8 0.7 -2.9Q0.7 -2.9 0.7 -2.9H3.1Q3.1 -2.9 3.1 -2.8Q3.1 -2.8 3.1 -2.7Q3.1 -2.3 3.4 -2.1Q3.7 -1.8 4.3 -1.7Q4.9 -1.6 5.6 -1.6Q6 -1.6 6.3 -1.7Q6.7 -1.7 7 -1.7Q7.3 -1.8 7.5 -1.9Q7.8 -2 7.9 -2.1Q8.1 -2.3 8.1 -2.5Q8.1 -2.8 7.7 -3Q7.4 -3.1 6.9 -3.2Q6.4 -3.3 5.8 -3.4Q5.2 -3.5 4.5 -3.6Q3.8 -3.7 3.2 -3.9Q2.5 -4.1 2 -4.4Q1.5 -4.7 1.2 -5.2Q0.9 -5.7 0.9 -6.4Q0.9 -7.1 1.2 -7.6Q1.6 -8.1 2.2 -8.4Q2.9 -8.8 3.7 -8.9Q4.6 -9.1 5.7 -9.1Q6.7 -9.1 7.6 -8.9Q8.4 -8.8 9 -8.4Q9.7 -8.1 10 -7.6Q10.3 -7.1 10.3 -6.4V-6.3H7.9V-6.4Q7.9 -6.7 7.6 -6.9Q7.4 -7.1 6.9 -7.2Q6.4 -7.3 5.8 -7.3Q5 -7.3 4.5 -7.2Q3.9 -7.1 3.7 -7Q3.5 -6.8 3.5 -6.6Q3.5 -6.3 3.8 -6.1Q4.1 -6 4.6 -5.9Q5.1 -5.8 5.7 -5.7Q6.4 -5.6 7 -5.5Q7.7 -5.4 8.3 -5.2Q9 -5.1 9.5 -4.7Q10 -4.4 10.3 -4Q10.6 -3.5 10.6 -2.8Q10.6 -1.7 10 -1.1Q9.4 -0.4 8.3 -0.1Q7.2 0.2 5.8 0.2Z M13.2 0V-8.9H20Q20.8 -8.9 21.5 -8.5Q22.2 -8.2 22.5 -7.5Q22.9 -6.8 22.9 -5.9Q22.9 -5 22.5 -4.3Q22.1 -3.7 21.5 -3.3Q20.8 -2.9 19.9 -2.9H15.6V0ZM15.6 -4.8H19.2Q19.8 -4.8 20.2 -5.1Q20.5 -5.4 20.5 -5.9Q20.5 -6.3 20.4 -6.5Q20.2 -6.8 19.9 -6.9Q19.6 -7.1 19.2 -7.1H15.6Z", "translate(10.41 17.46)"],
  beaches: ["M7.35 0H35.15L42.5 12.25L35.15 24.5H7.35L0 12.25Z", "translate(.75 .75)", "M6.2 0.2Q3.5 0.2 2.1 -1Q0.8 -2.1 0.8 -4.5Q0.8 -6 1.5 -7Q2.2 -8 3.5 -8.6Q4.8 -9.1 6.7 -9.1Q7.8 -9.1 8.8 -8.9Q9.8 -8.7 10.6 -8.3Q11.3 -7.8 11.7 -7.2Q12.1 -6.6 12.1 -5.7H9.7Q9.7 -6.1 9.5 -6.4Q9.2 -6.7 8.8 -6.9Q8.4 -7 7.9 -7.1Q7.4 -7.2 6.8 -7.2Q6 -7.2 5.3 -7Q4.7 -6.9 4.2 -6.6Q3.8 -6.2 3.5 -5.8Q3.3 -5.3 3.3 -4.6V-4.3Q3.3 -3.4 3.7 -2.8Q4.1 -2.3 4.8 -2Q5.5 -1.7 6.6 -1.7Q7.5 -1.7 8.2 -1.9Q8.9 -2.1 9.3 -2.4Q9.7 -2.8 9.7 -3.2V-3.3H6.4V-5H12.1V0H10.7L10.4 -1.1Q9.9 -0.7 9.3 -0.4Q8.6 -0.1 7.8 0Q7.1 0.2 6.2 0.2Z M15.1 0V-8.9H22.3Q23 -8.9 23.6 -8.7Q24.2 -8.4 24.5 -7.9Q24.9 -7.4 24.9 -6.7Q24.9 -6.2 24.7 -5.7Q24.5 -5.3 24.1 -5.1Q23.8 -4.8 23.3 -4.7V-4.6Q23.8 -4.5 24.2 -4.2Q24.6 -4 24.9 -3.5Q25.1 -3.1 25.1 -2.4Q25.1 -1.6 24.7 -1.1Q24.4 -0.6 23.7 -0.3Q23.1 0 22.3 0ZM17.6 -1.8H21.6Q22 -1.8 22.3 -2.1Q22.6 -2.3 22.6 -2.8Q22.6 -3 22.4 -3.2Q22.3 -3.5 22.1 -3.6Q21.9 -3.7 21.5 -3.7H17.6ZM17.6 -5.4H21.4Q21.7 -5.4 21.9 -5.5Q22.1 -5.6 22.2 -5.8Q22.3 -6 22.3 -6.3Q22.3 -6.7 22.1 -6.9Q21.8 -7.2 21.4 -7.2H17.6Z", "translate(9.13 17.46)"],
  clearwater: ["M0 0H42.5V10.29C42.5 17.64 31.45 22.05 21.25 24.5C11.05 22.05 0 17.64 0 10.29Z", "translate(.75 .75)", "M6.3 0.2Q4.5 0.2 3.2 -0.4Q2 -0.9 1.4 -1.9Q0.8 -3 0.8 -4.5Q0.8 -6.7 2.2 -7.9Q3.6 -9.1 6.3 -9.1Q7.9 -9.1 9 -8.6Q10.2 -8.2 10.9 -7.4Q11.5 -6.5 11.5 -5.4H9.1Q9.1 -6 8.7 -6.4Q8.4 -6.8 7.8 -7Q7.1 -7.2 6.3 -7.2Q5.3 -7.2 4.7 -6.9Q4 -6.6 3.7 -6Q3.3 -5.4 3.3 -4.6V-4.3Q3.3 -3.5 3.7 -3Q4 -2.4 4.7 -2.1Q5.3 -1.7 6.3 -1.7Q7.2 -1.7 7.8 -1.9Q8.5 -2.1 8.8 -2.5Q9.1 -3 9.1 -3.5H11.5Q11.5 -2.4 10.9 -1.6Q10.2 -0.7 9.1 -0.3Q7.9 0.2 6.3 0.2Z M15.9 0 13 -8.9H15.6L17.1 -3.9Q17.2 -3.7 17.2 -3.5Q17.3 -3.2 17.4 -3Q17.4 -2.7 17.5 -2.5H17.5Q17.6 -2.7 17.6 -2.9Q17.7 -3.1 17.7 -3.3Q17.7 -3.5 17.8 -3.6Q17.8 -3.8 17.9 -3.9L19.3 -8.9H22.5L23.9 -3.9Q23.9 -3.8 24 -3.5Q24 -3.3 24.1 -3Q24.1 -2.7 24.2 -2.5H24.2Q24.3 -2.7 24.3 -2.9Q24.4 -3.1 24.4 -3.2Q24.5 -3.4 24.5 -3.6Q24.6 -3.8 24.6 -3.9L26.1 -8.9H28.5L25.6 0H22.7L21.1 -5.5Q21 -5.7 21 -5.9Q20.9 -6.2 20.9 -6.4Q20.8 -6.6 20.8 -6.8H20.7Q20.7 -6.6 20.6 -6.3Q20.6 -6.1 20.5 -5.9Q20.5 -5.7 20.4 -5.5L18.9 0Z", "translate(7.7 15.64)"],
  around: ["M7.35 0H42.5L35.15 24.5H0Z", "translate(.75 .75)", "M0.2 0 4.6 -8.9H7.4L11.8 0H9.1L8.4 -1.5H3.5L2.8 0ZM4.4 -3.4H7.5L6.7 -5.3Q6.6 -5.4 6.5 -5.6Q6.4 -5.9 6.3 -6.1Q6.2 -6.4 6.1 -6.6Q6.1 -6.8 6 -6.9H5.9Q5.8 -6.7 5.7 -6.4Q5.6 -6 5.4 -5.7Q5.3 -5.4 5.2 -5.3Z M14 0V-8.9H21.2Q21.9 -8.9 22.5 -8.7Q23.1 -8.4 23.4 -7.9Q23.8 -7.4 23.8 -6.7Q23.8 -6.2 23.6 -5.7Q23.4 -5.3 23 -5.1Q22.7 -4.8 22.2 -4.7V-4.6Q22.7 -4.5 23.1 -4.2Q23.5 -4 23.8 -3.5Q24 -3.1 24 -2.4Q24 -1.6 23.6 -1.1Q23.3 -0.6 22.6 -0.3Q22 0 21.2 0ZM16.5 -1.8H20.5Q20.9 -1.8 21.2 -2.1Q21.5 -2.3 21.5 -2.8Q21.5 -3 21.3 -3.2Q21.2 -3.5 21 -3.6Q20.8 -3.7 20.4 -3.7H16.5ZM16.5 -5.4H20.2Q20.6 -5.4 20.8 -5.5Q21 -5.6 21.1 -5.8Q21.2 -6 21.2 -6.3Q21.2 -6.7 21 -6.9Q20.7 -7.2 20.3 -7.2H16.5Z", "translate(9.68 17.46)"],
  daytrips: ["M0 0H42.5L34.17 12.25L42.5 24.5H0Z", "translate(.75 .75)", "M1.1 0V-8.9H6.1Q7.7 -8.9 8.9 -8.4Q10.1 -7.9 10.7 -6.9Q11.4 -5.9 11.4 -4.5Q11.4 -3 10.7 -2Q10.1 -1 8.9 -0.5Q7.7 0 6.1 0ZM3.6 -1.9H5.9Q6.6 -1.9 7.1 -2.1Q7.6 -2.2 8 -2.5Q8.4 -2.8 8.6 -3.3Q8.8 -3.7 8.8 -4.3V-4.6Q8.8 -5.2 8.6 -5.7Q8.4 -6.1 8 -6.4Q7.6 -6.7 7.1 -6.9Q6.6 -7.1 5.9 -7.1H3.6Z M16.8 0V-6.9H12.9V-8.9H23.2V-6.9H19.3V0Z", "translate(7.62 17.46)"],
};
const sheetSymbol = (id) => { const [d, t, code, ct] = SHEET_ART[id]; return `<symbol id="b-${id}" viewBox="0 0 44 26"><path d="${d}" transform="${t}" style="fill:var(--sheet-${id});stroke:var(--sheet-${id}-edge);stroke-width:1.5;stroke-linejoin:round"/><path d="${code}" transform="${ct}" style="fill:var(--sheet-${id}-on)"/></symbol>`; };

/** The mark (design/brand/mark.svg): a compass-rose medallion in a cigar band, fixed --mark-* inks (tokens.css). */
export const MARK = '<symbol id="mark" viewBox="0 0 64 64"><rect style="fill:var(--mark-ink)" x=".6" y="21.6" width="62.8" height="20.8" rx="1.2"/><rect style="fill:var(--mark-gold)" x="1.8" y="22.8" width="60.4" height="18.4" rx=".6"/><path style="fill:var(--mark-ink)" d="M1.8 25.4h60.4v.9H1.8zM1.8 37.7h60.4v.9H1.8z"/><path style="fill:var(--mark-ink)" d="M5.6 32 7.6 29.2 9.6 32 7.6 34.8zM54.4 32l2-2.8 2 2.8-2 2.8z"/><ellipse style="fill:var(--mark-gold)" cx="32" cy="32" rx="23.4" ry="31.2"/><ellipse style="fill:var(--mark-ink)" cx="32" cy="32" rx="22.3" ry="30.1"/><ellipse style="fill:var(--mark-gold)" cx="32" cy="32" rx="20.3" ry="28.1"/><ellipse style="fill:var(--mark-paper)" cx="32" cy="32" rx="19" ry="26.8"/><ellipse style="fill:none;stroke:var(--mark-gold);stroke-width:1.1" cx="32" cy="32" rx="17.1" ry="24.9"/><path style="fill:var(--mark-ink)" d="M32 32L39.42 24.58L33.63 33.63Z"/><path style="fill:var(--mark-paper);stroke:var(--mark-ink);stroke-width:.85;stroke-linejoin:round" d="M32 32L39.42 24.58L30.37 30.37Z"/><path style="fill:var(--mark-ink)" d="M32 32L39.42 39.42L30.37 33.63Z"/><path style="fill:var(--mark-paper);stroke:var(--mark-ink);stroke-width:.85;stroke-linejoin:round" d="M32 32L39.42 39.42L33.63 30.37Z"/><path style="fill:var(--mark-ink)" d="M32 32L24.58 39.42L30.37 30.37Z"/><path style="fill:var(--mark-paper);stroke:var(--mark-ink);stroke-width:.85;stroke-linejoin:round" d="M32 32L24.58 39.42L33.63 33.63Z"/><path style="fill:var(--mark-ink)" d="M32 32L24.58 24.58L33.63 30.37Z"/><path style="fill:var(--mark-paper);stroke:var(--mark-ink);stroke-width:.85;stroke-linejoin:round" d="M32 32L24.58 24.58L30.37 33.63Z"/><path style="fill:var(--mark-ink)" d="M32 32L47 32L32 35.5Z"/><path style="fill:var(--mark-paper);stroke:var(--mark-ink);stroke-width:.85;stroke-linejoin:round" d="M32 32L47 32L32 28.5Z"/><path style="fill:var(--mark-ink)" d="M32 32L17 32L32 28.5Z"/><path style="fill:var(--mark-paper);stroke:var(--mark-ink);stroke-width:.85;stroke-linejoin:round" d="M32 32L17 32L32 35.5Z"/><path style="fill:var(--mark-ink)" d="M32 32L32 53L28.5 32Z"/><path style="fill:var(--mark-paper);stroke:var(--mark-ink);stroke-width:.85;stroke-linejoin:round" d="M32 32L32 53L35.5 32Z"/><path style="fill:var(--mark-north)" d="M32 32L32 10.5L35.5 32Z"/><path style="fill:var(--mark-paper);stroke:var(--mark-ink);stroke-width:.85;stroke-linejoin:round" d="M32 32L32 10.5L28.5 32Z"/><circle style="fill:var(--mark-gold);stroke:var(--mark-ink);stroke-width:.9" cx="32" cy="32" r="2.4"/></symbol>';

/** <svg class="i …"><use href="#i-name"/></svg>; unknown names throw (caught by the build as an error). */
export function icon(name, cls = "") {
  if (!ICONS[name]) throw new Error(`unknown icon "${name}"`);
  return `<svg class="i${cls ? " " + cls : ""}" aria-hidden="true" focusable="false"><use href="#i-${name}"/></svg>`;
}
/** Sheet badge (the sheet's shape, ink and chart code): size "" (40 × 24), "lg" (56 × 33), "xl" (75 × 44).
 *  Never smaller than 24px tall (its code is then 12px). Decorative: always next to the region's name in text. */
export function bullet(region, size = "") {
  if (!REGIONS[region]) throw new Error(`unknown region "${region}"`);
  return `<svg class="bullet${size ? " " + size : ""}" viewBox="0 0 44 26" aria-hidden="true" focusable="false"><use href="#b-${region}"/></svg>`;
}
/** The brand mark (the compass medallion in its cigar band), decorative: the link or text around it names the site. */
export const mark = (cls = "brand-mark") => `<svg class="${cls}" viewBox="0 0 64 64" aria-hidden="true" focusable="false"><use href="#mark"/></svg>`;
/** The wordmark in live type: "TAMPA BAY" in spaced Archivo caps and "Chartbook" in Bodoni Moda (DOM order reads
 *  "Tampa Bay Chartbook"; the topbar lockup shows Chartbook first, the footer stacks them). With label: role="img"
 *  named "Tampa Bay Chartbook"; without: decorative (the enclosing link carries the name). Classes: .wordmark .wm-top .wm-main. */
export function wordmark(cls = "wordmark", label = true) {
  const c = cls && cls !== "wordmark" ? `wordmark ${cls}` : "wordmark";
  return `<span class="${c}"${label ? ' role="img" aria-label="Tampa Bay Chartbook"' : ' aria-hidden="true"'}><span class="wm-top">Tampa Bay</span> <span class="wm-main">Chartbook</span></span>`;
}
/** The external brand sprite (site/img/brand/brand.svg → assets/img/brand/brand.svg). */
export const BRAND_SPRITE = "assets/img/brand/brand.svg";
const ART = { wm: "0 -2 544.2 132", "wm-line": "0 -77 937.2 91", "wm-word": "0 -77 541.2 91" };
/** The outlined wordmark from the brand sprite: variant "wm" (stacked, TAMPA BAY over Chartbook, for mastheads),
 *  "wm-line" (one line), "wm-word" ("Chartbook" alone). Ink: currentColor; TAMPA BAY reads --wordmark-accent.
 *  label: its accessible name ("" = decorative). */
export function wordmarkArt(root, { variant = "wm", cls = "wm-art", label = "Tampa Bay Chartbook" } = {}) {
  if (!ART[variant]) throw new Error(`unknown wordmark variant "${variant}"`);
  return `<svg class="${cls}" viewBox="${ART[variant]}"${label ? ` role="img" aria-label="${label.replace(/"/g, "&quot;")}"` : ' aria-hidden="true"'} focusable="false"><use href="${root}${BRAND_SPRITE}#${variant}"/></svg>`;
}
/** The compass rose from the brand sprite (32 points, a degree ring), decorative. Inks: --compass-dark (currentColor),
 *  --compass-light, --compass-north (magenta), --compass-hub (gold); .rose in 22-ornaments.css sets them. */
export const rose = (root, cls = "rose") => `<svg class="${cls}" viewBox="0 0 200 200" aria-hidden="true" focusable="false"><use href="${root}${BRAND_SPRITE}#compass"/></svg>`;

/** The sprite, emitted once per page right after <body>. */
export function sprite() {
  return `<svg class="sprite" width="0" height="0" aria-hidden="true" focusable="false"><defs>`
    + Object.entries(ICONS).map(([k, v]) => `<symbol id="i-${k}" viewBox="0 0 24 24">${v}</symbol>`).join("")
    + REGION_IDS.map(sheetSymbol).join("")
    + MARK
    + `</defs></svg>`;
}
