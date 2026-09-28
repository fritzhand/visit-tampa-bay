/* ============================================================
   collateral/lib/promo-world.mjs — the chart table under the promo (plan.md §4.1, §4.2, §4.5).

   Units: basemap units (the viewBox of site/map/basemap.svg, 1000 × 1118); table px = 10 × units.
   The table is the site's own basemap rendered with its own tokens into a small pyramid of textures
   (each level rendered at its own resolution with the basemap's non-scaling strokes, so a line is the
   site's width at every scale), then drawn by WebGL2 under one camera shared with the CSS-3D devices:

     #world { transform: translate(Cx,Cy) rotateX(pitch) rotateZ(yaw) scale(s) translate(−X,−Y) }
     #scene { perspective: P; perspective-origin: ox oy }

   CAM_SRC is the one implementation of that matrix; it is evaluated in Node (poses, checks, audits)
   and injected into the stage page (WebGL, overlay), so the two can never disagree.
   ============================================================ */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { project, metaOf } from "../../site/js/lib/geo.js";

export const UNIT = 10;                                   // table px per basemap unit
export const PAPER = { x0: -30, y0: -30, x1: 1030, y1: 1148 };   // the chart plus its 30-unit paper margin

/** The texture pyramid. `ppu` = texture px per unit. WB is the whole-bay view's own resolution. */
export const LEVELS = [
  { id: "WB", ...PAPER, w: 1060, h: 1178, labels: { water: 17, town: 12, px: true } },
  { id: "L0", ...PAPER, w: 4096, h: 4550, labels: { water: 16, town: 8 } },
  { id: "L1", x0: 480, y0: 280, x1: 680, y1: 480, w: 2048, h: 2048, labels: { water: 6, town: 3 } },
  { id: "L2", x0: 170, y0: 740, x1: 330, y1: 900, w: 2048, h: 2048, labels: { water: 6, town: 3 } },
];
for (const L of LEVELS) L.ppu = L.w / (L.x1 - L.x0);

/* ---------- the camera (shared source: Node and the page) ---------- */
export const CAM_SRC = `
function camMul(a,b){const o=new Array(16).fill(0);for(let i=0;i<4;i++)for(let j=0;j<4;j++){let s=0;for(let k=0;k<4;k++)s+=a[i*4+k]*b[k*4+j];o[i*4+j]=s;}return o;}
function camT(x,y,z){return [1,0,0,x, 0,1,0,y, 0,0,1,z, 0,0,0,1];}
function camS(k){return [k,0,0,0, 0,k,0,0, 0,0,k,0, 0,0,0,1];}
function camRX(d){const a=d*Math.PI/180,c=Math.cos(a),s=Math.sin(a);return [1,0,0,0, 0,c,-s,0, 0,s,c,0, 0,0,0,1];}
function camRZ(d){const a=d*Math.PI/180,c=Math.cos(a),s=Math.sin(a);return [c,-s,0,0, s,c,0,0, 0,0,1,0, 0,0,0,1];}
/* the world matrix (row-major, column vectors): table px → pre-perspective screen */
function camWorld(c){return camMul(camT(c.Cx,c.Cy,0),camMul(camRX(c.pitch),camMul(camRZ(c.yaw),camMul(camS(c.s),camT(-c.X,-c.Y,0)))));}
/* the perspective of #scene about (ox, oy) */
function camPersp(v){return camMul(camT(v.ox,v.oy,0),camMul([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,-1/v.P,1],camT(-v.ox,-v.oy,0)));}
function camFull(c,v){return camMul(camPersp(v),camWorld(c));}
function camApply(M,x,y,z){const X=M[0]*x+M[1]*y+M[2]*(z||0)+M[3],Y=M[4]*x+M[5]*y+M[6]*(z||0)+M[7],Z=M[8]*x+M[9]*y+M[10]*(z||0)+M[11],Wv=M[12]*x+M[13]*y+M[14]*(z||0)+M[15];return [X/Wv,Y/Wv,Wv,Z];}
/* the CSS transform string for #world */
function camCss(c){return "translate("+c.Cx+"px,"+c.Cy+"px) rotateX("+c.pitch+"deg) rotateZ("+c.yaw+"deg) scale3d("+c.s+","+c.s+","+c.s+") translate("+(-c.X)+"px,"+(-c.Y)+"px)";}
/* screen px → table px on the z = 0 plane (a homography from columns 0, 1, 3 of the full matrix); null when behind the eye */
function camUnproject(M,sx,sy){
  const a=M[0],b=M[1],c=M[3],d=M[4],e=M[5],f=M[7],g=M[12],h=M[13],i=M[15];
  // solve [a b c; d e f; g h i] [x y 1]^T * k = [sx sy 1]^T
  const A=[a-sx*g,b-sx*h, d-sy*g,e-sy*h], B=[sx*i-c, sy*i-f];
  const det=A[0]*A[3]-A[1]*A[2]; if(Math.abs(det)<1e-12)return null;
  const x=(B[0]*A[3]-A[1]*B[1])/det, y=(A[0]*B[1]-B[0]*A[2])/det;
  const w=g*x+h*y+i; if(w<=0)return null; return [x,y];
}`;
const camNs = new Function(`${CAM_SRC}; return { camMul, camWorld, camPersp, camFull, camApply, camCss, camUnproject, camT, camS, camRX, camRZ };`)();
export const { camMul, camWorld, camPersp, camFull, camApply, camCss, camUnproject, camT, camS, camRX, camRZ } = camNs;

/** screen px of a table point (table px) under camera c and view v */
export const toScreen = (c, v, x, y, z = 0) => { const r = camApply(camFull(c, v), x, y, z); return [r[0], r[1]]; };

/* ---------- geography ---------- */
let _meta = null;
export function mapMeta(root) {
  if (!_meta) _meta = metaOf(JSON.parse(fs.readFileSync(path.join(root, "data", "map.json"), "utf8")));
  return _meta;
}
/** [lat, lng] → table px */
export const tablePx = (meta, lat, lng) => { const [x, y] = project(lat, lng, meta); return [x * UNIT, y * UNIT]; };

/** The basemap's own paths, by class (for the engraving overlay). */
export function basemapPaths(svgText) {
  const out = {};
  for (const m of svgText.matchAll(/<path\b([^>]*)>/g)) {
    const a = m[1], cls = (a.match(/class="([^"]*)"/) || [])[1], d = (a.match(/\sd="([^"]*)"/) || [])[1], st = (a.match(/style="([^"]*)"/) || [])[1];
    if (!cls || !d) continue;
    for (const c of cls.split(/\s+/)) (out[c] ||= []).push({ d, style: st || "", cls });
  }
  return out;
}

/** Longest subpath length (units) of a path "d" made of M/m, L/l, H/h, V/v and z (the basemap's commands). */
export function longestSubpath(d) {
  let x = 0, y = 0, sx = 0, sy = 0, len = 0, best = 0, cmd = "M";
  const tok = d.match(/[MmLlHhVvZz]|-?\d*\.?\d+(?:e-?\d+)?/g) || [];
  const nums = [];
  const flush = () => { best = Math.max(best, len); len = 0; };
  let i = 0;
  while (i < tok.length) {
    const t = tok[i];
    if (/[A-Za-z]/.test(t)) { cmd = t; i++; if (cmd === "Z" || cmd === "z") { len += Math.hypot(sx - x, sy - y); x = sx; y = sy; } continue; }
    const n = (k) => Number(tok[i + k]);
    if (cmd === "M" || cmd === "m") { flush(); const nx = cmd === "M" ? n(0) : x + n(0), ny = cmd === "M" ? n(1) : y + n(1); x = sx = nx; y = sy = ny; i += 2; cmd = cmd === "M" ? "L" : "l"; }
    else if (cmd === "L" || cmd === "l") { const nx = cmd === "L" ? n(0) : x + n(0), ny = cmd === "L" ? n(1) : y + n(1); len += Math.hypot(nx - x, ny - y); x = nx; y = ny; i += 2; }
    else if (cmd === "H" || cmd === "h") { const nx = cmd === "H" ? n(0) : x + n(0); len += Math.abs(nx - x); x = nx; i += 1; }
    else if (cmd === "V" || cmd === "v") { const ny = cmd === "V" ? n(0) : y + n(0); len += Math.abs(ny - y); y = ny; i += 1; }
    else i++;
  }
  flush();
  return best;
}

/* ---------- textures ---------- */
/** The page that renders one texture level: the site's tokens and CSS, the basemap inline, labels, the neatline. */
export function texturePageHtml({ level, theme, fill = false, base, bmInner, labels, grat }) {
  const L = level, W = L.w, H = L.h, k = L.ppu;
  const px = (ux) => (ux - L.x0) * k, py = (uy) => (uy - L.y0) * k;
  const lab = labels.map((l) => {
    const water = l.kind === "water";
    const size = L.labels.px ? (water ? L.labels.water : L.labels.town) : (water ? L.labels.water : L.labels.town) * k;
    return `<span class="map-label ${water ? "water" : "town"}" style="left:${px(l.x).toFixed(1)}px;top:${py(l.y).toFixed(1)}px;font-size:${size.toFixed(1)}px;${water ? "" : "letter-spacing:.24em;"}">${l.text}</span>`;
  }).join("");
  // the neatline: alternating minute bars of latitude and longitude (real coordinates), just outside the chart edge
  const band = 7, gap = 2;                                   // units
  let bars = "";
  for (const b of grat.lat) bars += `<rect x="${-gap - band}" y="${b.y0}" width="${band}" height="${b.y1 - b.y0}" class="gb${b.i % 2}"/><rect x="${1000 + gap}" y="${b.y0}" width="${band}" height="${b.y1 - b.y0}" class="gb${b.i % 2}"/>`;
  for (const b of grat.lng) bars += `<rect x="${b.x0}" y="${-gap - band}" width="${b.x1 - b.x0}" height="${band}" class="gb${b.i % 2}"/><rect x="${b.x0}" y="${1118 + gap}" width="${b.x1 - b.x0}" height="${band}" class="gb${b.i % 2}"/>`;
  return `<!doctype html><html lang="en" data-theme="${theme}"><head><meta charset="utf-8">
<link rel="stylesheet" href="${base}assets/tokens.css"><link rel="stylesheet" href="${base}assets/site.css"><style>
html,body{margin:0;width:${W}px;height:${H}px;overflow:hidden;background:var(--bg)}
#t{position:absolute;left:0;top:0;width:${W}px;height:${H}px;overflow:hidden}
#t>svg{position:absolute;left:0;top:0;width:${W}px;height:${H}px;display:block;max-width:none}
.gb0{fill:var(--grat-ink)}.gb1{fill:var(--grat-paper);stroke:var(--grat-ink);stroke-width:1px;vector-effect:non-scaling-stroke}
.nl{fill:none;stroke:var(--grat-ink);vector-effect:non-scaling-stroke}
.map-label{position:absolute}
.map-label.town{font-size:12px}
${fill ? ".m-coast,.m-coast-minor,.m-lake-shore,.m-water-line{display:none}" : ""}
</style></head><body><div id="t">
<svg viewBox="${L.x0} ${L.y0} ${L.x1 - L.x0} ${L.y1 - L.y0}" preserveAspectRatio="none" aria-hidden="true">
<defs><clipPath id="chart"><rect x="0" y="0" width="1000" height="1118"/></clipPath></defs>
<rect x="${L.x0}" y="${L.y0}" width="${L.x1 - L.x0}" height="${L.y1 - L.y0}" style="fill:var(--bg)"/>
<g clip-path="url(#chart)">${bmInner}</g>
${bars}
<rect class="nl" x="${-gap - band}" y="${-gap - band}" width="${1000 + 2 * (gap + band)}" height="${1118 + 2 * (gap + band)}" style="stroke-width:1.4px"/>
<rect class="nl" x="${-gap}" y="${-gap}" width="${1000 + 2 * gap}" height="${1118 + 2 * gap}" style="stroke-width:1px"/>
<rect class="nl" x="0" y="0" width="1000" height="1118" style="stroke-width:1px"/>
</svg>${lab}</div></body></html>`;
}

/** Minute bars for the neatline, from map.json's real georeference. */
export function neatline(meta) {
  const lat = [], lng = [];
  const m = 1 / 60;
  let i = 0;
  for (let a = Math.ceil(meta.bbox.s / m) * m - m; a < meta.bbox.n + m; a += m, i++) {
    const y0 = (meta.bbox.n - (a + m)) * meta.sx, y1 = (meta.bbox.n - a) * meta.sx;
    const c0 = Math.max(0, y0), c1 = Math.min(1118, y1); if (c1 > c0) lat.push({ y0: +c0.toFixed(2), y1: +c1.toFixed(2), i: Math.round(a / m) });
  }
  for (let o = Math.floor(meta.bbox.w / m) * m; o < meta.bbox.e + m; o += m) {
    const x0 = (o - meta.bbox.w) * meta.k * meta.sx, x1 = (o + m - meta.bbox.w) * meta.k * meta.sx;
    const c0 = Math.max(0, x0), c1 = Math.min(1000, x1); if (c1 > c0) lng.push({ x0: +c0.toFixed(2), x1: +c1.toFixed(2), i: Math.round(o / m) });
  }
  const fix = (arr) => arr.map((b) => ({ ...b, i: ((b.i % 2) + 2) % 2 }));
  return { lat: fix(lat), lng: fix(lng) };
}

/** The label set baked into the textures (plan.md §4.2): water names minZoom ≤ 1.6, towns minZoom ≤ 1. */
export function textureLabels(root, meta) {
  const m = JSON.parse(fs.readFileSync(path.join(root, "data", "map.json"), "utf8"));
  return m.labels.filter((l) => (l.kind === "water" && l.minZoom <= 1.6) || ((l.kind === "city" || l.kind === "town") && l.minZoom <= 1))
    .map((l) => { const [x, y] = project(l.lat, l.lng, meta); return { text: l.text, kind: l.kind, x, y }; });
}

/** Render (or reuse) every texture. Returns { dir, files: { "WB-dark": "…png", … }, hash }. */
export async function renderTextures({ browser, server, root, siteDir, cacheDir, log = console.log }) {
  const meta = mapMeta(root);
  const svg = fs.readFileSync(path.join(siteDir, "assets", "map", "basemap.svg"), "utf8");
  const bmInner = (svg.match(/<g id="bm">([\s\S]*)<\/g>\s*<\/svg>/) || [])[1];
  if (!bmInner) throw new Error("basemap.svg: <g id=\"bm\"> not found");
  const labels = textureLabels(root, meta), grat = neatline(meta);
  const hash = crypto.createHash("sha1").update(svg).update(fs.readFileSync(path.join(siteDir, "assets", "tokens.css"))).update(fs.readFileSync(path.join(siteDir, "assets", "site.css")))
    .update(JSON.stringify({ labels, grat, LEVELS, v: 3 })).digest("hex").slice(0, 12);
  const dir = path.join(cacheDir, "tex", hash);
  fs.mkdirSync(dir, { recursive: true });
  const jobs = [];
  for (const L of LEVELS) for (const theme of ["light", "dark"]) jobs.push({ L, theme, fill: false });
  jobs.push({ L: LEVELS[0], theme: "dark", fill: true });
  const files = {};
  for (const j of jobs) {
    const name = `${j.L.id}-${j.theme}${j.fill ? "-fill" : ""}.png`;
    files[name.replace(/\.png$/, "")] = name;
    const f = path.join(dir, name);
    if (fs.existsSync(f)) continue;
    const t0 = Date.now();
    const ctx = await browser.newContext({ viewport: { width: j.L.w, height: j.L.h }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    server.setPage("/__promo/texpage", texturePageHtml({ level: j.L, theme: j.theme, fill: j.fill, base: `${server.pathPrefix}`, bmInner, labels, grat }));
    await page.goto(`${server.originA}/__promo/texpage`, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: f, type: "png" });
    await ctx.close();
    log(`  texture ${name} ${j.L.w}×${j.L.h} in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  }
  return { dir, files, hash };
}

/* ---------- WebGL2: a few cheap passes per frame (SwiftShader runs every branch, so variants are compiled apart) ----------
   Base pass: one texture level over the paper (the whole-bay level WB, or L0), or two textures mixed (the terminator's
   sweep between the Day and Night editions, the WB ↔ L0 crossfade, the Night "fill" level of the engraving).
   Detail passes: L1 (Tampa) and L2 (Fort De Soto) drawn over their own rectangles, faded in per fragment by the screen's
   px per unit, so a near table is sharp and a far one keeps the coarser level's line weights. */
export const GL_VS = `#version 300 es
in vec2 p; uniform mat4 M; uniform vec4 G; out vec2 u;
void main(){ u = mix(G.xy, G.zw, p); gl_Position = M * vec4(u * ${UNIT.toFixed(1)}, 0.0, 1.0); }`;
/** fragment shader source for a variant: { two: bool, mode: 0 const | 1 sunrise | 2 sunset, detail: bool } */
export function glFs({ two, mode, detail }) {
  return `#version 300 es
precision highp float;
in vec2 u; out vec4 o;
uniform sampler2D T0, T1; uniform vec4 r; uniform float w, nightC, termX, termFeather, bias, grade; uniform vec3 gradeInk, paperD, paperN;
float inside(vec4 q, vec2 x, float f){ vec2 a = smoothstep(q.xy, q.xy + f, x) * (1.0 - smoothstep(q.zw - f, q.zw, x)); return a.x * a.y; }
void main(){
  vec2 uv = (u - r.xy) / (r.zw - r.xy);
  float n = ${mode === 0 ? "nightC" : mode === 1 ? "1.0 - smoothstep(termX - termFeather, termX + termFeather, u.x)" : "smoothstep(termX - termFeather, termX + termFeather, u.x)"};
  vec4 c = ${two ? `mix(texture(T0, uv, bias), texture(T1, uv, bias), ${mode === 0 ? "w" : "n"})` : "texture(T0, uv, bias)"};
  ${detail ? `vec2 gx = dFdx(u), gy = dFdy(u); float ppu = 1.0 / max(1e-6, max(length(gx), length(gy)));
  float a = smoothstep(4.2, 6.0, ppu) * inside(r, u, 8.0);` : `float a = 1.0; c.rgb = mix(mix(paperD, paperN, n), c.rgb, inside(r, u, 0.5));`}
  c.rgb = mix(c.rgb, gradeInk, grade * (1.0 - n));
  o = vec4(c.rgb * a, a);
}`;
}
