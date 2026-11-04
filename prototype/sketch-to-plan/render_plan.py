"""Draw a GardenLayout as a technical garden plan (SVG).

Usage:
    python render_plan.py layout.json plan.svg
"""

import json
import math
import sys
from datetime import date
from html import escape

from layout import GardenLayout

SHEET_W, SHEET_H = 1400, 990
MARGIN = 30
PANEL_W = 380                      # right-hand panel: schedule + title block
DRAW_X0, DRAW_Y0 = MARGIN + 70, MARGIN + 70
DRAW_W = SHEET_W - PANEL_W - DRAW_X0 - 60
DRAW_H = SHEET_H - DRAW_Y0 - MARGIN - 90

INK = "#1d2420"
FONT = "Helvetica, Arial, sans-serif"

# Fill and pattern per feature kind. Kept soft so the linework reads first.
STYLE = {
    "lawn": ("url(#lawn)", INK),
    "bed": ("#efe4d2", INK),
    "raised_bed": ("#e8d8bd", INK),
    "path": ("url(#gravel)", INK),
    "patio": ("url(#paving)", INK),
    "decking": ("url(#decking)", INK),
    "pond": ("#d6e6ee", INK),
    "shed": ("url(#hatch)", INK),
    "greenhouse": ("#eef3f1", INK),
    "fence": ("none", INK),
    "hedge": ("#cfdcc6", INK),
    "wall": ("#9a9a92", INK),
    "water_butt": ("#d6e6ee", INK),
    "compost": ("#d9cbb4", INK),
    "seating": ("#ffffff", INK),
    "house": ("url(#hatch)", INK),
    "other": ("#f4f4f1", INK),
}

DEFS = """
<defs>
  <pattern id="lawn" width="14" height="14" patternUnits="userSpaceOnUse">
    <rect width="14" height="14" fill="#e3eedb"/>
    <path d="M3 9 l1.5 -3 l1.5 3 M9 4 l1.5 -3 l1.5 3" stroke="#8fae7f" stroke-width="0.7" fill="none"/>
  </pattern>
  <pattern id="gravel" width="10" height="10" patternUnits="userSpaceOnUse">
    <rect width="10" height="10" fill="#f1ede4"/>
    <circle cx="2" cy="3" r="0.8" fill="#a59d8c"/><circle cx="7" cy="7" r="0.7" fill="#a59d8c"/>
    <circle cx="6" cy="2" r="0.5" fill="#a59d8c"/>
  </pattern>
  <pattern id="paving" width="24" height="24" patternUnits="userSpaceOnUse">
    <rect width="24" height="24" fill="#ecebe6"/>
    <path d="M0 0 H24 V24 M12 0 V12 M0 12 H24" stroke="#b5b2a8" stroke-width="0.8" fill="none"/>
  </pattern>
  <pattern id="decking" width="8" height="8" patternUnits="userSpaceOnUse">
    <rect width="8" height="8" fill="#eadfcf"/>
    <path d="M0 0 H8" stroke="#b49c7c" stroke-width="0.8"/>
  </pattern>
  <pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
    <rect width="8" height="8" fill="#ffffff"/>
    <path d="M0 0 V8" stroke="#6d726c" stroke-width="0.8"/>
  </pattern>
</defs>
"""


def render(layout: GardenLayout, drawn_by: str = "Garden app") -> str:
    scale = min(DRAW_W / layout.width_m, DRAW_H / layout.depth_m)   # px per metre
    gw, gh = layout.width_m * scale, layout.depth_m * scale
    x0 = DRAW_X0 + (DRAW_W - gw) / 2                                  # centre the garden on the sheet

    def X(m): return x0 + m * scale
    def Y(m): return DRAW_Y0 + m * scale

    out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {SHEET_W} {SHEET_H}" '
           f'width="{SHEET_W}" height="{SHEET_H}" font-family="{FONT}">', DEFS]
    out.append(f'<rect width="{SHEET_W}" height="{SHEET_H}" fill="#ffffff"/>')
    out.append(f'<rect x="{MARGIN/2}" y="{MARGIN/2}" width="{SHEET_W-MARGIN}" height="{SHEET_H-MARGIN}" '
               f'fill="none" stroke="{INK}" stroke-width="1.6"/>')

    # 1 m grid
    for i in range(int(layout.width_m) + 1):
        out.append(f'<line x1="{X(i)}" y1="{Y(0)}" x2="{X(i)}" y2="{Y(layout.depth_m)}" stroke="#e6e9e6" stroke-width="0.6"/>')
    for j in range(int(layout.depth_m) + 1):
        out.append(f'<line x1="{X(0)}" y1="{Y(j)}" x2="{X(layout.width_m)}" y2="{Y(j)}" stroke="#e6e9e6" stroke-width="0.6"/>')

    # Features, ground surfaces first so structures sit on top
    order = ["lawn", "path", "patio", "decking", "bed", "raised_bed", "pond", "hedge"]
    feats = sorted(layout.features, key=lambda f: order.index(f.kind) if f.kind in order else len(order))
    for f in feats:
        fill, stroke = STYLE.get(f.kind, STYLE["other"])
        width = 2.2 if f.kind in ("fence", "wall") else 1.1
        dash = ' stroke-dasharray="6 3"' if f.kind == "fence" else ""
        if f.shape == "circle":
            out.append(f'<circle cx="{X(f.center.x)}" cy="{Y(f.center.y)}" r="{f.radius_m*scale}" '
                       f'fill="{fill}" stroke="{stroke}" stroke-width="{width}"{dash}/>')
        else:
            pts = " ".join(f"{X(p.x):.1f},{Y(p.y):.1f}" for p in f.points)
            tag = "polyline" if f.kind in ("fence", "wall") else "polygon"
            fill_attr = "none" if tag == "polyline" else fill
            out.append(f'<{tag} points="{pts}" fill="{fill_attr}" stroke="{stroke}" stroke-width="{width}"{dash}/>')

    # Plant symbols: spread circle, centre cross, key number
    key = {p.id: n for n, p in enumerate(layout.plants, start=1)}
    for p in layout.plants:
        r = max(p.spread_m / 2 * scale, 6)
        cx, cy = X(p.x), Y(p.y)
        out.append(f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="#b9d3a8" fill-opacity="0.55" stroke="#4e6b45" stroke-width="0.9"/>')
        out.append(f'<path d="M{cx-3} {cy} H{cx+3} M{cx} {cy-3} V{cy+3}" stroke="#4e6b45" stroke-width="0.8"/>')
        out.append(f'<circle cx="{cx + r*0.7}" cy="{cy - r*0.7}" r="8" fill="#ffffff" stroke="{INK}" stroke-width="0.8"/>')
        out.append(f'<text x="{cx + r*0.7}" y="{cy - r*0.7 + 3.5}" font-size="9.5" text-anchor="middle" fill="{INK}">{key[p.id]}</text>')

    # Feature labels (after plants so they stay readable)
    for f in feats:
        if f.kind in ("fence", "wall"):
            continue
        label = escape(f.label.upper())
        common = f'x="{X(f.center.x)}" y="{Y(f.center.y)}" font-size="11" text-anchor="middle" letter-spacing="0.6"'
        out.append(f'<text {common} fill="none" stroke="#ffffff" stroke-width="3.5" stroke-linejoin="round">{label}</text>')
        out.append(f'<text {common} fill="{INK}">{label}</text>')

    # Garden boundary
    out.append(f'<rect x="{X(0)}" y="{Y(0)}" width="{gw}" height="{gh}" fill="none" stroke="{INK}" stroke-width="2.4"/>')

    # Overall dimensions
    out += dim_line(X(0), Y(0) - 30, X(layout.width_m), Y(0) - 30, f"{layout.width_m:.2f} m", horizontal=True)
    out += dim_line(X(0) - 34, Y(0), X(0) - 34, Y(layout.depth_m), f"{layout.depth_m:.2f} m", horizontal=False)

    # North arrow and scale bar under the drawing
    out += north_arrow(X(layout.width_m) - 20, Y(layout.depth_m) + 50, layout.north_deg)
    out += scale_bar(X(0), Y(layout.depth_m) + 50, scale)

    out += side_panel(layout, key, scale, drawn_by)
    out.append("</svg>")
    return "\n".join(out)


def dim_line(x1, y1, x2, y2, text, horizontal):
    t = 6
    o = [f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{INK}" stroke-width="0.8"/>']
    if horizontal:
        o += [f'<path d="M{x1-t} {y1+t} L{x1+t} {y1-t} M{x2-t} {y2+t} L{x2+t} {y2-t}" stroke="{INK}" stroke-width="1"/>',
              f'<line x1="{x1}" y1="{y1-8}" x2="{x1}" y2="{y1+24}" stroke="{INK}" stroke-width="0.5"/>',
              f'<line x1="{x2}" y1="{y2-8}" x2="{x2}" y2="{y2+24}" stroke="{INK}" stroke-width="0.5"/>',
              f'<text x="{(x1+x2)/2}" y="{y1-6}" font-size="12" text-anchor="middle" fill="{INK}">{text}</text>']
    else:
        o += [f'<path d="M{x1-t} {y1+t} L{x1+t} {y1-t} M{x2-t} {y2+t} L{x2+t} {y2-t}" stroke="{INK}" stroke-width="1"/>',
              f'<line x1="{x1-8}" y1="{y1}" x2="{x1+28}" y2="{y1}" stroke="{INK}" stroke-width="0.5"/>',
              f'<line x1="{x2-8}" y1="{y2}" x2="{x2+28}" y2="{y2}" stroke="{INK}" stroke-width="0.5"/>',
              f'<text x="{x1-8}" y="{(y1+y2)/2}" font-size="12" text-anchor="middle" fill="{INK}" '
              f'transform="rotate(-90 {x1-8} {(y1+y2)/2})">{text}</text>']
    return o


def north_arrow(cx, cy, deg):
    return [f'<g transform="rotate({deg} {cx} {cy})">',
            f'<circle cx="{cx}" cy="{cy}" r="18" fill="none" stroke="{INK}" stroke-width="0.8"/>',
            f'<path d="M{cx} {cy-16} L{cx+7} {cy+10} L{cx} {cy+5} Z" fill="{INK}"/>',
            f'<path d="M{cx} {cy-16} L{cx-7} {cy+10} L{cx} {cy+5} Z" fill="#ffffff" stroke="{INK}" stroke-width="0.8"/>',
            f'<text x="{cx}" y="{cy-22}" font-size="12" font-weight="bold" text-anchor="middle" fill="{INK}">N</text>',
            '</g>']


def scale_bar(x, y, scale):
    o = []
    for i in range(5):
        fill = INK if i % 2 == 0 else "#ffffff"
        o.append(f'<rect x="{x + i*scale}" y="{y-5}" width="{scale}" height="7" fill="{fill}" stroke="{INK}" stroke-width="0.8"/>')
        o.append(f'<text x="{x + i*scale}" y="{y+16}" font-size="10" text-anchor="middle" fill="{INK}">{i}</text>')
    o.append(f'<text x="{x + 5*scale}" y="{y+16}" font-size="10" text-anchor="middle" fill="{INK}">5 m</text>')
    return o


def side_panel(layout, key, scale, drawn_by):
    px = SHEET_W - PANEL_W - MARGIN / 2
    o = [f'<line x1="{px}" y1="{MARGIN/2}" x2="{px}" y2="{SHEET_H - MARGIN/2}" stroke="{INK}" stroke-width="1.2"/>']
    x = px + 20
    y = MARGIN + 30
    o.append(f'<text x="{x}" y="{y}" font-size="13" font-weight="bold" letter-spacing="1.2" fill="{INK}">PLANT SCHEDULE</text>')
    y += 22
    for hx, h in ((x + 6, "NO."), (x + 34, "PLANT"), (x + 262, "QTY"), (x + 300, "SPREAD")):
        o.append(f'<text x="{hx}" y="{y}" font-size="9.5" fill="#5b625d" letter-spacing="0.8">{h}</text>')
    y += 8
    o.append(f'<line x1="{x}" y1="{y}" x2="{SHEET_W - MARGIN}" y2="{y}" stroke="{INK}" stroke-width="0.6"/>')
    for p in layout.plants:
        y += 30
        o.append(f'<text x="{x+6}" y="{y}" font-size="11" fill="{INK}">{key[p.id]}</text>')
        o.append(f'<text x="{x+34}" y="{y-5}" font-size="11.5" fill="{INK}">{escape(p.common_name)}</text>')
        o.append(f'<text x="{x+34}" y="{y+8}" font-size="10" font-style="italic" fill="#5b625d">{escape(p.latin_name)}</text>')
        o.append(f'<text x="{x+262}" y="{y}" font-size="11" fill="{INK}">{p.quantity}</text>')
        o.append(f'<text x="{x+300}" y="{y}" font-size="11" fill="{INK}">{p.spread_m:.1f} m</text>')

    if layout.assumptions:
        y += 44
        o.append(f'<text x="{x}" y="{y}" font-size="13" font-weight="bold" letter-spacing="1.2" fill="{INK}">NOTES</text>')
        for n, a in enumerate(layout.assumptions, start=1):
            for k, line in enumerate(wrap(f"{n}. {a}", 54)):
                y += 15
                o.append(f'<text x="{x}" y="{y}" font-size="10" fill="#3b423e">{escape(line)}</text>')

    # Title block
    tb_y = SHEET_H - MARGIN / 2 - 170
    o.append(f'<rect x="{px}" y="{tb_y}" width="{PANEL_W}" height="170" fill="#ffffff" stroke="{INK}" stroke-width="1.2"/>')
    o.append(f'<text x="{x}" y="{tb_y+34}" font-size="20" font-weight="bold" fill="{INK}">{escape(layout.title)}</text>')
    o.append(f'<text x="{x}" y="{tb_y+54}" font-size="11" fill="#5b625d" letter-spacing="1">PLANTING AND LAYOUT PLAN</text>')
    rows = [("GRID", "1 m squares"),
            ("DRAWN BY", drawn_by),
            ("DATE", date.today().strftime("%d %b %Y")),
            ("SIZE", f"{layout.width_m:.1f} x {layout.depth_m:.1f} m")]
    for i, (k, v) in enumerate(rows):
        cy = tb_y + 80 + i * 22
        o.append(f'<line x1="{px}" y1="{cy-15}" x2="{px+PANEL_W}" y2="{cy-15}" stroke="{INK}" stroke-width="0.5"/>')
        o.append(f'<text x="{x}" y="{cy}" font-size="9.5" letter-spacing="1" fill="#5b625d">{k}</text>')
        o.append(f'<text x="{x+110}" y="{cy}" font-size="11" fill="{INK}">{escape(v)}</text>')
    return o


def wrap(text, width):
    words, lines, cur = text.split(), [], ""
    for w in words:
        if len(cur) + len(w) + 1 > width:
            lines.append(cur)
            cur = w
        else:
            cur = f"{cur} {w}".strip()
    if cur:
        lines.append(cur)
    return lines


if __name__ == "__main__":
    layout = GardenLayout.model_validate(json.load(open(sys.argv[1])))
    open(sys.argv[2], "w").write(render(layout))
