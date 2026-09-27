#!/usr/bin/env python3
"""scripts/fetch-images.py · OWNER: images pass (merge and images lane)

Downloads every rights-cleared image data/media.json lists, once, politely, and writes small WebP renditions plus
the manifest the build reads (data/images.json → build/core/images.mjs). Dev-time only: the build never needs the
network or Pillow. Never hotlink (CLAUDE.md rule 8).

  python3 scripts/fetch-images.py                   # incremental: new or changed images only
  python3 scripts/fetch-images.py --force           # re-process every cached original (after a pipeline change)
  python3 scripts/fetch-images.py --retry-failed    # also retry downloads that failed on an earlier run
  python3 scripts/fetch-images.py --offline         # no network: .cache/img-src only (a miss is reported)
  python3 scripts/fetch-images.py --only p/tampa-theatre,t/first-gasparilla-1904   # just these keys (re-processed)
  python3 scripts/fetch-images.py --max-minutes 30  # stop downloading after 30 min, then finish with what is cached
  python3 scripts/fetch-images.py --prefetch research/media-commons/media-commons.json
                                                    # only warm the cache from another media list (a slice or a
                                                    # media.json); writes no rendition and no manifest entry

Inputs   data/media.json (license public-domain cc0 cc-by cc-by-sa us-gov; credit; file_url on *.wikimedia.org;
         subject_kind + subject). The subject's collection decides the manifest kind:
         place → p · stay → s · area → a · timeline → t · experience → x · region → r.
         Media about an event or a series have no image kind in the engine and are reported, not processed.
         One image per subject: the first media record for it in media.json; for a timeline entry, the first of its
         own `media` list (the history page captions the figure with that record's title), then the rest.
         PRIMARY below records hand-picked exceptions. Fetch order (so a run cut short has done what matters most):
         regions, areas, signature places, historic places and stays, timeline entries, other places, other stays.
Fetch    Standard-size thumbnails only. Wikimedia serves direct requests only at its standard thumbnail widths (20 40
         60 120 250 330 500 960 1280 1920 3840; https://www.mediawiki.org/wiki/Common_thumbnail_sizes), so a 1600px
         thumbnail would be refused, and it answers requests for originals from this network with 429 "use thumbnail
         images in sizes listed on https://w.wiki/GHai" (Retry-After 600). An original wider than 1280 px is fetched as
         the 1280px thumbnail; a narrower one as the largest standard width below its own (a 1000 px JPEG → 960px);
         a TIFF or PDF as its JPEG page thumbnail, an SVG as a PNG. Only a thumbnail that errors with something other
         than 429 falls back to the original.
Etiquette  User-Agent "tampa-bay-chartbook/1.0 (https://github.com/fritzhand/visit-tampa-bay) python-urllib/3.x" (the
         WMF User-Agent policy's form), one request at a time and at least 1.5 s between requests to a host (doubling,
         up to 16 s, after every 429, easing back after 8 answers in a row), Retry-After honored (up to 15 min), exponential backoff (5, 10, 20, 40, 80 s)
         on 429 and 5xx without one, and after 4 images in a row are refused for rate limiting the run stops fetching
         (those images are "deferred" and retried by the next plain run); with --max-minutes it pauses 10 min
         instead and goes on until the time is up. Every response's outcome is logged.
         Ctrl-C, SIGTERM or --max-minutes stop the downloads the same way: images already cached are still
         processed and the manifest is written, so a run can be interrupted at any time and resumed by the next one.
Cache    .cache/img-src/<sha1(fetch url)>.<ext> (the downloads, gitignored) + index.json (url → file, bytes, type,
         date; or the error, its HTTP status and date) + requests.log (one line per HTTP response: status,
         Retry-After, bytes) + state.json (manifest key → src, media, pipeline) + report.json (the last run).
Outputs  site/img/<kind>/<id>.webp      480 px wide (never upscaled; a very tall image is capped at 960 px high),
                                        WebP q70: cards, lists, search, the client's thumbnails
         site/img/<kind>/<id>-lg.webp   fits 1200 × 1200 (never upscaled), WebP q72: detail pages, figures; only
                                        when the source is meaningfully larger than the small rendition
         Both: EXIF orientation applied, converted to sRGB (embedded ICC profile honored), metadata stripped.
         data/images.json  { "<kind>/<id>": { file, w, h, lg?: { file, w, h }, alt, credit, license, license_url?,
                             page_url?, creator?, media } }   (build/CONTRACTS.md §5)
A subject whose image cannot be fetched keeps its previous entry if it has one, else gets none: pages show the
typographic plate. Files and entries whose media record or subject is gone are removed (a takedown is: delete the
media.json record, run this script, build, commit).
"""
import argparse
import hashlib
import io
import json
import os
import re
import signal
import ssl
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from email.utils import parsedate_to_datetime

try:
    from PIL import Image, ImageOps
except ImportError:  # pragma: no cover
    sys.stderr.write("fetch-images.py needs Pillow with WebP support: pip install pillow\n")
    sys.exit(2)
try:
    from PIL import ImageCms
except ImportError:  # pragma: no cover - without littlecms, ICC profiles are dropped unconverted
    ImageCms = None

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
SITE = os.path.join(ROOT, "site")
IMG = os.path.join(SITE, "img")
CACHE = os.path.join(ROOT, ".cache", "img-src")
MANIFEST = os.path.join(DATA, "images.json")
PIPELINE = 1  # bump when the processing below changes: renditions made by an older pipeline are redone

UA = f"tampa-bay-chartbook/1.0 (https://github.com/fritzhand/visit-tampa-bay) python-urllib/{sys.version_info[0]}.{sys.version_info[1]}"
GAP, GAP_MAX = 1.5, 64.0         # seconds between request starts to one host; the gap doubles after a 429
BACKOFF = (5, 10, 20, 40, 80)    # seconds to wait before attempts 2..6 when there is no Retry-After
RETRY_AFTER_MAX = 900
STOP_AFTER_RATE_LIMITED = 4      # images refused in a row for rate limiting → stop fetching this run
PAUSE = 600                      # … or, with --max-minutes, pause this many seconds and go on
MAX_BYTES = 60 * 1024 * 1024
Image.MAX_IMAGE_PIXELS = 250_000_000

STEPS = (20, 40, 60, 120, 250, 330, 500, 960, 1280, 1920, 3840)  # Wikimedia's standard thumbnail widths
FETCH_W = 1280
SM_W, SM_MAX_H, SM_Q = 480, 960, 70
LG_BOX, LG_Q = (1200, 1200), 72
LG_MIN_GAIN = 1.25               # make a large rendition only when it is at least 25% wider than the small one

SUBJECTS = {  # media subject_kind → (manifest kind, data file)
    "place": ("p", "places.json"), "stay": ("s", "stays.json"), "area": ("a", "areas.json"),
    "timeline": ("t", "timeline.json"), "experience": ("x", "experiences.json"), "region": ("r", "regions.json"),
}
KINDS = [k for k, _ in SUBJECTS.values()]
LICENSES = {"public-domain", "cc0", "cc-by", "cc-by-sa", "us-gov"}
# Hand-picked primaries, checked by eye: "<kind>/<id>" → media id (otherwise the first record for the subject).
PRIMARY = {}


def log(*a):
    print(*a, flush=True)


def load_json(path, default=None):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return default


def save_json(path, obj):
    txt = json.dumps(obj, indent=2, ensure_ascii=False, sort_keys=True) + "\n"
    try:
        with open(path, encoding="utf-8") as f:
            if f.read() == txt:
                return False
    except OSError:
        pass
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        f.write(txt)
    os.replace(tmp, path)
    return True


def media_list(obj):
    """A media.json array, a slice ({ records: { media } }) or { media }."""
    if isinstance(obj, list):
        return obj
    if isinstance(obj, dict):
        if isinstance(obj.get("records"), dict):
            return obj["records"].get("media") or []
        return obj.get("media") or []
    return []


# ---------------------------------------------------------------- which URL to fetch
WM = re.compile(r"^https://[a-z0-9.-]*wikimedia\.org/wikipedia/([\w-]+)/(?:thumb/)?([0-9a-f])/([0-9a-f]{2})/([^/?#]+)(?:/([^/?#]+))?$")


def commons_parts(url):
    """→ (project, a, ab, encoded file name) for an upload.wikimedia.org original or thumbnail URL, else None."""
    u = url.split("#")[0].split("?")[0]
    m = WM.match(u)
    return m.groups()[:4] if m else None


def fetch_plan(rec):
    """→ [urls to try, in order] for a media record (a polite thumbnail first when the original is large)."""
    url = rec["file_url"]
    parts = commons_parts(url)
    if not parts:
        return [url.split("#")[0]]
    proj, a, ab, name = parts
    original = f"https://upload.wikimedia.org/wikipedia/{proj}/{a}/{ab}/{name}"
    ext = name.rsplit(".", 1)[-1].lower() if "." in name else ""
    w = rec.get("width") if isinstance(rec.get("width"), int) else None
    web = ext in ("jpg", "jpeg", "png", "gif", "webp")
    # the largest standard width below the original's (a thumbnail as wide as the original is not generated)
    step = FETCH_W if w is None or w > FETCH_W else max([s for s in STEPS if s < w] or [STEPS[0]])
    if ext in ("tif", "tiff"):
        thumb_name = f"lossy-page1-{step}px-{name}.jpg"
    elif ext in ("pdf", "djvu"):
        thumb_name = f"page1-{step}px-{name}.jpg"
    elif ext == "svg":
        thumb_name = f"{step}px-{name}.png"
    else:
        thumb_name = f"{step}px-{name}"
    thumb = f"https://upload.wikimedia.org/wikipedia/{proj}/thumb/{a}/{ab}/{name}/{thumb_name}"
    # Wikimedia answers requests for originals from this network with 429 "use thumbnail images in sizes listed on
    # https://w.wiki/GHai" (Retry-After 600): the original is only a fallback when the thumbnail itself errors (not 429)
    return [thumb, original] if web else [thumb]


def quote_url(u):
    """Keep the URL's own %-escapes; escape only what is not allowed raw (spaces, non-ASCII)."""
    parts = urllib.parse.urlsplit(u.strip())
    path = urllib.parse.quote(parts.path, safe="/%:@!$&'()*+,;=~")
    return urllib.parse.urlunsplit((parts.scheme, parts.netloc, path, parts.query, ""))


# ---------------------------------------------------------------- polite download
class RateLimited(Exception):
    pass


class FetchError(Exception):
    def __init__(self, msg, code=None):
        super().__init__(msg)
        self.code = code


class Deferred(Exception):
    """Not downloaded in this run (it stopped fetching); the next plain run tries again."""


class Stopped(Exception):
    """SIGTERM, Ctrl-C or --max-minutes: stop fetching, keep what is done, write the manifest."""


STOP = {"flag": False, "why": "", "deadline": None}


def stop_requested():
    if not STOP["flag"] and STOP["deadline"] is not None and time.monotonic() >= STOP["deadline"]:
        STOP["flag"], STOP["why"] = True, "--max-minutes reached"
    return STOP["flag"]


def on_signal(signum, _frame):
    STOP["flag"], STOP["why"] = True, f"signal {signal.Signals(signum).name}"


def nap(seconds):
    """time.sleep that wakes up for a stop request."""
    end = time.monotonic() + seconds
    while True:
        if stop_requested():
            raise Stopped(STOP["why"])
        left = end - time.monotonic()
        if left <= 0:
            return
        time.sleep(min(left, 0.5))


class Limiter:
    def __init__(self):
        self.last = {}
        self.gap = {}
        self.ok = {}

    def wait(self, host):
        gap = self.gap.get(host, GAP)
        delay = self.last.get(host, 0) + gap - time.monotonic()
        if delay > 0:
            nap(delay)
        if stop_requested():
            raise Stopped(STOP["why"])
        self.last[host] = time.monotonic()

    def slow(self, host):
        self.gap[host] = min(self.gap.get(host, GAP) * 2, GAP_MAX)
        self.ok[host] = 0

    def eased(self, host):
        """After 4 answers in a row without a 429, shorten the gap again (never below GAP)."""
        self.ok[host] = self.ok.get(host, 0) + 1
        if self.ok[host] >= 4 and self.gap.get(host, GAP) > GAP:
            self.gap[host] = max(GAP, self.gap[host] * 0.75)
            self.ok[host] = 0


LIMIT = Limiter()


def ssl_ctx():
    for var in ("SSL_CERT_FILE", "REQUESTS_CA_BUNDLE", "CURL_CA_BUNDLE", "NODE_EXTRA_CA_CERTS"):
        f = os.environ.get(var)
        if f and os.path.exists(f):
            return ssl.create_default_context(cafile=f)
    if os.path.exists("/root/.ccr/ca-bundle.crt"):
        return ssl.create_default_context(cafile="/root/.ccr/ca-bundle.crt")
    return ssl.create_default_context()


CTX = ssl_ctx()


def retry_after(value):
    if not value:
        return None
    value = value.strip()
    if value.isdigit():
        return float(value)
    try:
        return max(0.0, parsedate_to_datetime(value).timestamp() - time.time())
    except (TypeError, ValueError):
        return None


def fetch(url, events):
    """→ (bytes, content type). Raises RateLimited (still refused after every retry) or FetchError."""
    host = urllib.parse.urlsplit(url).netloc
    last, last_code = "unknown error", None
    for attempt in range(len(BACKOFF) + 1):
        LIMIT.wait(host)
        req = urllib.request.Request(quote_url(url), headers={
            "User-Agent": UA, "Accept": "image/webp,image/jpeg,image/png,image/*;q=0.8,*/*;q=0.5"})
        try:
            with urllib.request.urlopen(req, timeout=60, context=CTX) as r:
                data = r.read(MAX_BYTES + 1)
                if len(data) > MAX_BYTES:
                    raise FetchError("larger than 60 MB")
                events.append({"url": url, "status": r.status, "bytes": len(data), "at": time.strftime("%Y-%m-%dT%H:%M:%S")})
                LIMIT.eased(host)
                return data, (r.headers.get("Content-Type") or "").split(";")[0].strip().lower()
        except urllib.error.HTTPError as e:
            last, last_code = f"HTTP {e.code}", e.code
            ra = retry_after(e.headers.get("Retry-After") if e.headers else None)
            events.append({"url": url, "status": e.code, "retry_after": ra, "at": time.strftime("%Y-%m-%dT%H:%M:%S")})
            if e.code in (429, 500, 502, 503, 504) and attempt < len(BACKOFF):
                if e.code == 429:
                    LIMIT.slow(host)
                # Retry-After is a minimum: the next attempt also waits out the host's (grown) gap in LIMIT.wait
                wait = min(ra if ra is not None else BACKOFF[attempt], RETRY_AFTER_MAX)
                log(f"    HTTP {e.code} from {host}; waiting {max(wait, LIMIT.gap.get(host, GAP)):.0f} s (attempt {attempt + 1})")
                nap(wait)
                continue
            if e.code == 429:
                raise RateLimited(last)
            raise FetchError(last, e.code)
        except (urllib.error.URLError, TimeoutError, ConnectionError, ssl.SSLError) as e:
            last, last_code = f"{type(e).__name__}: {getattr(e, 'reason', e)}", None
            events.append({"url": url, "error": last, "at": time.strftime("%Y-%m-%dT%H:%M:%S")})
            if attempt < len(BACKOFF):
                nap(BACKOFF[attempt])
                continue
    if last_code == 429:
        raise RateLimited(last)
    raise FetchError(last, last_code)


MAGIC = [(b"\xff\xd8\xff", "jpg"), (b"\x89PNG\r\n\x1a\n", "png"), (b"GIF8", "gif"), (b"II*\x00", "tif"), (b"MM\x00*", "tif")]


def sniff(data):
    for sig, ext in MAGIC:
        if data.startswith(sig):
            return ext
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "webp"
    return None


class Originals:
    """The on-disk cache of downloaded originals and every response's outcome (.cache/img-src/index.json)."""

    def __init__(self, args):
        self.args = args
        self.idx = load_json(os.path.join(CACHE, "index.json"), {}) or {}
        self.events = []
        self.fetched = 0
        self.no_network = None  # set when the run stops fetching: cached originals are still processed

    def cached(self, url):
        rec = self.idx.get(url)
        if rec and rec.get("file") and os.path.exists(os.path.join(CACHE, rec["file"])):
            with open(os.path.join(CACHE, rec["file"]), "rb") as f:
                return f.read()
        # a download whose index entry was lost (the run was killed before it saved): the file name is sha1(url)
        base = hashlib.sha1(url.encode("utf-8")).hexdigest()
        for ext in ("jpg", "png", "gif", "tif", "webp"):
            path = os.path.join(CACHE, f"{base}.{ext}")
            if os.path.exists(path):
                with open(path, "rb") as f:
                    data = f.read()
                if sniff(data) == ext:
                    self.idx[url] = {"file": f"{base}.{ext}", "bytes": len(data), "type": None, "at": time.strftime("%Y-%m-%d"), "recovered": True}
                    return data
        return None

    def get(self, urls):
        """→ (bytes, url it came from). Raises RateLimited or FetchError(reason)."""
        for url in urls:
            data = self.cached(url)
            if data is not None:
                return data, url
        if self.no_network:
            raise Deferred(self.no_network)
        if self.args.offline and not any(self.idx.get(u, {}).get("error") and self.idx[u].get("code") != 429 for u in urls):
            raise Deferred("not cached (offline)")
        errors = []
        for url in urls:
            rec = self.idx.get(url)
            if rec and rec.get("error") and not self.args.retry_failed and rec.get("code") != 429:
                errors.append(f"{rec['error']} (earlier run, {rec.get('at')}; --retry-failed to try again)")
                continue
            if self.args.offline:
                errors.append("not cached (offline)")
                continue
            try:
                data, ctype = fetch(url, self.events)
            except RateLimited as e:
                self.idx[url] = {"error": str(e), "code": 429, "at": time.strftime("%Y-%m-%d")}
                raise
            except FetchError as e:
                self.idx[url] = {"error": str(e), "code": e.code, "at": time.strftime("%Y-%m-%d")}
                errors.append(str(e) + f" ({'thumbnail' if '/thumb/' in url else 'original'})")
                continue
            self.fetched += 1
            ext = sniff(data)
            if not ext:
                self.idx[url] = {"error": f"not an image ({ctype or 'no content type'})", "at": time.strftime("%Y-%m-%d")}
                errors.append(f"not an image ({ctype or 'no content type'})")
                continue
            name = hashlib.sha1(url.encode("utf-8")).hexdigest() + "." + ext
            with open(os.path.join(CACHE, name), "wb") as f:
                f.write(data)
            self.idx[url] = {"file": name, "bytes": len(data), "type": ctype, "at": time.strftime("%Y-%m-%d")}
            self.save()
            return data, url
        raise FetchError("; ".join(errors) or "no URL to fetch")

    def save(self):
        save_json(os.path.join(CACHE, "index.json"), self.idx)
        if self.events:
            with open(os.path.join(CACHE, "requests.log"), "a", encoding="utf-8") as f:
                for ev in self.events:
                    f.write(json.dumps(ev, ensure_ascii=False) + "\n")
            self.events = []


# ---------------------------------------------------------------- renditions
def open_photo(data):
    im = Image.open(io.BytesIO(data))
    try:
        im.seek(0)  # the first frame of an animation or a multi-page TIFF
    except EOFError:
        pass
    icc = im.info.get("icc_profile")
    im = ImageOps.exif_transpose(im)
    if icc and ImageCms is not None and im.mode in ("RGB", "RGBA", "CMYK", "L"):
        try:
            src = ImageCms.ImageCmsProfile(io.BytesIO(icc))
            dst = ImageCms.createProfile("sRGB")
            im = ImageCms.profileToProfile(im, src, dst, outputMode="RGBA" if im.mode == "RGBA" else "RGB")
        except Exception:  # noqa: BLE001 - a broken profile: fall back to the pixel values as they are
            pass
    if im.mode in ("P", "PA", "LA", "La", "RGBa"):
        im = im.convert("RGBA")
    if im.mode == "RGBA":
        base = Image.new("RGB", im.size, (255, 255, 255))
        base.paste(im, mask=im.getchannel("A"))
        im = base
    elif im.mode.startswith("I;16") or im.mode == "I":
        im = im.point(lambda v: v / 256).convert("L").convert("RGB")
    elif im.mode != "RGB":
        im = im.convert("RGB")
    return im


def fit(im, box_w, box_h):
    s = min(box_w / im.size[0], box_h / im.size[1], 1.0)
    size = (max(1, round(im.size[0] * s)), max(1, round(im.size[1] * s)))
    if size == im.size:
        out = im.copy()
    else:
        out = im.resize(size, Image.Resampling.LANCZOS, reducing_gap=3.0)
    out.info = {}
    return out


def write_webp(im, path, q):
    buf = io.BytesIO()
    im.save(buf, "WEBP", quality=q, method=6, exif=b"")
    data = buf.getvalue()
    try:
        with open(path, "rb") as f:
            if f.read() == data:
                return
    except OSError:
        pass
    with open(path, "wb") as f:
        f.write(data)


def rel(path):
    return os.path.relpath(path, SITE).replace(os.sep, "/")


def render(kind, rid, data):
    im = open_photo(data)
    d = os.path.join(IMG, kind)
    os.makedirs(d, exist_ok=True)
    sm = fit(im, SM_W, SM_MAX_H)
    p_sm = os.path.join(d, f"{rid}.webp")
    write_webp(sm, p_sm, SM_Q)
    out = {"file": rel(p_sm), "w": sm.size[0], "h": sm.size[1]}
    p_lg = os.path.join(d, f"{rid}-lg.webp")
    lg_size = fit_size(im.size, *LG_BOX)
    if lg_size[0] >= sm.size[0] * LG_MIN_GAIN:
        lg = fit(im, *LG_BOX)
        write_webp(lg, p_lg, LG_Q)
        out["lg"] = {"file": rel(p_lg), "w": lg.size[0], "h": lg.size[1]}
    else:
        drop(p_lg)
    return out, im.size


def fit_size(size, bw, bh):
    s = min(bw / size[0], bh / size[1], 1.0)
    return (max(1, round(size[0] * s)), max(1, round(size[1] * s)))


def drop(path):
    try:
        os.remove(path)
    except OSError:
        pass


def files_of(e):
    return [e["file"]] + [e["lg"]["file"]] if "lg" in e else [e["file"]]


def meta(rec):
    """The manifest's metadata for a media record (always re-read, so a credit fix needs no download)."""
    out = {"credit": rec["credit"], "license": rec["license"], "media": rec["id"]}
    for f in ("alt", "creator", "license_url", "page_url"):
        if isinstance(rec.get(f), str) and rec[f].strip():
            out[f] = rec[f].strip()
    return out


# ---------------------------------------------------------------- data → jobs
def rank(kind, rec):
    """Fetch order: regions, areas, signature places, historic places and stays, timeline, other places, stays."""
    if kind == "r":
        return 0
    if kind == "a":
        return 1
    if kind == "p" and rec.get("signature"):
        return 2
    if kind in ("p", "s") and rec.get("heritage"):
        return 3
    return {"t": 4, "p": 5, "s": 6}.get(kind, 7)


def plan_jobs():
    """→ (jobs [{ key, kind, id, rec, alts }], skipped { reason: [media ids] })."""
    media = media_list(load_json(os.path.join(DATA, "media.json"), []))
    ids = {}
    for sk, (_, fname) in SUBJECTS.items():
        recs = load_json(os.path.join(DATA, fname), []) or []
        ids[sk] = {r["id"]: r for r in recs if isinstance(r, dict) and r.get("id")}
    by_id = {m["id"]: m for m in media if isinstance(m, dict) and m.get("id")}
    skipped = {}

    def skip(reason, m):
        skipped.setdefault(reason, []).append(m.get("id", "?"))

    groups = {}
    for m in media:
        sk = m.get("subject_kind")
        if sk not in SUBJECTS:
            skip(f"no image kind for subject_kind {sk!r} in the engine", m)
            continue
        if m.get("subject") not in ids[sk]:
            skip(f"subject not in data/{SUBJECTS[sk][1]}", m)
            continue
        if m.get("license") not in LICENSES:
            skip(f"license {m.get('license')!r} not accepted", m)
            continue
        if not (isinstance(m.get("credit"), str) and m["credit"].strip()):
            skip("no credit line", m)
            continue
        if not m.get("file_url", "").startswith("https://"):
            skip("file_url is not https", m)
            continue
        key = f"{SUBJECTS[sk][0]}/{m['subject']}"
        groups.setdefault(key, []).append(m)
    jobs = []
    for key, cands in groups.items():
        kind, rid = key.split("/", 1)
        if kind == "t":  # the timeline entry's own media order first (history.mjs captions with that record)
            order = {mid: i for i, mid in enumerate(ids["timeline"][rid].get("media") or [])}
            cands = sorted(cands, key=lambda m: order.get(m["id"], len(order)))
        if key in PRIMARY and PRIMARY[key] in by_id:
            cands = [by_id[PRIMARY[key]]] + [m for m in cands if m["id"] != PRIMARY[key]]
        subject = ids[{v[0]: k for k, v in SUBJECTS.items()}[kind]][rid]
        jobs.append({"key": key, "kind": kind, "id": rid, "rec": cands[0], "alts": [m["id"] for m in cands[1:]],
                     "rank": rank(kind, subject)})
    # the most visible images first, so a run cut short by rate limiting has done what matters most
    jobs.sort(key=lambda j: (j["rank"], KINDS.index(j["kind"]), j["id"]))
    return jobs, skipped


# ---------------------------------------------------------------- main
def prefetch(path, args):
    recs = media_list(load_json(path if os.path.isabs(path) else os.path.join(ROOT, path)))
    orig = Originals(args)
    got = had = 0
    failed = {}
    for i, m in enumerate(recs, 1):
        urls = fetch_plan(m)
        if any(orig.cached(u) is not None for u in urls):
            had += 1
            continue
        try:
            orig.get(urls)
            got += 1
        except Stopped as e:
            log(f"  stopped ({e}) at {m.get('id')}")
            break
        except RateLimited as e:
            failed[m.get("id")] = str(e)
            log(f"  rate limited at {m.get('id')}: stopping (run again later)")
            break
        except FetchError as e:
            failed[m.get("id")] = str(e)
        if i % 10 == 0:
            orig.save()
            log(f"  {i}/{len(recs)} · {got} downloaded · {had} already cached · {len(failed)} failed")
    orig.save()
    log(f"prefetch {path}: {len(recs)} media · {got} downloaded · {had} already cached · {len(failed)} failed")
    for k, v in failed.items():
        log(f"  {k}: {v}")
    return 0


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--force", action="store_true", help="re-process every image (cached originals are reused)")
    ap.add_argument("--retry-failed", action="store_true", help="retry downloads that failed on an earlier run")
    ap.add_argument("--offline", action="store_true", help="no network; use .cache/img-src only")
    ap.add_argument("--only", help="comma-separated manifest keys to (re)process, e.g. p/tampa-theatre,a/ybor-city")
    ap.add_argument("--prefetch", metavar="MEDIA_JSON", help="only download the originals another media list names")
    ap.add_argument("--max-minutes", type=float, help="stop downloading after this long, then finish with what is cached")
    args = ap.parse_args()
    os.makedirs(CACHE, exist_ok=True)
    signal.signal(signal.SIGTERM, on_signal)
    signal.signal(signal.SIGINT, on_signal)
    if args.max_minutes:
        STOP["deadline"] = time.monotonic() + args.max_minutes * 60
    if args.prefetch:
        return prefetch(args.prefetch, args)

    jobs, skipped = plan_jobs()
    manifest = load_json(MANIFEST, {}) or {}
    state = load_json(os.path.join(CACHE, "state.json"), {}) or {}
    only = {k.strip() for k in args.only.split(",") if k.strip()} if args.only else None
    if only:
        unknown = only - {j["key"] for j in jobs}
        if unknown:
            log(f"--only: no media for {', '.join(sorted(unknown))}")

    def up_to_date(j):
        e = manifest.get(j["key"])
        if not e or e.get("media") != j["rec"]["id"]:
            return False
        if not all(os.path.exists(os.path.join(SITE, f)) for f in files_of(e)):
            return False
        s = state.get(j["key"])
        if s is None:  # a fresh clone: the committed renditions stand for this media record
            state[j["key"]] = {"src": None, "file_url": j["rec"]["file_url"], "media": j["rec"]["id"], "pipeline": PIPELINE}
            return True
        return s.get("media") == j["rec"]["id"] and s.get("pipeline") == PIPELINE and s.get("file_url") == j["rec"]["file_url"]

    todo = [j for j in jobs if (only is None or j["key"] in only) and (args.force or only is not None or not up_to_date(j))]
    log(f"{len(jobs)} subjects with an image in data/media.json; {len(todo)} to fetch or process"
        + ("" if only else f" ({len(jobs) - len(todo)} up to date)"))
    orig = Originals(args)
    results, failures, deferred = {}, {}, {}
    rate_limited_run = 0
    t0 = time.monotonic()
    queue, requeued, n = list(todo), set(), 0
    while n < len(queue):
        j = queue[n]
        n += 1
        urls = fetch_plan(j["rec"])
        try:
            data, src = orig.get(urls)
            rate_limited_run = 0
            deferred.pop(j["key"], None)
        except Deferred as e:
            deferred[j["key"]] = str(e)
            continue
        except Stopped as e:
            orig.no_network = f"not downloaded: the run stopped fetching ({e}); the next run tries again"
            log(f"  stopping downloads ({e}); processing what is cached")
            deferred[j["key"]] = orig.no_network
            continue
        except RateLimited as e:
            deferred[j["key"]] = f"{e} (rate limited; the next run retries it)"
            if j["key"] not in requeued:  # one more try at the end of this run's queue
                requeued.add(j["key"])
                queue.append(j)
            rate_limited_run += 1
            if rate_limited_run >= STOP_AFTER_RATE_LIMITED:
                if STOP["deadline"] is not None:  # a time budget was given: pause, then keep going until it runs out
                    log(f"  {rate_limited_run} images in a row refused for rate limiting: pausing downloads for {PAUSE // 60} min")
                    rate_limited_run = 0
                    try:
                        nap(PAUSE)
                    except Stopped as s_:
                        orig.no_network = f"not downloaded: the run stopped fetching ({s_}); the next run tries again"
                else:
                    log(f"  {rate_limited_run} images in a row refused for rate limiting: stopping downloads for this run")
                    orig.no_network = "not downloaded: the run stopped after repeated rate limiting; the next run tries again"
            continue
        except FetchError as e:
            failures[j["key"]] = str(e)
            continue
        try:
            entry, size = render(j["kind"], j["id"], data)
        except Exception as e:  # noqa: BLE001 - one broken image never stops the run
            failures[j["key"]] = f"could not process: {type(e).__name__}: {e}"
            continue
        entry.update(meta(j["rec"]))
        results[j["key"]] = entry
        state[j["key"]] = {"src": src, "file_url": j["rec"]["file_url"], "media": j["rec"]["id"], "pipeline": PIPELINE,
                           "source_px": list(size)}
        if n % 10 == 0 or n == len(queue):
            orig.save()
            log(f"  {n}/{len(queue)} · {len(results)} ok · {len(failures)} failed · {len(deferred)} deferred · "
                f"{orig.fetched} downloaded · {time.monotonic() - t0:.0f} s")
    orig.save()

    # merge: new renditions; up-to-date entries with refreshed metadata; a failed subject keeps a still-valid entry
    new = {}
    kept_after_failure = []
    for j in jobs:
        key = j["key"]
        if key in results:
            new[key] = results[key]
            continue
        e = manifest.get(key)
        if e and all(os.path.exists(os.path.join(SITE, f)) for f in files_of(e)):
            if e.get("media") == j["rec"]["id"]:
                new[key] = {**{k: e[k] for k in ("file", "w", "h", "lg") if k in e}, **meta(j["rec"])}
                if key in failures or key in deferred:
                    kept_after_failure.append(key)
    for key in list(state):
        if key not in new:
            del state[key]

    # orphans: any file under site/img/<kind>/ the manifest no longer names
    keep = {f for e in new.values() for f in files_of(e)}
    removed = []
    for kind in KINDS:
        d = os.path.join(IMG, kind)
        if not os.path.isdir(d):
            continue
        for f in sorted(os.listdir(d)):
            if f"img/{kind}/{f}" not in keep:
                os.remove(os.path.join(d, f))
                removed.append(f"img/{kind}/{f}")
        if not os.listdir(d):
            os.rmdir(d)

    changed = save_json(MANIFEST, new)
    save_json(os.path.join(CACHE, "state.json"), state)
    counts, total = {}, 0
    for kind in KINDS:
        d = os.path.join(IMG, kind)
        files = sorted(os.listdir(d)) if os.path.isdir(d) else []
        size = sum(os.path.getsize(os.path.join(d, f)) for f in files)
        total += size
        counts[kind] = {"entries": sum(1 for k in new if k.startswith(kind + "/")), "wanted": sum(1 for j in jobs if j["kind"] == kind),
                        "files": len(files), "bytes": size, "large": sum(1 for k, e in new.items() if k.startswith(kind + "/") and "lg" in e)}
    by_license = {}
    for e in new.values():
        by_license[e["license"]] = by_license.get(e["license"], 0) + 1
    extra = {j["key"]: j["alts"] for j in jobs if j["alts"]}
    save_json(os.path.join(CACHE, "report.json"), {
        "counts": counts, "bytes": total, "licenses": by_license, "failed": failures, "deferred": deferred,
        "kept_after_failure": kept_after_failure, "skipped_media": skipped, "not_primary": extra, "removed": removed})

    names = {"p": "places", "s": "stays", "a": "areas", "t": "timeline", "x": "experiences", "r": "regions"}
    log("")
    for kind, c in counts.items():
        if c["wanted"] or c["files"]:
            log(f"  {names[kind]:<11} {c['entries']:>4} of {c['wanted']:<4} {c['files']:>4} files ({c['large']} large)  {c['bytes'] / 1048576:6.2f} MB")
    log(f"  total site/img/{{{','.join(KINDS)}}}: {total / 1048576:.2f} MB · manifest {'updated' if changed else 'unchanged'} · "
        f"{len(removed)} orphan file(s) removed · {orig.fetched} download(s) this run")
    log("  licenses: " + ", ".join(f"{k} {v}" for k, v in sorted(by_license.items(), key=lambda kv: -kv[1])))
    if total > 60 * 1048576:
        log(f"  WARNING: site/img is over the 60 MB budget ({total / 1048576:.1f} MB)")
    if extra:
        log(f"  {sum(len(v) for v in extra.values())} more media record(s) for {len(extra)} subject(s) are not shown (one image per subject)")
    for reason, mids in sorted(skipped.items()):
        log(f"  skipped {len(mids)} media record(s): {reason}")
    if failures:
        log(f"\n{len(failures)} image(s) failed (pages show the typographic plate; --retry-failed tries again):")
        for k, e in sorted(failures.items()):
            log(f"  {k}: {e}{' (previous image kept)' if k in kept_after_failure else ''}")
    if deferred:
        log(f"\n{len(deferred)} image(s) deferred: not downloaded this run (run the script again; it resumes):")
        for k, e in sorted(deferred.items()):
            log(f"  {k}: {e}{' (previous image kept)' if k in kept_after_failure else ''}")
    return 1 if failures or deferred else 0


if __name__ == "__main__":
    sys.exit(main())
