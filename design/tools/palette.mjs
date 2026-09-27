/* design/tools/palette.mjs · Tampa Bay Chartbook · design system "Chart & Label"
   The palette, defined in OKLCH (lightness, chroma, hue) so every ramp steps evenly, converted to sRGB hex
   for tokens.css (hex is what the build's theme-color check and every browser read). build-tokens.mjs writes
   design/tokens.css from this file; contrast.mjs reads tokens.css back and checks every pair.
   Zero dependencies. */

/* ---------- OKLCH -> sRGB hex (gamut-clipped per channel; the tables below stay inside sRGB) ---------- */
const gam = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
export function oklch(L, C, h) {
  const a = C * Math.cos((h * Math.PI) / 180), b = C * Math.sin((h * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const rgb = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  return "#" + rgb.map((x) => Math.round(Math.min(1, Math.max(0, gam(Math.min(1, Math.max(0, x))))) * 255).toString(16).padStart(2, "0")).join("");
}
const K = (L, C, h) => oklch(L, C, h);

/* ---------- hues ---------- */
export const HUE = {
  paper: 88,       // cream chart paper
  navy: 262,       // chart ink
  bay: 256,        // night water
  magenta: 350,    // chart magenta (notes, lights, courses)
  gold: 82,        // cigar-label gold leaf
};

/* The six sheets: hue + chroma per edition. Distinct hues around the wheel, clear of chart magenta (350)
   and cigar gold (82); lightness is fixed per role so every sheet passes the same contrast pairs. */
export const SHEETS = {
  tampa:      { n: 1, code: "TP", name: "Tampa",                       hue: 24,  cDay: 0.160, hueNight: 18,  cNight: 0.155, lNight: 0.720, word: "Ybor brick" },
  stpete:     { n: 2, code: "SP", name: "St. Petersburg",              hue: 58,  cDay: 0.130, hueNight: 52,  cNight: 0.145, lNight: 0.775, word: "sunshine orange" },
  beaches:    { n: 3, code: "GB", name: "Gulf Beaches",                hue: 196, cDay: 0.095, hueNight: 190, cNight: 0.095, lNight: 0.800, word: "Gulf turquoise" },
  clearwater: { n: 4, code: "CW", name: "Clearwater & North Pinellas", hue: 252, cDay: 0.125, hueNight: 255, cNight: 0.110, lNight: 0.760, word: "sponge-dock blue" },
  around:     { n: 5, code: "AB", name: "Around the Bay",              hue: 140, cDay: 0.115, hueNight: 140, cNight: 0.120, lNight: 0.800, word: "palmetto green" },
  daytrips:   { n: 6, code: "DT", name: "Day Trips",                   hue: 298, cDay: 0.130, hueNight: 300, cNight: 0.110, lNight: 0.770, word: "sunset violet" },
};

/* ---------- Day chart (light, default) ---------- */
const d = {};
d.bg = K(0.945, 0.032, 88);
d.surface = K(0.978, 0.017, 90);
d.surfaceAlt = K(0.915, 0.036, 86);
d.surfaceSunken = K(0.885, 0.040, 84);
d.pastBg = K(0.930, 0.026, 86);
d.border = K(0.835, 0.040, 82);
d.borderStrong = K(0.560, 0.045, 255);
d.text = K(0.275, 0.075, 262);
d.textMuted = K(0.400, 0.055, 260);
d.textFaint = K(0.475, 0.045, 258);
d.magenta = K(0.490, 0.190, 350);
d.magentaInk = K(0.430, 0.170, 350);
d.magentaDeep = K(0.370, 0.150, 350);
d.magentaTint = K(0.930, 0.035, 350);
d.gold = K(0.700, 0.120, 80);
d.goldInk = K(0.490, 0.095, 75);
d.goldTint = K(0.915, 0.050, 85);
d.goldHi = K(0.840, 0.100, 90);
d.goldLo = K(0.600, 0.110, 72);
d.success = K(0.470, 0.100, 165);
d.successTint = K(0.930, 0.030, 165);
d.warning = K(0.500, 0.110, 65);
d.warningTint = K(0.930, 0.050, 80);
d.warningEdge = K(0.660, 0.120, 72);
d.danger = K(0.490, 0.170, 27);
d.dangerTint = K(0.930, 0.035, 27);
d.waterLine = K(0.640, 0.060, 232);
d.navyDeep = K(0.220, 0.060, 262);
d.map = {
  land: K(0.928, 0.048, 87), water: K(0.875, 0.042, 222), waterLine: K(0.700, 0.065, 228), waterEdge: K(0.640, 0.060, 232),
  coast: K(0.420, 0.065, 248), park: K(0.885, 0.055, 132), sand: K(0.950, 0.050, 92),
  roadMinor: K(0.978, 0.017, 90), road: K(0.985, 0.012, 90), roadMajor: K(0.860, 0.095, 86), casing: K(0.780, 0.040, 82),
  label: K(0.400, 0.055, 260), labelWater: K(0.430, 0.085, 240), halo: K(0.928, 0.048, 87),
  graticule: K(0.275, 0.075, 262),
};

/* ---------- Night chart (dark) ---------- */
const n = {};
n.bg = K(0.230, 0.050, 256);
n.surface = K(0.265, 0.052, 256);
n.surfaceAlt = K(0.300, 0.050, 256);
n.surfaceSunken = K(0.200, 0.045, 256);
n.pastBg = K(0.245, 0.045, 256);
n.border = K(0.370, 0.045, 256);
n.borderStrong = K(0.620, 0.040, 250);
n.text = K(0.945, 0.030, 88);
n.textMuted = K(0.850, 0.030, 86);
n.textFaint = K(0.760, 0.030, 84);
n.gold = K(0.815, 0.125, 84);
n.goldInk = K(0.870, 0.100, 88);
n.goldTint = K(0.320, 0.055, 80);
n.goldHi = K(0.900, 0.090, 92);
n.goldLo = K(0.700, 0.115, 76);
n.goldDeep = K(0.560, 0.100, 76);
n.magenta = K(0.750, 0.130, 355);
n.magentaInk = K(0.800, 0.110, 355);
n.magentaTint = K(0.310, 0.060, 355);
n.success = K(0.800, 0.100, 165);
n.successTint = K(0.310, 0.045, 165);
n.warning = K(0.850, 0.115, 78);
n.warningTint = K(0.310, 0.050, 75);
n.warningEdge = K(0.700, 0.110, 72);
n.danger = K(0.760, 0.140, 25);
n.dangerTint = K(0.310, 0.060, 25);
n.waterLine = K(0.460, 0.065, 235);
n.map = {
  land: K(0.290, 0.045, 256), water: K(0.205, 0.045, 248), waterLine: K(0.360, 0.065, 236), waterEdge: K(0.430, 0.070, 236),
  coast: K(0.700, 0.100, 82), park: K(0.310, 0.045, 160), sand: K(0.340, 0.040, 85),
  roadMinor: K(0.350, 0.040, 256), road: K(0.410, 0.040, 256), roadMajor: K(0.560, 0.085, 82), casing: K(0.250, 0.045, 256),
  label: K(0.850, 0.030, 86), labelWater: K(0.800, 0.070, 222), halo: K(0.290, 0.045, 256),
  graticule: K(0.850, 0.030, 86),
};

/* ---------- sheet inks per edition ----------
   fill  bullets, badges, stripes, pin rings        Day L .51 (white-cream label on it) · Night L .745–.805 (navy label on it)
   ink   the sheet's name as text on paper and tint  Day L .45 · Night L .83
   tint  quiet ground (pressed chip, plate, callout) Day L .925 · Night L .31
   on    text on the fill                            Day surface cream · Night bay navy
   edge  keyline (>= 3:1 on paper)                   = fill */
export function sheetInks() {
  const out = {};
  for (const [id, s] of Object.entries(SHEETS)) {
    const hn = s.hueNight ?? s.hue;
    out[id] = {
      day: { fill: K(0.510, s.cDay, s.hue), ink: K(0.450, s.cDay * 0.9, s.hue), tint: K(0.925, 0.036, s.hue), on: d.surface },
      night: { fill: K(s.lNight ?? 0.780, s.cNight, hn), ink: K(0.830, s.cNight * 0.8, hn), tint: K(0.310, 0.055, hn), on: n.bg },
    };
    out[id].day.edge = out[id].day.fill;
    out[id].night.edge = out[id].night.fill;
  }
  return out;
}

export const DAY = d, NIGHT = n;
