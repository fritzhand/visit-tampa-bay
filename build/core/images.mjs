/* ============================================================
   build/core/images.mjs · OWNER: E1 (build engine; ported from Cincy Week)
   Reads data/images.json (written by the images pass from data/media.json:
   rights-cleared Commons / history-of-tampa images only, never hotlinked) and
   renders <img> with explicit dimensions, srcset and lazy loading, with its
   credit line; or, with no image, a typographic plate (the record's name and
   its sheet's chart code), never a stock photo.

   Manifest (keys "<kind>/<id>"; kind p place · s stay · a area · t timeline · x experience · r region):
     { file: "img/p/<id>.webp", w, h,
       lg?: { file, w, h },   a larger variant (detail pages, dialogs)
       sm?: { file, w, h },   a small variant (cards, lists)
       alt,                   what the image shows, plainly (media.alt)
       credit,                "Creator / Wikimedia Commons (CC BY-SA 4.0)" (required)
       license,               public-domain | cc0 | cc-by | cc-by-sa | us-gov (required)
       license_url?, page_url?, creator?, media?: media id }
   Files live in site/img/<kind>/ and are copied to docs/assets/img/<kind>/.

   API (ctx.img):
     img(root, kind, id, { alt, cls, sizes, lazy = true, big = false }) → <img …> | "" (no image)
     has(kind, id) · entry(kind, id) → manifest record | null · path(kind, id) → "assets/img/…" | null
     srcset(root, kind, id) → "…-sm.webp 320w, ….webp 640w, …-lg.webp 1280w" | ""
     plate(root, kind, rec, { size: ""|"lg", cls, alt }) → .photo with the image, or .plate-type[data-sheet]
                             (chart code + name; decorative, the name is always in the card's heading)
     figure(root, kind, id, { cls, sizes, big, caption }) → <figure class="photo-fig"> with img + figcaption
                             credit (license linked) | ""
     credit(kind, id) → the credit line (plain text) | ""
     creditHtml(kind, id) → credit with the license and the Commons page linked | ""
   ============================================================ */
import { esc, attr, extLink } from "./util.mjs";
import { REGIONS, LICENSE_LABEL } from "./vocab.mjs";

export const SIZES = {
  card: "(min-width: 1100px) 320px, (min-width: 560px) 45vw, 92vw",
  lead: "(min-width: 1100px) 760px, 100vw",
  thumb: "96px",
};
export const IMAGE_KINDS = { p: "place", s: "stay", a: "area", t: "timeline", x: "experience", r: "region" };

export function makeImages(db) {
  const M = db.images || {};
  const entry = (kind, id) => M[`${kind}/${id}`] || null;
  const has = (kind, id) => !!entry(kind, id);
  const path = (kind, id) => { const e = entry(kind, id); return e ? `assets/${e.file}` : null; };
  function srcset(root, kind, id) {
    const e = entry(kind, id);
    if (!e) return "";
    const v = [[e.file, e.w]];
    if (e.sm) v.unshift([e.sm.file, e.sm.w]);
    if (e.lg) v.push([e.lg.file, e.lg.w]);
    return v.length > 1 ? v.map(([f, w]) => `${root}assets/${f} ${w}w`).join(", ") : "";
  }
  function img(root, kind, id, { alt, cls = "", sizes = "", lazy = true, big = false } = {}) {
    const e = entry(kind, id);
    if (!e) return "";
    const main = big && e.lg ? e.lg : e;
    const set = srcset(root, kind, id);
    const sz = sizes || (big ? SIZES.lead : SIZES.card);
    return `<img${cls ? ` class="${attr(cls)}"` : ""} src="${attr(root + "assets/" + main.file)}"${set ? ` srcset="${attr(set)}" sizes="${attr(sz)}"` : ""} alt="${attr(alt ?? e.alt ?? "")}" width="${main.w}" height="${main.h}"${lazy ? ' loading="lazy"' : ""} decoding="async">`;
  }
  const credit = (kind, id) => entry(kind, id)?.credit || "";
  function creditHtml(kind, id) {
    const e = entry(kind, id);
    if (!e) return "";
    const lic = LICENSE_LABEL[e.license] || e.license;
    // the credit line usually names the license already ("… (CC BY-SA 4.0)"): then only link it as "License"
    const named = e.credit.toLowerCase().includes(lic.toLowerCase());
    const licHtml = e.license_url ? extLink(e.license_url, named ? "License" : esc(lic)) : named ? "" : esc(lic);
    return [esc(e.credit), licHtml, e.page_url ? extLink(e.page_url, "Image page") : ""].filter(Boolean).join(" · ");
  }
  /** A card's picture: the image, or a typographic plate with the chart code (decorative: the heading names it). */
  function plate(root, kind, rec, { size = "", cls = "", alt, sizes = "" } = {}) {
    const region = rec.region || (kind === "r" ? rec.id : null);
    const i = img(root, kind, rec.id, { alt: alt ?? entry(kind, rec.id)?.alt ?? "", sizes, big: size === "lg" });
    if (i) return `<span class="photo${size ? " " + size : ""}${cls ? " " + cls : ""}">${i}</span>`;
    const code = region && REGIONS[region] ? REGIONS[region].code : "";
    return `<span class="plate-type${size ? " " + size : ""}${cls ? " " + cls : ""}"${region ? ` data-sheet="${region}"` : ""} aria-hidden="true">${code ? `<span class="pt-code">${esc(code)}</span>` : ""}<span class="pt-name">${esc(rec.name || rec.title || "")}</span></span>`;
  }
  function figure(root, kind, id, { cls = "", sizes = "", big = true, caption = "" } = {}) {
    const i = img(root, kind, id, { sizes, big, lazy: !big });
    if (!i) return "";
    return `<figure class="photo-fig${cls ? " " + cls : ""}">${i}<figcaption>${caption ? `<span>${esc(caption)}</span> ` : ""}<span class="credit">${creditHtml(kind, id)}</span></figcaption></figure>`;
  }
  return { img, has, entry, path, srcset, plate, figure, credit, creditHtml, SIZES, KINDS: IMAGE_KINDS };
}
