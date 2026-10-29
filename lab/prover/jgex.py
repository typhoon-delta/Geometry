"""Dịch một hình (danh sách bước JSON) + một quan hệ sang bài toán JGEX cho Newclid.

Newclid chỉ có điểm; đường thẳng và đường tròn được "điểm hoá":
    đường thẳng ↦ hai điểm (u, v) trên nó       đường tròn ↦ (tâm o, một điểm r trên nó)
Mỗi điểm được dựng bằng các phép dựng JGEX tương ứng với bước JSON, kèm TOẠ ĐỘ CỐ ĐỊNH lấy từ chính hình
(cú pháp `x@1.25_-0.5`), nên Newclid dùng đúng nhánh nghiệm của hình (giao điểm nào, cung nào…).

    to_jgex(doc, rel_type, ids) -> JGEXProblem(text, names, notes)
    NotTranslatable: bước/quan hệ chưa dịch được (ghi rõ lý do).
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field

from ..core import geom as G
from ..core.model import evaluate, step_by_id


class NotTranslatable(Exception):
    pass


@dataclass
class JGEXProblem:
    text: str
    names: dict  # id bước → tên điểm Newclid (điểm của hình)
    notes: list = field(default_factory=list)
    goals: list = field(default_factory=list)


def _fmt(v):
    # đủ 17 chữ số: Newclid kiểm tra số với dung sai tuyệt đối 1e-12
    v = float(v)
    return "0.0" if v == 0 else repr(v)


class Translator:
    def __init__(self, doc, scale_to=8.0):
        self.doc = doc
        self.vals = evaluate(doc)
        pts = [v for v in self.vals.values() if isinstance(v, G.Pt)]
        xs = [p.x for p in pts] or [0]
        ys = [p.y for p in pts] or [0]
        size = max(max(xs) - min(xs), max(ys) - min(ys), 1e-9)
        # đưa hình về cỡ quen thuộc của Newclid (các ngưỡng "quá gần" 0.01, "quá xa" 100)
        self.k = scale_to / size
        self.cx, self.cy = (max(xs) + min(xs)) / 2, (max(ys) + min(ys)) / 2
        self.clauses = []
        self.coords = {}  # tên → (x, y) đã đổi tỉ lệ
        self.pt = {}  # id bước → tên
        self.ln = {}  # id bước → (u, v)
        self.cr = {}  # id bước → (o, r)
        self.cr3 = {}  # id bước → (a, b, c): đường tròn qua 3 điểm đã có tên (để viết mục tiêu dạng cyclic)
        self.cache = {}  # khoá ngữ nghĩa → tên điểm phụ
        self.notes = []
        self._n = 0
        self.free_seen = 0

    # ---------------------------------------------------------------- tiện ích
    def T(self, P):
        return ((P.x - self.cx) * self.k, (P.y - self.cy) * self.k)

    def fresh(self, base="x"):
        self._n += 1
        return f"{base}{self._n}"

    def near_existing(self, xy, tol=1e-7):
        for n, c in self.coords.items():
            if math.hypot(c[0] - xy[0], c[1] - xy[1]) < tol * 8:
                return n
        return None

    def add_point(self, P, constructions, base="x", key=None, alias_ok=True):
        """Thêm điểm (toạ độ P của hình) với các phép dựng JGEX; trả về tên."""
        if key is not None and key in self.cache:
            return self.cache[key]
        xy = self.T(P)
        same = self.near_existing(xy)
        if same is not None:
            if not alias_ok:
                raise NotTranslatable("hai điểm trùng nhau trong hình")
            self.notes.append(f"ghép điểm trùng: {base} ≡ {same}")
            if key is not None:
                self.cache[key] = same
            return same
        for n, c in self.coords.items():
            if math.hypot(c[0] - xy[0], c[1] - xy[1]) < 0.02:
                raise NotTranslatable("hai điểm quá gần nhau (Newclid không chấp nhận)")
        name = self.fresh(base)
        self.coords[name] = xy
        self.clauses.append(f"{name}@{_fmt(xy[0])}_{_fmt(xy[1])} = " + ", ".join(c.format(x=name) for c in constructions))
        if key is not None:
            self.cache[key] = name
        return name

    def V(self, sid):
        return self.vals[sid]

    def P(self, sid):
        if sid not in self.pt:
            raise NotTranslatable(f"điểm {sid} chưa dịch được")
        return self.pt[sid]

    def L(self, sid):
        if sid not in self.ln:
            raise NotTranslatable(f"đường thẳng {sid} chưa dịch được")
        return self.ln[sid]

    def C(self, sid):
        if sid not in self.cr:
            raise NotTranslatable(f"đường tròn {sid} chưa dịch được")
        return self.cr[sid]

    def on_curve(self, sid):
        """Phép dựng JGEX "x thuộc đường sid"."""
        if sid in self.ln:
            u, v = self.ln[sid]
            return f"on_line {{x}} {u} {v}"
        if sid in self.cr:
            o, r = self.cr[sid]
            return f"on_circle {{x}} {o} {r}"
        raise NotTranslatable(f"đường {sid} chưa dịch được")

    def second_point_on_line(self, line_val, through_name, construction):
        """Điểm thứ hai trên một đường thẳng (để điểm hoá đường), cách xa các điểm đã có."""
        P0 = self._xy(through_name)
        d = G.unit(line_val.d)
        for k in (1.7, 2.3, 3.1, -1.9, -2.7, 4.1):  # đơn vị sau khi đổi tỉ lệ
            Q = G.pt(P0.x + k / self.k * d.x, P0.y + k / self.k * d.y)
            xy = self.T(Q)
            if all(math.hypot(c[0] - xy[0], c[1] - xy[1]) > 0.3 for c in self.coords.values()):
                return self.add_point(Q, [construction], base="l", alias_ok=False)
        raise NotTranslatable("không đặt được điểm phụ trên đường thẳng")

    # ---------------------------------------------------------------- các điểm "ngữ nghĩa" dùng chung
    def mid(self, a, b):
        key = ("mid", frozenset((a, b)))
        if key in self.cache:
            return self.cache[key]
        P = G.mid(self._xy(a), self._xy(b))
        return self.add_point(P, [f"midpoint {{x}} {a} {b}"], base="m", key=key)

    def circumcenter(self, a, b, c):
        key = ("O", frozenset((a, b, c)))
        if key in self.cache:
            return self.cache[key]
        P = G.circumcenter(self._xy(a), self._xy(b), self._xy(c))
        if P is None:
            raise NotTranslatable("ba điểm thẳng hàng")
        return self.add_point(P, [f"circle {{x}} {a} {b} {c}"], base="o", key=key)

    def incenter(self, a, b, c):
        key = ("I", frozenset((a, b, c)))
        if key in self.cache:
            return self.cache[key]
        P = G.incenter(self._xy(a), self._xy(b), self._xy(c))
        return self.add_point(P, [f"incenter {{x}} {a} {b} {c}"], base="i", key=key)

    def foot(self, p, a, b):
        key = ("foot", p, frozenset((a, b)))
        if key in self.cache:
            return self.cache[key]
        P = G.project(self._xy(p), G.line_through(self._xy(a), self._xy(b)))
        return self.add_point(P, [f"foot {{x}} {p} {a} {b}"], base="f", key=key)

    def _xy(self, name):
        x, y = self.coords[name]
        return G.pt(x / self.k + self.cx, y / self.k + self.cy)

    # ---------------------------------------------------------------- dịch từng bước
    def step(self, s):
        t, a, sid = s["type"], s["args"], s["id"]
        p = s.get("params") or {}
        v = self.vals.get(sid)
        if v is None:
            raise NotTranslatable(f"bước {sid} không xác định")
        if t == "free_point":
            self.free_seen += 1
            name = self.add_point(v, ["free {x}"], base="p", alias_ok=False)
            self.pt[sid] = name
            return
        if t in ("polygon", "angle_mark", "segment_mark"):
            return
        if t == "point_on":
            self.pt[sid] = self.add_point(v, [self.on_curve(a[0])], base="p", alias_ok=False)
            return
        if t in ("intersection", "intersection_other"):
            self.pt[sid] = self.add_point(v, [self.on_curve(a[0]), self.on_curve(a[1])], base="x")
            return
        if t == "midpoint":
            self.pt[sid] = self.mid(self.P(a[0]), self.P(a[1]))
            return
        if t == "projection":
            u, w = self.L(a[1])
            self.pt[sid] = self.foot(self.P(a[0]), u, w)
            return
        if t == "foot":
            self.pt[sid] = self.foot(self.P(a[0]), self.P(a[1]), self.P(a[2]))
            return
        if t == "altitude_foot":
            self.pt[sid] = self.foot(self.P(a[0]), self.P(a[1]), self.P(a[2]))
            return
        if t == "circumcenter":
            self.pt[sid] = self.circumcenter(*(self.P(x) for x in a))
            return
        if t == "orthocenter":
            A, B, C = (self.P(x) for x in a)
            self.pt[sid] = self.add_point(v, [f"orthocenter {{x}} {A} {B} {C}"], base="h", key=("H", frozenset((A, B, C))))
            return
        if t == "incenter":
            self.pt[sid] = self.incenter(*(self.P(x) for x in a))
            return
        if t == "excenter":
            A, B, C = (self.P(x) for x in a)
            self.pt[sid] = self.add_point(v, [f"excenter {{x}} {A} {B} {C}"], base="j", key=("J", A, frozenset((B, C))))
            return
        if t == "centroid":
            A, B, C = (self.P(x) for x in a)
            m1, m2 = self.mid(B, C), self.mid(C, A)
            self.pt[sid] = self.add_point(v, [f"on_line {{x}} {A} {m1}", f"on_line {{x}} {B} {m2}"], base="g", key=("G", frozenset((A, B, C))))
            return
        if t == "nine_point_center":
            # như lõi JS: N = trung điểm OH
            A, B, C = (self.P(x) for x in a)
            O = self.circumcenter(A, B, C)
            H = self.add_point(G.orthocenter(self._xy(A), self._xy(B), self._xy(C)), [f"orthocenter {{x}} {A} {B} {C}"],
                               base="h", key=("H", frozenset((A, B, C))))
            self.pt[sid] = self.mid(O, H)
            return
        if t == "incircle_touch":
            A, B, C = (self.P(x) for x in a)
            self.pt[sid] = self.foot(self.incenter(A, B, C), B, C)
            return
        if t == "arc_midpoint":
            A, B, C = (self.P(x) for x in a)
            o = self.circumcenter(A, B, C)
            self.pt[sid] = self.add_point(v, [f"on_bline {{x}} {B} {C}", f"on_circle {{x}} {o} {A}"], base="s")
            return
        if t == "center":
            self.pt[sid] = self.C(a[0])[0]
            return
        if t == "reflect":
            kinds = [self._kind(x) for x in a]
            if kinds[0] == "point":
                X = self.P(a[0])
                if kinds[1] == "point":
                    self.pt[sid] = self.add_point(v, [f"mirror {{x}} {X} {self.P(a[1])}"], base="q")
                else:
                    u, w = self.L(a[1])
                    self.pt[sid] = self.add_point(v, [f"reflect {{x}} {X} {u} {w}"], base="q")
                return
            raise NotTranslatable("đối xứng của đường thẳng/đường tròn chưa hỗ trợ")
        if t == "reflect_pts":
            X, A, B = (self.P(x) for x in a)
            self.pt[sid] = self.add_point(v, [f"reflect {{x}} {X} {A} {B}"], base="q")
            return
        if t == "cevian_foot":
            Pp, A, B, C = (self.P(x) for x in a)
            self.pt[sid] = self.add_point(v, [f"on_line {{x}} {A} {Pp}", f"on_line {{x}} {B} {C}"], base="x")
            return
        if t == "isogonal_conjugate":
            Pp, A, B, C = (self.P(x) for x in a)
            self.pt[sid] = self.add_point(v, [f"on_aline {{x}} {A} {C} {B} {A} {Pp}", f"on_aline {{x}} {B} {A} {C} {B} {Pp}"], base="q")
            return
        if t == "tangent_point":
            o, r = self.C(a[0])
            Pp = self.P(a[1])
            self.pt[sid] = self.add_point(v, [f"on_circle {{x}} {o} {r}", f"on_dia {{x}} {Pp} {o}"], base="t")
            return
        # ---- đường thẳng
        if t in ("line", "segment", "ray"):
            self.ln[sid] = (self.P(a[0]), self.P(a[1]))
            return
        if t in ("perpendicular", "parallel"):
            Pp = self.P(a[0])
            u, w = self.L(a[1])
            c = "on_tline" if t == "perpendicular" else "on_pline"
            self.ln[sid] = (Pp, self.second_point_on_line(v, Pp, f"{c} {{x}} {Pp} {u} {w}"))
            return
        if t == "perp_bisector":
            A, B = (self.P(x) for x in a)
            m = self.mid(A, B)
            self.ln[sid] = (m, self.second_point_on_line(v, m, f"on_tline {{x}} {m} {A} {B}"))
            return
        if t == "angle_bisector":
            A, B, C = (self.P(x) for x in a)
            vin = G.angle_bisector(self._xy(A), self._xy(B), self._xy(C), False)
            q = self.second_point_on_line(vin, B, f"angle_bisector {{x}} {A} {B} {C}")
            if p.get("external"):
                self.ln[sid] = (B, self.second_point_on_line(v, B, f"on_tline {{x}} {B} {B} {q}"))
            else:
                self.ln[sid] = (B, q)
            return
        if t == "tangent_at":
            o, r = self.C(a[0])
            Pp = self.P(a[1])
            self.ln[sid] = (Pp, self.second_point_on_line(v, Pp, f"on_tline {{x}} {Pp} {Pp} {o}"))
            return
        # ---- đường tròn
        if t == "circle":
            self.cr[sid] = (self.P(a[0]), self.P(a[1]))
            return
        if t in ("circle_3pts", "circumcircle"):
            A, B, C = (self.P(x) for x in a)
            self.cr[sid] = (self.circumcenter(A, B, C), A)
            self.cr3[sid] = (A, B, C)
            return
        if t == "incircle":
            A, B, C = (self.P(x) for x in a)
            i = self.incenter(A, B, C)
            self.cr[sid] = (i, self.foot(i, B, C))
            return
        if t == "excircle":
            A, B, C = (self.P(x) for x in a)
            J = G.excenter(self._xy(A), self._xy(B), self._xy(C))
            j = self.add_point(J, [f"excenter {{x}} {A} {B} {C}"], base="j", key=("J", A, frozenset((B, C))))
            self.cr[sid] = (j, self.foot(j, B, C))
            return
        if t == "nine_point_circle":
            A, B, C = (self.P(x) for x in a)
            m1, m2, m3 = self.mid(B, C), self.mid(C, A), self.mid(A, B)
            self.cr[sid] = (self.circumcenter(m1, m2, m3), m1)
            self.cr3[sid] = (m1, m2, m3)
            return
        if t == "circle_diameter":
            A, B = (self.P(x) for x in a)
            self.cr[sid] = (self.mid(A, B), A)
            return
        if t == "circle_tangent_at":
            A, B, C = (self.P(x) for x in a)
            o = self.add_point(v.c, [f"on_tline {{x}} {A} {A} {B}", f"on_bline {{x}} {A} {C}"], base="o")
            self.cr[sid] = (o, A)
            return
        raise NotTranslatable(f"chưa dịch được loại bước '{t}'")

    def _kind(self, sid):
        if sid in self.pt:
            return "point"
        if sid in self.ln:
            return "line"
        if sid in self.cr:
            return "circle"
        return None

    # ---------------------------------------------------------------- mục tiêu
    def goals(self, rel_type, ids, extra_step=None):
        g = []
        if rel_type == "collinear":
            ps = [self.P(i) for i in ids]
            g += [f"coll {ps[0]} {ps[1]} {x}" for x in ps[2:]]
        elif rel_type == "concyclic":
            ps = [self.P(i) for i in ids]
            g += [f"cyclic {ps[0]} {ps[1]} {ps[2]} {x}" for x in ps[3:]]
        elif rel_type == "on_line":
            u, v = self.L(ids[0])
            for i in ids[1:]:
                x = self.P(i)
                if x not in (u, v):
                    g.append(f"coll {u} {v} {x}")
        elif rel_type == "on_circle":
            o, r = self.C(ids[0])
            tri = self.cr3.get(ids[0])
            for i in ids[1:]:
                x = self.P(i)
                if tri and x not in tri:
                    g.append(f"cyclic {tri[0]} {tri[1]} {tri[2]} {x}")
                elif not tri and x != r:
                    g.append(f"cong {o} {r} {o} {x}")
        elif rel_type in ("parallel", "perpendicular"):
            (a, b), (c, d) = self.L(ids[0]), self.L(ids[1])
            g.append(f"{'para' if rel_type == 'parallel' else 'perp'} {a} {b} {c} {d}")
        elif rel_type == "tangent":
            k0, k1 = self._kind(ids[0]), self._kind(ids[1])
            if k0 == "line" or k1 == "line":
                lid, cid = (ids[0], ids[1]) if k0 == "line" else (ids[1], ids[0])
                u, v = self.L(lid)
                o, r = self.C(cid)
                f = self.foot(o, u, v)
                g.append(f"cong {o} {r} {o} {f}")
            else:
                (o1, r1), (o2, r2) = self.C(ids[0]), self.C(ids[1])
                c1, c2 = self.vals[ids[0]], self.vals[ids[1]]
                d = G.unit(G.sub(c2.c, c1.c))
                cands = [G.pt(c1.c.x + c1.r * d.x, c1.c.y + c1.r * d.y), G.pt(c1.c.x - c1.r * d.x, c1.c.y - c1.r * d.y)]
                T = min(cands, key=lambda P: abs(G.dist(P, c2.c) - c2.r))
                t = self.add_point(T, [f"on_line {{x}} {o1} {o2}", f"on_circle {{x}} {o1} {r1}"], base="t")
                g.append(f"cong {o2} {r2} {o2} {t}")
        elif rel_type == "concurrent":
            a, b = ids[0], ids[1]
            X = None
            for P in G.intersect(self.vals[a], self.vals[b]):
                if all(self._on(P, self.vals[c]) for c in ids[2:]):
                    X = P
            if X is None:
                raise NotTranslatable("không xác định được điểm đồng quy")
            x = self.add_point(X, [self.on_curve(a), self.on_curve(b)], base="z")
            for c in ids[2:]:
                if c in self.ln:
                    u, v = self.ln[c]
                    g.append(f"coll {u} {v} {x}")
                elif c in self.cr3:
                    t3 = self.cr3[c]
                    g.append(f"cyclic {t3[0]} {t3[1]} {t3[2]} {x}")
                else:
                    o, r = self.cr[c]
                    g.append(f"cong {o} {r} {o} {x}")
        elif rel_type == "coincide":
            g += self._coincide_goals(ids, extra_step)
        else:
            raise NotTranslatable(f"chưa dịch được quan hệ '{rel_type}'")
        if not g:
            raise NotTranslatable("không có mục tiêu")
        return g

    def _on(self, P, c):
        e = 1e-6 / self.k * 8
        return G.dist_point_line(P, c) < e if c.kind == "line" else abs(G.dist(P, c.c) - c.r) < e

    def _coincide_goals(self, ids, step):
        """Điểm có sẵn E trùng điểm dựng theo cách mới (step): mục tiêu = các tính chất định nghĩa của step tại E."""
        if step is None:
            raise NotTranslatable("thiếu bước dựng mới")
        others = [i for i in ids if i != step["id"]]
        E = self.P(others[0])
        t, a = step["type"], step["args"]
        if t == "midpoint":
            return [f"midp {E} {self.P(a[0])} {self.P(a[1])}"]
        if t in ("foot", "altitude_foot"):
            p, u, v = (self.P(x) for x in a)
            return [f"coll {E} {u} {v}", f"perp {p} {E} {u} {v}"]
        if t == "projection":
            u, v = self.L(a[1])
            return [f"coll {E} {u} {v}", f"perp {self.P(a[0])} {E} {u} {v}"]
        if t in ("circumcenter",):
            A, B, C = (self.P(x) for x in a)
            return [f"cong {E} {A} {E} {B}", f"cong {E} {A} {E} {C}"]
        if t == "orthocenter":
            A, B, C = (self.P(x) for x in a)
            return [f"perp {A} {E} {B} {C}", f"perp {B} {E} {C} {A}"]
        if t == "incenter":
            A, B, C = (self.P(x) for x in a)
            return [f"eqangle {A} {B} {A} {E} {A} {E} {A} {C}", f"eqangle {B} {C} {B} {E} {B} {E} {B} {A}"]
        if t == "reflect" and self._kind(a[1]) == "point":
            return [f"midp {self.P(a[1])} {self.P(a[0])} {E}"]
        if t == "reflect_pts" or (t == "reflect" and self._kind(a[1]) == "line"):
            X = self.P(a[0])
            u, v = (self.P(a[1]), self.P(a[2])) if t == "reflect_pts" else self.L(a[1])
            return [f"cong {u} {X} {u} {E}", f"cong {v} {X} {v} {E}"]
        if t in ("intersection", "intersection_other"):
            g = []
            for c in a[:2]:
                if c in self.ln:
                    u, v = self.ln[c]
                    g.append(f"coll {u} {v} {E}")
                else:
                    o, r = self.cr[c]
                    g.append(f"cong {o} {r} {o} {E}")
            return g
        if t == "center":
            o, r = self.C(a[0])
            raise NotTranslatable("tâm đường tròn trùng điểm: chưa hỗ trợ")
        raise NotTranslatable(f"chưa dịch được quan hệ trùng nhau với bước '{t}'")


def to_jgex(doc, rel_type, ids, extra_step=None) -> JGEXProblem:
    """Bài toán JGEX (văn bản) cho quan hệ rel_type giữa các đối tượng ids của hình doc."""
    tr = Translator(doc)
    first = [s for s in doc["steps"] if s["type"] == "free_point"][:3]
    # ba điểm tự do đầu tiên là tam giác gốc
    if len(first) == 3:
        names = []
        for s in first:
            xy = tr.T(tr.vals[s["id"]])
            n = tr.fresh("p")
            tr.coords[n] = xy
            tr.pt[s["id"]] = n
            names.append(f"{n}@{_fmt(xy[0])}_{_fmt(xy[1])}")
        tr.clauses.append(" ".join(names) + " = triangle " + " ".join(n.split("@")[0] for n in names))
    for s in doc["steps"]:
        if s["id"] in tr.pt and s["type"] == "free_point":
            continue
        tr.step(s)
    goals = tr.goals(rel_type, ids, extra_step)
    if extra_step is not None:
        pass
    text = "; ".join(tr.clauses) + " ? " + "; ".join(goals)
    return JGEXProblem(text=text, names=dict(tr.pt), notes=tr.notes, goals=goals)


def atomic_relations(rel_type, ids):
    """Tách một quan hệ nhiều điểm thành các mục tiêu nguyên tử (mỗi mục tiêu chứng minh riêng)."""
    if rel_type == "collinear" and len(ids) > 3:
        return [(rel_type, [ids[0], ids[1], x]) for x in ids[2:]]
    if rel_type == "concyclic" and len(ids) > 4:
        return [(rel_type, [ids[0], ids[1], ids[2], x]) for x in ids[3:]]
    if rel_type in ("on_line", "on_circle") and len(ids) > 2:
        return [(rel_type, [ids[0], x]) for x in ids[1:]]
    if rel_type == "concurrent" and len(ids) > 3:
        return [(rel_type, [ids[0], ids[1], x]) for x in ids[2:]]
    return [(rel_type, list(ids))]
