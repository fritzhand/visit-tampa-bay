/* ============================================================
   collateral/lib/promo-capture.mjs — the browser side of the promo (plan.md §5).

   - serve(): one http server for the private build (.cache/promo/site under /visit-tampa-bay/), the stage
     (/__stage), the textures (/__promo/tex/…) and one-off pages. It answers on two host names, which are
     two browser origins with separate storage: origin A http://localhost:<port> (the stage and the phone)
     and origin B http://127.0.0.1:<port> (the laptop in 16:9). It never reads or writes docs/.
   - FFMPEG: the ffmpeg binary (imageio-ffmpeg's, or $FFMPEG).
   - newContext(): one context per cut: the cut's viewport at device scale 1, reduced motion, the system
     appearance dark before sunrise, clipboard granted to origin A, every CSS transition and animation
     off in every frame (the stage adds all motion), and the site's clock installed and paused.
   ============================================================ */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

export const FFMPEG = process.env.FFMPEG || (() => { try { return execFileSync("python3", ["-c", "import imageio_ffmpeg as f;print(f.get_ffmpeg_exe())"]).toString().trim(); } catch { return "ffmpeg"; } })();

const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".json": "application/json", ".woff2": "font/woff2", ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp", ".jpg": "image/jpeg", ".ics": "text/calendar", ".xml": "application/xml", ".txt": "text/plain; charset=utf-8" };

/** serve(siteDir, { texDir, pathPrefix }) → { originA, originB, port, pathPrefix, setPage(url, html), close() } */
export function serve(siteDir, { texDir, pathPrefix = "/visit-tampa-bay/", port = 0 } = {}) {
  const pages = new Map();
  const S = { pathPrefix, pages };
  S.server = http.createServer((q, r) => {
    const u = new URL(q.url, "http://x");
    if (pages.has(u.pathname)) { r.writeHead(200, { "Content-Type": TYPES[".html"], "Cache-Control": "no-store" }); r.end(pages.get(u.pathname)); return; }
    let f = null;
    if (u.pathname.startsWith("/__promo/tex/") && texDir) f = path.join(texDir, decodeURIComponent(u.pathname.slice("/__promo/tex/".length)));
    else if (u.pathname.startsWith(pathPrefix)) { f = path.join(siteDir, decodeURIComponent(u.pathname.slice(pathPrefix.length))); if (u.pathname.endsWith("/")) f = path.join(f, "index.html"); }
    if (!f || (texDir && !f.startsWith(texDir) && !f.startsWith(siteDir))) { r.writeHead(404); r.end(); return; }
    fs.readFile(f, (e, d) => {
      if (e) { r.writeHead(404); r.end(); return; }
      r.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream", "Cache-Control": "max-age=3600" });
      r.end(d);
    });
  });
  S.listen = () => new Promise((res) => S.server.listen(port, () => {
    S.port = S.server.address().port;
    S.originA = `http://localhost:${S.port}`;
    S.originB = `http://127.0.0.1:${S.port}`;
    res(S);
  }));
  S.setPage = (url, html) => pages.set(url, html);
  S.close = () => new Promise((res) => S.server.close(() => res()));
  return S;
}

/** The motion-off rule every frame gets (plan.md §5.1). */
export const MOTION_OFF = "*,*::before,*::after{transition:none!important;animation:none!important;caret-color:transparent!important}";

/** A context for one cut. W0 is the installed clock's start; slots load while it is paused one whole minute earlier. */
export async function newContext(browser, { width, height, originA, clockAt, dsf = 1 }) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: dsf, reducedMotion: "reduce", colorScheme: "dark" });
  await ctx.grantPermissions(["clipboard-read", "clipboard-write"], { origin: originA });
  await ctx.addInitScript((css) => {
    const add = () => { const s = document.createElement("style"); s.setAttribute("data-promo", "motion-off"); s.textContent = css; (document.head || document.documentElement).appendChild(s); };
    if (document.documentElement) add(); else document.addEventListener("DOMContentLoaded", add);
  }, MOTION_OFF);
  await ctx.clock.install({ time: clockAt - 1000 });
  await ctx.clock.pauseAt(clockAt);
  return ctx;
}
