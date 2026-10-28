"""Bộ quét quan hệ bằng số – bản Python của src/explore/explorer.js.

Tìm các quan hệ đúng trên MỌI cấu hình ngẫu nhiên (xê dịch điểm tự do và vị trí điểm trên đối tượng):
thẳng hàng, đồng viên, đồng quy, song song, vuông góc, tiếp xúc, điểm trên đường thẳng/đường tròn đã
dựng, trùng nhau. Loại cấu hình gần suy biến, loại quan hệ hiển nhiên từ cách dựng (Knowledge), xếp hạng.

Cùng bộ sinh số ngẫu nhiên và cùng thuật toán với bản JS nên cho cùng kết quả (lab/tests/test_quet.py).
    explore(doc, **tuỳ chọn) -> {'relations': [...], 'stats': {...}, 'special': {...}}
"""

from __future__ import annotations

import math
import time

from ..core import geom as G
from ..core.model import describe, evaluate, kinds, params_of, step_by_id
from ..core.steps import STEP_TYPES
from .knowledge import Knowledge

DEFAULTS = {
    "samples": 12,
    "maxAttempts": 150,
    "perturb": 0.3,
    "tol": 1e-6,
    "minSep": 0.012,
    "minAngle": 4,
    "maxRadius": 25,
    "seed": 12345,
    "maxPoints": 90,
}

M32 = 0xFFFFFFFF


def rng(seed):
    """Bộ sinh số ngẫu nhiên giống hệt bản JS (mulberry32)."""
    state = [seed & M32]

    def nxt():
        state[0] = (state[0] + 0x6D2B79F5) & M32
        t = state[0]
        t = ((t ^ (t >> 15)) * (t | 1)) & M32
        t ^= (t + (((t ^ (t >> 7)) * (t | 61)) & M32)) & M32
        return ((t ^ (t >> 14)) & M32) / 4294967296

    return nxt


def figure_scale(vals, point_ids):
    x1 = y1 = math.inf
    x2 = y2 = -math.inf
    for i in point_ids:
        v = vals.get(i)
        if v is None:
            continue
        x1, x2, y1, y2 = min(x1, v.x), max(x2, v.x), min(y1, v.y), max(y2, v.y)
    s = math.hypot(x2 - x1, y2 - y1) if math.isfinite(x1) else math.nan
    return s if math.isfinite(s) and s > 1e-12 else 1


TRIANGLE_TYPES = {"circumcenter", "orthocenter", "incenter", "centroid", "nine_point_center", "altitude_foot",
                  "incircle_touch", "arc_midpoint", "circle_3pts", "circumcircle", "incircle", "nine_point_circle",
                  "angle_bisector", "excenter", "excircle", "lemoine", "kosnita", "symmedian_foot", "mixtilinear"}


def find_triangles(doc, kind_of, strict=False):
    tri = {}

    def add_tri(ids):
        if len(set(ids)) != 3 or not all(kind_of.get(a) == "point" for a in ids):
            return
        key = ",".join(sorted(ids))
        tri.setdefault(key, list(ids))

    for s in doc["steps"]:
        if s["type"] in TRIANGLE_TYPES and len(s["args"]) == 3 and not (strict and s["type"] in ("circle_3pts", "angle_bisector")):
            add_tri(s["args"])
    adj = {}

    def link(a, b):
        adj.setdefault(a, {})
        adj.setdefault(b, {})
        adj[a][b] = True
        adj[b][a] = True

    for s in doc["steps"]:
        if s["type"] in ("line", "segment", "ray"):
            link(s["args"][0], s["args"][1])
    for a, nb in adj.items():
        for b in nb:
            for c in nb:
                if a < b < c and c in adj[b]:
                    add_tri([a, b, c])
    return list(tri.values())


def random_overrides(doc, base, scale, rand, perturb):
    ov = {}
    for s in doc["steps"]:
        p = params_of(s)
        if s["type"] == "free_point":
            r = perturb * scale * math.sqrt(rand())
            a = 2 * math.pi * rand()
            ov[s["id"]] = {"x": p["x"] + r * math.cos(a), "y": p["y"] + r * math.sin(a)}
        elif s["type"] == "point_on":
            host = base.get(s["args"][0])
            if host is None:
                continue
            t = p["t"]
            if host.kind == "circle":
                t += (rand() * 2 - 1) * 0.9
            elif host.sub == "segment":
                t = min(0.92, max(0.08, t + (rand() * 2 - 1) * 0.3))
            elif host.sub == "ray":
                t = max(0.05, t * math.exp((rand() * 2 - 1) * 0.5))
            else:
                t += (rand() * 2 - 1) * 0.4
            ov[s["id"]] = {"t": t}
    return ov


def _ang(P, Q, R):
    return abs(G.cross(G.sub(Q, P), G.sub(R, P))) / (G.dist(P, Q) * G.dist(P, R) + 1e-300)


def degenerate(doc, vals, ctx):
    point_ids, curve_ids = ctx["pointIds"], ctx["curveIds"]
    opts, kind_of = ctx["opts"], ctx["kindOf"]
    same_pairs, base_dist = ctx["sameClassPairs"], ctx["baseDist"]
    scale = figure_scale(vals, point_ids)
    for i in point_ids + curve_ids:
        if vals.get(i) is None:
            return "không xác định"
    sep = opts["minSep"] * scale
    for i in range(len(point_ids)):
        a = vals[point_ids[i]]
        for j in range(i + 1, len(point_ids)):
            if point_ids[i] + "|" + point_ids[j] in same_pairs:
                continue
            d = G.dist(a, vals[point_ids[j]])
            if d < sep and (not base_dist or d < 0.3 * base_dist[i][j]):
                return "điểm gần trùng"
    sin_min = math.sin(opts["minAngle"] * math.pi / 180)
    for t in ctx["triangles"]:
        A, B, C = (vals[a] for a in t)
        if min(_ang(A, B, C), _ang(B, C, A), _ang(C, A, B)) < sin_min:
            return "tam giác dẹt"
    for s in doc["steps"]:
        v = vals.get(s["id"])
        if v is not None and not isinstance(v, dict) and v.kind == "circle" and v.r > opts["maxRadius"] * scale:
            return "đường tròn quá lớn"
        if s["type"] in ("intersection", "intersection_other"):
            r = G.intersect(vals.get(s["args"][0]), vals.get(s["args"][1]))
            if len(r) == 2 and G.dist(r[0], r[1]) < sep * 2:
                return "gần tiếp xúc"
            if len(r) == 1 and kind_of.get(s["args"][0]) == "line" and kind_of.get(s["args"][1]) == "line":
                l1, l2 = vals[s["args"][0]], vals[s["args"][1]]
                if abs(G.cross(G.unit(l1.d), G.unit(l2.d))) < sin_min:
                    return "hai đường gần song song"
    return None


# ---------- các phép thử quan hệ (dung sai tương đối theo kích thước hình) ----------
def t_coincide(P, Q, e):
    return G.dist(P, Q) < e


def t_on_line(P, l, e):
    return G.dist_point_line(P, l) < e


def t_on_circle(P, c, e):
    return abs(G.dist(P, c.c) - c.r) < e


def t_collinear(P, Q, R, e):
    return G.dist_point_line(R, G.line_through(P, Q)) < e


def t_parallel(l1, l2, e, s):
    return abs(G.cross(G.unit(l1.d), G.unit(l2.d))) < e / s


def t_perpendicular(l1, l2, e, s):
    return abs(G.dot(G.unit(l1.d), G.unit(l2.d))) < e / s


def t_same_line(l1, l2, e, s):
    return t_parallel(l1, l2, e, s) and G.dist_point_line(l2.p, l1) < e


def t_same_circle(c1, c2, e):
    return G.dist(c1.c, c2.c) < e and abs(c1.r - c2.r) < e


def t_tangent_lc(l, c, e):
    return abs(G.dist_point_line(c.c, l) - c.r) < e


def t_tangent_cc(c1, c2, e):
    d = G.dist(c1.c, c2.c)
    if d < e:
        return False
    return abs(d - (c1.r + c2.r)) < e or abs(d - abs(c1.r - c2.r)) < e


def on_curve(P, c, e):
    return t_on_line(P, c, e) if c.kind == "line" else t_on_circle(P, c, e)


def sort_by_doc(doc, ids):
    idx = {s["id"]: i for i, s in enumerate(doc["steps"])}
    return sorted(ids, key=lambda a: idx[a])


def explore(doc, **options):
    opts = dict(DEFAULTS)
    opts.update(options)
    t0 = time.time()
    kind_of = kinds(doc)
    base = evaluate(doc)
    point_ids, line_ids, circle_ids = [], [], []
    for s in doc["steps"]:
        if base.get(s["id"]) is None:
            continue
        kd = kind_of.get(s["id"])
        if kd == "point":
            point_ids.append(s["id"])
        elif kd == "line":
            line_ids.append(s["id"])
        elif kd == "circle":
            circle_ids.append(s["id"])
    point_ids = point_ids[: opts["maxPoints"]]
    curve_ids = line_ids + circle_ids
    scale0 = figure_scale(base, point_ids)

    same_pairs = set()
    for i in range(len(point_ids)):
        for j in range(i + 1, len(point_ids)):
            if G.dist(base[point_ids[i]], base[point_ids[j]]) < opts["tol"] * scale0:
                same_pairs.add(point_ids[i] + "|" + point_ids[j])

    rand = rng(opts["seed"])
    triangles = find_triangles(doc, kind_of)
    base_dist = [[G.dist(base[a], base[b]) for b in point_ids] for a in point_ids]
    ctx = {"pointIds": point_ids, "curveIds": curve_ids, "sameClassPairs": same_pairs, "opts": opts,
           "kindOf": kind_of, "triangles": triangles, "baseDist": base_dist}
    samples = [(base, scale0)]
    attempts = 0
    rejected = {}
    base_degenerate = degenerate(doc, base, {**ctx, "baseDist": None})
    while len(samples) < opts["samples"] + 1 and attempts < opts["maxAttempts"]:
        attempts += 1
        ov = random_overrides(doc, base, scale0, rand, opts["perturb"])
        vals = evaluate(doc, ov)
        why = degenerate(doc, vals, ctx)
        if why:
            rejected[why] = rejected.get(why, 0) + 1
            continue
        samples.append((vals, figure_scale(vals, point_ids)))
    tol = opts["tol"]

    def all_(fn):
        return all(fn(v, tol * s, s) for v, s in samples)

    # ---- lớp điểm luôn trùng nhau ----
    rep_of = {i: i for i in point_ids}
    classes = []
    for pid in point_ids:
        if rep_of[pid] != pid:
            continue
        cls = [pid]
        for j in point_ids:
            if j == pid or rep_of[j] != j or pid + "|" + j not in same_pairs:
                continue
            if all_(lambda v, e, s, a=pid, b=j: t_coincide(v[a], v[b], e)):
                cls.append(j)
                rep_of[j] = pid
        if len(cls) > 1:
            classes.append(cls)

    def rep(i):
        return rep_of.get(i, i)

    reps = [i for i in point_ids if rep(i) == i]
    know = opts.get("knowledge", Knowledge)(doc, rep)
    special = recognize_special(doc, samples, reps, circle_ids, kind_of, opts, find_triangles(doc, kind_of, strict=True))
    rel = []

    def name(i):
        s = step_by_id(doc, i)
        return (s.get("name") if s else None) or i

    def desc(i):
        return describe(doc, i)

    def lst(ids):
        return ", ".join(name(i) for i in ids)

    for cls in classes:
        rel.append({"type": "coincide", "ids": cls, "text": " ≡ ".join(name(i) for i in cls) + " (trùng nhau)"})

    # ---- đường thẳng / đường tròn trùng nhau ----
    line_rep = {i: i for i in line_ids}
    for i in range(len(line_ids)):
        a = line_ids[i]
        if line_rep[a] != a:
            continue
        for j in range(i + 1, len(line_ids)):
            b = line_ids[j]
            if line_rep[b] != b:
                continue
            if all_(lambda v, e, s, a=a, b=b: t_same_line(v[a], v[b], e, s)):
                line_rep[b] = a
                if not know.same_line(a, b):
                    rel.append({"type": "same_line", "ids": [a, b], "text": f"{desc(a)} trùng {desc(b)}"})
    circ_rep = {i: i for i in circle_ids}
    for i in range(len(circle_ids)):
        a = circle_ids[i]
        if circ_rep[a] != a:
            continue
        for j in range(i + 1, len(circle_ids)):
            b = circle_ids[j]
            if circ_rep[b] != b:
                continue
            if all_(lambda v, e, s, a=a, b=b: t_same_circle(v[a], v[b], e)):
                circ_rep[b] = a
                if not know.same_circle(a, b):
                    rel.append({"type": "same_circle", "ids": [a, b], "text": f"{desc(a)} trùng {desc(b)}"})
    lines = [i for i in line_ids if line_rep[i] == i]
    circles = [i for i in circle_ids if circ_rep[i] == i]
    v0, e0 = base, tol * scale0

    # ---- điểm thuộc đường thẳng / đường tròn đã dựng ----
    on_line_sets = {}
    for l in lines:
        on = [P for P in reps if t_on_line(v0[P], v0[l], e0) and all_(lambda v, e, s, P=P, l=l: t_on_line(v[P], v[l], e))]
        on_line_sets[l] = on
        same = [x for x in line_ids if line_rep[x] == l]
        fresh = [P for P in on if not any(know.point_on_line_obj(P, ll) for ll in same)]
        if fresh:
            rel.append({"type": "on_line", "ids": [l] + fresh, "text": f"{lst(fresh)} nằm trên {desc(l)}"})
    on_circle_sets = {}
    for c in circles:
        on = [P for P in reps if t_on_circle(v0[P], v0[c], e0) and all_(lambda v, e, s, P=P, c=c: t_on_circle(v[P], v[c], e))]
        on_circle_sets[c] = on
        same = [x for x in circle_ids if circ_rep[x] == c]
        fresh = [P for P in on if not any(know.point_on_circle_obj(P, cc) for cc in same)]
        if fresh:
            rel.append({"type": "on_circle", "ids": [c] + fresh, "text": f"{lst(fresh)} nằm trên {desc(c)}"})

    # ---- thẳng hàng ----
    seen_col = set()
    for i in range(len(reps)):
        for j in range(i + 1, len(reps)):
            A, B = reps[i], reps[j]
            pa, pb = v0[A], v0[B]
            st = [A, B]
            for k in range(len(reps)):
                if k in (i, j):
                    continue
                if t_collinear(pa, pb, v0[reps[k]], e0):
                    st.append(reps[k])
            if len(st) < 3:
                continue
            verified = [A, B] + [C for C in st[2:] if all_(lambda v, e, s, C=C: t_collinear(v[A], v[B], v[C], e))]
            if len(verified) < 3:
                continue
            key = ",".join(sorted(verified))
            if key in seen_col:
                continue
            seen_col.add(key)
            if any(all(P in on for P in verified) for on in on_line_sets.values()):
                continue
            if know.collinear(verified):
                continue
            ids = sort_by_doc(doc, verified)
            rel.append({"type": "collinear", "ids": ids, "text": f"{lst(ids)} thẳng hàng"})

    # ---- đồng viên ----
    seen_cyc = set()
    nR = len(reps)
    for i in range(nR):
        for j in range(i + 1, nR):
            for k in range(j + 1, nR):
                A, B, C = reps[i], reps[j], reps[k]
                circ = G.circle_through(v0[A], v0[B], v0[C])
                if circ is None or circ.r > opts["maxRadius"] * scale0:
                    continue
                st = [A, B, C] + [reps[m] for m in range(k + 1, nR) if t_on_circle(v0[reps[m]], circ, e0)]
                if len(st) < 4:
                    continue
                key0 = "raw:" + ",".join(st)
                if key0 in seen_cyc:
                    continue
                full = [P for P in reps if t_on_circle(v0[P], circ, e0)]

                def on_c(v, e, s, P):
                    c = G.circle_through(v[full[0]], v[full[1]], v[full[2]])
                    return c is not None and t_on_circle(v[P], c, e)

                ok = [P for idx, P in enumerate(full) if idx < 3 or all_(lambda v, e, s, P=P: on_c(v, e, s, P))]
                key = ",".join(sorted(ok))
                seen_cyc.add(key0)
                if len(ok) < 4 or key in seen_cyc:
                    continue
                seen_cyc.add(key)
                if any(all(P in on for P in ok) for on in on_circle_sets.values()):
                    continue
                if know.concyclic(ok):
                    continue
                ids = sort_by_doc(doc, ok)
                rel.append({"type": "concyclic", "ids": ids, "text": f"{lst(ids)} đồng viên"})

    # ---- song song, vuông góc, tiếp xúc ----
    for i in range(len(lines)):
        for j in range(i + 1, len(lines)):
            a, b = lines[i], lines[j]
            if (t_parallel(v0[a], v0[b], e0, scale0) and all_(lambda v, e, s: t_parallel(v[a], v[b], e, s))
                    and not know.parallel(a, b)):
                rel.append({"type": "parallel", "ids": [a, b], "text": f"{desc(a)} ∥ {desc(b)}"})
            if (t_perpendicular(v0[a], v0[b], e0, scale0) and all_(lambda v, e, s: t_perpendicular(v[a], v[b], e, s))
                    and not know.perpendicular(a, b)):
                rel.append({"type": "perpendicular", "ids": [a, b], "text": f"{desc(a)} ⊥ {desc(b)}"})
    for l in lines:
        for c in circles:
            if (t_tangent_lc(v0[l], v0[c], e0) and all_(lambda v, e, s: t_tangent_lc(v[l], v[c], e))
                    and not know.tangent(l, c)):
                rel.append({"type": "tangent", "ids": [l, c], "text": f"{desc(l)} tiếp xúc {desc(c)}"})
    for i in range(len(circles)):
        for j in range(i + 1, len(circles)):
            a, b = circles[i], circles[j]
            if (t_tangent_cc(v0[a], v0[b], e0) and all_(lambda v, e, s: t_tangent_cc(v[a], v[b], e))
                    and not know.tangent(a, b)):
                rel.append({"type": "tangent", "ids": [a, b], "text": f"{desc(a)} tiếp xúc {desc(b)}"})

    # ---- đồng quy (≥ 3 đường qua một điểm CHƯA được dựng) ----
    curves = lines + circles
    seen_conc = set()
    for i in range(len(curves)):
        for j in range(i + 1, len(curves)):
            a, b = curves[i], curves[j]
            for X in G.intersect(v0[a], v0[b]):
                if math.hypot(X.x, X.y) > 1e6 or any(G.dist(v0[P], X) < 1e3 * e0 for P in reps):
                    continue
                if point_ids and min(G.dist(v0[p], X) for p in point_ids) > 20 * scale0:
                    continue
                through = [c for c in curves if c != a and c != b and on_curve(X, v0[c], e0)]
                if not through:
                    continue
                st = [a, b] + through
                key = ",".join(sorted(st))
                if key in seen_conc:
                    continue
                seen_conc.add(key)
                ok = all_(lambda v, e, s: any(all(on_curve(Y, v[c], e) for c in through) for Y in G.intersect(v[a], v[b])))
                if not ok:
                    continue
                all_lines = all(kind_of.get(c) == "line" for c in st)
                text = ", ".join(desc(c) for c in st) + (" đồng quy" if all_lines else " cùng đi qua một điểm")
                rel.append({"type": "concurrent", "ids": st, "text": text})

    # ---- bỏ tập con của tập thẳng hàng/đồng viên lớn hơn ----
    final = [r for r in rel if not (r["type"] in ("collinear", "concyclic") and any(
        o is not r and o["type"] == r["type"] and len(o["ids"]) > len(r["ids"]) and all(x in o["ids"] for x in r["ids"])
        for o in rel))]
    for r in final:
        r["score"] = score_of(r, doc, kind_of, special)
        notes = []
        for i in r["ids"]:
            st = step_by_id(doc, i)
            if i in special and not (STEP_TYPES.get(st["type"]).tag if st and STEP_TYPES.get(st["type"]) else None):
                n = f"{describe(doc, i)} là {special[i]['label']}"
                if n not in notes:
                    notes.append(n)
        if notes:
            r["note"] = "; ".join(notes)
    final.sort(key=lambda r: (-r["score"], len(r["ids"])))
    return {
        "relations": final,
        "special": special,
        "stats": {"samples": len(samples) - 1, "attempts": attempts, "rejected": rejected, "baseDegenerate": base_degenerate,
                  "points": len(reps), "lines": len(lines), "circles": len(circles), "ms": int((time.time() - t0) * 1000)},
        "_samples": samples,
        "_rep": rep_of,
    }


# ---------- xếp hạng (như bản JS; điểm "lạ" của phòng thí nghiệm nằm ở lab/diem.py) ----------
BASE_SCORE = {"tangent": 6, "concurrent": 5, "concyclic": 5, "on_circle": 5, "collinear": 5, "on_line": 3.5,
              "perpendicular": 3, "parallel": 3, "coincide": 3, "same_line": 3, "same_circle": 3}
SPECIAL_NAMES = {"O", "I", "H"}


def special_weight(step):
    d = STEP_TYPES.get(step.get("type")) if step else None
    tag = d.tag if d else None
    if tag in ("circumcircle", "incircle", "ninepoint"):
        return 3
    if tag in ("O", "I", "H"):
        return 3
    if step and step.get("name") in SPECIAL_NAMES:
        return 2.5
    if tag in ("G", "N"):
        return 2
    return 0


def score_of(r, doc, kind_of, recognized):
    s = BASE_SCORE.get(r["type"], 2)
    sp = 0
    for i in r["ids"]:
        sp += max(special_weight(step_by_id(doc, i) or {}), (recognized.get(i) or {}).get("weight", 0))
    s += min(sp, 7)
    if any(kind_of.get(i) == "circle" for i in r["ids"]):
        s += 0.5
    return round(s * 10) / 10


def recognize_special(doc, samples, reps, circle_ids, kind_of, opts, tri):
    """Nhận diện bằng số O, H, I, G, N và đường tròn ngoại tiếp/nội tiếp/Euler của các tam giác trong hình."""
    out = {}

    def name(i):
        s = step_by_id(doc, i)
        return (s.get("name") if s else None) or i

    count = 0
    for A, B, C in tri:
        count += 1
        if count > 12:
            break
        tri_name = name(A) + name(B) + name(C)
        PTS = [("O", 3, "tâm ngoại tiếp", G.circumcenter), ("H", 3, "trực tâm", G.orthocenter), ("I", 3, "tâm nội tiếp", G.incenter),
               ("G", 2, "trọng tâm", G.centroid), ("N", 2, "tâm đường tròn Euler", G.nine_point_center)]
        for code, w, label, f in PTS:
            for P in reps:
                if P in out and out[P]["weight"] >= w:
                    continue

                def ok(vals, scale):
                    X = f(vals[A], vals[B], vals[C])
                    return X is not None and G.dist(X, vals[P]) < opts["tol"] * scale

                if all(ok(v, s) for v, s in samples):
                    out[P] = {"weight": w, "label": f"{label} tam giác {tri_name}", "code": code, "tri": [A, B, C]}
        CIRC = [(3, "đường tròn ngoại tiếp", "circumcircle", lambda a, b, c: G.circle_through(a, b, c)),
                (3, "đường tròn nội tiếp", "incircle", lambda a, b, c: G.circle(G.incenter(a, b, c), G.inradius(a, b, c))),
                (3, "đường tròn Euler", "ninepoint", lambda a, b, c: G.circle_through(G.mid(a, b), G.mid(b, c), G.mid(c, a)))]
        for w, label, code, f in CIRC:
            for c in circle_ids:
                if c in out:
                    continue

                def okc(vals, scale):
                    X = f(vals[A], vals[B], vals[C])
                    Y = vals.get(c)
                    return X is not None and Y is not None and t_same_circle(X, Y, opts["tol"] * scale)

                if all(okc(v, s) for v, s in samples):
                    out[c] = {"weight": w, "label": f"{label} tam giác {tri_name}", "code": code, "tri": [A, B, C]}
    return out
