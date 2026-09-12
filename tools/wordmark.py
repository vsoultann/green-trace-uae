#!/usr/bin/env python3
"""
Outlines the Warif wordmarks so the logo files carry no font dependency.

The lockups are set in Reem Kufi 700. Inside the app that is a live webfont, but
a logo handed to a print shop, dropped into a slide deck or opened on a machine
without the font has to keep its shape, so this converts the three wordmark
strings to outlines once and writes the path data to JSON for tools/brand.mjs.

Arabic needs real shaping -- "وارف" is four letters that join into two forms --
so HarfBuzz does the layout and fontTools reads the glyph outlines it selects.

Usage (from the repo root, with the venv fontTools/uharfbuzz):
    python3 tools/wordmark.py <path-to-fontenv-python-is-implicit>
"""
import json
import os
import subprocess
import sys
import tempfile

from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.misc.transform import Transform
import uharfbuzz as hb

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONTS = os.path.join(ROOT, "app", "assets", "fonts")
OUT = os.path.join(ROOT, "tools", "wordmark-paths.json")

# Each wordmark: the string, which subset carries it, and its script/direction.
WORDMARKS = {
    "warif_latin": {"text": "Warif", "font": "reem-kufi-latin-wght-normal", "dir": "ltr", "script": "Latn", "lang": "en", "weight": 700},
    "warif_caps": {"text": "WARIF", "font": "reem-kufi-latin-wght-normal", "dir": "ltr", "script": "Latn", "lang": "en", "weight": 700, "tracking": 120},
    "warif_arabic": {"text": "وارف", "font": "reem-kufi-arabic-wght-normal", "dir": "rtl", "script": "Arab", "lang": "ar", "weight": 700},
}


def to_ttf(woff2_path):
    """woff2_decompress writes next to its input, so work on a copy in /tmp."""
    tmp = tempfile.mkdtemp()
    copy = os.path.join(tmp, os.path.basename(woff2_path))
    with open(woff2_path, "rb") as src, open(copy, "wb") as dst:
        dst.write(src.read())
    subprocess.run(["woff2_decompress", copy], check=True, capture_output=True)
    return copy[:-6] + ".ttf"


def build(name, spec):
    ttf_path = to_ttf(os.path.join(FONTS, spec["font"] + ".woff2"))

    # Pin the variable axis: a wordmark drawn at the font's default weight is
    # not the wordmark, it is a lighter accident.
    font = TTFont(ttf_path)
    if "fvar" in font:
        font = instantiateVariableFont(font, {"wght": spec["weight"]}, inplace=True)
    static_path = ttf_path[:-4] + "-static.ttf"
    font.save(static_path)

    with open(static_path, "rb") as fh:
        data = fh.read()
    face = hb.Face(data)
    hb_font = hb.Font(face)
    upem = face.upem
    hb_font.scale = (upem, upem)

    buf = hb.Buffer()
    buf.add_str(spec["text"])
    buf.direction = spec["dir"]
    buf.script = spec["script"]
    buf.language = spec["lang"]
    hb.shape(hb_font, buf)

    glyph_set = font.getGlyphSet()
    order = font.getGlyphOrder()
    tracking = spec.get("tracking", 0) * upem / 1000.0

    # HarfBuzz lays out RTL right-to-left already; we just walk its output and
    # accumulate the pen position, then normalise the whole run to start at x=0.
    pen_x = 0.0
    pieces = []
    for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
        glyph_name = order[info.codepoint]
        pen = SVGPathPen(glyph_set, ntos=lambda v: f"{v:.1f}")
        # Flip Y: font units run up, SVG runs down.
        tp = TransformPen(pen, Transform(1, 0, 0, -1, pen_x + pos.x_offset, -pos.y_offset))
        glyph_set[glyph_name].draw(tp)
        d = pen.getCommands()
        if d:
            pieces.append(d)
        pen_x += pos.x_advance + tracking
    if tracking:
        pen_x -= tracking

    head = font["head"]
    hhea = font["hhea"]
    return {
        "text": spec["text"],
        "path": " ".join(pieces),
        "advance": round(pen_x, 1),
        "upem": upem,
        "ascender": hhea.ascender,
        "descender": hhea.descender,
        "yMin": head.yMin,
        "yMax": head.yMax,
    }


def main():
    out = {name: build(name, spec) for name, spec in WORDMARKS.items()}
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(out, fh, ensure_ascii=False, indent=1)
    for name, v in out.items():
        print(f"  {name}: {len(v['path'])} path chars, advance {v['advance']}/{v['upem']}")
    print(f"wrote {os.path.relpath(OUT, ROOT)}")


if __name__ == "__main__":
    main()
