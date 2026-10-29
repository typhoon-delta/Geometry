"""Cấu hình gốc của vòng khám phá và các cấu hình mẫu (tam giác ngẫu nhiên "tổng quát").

Cấu hình gốc: tam giác ABC với O, H, I, G, N; chân đường cao D, E, F; trung điểm M_a, M_b, M_c;
tiếp điểm nội tiếp T_a, T_b, T_c; điểm chính giữa cung S_a, S_b, S_c (cung không chứa đỉnh) và
S'_a, S'_b, S'_c (cung chứa đỉnh); đường tròn ngoại tiếp ω, nội tiếp γ, Euler ε; ba cạnh.
"""

from __future__ import annotations

import math
import random

from ..core import geom as G

BASE_TRIANGLE = {"A": (-0.6, 3.4), "B": (-3.4, -1.6), "C": (3.6, -1.6)}


def build_base_doc(arc_contains=True) -> dict:
    steps = []

    def add(sid, typ, args, name=None, params=None, **extra):
        s = {"id": sid, "type": typ, "args": list(args)}
        if params:
            s["params"] = params
        if name:
            s["name"] = name
        s.update(extra)
        steps.append(s)
        return sid

    A = add("A", "free_point", [], "A", {"x": BASE_TRIANGLE["A"][0], "y": BASE_TRIANGLE["A"][1]})
    B = add("B", "free_point", [], "B", {"x": BASE_TRIANGLE["B"][0], "y": BASE_TRIANGLE["B"][1]})
    C = add("C", "free_point", [], "C", {"x": BASE_TRIANGLE["C"][0], "y": BASE_TRIANGLE["C"][1]})
    add("BC", "segment", [B, C], "a")
    add("CA", "segment", [C, A], "b")
    add("AB", "segment", [A, B], "c")
    add("w", "circumcircle", [A, B, C], "ω")
    add("O", "circumcenter", [A, B, C], "O")
    add("H", "orthocenter", [A, B, C], "H")
    add("I", "incenter", [A, B, C], "I")
    add("G", "centroid", [A, B, C], "G")
    add("N", "nine_point_center", [A, B, C], "N")
    add("g", "incircle", [A, B, C], "γ")
    add("e", "nine_point_circle", [A, B, C], "ε")
    add("D", "altitude_foot", [A, B, C], "D")
    add("E", "altitude_foot", [B, C, A], "E")
    add("F", "altitude_foot", [C, A, B], "F")
    add("Ma", "midpoint", [B, C], "M_a")
    add("Mb", "midpoint", [C, A], "M_b")
    add("Mc", "midpoint", [A, B], "M_c")
    add("Ta", "incircle_touch", [A, B, C], "T_a")
    add("Tb", "incircle_touch", [B, C, A], "T_b")
    add("Tc", "incircle_touch", [C, A, B], "T_c")
    add("Sa", "arc_midpoint", [A, B, C], "S_a", {"contains": False})
    add("Sb", "arc_midpoint", [B, C, A], "S_b", {"contains": False})
    add("Sc", "arc_midpoint", [C, A, B], "S_c", {"contains": False})
    if arc_contains:
        add("Ra", "arc_midpoint", [A, B, C], "S'_a", {"contains": True})
        add("Rb", "arc_midpoint", [B, C, A], "S'_b", {"contains": True})
        add("Rc", "arc_midpoint", [C, A, B], "S'_c", {"contains": True})
    return {"format": "hinh-hoc-dong", "version": 1, "title": "Cấu hình gốc", "steps": steps}


def _angles(P, Q, R):
    a, b, c = G.dist(Q, R), G.dist(R, P), G.dist(P, Q)

    def ang(x, y, z):
        return math.degrees(math.acos(max(-1.0, min(1.0, (y * y + z * z - x * x) / (2 * y * z)))))

    return ang(a, b, c), ang(b, c, a), ang(c, a, b), (a, b, c)


def good_triangle(P, Q, R, min_angle=18, min_side_gap=0.04, right_gap=5):
    """Tam giác "tổng quát": không dẹt, không gần cân, không gần vuông (tránh trùng hợp ngẫu nhiên)."""
    if G.cross(G.sub(Q, P), G.sub(R, P)) <= 0:  # giữ cùng chiều với tam giác gốc (ngược chiều kim đồng hồ)
        return False
    A, B, C, sides = _angles(P, Q, R)
    if min(A, B, C) < min_angle:
        return False
    if any(abs(x - 90) < right_gap for x in (A, B, C)):
        return False
    if any(abs(x - 60) < 2 for x in (A, B, C)):
        return False
    s = sorted(sides)
    return s[1] - s[0] > min_side_gap * s[2] and s[2] - s[1] > min_side_gap * s[2]


def make_samples(k: int, seed: int, perturb=0.28) -> list:
    """Danh sách overrides cho A, B, C: phần tử 0 = cấu hình gốc, sau đó k-1 tam giác ngẫu nhiên tổng quát."""
    rnd = random.Random(seed)
    base = {n: G.pt(*xy) for n, xy in BASE_TRIANGLE.items()}
    scale = max(G.dist(base["A"], base["B"]), G.dist(base["B"], base["C"]), G.dist(base["C"], base["A"]))
    out = [{n: {"x": p.x, "y": p.y} for n, p in base.items()}]
    while len(out) < k:
        cand = {}
        for n, p in base.items():
            r = perturb * scale * math.sqrt(rnd.random())
            a = 2 * math.pi * rnd.random()
            cand[n] = G.pt(p.x + r * math.cos(a), p.y + r * math.sin(a))
        if good_triangle(cand["A"], cand["B"], cand["C"]):
            out.append({n: {"x": p.x, "y": p.y} for n, p in cand.items()})
    return out


def make_fp_samples(samples) -> list:
    """6 mẫu vân tay: tam giác của mẫu 1 với các đỉnh đổi tên theo 6 hoán vị (xem Universe)."""
    import itertools

    ref = samples[1] if len(samples) > 1 else samples[0]
    out = []
    for perm in itertools.permutations("ABC"):
        out.append({n: dict(ref[m]) for n, m in zip("ABC", perm)})
    return out
