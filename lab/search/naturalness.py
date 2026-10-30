"""ĐỘ TỰ NHIÊN của đối tượng (0..1): đối tượng kinh điển (của cấu hình gốc, của thư viện bổ đề) = 1; đối tượng
mới = độ tự nhiên của phép dựng × trung bình nhân độ tự nhiên các đối số. Phép đối xứng, kẻ, cắt… vẫn tự nhiên;
tâm/trực tâm của một bộ ba điểm "bất kỳ" thì kém tự nhiên hơn nhiều so với của một tam giác có nghĩa."""

from __future__ import annotations

import math

OP_NAT = {
    "midpoint": 0.85, "foot": 0.9, "reflect_point": 0.85, "reflect_line": 0.9, "isogonal": 0.85,
    "ll": 0.9, "lc": 0.92, "cc": 0.92, "point_on": 0.95, "line": 0.95, "tangent": 0.92, "perp": 0.75,
    "parallel": 0.72, "diameter": 0.75, "circle3": 0.8, "center": 0.9, "xx": 0.92,
    # tâm của tam giác: cao nếu là tam giác có nghĩa (ba đỉnh đều kinh điển), thấp nếu là bộ ba bất kỳ
    "circumcenter": 0.6, "orthocenter": 0.55, "incenter": 0.5, "centroid": 0.45,
}
MEANINGFUL_CENTER = {"circumcenter": 0.85, "orthocenter": 0.8, "incenter": 0.8, "centroid": 0.7}


BASE_GROUPS = [{"D", "E", "F"}, {"Ma", "Mb", "Mc"}, {"Ta", "Tb", "Tc"}, {"Sa", "Sb", "Sc"}, {"Ra", "Rb", "Rc"}]


def meaningful_triangle(arg_objs):
    """Tam giác "có nghĩa": hai đỉnh là đỉnh của ABC (BHC, AIB, BOC…), hoặc ba đỉnh cùng một nhóm kinh điển (tam giác
    trực tâm DEF, tam giác trung bình, tam giác tiếp điểm…, ba điểm của cùng một bổ đề)."""
    ids = {o.id for o in arg_objs}
    if any(o.depth > 0 for o in arg_objs):
        return False
    if len(ids & {"A", "B", "C"}) >= 2:
        return True
    if any(ids <= g for g in BASE_GROUPS):
        return True
    srcs = [set(o.src) - {"tram"} for o in arg_objs]
    return all(srcs) and bool(set.intersection(*srcs))


def op_naturalness(op, typ, arg_objs):
    base = OP_NAT.get(op, 0.8)
    if op in MEANINGFUL_CENTER and arg_objs and meaningful_triangle(arg_objs):
        base = MEANINGFUL_CENTER[op]
    if not arg_objs:
        return base
    g = math.exp(sum(math.log(max(o.nat, 1e-3)) for o in arg_objs) / len(arg_objs))
    return round(base * g, 4)
