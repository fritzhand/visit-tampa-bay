#!/usr/bin/env python3
"""design/tools/outline.py · Tampa Bay Chartbook · design system "Chart & Label"

Outlines the wordmark from the self-hosted fonts in design/fonts/ (HarfBuzz shaping, so kerning and
ligatures match the browser) and writes the brand files that carry lettering:
  design/brand/wordmark.svg      "TAMPA BAY" spaced caps over "Chartbook" (currentColor)
  design/brand/wordmark-line.svg one-line lockup for the top bar: "Chartbook" + "TAMPA BAY" (currentColor)
  design/brand/parts.json        the same paths + viewBoxes, for the engine's inline sprite (#wm, #wm-line)
Only needed to regenerate those files. Needs: pip install fonttools brotli uharfbuzz.
    python3 design/tools/outline.py
"""
import io, json, os
import uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

HERE = os.path.dirname(os.path.abspath(__file__))
FONTS = os.path.normpath(os.path.join(HERE, "..", "fonts"))
BRAND = os.path.normpath(os.path.join(HERE, "..", "brand"))

DISPLAY = ("bodoni-moda-roman-latin.woff2", {"opsz": 28, "wght": 860})
LABEL = ("archivo-roman-latin.woff2", {"wdth": 125, "wght": 720})


def run(file, loc, text, size, tracking=0.0, features=None):
    """Shape `text` and return (path d, advance width, ascender-ish metrics) at `size` px, baseline y=0."""
    path = os.path.join(FONTS, file)
    raw = TTFont(path)
    raw.flavor = None                      # HarfBuzz reads sfnt, not WOFF2
    bio = io.BytesIO()
    raw.save(bio)
    face = hb.Face(hb.Blob(bio.getvalue()))
    font = hb.Font(face)
    font.set_variations(loc)
    buf = hb.Buffer()
    buf.add_str(text)
    buf.guess_segment_properties()
    hb.shape(font, buf, features or {"kern": True, "liga": True})
    tt = instancer.instantiateVariableFont(TTFont(path), loc, updateFontNames=False)
    gs = tt.getGlyphSet()
    order = tt.getGlyphOrder()
    upm = tt["head"].unitsPerEm
    k = size / upm
    x = 0.0
    d = []
    for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
        name = order[info.codepoint]
        pen = SVGPathPen(gs, ntos=lambda v: f"{v:.1f}".rstrip("0").rstrip("."))
        gs[name].draw(TransformPen(pen, (k, 0, 0, -k, x + pos.x_offset * k, -pos.y_offset * k)))
        s = pen.getCommands()
        if s:
            d.append(s)
        x += pos.x_advance * k + tracking * size
    x -= tracking * size   # no tracking after the last letter
    os2 = tt["OS/2"]
    return " ".join(d), x, {"cap": os2.sCapHeight * k, "x": os2.sxHeight * k, "asc": tt["hhea"].ascent * k, "desc": -tt["hhea"].descent * k}


def f1(v):
    return f"{v:.1f}".rstrip("0").rstrip(".")


def main():
    os.makedirs(BRAND, exist_ok=True)
    # --- stacked wordmark: spaced caps between two rules, over the display word ---
    word, ww, wm = run(*DISPLAY, "Chartbook", 100)
    caps, cw, cm = run(*LABEL, "TAMPA BAY", 19, tracking=0.5)
    pad = 2
    top = 0
    cap_base = cm["cap"] + top            # caps line: baseline at cap height
    gap = 25
    word_base = cap_base + gap + wm["cap"] + 3
    width = ww + pad * 2
    cx = width / 2
    caps_x = cx - cw / 2
    # the rules either side of TAMPA BAY: a hairline over a heavier line (the label's double rule)
    rule_y = cap_base - cm["cap"] / 2
    left_end, right_start = caps_x - 22, caps_x + cw + 22
    rules = (f"M{f1(pad + 2)} {f1(rule_y - 2.6)}H{f1(left_end)}v1.2H{f1(pad + 2)}z"
             f"M{f1(pad + 2)} {f1(rule_y + 0.6)}H{f1(left_end)}v2.6H{f1(pad + 2)}z"
             f"M{f1(right_start)} {f1(rule_y - 2.6)}H{f1(width - pad - 2)}v1.2H{f1(right_start)}z"
             f"M{f1(right_start)} {f1(rule_y + 0.6)}H{f1(width - pad - 2)}v2.6H{f1(right_start)}z")
    # small lozenges (the label's jewel) at the inner rule ends
    def lozenge(x, y, r=5.2):
        return f"M{f1(x)} {f1(y - r)}L{f1(x + r)} {f1(y)}L{f1(x)} {f1(y + r)}L{f1(x - r)} {f1(y)}z"
    jewels = lozenge(left_end + 9, rule_y) + lozenge(right_start - 9, rule_y)
    height = word_base + wm["desc"] * 0.25 + 2
    vb = f"0 {f1(-2)} {f1(width)} {f1(height + 4)}"
    caps_t = f'<g transform="translate({f1(caps_x)} {f1(cap_base)})">'
    word_t = f'<g transform="translate({f1(pad)} {f1(word_base)})">'
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" role="img" aria-label="Tampa Bay Chartbook">'
           f'<title>Tampa Bay Chartbook</title>'
           f'<g style="fill:var(--wordmark-accent, currentColor)">{caps_t}<path d="{caps}"/></g>'
           f'<path d="{rules}{jewels}"/></g>'
           f'<g style="fill:currentColor">{word_t}<path d="{word}"/></g></g></svg>\n')
    open(os.path.join(BRAND, "wordmark.svg"), "w").write(svg)

    # --- one-line lockup for the top bar (32px tall mark beside it): Chartbook, TAMPA BAY small caps after ---
    lword, lww, lwm = run(*DISPLAY, "Chartbook", 100)
    lcaps, lcw, lcm = run(*LABEL, "TAMPA BAY", 38, tracking=0.3)
    gap2 = 22
    lwidth = lww + gap2 + lcw + 4
    lheight = lwm["cap"] + 4
    lvb = f"0 {f1(-lwm['cap'] - 2)} {f1(lwidth)} {f1(lwm['cap'] + lwm['desc'] * 0.3 + 4)}"
    # caps sit on the same baseline, top-aligned by cap height would float; baseline alignment reads as one line
    lsvg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{lvb}" role="img" aria-label="Tampa Bay Chartbook">'
            f'<title>Tampa Bay Chartbook</title>'
            f'<path style="fill:currentColor" d="{lword}"/>'
            f'<g style="fill:var(--wordmark-accent, currentColor)" transform="translate({f1(lww + gap2)} 0)"><path d="{lcaps}"/></g></svg>\n')
    open(os.path.join(BRAND, "wordmark-line.svg"), "w").write(lsvg)

    parts = {
        "_": "Generated by design/tools/outline.py from design/fonts (Bodoni Moda opsz 28 wght 860; Archivo wdth 125 wght 720). "
             "Fill with currentColor; the TAMPA BAY group reads var(--wordmark-accent, currentColor).",
        "wordmark": {"viewBox": vb, "caps": {"transform": f"translate({f1(caps_x)} {f1(cap_base)})", "d": caps},
                     "rules": rules + jewels, "word": {"transform": f"translate({f1(pad)} {f1(word_base)})", "d": word}},
        "line": {"viewBox": lvb, "word": lword, "caps": {"transform": f"translate({f1(lww + gap2)} 0)", "d": lcaps}},
        "word": {"viewBox": f"0 {f1(-lwm['cap'] - 2)} {f1(lww + 1)} {f1(lwm['cap'] + lwm['desc'] * 0.3 + 4)}", "d": lword},
    }
    # --- the six chart codes, outlined for the standalone badge files (Archivo expanded, 13px on a 26px badge) ---
    codes = {}
    for code in ("TP", "SP", "GB", "CW", "AB", "DT"):
        d, w, m = run("archivo-roman-latin.woff2", {"wdth": 125, "wght": 760}, code, 13, tracking=0.06)
        codes[code] = {"d": d, "w": round(w, 2), "cap": round(m["cap"], 2)}
    parts["codes"] = codes
    json.dump(parts, open(os.path.join(BRAND, "parts.json"), "w"), indent=1)
    print("wrote wordmark.svg", vb, "| wordmark-line.svg", lvb)


if __name__ == "__main__":
    main()
