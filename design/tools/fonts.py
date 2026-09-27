#!/usr/bin/env python3
"""design/tools/fonts.py · Tampa Bay Chartbook · design system "Chart & Label"

Downloads the three SIL OFL families from the Google Fonts CSS API (latin + latin-ext woff2),
narrows their variable axes to the ranges the design uses (fontTools instancer), writes
design/fonts/<family>-<roman|italic>-<subset>.woff2, and prints the metric-matched fallback
@font-face values (size-adjust, ascent/descent/line-gap overrides) for tokens.css.

Only needed to regenerate the fonts. The build never runs it. Needs: pip install fonttools brotli.
    python3 design/tools/fonts.py            # download (cached in design/.cache/fonts-src), instance, write, print
    python3 design/tools/fonts.py --metrics  # only print the fallback metrics from design/fonts/

Why the axes are narrowed:
  Bodoni Moda  opsz 11..28  Browsers pick opsz = font size ("font-optical-sizing: auto"). Above 28px the
                            hairlines go to 1px and break up on screens, below 11 they are not needed.
                            Clamping the axis in the file keeps every heading sturdy with no CSS at all.
               wght 500..900
  Archivo      wdth 100..125, wght 500..800  (labels are expanded caps; 100 is kept for pin numerals)
  Figtree      wght 300..900 (roman), 300..800 (italic)  (unchanged: the files are already small)
"""
import os, re, sys, subprocess, urllib.request
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.normpath(os.path.join(HERE, "..", "fonts"))
CACHE = os.path.normpath(os.path.join(HERE, "..", ".cache", "fonts-src"))   # gitignored (.cache/)
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
CSS = ("https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400..900;1,6..96,400..900"
       "&family=Figtree:ital,wght@0,300..900;1,300..900&family=Archivo:wdth,wght@62..125,100..900&display=swap")
LIMITS = {
    "bodoni-moda": {"opsz": (11, 28), "wght": (500, 900)},
    "archivo": {"wdth": (100, 125), "wght": (500, 800)},
    "figtree": {},
}
SUBSETS = ("latin", "latin-ext")


def fetch(url, dest=None):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    data = urllib.request.urlopen(req, timeout=60).read()
    if dest:
        with open(dest, "wb") as f:
            f.write(data)
    return data


def download():
    os.makedirs(CACHE, exist_ok=True)
    os.makedirs(OUT, exist_ok=True)
    css = fetch(CSS).decode()
    faces = []
    for sub, body in re.findall(r"/\* ([\w-]+) \*/\s*@font-face \{(.*?)\}", css, re.S):
        if sub not in SUBSETS:
            continue
        fam = re.search(r"font-family: '([^']+)'", body).group(1)
        style = re.search(r"font-style: (\w+)", body).group(1)
        url = re.search(r"url\(([^)]+)\)", body).group(1)
        rng = re.search(r"unicode-range: ([^;]+);", body).group(1)
        slug = fam.lower().replace(" ", "-")
        name = f"{slug}-{'italic' if style == 'italic' else 'roman'}-{sub}.woff2"
        src = os.path.join(CACHE, name)
        if not os.path.exists(src):
            fetch(url, src)
        faces.append((slug, fam, style, sub, name, rng))
    return faces


def narrow(faces):
    for slug, fam, style, sub, name, rng in faces:
        src = os.path.join(CACHE, name)
        f = TTFont(src)
        lim = dict(LIMITS.get(slug, {}))
        if slug == "figtree" and style == "italic":
            lim = {"wght": (300, 800)}
        if lim and "fvar" in f:
            axes = {a.axisTag: (a.minValue, a.maxValue) for a in f["fvar"].axes}
            lim = {k: v for k, v in lim.items() if k in axes}
            f = instancer.instantiateVariableFont(f, lim, updateFontNames=False)
        f.flavor = "woff2"
        dest = os.path.join(OUT, name)
        f.save(dest)
        axes = {a.axisTag: (a.minValue, a.maxValue) for a in f["fvar"].axes} if "fvar" in f else {}
        print(f"  {name:44s} {os.path.getsize(src)//1024:4d} KB -> {os.path.getsize(dest)//1024:4d} KB  {axes}")
        print(f"      unicode-range: {rng}")


# English letter frequencies (the capsize / next-font method): the average advance of running text
FREQ = {"a": 8.2, "b": 1.5, "c": 2.8, "d": 4.3, "e": 12.7, "f": 2.2, "g": 2.0, "h": 6.1, "i": 7.0, "j": 0.15,
        "k": 0.77, "l": 4.0, "m": 2.4, "n": 6.7, "o": 7.5, "p": 1.9, "q": 0.095, "r": 6.0, "s": 6.3, "t": 9.1,
        "u": 2.8, "v": 0.98, "w": 2.4, "x": 0.15, "y": 2.0, "z": 0.074, " ": 18.0}


def avg_width(font, loc=None):
    if loc and "fvar" in font:
        font = instancer.instantiateVariableFont(font, loc, updateFontNames=False)
    cmap, hmtx, upm = font.getBestCmap(), font["hmtx"], font["head"].unitsPerEm
    tot = sum(FREQ.values())
    return sum(hmtx[cmap[ord(c)]][0] * w for c, w in FREQ.items()) / tot / upm, font


def metrics():
    lib = "/usr/share/fonts/truetype/liberation/"   # Liberation = metric twins of Arial and Times New Roman
    faces = [   # (family, file, instance the text is mostly set at, fallback file it is matched against)
        ("Figtree", "figtree-roman-latin.woff2", {"wght": 400}, lib + "LiberationSans-Regular.ttf"),
        ("Bodoni Moda", "bodoni-moda-roman-latin.woff2", {"wght": 700, "opsz": 28}, lib + "LiberationSerif-Bold.ttf"),
        ("Archivo", "archivo-roman-latin.woff2", {"wght": 680, "wdth": 108}, lib + "LiberationSans-Bold.ttf"),
    ]
    for fam, file, loc, fb in faces:
        path = os.path.join(OUT, file)
        if not os.path.exists(path) or not os.path.exists(fb):
            print(f"  skip {fam}: {path} or {fb} missing")
            continue
        main_w, inst = avg_width(TTFont(path), loc)
        fb_w, _ = avg_width(TTFont(fb))
        hhea, upm = inst["hhea"], inst["head"].unitsPerEm
        os2 = inst["OS/2"]
        use_typo = bool(os2.fsSelection & (1 << 7))
        asc, desc, gap = (os2.sTypoAscender, os2.sTypoDescender, os2.sTypoLineGap) if use_typo else (hhea.ascent, hhea.descent, hhea.lineGap)
        sa = main_w / fb_w
        print(f'  "{fam} Fallback" (vs {os.path.basename(fb)}, at {loc}): size-adjust: {sa*100:.2f}%; '
              f'ascent-override: {asc/upm/sa*100:.2f}%; descent-override: {abs(desc)/upm/sa*100:.2f}%; '
              f'line-gap-override: {gap/upm/sa*100:.2f}%;')


if __name__ == "__main__":
    if "--metrics" not in sys.argv:
        print("downloading and narrowing:")
        narrow(download())
    print("fallback metrics:")
    metrics()
