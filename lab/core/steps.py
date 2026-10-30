"""Danh mục các loại BƯỚC DỰNG – bản Python của src/core/steps.js.

Mỗi bước sinh đúng một đối tượng. Mỗi loại khai báo:
    kind    : 'point' | 'line' | 'circle' | 'mark' | 'same' (cùng loại với đối số đầu)
    args    : kiểu đối số ('point' | 'line' | 'circle' | 'curve' | 'obj' | 'pl' | '...point')
    params  : tham số mặc định (bậc tự do, lựa chọn nghiệm)
    compute : (giá trị đối số, params) -> giá trị hoặc None
    facts   : (step, kinds_of_args, doc) -> các sự kiện HIỂN NHIÊN từ cách dựng (để loại quan hệ tầm thường)
    label   : tên tiếng Việt
    tag     : nhãn đặc biệt (O, H, I, G, N, circumcircle, incircle, ninepoint, ...)

Sự kiện dùng đúng dạng của bản JS (dict): {'on': [P, ref]}, {'col': [...]}, {'cyc': [...]},
{'par': [r1, r2]}, {'perp': [r1, r2]}, {'tan': [r1, r2]}; tham chiếu ảo {'L': [X, Y]}, {'PB': [X, Y]},
{'AB': [A, B, C]}, {'C': [X, Y, Z]}, {'IC': [A, B, C]}.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Callable

from . import geom as G


@dataclass
class StepType:
    kind: str
    args: list
    compute: Callable
    label: str
    params: dict = field(default_factory=dict)
    facts: Callable | None = None
    tag: str | None = None
    sampler: bool = False  # bản 1.7: bước "dời thử" (điểm cố định, quỹ tích) – tính trong model.py
    min_args: int = 3  # bản 1.8: số đối số tối thiểu của bước có danh sách đối số thay đổi ("...point", "...obj")


def _tri(f):
    def run(a, p):
        A, B, C = a
        return f(A, B, C) if G.triangle_ok(A, B, C) else None

    return run


def _P(o):
    return {"x": o.x, "y": o.y} if o is not None else None


def _second(a, b, Q):
    r = G.intersect(a, b)
    if not r:
        return None
    if len(r) == 1:
        return r[0]
    return r[0] if G.dist(r[0], Q) >= G.dist(r[1], Q) else r[1]


def _pick(lst, i):
    try:
        i = int(i)
    except (TypeError, ValueError):
        return None
    return lst[i] if 0 <= i < len(lst) else None


def _center_facts(s, kinds, doc):
    c = None
    if doc is not None:
        c = next((x for x in doc["steps"] if x["id"] == s["args"][0]), None)
    if not c or c["type"] not in ("circle_3pts", "circumcircle"):
        return []
    A, B, C = c["args"]
    return [{"on": [s["id"], {"PB": [A, B]}]}, {"on": [s["id"], {"PB": [B, C]}]}, {"on": [s["id"], {"PB": [C, A]}]}]


def _rotate_by(a, p):
    X, O, A, B, C = a
    ang = G.directed_angle(A, B, C)
    return None if ang is None else G.map_object(X, lambda P: G.rotate_point(P, O, ang))


def _homothety_by(a, p):
    X, O, A, B, C, D = a
    cd = G.dist(C, D)
    if cd < G.EPS:
        return None
    k = (-1 if p.get("negative") else 1) * G.dist(A, B) / cd
    return G.map_object(X, lambda P: G.homothety_point(P, O, k))


def _angle_line(O, X, A, B, C, flip):
    """Đường qua O tạo với tia OX góc bằng ∠ABC (cùng hướng góc mẫu; flip: phía bên kia)."""
    a = G.directed_angle(A, B, C)
    if a is None or G.dist(O, X) < G.EPS:
        return None
    return G.line_through(O, G.rotate_point(X, O, -a if flip else a))


def _angle_point(a, p):
    m = _angle_line(a[0], a[1], a[2], a[3], a[4], p.get("flip"))
    return None if m is None else G.intersect_ll(m, a[5])


def _measure_angle(a, p):
    ang = G.directed_angle(a[0], a[1], a[2])
    return None if ang is None else {"kind": "measure", "m": "angle", "value": abs(ang), "at": {"x": a[1].x, "y": a[1].y}}


def _measure_ratio(a, p):
    cd = G.dist(a[2], a[3])
    if cd < G.EPS:
        return None
    return {"kind": "measure", "m": "ratio", "value": G.dist(a[0], a[1]) / cd, "at": {"x": (a[0].x + a[1].x) / 2, "y": (a[0].y + a[1].y) / 2}}


def _reflect_facts(s, kinds, doc=None):
    if kinds[0] != "point":
        return []
    if kinds[1] == "point":
        return [{"col": [s["args"][0], s["args"][1], s["id"]]}]
    return [{"perp": [{"L": [s["args"][0], s["id"]]}, s["args"][1]]}]


def _excircle(a, p):
    A, B, C = a
    if not G.triangle_ok(A, B, C):
        return None
    J = G.excenter(A, B, C)
    return G.circle(J, G.dist_point_line(J, G.line_through(B, C))) if J is not None else None


def _cevian(a, p):
    P, A, B, C = a
    if G.dist(A, P) < G.EPS or G.dist(B, C) < G.EPS:
        return None
    return G.intersect_ll(G.line_through(A, P), G.line_through(B, C))


def _tan3(s, kinds=None, doc=None):
    A, B, C = s["args"]
    return [{"tan": [s["id"], {"L": [B, C]}]}, {"tan": [s["id"], {"L": [C, A]}]}, {"tan": [s["id"], {"L": [A, B]}]}]


PT3 = ["point", "point", "point"]

STEP_TYPES: dict[str, StepType] = {
    # ---------- ĐIỂM ----------
    "free_point": StepType("point", [], lambda a, p: G.pt(p["x"], p["y"]), "Điểm tự do", {"x": 0, "y": 0}),
    "point_on": StepType(
        "point", ["curve"], lambda a, p: G.point_on(a[0], p["t"]), "Điểm trên đối tượng", {"t": 0},
        lambda s, k=None, d=None: [{"on": [s["id"], s["args"][0]]}],
    ),
    "intersection": StepType(
        "point", ["curve", "curve"], lambda a, p: _pick(G.intersect(a[0], a[1]), p["which"]), "Giao điểm", {"which": 0},
        lambda s, k=None, d=None: [{"on": [s["id"], s["args"][0]]}, {"on": [s["id"], s["args"][1]]}],
    ),
    "intersection_other": StepType(
        "point", ["curve", "curve", "point"], lambda a, p: _second(*a), "Giao điểm thứ hai", {},
        lambda s, k=None, d=None: [{"on": [s["id"], s["args"][0]]}, {"on": [s["id"], s["args"][1]]}],
    ),
    "midpoint": StepType(
        "point", ["point", "point"], lambda a, p: G.mid(a[0], a[1]), "Trung điểm", {},
        lambda s, k=None, d=None: [{"col": [s["args"][0], s["id"], s["args"][1]]}, {"on": [s["id"], {"PB": list(s["args"])}]}],
    ),
    "projection": StepType(
        "point", ["point", "line"], lambda a, p: G.project(a[0], a[1]), "Hình chiếu", {},
        lambda s, k=None, d=None: [{"on": [s["id"], s["args"][1]]}, {"perp": [{"L": [s["args"][0], s["id"]]}, s["args"][1]]}],
    ),
    "reflect": StepType("same", ["obj", "pl"], lambda a, p: G.reflect_object(a[0], a[1]), "Đối xứng", {}, _reflect_facts),
    "circumcenter": StepType(
        "point", PT3, _tri(G.circumcenter), "Tâm ngoại tiếp", {},
        lambda s, k=None, d=None: [
            {"on": [s["id"], {"PB": [s["args"][0], s["args"][1]]}]},
            {"on": [s["id"], {"PB": [s["args"][1], s["args"][2]]}]},
            {"on": [s["id"], {"PB": [s["args"][2], s["args"][0]]}]},
        ],
        "O",
    ),
    "orthocenter": StepType(
        "point", PT3, _tri(G.orthocenter), "Trực tâm", {},
        lambda s, k=None, d=None: [
            {"perp": [{"L": [s["args"][0], s["id"]]}, {"L": [s["args"][1], s["args"][2]]}]},
            {"perp": [{"L": [s["args"][1], s["id"]]}, {"L": [s["args"][2], s["args"][0]]}]},
            {"perp": [{"L": [s["args"][2], s["id"]]}, {"L": [s["args"][0], s["args"][1]]}]},
        ],
        "H",
    ),
    "incenter": StepType(
        "point", PT3, _tri(G.incenter), "Tâm nội tiếp", {},
        lambda s, k=None, d=None: [
            {"on": [s["id"], {"AB": [s["args"][1], s["args"][0], s["args"][2]]}]},
            {"on": [s["id"], {"AB": [s["args"][0], s["args"][1], s["args"][2]]}]},
            {"on": [s["id"], {"AB": [s["args"][0], s["args"][2], s["args"][1]]}]},
        ],
        "I",
    ),
    "centroid": StepType("point", PT3, _tri(G.centroid), "Trọng tâm", {}, None, "G"),
    "nine_point_center": StepType("point", PT3, _tri(G.nine_point_center), "Tâm đường tròn Euler", {}, None, "N"),
    "altitude_foot": StepType(
        "point", PT3, _tri(lambda A, B, C: G.project(A, G.line_through(B, C))), "Chân đường cao", {},
        lambda s, k=None, d=None: [
            {"col": [s["args"][1], s["id"], s["args"][2]]},
            {"perp": [{"L": [s["args"][0], s["id"]]}, {"L": [s["args"][1], s["args"][2]]}]},
        ],
    ),
    "incircle_touch": StepType(
        "point", PT3, _tri(lambda A, B, C: G.project(G.incenter(A, B, C), G.line_through(B, C))),
        "Tiếp điểm đường tròn nội tiếp", {},
        lambda s, k=None, d=None: [
            {"col": [s["args"][1], s["id"], s["args"][2]]},
            {"on": [s["id"], {"IC": list(s["args"])}]},
        ],
    ),
    "arc_midpoint": StepType(
        "point", PT3,
        lambda a, p: G.arc_midpoint(a[0], a[1], a[2], bool(p["contains"])) if G.triangle_ok(*a) else None,
        "Điểm chính giữa cung", {"contains": False},
        lambda s, k=None, d=None: [
            {"on": [s["id"], {"C": list(s["args"])}]},
            {"on": [s["id"], {"PB": [s["args"][1], s["args"][2]]}]},
        ],
    ),
    "center": StepType("point", ["circle"], lambda a, p: G.pt(a[0].c.x, a[0].c.y), "Tâm đường tròn", {}, _center_facts),
    # ---------- ĐƯỜNG THẲNG ----------
    "line": StepType(
        "line", ["point", "point"], lambda a, p: G.line_through(a[0], a[1], "line"), "Đường thẳng", {},
        lambda s, k=None, d=None: [{"on": [s["args"][0], s["id"]]}, {"on": [s["args"][1], s["id"]]}],
    ),
    "segment": StepType(
        "line", ["point", "point"], lambda a, p: G.line_through(a[0], a[1], "segment"), "Đoạn thẳng", {},
        lambda s, k=None, d=None: [{"on": [s["args"][0], s["id"]]}, {"on": [s["args"][1], s["id"]]}],
    ),
    "ray": StepType(
        "line", ["point", "point"], lambda a, p: G.line_through(a[0], a[1], "ray"), "Tia", {},
        lambda s, k=None, d=None: [{"on": [s["args"][0], s["id"]]}, {"on": [s["args"][1], s["id"]]}],
    ),
    "perpendicular": StepType(
        "line", ["point", "line"], lambda a, p: G.line(a[0], G.perp(a[1].d)), "Đường vuông góc", {},
        lambda s, k=None, d=None: [{"on": [s["args"][0], s["id"]]}, {"perp": [s["id"], s["args"][1]]}],
    ),
    "parallel": StepType(
        "line", ["point", "line"], lambda a, p: G.line(a[0], a[1].d), "Đường song song", {},
        lambda s, k=None, d=None: [{"on": [s["args"][0], s["id"]]}, {"par": [s["id"], s["args"][1]]}],
    ),
    "perp_bisector": StepType(
        "line", ["point", "point"],
        lambda a, p: None if G.dist(a[0], a[1]) < G.EPS else G.line(G.mid(a[0], a[1]), G.perp(G.sub(a[1], a[0]))),
        "Đường trung trực", {},
        lambda s, k=None, d=None: [{"perp": [s["id"], {"L": list(s["args"])}]}],
    ),
    "angle_bisector": StepType(
        "line", PT3, lambda a, p: G.angle_bisector(a[0], a[1], a[2], bool(p["external"])), "Đường phân giác",
        {"external": False},
        lambda s, k=None, d=None: [{"on": [s["args"][1], s["id"]]}],
    ),
    # ---------- ĐƯỜNG TRÒN ----------
    "circle": StepType(
        "circle", ["point", "point"], lambda a, p: G.circle(a[0], G.dist(a[0], a[1])), "Đường tròn (tâm, điểm)", {},
        lambda s, k=None, d=None: [{"on": [s["args"][1], s["id"]]}],
    ),
    "circle_radius": StepType(
        "circle", PT3, lambda a, p: G.circle(a[0], G.dist(a[1], a[2])), "Đường tròn (tâm, bán kính)", {},
    ),
    "circle_3pts": StepType(
        "circle", PT3, lambda a, p: G.circle_through(a[0], a[1], a[2]), "Đường tròn qua 3 điểm", {},
        lambda s, k=None, d=None: [{"on": [x, s["id"]]} for x in s["args"]],
    ),
    "circumcircle": StepType(
        "circle", PT3, lambda a, p: G.circle_through(a[0], a[1], a[2]), "Đường tròn ngoại tiếp", {},
        lambda s, k=None, d=None: [{"on": [x, s["id"]]} for x in s["args"]],
        "circumcircle",
    ),
    "incircle": StepType(
        "circle", PT3, _tri(lambda A, B, C: G.circle(G.incenter(A, B, C), G.inradius(A, B, C))), "Đường tròn nội tiếp", {},
        _tan3, "incircle",
    ),
    "nine_point_circle": StepType(
        "circle", PT3, _tri(lambda A, B, C: G.circle_through(G.mid(A, B), G.mid(B, C), G.mid(C, A))), "Đường tròn Euler", {},
        None, "ninepoint",
    ),
    # ---------- BỔ SUNG (bản 1.1: thư viện công cụ) ----------
    "foot": StepType(
        "point", PT3,
        lambda a, p: None if G.dist(a[1], a[2]) < G.EPS else G.project(a[0], G.line_through(a[1], a[2])),
        "Chân đường vuông góc", {},
        lambda s, k=None, d=None: [
            {"col": [s["args"][1], s["id"], s["args"][2]]},
            {"perp": [{"L": [s["args"][0], s["id"]]}, {"L": [s["args"][1], s["args"][2]]}]},
        ],
    ),
    "reflect_pts": StepType(
        "point", PT3,
        lambda a, p: None if G.dist(a[1], a[2]) < G.EPS else G.reflect_point_over_line(a[0], G.line_through(a[1], a[2])),
        "Đối xứng qua đường thẳng", {},
        lambda s, k=None, d=None: [{"perp": [{"L": [s["args"][0], s["id"]]}, {"L": [s["args"][1], s["args"][2]]}]}],
    ),
    "rotate": StepType(
        "same", ["obj", "point"], lambda a, p: G.map_object(a[0], lambda P: G.rotate_point(P, a[1], p["angle"])),
        "Phép quay", {"angle": 90},
    ),
    "homothety": StepType(
        "same", ["obj", "point"], lambda a, p: G.map_object(a[0], lambda P: G.homothety_point(P, a[1], p["k"])),
        "Phép vị tự", {"k": 2},
        lambda s, k, d=None: [{"col": [s["args"][1], s["args"][0], s["id"]]}] if k[0] == "point" else [],
    ),
    "translate": StepType(
        "same", ["obj", "point", "point"], lambda a, p: G.map_object(a[0], lambda Z: G.translate_point(Z, a[1], a[2])),
        "Phép tịnh tiến", {},
    ),
    "invert": StepType("point", ["point", "circle"], lambda a, p: G.invert_point(a[0], a[1]), "Phép nghịch đảo", {}),
    "invert_line": StepType("line", ["curve", "circle"], lambda a, p: G.invert_to_line(a[0], a[1]), "Nghịch đảo (ảnh là đường thẳng)", {}),
    "invert_circle": StepType("circle", ["curve", "circle"], lambda a, p: G.invert_to_circle(a[0], a[1]), "Nghịch đảo (ảnh là đường tròn)", {}),
    "rotate_by": StepType(
        "same", ["obj", "point", "point", "point", "point"], _rotate_by, "Phép quay theo góc trên hình", {},
    ),
    "homothety_by": StepType(
        "same", ["obj", "point", "point", "point", "point", "point"], _homothety_by, "Phép vị tự theo tỉ số trên hình",
        {"negative": False},
        lambda s, k, d=None: [{"col": [s["args"][1], s["args"][0], s["id"]]}] if k[0] == "point" else [],
    ),
    "spiral": StepType(
        "same", ["obj", "point", "point", "point"],
        lambda a, p: None if G.dist(a[2], a[1]) < G.EPS else G.map_object(a[0], lambda P: G.spiral_point(P, a[1], a[2], a[3])),
        "Phép đồng dạng tâm O biến A thành B", {},
    ),
    "tangent_at": StepType(
        "line", ["circle", "point"], lambda a, p: G.tangent_at(a[0], a[1]), "Tiếp tuyến tại một điểm", {},
        lambda s, k=None, d=None: [{"on": [s["args"][1], s["id"]]}, {"tan": [s["id"], s["args"][0]]}],
    ),
    "tangent_point": StepType(
        "point", ["circle", "point"], lambda a, p: _pick(G.tangent_points(a[0], a[1]), p["which"]), "Tiếp điểm",
        {"which": 0},
        lambda s, k=None, d=None: [
            {"on": [s["id"], s["args"][0]]},
            {"tan": [{"L": [s["args"][1], s["id"]]}, s["args"][0]]},
        ],
    ),
    "common_tangent": StepType(
        "line", ["circle", "circle"], lambda a, p: G.common_tangent(a[0], a[1], bool(p["internal"]), p["which"]),
        "Tiếp tuyến chung", {"internal": False, "which": 0},
        lambda s, k=None, d=None: [{"tan": [s["id"], s["args"][0]]}, {"tan": [s["id"], s["args"][1]]}],
    ),
    "radical_axis": StepType("line", ["circle", "circle"], lambda a, p: G.radical_axis(a[0], a[1]), "Trục đẳng phương", {}),
    "radical_center": StepType(
        "point", ["circle", "circle", "circle"], lambda a, p: G.radical_center(a[0], a[1], a[2]), "Tâm đẳng phương", {},
    ),
    "homothety_center": StepType(
        "point", ["circle", "circle"], lambda a, p: G.homothety_center(a[0], a[1], bool(p["internal"])), "Tâm vị tự",
        {"internal": False},
    ),
    "excenter": StepType("point", PT3, _tri(G.excenter), "Tâm bàng tiếp", {}, None, "excenter"),
    "excircle": StepType("circle", PT3, _excircle, "Đường tròn bàng tiếp", {}, _tan3, "excircle"),
    "isogonal_conjugate": StepType(
        "point", ["point"] * 4, lambda a, p: G.isogonal_conjugate(*a), "Điểm liên hợp đẳng giác", {},
    ),
    "lemoine": StepType("point", PT3, _tri(G.lemoine), "Điểm Lemoine", {}, None, "K"),
    "kosnita": StepType("point", PT3, _tri(G.kosnita), "Điểm Kosnita", {}),
    "symmedian_foot": StepType(
        "point", PT3, _tri(G.symmedian_foot), "Chân đường đối trung", {},
        lambda s, k=None, d=None: [{"col": [s["args"][1], s["id"], s["args"][2]]}],
    ),
    "cevian_foot": StepType(
        "point", ["point"] * 4, _cevian, "Chân đường Cevian", {},
        lambda s, k=None, d=None: [
            {"col": [s["args"][2], s["id"], s["args"][3]]},
            {"col": [s["args"][1], s["args"][0], s["id"]]},
        ],
    ),
    "isogonal_line": StepType(
        "line", ["point"] * 4, lambda a, p: G.isogonal_line(*a), "Đường đẳng giác", {},
        lambda s, k=None, d=None: [{"on": [s["args"][1], s["id"]]}],
    ),
    "circle_tangent_at": StepType(
        "circle", PT3, lambda a, p: G.circle_tangent_at(*a), "Đường tròn tiếp xúc AB tại A, qua C", {},
        lambda s, k=None, d=None: [
            {"on": [s["args"][0], s["id"]]},
            {"on": [s["args"][2], s["id"]]},
            {"tan": [s["id"], {"L": [s["args"][0], s["args"][1]]}]},
        ],
    ),
    "mixtilinear": StepType(
        "circle", PT3,
        lambda a, p: G.mixtilinear(a[0], a[1], a[2], bool(p["external"])) if G.triangle_ok(*a) else None,
        "Đường tròn mixtilinear", {"external": False},
        lambda s, k=None, d=None: [
            {"tan": [s["id"], {"L": [s["args"][0], s["args"][1]]}]},
            {"tan": [s["id"], {"L": [s["args"][0], s["args"][2]]}]},
            {"tan": [s["id"], {"C": list(s["args"])}]},
        ],
    ),
    "circle_diameter": StepType(
        "circle", ["point", "point"], lambda a, p: G.circle(G.mid(a[0], a[1]), G.dist(a[0], a[1]) / 2),
        "Đường tròn đường kính", {},
        lambda s, k=None, d=None: [{"on": [s["args"][0], s["id"]]}, {"on": [s["args"][1], s["id"]]}],
    ),
    # ---------- BẢN 1.7: góc bằng góc, điểm trong tam giác, điểm cố định, quỹ tích, đo đạc ----------
    "angle_line": StepType(
        "line", ["point"] * 5, lambda a, p: _angle_line(a[0], a[1], a[2], a[3], a[4], p.get("flip")),
        "Đường tạo góc bằng góc cho trước", {"flip": False}, lambda s, k, d=None: [{"on": [s["args"][0], s["id"]]}],
    ),
    "angle_point": StepType(
        "point", ["point"] * 5 + ["line"], _angle_point, "Điểm trên đường tạo góc bằng góc cho trước", {"flip": False},
        lambda s, k, d=None: [{"on": [s["id"], s["args"][5]]}],
    ),
    "point_in": StepType(
        "point", PT3,
        lambda a, p: G.pt(a[0].x + p["u"] * (a[1].x - a[0].x) + p["v"] * (a[2].x - a[0].x),
                          a[0].y + p["u"] * (a[1].y - a[0].y) + p["v"] * (a[2].y - a[0].y)),
        "Điểm trong tam giác", {"u": 1 / 3, "v": 1 / 3},
    ),
    "fixed_point": StepType(
        "point", ["curve", "point"], lambda a, p: None, "Điểm cố định", {"which": 0},
        lambda s, k, d=None: [{"on": [s["id"], s["args"][0]]}], sampler=True,
    ),
    "locus": StepType("mark", ["point", "point"], lambda a, p: None, "Quỹ tích", {"n": 160}, sampler=True),
    "measure_len": StepType(
        "mark", ["point", "point"],
        lambda a, p: {"kind": "measure", "m": "len", "value": G.dist(a[0], a[1]), "at": {"x": (a[0].x + a[1].x) / 2, "y": (a[0].y + a[1].y) / 2}},
        "Đo độ dài", {"dx": 0, "dy": 0},
    ),
    "measure_angle": StepType("mark", PT3, _measure_angle, "Đo góc", {"dx": 0, "dy": 0}),
    "measure_ratio": StepType("mark", ["point"] * 4, _measure_ratio, "Đo tỉ số", {"dx": 0, "dy": 0}),

    # ---------- BẢN 1.8: điểm thoả điều kiện (xem solvePoint trong src/core/geom.js) ----------
    "solve_point": StepType(
        "point", ["...obj"], lambda a, p: G.solve_point(a, p.get("conds") or [], p["x"], p["y"]),
        "Điểm thoả điều kiện", {"x": 0, "y": 0, "conds": []}, min_args=1,
    ),
    # ---------- ĐÁNH DẤU (không tham gia khám phá) ----------
    "polygon": StepType("mark", ["...point"], lambda a, p: {"kind": "polygon", "pts": [_P(x) for x in a]}, "Miền đa giác"),
    "angle_mark": StepType(
        "mark", PT3, lambda a, p: {"kind": "angle", "A": _P(a[0]), "B": _P(a[1]), "C": _P(a[2])}, "Đánh dấu góc",
    ),
    "segment_mark": StepType(
        "mark", ["point", "point"],
        lambda a, p: None if G.dist(a[0], a[1]) < G.EPS else {"kind": "segmark", "A": _P(a[0]), "B": _P(a[1])},
        "Đánh dấu đoạn",
    ),
}


def arg_accepts(arg_type: str, kind: str | None) -> bool:
    if arg_type == "point":
        return kind == "point"
    if arg_type == "line":
        return kind == "line"
    if arg_type == "circle":
        return kind == "circle"
    if arg_type == "curve":
        return kind in ("line", "circle")
    if arg_type == "obj":
        return kind in ("point", "line", "circle")
    if arg_type == "pl":
        return kind in ("point", "line")
    if arg_type == "...point":
        return kind == "point"
    if arg_type == "...obj":
        return kind in ("point", "line", "circle")
    return False


FREE_PARAM_TYPES = {"free_point", "point_on"}
