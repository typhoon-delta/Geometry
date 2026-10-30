"""KIỂM TRA "ĐIỂM CHỈ ĐỂ TRANG TRÍ" (nới lỏng giả thiết).

Một sự kiện dính O, H, I, G, N trông "đặc biệt", nhưng nhiều khi vẫn đúng khi thay điểm đó bằng một điểm bất kỳ
(vd "Q đối xứng A qua đường thẳng Euler, P = CA ∩ OH ⇒ C, O, P, Q đồng viên" đúng với MỌI đường thẳng qua O).
Cách kiểm: thả điểm đặc biệt thành điểm tự do (ngẫu nhiên trên mỗi tam giác mẫu) rồi kiểm lại bằng số; riêng các
điểm trên đường thẳng Euler còn thử "H, N, G nằm trên một đường bất kỳ qua O". Đúng cả khi đã thả ⇒ sự kiện thực chất
là sự kiện tổng quát hơn, độ "đặc biệt" là giả.
Tương tự với mọi điểm dựng: thay bằng điểm bất kỳ, hoặc bằng điểm bất kỳ trên một đường/đường tròn chứa nó (vd "Q là
điểm xuyên tâm đối của A" mà mọi Q trên (O) đều đúng ⇒ "Q chỉ cần nằm trên (O)").
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
        if rtype == "midpoint":
            return G.dist(P[0], G.mid(P[1], P[2])) < eps
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


def decorative(doc, rtype, ids, samples, seed=1, max_points=8):
    """Sự kiện có còn đúng khi NỚI LỎNG một điểm không. Trả về None, hoặc dict mô tả:
        {"loai": "tu_do", "diem": X}            thay X bằng một điểm bất kỳ vẫn đúng
        {"loai": "tren", "diem": X, "duong": c} X chỉ cần nằm trên đường c (thay bằng điểm bất kỳ trên c vẫn đúng)
        {"loai": "euler"}                       H, N, G chỉ cần cùng nằm trên một đường qua O
    Thử các điểm đặc biệt O, H, I, G, N trước, rồi các điểm dựng gần nhất (tối đa max_points điểm)."""
    order = {s["id"]: i for i, s in enumerate(doc["steps"])}
    by = {s["id"]: s for s in doc["steps"]}
    kinds_ = kinds(doc)
    anc = ancestors(doc, ids)
    cand = [x for x in SPECIAL if x in anc]
    cand += sorted((x for x in anc if kinds_.get(x) == "point" and x not in SPECIAL and x not in ("A", "B", "C")
                    and by[x]["type"] not in ("free_point", "point_on")), key=lambda x: -order[x])[:max_points]
    if not cand:
        return None
    rnd = random.Random(seed)
    base_vals = [evaluate(doc, o) for o in samples]
    if not all(holds(rtype, ids, v, 1e-6 * _scale(v)) for v in base_vals):
        return None  # sự kiện không đúng trên bộ mẫu này: không kết luận
    v0 = base_vals[0]
    eps0 = 1e-6 * _scale(v0)

    def test(d, place):
        for o, vb in zip(samples, base_vals):  # dừng ngay ở mẫu đầu tiên sai (đa số dừng ở mẫu 1)
            ov = dict(o)
            ov.update(place(dict(vb, _mau=o)))
            v = evaluate(d, ov)
            if not holds(rtype, ids, v, 1e-6 * _scale(v)):
                return False
        return True

    def rand_pt(vb):
        T = [G.pt(vb["_mau"][x]["x"], vb["_mau"][x]["y"]) for x in "ABC"]  # tam giác của mẫu (hình con có thể thiếu B, C)
        cx, cy = sum(p.x for p in T) / 3, sum(p.y for p in T) / 3
        r = max(G.dist(T[0], T[1]), G.dist(T[1], T[2]), G.dist(T[2], T[0])) * (0.2 + 0.5 * rnd.random())
        a = 2 * math.pi * rnd.random()
        return {"x": cx + r * math.cos(a), "y": cy + r * math.sin(a)}

    fact_pts = [v0.get(i) for i in ids if kinds_.get(i) == "point"]
    for x in cand:
        if test(_free(doc, [x]), lambda vb, x=x: {x: rand_pt(vb)}):
            return {"loai": "tu_do", "diem": x}
        # x chỉ cần nằm trên một đường/đường tròn có sẵn (dựng trước x)?
        X = v0.get(x)
        if X is None:
            continue
        for h, st in by.items():
            if order[h] >= order[x] or kinds_.get(h) not in ("line", "circle") or v0.get(h) is None:
                continue
            if G.dist_to_object(v0[h], X) > eps0:
                continue
            # sự kiện chính là "x nằm trên h" (viết cách khác) thì nới lỏng vô nghĩa
            if fact_pts and all(p is not None and G.dist_to_object(v0[h], p) < eps0 for p in fact_pts) and \
                    rtype in ("concyclic", "collinear", "on_circle", "on_line"):
                continue
            d = copy.deepcopy(doc)
            for s in d["steps"]:
                if s["id"] == x:
                    s["type"], s["args"], s["params"] = "point_on", [h], {"t": 0.0}
            seg = by[h]["type"] == "segment"
            circ = kinds_.get(h) == "circle"

            def place(vb, x=x):
                t = rnd.uniform(0.1, 0.9) if seg else (rnd.uniform(0, 2 * math.pi) if circ else rnd.uniform(-1.5, 1.5))
                return {x: {"t": t}}

            if test(d, place):
                return {"loai": "tren", "diem": x, "duong": h}
    have = set(anc)
    eul = [x for x in EULER if x in have]
    # sự kiện chỉ nói về chính O, H, N, G (vd đường thẳng Euler) thì phép thử này vô nghĩa
    pts = {x for x in anc if kinds_.get(x) == "point"} - set("ABC")
    if "O" in have and eul and not pts <= {"O", *EULER}:
        def on_line_through_O(vb):
            Y = rand_pt(vb)
            O = vb["O"]
            out = {eul[0]: Y}
            for x in eul[1:]:
                t = rnd.uniform(-1.5, 2.5)
                out[x] = {"x": O.x + t * (Y["x"] - O.x), "y": O.y + t * (Y["y"] - O.y)}
            return out

        if test(_free(doc, eul), on_line_through_O):
            return {"loai": "euler"}
    return None


def generalized_doc(doc, ids, tq):
    """Hình của BẢN TỔNG QUÁT: điểm thừa thành "điểm tuỳ ý" (giữ đúng vị trí trên hình gốc) hoặc "điểm tuỳ ý trên c";
    các bước chỉ để dựng điểm đó bị bỏ. None nếu không áp dụng (vd trường hợp đường thẳng Euler)."""
    from ..core.model import sub_doc

    if not isinstance(tq, dict) or tq.get("loai") not in ("tu_do", "tren"):
        return None
    v = evaluate(doc)
    x = tq["diem"]
    X = v.get(x)
    if X is None:
        return None
    d = copy.deepcopy(doc)
    for st in d["steps"]:
        if st["id"] != x:
            continue
        if tq["loai"] == "tu_do":
            st["type"], st["args"], st["params"] = "free_point", [], {"x": round(X.x, 6), "y": round(X.y, 6)}
        else:
            h = v.get(tq["duong"])
            if h is None:
                return None
            if h.kind == "circle":
                t = math.atan2(X.y - h.c.y, X.x - h.c.x)
            else:
                t = G.dot(G.sub(X, h.p), h.d) / max(G.dot(h.d, h.d), 1e-18)
            st["type"], st["args"], st["params"] = "point_on", [tq["duong"]], {"t": t}
    return sub_doc(d, ids, title=doc.get("title", ""))


def describe(tq, name=lambda x: x, curve=lambda x: x):
    """Câu tiếng Việt cho kết quả của decorative() (name/curve: hàm đặt tên theo hình hiển thị)."""
    if not tq:
        return ""
    if isinstance(tq, str):
        return tq
    if tq["loai"] == "tu_do":
        return f"{name(tq['diem'])} chỉ để trang trí – thay bằng một điểm bất kỳ vẫn đúng"
    if tq["loai"] == "tren":
        return f"{name(tq['diem'])} chỉ cần nằm trên {curve(tq['duong'])} – thay bằng điểm bất kỳ trên đó vẫn đúng"
    return "đường thẳng Euler chỉ để trang trí – vẫn đúng với mọi đường thẳng qua O"


def _scale(v):
    pts = [v[x] for x in "ABC" if v.get(x) is not None]
    if len(pts) < 3:
        return 8.0
    return max(G.dist(pts[0], pts[1]), G.dist(pts[1], pts[2]), G.dist(pts[2], pts[0]), 1e-9)
