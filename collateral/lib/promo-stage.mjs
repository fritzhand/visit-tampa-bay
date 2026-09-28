/* ============================================================
   collateral/lib/promo-stage.mjs — the stage page (plan.md §4, §7.1, §8.1, §11).

   One page per cut, served on origin A at /__stage, laid out in output pixels (device scale 1):
     <canvas#gl>      the chart table (WebGL2, promo-world.mjs GL_VS/glFs)
     <canvas#ov>      course, dots, the phone's contact shadow (2D, projected through the same camera)
     <svg#eng>        the gold coast engraving (S1 only)
     #syms #badges    stop symbols and the six sheet badges (DOM, projected per frame)
     #rose            the site's compass rose
     #scene > #world  the phone (CSS 3D, the same matrix as the table), four live slots on origin A
     #rosefg          the rose in the foreground during flights
     #mist #head      the running head: the site's page-head label frame at poster scale
     #plate           the end cartouche
     #laptop          16:9 only: a screen-space laptop with two live slots on origin B
     #cursor #tap     the pointer (16:9) and the tap ripple
   window.render(st) draws one frame from a plain state object computed in Node (promo-cues.mjs): every
   frame is a pure function of time. The only live reads are copies of the site's own words (the parade
   card's state word for the mirror) and device rects for taps and the audit.
   Device materials (DEVICE) are the only color literals; everything else is a token of the built site.
   ============================================================ */
import { CAM_SRC, GL_VS, glFs, LEVELS, PAPER, UNIT } from "./promo-world.mjs";
import { AUDIT_PAGE_JS } from "./promo-audit.mjs";

/* ---------- the phone (Cincy Week's generic drawing, no maker's logo) ---------- */
export const PHONE = { w: 390, vp: 710, status: 50, toolbar: 84, bezel: 12, band: 3.5, radius: 54 };
PHONE.W = PHONE.w + 2 * (PHONE.bezel + PHONE.band);                                  // 421
PHONE.H = PHONE.status + PHONE.vp + PHONE.toolbar + 2 * (PHONE.bezel + PHONE.band);   // 875
PHONE.vx = PHONE.bezel + PHONE.band;                                                 // viewport origin in the phone's outer box
PHONE.vy = PHONE.bezel + PHONE.band + PHONE.status;
export const PHONE_K = 1.333;                                                          // table px per css px

/* ---------- the laptop (16:9): a screen-space device (plan.md §4.3) ---------- */
export const LAPTOP = { cssW: 1440, cssH: 900, k: 0.72, sx: 801.6, sy: 186, bezel: 18, bar: 0 };

/** Device materials: the only color literals in the promo (plan.md §11). */
export const DEVICE = {
  body: "linear-gradient(150deg,#7a7e87 0%,#3a3d45 18%,#202228 50%,#3a3d45 82%,#8a8e97 100%)", bezel: "#040507", island: "#000",
  keyL: "linear-gradient(90deg,#2a2c32,#6a6e77)", keyR: "linear-gradient(90deg,#6a6e77,#2a2c32)", shadow: "rgba(12,16,24,.5)",
  lid: "#1b1d22", lidEdge: "#3b3e46", deck: "linear-gradient(180deg,#8d9199 0%,#b9bcc3 30%,#9a9da5 100%)", deckEdge: "#5d6068", hinge: "#2b2d33",
  bar: "#e9e9ec", barDark: "#2a2c31", barText: "#3a3c42", barTextDark: "#d6d7db", pill: "#ffffff", pillDark: "#3a3c42",
  tapDot: "rgba(20,22,28,.30)", tapEdge: "rgba(255,255,255,.9)", tapRing: "rgba(20,22,28,.38)",
  cursorFill: "#111318", cursorEdge: "#ffffff",
};

const lockSvg = `<svg class="lock" viewBox="0 0 11 13" aria-hidden="true"><rect x=".5" y="5.5" width="10" height="7" rx="1.6" fill="currentColor"/><path d="M2.7 5.6V3.9a2.8 2.8 0 0 1 5.6 0v1.7" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>`;
const statusIcons = `<span class="st-icons" aria-hidden="true"><svg width="19" height="12" viewBox="0 0 19 12"><rect x="0" y="8" width="3.2" height="4" rx=".8" fill="currentColor"/><rect x="5.2" y="5.5" width="3.2" height="6.5" rx=".8" fill="currentColor"/><rect x="10.4" y="3" width="3.2" height="9" rx=".8" fill="currentColor"/><rect x="15.6" y="0" width="3.2" height="12" rx=".8" fill="currentColor"/></svg><svg width="17" height="12" viewBox="0 0 17 12"><path d="M8.5 11.6 6.1 9.2a3.4 3.4 0 0 1 4.8 0z" fill="currentColor"/><path d="M3.7 6.8a6.8 6.8 0 0 1 9.6 0l-1.4 1.4a4.8 4.8 0 0 0-6.8 0z" fill="currentColor"/><path d="M1.2 4.3a10.4 10.4 0 0 1 14.6 0l-1.4 1.4a8.4 8.4 0 0 0-11.8 0z" fill="currentColor"/></svg><svg width="27" height="13" viewBox="0 0 27 13"><rect x=".5" y=".5" width="23" height="12" rx="3.6" fill="none" stroke="currentColor" stroke-opacity=".45"/><rect x="2.3" y="2.3" width="19.4" height="8.4" rx="2.2" fill="currentColor"/><path d="M25 4.4v4.2c.9-.3 1.5-1.1 1.5-2.1s-.6-1.8-1.5-2.1z" fill="currentColor" fill-opacity=".5"/></svg></span>`;

/** Layout per cut, output px (plan.md §7.1 and §8.1). */
export const LAYOUT = {
  reel: {
    W: 1080, H: 1920, P: 2600, ox: 540, oy: 960,
    frame: { x0: 32, x1: 1048, top: 280 }, ribbon: { cx: 540, top: 250, h: 60, font: 28, track: "0.18em" },
    // the hook: the wordmark's "TAMPA BAY" eyebrow is set apart and 1.8× larger (it read at 13 px cap height on a phone),
    // and a legend names the six sheets as their badges land
    hook: { ebW: 560, ebTop: 330, wmW: 560, wmTop: 362, tagTop: 480, tagSize: 44, tagW: 936, clockTop: 604, clockSize: 28, cx: 540,
      legend: { x: 72, w: 936, top: 650, rowH: 44, size: 26, cols: 3, glyph: [48, 28], gap: 30 } },
    chrono: { x: 72, top: 318, size: 128, mer: 40 }, date: { right: 1000, top: 346, size: 28 },
    mirror: { right: 1000, top: 392, h: 58, size: 44 }, log: { x: 72, w: 936, top: 484, size: 46, big: 52, lh: 1.15 },
    foot: { x: 72, w: 936, top: 606, size: 30 },
    end: { wmW: 440, wmTop: 318, cx: 540, counts: { top: 460, h: 200, x0: 48, x1: 1032, num: 88, label: 24, rows: false } },
    // the address panel over the chart's empty north (Pasco, north Pinellas), so the course through the three stops stays in view
    plate: { x0: 64, x1: 1016, y0: 756, y1: 1100, url: { top: 782, size: 44 }, ind: { top: 850, size: 40, w: 920 }, src: { top: 972, size: 30 }, attr: { top: 1026, size: 20, w: 820 } },
    mist: 300, typedLink: { x: 72, top: 588, size: 30 },
  },
  wide: {
    W: 1920, H: 1080, P: 2400, ox: 1320, oy: 540,
    frame: { x0: 32, x1: 712, top: 80, bottom: 1012 }, ribbon: { cx: 372, top: 52, h: 56, font: 26, track: "0.2em" },
    hook: { ebW: 500, ebTop: 136, wmW: 540, wmTop: 168, tagTop: 292, tagSize: 40, tagW: 540, clockTop: 466, clockSize: 24, cx: 372,
      legend: { x: 96, w: 568, top: 540, rowH: 68, size: 30, cols: 1, glyph: [58, 34], gap: 0 } },
    chrono: { x: 96, top: 156, size: 150, mer: 44 }, date: { right: 664, top: 120, size: 26 },
    mirror: { right: 664, top: 310, h: 60, size: 44 }, log: { x: 96, w: 568, top: 400, size: 52, big: 52, lh: 60 / 52 },
    foot: { x: 96, w: 568, top: 670, size: 24 },
    dayRule: { x0: 96, x1: 664, top: 770, h: 70 }, rowE: { x: 96, w: 568, top: 876, size: 24 },
    end: { wmW: 440, wmTop: 120, cx: 372, counts: { top: 266, h: 340, x0: 96, x1: 664, num: 80, label: 26, rows: true }, src: { top: 640, size: 32 }, about: { top: 700, size: 30, w: 568 },
      attr: { top: 900, size: 20, w: 568 } },
    // the address panel under the chart (the chart ends above it at the end card), the attribution in the left panel
    plate: { x0: 850, x1: 1790, y0: 784, y1: 986, url: { top: 806, size: 44 }, ind: { top: 872, size: 30, w: 880 } },
    mist: 0, typedLink: { x: 96, top: 652, size: 28, w: 568 },
  },
};

/** The stage HTML. d = { cut, base, sprite, words, counts, tex, slotsA: {name: url}, slotsB, dots, badges, land, eng } */
export function stageHtml(d) {
  const L = LAYOUT[d.cut], W = L.W, H = L.H;
  const brand = `${d.base}assets/img/brand/brand.svg`;
  const wm = (id, w) => `<svg id="${id}" class="wm-art" viewBox="0 -2 544.2 132" style="width:${w}px;height:${(w * 132 / 544.2).toFixed(1)}px" role="img" aria-label="${d.words.siteName}"><use href="${brand}#wm"/></svg>`;
  // the brand's wordmark in two crops of its own symbol: the eyebrow ("TAMPA BAY" between its diamonds) and the word
  const crop = (id, w, vb, label) => { const [, , vw, vh] = vb; return `<svg id="${id}" class="wm-art" viewBox="${vb.join(" ")}" style="width:${w}px;height:${(w * vh / vw).toFixed(1)}px;display:block;margin:0 auto" ${label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"'}><use href="${brand}#wm" x="0" y="-2" width="544.2" height="132"/></svg>`; };
  const EB = [118, -1.5, 308, 15], WORD = [0, 16, 544.2, 106];
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const LG = L.hook.legend, per = LG.cols;
  const lgItems = d.badges.map((b) => `<span class="lg-i" id="lg-${b.id}" data-read="${1 + b.name.split(/\s+/).length}" data-role="texture" data-zone="free" data-id="legend-${b.id}" style="font-size:${LG.size}px"><svg viewBox="0 0 44 26" style="width:${LG.glyph[0]}px;height:${LG.glyph[1]}px" aria-hidden="true"><use href="#b-${b.id}"/></svg><span>${esc(b.name)}</span></span>`);
  const lgRows = []; for (let i = 0; i < lgItems.length; i += per) lgRows.push(`<div class="lg-row" style="height:${LG.rowH}px;gap:${LG.gap}px;justify-content:${per > 1 ? "center" : "flex-start"}">${lgItems.slice(i, i + per).join("")}</div>`);
  const phoneSlots = Object.keys(d.slotsA).map((s) => `<iframe name="${s}" id="f-${s}" src="about:blank" title="${s}"></iframe>`).join("");
  const lapSlots = Object.keys(d.slotsB || {}).map((s) => `<iframe name="${s}" id="f-${s}" src="about:blank" title="${s}"></iframe>`).join("");
  const K = L.end.counts, nC = d.counts.length;
  const counts = d.counts.map((c, i) => {
    if (!K.rows) { const cw = (K.x1 - K.x0) / nC; return `<div class="cnt" id="cnt${i}" style="left:${K.x0 + i * cw}px;top:${K.top}px;width:${cw}px"><b class="n" style="font-size:${K.num}px">${c.n}</b><span class="l" style="font-size:${K.label}px;margin-top:14px">${c.label}</span></div>` + (i ? `<i class="sep" style="left:${K.x0 + i * cw}px;top:${K.top + 4}px;width:1px;height:${K.h - 30}px"></i>` : ""); }
    const rh = K.h / nC; return `<div class="cnt rows" id="cnt${i}" style="left:${K.x0}px;top:${K.top + i * rh}px;width:${K.x1 - K.x0}px;height:${rh}px;display:flex;align-items:center;gap:28px;text-align:left"><b class="n" style="font-size:${K.num}px;min-width:210px;text-align:right">${c.n}</b><span class="l" style="font-size:${K.label}px">${c.label}</span></div>` + (i ? `<i class="sep" style="left:${K.x0}px;top:${K.top + i * rh}px;height:1px;width:${K.x1 - K.x0}px"></i>` : "");
  }).join("");
  const countWords = d.counts.reduce((a, c) => a + 1 + c.label.split(/\s+/).length, 0);
  const engPaths = d.eng.map((p) => `<path class="eg ${p.cls}" d="${p.d}" style="stroke-width:${p.w}" data-len="${p.len}"/>`).join("");
  return `<!doctype html><html lang="en" data-theme="dark" class="js"><head><meta charset="utf-8"><title>stage</title>
<link rel="stylesheet" href="${d.base}assets/tokens.css"><link rel="stylesheet" href="${d.base}assets/site.css"><style>
html,body{margin:0;width:${W}px;height:${H}px;overflow:hidden;background:var(--bg)}
body{font-family:var(--font-body);color:var(--text)}
#stage{position:relative;width:${W}px;height:${H}px;overflow:hidden;background:var(--bg)}
#stage svg{max-width:none}
.abs{position:absolute;left:0;top:0}
canvas{position:absolute;left:0;top:0;width:${W}px;height:${H}px}
#eng{position:absolute;left:0;top:0;overflow:hidden}
#eng path{fill:none;stroke:var(--map-coast);stroke-linecap:round;stroke-linejoin:round}
#eng path.wl{stroke:var(--map-water-line)}
/* stop symbols: the site's chart symbols on a pin disc with the sheet's keyline */
.sym{position:absolute;left:0;top:0;border-radius:50%;background:var(--map-pin-bg);box-shadow:0 0 0 3px var(--ink-edge);display:grid;place-items:center;color:var(--map-pin-ink)}
.sym svg{width:58%;height:58%;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.bdg{position:absolute;left:0;top:0;width:84px;height:50px;margin:-25px 0 0 -42px}
.bdg svg{width:84px;height:50px;display:block;overflow:visible}
.ring{position:absolute;left:0;top:0;border-radius:50%;border:2px solid var(--map-water-line)}
#rose,#rosefg{position:absolute;left:0;top:0;color:var(--text);--compass-dark:var(--text);--compass-north:var(--magenta);--compass-light:var(--surface);--compass-hub:var(--gold)}
#rose svg,#rosefg svg{width:100%;height:100%;display:block}
/* the scene */
#gl,#tb,#ov{z-index:0}#eng,#syms,#badges,#rose{z-index:1}
#scene{z-index:2;position:absolute;left:0;top:0;width:${W}px;height:${H}px;perspective:${L.P}px;perspective-origin:${L.ox}px ${L.oy}px;overflow:hidden;pointer-events:none}
#world{position:absolute;left:0;top:0;width:1px;height:1px;transform-origin:0 0;transform-style:preserve-3d}
.phone{position:absolute;left:0;top:0;width:${PHONE.W}px;height:${PHONE.H}px;transform-origin:0 0;backface-visibility:hidden}
.phone-body{position:relative;padding:${PHONE.band}px;border-radius:${PHONE.radius + PHONE.bezel + PHONE.band}px;background:${DEVICE.body}}
.bezel{padding:${PHONE.bezel}px;border-radius:${PHONE.radius + PHONE.bezel}px;background:${DEVICE.bezel}}
.screen{position:relative;width:${PHONE.w}px;border-radius:${PHONE.radius}px;overflow:hidden;background:var(--bg)}
.status{height:${PHONE.status}px;display:flex;align-items:center;justify-content:space-between;padding:4px 33px 0 50px;color:var(--text);background:var(--topbar-bg,var(--bg));box-sizing:border-box}
.status .time{font:600 17px/1 var(--font-body);font-variant-numeric:tabular-nums}
.st-icons{display:flex;gap:6px;align-items:center}
.island{position:absolute;top:11px;left:50%;transform:translateX(-50%);width:122px;height:35px;border-radius:18px;background:${DEVICE.island};z-index:5}
.vp{position:relative;width:${PHONE.w}px;height:${PHONE.vp}px;overflow:hidden;background:var(--bg)}
.vp iframe{position:absolute;left:0;top:0;width:${PHONE.w}px;height:${PHONE.vp}px;border:0;background:var(--bg)}
.vp iframe.park{left:-5000px}
.toolbar{position:relative;height:${PHONE.toolbar}px;background:var(--surface-alt);border-top:1px solid var(--border);box-sizing:border-box}
.addr{position:absolute;left:18px;right:18px;top:11px;height:44px;border-radius:22px;display:flex;align-items:center;justify-content:center;gap:7px;background:var(--surface-sunken);color:var(--text);font:500 16px/1 var(--font-body)}
.lock{width:11px;height:13px;flex:none}
.homebar{position:absolute;left:50%;bottom:8px;transform:translateX(-50%);width:134px;height:5px;border-radius:3px;background:var(--text)}
.key{position:absolute;width:4px;border-radius:2px}
.key.l{left:-2.5px;background:${DEVICE.keyL}}.key.r{right:-2.5px;background:${DEVICE.keyR}}
/* the running head: the site's label frame at poster scale */
#rosefg{z-index:3}#arc{z-index:4}#lclip{z-index:5}
#lclip{position:absolute;left:0;top:0;width:${W}px;height:${H}px;pointer-events:none;clip-path:inset(0 0 0 ${L.frame.x1 + 8}px)}
#mist{z-index:6;position:absolute;left:0;top:0;width:${W}px;height:${L.mist}px;background:linear-gradient(var(--bg) 0 calc(100% - 22px),transparent)}
#head{z-index:7;position:absolute;left:0;top:0;width:${W}px;height:${H}px;pointer-events:none}
#plate{z-index:8}#credit{z-index:9}#cursor{z-index:10}#cring{z-index:10}#tap{z-index:11}
#frame{position:absolute;left:${L.frame.x0}px;top:${L.frame.top}px;width:${L.frame.x1 - L.frame.x0}px;height:400px;box-sizing:border-box;
  background:var(--surface);border:4px solid var(--frame-outer);outline:2px solid var(--frame-inner);outline-offset:-16px}
#frame::after{content:"";position:absolute;inset:-22px;background:var(--corner-ink);
  -webkit-mask:var(--mask-corner) 0 0/40px 40px no-repeat,var(--mask-corner) 100% 0/40px 40px no-repeat,var(--mask-corner) 0 100%/40px 40px no-repeat,var(--mask-corner) 100% 100%/40px 40px no-repeat;
  mask:var(--mask-corner) 0 0/40px 40px no-repeat,var(--mask-corner) 100% 0/40px 40px no-repeat,var(--mask-corner) 0 100%/40px 40px no-repeat,var(--mask-corner) 100% 100%/40px 40px no-repeat}
#ribbon{position:absolute;top:${L.ribbon.top}px;left:${L.frame.x0}px;width:${L.frame.x1 - L.frame.x0}px;display:flex;justify-content:center;pointer-events:none;
  --rb:var(--ribbon-bg);--ri:var(--ribbon-ink);--rf:var(--ribbon-fold);--rr:var(--ribbon-rule)}
#ribbon[data-sheet]{--rb:var(--ink-fill);--ri:var(--ink-on);--rf:color-mix(in oklab,var(--ink-fill) 62%,var(--fold-shade))}
.rbw{position:relative;display:inline-flex}
.rbw>i{position:absolute;top:14px;bottom:-14px;width:44px;display:block}
.rbw>i.tl{left:-28px;clip-path:polygon(0 0,100% 0,100% 100%,0 100%,14px 50%);background:linear-gradient(to top right,var(--rf) 50%,transparent 50%) 100% 100%/16px 14px no-repeat,linear-gradient(var(--rb) 0 0) 0 0/calc(100% - 16px) 100% no-repeat}
.rbw>i.tr{right:-28px;clip-path:polygon(0 0,100% 0,calc(100% - 14px) 50%,100% 100%,0 100%);background:linear-gradient(to top left,var(--rf) 50%,transparent 50%) 0 100%/16px 14px no-repeat,linear-gradient(var(--rb) 0 0) 100% 0/calc(100% - 16px) 100% no-repeat}
#rbt{position:relative;display:inline-flex;align-items:center;height:${L.ribbon.h}px;padding:0 34px;box-sizing:border-box;white-space:nowrap;
  background:linear-gradient(var(--rr) 0 0) 0 6px/100% 2px no-repeat,linear-gradient(var(--rr) 0 0) 0 calc(100% - 6px)/100% 2px no-repeat,var(--rb);color:var(--ri);
  font-family:var(--font-label);font-stretch:125%;font-weight:680;font-size:${L.ribbon.font}px;letter-spacing:${L.ribbon.track};text-transform:uppercase;line-height:1}
.hk,.st,.en{position:absolute;left:0;top:0;width:${W}px}
.wm-art{display:block;color:var(--text);--wordmark-accent:var(--accent)}
.lbl{font-family:var(--font-label);font-stretch:108%;font-weight:680;text-transform:uppercase;letter-spacing:var(--track-label);color:var(--text-muted);white-space:nowrap;font-variant-numeric:tabular-nums lining-nums}
.tag{position:absolute;left:0;width:${W}px;text-align:center;font-family:var(--font-display);font-style:italic;font-weight:540;line-height:1.2;color:var(--text);white-space:nowrap;text-wrap:balance}
#chrono{position:absolute;display:flex;align-items:baseline;font-family:var(--font-display);font-weight:800;font-variant-numeric:tabular-nums lining-nums;color:var(--text);line-height:1;white-space:nowrap}
.col{display:inline-block;position:relative;overflow:hidden;vertical-align:baseline;height:1.12em;text-align:center;clip-path:inset(0.08em 0 0.16em 0)}
#mer .col{clip-path:inset(0.15em 0 0.16em 0)}
.col i{display:block;font-style:normal;height:1.12em;line-height:1.12em}
.col .strip{display:block}
#mer{font-family:var(--font-label);font-stretch:108%;font-weight:680;letter-spacing:var(--track-label);margin-left:.34em;color:var(--text)}
#mirror{position:absolute;display:flex;justify-content:flex-end}
#mirror span{display:inline-flex;align-items:center;box-sizing:border-box;height:${L.mirror.h}px;padding:0 18px;border:2px solid transparent;border-radius:3px;
  font-family:var(--font-label);font-stretch:108%;font-weight:680;font-size:${L.mirror.size}px;letter-spacing:var(--track-label);text-transform:uppercase;white-space:nowrap}
#log{position:absolute;font-family:var(--font-display);font-style:italic;font-weight:540;color:var(--text);transform-origin:0 50%;text-wrap:balance}
#log.title{font-style:normal;font-weight:700}
#foot{position:absolute;font-size:${L.foot.size}px;font-stretch:100%;letter-spacing:.04em;text-wrap:balance}
#typed{position:absolute;font-family:var(--font-body);font-weight:500;color:var(--text-muted);white-space:nowrap;font-variant-numeric:tabular-nums;line-height:1.25}
.lg-row{display:flex;align-items:center}
.lg-i{display:inline-flex;align-items:center;gap:12px;font-family:var(--font-body);font-weight:600;color:var(--text);white-space:nowrap;line-height:1}
.lg-i svg{display:block;flex:none;overflow:visible}
#edge{z-index:6;position:absolute;left:0;top:0;width:${W}px;height:${H}px;pointer-events:none;overflow:hidden}
#edge i{position:absolute;display:none}
#edL{left:0;top:0;height:${H}px;background:linear-gradient(to right,var(--bg) 0 8%,transparent)}
#edR{right:0;top:0;height:${H}px;background:linear-gradient(to left,var(--bg) 0 8%,transparent)}
#edT{top:0;background:linear-gradient(to bottom,var(--bg) 0 12%,transparent)}
#edB{background:linear-gradient(to bottom,transparent 0,var(--bg) 72px)}
#endattr{position:absolute;font-family:var(--font-body);font-weight:400;color:var(--text-faint);line-height:1.3;text-align:center}
#typed b{font-weight:500;color:var(--link)}
.cnt{position:absolute;text-align:center}
.cnt .n{display:block;font-family:var(--font-display);font-weight:800;font-variant-numeric:lining-nums tabular-nums;line-height:1;color:var(--text)}
.cnt .l{display:block;font-family:var(--font-label);font-stretch:108%;font-weight:680;text-transform:uppercase;letter-spacing:var(--track-label);color:var(--text-muted);line-height:1.2}
.sep{position:absolute;background:var(--border)}
/* 16:9 extras */
#dayrule{position:absolute}
#dayrule .band{position:absolute;left:0;top:26px;height:18px;background:var(--surface-sunken)}
#dayrule .day{position:absolute;top:26px;height:18px;background:var(--gold-tint)}
#dayrule .tk{position:absolute;top:22px;width:2px;height:26px;background:var(--border-strong)}
#dayrule .tl{position:absolute;top:52px;font-family:var(--font-label);font-stretch:108%;font-weight:680;font-size:22px;letter-spacing:var(--track-label);color:var(--text-muted);transform:translateX(-50%);white-space:nowrap}
#dayrule .now{position:absolute;top:0;width:0;height:0;border-left:9px solid transparent;border-right:9px solid transparent;border-top:16px solid var(--magenta);transform:translateX(-9px)}
#dayrule .dsym{position:absolute;top:20px;width:30px;height:30px;margin-left:-15px;border-radius:50%;background:var(--map-pin-bg);box-shadow:0 0 0 2px var(--ink-edge);display:grid;place-items:center;color:var(--map-pin-ink)}
#dayrule .dsym svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
#rowE{position:absolute;font-family:var(--font-body);font-size:24px;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#endsrc,#about{position:absolute;font-family:var(--font-display);font-style:italic;font-weight:540;color:var(--text);text-align:center}
/* the end plate */
#plate{position:absolute;left:${L.plate.x0}px;top:${L.plate.y0}px;width:${L.plate.x1 - L.plate.x0}px;height:${L.plate.y1 - L.plate.y0}px}
#plate .pl{position:absolute;inset:0;background:var(--surface);--n:16px;
  -webkit-mask:radial-gradient(circle at 0 0,transparent var(--n),#000 calc(var(--n) + .5px)) 0 0/51% 51% no-repeat,radial-gradient(circle at 100% 0,transparent var(--n),#000 calc(var(--n) + .5px)) 100% 0/51% 51% no-repeat,radial-gradient(circle at 0 100%,transparent var(--n),#000 calc(var(--n) + .5px)) 0 100%/51% 51% no-repeat,radial-gradient(circle at 100% 100%,transparent var(--n),#000 calc(var(--n) + .5px)) 100% 100%/51% 51% no-repeat;
  mask:radial-gradient(circle at 0 0,transparent var(--n),#000 calc(var(--n) + .5px)) 0 0/51% 51% no-repeat,radial-gradient(circle at 100% 0,transparent var(--n),#000 calc(var(--n) + .5px)) 100% 0/51% 51% no-repeat,radial-gradient(circle at 0 100%,transparent var(--n),#000 calc(var(--n) + .5px)) 0 100%/51% 51% no-repeat,radial-gradient(circle at 100% 100%,transparent var(--n),#000 calc(var(--n) + .5px)) 100% 100%/51% 51% no-repeat}
#plate .dr{position:absolute;inset:14px;border-top:2px solid var(--rule-ink);border-bottom:2px solid var(--rule-ink);pointer-events:none}
#plate .dr::before,#plate .dr::after{content:"";position:absolute;left:0;right:0;height:1px;background:var(--rule-ink)}
#plate .dr::before{top:3px}#plate .dr::after{bottom:3px}
#plate .ln{position:absolute;left:0;right:0;text-align:center}
#purl{font-family:var(--font-body);font-weight:650;color:var(--link);white-space:nowrap}
#purl span{text-decoration:underline;text-decoration-color:var(--accent);text-decoration-thickness:3px;text-underline-offset:8px}
#pind{font-family:var(--font-body);font-weight:400;color:var(--text-muted);line-height:1.3;margin:0 auto}
#psrc{font-family:var(--font-display);font-style:italic;font-weight:540;color:var(--text)}
#pattr{font-family:var(--font-body);font-weight:400;color:var(--text-faint);line-height:1.3;margin:0 auto}
/* the laptop (16:9) */
#laptop{position:absolute;left:0;top:0;width:${W}px;height:${H}px;transform-origin:0 0;opacity:0;pointer-events:none}
#lbody{position:absolute;left:0;top:0;width:${W}px;height:${H}px}
#lid{position:absolute;background:${DEVICE.lid};border-radius:18px;box-shadow:inset 0 0 0 2px ${DEVICE.lidEdge}}
#lscreen{position:absolute;overflow:hidden;background:var(--bg);left:${LAPTOP.sx}px;top:${LAPTOP.sy - 30}px;width:${LAPTOP.cssW * LAPTOP.k}px;height:${LAPTOP.cssH * LAPTOP.k + 30}px}
#lscreen iframe{position:absolute;left:0;top:30px;width:${LAPTOP.cssW}px;height:${LAPTOP.cssH}px;border:0;transform-origin:0 0;transform:scale(${LAPTOP.k});background:var(--bg)}
#lscreen iframe.park{opacity:0}
#deck{position:absolute;background:${DEVICE.deck};border-radius:0 0 26px 26px;box-shadow:inset 0 2px 0 ${DEVICE.deckEdge}}
#hinge{position:absolute;background:${DEVICE.hinge};border-radius:0 0 10px 10px}
#lbar{position:absolute;display:flex;align-items:center;gap:10px;padding:0 14px;box-sizing:border-box;background:${DEVICE.bar};color:${DEVICE.barText};font:500 14px/1 var(--font-body)}
#lbar .pill{flex:1;display:flex;align-items:center;gap:8px;height:24px;padding:0 12px;border-radius:12px;background:${DEVICE.pill}}
#lbar .dots{display:flex;gap:7px}#lbar .dots i{width:11px;height:11px;border-radius:50%;background:${DEVICE.lidEdge};opacity:.55}
html[data-theme="dark"] #lbar{background:${DEVICE.barDark};color:${DEVICE.barTextDark}}
html[data-theme="dark"] #lbar .pill{background:${DEVICE.pillDark}}
#cursor{position:absolute;left:0;top:0;width:34px;height:48px;display:none;transform-origin:0 0}
#cring{position:absolute;left:0;top:0;border-radius:50%;border:3px solid var(--magenta);display:none}
#arc{position:absolute;left:0;top:0;overflow:visible;display:none}
#arc path{fill:none;stroke:var(--magenta);stroke-linecap:round}
/* the tap */
#tap{position:absolute;left:0;top:0;width:0;height:0;pointer-events:none;display:none}
#tap .dot{position:absolute;border-radius:50%;background:${DEVICE.tapDot};border:2px solid ${DEVICE.tapEdge}}
#tap .rg{position:absolute;border-radius:50%;border:3px solid ${DEVICE.tapRing}}
#credit{position:absolute;font:400 22px/1.2 var(--font-body);color:var(--text-muted);display:none;white-space:nowrap}
#stage,#stage *,#stage *::before,#stage *::after{transition:none!important;animation:none!important}
</style></head><body>${d.sprite}<div id="stage">
<canvas id="gl" width="${W}" height="${H}" style="visibility:hidden"></canvas>
<canvas id="tb" width="${W}" height="${H}"></canvas>
<canvas id="ov" width="${W}" height="${H}"></canvas>
<svg id="eng" viewBox="0 0 1000 1118" aria-hidden="true" style="display:none">${engPaths}</svg>
<div id="syms" class="abs"></div>
<div id="badges" class="abs"></div>
<div id="rose" style="display:none"><svg viewBox="0 0 200 200" aria-hidden="true"><use href="${brand}#compass"/></svg></div>
<div id="scene"><div id="world"><div class="phone" id="phone"><div class="phone-body">
<i class="key l" style="top:150px;height:30px"></i><i class="key l" style="top:206px;height:58px"></i><i class="key l" style="top:276px;height:58px"></i><i class="key r" style="top:226px;height:88px"></i>
<div class="bezel"><div class="screen"><div class="status"><span class="time" id="ptime">7:14</span>${statusIcons}</div><div class="island"></div>
<div class="vp" id="vp">${phoneSlots}</div>
<div class="toolbar"><div class="addr">${lockSvg}<span>${d.words.host}</span></div><div class="homebar"></div></div></div></div></div></div></div></div>
<div id="rosefg" style="display:none"><svg viewBox="0 0 200 200" aria-hidden="true"><use href="${brand}#compass"/></svg></div>
<svg id="arc" width="${W}" height="${H}" aria-hidden="true"><path id="arcp"/><path id="arch"/></svg>
<div id="lclip"><div id="laptop"><div id="lbody"><div id="lid"></div><div id="hinge"></div><div id="deck"></div></div><div id="lscreen"><div id="lbar"><span class="dots"><i></i><i></i><i></i></span><span class="pill">${lockSvg}<span id="lurl"></span></span></div>${lapSlots}</div></div></div>
<div id="edge"><i id="edL"></i><i id="edR"></i><i id="edT"></i><i id="edB"></i></div>
<div id="mist"></div>
<div id="head">
  <div id="frame"></div>
  <div class="hk" id="hook">
    <div class="abs" style="left:${L.hook.cx - L.hook.wmW / 2}px;top:${L.hook.ebTop}px;width:${L.hook.wmW}px" id="hk-wmw" data-read="1" data-role="must" data-id="wordmark">${crop("hk-eb", L.hook.ebW, EB, null)}<div style="height:${(L.hook.wmTop - L.hook.ebTop - L.hook.ebW * EB[3] / EB[2]).toFixed(1)}px"></div>${crop("hk-wm", L.hook.wmW, WORD, d.words.siteName)}</div>
    <div class="abs" id="hk-legend" style="left:${LG.x}px;top:${LG.top}px;width:${LG.w}px">${lgRows.join("")}</div>
    <div class="abs" id="hk-tags" style="left:${L.hook.cx - L.hook.tagW / 2}px;top:${L.hook.tagTop}px;width:${L.hook.tagW}px">
      <div class="tag" id="hk-t1" data-read="${d.words.tag1.split(/\s+/).length}" data-role="must" data-id="tagline-1" style="position:relative;width:auto;white-space:normal;font-size:${L.hook.tagSize}px">${d.words.tag1}</div>
      <div class="tag" id="hk-t2" data-read="${d.words.tag2.split(/\s+/).length}" data-role="secondary" data-id="tagline-2" style="position:relative;width:auto;white-space:normal;font-size:${L.hook.tagSize}px">${d.words.tag2}</div>
    </div>
    <div class="lbl abs" id="hk-clock" data-read="5" data-role="secondary" data-id="clock-line" style="left:0;width:${W}px;text-align:center;top:${L.hook.clockTop}px;font-size:${L.hook.clockSize}px;${d.cut === "wide" ? `left:${L.hook.cx - W / 2}px;letter-spacing:.06em;` : ""}"></div>
  </div>
  <div class="st" id="stops">
    <div id="chrono" data-read="2" data-role="secondary" data-id="chronometer" style="left:${L.chrono.x}px;top:${L.chrono.top}px;font-size:${L.chrono.size}px"><span class="col" id="c-h"></span><span class="col colon"><i>:</i></span><span class="col" id="c-m1"></span><span class="col" id="c-m2"></span><span id="mer" style="font-size:${L.chrono.mer}px"><span class="col" id="c-mer"></span></span></div>
    <div class="lbl abs" id="date" data-read="3" data-role="secondary" data-id="date" style="left:auto;right:${W - L.date.right}px;top:${L.date.top}px;font-size:${L.date.size}px">${d.words.date}</div>
    <div id="mirror" data-read="3" data-role="must" data-id="mirror" style="left:auto;right:${W - L.mirror.right}px;top:${L.mirror.top}px"><span id="mirt"></span></div>
    <div id="log" data-role="must" style="left:${L.log.x}px;top:${L.log.top}px;width:${L.log.w}px;font-size:${L.log.size}px;line-height:${L.log.lh}"></div>
    <div id="foot" class="lbl" data-role="secondary" data-id="footnote" style="left:${L.foot.x}px;top:${L.foot.top}px;width:${L.foot.w}px;white-space:normal;line-height:1.25"></div>
    <div id="typed" data-read="3" data-role="secondary" data-id="typed-link" style="left:${L.typedLink.x}px;top:${L.typedLink.top}px;font-size:${L.typedLink.size}px"></div>
    ${d.cut === "wide" ? `<div id="dayrule" style="left:${L.dayRule.x0}px;top:${L.dayRule.top}px;width:${L.dayRule.x1 - L.dayRule.x0}px;height:${L.dayRule.h}px"></div>
    <div id="rowE" data-read="5" data-role="secondary" data-id="row-e" style="left:${L.rowE.x}px;top:${L.rowE.top}px;width:${L.rowE.w}px"></div>` : ""}
  </div>
  <div class="en" id="end">
    <div class="abs" style="left:${L.end.cx - L.end.wmW / 2}px;top:${L.end.wmTop}px">${wm("en-wm", L.end.wmW)}</div>
    <div id="counts" data-read="${countWords}" data-role="must" data-id="counts">${counts}</div>
    ${d.cut === "wide" ? `<div id="endsrc" data-read="6" data-role="secondary" data-id="end-sourced" style="left:${L.frame.x0}px;width:${L.frame.x1 - L.frame.x0}px;top:${L.end.src.top}px;font-size:${L.end.src.size}px">${d.words.sourced}</div>
    <div id="about" data-read="${d.words.aboutLine.split(/\s+/).length}" data-role="secondary" data-id="about-line" style="left:${L.end.cx - L.end.about.w / 2}px;width:${L.end.about.w}px;top:${L.end.about.top}px;font-size:${L.end.about.size}px;line-height:1.3">${d.words.aboutLine}</div>` : ""}
    ${L.end.attr ? `<div id="endattr" data-read="8" data-role="texture" data-zone="free" data-id="attribution" style="left:${L.end.cx - L.end.attr.w / 2}px;width:${L.end.attr.w}px;top:${L.end.attr.top}px;font-size:${L.end.attr.size}px">${d.words.attribution}</div>` : ""}
  </div>
  <div id="ribbon"><div class="rbw"><i class="tl"></i><i class="tr"></i><span id="rbt" data-read="4" data-role="secondary" data-id="ribbon"></span></div></div>
</div>
<div id="plate" style="display:none"><div class="pl"></div><div class="dr"></div>
  <div class="ln" style="top:${L.plate.url.top - L.plate.y0}px"><div id="purl" data-read="3" data-role="must" data-id="url" style="font-size:${L.plate.url.size}px"><span>${d.words.url}</span></div></div>
  <div class="ln" style="top:${L.plate.ind.top - L.plate.y0}px"><div id="pind" data-read="${d.words.independence.split(/\s+/).length}" data-role="must" data-id="independence" style="font-size:${L.plate.ind.size}px;width:${L.plate.ind.w}px">${d.words.independenceHtml}</div></div>
  ${L.plate.src ? `<div class="ln" style="top:${L.plate.src.top - L.plate.y0}px"><div id="psrc" data-read="6" data-role="secondary" data-id="plate-sourced" style="font-size:${L.plate.src.size}px">${d.words.sourced}</div></div>` : ""}
  ${L.plate.attr ? `<div class="ln" style="top:${L.plate.attr.top - L.plate.y0}px"><div id="pattr" data-read="8" data-role="texture" data-zone="free" data-id="attribution" style="font-size:${L.plate.attr.size}px;width:${L.plate.attr.w}px">${d.words.attribution}</div></div>` : ""}
</div>
<div id="credit" data-zone="free"></div>
<svg id="cursor" viewBox="0 0 34 48" aria-hidden="true"><path d="M3 2 L3 38 L12 30 L18 45 L25 42 L19 28 L31 28 Z" fill="${DEVICE.cursorFill}" stroke="${DEVICE.cursorEdge}" stroke-width="2.5" stroke-linejoin="round"/></svg>
<div id="cring"></div>
<div id="tap"><div class="rg"></div><div class="dot"></div></div>
</div>
<script>
${CAM_SRC}
window.__D=${JSON.stringify({ cut: d.cut, L, PHONE, PHONE_K, LAPTOP, UNIT, PAPER, LEVELS: LEVELS.map((l) => ({ id: l.id, x0: l.x0, y0: l.y0, x1: l.x1, y1: l.y1 })), tex: d.tex, dots: d.dots, badges: d.badges, land: d.land })};
${PAGE_JS.replace("${FS_VARIANTS}", FS_VARIANTS)}
${AUDIT_PAGE_JS}
</script></body></html>`;
}

/* ---------- the page script ---------- */
const FS_VARIANTS = [["o0", { two: false, mode: 0 }], ["t0", { two: true, mode: 0 }], ["t1", { two: true, mode: 1 }], ["t2", { two: true, mode: 2 }],
  ["do0", { two: false, mode: 0, detail: true }], ["dt1", { two: true, mode: 1, detail: true }], ["dt2", { two: true, mode: 2, detail: true }]]
  .map(([k, o]) => `FS_SRC[${JSON.stringify(k)}]=${JSON.stringify(glFs(o))};`).join("\n");
const PAGE_JS = String.raw`
const D=window.__D,L=D.L,V={P:L.P,ox:L.ox,oy:L.oy};
const $=(id)=>document.getElementById(id);
const SHEETS=["tampa","stpete","beaches","clearwater","around","daytrips"];
let S=null;                             // the current state
/* ---------- colors from the tokens (per edition) ---------- */
const colCache={};
function tok(name){const th=document.documentElement.dataset.theme,k=th+name;if(colCache[k]==null)colCache[k]=getComputedStyle(document.documentElement).getPropertyValue(name).trim();return colCache[k];}
function rgbOf(css){const c=document.createElement("canvas").getContext("2d");c.fillStyle=css;const v=c.fillStyle;if(v[0]==="#"){const n=parseInt(v.slice(1),16);return [(n>>16&255)/255,(n>>8&255)/255,(n&255)/255];}const m=v.match(/[\d.]+/g).map(Number);return [m[0]/255,m[1]/255,m[2]/255];}
/* ---------- WebGL2 (promo-world.mjs: cheap variants, a base pass and detail passes) ---------- */
let G=null;
const FS_SRC={};
${FS_VARIANTS}
window.setupGL=async()=>{
  const c=$("gl"),gl=c.getContext("webgl2",{antialias:false,preserveDrawingBuffer:true,premultipliedAlpha:true,alpha:false});
  if(!gl)throw new Error("no WebGL2");
  const sh=(t,s)=>{const o=gl.createShader(t);gl.shaderSource(o,s);gl.compileShader(o);if(!gl.getShaderParameter(o,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(o));return o;};
  const vs=sh(gl.VERTEX_SHADER,${JSON.stringify(GL_VS)});
  const progs={};
  for(const [k,src] of Object.entries(FS_SRC)){const pr=gl.createProgram();gl.attachShader(pr,vs);gl.attachShader(pr,sh(gl.FRAGMENT_SHADER,src));gl.bindAttribLocation(pr,0,"p");gl.linkProgram(pr);if(!gl.getProgramParameter(pr,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(pr));
    const U={};for(const n of ["M","G","T0","T1","r","w","nightC","termX","termFeather","bias","grade","gradeInk","paperD","paperN"])U[n]=gl.getUniformLocation(pr,n);progs[k]={pr,U};}
  const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);
  const N=32,v=[];for(let j=0;j<N;j++)for(let i=0;i<N;i++){const a=[i/N,j/N],b2=[(i+1)/N,j/N],c2=[i/N,(j+1)/N],d2=[(i+1)/N,(j+1)/N];v.push(...a,...b2,...c2,...b2,...d2,...c2);}
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(v),gl.STATIC_DRAW);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
  const tex={};
  for(const f of Object.keys(D.tex)){
    const img=new Image();img.src=D.tex[f];await img.decode();
    const t=gl.createTexture();gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,t);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    tex[f]=t;
  }
  G={gl,progs,tex,count:v.length/2,lv:Object.fromEntries(D.LEVELS.map((l)=>[l.id,l])),info:gl.getParameter(gl.RENDERER)+" / "+(gl.getExtension("WEBGL_debug_renderer_info")?gl.getParameter(gl.getExtension("WEBGL_debug_renderer_info").UNMASKED_RENDERER_WEBGL):"")};
  return G.info;
};
function glPass(key,geo,rect,t0,t1,uni){
  const {gl}=G,P=G.progs[key];gl.useProgram(P.pr);const U=P.U;
  gl.uniformMatrix4fv(U.M,false,G.Mcol);gl.uniform4f(U.G,geo[0],geo[1],geo[2],geo[3]);gl.uniform4f(U.r,rect.x0,rect.y0,rect.x1,rect.y1);
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,G.tex[t0]);gl.uniform1i(U.T0,0);
  if(t1){gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,G.tex[t1]);gl.uniform1i(U.T1,1);}
  gl.uniform1f(U.w,uni.w||0);gl.uniform1f(U.nightC,uni.nightC||0);gl.uniform1f(U.termX,uni.termX||0);gl.uniform1f(U.termFeather,30);gl.uniform1f(U.bias,uni.bias||0);gl.uniform1f(U.grade,uni.grade||0);
  gl.uniform3fv(U.gradeInk,uni.gradeInk);gl.uniform3fv(U.paperD,uni.paperD);gl.uniform3fv(U.paperN,uni.paperN);
  gl.drawArrays(gl.TRIANGLES,0,G.count);
}
function drawGL(st){
  const {gl}=G,W=L.W,H=L.H,cam=st.cam,g=st.gl;
  const M=camFull(cam,V);
  const C=[2/W,0,0,-1, 0,-2/H,0,1, 0,0,-1e-5,0, 0,0,0,1];
  const F=camMul(C,M),col=[];for(let j=0;j<4;j++)for(let i=0;i<4;i++)col.push(F[i*4+j]);G.Mcol=new Float32Array(col);
  gl.viewport(0,0,W,H);
  const bgD=rgbOfTheme("light","--bg"),bgN=rgbOfTheme("dark","--bg");
  const sweep=g.termMode>=2,nightC=g.termMode===1?1:0,mode=g.termMode===2?1:g.termMode===3?2:0;
  const bg=sweep?(g.termMode===2?bgD:bgN):(nightC?bgN:bgD);
  gl.disable(gl.BLEND);gl.clearColor(bg[0],bg[1],bg[2],1);gl.clear(gl.COLOR_BUFFER_BIT);
  const uni={nightC,termX:g.termX,bias:g.dof||0,grade:g.grade||0,gradeInk:rgbOfTheme("light",g.gradeTok||"--gold-tint"),paperD:bgD,paperN:bgN};
  const ed=(lvl,night)=>lvl+(night?"-dark":"-light");
  // the whole-bay level and L0 place their labels apart: a slow crossfade doubled every label (review round 3), so the
  // switch between them is a cut (two frames at most)
  const k=cam.s*D.UNIT;const wbw=cam.pitch<8?1-Math.min(1,Math.max(0,(k-1.7)/0.08)):0;
  // the paper's surround: far enough out that the clear color never shows in a top-down view (review round 3: at the 16:9
  // sunset the surround beyond this quad flipped to Night in one frame while the sweep was halfway across the paper)
  const ext=cam.pitch<20?6000:600,P=D.PAPER,geo=[P.x0-ext,P.y0-ext,P.x1+ext,P.y1+ext],paper={x0:P.x0,y0:P.y0,x1:P.x1,y1:P.y1};
  const lvl=wbw>=0.5?"WB":"L0";
  if(sweep) glPass("t"+mode,geo,paper,ed(lvl,0),ed(lvl,1),uni);
  else if(nightC&&g.fillMix>0&&wbw>=0.5) g.fillMix>=0.999?glPass("o0",geo,paper,"WB-dark-fill",null,uni):glPass("t0",geo,paper,"WB-dark","WB-dark-fill",{...uni,w:g.fillMix});
  else if(wbw>0.001&&wbw<0.999) glPass("t0",geo,paper,ed("L0",nightC),ed("WB",nightC),{...uni,w:wbw});
  else glPass("o0",geo,paper,ed(wbw>=0.999?"WB":"L0",nightC),null,uni);
  // detail passes where the table is near enough (≥ 4 px per unit somewhere on screen)
  gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
  for(const id of ["L1","L2"]){const l=G.lv[id];let need=false;
    for(let a=0;a<=4&&!need;a++)for(let b=0;b<=4&&!need;b++){const x=(l.x0+(l.x1-l.x0)*a/4)*D.UNIT,y=(l.y0+(l.y1-l.y0)*b/4)*D.UNIT,p=camApply(M,x,y,0);if(p[2]<=0||p[0]<-200||p[0]>W+200||p[1]<-200||p[1]>H+200)continue;const q=camApply(M,x+D.UNIT,y,0);if(Math.hypot(q[0]-p[0],q[1]-p[1])>=3.6)need=true;}
    if(!need)continue;
    if(sweep)glPass("dt"+mode,[l.x0,l.y0,l.x1,l.y1],l,ed(id,0),ed(id,1),uni);else glPass("do0",[l.x0,l.y0,l.x1,l.y1],l,ed(id,nightC),null,uni);
  }
  gl.disable(gl.BLEND);
  gl.finish();
  // present through a 2D canvas: a WebGL canvas composited directly shows a y-flipped damage hole under SwiftShader
  if(!G.tb)G.tb=$("tb").getContext("2d",{alpha:false});G.tb.drawImage($("gl"),0,0);
}
const themeCols={};
function rgbOfTheme(theme,name){const k=theme+name;if(!themeCols[k]){const h=document.documentElement,old=h.dataset.theme;h.dataset.theme=theme;themeCols[k]=rgbOf(getComputedStyle(h).getPropertyValue(name).trim());h.dataset.theme=old;}return themeCols[k];}
function cssOfTheme(theme,name){const k="c"+theme+name;if(!themeCols[k]){const h=document.documentElement,old=h.dataset.theme;h.dataset.theme=theme;themeCols[k]=getComputedStyle(h).getPropertyValue(name).trim();h.dataset.theme=old;}return themeCols[k];}
/* ---------- projection helpers ---------- */
function camM(){return camFull(S.cam,V);}
function pt(M,x,y){const r=camApply(M,x,y,0);return r;}
function localScale(M,x,y){const a=camApply(M,x,y,0),b=camApply(M,x+10,y,0),c=camApply(M,x,y+10,0);return (Math.hypot(b[0]-a[0],b[1]-a[1])+Math.hypot(c[0]-a[0],c[1]-a[1]))/20;}
/* the phone: css px in its outer box → screen */
function phoneLocal(ph){return camMul(camT(ph.x,ph.y,0),camMul(camRZ(ph.rotZ),camMul(camRX(-ph.phi),camMul(camS(ph.k),camT(-D.PHONE.W/2,-D.PHONE.H,0)))));}
function phoneCss(ph){return "translate("+ph.x+"px,"+ph.y+"px) rotateZ("+ph.rotZ+"deg) rotateX("+(-ph.phi)+"deg) scale3d("+ph.k+","+ph.k+","+ph.k+") translate("+(-D.PHONE.W/2)+"px,"+(-D.PHONE.H)+"px)";}
function phoneM(){return camMul(camM(),phoneLocal(S.phone));}
/** a viewport css point of the phone → screen px */
function vpToScreen(M,u,v){return camApply(M,u+D.PHONE.vx,v+D.PHONE.vy,0);}
/** a laptop viewport css point → screen px (screen-space device) */
function lapToScreen(u,v){const lp=S.laptop;return [lp.sx+(u)*lp.k,lp.sy+(v)*lp.k];}
function frameDoc(slot){const f=$("f-"+slot);try{return f.contentDocument;}catch(e){return null;}}
function slotRect(slot,sel,last,child){const doc=frameDoc(slot);if(!doc)return null;const els=doc.querySelectorAll(sel);let e=last?els[els.length-1]:els[0];if(e&&child)e=e.querySelector(child);if(!e)return null;let r=e.getBoundingClientRect();
  if(child){let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;const tw=doc.createTreeWalker(e,NodeFilter.SHOW_TEXT);const rg=doc.createRange();for(let n=tw.nextNode();n;n=tw.nextNode()){if(!n.textContent.trim()||n.parentElement.closest(".sr-only"))continue;rg.selectNodeContents(n);for(const q of rg.getClientRects()){if(q.width<.5)continue;x0=Math.min(x0,q.left);y0=Math.min(y0,q.top);x1=Math.max(x1,q.right);y1=Math.max(y1,q.bottom);}}if(x1>x0)r={left:x0,top:y0,width:x1-x0,height:y1-y0};}return {x:r.left,y:r.top,w:r.width,h:r.height,fs:parseFloat(getComputedStyle(e).fontSize)};}
window.slotRect=slotRect;
/** screen box of a phone slot element (projected corners) */
function phoneBox(slot,sel,last,child){const r=slotRect(slot,sel,last,child);if(!r)return null;const M=phoneM();const cs=[[r.x,r.y],[r.x+r.w,r.y],[r.x,r.y+r.h],[r.x+r.w,r.y+r.h]].map(([u,v])=>vpToScreen(M,u,v));
  const xs=cs.map((c)=>c[0]),ys=cs.map((c)=>c[1]);const sc=Math.hypot(cs[1][0]-cs[0][0],cs[1][1]-cs[0][1])/Math.max(1,r.w);return {x0:Math.min(...xs),y0:Math.min(...ys),x1:Math.max(...xs),y1:Math.max(...ys),scale:sc,fs:r.fs,vis:r.y<D.PHONE.vp&&r.y+r.h>0};}
window.phoneBox=phoneBox;
/** every visible line box of a phone slot element, projected to the screen (the audit's frame-edge check) */
window.blockLines=(slot,sel,last)=>{const doc=frameDoc(slot);if(!doc)return null;const els=doc.querySelectorAll(sel);const e=last?els[els.length-1]:els[0];if(!e)return null;
  const M=phoneM(),out=[],tw=doc.createTreeWalker(e,NodeFilter.SHOW_TEXT),rg=doc.createRange();
  for(let n=tw.nextNode();n;n=tw.nextNode()){if(!n.textContent.trim()||n.parentElement.closest(".sr-only"))continue;rg.selectNodeContents(n);
    for(const q of rg.getClientRects()){if(q.width<.5||q.bottom<0||q.top>D.PHONE.vp)continue;const ym=(q.top+q.bottom)/2,a=vpToScreen(M,q.left,ym),b=vpToScreen(M,q.right,ym),ya=vpToScreen(M,q.left,q.top)[1],yb=vpToScreen(M,q.left,q.bottom)[1];out.push([Math.min(a[0],b[0]),Math.min(ya,yb),Math.max(a[0],b[0]),Math.max(ya,yb)]);}}
  return out;};
/* ---------- the engraving (S1) ---------- */
function drawEngraving(st){
  const e=$("eng");
  if(!st.engrave||st.engrave.o<=0){e.style.display="none";return;}
  e.style.display="block";
  const c=st.cam,k=c.s*D.UNIT;             // screen px per unit (pitch 0, yaw 0 in S1)
  e.style.left=(c.Cx-c.s*c.X)+"px";e.style.top=(c.Cy-c.s*c.Y)+"px";e.setAttribute("width",1000*k);e.setAttribute("height",1118*k);
  e.style.transformOrigin=(c.s*c.X)+"px "+(c.s*c.Y)+"px";e.style.transform=c.yaw?"rotate("+c.yaw+"deg)":"none";   // the hook turns the chart to north
  e.style.opacity=st.engrave.o;
  for(const p of e.querySelectorAll("path")){const len=+p.dataset.len,q=p.classList.contains("wl1")?st.engrave.p1:p.classList.contains("wl2")?st.engrave.p2:st.engrave.p;
    p.style.strokeDasharray=len+" "+len;p.style.strokeDashoffset=String(len*(1-q));p.style.display=q<=0?"none":"";}
}
/* ---------- overlay: course, dots, contact shadow ---------- */
const ov=$("ov").getContext("2d");
function drawOverlay(st){
  const W=L.W,H=L.H;ov.clearRect(0,0,W,H);
  const M=camM();
  // dots (pull-back)
  if(st.dots&&st.dots.o>0){
    const cols=SHEETS.map((s)=>tok("--sheet-"+s));
    ov.globalAlpha=0.55*st.dots.o;
    for(const [x,y,r,t0] of D.dots){if(st.dots.t!=null&&st.dots.t<t0)continue;const p=pt(M,x,y);if(p[2]<=0)continue;if(p[0]<-10||p[0]>W+10||p[1]<-10||p[1]>H+10)continue;
      const ls=localScale(M,x,y),rad=Math.max(2,Math.min(5,7*ls));ov.fillStyle=cols[r];ov.beginPath();ov.arc(p[0],p[1],rad,0,Math.PI*2);ov.fill();}
    ov.globalAlpha=1;
  }
  // the course: a dashed magenta line that draws on behind the phone
  if(st.course&&st.course.len>0){
    const pts=st.course.pts;let rem=st.course.len;const path=[];
    for(let i=0;i<pts.length-1&&rem>0;i++){const [x0,y0]=pts[i],[x1,y1]=pts[i+1],seg=Math.hypot(x1-x0,y1-y0),f=Math.min(1,rem/seg),n=Math.max(2,Math.ceil(40*f));
      for(let j=(i===0?0:1);j<=n;j++){const q=f*j/n;path.push([x0+(x1-x0)*q,y0+(y1-y0)*q]);}rem-=seg;}
    const sp=path.map(([x,y])=>pt(M,x,y)).filter((p)=>p[2]>0);
    if(sp.length>1){const mid=path[Math.floor(path.length/2)],ls=localScale(M,mid[0],mid[1]);const w=Math.max(2,Math.min(8,18*ls))*(1+0.3*(st.course.glow||0));
      ov.strokeStyle=tok("--magenta");ov.lineWidth=w;ov.lineCap="round";ov.lineJoin="round";ov.globalAlpha=st.course.o??1;
      ov.setLineDash([12*w/3,8*w/3]);ov.lineDashOffset=0;ov.beginPath();ov.moveTo(sp[0][0],sp[0][1]);for(const p of sp.slice(1))ov.lineTo(p[0],p[1]);ov.stroke();ov.setLineDash([]);ov.globalAlpha=1;}
  }
  // contact shadow under a standing phone
  if(st.shadow&&st.shadow.o>0&&S.phone&&S.phone.on){const p=pt(M,S.phone.x,S.phone.y),ls=localScale(M,S.phone.x,S.phone.y);const rx=D.PHONE.W*D.PHONE_K*ls*0.62,ry=rx*0.22;
    const g=ov.createRadialGradient(p[0],p[1],0,p[0],p[1],rx);g.addColorStop(0,"rgba(0,0,0,0)");ov.save();ov.translate(p[0],p[1]);ov.scale(1,ry/rx);
    const gg=ov.createRadialGradient(0,0,0,0,0,rx);const sc=tok("--scrim");gg.addColorStop(0,sc);gg.addColorStop(1,"transparent");ov.globalAlpha=0.22*st.shadow.o;ov.fillStyle=gg;ov.beginPath();ov.arc(0,0,rx,0,Math.PI*2);ov.fill();ov.restore();ov.globalAlpha=1;}
}
/* ---------- symbols and badges ---------- */
function drawSyms(st){
  const host=$("syms");const M=camM();
  for(const s of st.syms||[]){let el=$("sym-"+s.id);if(!el){el=document.createElement("div");el.className="sym";el.id="sym-"+s.id;el.dataset.sheet=s.sheet;el.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-'+s.sym+'"/></svg>';host.appendChild(el);}
    const p=pt(M,s.x,s.y);const ls=localScale(M,s.x,s.y),size=Math.max(28,Math.min(72,120*ls))*(s.scale??1);
    if(s.o<=0||p[2]<=0){el.style.display="none";continue;}el.style.display="grid";el.style.opacity=s.o;el.style.width=el.style.height=size+"px";el.style.transform="translate("+(p[0]-size/2)+"px,"+(p[1]-size/2)+"px)";}
}
function drawBadges(st){
  const host=$("badges");const M=camM();
  if(!host.childElementCount)for(const b of D.badges){const el=document.createElement("div");el.className="bdg";el.id="bdg-"+b.id;el.innerHTML='<svg viewBox="0 0 44 26" aria-hidden="true"><use href="#b-'+b.id+'"/></svg>';host.appendChild(el);
    for(const k of [1,2]){const r=document.createElement("div");r.className="ring";r.id="ring"+k+"-"+b.id;host.appendChild(r);}}
  for(const b of D.badges){const s=(st.badges||{})[b.id]||{o:0};const el=$("bdg-"+b.id);const p=pt(M,b.x,b.y);
    if(!s.o||p[2]<=0){el.style.display="none";}else{el.style.display="block";el.style.opacity=s.o;el.style.transform="translate("+p[0]+"px,"+p[1]+"px) scale("+s.sx+","+s.sy+")";}
    for(const k of [1,2]){const r=$("ring"+k+"-"+b.id),q=s["r"+k];if(!q||q.o<=0||!s.o){r.style.display="none";continue;}r.style.display="block";r.style.opacity=q.o;r.style.width=r.style.height=2*q.r+"px";r.style.transform="translate("+(p[0]-q.r)+"px,"+(p[1]-q.r)+"px)";}}
}
function drawRose(el,r){if(!r||r.o<=0){el.style.display="none";return;}el.style.display="block";el.style.width=el.style.height=r.d+"px";el.style.opacity=r.o;
  el.style.transform="translate("+(r.x-r.d/2)+"px,"+(r.y-r.d/2)+"px) rotate("+(r.rot||0)+"deg)";el.style.filter=r.blur?"blur("+r.blur+"px)":"none";}
/* ---------- the chronometer (an odometer: each column rolls) ---------- */
function col(el,c){ // c = [cur, next, p]
  const [a,b,p]=c;const key=a+"|"+b+"|"+p.toFixed(3);if(el.dataset.k===key)return;el.dataset.k=key;
  if(p<=0||a===b){el.innerHTML="<i>"+a+"</i>";el.style.width="";return;}
  el.innerHTML='<span class="strip" style="transform:translateY('+(-p*1.12)+'em)"><i>'+a+'</i><i>'+b+'</i></span>';
}
/* ---------- the running head ---------- */
function setText(el,t){if(el.textContent!==t)el.textContent=t;}
function fx(el,f){ // f = {o, dx, dy, s}
  if(!f||f.o<=0){el.style.visibility="hidden";el.style.opacity="0";return;}
  el.style.visibility="visible";el.style.opacity=String(f.o);
  const tr=[];if(f.dx||f.dy)tr.push("translate("+(f.dx||0)+"px,"+(f.dy||0)+"px)");if(f.s&&f.s!==1)tr.push("scale("+f.s+")");el.style.transform=tr.join(" ")||"none";
  if(f.clip!=null)el.style.clipPath="inset(0 "+(100-100*f.clip)+"% 0 0)";else el.style.clipPath="";
}
function drawHead(st){
  const h=st.head;
  $("head").style.display=h?"block":"none";if(!h)return;
  const fr=$("frame");fr.style.height=(h.bottom-L.frame.top)+"px";
  const rb=$("ribbon");if(h.ribbon.sheet)rb.dataset.sheet=h.ribbon.sheet;else delete rb.dataset.sheet;
  const rt=$("rbt");if(rt.textContent!==(h.ribbon.text||"")){rt.textContent=h.ribbon.text||"";rt.style.fontSize="";rt.style.letterSpacing="";rt.style.fontStretch="";
    const maxW=(L.frame.x1-L.frame.x0)-120;let fs=L.ribbon.font,ls=parseFloat(L.ribbon.track),st=125;
    for(let k=0;k<30&&rt.offsetWidth>maxW;k++){if(st>108)st-=4;else if(ls>0.1)ls-=0.02;else fs-=1;rt.style.fontStretch=st+"%";rt.style.letterSpacing=ls+"em";rt.style.fontSize=fs+"px";}}
  fx(rb,{o:h.ribbon.o??1});
  // hook
  fx($("hook"),h.hook?{o:1}:null);
  if(h.hook){fx($("hk-wmw"),h.hook.wm);fx($("hk-t1"),h.hook.t1);fx($("hk-t2"),h.hook.t2);fx($("hk-clock"),h.hook.clock);setText($("hk-clock"),h.hook.clockText||"");
    const lg=h.hook.legend||{};for(const el of document.querySelectorAll(".lg-i"))fx(el,lg[el.id.slice(3)]||null);}
  // stops
  fx($("stops"),h.stops?{o:1}:null);
  if(h.stops){const s=h.stops;
    fx($("chrono"),s.chrono);if(s.chrono){col($("c-h"),s.chrono.h);col($("c-m1"),s.chrono.m1);col($("c-m2"),s.chrono.m2);col($("c-mer"),s.chrono.mer);$("chrono").dataset.busy=s.chrono.busy?"1":"";}
    fx($("date"),s.date);
    const mr=$("mirror");if(s.mirror&&s.mirror.o>0){fx(mr,s.mirror);const m=S.live&&S.live.mirror;if(m){const t=$("mirt");setText(t,m.text.toUpperCase());t.style.color=m.color;t.style.background=m.bg;t.style.borderColor=m.border;mr.dataset.busy=s.mirror.busy?"1":"";}}else fx(mr,null);
    const lg=$("log");if(s.log&&s.log.o>0){if(lg.dataset.t!==s.log.text){lg.dataset.t=s.log.text;lg.innerHTML=s.log.html||s.log.text.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/(\S+-\S+)/g,'<span style="white-space:nowrap">$1</span>');}lg.className=s.log.style==="title"?"title":"";lg.style.fontSize=(s.log.size||L.log.size)+"px";lg.dataset.read=String(s.log.words);lg.dataset.id="log:"+s.log.id;lg.dataset.role=s.log.role||"must";fx(lg,s.log);}else{fx(lg,null);lg.removeAttribute("data-read");}
    const ft=$("foot");if(s.foot&&s.foot.o>0){setText(ft,s.foot.text);ft.dataset.read=String(s.foot.words);ft.dataset.id="foot:"+s.foot.id;ft.dataset.role=s.foot.role||"secondary";fx(ft,s.foot);}else{fx(ft,null);ft.removeAttribute("data-read");}
    const ty=$("typed");if(s.typed&&s.typed.o>0){ty.innerHTML=s.typed.html;fx(ty,s.typed);}else fx(ty,null);
    if($("dayrule"))drawDayRule(s.dayRule);
    if($("rowE")){const re=$("rowE");if(s.rowE&&s.rowE.o>0){setText(re,s.rowE.text);fx(re,s.rowE);}else fx(re,null);}
  }
  // end
  fx($("end"),h.end?{o:1}:null);
  if(h.end){fx($("en-wm").parentElement,h.end.wm);fx($("counts"),h.end.counts);if($("endsrc"))fx($("endsrc"),h.end.src);if($("about"))fx($("about"),h.end.about);if($("endattr"))fx($("endattr"),h.end.attr);}
}
let dayRuleBuilt=false;
function drawDayRule(dr){
  const el=$("dayrule");if(!dr||dr.o<=0){fx(el,null);return;}fx(el,{o:dr.o});
  const w=L.dayRule.x1-L.dayRule.x0,X=(h)=>w*(h-dr.h0)/(dr.h1-dr.h0);
  if(!dayRuleBuilt){dayRuleBuilt=true;let html='<div class="band" style="width:'+w+'px"></div><div class="day" id="dr-day"></div>';
    for(let h=dr.h0;h<=dr.h1;h++)html+='<div class="tk" style="left:'+X(h)+'px;'+(h%6?'height:12px;top:30px':'')+'"></div>';
    for(const [h,t] of dr.labels)html+='<div class="tl" style="left:'+X(h)+'px">'+t+'</div>';
    html+='<div class="now" id="dr-now"></div><div id="dr-syms"></div>';el.innerHTML=html;}
  const day=$("dr-day");day.style.left=X(dr.sr)+"px";day.style.width=(X(dr.ss)-X(dr.sr))+"px";
  $("dr-now").style.left=X(dr.now)+"px";
  const hs=$("dr-syms");let html="";for(const s of dr.syms)html+='<div class="dsym" data-sheet="'+s.sheet+'" style="left:'+X(s.h)+'px"><svg viewBox="0 0 24 24"><use href="#i-'+s.sym+'"/></svg></div>';if(hs.dataset.k!==html){hs.dataset.k=html;hs.innerHTML=html;}
}
/* ---------- the phone ---------- */
function drawPhone(st){
  const ph=st.phone,el=$("phone");
  if(!ph||!ph.on){el.style.display="none";return;}
  el.style.display="block";el.style.transform=phoneCss(ph);el.style.opacity=String(ph.o??1);
  setText($("ptime"),ph.time);
  // page changes: a cut, or a horizontal push (both pages opaque, side by side); never a dissolve of two dense pages
  for(const f of $("vp").querySelectorAll("iframe")){const o=ph.slots[f.name]||0,sh=ph.shift&&ph.shift[f.name];
    if(o>0){f.classList.remove("park");f.style.opacity=String(o);f.style.zIndex=o>=1?"1":"2";f.style.transform=sh?"translateX("+sh.toFixed(2)+"px)":"";}else{f.classList.add("park");f.style.opacity="0";f.style.transform="";}}
}
/* ---------- edge fades: a phone page wider than the frame dissolves into its own paper instead of being sliced ---------- */
/** how far (screen px) the phone's visible text crosses the left and right frame edges; null when the viewport fits */
function phoneEdgeNeed(){
  const ph=S.phone;if(!ph||!ph.on||(ph.o??1)<0.5)return null;
  const M=phoneM(),a=vpToScreen(M,0,D.PHONE.vp/2),b=vpToScreen(M,D.PHONE.w,D.PHONE.vp/2);
  if(Math.min(a[0],b[0])>=0&&Math.max(a[0],b[0])<=L.W)return null;
  let cl=0,cr=0;
  for(const f of $("vp").querySelectorAll("iframe")){if((ph.slots[f.name]||0)<0.3)continue;const doc=frameDoc(f.name);if(!doc||!doc.body)continue;const sh=(ph.shift&&ph.shift[f.name])||0;
    const tw=doc.createTreeWalker(doc.body,NodeFilter.SHOW_TEXT),rg=doc.createRange();
    for(let n=tw.nextNode();n;n=tw.nextNode()){const p=n.parentElement;if(!p||!n.textContent.trim()||p.closest(".sr-only"))continue;
      rg.selectNodeContents(n);for(const q of rg.getClientRects()){if(q.width<.5||q.bottom<0||q.top>D.PHONE.vp)continue;
        const x0=vpToScreen(M,q.left+sh,(q.top+q.bottom)/2)[0],x1=vpToScreen(M,q.right+sh,(q.top+q.bottom)/2)[0];
        if(x0<0&&x1>0)cl=Math.max(cl,-x0);if(x1>L.W&&x0<L.W)cr=Math.max(cr,x1-L.W);}}}
  return {cl,cr};
}
function drawEdges(e){e=e||{};
  const set=(el,v,f)=>{if(!v||!(v.o>0)){el.style.display="none";return;}el.style.display="block";el.style.opacity=String(Math.min(1,v.o));f(el,v);};
  set($("edL"),e.l,(el,v)=>{el.style.width=v.w+"px";el.style.top=(v.y0||0)+"px";el.style.height=((v.y1||L.H)-(v.y0||0))+"px";});
  set($("edR"),e.r,(el,v)=>{el.style.width=v.w+"px";el.style.top=(v.y0||0)+"px";el.style.height=((v.y1||L.H)-(v.y0||0))+"px";});
  set($("edT"),e.t,(el,v)=>{el.style.height=v.h+"px";el.style.left=(v.x0||0)+"px";el.style.width=((v.x1||L.W)-(v.x0||0))+"px";});
  set($("edB"),e.b,(el,v)=>{el.style.top=v.y0+"px";el.style.height=Math.max(0,L.H-v.y0)+"px";el.style.left=(v.x0||0)+"px";el.style.width=((v.x1||L.W)-(v.x0||0))+"px";});
}
/* ---------- the laptop ---------- */
function drawLaptop(st){
  const lp=st.laptop,el=$("laptop");
  if(!lp||!lp.on){el.style.opacity="0";el.style.clipPath="none";return;}   // transparent, in place: cross-origin slots must stay in the viewport or Chromium throttles them

  const k=lp.k,sw=D.LAPTOP.cssW*k,sh=D.LAPTOP.cssH*k,bz=D.LAPTOP.bezel*1.3*(k/0.72),barH=lp.bar?30*(k/0.72):0;
  const lid=$("lid");lid.style.left=(lp.sx-bz)+"px";lid.style.top=(lp.sy-bz-barH)+"px";lid.style.width=(sw+2*bz)+"px";lid.style.height=(sh+2*bz+barH)+"px";lid.style.borderRadius=(18*k/0.72)+"px";
  const scr=$("lscreen");scr.style.left=lp.sx+"px";scr.style.top=(lp.sy-barH)+"px";scr.style.width=sw+"px";scr.style.height=(sh+barH)+"px";
  const bar=$("lbar");bar.style.display=barH?"flex":"none";bar.style.left="0px";bar.style.top="0px";bar.style.width=sw+"px";bar.style.height=barH+"px";bar.style.fontSize=(14*k/0.72)+"px";setText($("lurl"),lp.url||"");
  for(const f of scr.querySelectorAll("iframe")){const o=lp.slots[f.name]||0;f.style.top=barH+"px";f.style.transform="scale("+k+")";if(o>0){f.classList.remove("park");f.style.opacity=String(o);}else{f.classList.add("park");f.style.opacity="0";}}
  const hg=$("hinge");hg.style.left=(lp.sx-bz+60*k/0.72)+"px";hg.style.top=(lp.sy+sh+bz)+"px";hg.style.width=(sw+2*bz-120*k/0.72)+"px";hg.style.height=(10*k/0.72)+"px";
  const dk=$("deck");dk.style.left=(lp.sx-bz-50*k/0.72)+"px";dk.style.top=(lp.sy+sh+bz+6*k/0.72)+"px";dk.style.width=(sw+2*bz+100*k/0.72)+"px";dk.style.height=(22*k/0.72)+"px";
  // the body is never faded: it is hidden while only the map's own chart shows (the dock match), then revealed opaque
  const body=$("lbody");body.style.opacity="1";body.style.transform="none";body.style.visibility=lp.bodyOn===false?"hidden":"visible";
  bar.style.opacity="1";bar.style.visibility=lp.bodyOn===false?"hidden":"visible";
  scr.style.background=lp.screenBg===false?"transparent":"";
  scr.style.clipPath=lp.clip?"inset("+lp.clip.map((v)=>Math.max(0,v)+"px").join(" ")+")":"none";
  el.style.clipPath=lp.iris?"inset("+lp.iris.map((v)=>v.toFixed(2)+"px").join(" ")+" round "+(lp.irisR||0).toFixed(1)+"px)":"none";
  el.style.opacity=String(lp.o??1);
  el.style.transform=lp.transform||"none";el.style.transformOrigin=lp.origin||"0 0";
}
/* ---------- the tap ripple and the cursor ---------- */
function drawTap(tp){
  const el=$("tap");if(!tp){el.style.display="none";return;}
  el.style.display="block";el.style.left=tp.x+"px";el.style.top=tp.y+"px";
  const p=tp.p,size=tp.size||46,dot=el.querySelector(".dot"),rg=el.querySelector(".rg");
  const out=(q)=>1-Math.pow(1-Math.max(0,Math.min(1,q)),3);
  const press=p<.35?out(p/.35):1,fade=p<.55?1:1-(p-.55)/.45;
  dot.style.width=dot.style.height=size+"px";dot.style.left=dot.style.top=(-size/2)+"px";dot.style.opacity=String(fade);dot.style.transform="scale("+(1.15-.2*press)+")";
  const r=size*.43+size*out(Math.max(0,(p-.2)/.8));rg.style.width=rg.style.height=2*r+"px";rg.style.left=rg.style.top=-r+"px";rg.style.opacity=String(Math.max(0,.9-p)*(p>.2?1:0));
}
function drawCursor(c){
  const el=$("cursor"),rg=$("cring");if(!c||!c.on){el.style.display="none";rg.style.display="none";return;}
  el.style.display="block";el.style.transform="translate("+(c.x-3)+"px,"+(c.y-2)+"px) scale("+(c.s||1)+")";
  if(c.ring&&c.ring.o>0){rg.style.display="block";rg.style.opacity=c.ring.o;rg.style.width=rg.style.height=2*c.ring.r+"px";rg.style.transform="translate("+(c.x-c.ring.r)+"px,"+(c.y-c.ring.r)+"px)";}else rg.style.display="none";
}
function drawArc(a){
  const el=$("arc");if(!a||a.o<=0){el.style.display="none";return;}
  el.style.display="block";el.style.opacity=a.o;
  const [x0,y0,cx,cy,x1,y1]=a.q,n=48,m=Math.max(1,Math.round(n*a.p));const P=(u)=>[(1-u)*(1-u)*x0+2*(1-u)*u*cx+u*u*x1,(1-u)*(1-u)*y0+2*(1-u)*u*cy+u*u*y1];
  let d="M"+x0+" "+y0;for(let i=1;i<=m;i++){const q=P(a.p*i/m);d+=" L"+q[0].toFixed(1)+" "+q[1].toFixed(1);}
  const p=$("arcp");p.setAttribute("d",d);p.style.strokeWidth=a.w;p.style.strokeDasharray=(a.w*4)+" "+(a.w*2.6);
  const hd=$("arch");
  if(a.p>=0.98){const e=P(1),b=P(0.96),ang=Math.atan2(e[1]-b[1],e[0]-b[0]),L=a.w*4.2;const l=[e[0]-L*Math.cos(ang-0.5),e[1]-L*Math.sin(ang-0.5)],r=[e[0]-L*Math.cos(ang+0.5),e[1]-L*Math.sin(ang+0.5)];hd.setAttribute("d","M"+l[0]+" "+l[1]+" L"+e[0]+" "+e[1]+" L"+r[0]+" "+r[1]);hd.style.strokeWidth=a.w;hd.style.strokeDasharray="none";}
  else hd.setAttribute("d","");
}
/* ---------- live copies from the site (read in the same frame) ---------- */
function readMirror(src){
  const doc=frameDoc(src.slot);if(!doc)return null;const c=doc.querySelector(src.sel);if(!c)return null;
  const e=c.querySelector(".ev-status");if(!e)return null;const cs=getComputedStyle(e);
  return {text:e.textContent.trim(),color:cs.color,bg:cs.backgroundColor,border:cs.borderColor,status:c.dataset.status||""};
}
/* ---------- render one frame ---------- */
window.render=(st)=>{
  S=st;
  const h=document.documentElement;if(h.dataset.theme!==st.theme)h.dataset.theme=st.theme;
  // device scrolls (same-origin slots), before anything reads their rects
  for(const [slot,y] of Object.entries(st.scroll||{})){const doc=frameDoc(slot);if(doc&&doc.defaultView){const w=doc.defaultView;if(Math.abs(w.scrollY-y)>0.4)w.scrollTo(0,y);}}
  S.live={};if(st.mirrorFrom)S.live.mirror=readMirror(st.mirrorFrom);
  // world
  $("world").style.transform=camCss(st.cam);
  if(!st.noGL)drawGL(st);drawOverlay(st);drawEngraving(st);drawSyms(st);drawBadges(st);drawRose($("rose"),st.rose);drawRose($("rosefg"),st.rosefg);
  drawPhone(st);drawLaptop(st);
  // the Reel's edge fades follow the page: a side fades only while a line of the phone's text actually crosses that edge
  if(st.edgeAuto){const n=phoneEdgeNeed(),e={...(st.edge||{})};if(n){if(n.cl>0)e.l={o:Math.min(1,n.cl/8),w:st.edgeAuto.l||72};if(n.cr>0)e.r={o:Math.min(1,n.cr/8),w:st.edgeAuto.r||150};}S.edge=e;}
  drawEdges(S.edge);
  $("mist").style.opacity=String(st.mist??1);$("mist").style.height=(st.mistH??L.mist)+"px";
  drawHead(st);
  const pl=$("plate");if(st.plate&&st.plate.o>0){pl.style.display="block";pl.style.opacity=st.plate.o;pl.style.transform="translateY("+(st.plate.dy||0)+"px)";}else pl.style.display="none";
  // the tap ripple: centered on the tapped element, projected through its device
  let tp=null;if(st.tap){const t=st.tap;let c=null;
    if(t.dev==="phone"){const b=phoneBox(t.slot,t.sel);if(b){c=[(b.x0+b.x1)/2,(b.y0+b.y1)/2];t.size=Math.max(40,Math.min(96,46*b.scale/1.6));}}
    if(c)tp={x:c[0],y:c[1],p:t.p,size:t.size};}
  drawTap(tp);drawCursor(st.cursor);drawArc(st.arc);
  const cr=$("credit");if(st.credit&&st.credit.o>0){cr.style.display="block";cr.textContent=st.credit.text;cr.style.left=st.credit.x+"px";cr.style.top=st.credit.y+"px";cr.style.opacity=st.credit.o;}else cr.style.display="none";
  return {mirror:S.live.mirror||null,tap:tp};
};
`;
