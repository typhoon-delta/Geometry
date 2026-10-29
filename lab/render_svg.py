"""Hình tĩnh SVG theo phong cách "Đơn sắc" của công cụ (kiểu Sketchpad cổ điển): nét đen mảnh 1px, điểm là
vòng tròn nhỏ ruột trắng, nhãn chữ serif nghiêng có chỉ số dưới (I_A, S'_a), đặt sát điểm theo hướng tránh
các đường đi qua điểm (cùng thuật toán với src/core/labels.js). Đường phụ minh hoạ quan hệ vẽ nét đứt xám.
"""

from __future__ import annotations

import html
import math

from .core import geom as G
from .core.model import evaluate, kinds
from .present import parse_label

FONT = "'Times New Roman','Nimbus Roman','Liberation Serif','TeX Gyre Termes',Times,serif"
N_DIR = 16


def auto_label_dirs(doc, vals):
    k = kinds(doc)
    shown = [s for s in doc["steps"] if not s.get("hidden") and vals.get(s["id"]) is not None]
    pts = [s for s in shown if k.get(s["id"]) == "point"]
    curves = [s for s in shown if k.get(s["id"]) in ("line", "circle")]
    if not pts:
        return {}
    P0 = [vals[s["id"]] for s in pts]
    cx = sum(p.x for p in P0) / len(P0)
    cy = sum(p.y for p in P0) / len(P0)
    scale = max(max(p.x for p in P0) - min(p.x for p in P0), max(p.y for p in P0) - min(p.y for p in P0), 1e-9)
    near = 0.12 * scale
    out = {}
    for s in pts:
        P = vals[s["id"]]
        blocked = []
        for c in curves:
            v = vals[c["id"]]
            if G.dist_to_object(v, P) > 1e-6 * scale:
                continue
            if v.kind == "line":
                a = math.atan2(v.d.y, v.d.x)
                t = G.line_param(P, v)
                sub = "segment" if c["type"] == "segment" else "ray" if c["type"] == "ray" else v.sub
                fwd = sub == "line" or (True if sub == "ray" else t < 1 - 1e-9)
                back = sub == "line" or t > 1e-9
                if fwd:
                    blocked.append((a, 1))
                if back:
                    blocked.append((a + math.pi, 1))
            else:
                a = math.atan2(P.y - v.c.y, P.x - v.c.x)
                blocked += [(a + math.pi / 2, 1), (a - math.pi / 2, 1), (a + math.pi, 0.4)]
        for o in pts:
            if o is s:
                continue
            Q = vals[o["id"]]
            d = G.dist(P, Q)
            if 1e-9 < d < near:
                blocked.append((math.atan2(Q.y - P.y, Q.x - P.x), 0.8))
        away = math.atan2(P.y - cy, P.x - cx)
        has_away = math.hypot(P.x - cx, P.y - cy) > 0.02 * scale
        best, best_score = math.pi / 4, -math.inf
        for i in range(N_DIR):
            th = 2 * math.pi * i / N_DIR
            gap = math.pi
            for a, w in blocked:
                gap = min(gap, _ang_diff(th, a) / w)
            sc = min(gap, math.pi / 2) * 2
            if has_away:
                sc += 0.5 * math.cos(_ang_diff(th, away))
            sc += 0.05 * math.cos(_ang_diff(th, math.pi / 4))
            if sc > best_score:
                best_score, best = sc, th
        out[s["id"]] = (math.cos(best), math.sin(best))
    return out


def _ang_diff(a, b):
    d = abs(a - b) % (2 * math.pi)
    return 2 * math.pi - d if d > math.pi else d


def _clip_line(p, d, box, sub):
    """Đoạn hiển thị của đường thẳng/tia/đoạn trong khung box = (x1, y1, x2, y2)."""
    x1, y1, x2, y2 = box
    ts = []
    if sub == "segment":
        return (p.x, p.y), (p.x + d.x, p.y + d.y)
    for t in _box_params(p, d, box):
        ts.append(t)
    if len(ts) < 2:
        return None
    lo, hi = min(ts), max(ts)
    if sub == "ray":
        lo = max(lo, 0.0)
        if hi <= lo:
            return None
    return (p.x + lo * d.x, p.y + lo * d.y), (p.x + hi * d.x, p.y + hi * d.y)


def _box_params(p, d, box):
    x1, y1, x2, y2 = box
    out = []
    for (px, dx, lo, hi, py, dy, lo2, hi2) in ((p.x, d.x, x1, x2, p.y, d.y, y1, y2), (p.y, d.y, y1, y2, p.x, d.x, x1, x2)):
        if abs(dx) < 1e-15:
            continue
        for b in (lo, hi):
            t = (b - px) / dx
            o = py + t * dy
            if lo2 - 1e-9 <= o <= hi2 + 1e-9:
                out.append(t)
    return out


def render_svg(doc, width=520, height=390, highlight=()):
    vals = evaluate(doc)
    k = kinds(doc)
    shown = [s for s in doc["steps"] if not s.get("hidden") and vals.get(s["id"]) is not None]
    pts = [vals[s["id"]] for s in shown if k.get(s["id"]) == "point"]
    if not pts:
        return "<svg></svg>"
    xs = [p.x for p in pts]
    ys = [p.y for p in pts]
    # khung: bao các điểm, nới cho đường tròn nhỏ
    for s in shown:
        v = vals[s["id"]]
        if k.get(s["id"]) == "circle" and v.r < 3 * max(max(xs) - min(xs), max(ys) - min(ys), 1):
            xs += [v.c.x - v.r, v.c.x + v.r]
            ys += [v.c.y - v.r, v.c.y + v.r]
    x1, x2, y1, y2 = min(xs), max(xs), min(ys), max(ys)
    span = max(x2 - x1, (y2 - y1) * width / height, 1e-6)
    pad = 0.08 * span
    sc = (width - 2 * 24) / (span + 2 * pad)
    cx, cy = (x1 + x2) / 2, (y1 + y2) / 2
    X = lambda x: width / 2 + (x - cx) * sc  # noqa: E731
    Y = lambda y: height / 2 - (y - cy) * sc  # noqa: E731
    box = (cx - width / 2 / sc, cy - height / 2 / sc, cx + width / 2 / sc, cy + height / 2 / sc)
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" class="hinh" role="img">',
           f'<rect width="{width}" height="{height}" fill="#fff"/>']
    hl = set(highlight)
    layers = {"circle": [], "line": [], "point": []}
    for s in shown:
        kd = k.get(s["id"])
        if kd not in layers:
            continue
        st = s.get("style") or {}
        color = st.get("color", "#000")
        dash = ' stroke-dasharray="5 4"' if st.get("dash") else ""
        wdt = 1.6 if s["id"] in hl else 1
        v = vals[s["id"]]
        if kd == "circle":
            layers["circle"].append(f'<circle cx="{X(v.c.x):.2f}" cy="{Y(v.c.y):.2f}" r="{v.r * sc:.2f}" fill="none" stroke="{color}" stroke-width="{wdt}"{dash}/>')
        elif kd == "line":
            sub = "segment" if s["type"] == "segment" else "ray" if s["type"] == "ray" else "line"
            seg = _clip_line(v.p, v.d, box, sub)
            if seg:
                (a, b), (c, d) = seg
                layers["line"].append(f'<line x1="{X(a):.2f}" y1="{Y(b):.2f}" x2="{X(c):.2f}" y2="{Y(d):.2f}" stroke="{color}" stroke-width="{wdt}"{dash}/>')
    dirs = auto_label_dirs(doc, vals)
    for s in shown:
        if k.get(s["id"]) != "point":
            continue
        v = vals[s["id"]]
        px, py = X(v.x), Y(v.y)
        fill = "#000" if s["id"] in hl else "#fff"
        layers["point"].append(f'<circle cx="{px:.2f}" cy="{py:.2f}" r="2.8" fill="{fill}" stroke="#000" stroke-width="1"/>')
        name = s.get("name")
        if name:
            dx, dy = dirs.get(s["id"], (0.7, 0.7))
            lx, ly = px + dx * 11, py - dy * 11
            b, sub, pr = parse_label(name)
            txt = html.escape(b) + "′" * pr
            if sub:
                txt += f'<tspan font-size="10" dy="3">{html.escape(sub)}</tspan>'
            layers["point"].append(f'<text x="{lx:.1f}" y="{ly + 5:.1f}" text-anchor="middle" font-family="{FONT}" font-style="italic" font-size="15" fill="#000">{txt}</text>')
    out += layers["circle"] + layers["line"] + layers["point"]
    out.append("</svg>")
    return "".join(out)
