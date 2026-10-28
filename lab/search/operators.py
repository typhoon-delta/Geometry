"""Các PHÉP DỰNG mở rộng vũ trụ và cách sinh ứng viên có ưu tiên.

Mỗi phép dựng dùng đúng các loại bước của công cụ (lab/core/steps.py), nên mọi hình sinh ra đều mở
được trong công cụ web. Đường thẳng qua hai điểm cần cho một phép dựng (vd giao hai đường) được dựng
kèm dưới dạng bước ẩn ("đường phụ").
"""

from __future__ import annotations

import hashlib
import math

from ..core import geom as G

# tên tiếng Việt của phép dựng (dùng trong báo cáo, thống kê, phản hồi)
OP_LABELS = {
    "midpoint": "trung điểm",
    "foot": "chân đường vuông góc",
    "reflect_point": "đối xứng qua điểm",
    "reflect_line": "đối xứng qua đường thẳng",
    "circumcenter": "tâm ngoại tiếp",
    "orthocenter": "trực tâm",
    "incenter": "tâm nội tiếp",
    "centroid": "trọng tâm",
    "isogonal": "liên hợp đẳng giác",
    "ll": "giao hai đường thẳng",
    "lc": "giao điểm thứ hai của đường thẳng với đường tròn",
    "cc": "giao điểm thứ hai của hai đường tròn",
    "point_on": "điểm tuỳ ý trên đường",
    "circle3": "đường tròn qua ba điểm",
    "line": "đường thẳng qua hai điểm",
    "tangent": "tiếp tuyến",
    "perp": "đường vuông góc",
    "parallel": "đường song song",
    "diameter": "đường tròn đường kính",
    "center": "tâm đường tròn",
}


def _h(*parts) -> float:
    """Số giả ngẫu nhiên tất định trong [0, 1) từ khoá (để cùng phép dựng cho cùng điểm ở mọi vòng)."""
    s = "|".join(str(p) for p in parts).encode()
    return int.from_bytes(hashlib.blake2b(s, digest_size=8).digest(), "big") / 2 ** 64


def point_on_params(U, host, slot, attempt=0):
    """Tham số t (gốc + từng mẫu) cho điểm tuỳ ý trên đường host – tất định theo dấu vân tay của host."""
    fp = (U.fingerprint(host), attempt)
    st = U.step[host]
    is_circle = U.kind[host] == "circle"
    if is_circle:
        t0 = 2 * math.pi * _h(fp, slot, "t0")
    else:
        t0 = 0.2 + 0.6 * _h(fp, slot, "t0")
    per = []
    for k in range(U.K):
        if k == 0:
            per.append({"t": t0})
            continue
        r = 2 * _h(fp, slot, k) - 1
        if is_circle:
            per.append({"t": t0 + 0.6 * r})
        elif st["type"] == "segment":
            per.append({"t": min(0.92, max(0.08, t0 + 0.15 * r))})
        else:
            per.append({"t": t0 + 0.3 * r})
    return t0, per


def ensure_line(U, a, b, visible=False):
    """Đường thẳng qua a, b (dùng lại nếu đã có). visible: đường "thật" (tham gia dò song song/vuông góc...)."""
    st, lid = U.try_add("line", [a, b], op="line", aux=not visible)
    if st == "bad":
        return None
    if visible and U.objs[lid].aux:
        U.objs[lid].aux = False
        U.step[lid].pop("hidden", None)
    return lid


def apply(U, op, args):
    """Thực hiện phép dựng; trả về (trạng_thái, id đối tượng chính)."""
    if op == "midpoint":
        return U.try_add("midpoint", list(args), op=op)
    if op == "foot":
        return U.try_add("foot", list(args), op=op)
    if op == "reflect_point":
        return U.try_add("reflect", list(args), op=op)
    if op == "reflect_line":
        return U.try_add("reflect_pts", list(args), op=op)
    if op in ("circumcenter", "orthocenter", "incenter", "centroid"):
        return U.try_add(op, list(args), op=op)
    if op == "isogonal":
        return U.try_add("isogonal_conjugate", [args[0], "A", "B", "C"], op=op)
    if op == "ll":
        l1 = ensure_line(U, args[0], args[1])
        l2 = ensure_line(U, args[2], args[3])
        if l1 is None or l2 is None or l1 == l2:
            return "bad", "đường suy biến"
        if _near_parallel(U, l1, l2):
            return "bad", "gần song song"
        return U.try_add("intersection", [l1, l2], op=op)
    if op == "lc":  # args: p, x (x thuộc đường tròn c), c
        p, x, c = args
        l = ensure_line(U, p, x)
        if l is None:
            return "bad", "đường suy biến"
        if not _transversal(U, l, c):
            return "bad", "gần tiếp xúc"
        return U.try_add("intersection_other", [l, c, x], op=op)
    if op == "cc":  # args: c1, c2, x (điểm chung đã biết)
        c1, c2, x = args
        if not _transversal(U, c1, c2):
            return "bad", "gần tiếp xúc"
        return U.try_add("intersection_other", [c1, c2, x], op=op)
    if op == "point_on":
        host, slot = args
        res = ("bad", "")
        for attempt in range(12):  # điểm tuỳ ý: thử vài vị trí đến khi không gần trùng điểm nào ở mọi mẫu
            t0, per = point_on_params(U, host, slot, attempt)
            res = U.try_add("point_on", [host], params={"t": t0}, op=op, sample_params=per)
            if res[0] != "bad":
                return res
        return res
    if op == "circle3":
        return U.try_add("circle_3pts", list(args), op=op)
    if op == "line":
        lid = ensure_line(U, args[0], args[1], visible=True)
        return ("bad", "suy biến") if lid is None else ("new", lid)
    if op == "tangent":
        return U.try_add("tangent_at", list(args), op=op)
    if op in ("perp", "parallel"):
        p, a, b = args
        l = ensure_line(U, a, b)
        if l is None:
            return "bad", "đường suy biến"
        return U.try_add("perpendicular" if op == "perp" else "parallel", [p, l], op=op)
    if op == "diameter":
        return U.try_add("circle_diameter", list(args), op=op)
    if op == "center":
        return U.try_add("center", list(args), op=op)
    return "bad", "phép dựng không rõ"


def _near_parallel(U, l1, l2, min_deg=3.0):
    s = math.sin(math.radians(min_deg))
    for k in range(U.K):
        a, b = U.vals[k][l1], U.vals[k][l2]
        if abs(G.cross(G.unit(a.d), G.unit(b.d))) < s:
            return True
    return False


def _transversal(U, a, b):
    """Hai đường cắt nhau "rõ" ở mọi mẫu (hai giao điểm không quá gần nhau)."""
    for k in range(U.K):
        r = G.intersect(U.vals[k][a], U.vals[k][b])
        if len(r) < 2 or G.dist(r[0], r[1]) < 0.02 * U.scale[k]:
            return False
    return True


# ---------------------------------------------------------------------------------------------
# Sinh ứng viên
# ---------------------------------------------------------------------------------------------
SPECIAL_POINT_W = {"O": 3.0, "H": 3.0, "I": 3.0, "G": 2.0, "N": 2.0}


def obj_weight(U, o, stations):
    w = 1.0
    if o.depth == 0:
        if o.special in SPECIAL_POINT_W:
            w = SPECIAL_POINT_W[o.special]
        elif o.special in ("circumcircle", "incircle", "ninepoint"):
            w = 3.0
        elif o.id in ("A", "B", "C"):
            w = 2.0
        else:
            w = 1.2
    if U.step[o.id]["type"] == "point_on":
        w *= 5.0
    w *= 1.0 + 0.05 * min(o.hits, 10)
    w *= stations.get(U.fingerprint(o.id), 1.0)
    w *= min(o.weight, 2.0)
    return w


class CandidateGen:
    """Sinh ứng viên phép dựng cho một lớp độ sâu: liệt kê có cấu trúc + lấy mẫu theo trọng số."""

    def __init__(self, U, rnd, op_weights, stations, max_depth, max_new_steps):
        self.U = U
        self.rnd = rnd
        self.opw = op_weights
        self.stations = stations
        self.max_depth = max_depth
        self.max_new_steps = max_new_steps
        self.tried = set()

    def _ok(self, args_objs):
        d = 1 + max(o.depth for o in args_objs)
        if d > self.max_depth:
            return False
        anc = set()
        for o in args_objs:
            anc |= o.anc
        return len(anc - self.U.base_ids) + 1 <= self.max_new_steps

    def key(self, op, args):
        sym = op in ("midpoint", "circumcenter", "orthocenter", "incenter", "centroid", "circle3", "line", "diameter")
        return (op, frozenset(args) if sym else tuple(args))

    def level(self, lvl, budget):
        """Danh sách (op, args) cho lớp lvl (ít nhất một đối số ở lớp lvl-1)."""
        U = self.U
        objs = [o for o in U.objs.values() if not o.aux]
        frontier = [o for o in objs if o.depth == lvl - 1]
        if not frontier:
            return []
        pool = [o for o in objs if o.depth <= lvl - 1]
        W = {o.id: obj_weight(U, o, self.stations) for o in pool}
        pts = [o for o in pool if o.kind == "point"]
        fpts = [o for o in frontier if o.kind == "point"]
        fcurves = [o for o in frontier if o.kind in ("line", "circle")]
        circles = [o for o in pool if o.kind == "circle"]
        lines = [o for o in pool if o.kind == "line"]
        on_circ = {c.id: U._points_on_circle(c.id) for c in circles}
        out = []

        def push(op, args, prio):
            k = self.key(op, args)
            if k in self.tried:
                return
            objs_ = [U.objs[a] for a in args if a in U.objs]
            if not self._ok(objs_):
                return
            self.tried.add(k)
            out.append((prio * self.opw.get(op, 1.0), op, tuple(args)))

        vertices = [U.objs[v] for v in ("A", "B", "C") if v in U.objs]
        specials = [o for o in pts if o.depth == 0 and (o.special in SPECIAL_POINT_W or o.id in ("A", "B", "C"))]
        sides = [U.objs[s] for s in ("BC", "CA", "AB") if s in U.objs]

        # (1) điểm tuỳ ý trên các đường của lớp trước (chỉ lớp 1: trên ba cạnh và ba đường tròn gốc)
        if lvl == 1:
            for c in fcurves:
                push("point_on", (c.id, 0), 4.0 * W[c.id])
        # (2) mở rộng "một ngôi" cho các điểm nổi bật của lớp trước
        top = sorted(fpts, key=lambda o: -W[o.id])[:40]
        top += [p for p in fpts if U.step[p.id]["type"] == "point_on" and p not in top]
        for p in top:
            wp = W[p.id]
            for s in sides:
                a, b = U.step[s.id]["args"]
                push("foot", (p.id, a, b), wp * 1.5)
                push("reflect_line", (p.id, a, b), wp * 0.8)
            for q in specials:
                if q.id != p.id:
                    push("midpoint", (p.id, q.id), wp * W[q.id] * 0.12)
                    push("reflect_point", (p.id, q.id), wp * W[q.id] * 0.1)
            push("isogonal", (p.id,), wp * 0.8)
            for c in circles:
                if c.depth == 0 and p.id not in on_circ[c.id]:
                    for x in on_circ[c.id]:
                        if x in ("A", "B", "C") or W.get(x, 1) > 2:
                            push("lc", (p.id, x, c.id), wp * W[c.id] * 0.4)
                elif p.id in on_circ[c.id]:
                    push("tangent", (c.id, p.id), wp * W[c.id] * 0.5)
            for v in vertices:
                if v.id != p.id:
                    push("line", (p.id, v.id), wp * 0.3)
        # (3) mở rộng "hai ngôi" cho các cặp điểm nổi bật của lớp trước (rất quan trọng với điểm tuỳ ý)
        free = [p for p in top if U.step[p.id]["type"] == "point_on"] or top[:8]
        for i in range(len(free)):
            for j in range(i + 1, len(free)):
                p, q = free[i], free[j]
                w2 = W[p.id] * W[q.id]
                push("midpoint", (p.id, q.id), w2 * 0.5)
                push("line", (p.id, q.id), w2 * 0.6)
                for v in pts:
                    if v.id not in (p.id, q.id) and v.depth == 0:
                        push("circle3", (v.id, p.id, q.id), w2 * W[v.id] * 0.5)
        # (4) đường tròn mới của lớp trước: giao với các đường tròn khác tại điểm chung đã biết
        for c in [o for o in fcurves if o.kind == "circle"]:
            on_c = set(U._points_on_circle(c.id))
            for d in circles:
                if d.id == c.id:
                    continue
                common = on_c & set(on_circ.get(d.id) or U._points_on_circle(d.id))
                if len(common) == 1:
                    push("cc", (c.id, d.id, next(iter(common))), W[c.id] * W[d.id] * 2.0)
        # (5) lấy mẫu ngẫu nhiên theo trọng số cho phần còn lại của ngân sách
        if pts and fpts:
            ops = [("midpoint", 2), ("foot", 3), ("reflect_point", 2), ("reflect_line", 3), ("circumcenter", 3),
                   ("orthocenter", 3), ("incenter", 3), ("centroid", 3), ("ll", 4), ("circle3", 3), ("line", 2),
                   ("perp", 3), ("parallel", 3), ("diameter", 2), ("lc", 0), ("isogonal", 1)]
            opw = [self.opw.get(o, 1.0) for o, _ in ops]
            pw = [W[o.id] for o in pts]
            fw = [W[o.id] for o in fpts]
            tries = 0
            target = len(out) + budget
            while len(out) < target and tries < budget * 20:
                tries += 1
                op, n = self.rnd.choices(ops, weights=opw)[0]
                if op == "lc":
                    if not circles:
                        continue
                    c = self.rnd.choice(circles)
                    on = on_circ[c.id]
                    if not on:
                        continue
                    p = self.rnd.choices(fpts, weights=fw)[0]
                    x = self.rnd.choice(on)
                    if p.id in on:
                        continue
                    push(op, (p.id, x, c.id), W[p.id] * W[c.id] * 0.3)
                    continue
                first = self.rnd.choices(fpts, weights=fw)[0]
                rest = self.rnd.choices(pts, weights=pw, k=n - 1)
                args = [first.id] + [r.id for r in rest]
                if len(set(args)) != len(args):
                    continue
                self.rnd.shuffle(args)
                prio = 1.0
                for a in args:
                    prio *= W[a] ** (1.0 / len(args))
                push(op, tuple(args), prio * 0.5)
        return interleave(out)


def interleave(cands):
    """Xếp ứng viên: trong mỗi loại phép dựng theo độ ưu tiên giảm dần, giữa các loại xen kẽ (vòng tròn có
    trọng số theo ưu tiên cao nhất của loại) – để mọi hướng đều được thử sớm, không bị một loại lấn át."""
    by = {}
    for prio, op, args in cands:
        by.setdefault(op, []).append((prio, op, args))
    queues = []
    for op, lst in by.items():
        lst.sort(key=lambda t: -t[0])
        queues.append(lst)
    queues.sort(key=lambda q: -q[0][0])
    out = []
    idx = [0] * len(queues)
    while True:
        moved = False
        for qi, q in enumerate(queues):
            if idx[qi] < len(q):
                out.append((q[idx[qi]][1], q[idx[qi]][2]))
                idx[qi] += 1
                moved = True
        if not moved:
            break
    return out
