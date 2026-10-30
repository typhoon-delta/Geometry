"""Trình bày một sự kiện: đặt lại tên cho gọn, phát biểu tiếng Việt, hình để mở trong công cụ web.

    display_doc(fact)  -> tài liệu JSON để hiển thị / mở link (đổi tên điểm mới thành P, Q, R…, thêm ba cạnh,
                          thêm đường phụ nét đứt minh hoạ quan hệ, khung nhìn)
    statement(fact, doc) -> {"gia_thiet": [câu], "ket_luan": câu}  (tên điểm dạng công thức: I_A, S'_a…)
"""

from __future__ import annotations

import copy
import html
import re

from .core import geom as G
from .core.model import evaluate, kinds
from .core.steps import STEP_TYPES

BASE_IDS = {"A", "B", "C", "BC", "CA", "AB", "w", "O", "H", "I", "G", "N", "g", "e", "D", "E", "F", "Ma", "Mb", "Mc",
            "Ta", "Tb", "Tc", "Sa", "Sb", "Sc", "Ra", "Rb", "Rc"}
NEW_POINT_NAMES = list("PQRUVWXYZJKL")
AUX_STYLE = {"dash": True, "color": "#8a8f98"}
VERTEX_OF = {"a": ("A", "BC"), "b": ("B", "CA"), "c": ("C", "AB")}


# ---------------------------------------------------------------------------------------------- tên
def parse_label(name):
    """Tách tên kiểu công thức → (gốc, chỉ số dưới, số dấu phẩy) – như src/core/names.js."""
    s = str(name or "")
    m = re.match(r"^(.+?)('*)_\{([^}]*)\}('*)$", s) or re.match(r"^(.+?)('*)_([^_{}']+)('*)$", s)
    if m:
        return m.group(1), m.group(3), len(m.group(2) + m.group(4))
    m = re.match(r"^(.*?[^\d'])('*)(\d+)('*)$", s)
    if m:
        return m.group(1), m.group(3), len(m.group(2) + m.group(4))
    m = re.match(r"^(.*?)('+)$", s)
    if m and m.group(1):
        return m.group(1), "", len(m.group(2))
    return s, "", 0


def label_html(name):
    b, sub, pr = parse_label(name)
    return f'<i class="lb">{html.escape(b)}{"′" * pr}{f"<sub>{html.escape(sub)}</sub>" if sub else ""}</i>'


def label_text(name):
    b, sub, pr = parse_label(name)
    return b + "'" * pr + (f"_{sub}" if sub else "")


# ---------------------------------------------------------------------------------------------- hình hiển thị
def display_doc(fact, title=None):
    doc = copy.deepcopy(fact["doc"])
    steps = doc["steps"]
    ids = {s["id"] for s in steps}
    used = {s.get("name") for s in steps if s["id"] in BASE_IDS and s.get("name")}
    k = kinds(doc)
    # đổi tên đối tượng mới: P, Q, R… ; d₁, d₂… ; ω₁, ω₂…
    pool = [n for n in NEW_POINT_NAMES if n not in used]
    nl = nc = 0
    for s in steps:
        if s["id"] in BASE_IDS:
            continue
        kd = k.get(s["id"])
        if kd == "point":
            s["name"] = pool.pop(0) if pool else f"P_{len(used)}"
            used.add(s["name"])
        elif kd == "line":
            nl += 1
            s["name"] = f"d{nl}"
        elif kd == "circle":
            nc += 1
            s["name"] = f"ω{nc}"
    # ba cạnh tam giác
    have_sides = {frozenset(s["args"]) for s in steps if s["type"] in ("segment", "line") and not s.get("hidden")}
    extra = []
    for a, b, sid in (("B", "C", "BC"), ("C", "A", "CA"), ("A", "B", "AB")):
        if a in ids and b in ids and frozenset((a, b)) not in have_sides and sid not in ids:
            extra.append({"id": sid, "type": "segment", "args": [a, b], "name": sid.lower()})
    # chèn ngay sau ba đỉnh
    pos = max(i for i, s in enumerate(steps) if s["id"] in ("A", "B", "C")) + 1 if extra else 0
    steps[pos:pos] = extra
    # bước ẩn (đường phụ) vẫn ẩn; bước mới hiện; đường phụ minh hoạ quan hệ (nét đứt)
    vals = evaluate(doc)
    rel_ids = fact["ids"]
    if fact["type"] == "collinear" and len(rel_ids) >= 3:
        pts = [i for i in rel_ids if vals.get(i) is not None]
        a, b = max(((x, y) for x in pts for y in pts if x < y), key=lambda p: G.dist(vals[p[0]], vals[p[1]]))
        steps.append({"id": "rel1", "type": "line", "args": [a, b], "name": "d", "style": dict(AUX_STYLE)})
    elif fact["type"] == "concyclic" and len(rel_ids) >= 4:
        steps.append({"id": "rel1", "type": "circle_3pts", "args": rel_ids[:3], "name": "ω", "style": dict(AUX_STYLE)})
    for s in steps:
        s.pop("joinPrev", None)
    used_names = set()
    for s in steps:  # tên không trùng (yêu cầu của định dạng)
        n = s.get("name")
        if n and n in used_names:
            i = 2
            while f"{n}{i}" in used_names:
                i += 1
            s["name"] = f"{n}{i}"
        if s.get("name"):
            used_names.add(s["name"])
    doc["title"] = title or "Sự kiện"
    _spread_out(doc)
    vals = evaluate(doc)
    xs = [v.x for v in vals.values() if isinstance(v, G.Pt)]
    ys = [v.y for v in vals.values() if isinstance(v, G.Pt)]
    if xs:
        cx, cy = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
        w = max(max(xs) - min(xs), (max(ys) - min(ys)) * 4 / 3, 1) * 0.65
        doc["view"] = {"bbox": [round(cx - w, 3), round(cy + w * 0.75, 3), round(cx + w, 3), round(cy - w * 0.75, 3)]}
    return doc


def _spread_out(doc, tries=10):
    """Chọn toạ độ tam giác ABC (trong vài tam giác mẫu tổng quát) sao cho các điểm hiện trên hình tách nhau rõ
    nhất – hình dễ đọc hơn, không có hai điểm gần chồng lên nhau do tình cờ."""
    from .search.base import make_samples

    free = {s["id"]: s for s in doc["steps"] if s["type"] == "free_point" and s["id"] in ("A", "B", "C")}
    if len(free) != 3:
        return

    def quality(ov):
        vals = evaluate(doc, ov)
        pts = [vals.get(s["id"]) for s in doc["steps"] if not s.get("hidden") and kinds(doc).get(s["id"]) == "point"]
        if any(p is None for p in pts) or len(pts) < 2:
            return -1
        size = max(max(p.x for p in pts) - min(p.x for p in pts), max(p.y for p in pts) - min(p.y for p in pts), 1e-9)
        dmin = min(G.dist(a, b) for i, a in enumerate(pts) for b in pts[i + 1:])
        return dmin / size

    best, best_q = None, quality(None)
    if best_q > 0.06:
        return
    for ov in make_samples(tries, 11, perturb=0.22)[1:]:
        q = quality(ov)
        if q > best_q * 1.2:
            best, best_q = ov, q
    if best:
        for sid, p in best.items():
            free[sid]["params"] = {"x": round(p["x"], 4), "y": round(p["y"], 4)}


# ---------------------------------------------------------------------------------------------- phát biểu
class Namer:
    def __init__(self, doc, fmt):
        self.doc = doc
        self.by = {s["id"]: s for s in doc["steps"]}
        self.fmt = fmt  # hàm định dạng tên điểm

    def n(self, sid):
        s = self.by.get(sid)
        return self.fmt(s.get("name") if s else sid)

    def ns(self, ids):
        return "".join(self.n(i) for i in ids)

    def curve(self, sid):
        s = self.by.get(sid)
        if s is None:
            return sid
        t, a = s["type"], s["args"]
        if t in ("line", "segment", "ray"):
            return f"đường thẳng {self.ns(a)}"
        if t == "circumcircle":
            return f"({self.n('O')})" if "O" in self.by else "(O)"
        if t == "incircle":
            return f"({self.n('I')})" if "I" in self.by else "đường tròn nội tiếp tam giác " + self.ns(a)
        if t == "nine_point_circle":
            return "đường tròn Euler" + (f" ({self.n('N')})" if "N" in self.by else "")
        if t == "circle_3pts":
            return f"đường tròn ({self.ns(a)})"
        if t == "circle_diameter":
            return f"đường tròn đường kính {self.ns(a)}"
        if t == "circle":
            return f"đường tròn tâm {self.n(a[0])} đi qua {self.n(a[1])}"
        kind = "đường thẳng" if t in ("perpendicular", "parallel", "tangent_at", "perp_bisector", "angle_bisector",
                                      "isogonal_line", "radical_axis", "common_tangent") else "đường tròn"
        return f"{kind} {self.n(sid)}"


def _intro(N, ids):
    """Câu giả thiết về cấu hình gốc (chỉ nhắc các đối tượng có mặt)."""
    parts = []
    has = lambda x: x in ids  # noqa: E731
    first = "Cho tam giác ABC"
    if has("w") or has("O") or any(x in ids for x in ("Sa", "Sb", "Sc", "Ra", "Rb", "Rc")):
        first += f" nội tiếp đường tròn ({N.n('O') if has('O') else 'O'})"
    centers = []
    for sid, label in (("H", "trực tâm"), ("I", "tâm đường tròn nội tiếp"), ("G", "trọng tâm"), ("N", "tâm đường tròn Euler")):
        if has(sid):
            centers.append(f"{label} {N.n(sid)}")
    if centers:
        first += ", " + ", ".join(centers)
    parts.append(first + ".")
    groups = [
        (("D", "E", "F"), "chân đường cao kẻ từ", "chân các đường cao kẻ từ", "ABC"),
        (("Ma", "Mb", "Mc"), "trung điểm của", "trung điểm của", ["BC", "CA", "AB"]),
    ]
    for gids, one, many, refs in groups:
        present = [(i, refs[j]) for j, i in enumerate(gids) if has(i)]
        if present:
            names = ", ".join(N.n(i) for i, _ in present)
            what = ", ".join(r for _, r in present)
            parts.append(f"{names} lần lượt là {many} {what}." if len(present) > 1 else f"{names} là {one} {what}.")
    tps = [(i, s) for i, s in (("Ta", "BC"), ("Tb", "CA"), ("Tc", "AB")) if has(i)]
    if tps or has("g"):
        txt = f"Đường tròn nội tiếp ({N.n('I') if has('I') else 'I'})"
        if tps:
            txt += f" tiếp xúc với {', '.join(s for _, s in tps)}{' lần lượt' if len(tps) > 1 else ''} tại {', '.join(N.n(i) for i, _ in tps)}"
        parts.append(txt + ".")
    if has("e"):
        parts.append("Xét " + N.curve("e") + " của tam giác ABC (đường tròn qua trung điểm ba cạnh).")
    for i, (v, side) in (("Sa", ("A", "BC")), ("Sb", ("B", "CA")), ("Sc", ("C", "AB"))):
        if has(i):
            parts.append(f"{N.n(i)} là điểm chính giữa cung {side} không chứa {v}.")
    for i, (v, side) in (("Ra", ("A", "BC")), ("Rb", ("B", "CA")), ("Rc", ("C", "AB"))):
        if has(i):
            parts.append(f"{N.n(i)} là điểm chính giữa cung {side} chứa {v}.")
    return parts


def _step_sentence(N, s):
    t, a, me = s["type"], s["args"], N.n(s["id"])
    p = s.get("params") or {}
    if t == "point_on":
        host = N.by.get(a[0])
        if host and host["type"] == "segment":
            return f"Lấy điểm {me} tuỳ ý trên cạnh {N.ns(host['args'])}."
        return f"Lấy điểm {me} tuỳ ý trên {N.curve(a[0])}."
    if t == "midpoint":
        return f"Gọi {me} là trung điểm của {N.ns(a)}."
    if t in ("foot", "altitude_foot"):
        return f"Gọi {me} là hình chiếu vuông góc của {N.n(a[0])} lên đường thẳng {N.ns(a[1:])}."
    if t == "projection":
        return f"Gọi {me} là hình chiếu vuông góc của {N.n(a[0])} lên {N.curve(a[1])}."
    if t == "reflect":
        tgt = N.by.get(a[1])
        if tgt and tgt["type"] not in ("line", "segment", "ray", "perpendicular", "parallel", "tangent_at"):
            return f"Gọi {me} là điểm đối xứng của {N.n(a[0])} qua {N.n(a[1])}."
        return f"Gọi {me} là điểm đối xứng của {N.n(a[0])} qua {N.curve(a[1])}."
    if t == "reflect_pts":
        return f"Gọi {me} là điểm đối xứng của {N.n(a[0])} qua đường thẳng {N.ns(a[1:])}."
    if t == "circumcenter":
        return f"Gọi {me} là tâm đường tròn ngoại tiếp tam giác {N.ns(a)}."
    if t == "orthocenter":
        return f"Gọi {me} là trực tâm tam giác {N.ns(a)}."
    if t == "incenter":
        return f"Gọi {me} là tâm đường tròn nội tiếp tam giác {N.ns(a)}."
    if t == "centroid":
        return f"Gọi {me} là trọng tâm tam giác {N.ns(a)}."
    if t == "isogonal_conjugate":
        return f"Gọi {me} là điểm liên hợp đẳng giác của {N.n(a[0])} đối với tam giác {N.ns(a[1:])}."
    if t == "intersection":
        return f"Gọi {me} là giao điểm của {N.curve(a[0])} và {N.curve(a[1])}."
    if t == "intersection_other":
        return f"{N.curve(a[0])[0].upper() + N.curve(a[0])[1:]} cắt {N.curve(a[1])} tại điểm thứ hai {me} (khác {N.n(a[2])})."
    if t == "center":
        return f"Gọi {me} là tâm của {N.curve(a[0])}."
    if t in ("line", "segment", "ray"):
        return None if s.get("hidden") else f"Vẽ đường thẳng {N.ns(a)}."
    if t == "perpendicular":
        return f"Gọi {me} là đường thẳng qua {N.n(a[0])} vuông góc với {N.curve(a[1]).replace('đường thẳng ', '')}."
    if t == "parallel":
        return f"Gọi {me} là đường thẳng qua {N.n(a[0])} song song với {N.curve(a[1]).replace('đường thẳng ', '')}."
    if t == "tangent_at":
        return f"Gọi {me} là tiếp tuyến tại {N.n(a[1])} của {N.curve(a[0])}."
    if t == "circle_3pts":
        return f"Vẽ đường tròn ({N.ns(a)})."
    if t == "circle_diameter":
        return f"Vẽ đường tròn đường kính {N.ns(a)}."
    if t == "circle":
        return f"Vẽ {N.curve(s['id'])}."
    if t in ("polygon", "angle_mark", "segment_mark"):
        return None
    tri = N.ns(a[:3]) if len(a) >= 3 else ""
    if t == "free_point":
        return f"Lấy điểm {me} tuỳ ý (trong mặt phẳng)."
    if t == "excenter":
        return f"Gọi {me} là tâm đường tròn bàng tiếp góc {N.n(a[0])} của tam giác {tri}."
    if t == "excircle":
        return f"Gọi {me} là đường tròn bàng tiếp góc {N.n(a[0])} của tam giác {tri}."
    if t == "incircle":
        return f"Gọi {me} là đường tròn nội tiếp tam giác {tri}."
    if t == "circumcircle":
        return f"Vẽ đường tròn ngoại tiếp tam giác {tri}."
    if t == "nine_point_circle":
        return f"Gọi {me} là đường tròn Euler của tam giác {tri}."
    if t == "nine_point_center":
        return f"Gọi {me} là tâm đường tròn Euler của tam giác {tri}."
    if t == "incircle_touch":
        return f"Gọi {me} là tiếp điểm của đường tròn nội tiếp tam giác {tri} với cạnh {N.ns(a[1:3])}."
    if t == "arc_midpoint":
        return (f"Gọi {me} là điểm chính giữa cung {N.ns(a[1:3])} {'chứa' if p.get('contains') else 'không chứa'} "
                f"{N.n(a[0])} của đường tròn ({tri}).")
    if t == "lemoine":
        return f"Gọi {me} là điểm Lemoine (giao ba đường đối trung) của tam giác {tri}."
    if t == "kosnita":
        return f"Gọi {me} là điểm Kosnita của tam giác {tri}."
    if t == "symmedian_foot":
        return f"Gọi {me} là chân đường đối trung kẻ từ {N.n(a[0])} của tam giác {tri}."
    if t == "cevian_foot":
        return f"Đường thẳng {N.n(a[1])}{N.n(a[0])} cắt {N.ns(a[2:4])} tại {me}."
    if t == "mixtilinear":
        return (f"Gọi {me} là đường tròn {'bàng tiếp' if p.get('external') else 'nội tiếp'} mixtilinear góc {N.n(a[0])} "
                f"của tam giác {tri} (tiếp xúc {N.ns(a[:2])}, {N.ns([a[0], a[2]])} và tiếp xúc trong với đường tròn ({tri})).")
    if t == "circle_tangent_at":
        return f"Gọi {me} là đường tròn tiếp xúc với {N.ns(a[:2])} tại {N.n(a[0])} và đi qua {N.n(a[2])}."
    if t == "circle_radius":
        return f"Vẽ đường tròn {me} tâm {N.n(a[0])} bán kính {N.ns(a[1:3])}."
    if t == "tangent_point":
        return f"Từ {N.n(a[1])} kẻ tiếp tuyến tới {N.curve(a[0])}, tiếp điểm {me}."
    if t == "angle_bisector":
        return (f"Gọi {me} là đường phân giác {'ngoài' if p.get('external') else 'trong'} của góc "
                f"{N.n(a[0])}{N.n(a[1])}{N.n(a[2])}.")
    if t == "perp_bisector":
        return f"Gọi {me} là đường trung trực của {N.ns(a)}."
    if t == "isogonal_line":
        return f"Gọi {me} là đường đẳng giác của {N.n(a[1])}{N.n(a[3])} đối với góc {N.n(a[0])}{N.n(a[1])}{N.n(a[2])}."
    if t == "homothety":
        return f"Gọi {me} là ảnh của {N.n(a[0])} qua phép vị tự tâm {N.n(a[1])} tỉ số {p.get('k', 2)}."
    if t == "rotate":
        return f"Gọi {me} là ảnh của {N.n(a[0])} qua phép quay tâm {N.n(a[1])} góc {p.get('angle', 90)}°."
    if t == "translate":
        return f"Gọi {me} là ảnh của {N.n(a[0])} qua phép tịnh tiến theo vectơ {N.ns(a[1:3])}."
    if t == "invert":
        return f"Gọi {me} là ảnh của {N.n(a[0])} qua phép nghịch đảo đối với {N.curve(a[1])}."
    if t == "radical_axis":
        return f"Gọi {me} là trục đẳng phương của {N.curve(a[0])} và {N.curve(a[1])}."
    if t == "radical_center":
        return f"Gọi {me} là tâm đẳng phương của {', '.join(N.curve(x) for x in a)}."
    if t == "homothety_center":
        return f"Gọi {me} là tâm vị tự {'trong' if p.get('internal') else 'ngoài'} của {N.curve(a[0])} và {N.curve(a[1])}."
    if t == "common_tangent":
        return f"Gọi {me} là một tiếp tuyến chung {'trong' if p.get('internal') else 'ngoài'} của {N.curve(a[0])} và {N.curve(a[1])}."
    return f"Dựng {me} ({STEP_TYPES[t].label.lower() if t in STEP_TYPES else t})."


def _conclusion(N, ftype, ids, extra_name=None):
    pts = lambda xs: ", ".join(N.n(i) for i in xs)  # noqa: E731
    if ftype == "collinear":
        return f"Chứng minh rằng {pts(ids)} thẳng hàng."
    if ftype == "concyclic":
        return f"Chứng minh rằng {pts(ids)} cùng nằm trên một đường tròn."
    if ftype == "on_line":
        return f"Chứng minh rằng {pts(ids[1:])} nằm trên {N.curve(ids[0])}."
    if ftype == "on_circle":
        return f"Chứng minh rằng {pts(ids[1:])} nằm trên {N.curve(ids[0])}."
    if ftype == "parallel":
        return f"Chứng minh rằng {N.curve(ids[0])} song song với {N.curve(ids[1])}."
    if ftype == "perpendicular":
        return f"Chứng minh rằng {N.curve(ids[0])} vuông góc với {N.curve(ids[1])}."
    if ftype == "tangent":
        return f"Chứng minh rằng {N.curve(ids[0])} tiếp xúc với {N.curve(ids[1])}."
    if ftype == "concurrent":
        all_lines = all(N.by[i]["type"] in ("line", "segment", "ray", "perpendicular", "parallel", "tangent_at") for i in ids if i in N.by)
        return f"Chứng minh rằng {', '.join(N.curve(i) for i in ids)} {'đồng quy' if all_lines else 'cùng đi qua một điểm'}."
    if ftype == "coincide":
        return f"Chứng minh rằng {pts(ids)} trùng nhau."
    if ftype == "same_line":
        return f"Chứng minh rằng {N.curve(ids[0])} và {N.curve(ids[1])} trùng nhau."
    if ftype == "same_circle":
        return f"Chứng minh rằng {N.curve(ids[0])} và {N.curve(ids[1])} trùng nhau."
    return f"Quan hệ {ftype}: {pts(ids)}."


def statement(fact, doc, fmt=label_html):
    """Phát biểu tiếng Việt (giả thiết + kết luận) của sự kiện trên tài liệu hiển thị doc."""
    N = Namer(doc, fmt)
    ids = {s["id"] for s in doc["steps"]}
    gt = _intro(N, ids)
    for s in doc["steps"]:
        if s["id"] in BASE_IDS or s["id"].startswith("rel") or s.get("hidden"):
            continue
        sent = _step_sentence(N, s)
        if sent:
            gt.append(sent)
    return {"gia_thiet": gt, "ket_luan": _conclusion(N, fact["type"], fact["ids"])}


def statement_text(fact, doc):
    st = statement(fact, doc, fmt=label_text)
    return " ".join(st["gia_thiet"] + [st["ket_luan"]])
