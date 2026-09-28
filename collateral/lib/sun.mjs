/* ============================================================
   collateral/lib/sun.mjs — sunrise and sunset, computed (never typed), for the promo's day.

   Method 1: NOAA's solar-position equations (the Global Monitoring Laboratory's solar calculator,
   zenith 90.833° for refraction and the solar disc), iterated twice at the event's own instant.
   Method 2 (the cross-check): the simple "sunrise equation" with the same −0.833° altitude.
   sunTimes() fails if the two methods disagree by more than 3 minutes.
   Inputs are the records' own coordinates and the date; outputs are epoch ms (UTC instants).
   ============================================================ */
const rad = (d) => (d * Math.PI) / 180, deg = (r) => (r * 180) / Math.PI;
const JD_UNIX = 2440587.5;
const jdOf = (ms) => ms / 86400000 + JD_UNIX;
const msOf = (jd) => (jd - JD_UNIX) * 86400000;

/** NOAA: equation of time (min) and declination (deg) at Julian day jd. */
function noaa(jd) {
  const T = (jd - 2451545) / 36525;
  const L0 = (280.46646 + T * (36000.76983 + T * 0.0003032)) % 360;
  const M = 357.52911 + T * (35999.05029 - 0.0001537 * T);
  const e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);
  const C = Math.sin(rad(M)) * (1.914602 - T * (0.004817 + 0.000014 * T)) + Math.sin(rad(2 * M)) * (0.019993 - 0.000101 * T) + Math.sin(rad(3 * M)) * 0.000289;
  const trueLong = L0 + C;
  const omega = 125.04 - 1934.136 * T;
  const appLong = trueLong - 0.00569 - 0.00478 * Math.sin(rad(omega));
  const eps0 = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60;
  const eps = eps0 + 0.00256 * Math.cos(rad(omega));
  const decl = deg(Math.asin(Math.sin(rad(eps)) * Math.sin(rad(appLong))));
  const y = Math.tan(rad(eps / 2)) ** 2;
  const eqTime = 4 * deg(y * Math.sin(2 * rad(L0)) - 2 * e * Math.sin(rad(M)) + 4 * e * y * Math.sin(rad(M)) * Math.cos(2 * rad(L0)) - 0.5 * y * y * Math.sin(4 * rad(L0)) - 1.25 * e * e * Math.sin(2 * rad(M)));
  return { eqTime, decl };
}

/** NOAA sunrise/sunset (epoch ms) for the UTC calendar date of `dayUtcMs` (00:00 UTC of the civil date). */
function noaaEvent(dayUtcMs, lat, lng, rising) {
  let t = dayUtcMs + (rising ? 12 : 22) * 3600000;              // first guess (Florida: ~12:00 UTC rise, ~22:30 UTC set)
  for (let k = 0; k < 3; k++) {
    const { eqTime, decl } = noaa(jdOf(t));
    const cosH = Math.cos(rad(90.833)) / (Math.cos(rad(lat)) * Math.cos(rad(decl))) - Math.tan(rad(lat)) * Math.tan(rad(decl));
    const ha = deg(Math.acos(cosH));
    const noonMin = 720 - 4 * lng - eqTime;                        // UTC minutes of solar noon
    const min = rising ? noonMin - 4 * ha : noonMin + 4 * ha;
    t = dayUtcMs + min * 60000;
  }
  return Math.round(t);
}

/** The sunrise equation (Wikipedia form), −0.833° altitude. */
function simpleEvent(dayUtcMs, lat, lng, rising) {
  const jd = jdOf(dayUtcMs + 12 * 3600000);
  const n = Math.round(jd - 2451545.0 + 0.0008);
  const Js = n - lng / 360;
  const M = (357.5291 + 0.98560028 * Js) % 360;
  const C = 1.9148 * Math.sin(rad(M)) + 0.02 * Math.sin(rad(2 * M)) + 0.0003 * Math.sin(rad(3 * M));
  const lam = (M + C + 180 + 102.9372) % 360;
  const Jt = 2451545 + Js + 0.0053 * Math.sin(rad(M)) - 0.0069 * Math.sin(rad(2 * lam));
  const d = Math.asin(Math.sin(rad(lam)) * Math.sin(rad(23.4397)));
  const w0 = deg(Math.acos((Math.sin(rad(-0.833)) - Math.sin(rad(lat)) * Math.sin(d)) / (Math.cos(rad(lat)) * Math.cos(d))));
  return Math.round(msOf(rising ? Jt - w0 / 360 : Jt + w0 / 360));
}

/** Sunrise or sunset at (lat, lng) on the civil date "YYYY-MM-DD": { t (epoch ms), noaa, simple, diffMin }. */
export function sunEvent(date, lat, lng, which) {
  const [y, m, d] = date.split("-").map(Number);
  const day = Date.UTC(y, m - 1, d);
  const rising = which === "rise";
  const a = noaaEvent(day, lat, lng, rising), b = simpleEvent(day, lat, lng, rising);
  const diffMin = Math.abs(a - b) / 60000;
  if (!(diffMin <= 3)) throw new Error(`sun: the two methods disagree by ${diffMin.toFixed(2)} min for ${which} on ${date} at ${lat},${lng}`);
  return { t: a, noaa: a, simple: b, diffMin: +diffMin.toFixed(2) };
}
