"""VŨ TRỤ ĐỐI TƯỢNG của một vòng khám phá.

Mọi đối tượng (điểm, đường thẳng, đường tròn) được dựng bằng bước JSON đúng định dạng của công cụ và
được tính đồng thời trên K cấu hình mẫu (tam giác ngẫu nhiên tổng quát, cố định theo hạt giống).
Giá trị lưu trong mảng numpy để dò quan hệ nhanh:

    điểm        P[k] = (x, y)
    đường thẳng Lp[k] (một điểm), Lu[k] (vectơ chỉ phương đơn vị)
    đường tròn  Cc[k] (tâm), Cr[k] (bán kính)

Khi thêm một đối tượng mới X:
  * X không xác định / quá xa / gần trùng (nhưng không trùng hẳn) một điểm khác ở một mẫu nào đó → loại;
  * X trùng (trên mọi mẫu) một đối tượng đã có → GỘP (trả về đối tượng cũ, ghi nhận "trùng" để xét sự kiện);
  * ngược lại X được thêm và các quan hệ MỚI có chứa X được dò tăng dần:
      - điểm: nằm trên đường thẳng/đường tròn đã dựng, thẳng hàng với hai điểm (sắp xếp theo góc),
        đồng viên với ba điểm (nghịch đảo tâm X biến đường tròn qua X thành đường thẳng);
      - đường thẳng/đường tròn: đi qua điểm, song song, vuông góc, tiếp xúc, đồng quy.
Ứng viên quan hệ sau đó được kiểm chứng lại bằng bộ quét đầy đủ trên tài liệu con tối thiểu (lab/search/facts.py).
"""

from __future__ import annotations

import copy
import math

import numpy as np

from ..core import geom as G
from ..core.model import compute_step, evaluate, kinds
from ..core.steps import STEP_TYPES

NAMES_POINT = list("PQRUVWJKLXYZ")


class UObj:
    __slots__ = ("id", "kind", "depth", "op", "anc", "aux", "special", "weight", "hits", "order", "new_steps")

    def __init__(self, sid, kind, depth, op, anc, aux=False, special=None):
        self.id = sid
        self.kind = kind
        self.depth = depth
        self.op = op
        self.anc = anc  # frozenset id các bước cần để dựng (kể cả chính nó)
        self.aux = aux  # đường phụ (đường thẳng qua 2 điểm dựng kèm phép dựng khác)
        self.special = special
        self.weight = 1.0
        self.hits = 0  # số ứng viên quan hệ có chứa đối tượng này
        self.order = 0
        self.new_steps = 0  # số bước không thuộc cấu hình gốc trong bao đóng


def _special_of(step):
    d = STEP_TYPES.get(step["type"])
    return d.tag if d else None


class Universe:
    def __init__(self, base_doc, samples, tol=1e-7, far=12.0, min_sep=2e-4, max_radius=15.0, base_ids=None,
                 fp_samples=None):
        self.doc = copy.deepcopy(base_doc)
        self.K = len(samples)
        # mẫu "dấu vân tay": cùng một tam giác với các đỉnh được đổi tên (6 hoán vị) – để nhận ra hai sự kiện
        # chỉ khác nhau bởi cách gọi tên A, B, C. Không dùng để kiểm chứng quan hệ.
        self.fp_samples = list(fp_samples or [])
        self.F = len(self.fp_samples)
        self.ovs = [dict(o) for o in samples] + [dict(o) for o in self.fp_samples]
        self.vals = [evaluate(self.doc, self.ovs[k]) for k in range(self.K + self.F)]
        self.tol = tol
        self.far = far
        self.min_sep = min_sep
        self.max_radius = max_radius
        self.kind = kinds(self.doc)
        self.step = {s["id"]: s for s in self.doc["steps"]}
        tri = [np.array([[v[n].x, v[n].y] for v in self.vals[: self.K]]) for n in ("A", "B", "C")]
        self.scale = np.max([np.hypot(*(tri[i] - tri[j]).T) for i, j in ((0, 1), (1, 2), (2, 0))], axis=0)
        self.center = (tri[0] + tri[1] + tri[2]) / 3
        self.eps = self.tol * self.scale  # (K,)
        self.objs: dict[str, UObj] = {}
        self.points, self.lines, self.circles = [], [], []
        self._P, self._Lp, self._Lu, self._Cc, self._Cr = [], [], [], [], []
        self._cache = {}
        self.vi = []  # giao điểm "ảo" của các đường đã dựng: (id1, id2); toạ độ ở _vi_buf[:, i]
        self._vi_buf = None
        self.sigs = {}  # chữ ký ngữ nghĩa → id (tránh dựng lại cùng một định nghĩa)
        self.base_ids = set(base_ids if base_ids is not None else (s["id"] for s in self.doc["steps"]))
        self._name_i = 0
        self.used_names = {s.get("name") for s in self.doc["steps"] if s.get("name")}
        self.events = []  # sự kiện "trùng" khi gộp
        for s in self.doc["steps"]:
            k = self.kind.get(s["id"])
            if k in ("point", "line", "circle") and all(self.vals[j].get(s["id"]) is not None for j in range(self.K)):
                anc = frozenset([s["id"], *self._anc_of(s["args"])])
                o = UObj(s["id"], k, 0, "gốc", anc, special=_special_of(s))
                self._register(o)
                sig = self.signature(s)
                if sig:
                    self.sigs.setdefault(sig, s["id"])

    # ------------------------------------------------------------------ tiện ích
    def _anc_of(self, args):
        out = set()
        for a in args:
            o = self.objs.get(a)
            if o is not None:
                out |= o.anc
            else:  # bước không đăng ký (vd dấu) – tự tính
                out.add(a)
                s = self.step.get(a)
                if s:
                    out |= self._anc_of(s["args"])
        return out

    def value_arrays(self, sid):
        k = self.kind.get(sid)
        vs = [self.vals[j][sid] for j in range(self.K)]
        if k == "point":
            return np.array([[v.x, v.y] for v in vs])
        if k == "line":
            p = np.array([[v.p.x, v.p.y] for v in vs])
            d = np.array([[v.d.x, v.d.y] for v in vs])
            return p, d / np.hypot(d[:, 0], d[:, 1])[:, None]
        if k == "circle":
            return np.array([[v.c.x, v.c.y] for v in vs]), np.array([v.r for v in vs])
        return None

    def _register(self, o):
        o.order = len(self.objs)
        o.new_steps = len(o.anc - self.base_ids)
        self.objs[o.id] = o
        arr = self.value_arrays(o.id)
        if o.kind == "point":
            self.points.append(o.id)
            self._P.append(arr)
        elif o.kind == "line":
            self.lines.append(o.id)
            self._Lp.append(arr[0])
            self._Lu.append(arr[1])
        elif o.kind == "circle":
            self.circles.append(o.id)
            self._Cc.append(arr[0])
            self._Cr.append(arr[1])
        self._cache.clear()

    def P(self):
        if "P" not in self._cache:
            self._cache["P"] = np.stack(self._P, axis=1) if self._P else np.zeros((self.K, 0, 2))
        return self._cache["P"]

    def L(self):
        if "L" not in self._cache:
            if self._Lp:
                self._cache["L"] = (np.stack(self._Lp, axis=1), np.stack(self._Lu, axis=1))
            else:
                self._cache["L"] = (np.zeros((self.K, 0, 2)), np.zeros((self.K, 0, 2)))
        return self._cache["L"]

    def C(self):
        if "C" not in self._cache:
            if self._Cc:
                self._cache["C"] = (np.stack(self._Cc, axis=1), np.stack(self._Cr, axis=1))
            else:
                self._cache["C"] = (np.zeros((self.K, 0, 2)), np.zeros((self.K, 0)))
        return self._cache["C"]

    def new_name(self, kind):
        if kind == "point":
            while True:
                i = self._name_i
                self._name_i += 1
                base = NAMES_POINT[i % len(NAMES_POINT)]
                n = base if i < len(NAMES_POINT) else f"{base}_{i // len(NAMES_POINT)}"
                if n not in self.used_names:
                    self.used_names.add(n)
                    return n
        prefix = "d" if kind == "line" else "ω"
        i = 1
        while f"{prefix}{i}" in self.used_names:
            i += 1
        self.used_names.add(f"{prefix}{i}")
        return f"{prefix}{i}"

    def new_id(self):
        i = len(self.doc["steps"]) + 1
        while f"u{i}" in self.step:
            i += 1
        return f"u{i}"

    # ------------------------------------------------------------------ chữ ký ngữ nghĩa
    def signature(self, s):
        """Chữ ký "cùng một định nghĩa" để không dựng lại (vd chân đường cao = hình chiếu A lên BC)."""
        t, a = s["type"], s["args"]
        p = s.get("params") or {}

        def carrier(lid):
            st = self.step.get(lid)
            if st and st["type"] in ("line", "segment", "ray"):
                return frozenset(st["args"])
            return lid

        if t == "midpoint":
            return ("mid", frozenset(a))
        if t == "altitude_foot":
            return ("foot", a[0], frozenset(a[1:]))
        if t == "foot":
            return ("foot", a[0], frozenset(a[1:]))
        if t == "projection":
            return ("foot", a[0], carrier(a[1]))
        if t in ("circumcenter", "orthocenter", "incenter", "centroid", "nine_point_center", "excenter_set"):
            return (t, frozenset(a))
        if t in ("circumcircle", "circle_3pts"):
            return ("circ", frozenset(a))
        if t == "center":
            st = self.step.get(a[0])
            if st and st["type"] in ("circumcircle", "circle_3pts"):
                return ("circumcenter", frozenset(st["args"]))
            return ("center", a[0])
        if t in ("line", "segment", "ray"):
            return ("line", frozenset(a))
        if t == "reflect":
            return ("refl", a[0], a[1])
        if t == "reflect_pts":
            return ("reflL", a[0], frozenset(a[1:]))
        if t == "intersection":
            return ("x", frozenset(a), p.get("which", 0))
        if t == "intersection_other":
            return ("x2", frozenset(a[:2]), a[2])
        if t == "isogonal_conjugate":
            return ("iso", a[0], frozenset(a[1:]))
        if t == "point_on":
            return None
        return (t, tuple(a), tuple(sorted(p.items())))

    # ------------------------------------------------------------------ thêm bước
    def evaluate_step(self, step):
        """Giá trị bước mới trên mọi mẫu (chưa thêm vào vũ trụ); None nếu không xác định ở một mẫu nào đó."""
        out = []
        for k in range(self.K + self.F):
            v = compute_step(step, self.vals[k], self.ovs[k])
            if v is None and k < self.K:
                return None
            out.append(v)
        return out

    def try_add(self, typ, args, params=None, op="", aux=False, sample_params=None, name=None):
        """Thêm một bước. Trả về (trạng_thái, id): 'new' | 'dup' | 'bad'.

        sample_params: danh sách params riêng cho từng mẫu (điểm trên đối tượng: xê dịch tham số t).
        """
        step = {"id": self.new_id(), "type": typ, "args": list(args)}
        if params:
            step["params"] = dict(params)
        sig = self.signature(step)
        if sig is not None and sig in self.sigs:
            return "dup", self.sigs[sig]
        ovs_backup = None
        if sample_params is not None:
            ovs_backup = [o.get(step["id"]) for o in self.ovs]
            for k in range(self.K + self.F):
                self.ovs[k][step["id"]] = sample_params[k] if k < self.K else sample_params[0]
        vs = self.evaluate_step(step)
        if vs is None:
            self._restore(step["id"], ovs_backup)
            return "bad", "không xác định"
        d = STEP_TYPES[typ]
        kind = (self.kind.get(args[0]) if d.kind == "same" else d.kind)
        status, info = self._check(kind, vs[: self.K])
        if status == "bad":
            self._restore(step["id"], ovs_backup)
            return "bad", info
        if status == "dup":
            self._restore(step["id"], ovs_backup)
            existing = info
            if sig is not None:
                self.sigs[sig] = existing
            # trùng chính một đối tượng dùng để dựng nó (vd chân đường vuông góc của điểm đã nằm trên đường):
            # tầm thường, không ghi nhận
            if not aux and existing not in self._anc_of(args):
                self.events.append({"type": "coincide", "step": step, "existing": existing, "op": op})
            return "dup", existing
        # thêm thật
        step["name"] = name or self.new_name(kind)
        if aux:
            step["hidden"] = True
        self.doc["steps"].append(step)
        self.step[step["id"]] = step
        self.kind[step["id"]] = kind
        for k in range(self.K + self.F):
            self.vals[k][step["id"]] = vs[k]
        depth = 1 + max((self.objs[a].depth for a in args if a in self.objs), default=0)
        if aux:
            depth = max((self.objs[a].depth for a in args if a in self.objs), default=0)
        anc = frozenset([step["id"], *self._anc_of(args)])
        o = UObj(step["id"], kind, depth, op, anc, aux=aux)
        self._register(o)
        if sig is not None:
            self.sigs[sig] = step["id"]
        return "new", step["id"]

    def _restore(self, sid, backup):
        if backup is None:
            return
        for k in range(self.K + self.F):
            if backup[k] is None:
                self.ovs[k].pop(sid, None)
            else:
                self.ovs[k][sid] = backup[k]

    def _check(self, kind, vs):
        K = self.K
        if kind == "point":
            X = np.array([[v.x, v.y] for v in vs])
            if np.any(np.hypot(*(X - self.center).T) > self.far * self.scale):
                return "bad", "quá xa"
            P = self.P()
            if P.shape[1]:
                d = np.hypot(P[..., 0] - X[:, None, 0], P[..., 1] - X[:, None, 1])  # (K, N)
                same = np.all(d < self.eps[:, None] * 10, axis=0)
                if same.any():
                    return "dup", self.points[int(np.argmax(same))]
                near = np.any(d < (self.min_sep * self.scale)[:, None], axis=0)
                if near.any():
                    return "bad", "gần trùng"
            return "ok", X
        if kind == "line":
            p = np.array([[v.p.x, v.p.y] for v in vs])
            u = np.array([[v.d.x, v.d.y] for v in vs])
            u = u / np.hypot(*u.T)[:, None]
            if np.any(np.abs((self.center[:, 0] - p[:, 0]) * u[:, 1] - (self.center[:, 1] - p[:, 1]) * u[:, 0]) > self.far * self.scale):
                return "bad", "quá xa"
            Lp, Lu = self.L()
            if Lp.shape[1]:
                cr = np.abs(Lu[..., 0] * u[:, None, 1] - Lu[..., 1] * u[:, None, 0])
                dd = np.abs((p[:, None, 0] - Lp[..., 0]) * Lu[..., 1] - (p[:, None, 1] - Lp[..., 1]) * Lu[..., 0])
                same = np.all((cr < 10 * self.tol) & (dd < 10 * self.eps[:, None]), axis=0)
                if same.any():
                    return "dup", self.lines[int(np.argmax(same))]
            return "ok", (p, u)
        if kind == "circle":
            c = np.array([[v.c.x, v.c.y] for v in vs])
            r = np.array([v.r for v in vs])
            if np.any(r > self.max_radius * self.scale) or np.any(r < 0.01 * self.scale):
                return "bad", "bán kính bất thường"
            if np.any(np.hypot(*(c - self.center).T) > self.far * self.scale):
                return "bad", "quá xa"
            Cc, Cr = self.C()
            if Cc.shape[1]:
                dc = np.hypot(Cc[..., 0] - c[:, None, 0], Cc[..., 1] - c[:, None, 1])
                same = np.all((dc < 10 * self.eps[:, None]) & (np.abs(Cr - r[:, None]) < 10 * self.eps[:, None]), axis=0)
                if same.any():
                    return "dup", self.circles[int(np.argmax(same))]
            return "ok", (c, r)
        return "bad", "loại đối tượng"

    # ------------------------------------------------------------------ dò quan hệ tăng dần
    def relations_of(self, sid):
        o = self.objs[sid]
        if o.kind == "point":
            return self._rel_point(sid)
        if o.kind == "line":
            return self._rel_line(sid)
        if o.kind == "circle":
            return self._rel_circle(sid)
        return []

    def _ok_all(self, arr):
        return bool(np.all(arr))

    def _rel_point(self, sid):
        out = []
        P = self.P()
        xi = self.points.index(sid)
        X = P[:, xi, :]
        eps = self.eps
        # trên đường thẳng đã dựng (không tính đường phụ qua 2 điểm – đã có phép thử thẳng hàng)
        Lp, Lu = self.L()
        if Lp.shape[1]:
            dl = np.abs((X[:, None, 0] - Lp[..., 0]) * Lu[..., 1] - (X[:, None, 1] - Lp[..., 1]) * Lu[..., 0])
            for j in np.nonzero(np.all(dl < eps[:, None], axis=0))[0]:
                lid = self.lines[j]
                if not self.objs[lid].aux:
                    out.append(("on_line", [lid, sid]))
        Cc, Cr = self.C()
        if Cc.shape[1]:
            dc = np.abs(np.hypot(X[:, None, 0] - Cc[..., 0], X[:, None, 1] - Cc[..., 1]) - Cr)
            for j in np.nonzero(np.all(dc < eps[:, None], axis=0))[0]:
                out.append(("on_circle", [self.circles[j], sid]))
        on_circ = [c for t, c in out if t == "on_circle"]
        # thẳng hàng với hai điểm
        for grp in self._collinear_groups(xi):
            out.append(("collinear", [sid] + [self.points[i] for i in grp]))
        # đồng viên với ba điểm
        circ_sets = [set(self._points_on_circle(c[0])) for c in on_circ]
        for grp in self._concyclic_groups(xi):
            ids = [sid] + [self.points[i] for i in grp]
            if any(set(ids) <= s for s in circ_sets):
                continue
            out.append(("concyclic", ids))
        return out

    def _points_on_circle(self, cid):
        Cc, Cr = self.C()
        j = self.circles.index(cid)
        P = self.P()
        d = np.abs(np.hypot(P[..., 0] - Cc[:, j, None, 0], P[..., 1] - Cc[:, j, None, 1]) - Cr[:, j, None])
        return [self.points[i] for i in np.nonzero(np.all(d < self.eps[:, None], axis=0))[0]]

    def _points_on_line(self, lid):
        Lp, Lu = self.L()
        j = self.lines.index(lid)
        P = self.P()
        d = np.abs((P[..., 0] - Lp[:, j, None, 0]) * Lu[:, j, None, 1] - (P[..., 1] - Lp[:, j, None, 1]) * Lu[:, j, None, 0])
        return [self.points[i] for i in np.nonzero(np.all(d < self.eps[:, None], axis=0))[0]]

    @staticmethod
    def _angle_groups(theta, radius, tol_len, period=math.pi):
        """Nhóm các chỉ số có góc (mod period) gần bằng nhau: |Δθ|·r < tol_len."""
        if len(theta) < 2:
            return []
        order = np.argsort(theta)
        th = theta[order]
        rs = radius[order]
        close = np.diff(th) * np.minimum(rs[1:], rs[:-1]) < tol_len
        wrap = (th[0] + period - th[-1]) * min(rs[0], rs[-1]) < tol_len
        if not close.any() and not wrap:
            return []
        groups, cur, last = [], None, -2
        for a in np.nonzero(close)[0]:
            if a == last + 1 and cur is not None:
                cur.append(order[a + 1])
            else:
                if cur:
                    groups.append(cur)
                cur = [order[a], order[a + 1]]
            last = a
        if cur:
            groups.append(cur)
        # nối vòng (góc gần 0 và gần period)
        if wrap:
            first = next((g for g in groups if order[0] in g), [order[0]])
            last = next((g for g in groups if order[-1] in g), [order[-1]])
            if first is not last:
                merged = list(dict.fromkeys(list(last) + list(first)))
                groups = [g for g in groups if g is not first and g is not last] + [merged]
        return groups

    def _collinear_groups(self, xi):
        P = self.P()
        N = P.shape[1]
        if N < 3:
            return []
        P0 = P[0]
        idx = np.array([i for i in range(N) if i != xi])
        V = P0[idx] - P0[xi]
        r = np.hypot(V[:, 0], V[:, 1])
        th = np.mod(np.arctan2(V[:, 1], V[:, 0]), math.pi)
        out = []
        for g in self._angle_groups(th, r, 50 * self.eps[0]):
            ids = [int(idx[i]) for i in g]
            ref = max(ids, key=lambda i: np.hypot(*(P0[i] - P0[xi])))
            X = P[:, xi, :]
            R = P[:, ref, :]
            u = R - X
            u = u / np.hypot(u[:, 0], u[:, 1])[:, None]
            ok = [ref]
            for i in ids:
                if i == ref:
                    continue
                Q = P[:, i, :]
                dd = np.abs((Q[:, 0] - X[:, 0]) * u[:, 1] - (Q[:, 1] - X[:, 1]) * u[:, 0])
                if np.all(dd < self.eps):
                    ok.append(i)
            if len(ok) >= 2:
                out.append(ok)
        return out

    def _concyclic_groups(self, xi):
        P = self.P()
        N = P.shape[1]
        if N < 4:
            return []
        P0 = P[0]
        idx = np.array([i for i in range(N) if i != xi])
        V = P0[idx] - P0[xi]
        r2 = V[:, 0] ** 2 + V[:, 1] ** 2
        Q = V / r2[:, None]  # nghịch đảo tâm X, bán kính 1
        s0 = float(self.scale[0])
        seen = set()
        out = []
        M = len(idx)
        for a in range(M - 2):
            W = Q[a + 1:] - Q[a]
            rr = np.hypot(W[:, 0], W[:, 1])
            th = np.mod(np.arctan2(W[:, 1], W[:, 0]), math.pi)
            # dung sai lỏng trong không gian nghịch đảo (kiểm chứng chặt ở dưới)
            for g in self._angle_groups(th, rr * s0 * s0, 1e-6 * s0):
                ids = [int(idx[a])] + [int(idx[a + 1 + i]) for i in g]
                key = frozenset(ids)
                if key in seen:
                    continue
                seen.add(key)
                ok = self._verify_concyclic(xi, ids)
                if ok and len(ok) >= 3:
                    k2 = frozenset(ok)
                    if k2 not in seen or k2 == key:
                        seen.add(k2)
                        out.append(ok)
        # bỏ tập con
        out = [g for g in out if not any(set(g) < set(h) for h in out)]
        uniq = []
        for g in out:
            if not any(set(g) == set(h) for h in uniq):
                uniq.append(g)
        return uniq

    def _verify_concyclic(self, xi, ids):
        P = self.P()
        X = P[:, xi, :]
        a, b = ids[0], ids[1]
        A, B = P[:, a, :], P[:, b, :]
        # tâm đường tròn qua X, A, B trên mọi mẫu
        d = 2 * (X[:, 0] * (A[:, 1] - B[:, 1]) + A[:, 0] * (B[:, 1] - X[:, 1]) + B[:, 0] * (X[:, 1] - A[:, 1]))
        if np.any(np.abs(d) < 1e-9 * self.scale ** 2):
            return None
        x2, a2, b2 = (X ** 2).sum(1), (A ** 2).sum(1), (B ** 2).sum(1)
        ux = (x2 * (A[:, 1] - B[:, 1]) + a2 * (B[:, 1] - X[:, 1]) + b2 * (X[:, 1] - A[:, 1])) / d
        uy = (x2 * (B[:, 0] - A[:, 0]) + a2 * (X[:, 0] - B[:, 0]) + b2 * (A[:, 0] - X[:, 0])) / d
        R = np.hypot(X[:, 0] - ux, X[:, 1] - uy)
        if np.any(R > self.max_radius * self.scale):
            return None
        ok = [a, b]
        for i in ids[2:]:
            Q = P[:, i, :]
            if np.all(np.abs(np.hypot(Q[:, 0] - ux, Q[:, 1] - uy) - R) < self.eps):
                ok.append(i)
        return ok if len(ok) >= 3 else None

    def _rel_curve_common(self, sid):
        out = []
        o = self.objs[sid]
        # tiếp xúc
        if o.kind == "line":
            Lp, Lu = self.L()
            j = self.lines.index(sid)
            p, u = Lp[:, j, :], Lu[:, j, :]
            Cc, Cr = self.C()
            if Cc.shape[1]:
                dist = np.abs((Cc[..., 0] - p[:, None, 0]) * u[:, None, 1] - (Cc[..., 1] - p[:, None, 1]) * u[:, None, 0])
                for c in np.nonzero(np.all(np.abs(dist - Cr) < self.eps[:, None], axis=0))[0]:
                    out.append(("tangent", [sid, self.circles[c]]))
            # song song / vuông góc với các đường đã dựng (không phải đường phụ)
            if not o.aux:
                cr = np.abs(Lu[..., 0] * u[:, None, 1] - Lu[..., 1] * u[:, None, 0])
                dt = np.abs(Lu[..., 0] * u[:, None, 0] + Lu[..., 1] * u[:, None, 1])
                for m in range(Lp.shape[1]):
                    other = self.lines[m]
                    if other == sid or self.objs[other].aux:
                        continue
                    if np.all(cr[:, m] < 10 * self.tol):
                        out.append(("parallel", [other, sid]))
                    elif np.all(dt[:, m] < 10 * self.tol):
                        out.append(("perpendicular", [other, sid]))
        else:
            Cc, Cr = self.C()
            j = self.circles.index(sid)
            c, r = Cc[:, j, :], Cr[:, j]
            Lp, Lu = self.L()
            if Lp.shape[1]:
                dist = np.abs((c[:, None, 0] - Lp[..., 0]) * Lu[..., 1] - (c[:, None, 1] - Lp[..., 1]) * Lu[..., 0])
                for m in np.nonzero(np.all(np.abs(dist - r[:, None]) < self.eps[:, None], axis=0))[0]:
                    out.append(("tangent", [self.lines[m], sid]))
            dc = np.hypot(Cc[..., 0] - c[:, None, 0], Cc[..., 1] - c[:, None, 1])
            ext = np.abs(dc - (Cr + r[:, None]))
            inn = np.abs(dc - np.abs(Cr - r[:, None]))
            tan = np.all((np.minimum(ext, inn) < self.eps[:, None]) & (dc > self.eps[:, None]), axis=0)
            for m in np.nonzero(tan)[0]:
                if self.circles[m] != sid:
                    out.append(("tangent", [self.circles[m], sid]))
        # đi qua điểm (≥ 1 điểm ngoài các điểm dựng nên nó)
        on = self._points_on_line(sid) if o.kind == "line" else self._points_on_circle(sid)
        defining = set(self.step[sid]["args"])
        extra = [p for p in on if p not in defining]
        if extra and not o.aux:
            out.append(("on_line" if o.kind == "line" else "on_circle", [sid] + extra))
        # đồng quy: đi qua giao điểm "ảo" của hai đường đã dựng
        if not o.aux:
            out += self._concurrency(sid)
        return out

    def _rel_line(self, sid):
        return self._rel_curve_common(sid)

    def _rel_circle(self, sid):
        return self._rel_curve_common(sid)

    def _curve_value(self, cid, k):
        return self.vals[k][cid]

    def _concurrency(self, sid):
        out = []
        o = self.objs[sid]
        n = len(self.vi)
        if n:
            V = self._vi_buf[:, :n, :]
            # lọc nhanh trên mẫu 0 rồi kiểm chứng trên mọi mẫu
            if o.kind == "line":
                Lp, Lu = self.L()
                j = self.lines.index(sid)
                p, u = Lp[:, j, :], Lu[:, j, :]
                d0 = np.abs((V[0, :, 0] - p[0, 0]) * u[0, 1] - (V[0, :, 1] - p[0, 1]) * u[0, 0])
            else:
                Cc, Cr = self.C()
                j = self.circles.index(sid)
                d0 = np.abs(np.hypot(V[0, :, 0] - Cc[0, j, 0], V[0, :, 1] - Cc[0, j, 1]) - Cr[0, j])
            for m in np.nonzero(d0 < self.eps[0])[0]:
                Y = V[:, m, :]
                if o.kind == "line":
                    d = np.abs((Y[:, 0] - p[:, 0]) * u[:, 1] - (Y[:, 1] - p[:, 1]) * u[:, 0])
                else:
                    d = np.abs(np.hypot(Y[:, 0] - Cc[:, j, 0], Y[:, 1] - Cc[:, j, 1]) - Cr[:, j])
                if np.all(d < self.eps):
                    a, b = self.vi[m]
                    if sid not in (a, b):
                        out.append(("concurrent", [a, b, sid]))
        # thêm giao điểm ảo mới với các đường đã có
        self._add_vi(sid)
        return out

    def _vi_push(self, a, b, Y):
        n = len(self.vi)
        if self._vi_buf is None or n >= self._vi_buf.shape[1]:
            buf = np.empty((self.K, max(1024, 2 * n), 2))
            if self._vi_buf is not None:
                buf[:, :n] = self._vi_buf[:, :n]
            self._vi_buf = buf
        self._vi_buf[:, n] = Y
        self.vi.append((a, b))

    def _roots_with(self, sid):
        """Giao của đường sid với MỌI đường đã dựng (không phải đường phụ), tính véc-tơ hoá trên các mẫu.
        Trả về danh sách (id, mảng (K, n, 2)) với n = 1 hoặc 2 (NaN nếu không cắt ở mẫu đó)."""
        out = []
        K = self.K
        mine = self.objs[sid].kind
        Lp, Lu = self.L()
        Cc, Cr = self.C()
        lid = [i for i, x in enumerate(self.lines) if x != sid and not self.objs[x].aux]
        cid = [i for i, x in enumerate(self.circles) if x != sid and not self.objs[x].aux]
        if mine == "line":
            j = self.lines.index(sid)
            p, u = Lp[:, j, None, :], Lu[:, j, None, :]
        else:
            j = self.circles.index(sid)
            c, r = Cc[:, j, None, :], Cr[:, j, None]
        with np.errstate(invalid="ignore", divide="ignore"):
            if lid:
                q, v = Lp[:, lid, :], Lu[:, lid, :]
                if mine == "line":
                    den = u[..., 0] * v[..., 1] - u[..., 1] * v[..., 0]
                    t = ((q[..., 0] - p[..., 0]) * v[..., 1] - (q[..., 1] - p[..., 1]) * v[..., 0]) / den
                    X = p + t[..., None] * u
                    X[np.abs(den) < 0.05] = np.nan  # gần song song
                    for a, m in enumerate(lid):
                        out.append((self.lines[m], X[:, a, None, :]))
                else:
                    f = q - c
                    b = (f * v).sum(-1)
                    cc = (f * f).sum(-1) - r * r
                    disc = b * b - cc
                    sq = np.sqrt(np.where(disc > 0, disc, np.nan))
                    X = np.stack([q + (-b - sq)[..., None] * v, q + (-b + sq)[..., None] * v], axis=2)
                    for a, m in enumerate(lid):
                        out.append((self.lines[m], X[:, a]))
            if cid:
                c2, r2 = Cc[:, cid, :], Cr[:, cid]
                if mine == "line":
                    f = p - c2
                    b = (f * u).sum(-1)
                    cc = (f * f).sum(-1) - r2 * r2
                    disc = b * b - cc
                    sq = np.sqrt(np.where(disc > 0, disc, np.nan))
                    X = np.stack([p + (-b - sq)[..., None] * u, p + (-b + sq)[..., None] * u], axis=2)
                else:
                    D = c2 - c
                    d = np.hypot(D[..., 0], D[..., 1])
                    a_ = (d * d + r * r - r2 * r2) / (2 * d)
                    h2 = r * r - a_ * a_
                    h = np.sqrt(np.where(h2 > 0, h2, np.nan))
                    uu = D / d[..., None]
                    M = c + a_[..., None] * uu
                    nrm = np.stack([-uu[..., 1], uu[..., 0]], -1)
                    X = np.stack([M - h[..., None] * nrm, M + h[..., None] * nrm], axis=2)
                for a, m in enumerate(cid):
                    out.append((self.circles[m], X[:, a]))
        return out

    def _add_vi(self, sid, cap=60000):
        """Giao điểm "ảo" (chưa dựng) của đường mới với các đường đã có.

        Thứ tự nghiệm của giao điểm có thể đảo giữa hai mẫu độc lập, nên ở mỗi mẫu ta bỏ các nghiệm trùng
        (gần) điểm đã có rồi mới ghép: còn đúng một nghiệm mới ở mọi mẫu → ghép thẳng; còn hai → ghép theo thứ tự.
        """
        if len(self.vi) > cap:
            return
        P = self.P()
        sep = (self.min_sep * self.scale)[:, None, None]
        lim = (self.far * self.scale)[:, None]
        for c, X in self._roots_with(sid):
            if np.isnan(X).any():
                continue
            n = X.shape[1]
            if n == 2 and np.any(np.hypot(*(X[:, 0] - X[:, 1]).T) < 1e-3 * self.scale):
                continue
            if P.shape[1]:
                d = np.hypot(X[:, :, None, 0] - P[:, None, :, 0], X[:, :, None, 1] - P[:, None, :, 1])  # (K, n, N)
                fresh = np.min(d, axis=2) > sep[:, :, 0]  # (K, n)
            else:
                fresh = np.ones(X.shape[:2], bool)
            cnt = fresh.sum(1)
            if cnt.min() != cnt.max() or cnt[0] == 0:
                continue
            if cnt[0] == n:
                cols = [X[:, w] for w in range(n)]
            else:  # đúng một nghiệm mới ở mỗi mẫu
                cols = [X[np.arange(self.K), np.argmax(fresh, axis=1)]]
            for Y in cols:
                if np.any(np.hypot(*(Y - self.center).T) > lim[:, 0]):
                    continue
                self._vi_push(c, sid, Y)

    # ------------------------------------------------------------------ dấu vân tay (khử trùng lặp giữa các vòng)
    def fingerprint(self, sid, j=None):
        """Dấu vân tay hình học của đối tượng ở mẫu vân tay j (mặc định: mẫu kiểm chứng 1 và 2)."""
        k = self.kind.get(sid)
        if j is not None:
            js = [self.K + j]
        else:  # mặc định: mẫu vân tay "không đổi tên" (ổn định giữa các vòng, kể cả với điểm tuỳ ý của trạm)
            js = [self.K] if self.F else [1, 2]
        out = [k]
        for idx in js:
            s = float(self.scale[min(idx, 1)]) if idx >= self.K else float(self.scale[idx])
            v = self.vals[idx].get(sid)
            if v is None:
                out.append("x")
            elif k == "point":
                out += [round(v.x / s, 5), round(v.y / s, 5)]
            elif k == "line":
                u = G.unit(v.d)
                if u.x < -1e-12 or (abs(u.x) <= 1e-12 and u.y < 0):
                    u = G.Pt(-u.x, -u.y)
                out += [round(math.atan2(u.y, u.x), 5), round(G.cross(u, v.p) / s, 5)]
            elif k == "circle":
                out += [round(v.c.x / s, 5), round(v.c.y / s, 5), round(v.r / s, 5)]
        return tuple(out)
