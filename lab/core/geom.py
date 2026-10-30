"""Các phép toán hình học cơ bản trên toạ độ – bản Python của src/core/geom.js.

Giữ đúng công thức, thứ tự phép tính và các ngưỡng của bản JS để hai lõi cho cùng kết quả số
(xem lab/tests/test_doi_chieu_js.py).

Biểu diễn giá trị:
    điểm        Pt(x, y)                       (cũng dùng làm vectơ)
    đường       Line(p, d, sub)                đi qua p, vectơ chỉ phương d; sub = 'line' | 'segment' | 'ray'
                                               (đoạn = p → p+d; tia = p theo hướng d)
    đường tròn  Circle(c, r)
None nghĩa là "không xác định" (vd hai đường thẳng song song không có giao điểm).
"""

from __future__ import annotations

import math

EPS = 1e-12


class Pt:
    __slots__ = ("x", "y")
    kind = "point"

    def __init__(self, x: float, y: float):
        self.x = x
        self.y = y

    def __repr__(self):
        return f"Pt({self.x:.6g}, {self.y:.6g})"


class Line:
    __slots__ = ("p", "d", "sub")
    kind = "line"

    def __init__(self, p: Pt, d: Pt, sub: str = "line"):
        self.p = p
        self.d = d
        self.sub = sub

    def __repr__(self):
        return f"Line({self.p}, {self.d}, {self.sub})"


class Circle:
    __slots__ = ("c", "r")
    kind = "circle"

    def __init__(self, c: Pt, r: float):
        self.c = c
        self.r = r

    def __repr__(self):
        return f"Circle({self.c}, {self.r:.6g})"


def pt(x, y):
    return Pt(x, y)


def add(a, b):
    return Pt(a.x + b.x, a.y + b.y)


def sub(a, b):
    return Pt(a.x - b.x, a.y - b.y)


def mul(a, k):
    return Pt(a.x * k, a.y * k)


def dot(a, b):
    return a.x * b.x + a.y * b.y


def cross(a, b):
    return a.x * b.y - a.y * b.x


def norm(a):
    return math.hypot(a.x, a.y)


def dist(a, b):
    return math.hypot(a.x - b.x, a.y - b.y)


def perp(a):
    return Pt(-a.y, a.x)


def unit(a):
    n = norm(a)
    return None if n < EPS else Pt(a.x / n, a.y / n)


def mid(a, b):
    return Pt((a.x + b.x) / 2, (a.y + b.y) / 2)


def finite(*xs):
    return all(math.isfinite(v) for v in xs)


def line(p, d, subtype="line"):
    if p is None or d is None or not finite(p.x, p.y, d.x, d.y) or norm(d) < EPS:
        return None
    return Line(Pt(p.x, p.y), Pt(d.x, d.y), subtype)


def circle(c, r):
    if c is None or r is None or not finite(c.x, c.y, r) or r < EPS:
        return None
    return Circle(Pt(c.x, c.y), r)


def line_through(a, b, subtype="line"):
    return line(a, sub(b, a), subtype)


def project(P, l):
    """Hình chiếu vuông góc của P lên đường thẳng l."""
    t = dot(sub(P, l.p), l.d) / dot(l.d, l.d)
    return Pt(l.p.x + t * l.d.x, l.p.y + t * l.d.y)


def line_param(P, l):
    return dot(sub(P, l.p), l.d) / dot(l.d, l.d)


def dist_point_line(P, l):
    return abs(cross(l.d, sub(P, l.p))) / norm(l.d)


def reflect_point_over_point(P, C):
    return Pt(2 * C.x - P.x, 2 * C.y - P.y)


def reflect_point_over_line(P, l):
    F = project(P, l)
    return Pt(2 * F.x - P.x, 2 * F.y - P.y)


def intersect_ll(l1, l2):
    """Giao hai đường thẳng (theo đường mang, không xét giới hạn đoạn/tia)."""
    den = cross(l1.d, l2.d)
    scale = norm(l1.d) * norm(l2.d)
    if abs(den) < 1e-14 * scale:
        return None
    t = cross(sub(l2.p, l1.p), l2.d) / den
    return Pt(l1.p.x + t * l1.d.x, l1.p.y + t * l1.d.y)


def intersect_lc(l, c):
    """Giao đường thẳng – đường tròn: 0..2 điểm, theo tham số tăng dần dọc vectơ chỉ phương."""
    dd = dot(l.d, l.d)
    f = sub(l.p, c.c)
    b = dot(f, l.d)
    cc = dot(f, f) - c.r * c.r
    disc = b * b - dd * cc
    tol = 1e-12 * max(b * b, dd * c.r * c.r)
    if disc < -tol:
        return []
    if disc < 0:
        disc = 0
    s = math.sqrt(disc)
    t1 = (-b - s) / dd
    t2 = (-b + s) / dd
    return [Pt(l.p.x + t1 * l.d.x, l.p.y + t1 * l.d.y), Pt(l.p.x + t2 * l.d.x, l.p.y + t2 * l.d.y)]


def intersect_cc(c1, c2):
    """Giao hai đường tròn: nghiệm 0 bên PHẢI hướng c1→c2, nghiệm 1 bên TRÁI."""
    D = sub(c2.c, c1.c)
    d = norm(D)
    if d < EPS:
        return []
    a = (d * d + c1.r * c1.r - c2.r * c2.r) / (2 * d)
    h2 = c1.r * c1.r - a * a
    tol = 1e-12 * c1.r * c1.r
    if h2 < -tol:
        return []
    if h2 < 0:
        h2 = 0
    h = math.sqrt(h2)
    u = Pt(D.x / d, D.y / d)
    M = Pt(c1.c.x + a * u.x, c1.c.y + a * u.y)
    n = perp(u)
    return [Pt(M.x - h * n.x, M.y - h * n.y), Pt(M.x + h * n.x, M.y + h * n.y)]


def intersect(o1, o2):
    if o1 is None or o2 is None:
        return []
    k1, k2 = o1.kind, o2.kind
    if k1 == "line" and k2 == "line":
        P = intersect_ll(o1, o2)
        return [P] if P is not None else []
    if k1 == "line" and k2 == "circle":
        return intersect_lc(o1, o2)
    if k1 == "circle" and k2 == "line":
        return intersect_lc(o2, o1)
    if k1 == "circle" and k2 == "circle":
        return intersect_cc(o1, o2)
    return []


def circle_through(A, B, C):
    """Đường tròn qua 3 điểm (None nếu thẳng hàng)."""
    d = 2 * (A.x * (B.y - C.y) + B.x * (C.y - A.y) + C.x * (A.y - B.y))
    s = max(dist(A, B), dist(B, C), dist(C, A))
    if abs(d) < 1e-12 * s * s:
        return None
    a2 = A.x * A.x + A.y * A.y
    b2 = B.x * B.x + B.y * B.y
    c2 = C.x * C.x + C.y * C.y
    ux = (a2 * (B.y - C.y) + b2 * (C.y - A.y) + c2 * (A.y - B.y)) / d
    uy = (a2 * (C.x - B.x) + b2 * (A.x - C.x) + c2 * (B.x - A.x)) / d
    O = Pt(ux, uy)
    return circle(O, dist(O, A))


def triangle_ok(A, B, C):
    s = max(dist(A, B), dist(B, C), dist(C, A))
    return s > EPS and abs(cross(sub(B, A), sub(C, A))) > 1e-12 * s * s


def circumcenter(A, B, C):
    c = circle_through(A, B, C)
    return Pt(c.c.x, c.c.y) if c else None


def centroid(A, B, C):
    if not triangle_ok(A, B, C):
        return None
    return Pt((A.x + B.x + C.x) / 3, (A.y + B.y + C.y) / 3)


def orthocenter(A, B, C):
    O = circumcenter(A, B, C)
    if O is None:
        return None
    return Pt(A.x + B.x + C.x - 2 * O.x, A.y + B.y + C.y - 2 * O.y)


def incenter(A, B, C):
    if not triangle_ok(A, B, C):
        return None
    a, b, c = dist(B, C), dist(C, A), dist(A, B)
    s = a + b + c
    return Pt((a * A.x + b * B.x + c * C.x) / s, (a * A.y + b * B.y + c * C.y) / s)


def inradius(A, B, C):
    I = incenter(A, B, C)
    if I is None:
        return None
    return dist_point_line(I, line_through(B, C))


def nine_point_center(A, B, C):
    O = circumcenter(A, B, C)
    H = orthocenter(A, B, C)
    if O is None or H is None:
        return None
    return mid(O, H)


def angle_bisector(A, B, C, external=False):
    """Phân giác (trong hoặc ngoài) của góc ABC, đỉnh B."""
    u = unit(sub(A, B))
    v = unit(sub(C, B))
    if u is None or v is None:
        return None
    d = sub(u, v) if external else add(u, v)
    if norm(d) < 1e-9:
        d = perp(u)
    s = (dist(A, B) + dist(C, B)) / 2
    return line(B, mul(unit(d), s))


def arc_midpoint(A, B, C, contains_a):
    """Điểm chính giữa cung BC của (ABC); contains_a: cung chứa A hay không."""
    circ = circle_through(A, B, C)
    if circ is None:
        return None
    M = mid(B, C)
    n = unit(perp(sub(C, B)))
    if n is None:
        return None
    side = dot(sub(A, M), n)
    if abs(side) < EPS:
        return None
    sgn = 1 if (side > 0) == contains_a else -1
    return Pt(circ.c.x + sgn * circ.r * n.x, circ.c.y + sgn * circ.r * n.y)


def point_on(obj, t):
    if obj is None:
        return None
    if obj.kind == "line":
        s = t
        if obj.sub == "segment":
            s = min(1, max(0, t))
        elif obj.sub == "ray":
            s = max(0, t)
        return Pt(obj.p.x + s * obj.d.x, obj.p.y + s * obj.d.y)
    if obj.kind == "circle":
        return Pt(obj.c.x + obj.r * math.cos(t), obj.c.y + obj.r * math.sin(t))
    return None


def param_of(obj, P):
    if obj.kind == "line":
        t = line_param(P, obj)
        if obj.sub == "segment":
            t = min(1, max(0, t))
        elif obj.sub == "ray":
            t = max(0, t)
        return t
    if obj.kind == "circle":
        return math.atan2(P.y - obj.c.y, P.x - obj.c.x)
    return 0


def dist_to_object(obj, P):
    if obj is None:
        return math.inf
    if obj.kind == "point":
        return dist(obj, P)
    if obj.kind == "circle":
        return abs(dist(obj.c, P) - obj.r)
    if obj.kind == "line":
        return dist(point_on(obj, param_of(obj, P)), P)
    return math.inf


def reflect_object(X, M):
    if X is None or M is None:
        return None
    if M.kind == "point":
        f = lambda P: reflect_point_over_point(P, M)  # noqa: E731
    else:
        f = lambda P: reflect_point_over_line(P, M)  # noqa: E731
    if X.kind == "point":
        return f(X)
    if X.kind == "line":
        a = f(X.p)
        b = f(add(X.p, X.d))
        return line(a, sub(b, a), X.sub)
    if X.kind == "circle":
        return circle(f(X.c), X.r)
    return None


# ======================= Phép biến hình =======================
def rotate_point(P, O, deg):
    a = deg * math.pi / 180
    c, s = math.cos(a), math.sin(a)
    x, y = P.x - O.x, P.y - O.y
    return Pt(O.x + c * x - s * y, O.y + s * x + c * y)


def homothety_point(P, O, k):
    return Pt(O.x + k * (P.x - O.x), O.y + k * (P.y - O.y))


def translate_point(P, A, B):
    return Pt(P.x + B.x - A.x, P.y + B.y - A.y)


def invert_point(P, c):
    dx, dy = P.x - c.c.x, P.y - c.c.y
    d2 = dx * dx + dy * dy
    if d2 < EPS * EPS:
        return None
    k = c.r * c.r / d2
    return Pt(c.c.x + k * dx, c.c.y + k * dy)


# ---- Nghịch đảo đường thẳng / đường tròn, góc và đồng dạng lấy trên hình (bản 1.2) ----
def _passes_through(X, O):
    if X.kind == "line":
        return dist_point_line(O, X) <= 1e-7 * max(norm(X.d), dist(O, X.p))
    return abs(dist(O, X.c) - X.r) <= 1e-7 * X.r


def invert_to_line(X, c):
    """Ảnh của đường thẳng/đường tròn X đi qua tâm nghịch đảo: một đường thẳng (None nếu không qua tâm)."""
    if X is None or c is None:
        return None
    O = c.c
    if not _passes_through(X, O):
        return None
    if X.kind == "line":
        return line(X.p, X.d)
    P = invert_point(Pt(2 * X.c.x - O.x, 2 * X.c.y - O.y), c)
    return line(P, perp(sub(X.c, O))) if P is not None else None


def invert_to_circle(X, c):
    """Ảnh của đường thẳng/đường tròn X không qua tâm nghịch đảo: một đường tròn."""
    if X is None or c is None:
        return None
    O, k2 = c.c, c.r * c.r
    if _passes_through(X, O):
        return None
    if X.kind == "line":
        F = invert_point(project(O, X), c)
        return circle(mid(O, F), dist(O, F) / 2) if F is not None else None
    v = sub(X.c, O)
    s = k2 / (dot(v, v) - X.r * X.r)
    return circle(Pt(O.x + s * v.x, O.y + s * v.y), abs(s) * X.r)


def directed_angle(A, B, C):
    u, v = sub(A, B), sub(C, B)
    if norm(u) < EPS or norm(v) < EPS:
        return None
    return math.atan2(cross(u, v), dot(u, v)) * 180 / math.pi


def spiral_point(P, O, A, B):
    a, b = sub(A, O), sub(B, O)
    a2 = dot(a, a)
    if a2 < EPS * EPS:
        return None
    re, im = dot(a, b) / a2, cross(a, b) / a2
    x, y = P.x - O.x, P.y - O.y
    return Pt(O.x + re * x - im * y, O.y + im * x + re * y)


def map_object(X, f):
    """Áp phép biến đổi điểm f cho điểm / đường thẳng / đường tròn (phép đồng dạng)."""
    if X is None:
        return None
    if X.kind == "point":
        return f(X)
    if X.kind == "line":
        a, b = f(X.p), f(add(X.p, X.d))
        return line(a, sub(b, a), X.sub) if a is not None and b is not None else None
    if X.kind == "circle":
        c, q = f(X.c), f(add(X.c, Pt(X.r, 0)))
        return circle(c, dist(c, q)) if c is not None and q is not None else None
    return None


# ======================= Tiếp tuyến, đẳng phương, vị tự =======================
def tangent_at(c, P):
    r = sub(P, c.c)
    if norm(r) < EPS:
        return None
    return line(P, perp(r))


def tangent_points(c, P):
    M = mid(c.c, P)
    return intersect_cc(c, Circle(M, dist(M, P)))


def common_tangent(c1, c2, internal, which):
    D = sub(c2.c, c1.c)
    d2 = dot(D, D)
    k = (-c2.r if internal else c2.r) - c1.r
    h2 = d2 - k * k
    if d2 < EPS or h2 < -1e-12 * d2:
        return None
    h = math.sqrt(max(0, h2))
    sg = 1 if which else -1
    n = Pt((k * D.x + sg * h * -D.y) / d2, (k * D.y + sg * h * D.x) / d2)
    T1 = Pt(c1.c.x - c1.r * n.x, c1.c.y - c1.r * n.y)
    s2 = -1 if internal else 1
    T2 = Pt(c2.c.x - s2 * c2.r * n.x, c2.c.y - s2 * c2.r * n.y)
    direction = sub(T2, T1) if dist(T1, T2) > EPS else perp(n)
    return line(T1, direction)


def radical_axis(c1, c2):
    D = sub(c2.c, c1.c)
    d = norm(D)
    if d < EPS:
        return None
    t = (d * d + c1.r * c1.r - c2.r * c2.r) / (2 * d)
    u = Pt(D.x / d, D.y / d)
    return line(Pt(c1.c.x + t * u.x, c1.c.y + t * u.y), perp(D))


def radical_center(c1, c2, c3):
    a, b = radical_axis(c1, c2), radical_axis(c1, c3)
    return intersect_ll(a, b) if a is not None and b is not None else None


def homothety_center(c1, c2, internal):
    if internal:
        s = c1.r + c2.r
        return Pt((c2.r * c1.c.x + c1.r * c2.c.x) / s, (c2.r * c1.c.y + c1.r * c2.c.y) / s)
    s = c2.r - c1.r
    if abs(s) < 1e-12 * max(c1.r, c2.r):
        return None
    return Pt((c2.r * c1.c.x - c1.r * c2.c.x) / s, (c2.r * c1.c.y - c1.r * c2.c.y) / s)


# ======================= Tam giác: toạ độ tỉ cự =======================
def _area2(P, Q, R):
    return cross(sub(Q, P), sub(R, P))


def barycentric(P, A, B, C):
    return [_area2(P, B, C), _area2(P, C, A), _area2(P, A, B)]


def from_barycentric(u, v, w, A, B, C):
    s = u + v + w
    m = max(abs(u), abs(v), abs(w))
    if not (m > 0) or abs(s) < 1e-12 * m:
        return None
    return Pt((u * A.x + v * B.x + w * C.x) / s, (u * A.y + v * B.y + w * C.y) / s)


def _sides2(A, B, C):
    return [dist(B, C) ** 2, dist(C, A) ** 2, dist(A, B) ** 2]


def excenter(A, B, C):
    if not triangle_ok(A, B, C):
        return None
    a, b, c = dist(B, C), dist(C, A), dist(A, B)
    return from_barycentric(-a, b, c, A, B, C)


def isogonal_conjugate(P, A, B, C):
    if not triangle_ok(A, B, C):
        return None
    u, v, w = barycentric(P, A, B, C)
    sc = abs(_area2(A, B, C))
    if any(abs(x) < 1e-12 * sc for x in (u, v, w)):
        return None
    a2, b2, c2 = _sides2(A, B, C)
    return from_barycentric(a2 / u, b2 / v, c2 / w, A, B, C)


def lemoine(A, B, C):
    if not triangle_ok(A, B, C):
        return None
    a2, b2, c2 = _sides2(A, B, C)
    return from_barycentric(a2, b2, c2, A, B, C)


def symmedian_foot(A, B, C):
    if not triangle_ok(A, B, C):
        return None
    b2, c2 = dist(C, A) ** 2, dist(A, B) ** 2
    return Pt((b2 * B.x + c2 * C.x) / (b2 + c2), (b2 * B.y + c2 * C.y) / (b2 + c2))


def kosnita(A, B, C):
    N = nine_point_center(A, B, C)
    return isogonal_conjugate(N, A, B, C) if N is not None else None


def isogonal_line(B, A, C, P):
    u, v, p = unit(sub(B, A)), unit(sub(C, A)), sub(P, A)
    if u is None or v is None or norm(p) < EPS:
        return None
    w = add(u, v)
    w = perp(u) if norm(w) < 1e-9 else unit(w)
    k = 2 * dot(p, w)
    return line(A, Pt(k * w.x - p.x, k * w.y - p.y))


def circle_tangent_at(A, B, C):
    l1 = line(A, perp(sub(B, A)))
    l2 = None if dist(A, C) < EPS else line(mid(A, C), perp(sub(C, A)))
    if l1 is None or l2 is None:
        return None
    O = intersect_ll(l1, l2)
    return circle(O, dist(O, A)) if O is not None else None


def mixtilinear(A, B, C, external=False):
    circ = circle_through(A, B, C)
    if circ is None:
        return None
    u0, v0 = unit(sub(B, A)), unit(sub(C, A))
    u = unit(add(u0, v0))
    if u is None:
        return None
    s = abs(cross(u, u0))
    c2 = 1 - s * s
    AO = sub(A, circ.c)
    t = (-2 * (dot(u, AO) + (-1 if external else 1) * circ.r * s)) / c2
    if not (t > 0):
        return None
    return circle(Pt(A.x + t * u.x, A.y + t * u.y), t * s)


# ======================= ĐIỂM THOẢ ĐIỀU KIỆN (bản 1.8) – giống hệt solvePoint trong src/core/geom.js =======================
SOLVE_ITERS = 60


def _cond_angle(A, B, C):
    a = directed_angle(A, B, C)
    return math.nan if a is None else abs(a) * math.pi / 180


def _cond_residual(c, P, objs):
    a = c["a"]

    def g(i):
        return P if i < 0 else objs[i]

    t = c["t"]
    if t == "on":
        X = objs[a[0]]
        if X.kind == "line":
            return cross(unit(X.d), sub(P, X.p))
        return dist(P, X.c) - X.r
    if t == "len":
        return dist(g(a[0]), g(a[1])) - dist(g(a[2]), g(a[3]))
    if t == "ang":
        return _cond_angle(g(a[0]), g(a[1]), g(a[2])) - _cond_angle(g(a[3]), g(a[4]), g(a[5]))
    if t == "angv":
        return _cond_angle(g(a[0]), g(a[1]), g(a[2])) - c["v"] * math.pi / 180
    return math.nan


def solve_point(objs, conds, x0, y0):
    n = len(conds)
    if n < 1 or n > 2:
        return None
    S = 0.0
    for o in objs:
        q = o if o.kind == "point" else (o.c if o.kind == "circle" else o.p)
        S = max(S, math.hypot(q.x - x0, q.y - y0))
        if o.kind == "circle":
            S = max(S, o.r)
    if not S > 0:
        S = 1.0
    h = 1e-6 * S

    def R(x, y):
        P = pt(x, y)
        return [_cond_residual(c, P, objs) for c in conds]

    x, y = x0, y0
    for _ in range(SOLVE_ITERS):
        r = R(x, y)
        if any(not math.isfinite(v) for v in r):
            return None
        rx1, rx0, ry1, ry0 = R(x + h, y), R(x - h, y), R(x, y + h), R(x, y - h)
        J = [[(rx1[i] - rx0[i]) / (2 * h), (ry1[i] - ry0[i]) / (2 * h)] for i in range(n)]
        if n == 1:
            g2 = J[0][0] * J[0][0] + J[0][1] * J[0][1]
            if not g2 > 1e-300:
                return None
            dx = (r[0] * J[0][0]) / g2
            dy = (r[0] * J[0][1]) / g2
        else:
            det = J[0][0] * J[1][1] - J[0][1] * J[1][0]
            if not abs(det) > 1e-300:
                return None
            dx = (r[0] * J[1][1] - r[1] * J[0][1]) / det
            dy = (J[0][0] * r[1] - J[1][0] * r[0]) / det
        L = math.hypot(dx, dy)
        if L > 0.5 * S:
            dx *= (0.5 * S) / L
            dy *= (0.5 * S) / L
        x -= dx
        y -= dy
        if L < 1e-13 * S:
            break
    r = R(x, y)
    for c, v in zip(conds, r):
        lim = 1e-9 if c["t"] in ("ang", "angv") else 1e-9 * S
        if not (math.isfinite(v) and abs(v) < lim):
            return None
    return pt(x, y)
