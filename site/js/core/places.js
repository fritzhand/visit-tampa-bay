/* ============================================================
   site/js/core/places.js · OWNER: E2 (client runtime)
   The map side of the dialogs (event, experience) and the trip view:
     mapBlock(meta, [lat, lng] | null, { sheet, label, focus, address })
       → a mini map (the same markup as the build's ctx.cards.miniMap: an SVG <use> of
         assets/map/basemap.svg#bm cropped with lib/geo.js crop(), one .pin.pin-place[data-sheet]),
         or the coordinate line when the point is off the basemap (or there is none yet),
         or "Not on the map: no coordinates listed";
         then directions (Apple Maps, Google Maps: the reader picks the mode) and "On the map"
         (map.html?focus=<focus>) when the point is on the basemap.
     directions(lat, lng) → { apple, google } · coordText(lat, lng) → "27.9506° N, 82.4572° W"
   `meta` is lib/geo.js metaOf(data/map.json), shipped as `map` in events.json and experiences.json
   (null until the basemap and map.json exist: then every map is a coordinate line).
   ============================================================ */
import { ROOT, esc, I, ext } from "./dom.js";
import { crop, onMap } from "../lib/geo.js";

export const directions = (lat, lng) => ({
  apple: `https://maps.apple.com/?daddr=${lat},${lng}`,
  google: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
});
export const coordText = (lat, lng) => `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? "N" : "S"}, ${Math.abs(lng).toFixed(4)}° ${lng < 0 ? "W" : "E"}`;

export function miniMap(meta, lat, lng, { sheet = null, label = "", halfWidthM = 900 } = {}) {
  const cr = meta && crop(lat, lng, meta, { halfWidthM });
  if (!cr) return `<p class="coord-line">${I("pin")}<span>${esc(coordText(lat, lng))}</span></p>`;
  return `<div class="mini-map"${label ? ` role="img" aria-label="${esc(`Map: ${label}`)}"` : ""}><svg viewBox="${cr.vb.join(" ")}" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false"><use href="${ROOT}assets/map/basemap.svg#bm"/></svg><span class="pin pin-place"${sheet ? ` data-sheet="${esc(sheet)}"` : ""} style="left: ${cr.px}%; top: ${cr.py}%"><span></span></span></div>`;
}

export function mapBlock(meta, ll, { sheet = null, label = "", focus = "", address = "" } = {}) {
  if (!ll) {
    const g = address ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}` : "";
    return `<p class="unk">Not on the map: no coordinates listed</p>${g ? `<p class="evd-dir">${ext(g, `${I("route")}Google Maps`, "btn btn-secondary btn-sm")}</p>` : ""}`;
  }
  const [lat, lng] = ll, d = directions(lat, lng);
  const on = !!meta && onMap(meta, lat, lng);
  return `${miniMap(meta, lat, lng, { sheet, label })}<p class="evd-dir">${ext(d.apple, `${I("route")}Apple Maps`, "btn btn-secondary btn-sm")}${ext(d.google, `${I("route")}Google Maps`, "btn btn-secondary btn-sm")}${on && focus ? `<a class="btn btn-secondary btn-sm" href="${ROOT}map.html?focus=${esc(focus)}">${I("map")}On the map</a>` : ""}</p>`;
}
