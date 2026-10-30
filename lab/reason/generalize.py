"""KIỂM TRA "ĐIỂM ĐẶC BIỆT CHỈ ĐỂ TRANG TRÍ".

Một sự kiện dính O, H, I, G, N trông "đặc biệt", nhưng nhiều khi vẫn đúng khi thay điểm đó bằng một điểm bất kỳ
(vd "Q đối xứng A qua đường thẳng Euler, P = CA ∩ OH ⇒ C, O, P, Q đồng viên" đúng với MỌI đường thẳng qua O).
Cách kiểm: thả điểm đặc biệt thành điểm tự do (ngẫu nhiên trên mỗi tam giác mẫu) rồi kiểm lại bằng số; riêng các
điểm trên đường thẳng Euler còn thử "H, N, G nằm trên một đường bất kỳ qua O". Đúng cả khi đã thả ⇒ sự kiện thực chất
là sự kiện tổng quát hơn, độ "đặc biệt" là giả.
"""

from __future__ import annotations

import copy
import math
import random

from ..core import geom as G
from ..core.model import ancestors, evaluate, kinds

SPECIAL = {"O": "O", "H": "H", "I": "I", "G": "G", "N": "N"}
EULER = ("H", "N", "G")


def holds(rtype, ids, v, eps):
    """Quan hệ rtype giữa các đối tượng ids có đúng (bằng số) trên bộ giá trị v không."""
    P = [v.get(i) for i in ids]
    if any(x is None or isinstance(x, dict) for x in P):
        return False
    try:
        if rtype == "collinear":
            return all(G.dist_point_line(x, G.line_through(P[0], P[1])) < eps for x in P[2:])
        if rtype == "concyclic":
            c = G.circle_through(P[0], P[1], P[2])
            return c is not None and all(abs(G.dist(x, c.c) - c.r) < eps for x in P[3:])
        if rtype in ("on_circle", "on_line"):
            return all(G.dist_to_object(P[0], x) < eps for x in P[1:])
        if rtype == "parallel":
            return abs(G.cross(G.unit(P[0].d), G.unit(P[1].d))) < eps
        if rtype == "perpendicular":
            return abs(G.dot(G.unit(P[0].d), G.unit(P[1].d))) < eps
        if rtype == "tangent":
            a, b = P
            if a.kind == "line" or b.kind == "line":
                ln, c = (a, b) if a.kind == "line" else (b, a)
                return abs(G.dist_point_line(c.c, ln) - c.r) < eps
            d = G.dist(a.c, b.c)
            return min(abs(d - a.r - b.r), abs(d - abs(a.r - b.r))) < eps
        if rtype == "coincide":
            return all(G.dist(P[0], x) < eps for x in P[1:])
        if rtype == "concurrent":
            for X in G.intersect(P[0], P[1]) or []:
                if all(G.dist_to_object(o, X) < eps for o in P[2:]):
                    return True
            return False
        if rtype == "same_line":
            return abs(G.cross(G.unit(P[0].d), G.unit(P[1].d))) < eps and G.dist_point_line(P[1].p, P[0]) < eps
        if rtype == "same_circle":
            return G.dist(P[0].c, P[1].c) < eps and abs(P[0].r - P[1].r) < eps
    except (AttributeError, TypeError, ZeroDivisionError):
        return False
    return False


def _free(doc, ids):
    d = copy.deepcopy(doc)
    for s in d["steps"]:
        if s["id"] in ids:
            s["type"], s["args"], s["params"] = "free_point", [], {"x": 0.0, "y": 0.0}
    return d


def decorative(doc, rtype, ids, samples, seed=1):
    """Mô tả (tiếng Việt) nếu sự kiện vẫn đúng khi bỏ tính đặc biệt của một điểm; None nếu điểm đặc biệt là cần."""
    have = {s["id"] for s in doc["steps"]}
    specials = [x for x in SPECIAL if x in have]
    if not specials:
        return None
    rnd = random.Random(seed)
    base_vals = [evaluate(doc, o) for o in samples]
    if not all(holds(rtype, ids, v, 1e-6 * _scale(v)) for v in base_vals):
        return None  # sự kiện không đúng trên bộ mẫu này: không kết luận

    def test(free_ids, place):
        d = _free(doc, free_ids)
        for o, v0 in zip(samples, base_vals):
            ov = dict(o)
            ov.update(place(v0))
            v = evaluate(d, ov)
            if not holds(rtype, ids, v, 1e-6 * _scale(v)):
                return False
        return True

    def rand_pt(v0):
        A, B, C = (v0[x] for x in "ABC")
        cx, cy = (A.x + B.x + C.x) / 3, (A.y + B.y + C.y) / 3
        r = _scale(v0) * (0.2 + 0.5 * rnd.random())
        a = 2 * math.pi * rnd.random()
        return {"x": cx + r * math.cos(a), "y": cy + r * math.sin(a)}

    for x in specials:
        # điểm "con" của chính nó (vd N dựng từ H) cũng phải dựng lại từ điểm mới: chỉ thả đúng điểm này
        if test([x], lambda v0, x=x: {x: rand_pt(v0)}):
            return f"vẫn đúng khi thay {x} bằng một điểm bất kỳ"
    eul = [x for x in EULER if x in have]
    # sự kiện chỉ nói về chính O, H, N, G (vd đường thẳng Euler) thì phép thử này vô nghĩa
    kinds_ = kinds(doc)
    pts = {x for x in ancestors(doc, ids) if kinds_.get(x) == "point"} - set("ABC")
    if "O" in have and eul and not pts <= {"O", *EULER}:
        def on_line_through_O(v0):
            Y = rand_pt(v0)
            O = v0["O"]
            out = {eul[0]: Y}
            for x in eul[1:]:
                t = rnd.uniform(-1.5, 2.5)
                out[x] = {"x": O.x + t * (Y["x"] - O.x), "y": O.y + t * (Y["y"] - O.y)}
            return out

        if test(eul, on_line_through_O):
            return "đường thẳng Euler chỉ để trang trí: vẫn đúng với mọi đường thẳng qua O"
    return None


def _scale(v):
    pts = [v[x] for x in "ABC" if v.get(x) is not None]
    if len(pts) < 3:
        return 8.0
    return max(G.dist(pts[0], pts[1]), G.dist(pts[1], pts[2]), G.dist(pts[2], pts[0]), 1e-9)
