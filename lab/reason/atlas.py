"""SỔ TRI THỨC BỔ ĐỀ, dùng theo VỊ TRÍ chứ không theo tên.

Kết luận của các bổ đề trong thư viện (lab/library) được viết lại thành sự kiện giữa các ĐIỂM (thẳng hàng, đồng viên,
trung điểm, cách đều) kèm toạ độ trên tam giác gốc. Bộ suy luận so khớp toạ độ với các điểm của hình đang xét (kể cả
điểm ảo): mọi điểm trùng vị trí với một điểm của bổ đề – dù được dựng theo cách khác (chân đường vuông góc từ I_a
xuống BC thay cho "tiếp điểm của (I_a)", tâm (IBC) thay cho S_a…) – đều được hưởng kiến thức đó.
"""

from __future__ import annotations

from ..core.model import evaluate, kinds

_ATLAS = None


def _point_atoms(doc, rtype, ids):
    """Kết luận → các sự kiện chỉ gồm điểm: ("col"|"cyc"|"mid"|"eq", [điểm…])."""
    from itertools import combinations

    by = {s["id"]: s for s in doc["steps"]}
    k = kinds(doc)
    out = []
    if rtype == "collinear":
        out += [("col", list(c)) for c in combinations(ids, 3)]
    elif rtype == "concyclic":
        out += [("cyc", list(c)) for c in combinations(ids, 4)]
    elif rtype == "midpoint":
        out.append(("mid", list(ids)))
    elif rtype == "phuong_tich":
        out.append(("pow", list(ids)))
    elif rtype in ("on_circle", "on_line") and ids:
        st = by.get(ids[0])
        if st is None:
            return out
        if st["type"] in ("circumcircle", "circle_3pts"):
            pts = list(dict.fromkeys(list(st["args"]) + list(ids[1:])))
            out += [("cyc", list(c)) for c in combinations(pts, 4)]
        elif st["type"] == "circle" and k.get(st["args"][0]) == "point":
            out.append(("eq", [st["args"][0]] + list(dict.fromkeys([st["args"][1]] + list(ids[1:])))))
        elif st["type"] in ("line", "segment", "ray"):
            pts = list(dict.fromkeys(list(st["args"]) + list(ids[1:])))
            out += [("col", list(c)) for c in combinations(pts, 3)]
    return out


def atlas():
    """[(loại, [(x, y)…], tên bổ đề)] – tính một lần."""
    global _ATLAS
    if _ATLAS is not None:
        return _ATLAS
    from itertools import permutations

    from ..library import CONFIGS
    from ..library.compose import start_doc
    from ..search.base import BASE_TRIANGLE

    out, seen = [], set()
    for c in CONFIGS:
        try:
            doc, _, kls = start_doc([c.key])
        except Exception:  # noqa: BLE001
            continue
        # bổ đề viết cho đỉnh A; đổi tên đỉnh (6 hoán vị) để có cùng bổ đề cho đỉnh B, C
        for perm in permutations("ABC"):
            ov = {x: {"x": BASE_TRIANGLE[y][0], "y": BASE_TRIANGLE[y][1]} for x, y in zip("ABC", perm)}
            try:
                v = evaluate(doc, ov)
            except Exception:  # noqa: BLE001
                continue
            _add(out, seen, doc, kls, v, c.key)
    _ATLAS = out
    return out


def _tangent_atoms(doc):
    """Điểm nằm trên đường tròn tiếp xúc (circle_tangent_at: tiếp xúc đường TU tại T, qua P) do cách dựng của bổ đề:
    ("tch", [T, U, P, X])."""
    out = []
    for c in doc["steps"]:
        if c["type"] != "circle_tangent_at":
            continue
        T, U, P = c["args"]
        for s in doc["steps"]:
            if s["type"] in ("intersection_other", "intersection", "point_on") and c["id"] in s["args"]:
                out.append(("tch", [T, U, P, s["id"]]))
    return out


def _add(out, seen, doc, kls, v, key_):
    for kind, pts in _tangent_atoms(doc):
        P = [v.get(p) for p in pts]
        if any(x is None for x in P):
            continue
        key = (kind, tuple((round(p.x, 9), round(p.y, 9)) for p in P))
        if key not in seen:
            seen.add(key)
            out.append((kind, [(p.x, p.y) for p in P], key_))
    for _, rtype, ids in kls:
        for kind, pts in _point_atoms(doc, rtype, ids):
            P = [v.get(p) for p in pts]
            if any(x is None or getattr(x, "kind", None) != "point" for x in P):
                continue
            xy = tuple((round(p.x, 9), round(p.y, 9)) for p in P)
            key = (kind, xy if kind in ("mid", "eq", "pow") else tuple(sorted(xy)))
            if key in seen:
                continue
            seen.add(key)
            out.append((kind, [(p.x, p.y) for p in P], key_))


def match(vals, pts, eps):
    """Các sự kiện của sổ tri thức mà mọi điểm đều trùng (bằng số) một điểm trong pts: [(loại, [id…])]."""
    grid = {}
    cell = max(eps * 50, 1e-9)
    for p in pts:
        P = vals.get(p)
        if P is None:
            continue
        grid.setdefault((round(P.x / cell), round(P.y / cell)), []).append(p)

    def find(x, y):
        gx, gy = round(x / cell), round(y / cell)
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                for p in grid.get((gx + dx, gy + dy), ()):
                    P = vals[p]
                    if abs(P.x - x) < eps and abs(P.y - y) < eps:
                        return p
        return None

    out = []
    for kind, xy, _ in atlas():
        ids = []
        for x, y in xy:
            p = find(x, y)
            if p is None:
                break
            ids.append(p)
        else:
            if len(set(ids)) == len(ids):
                out.append((kind, ids))
    return out
