"""BỘ SUY LUẬN "ĐUỔI GÓC" để đo độ khó của một sự kiện.

Ý tưởng (giống phần AR của AlphaGeometry/Newclid, nhưng xử lý góc có hướng bằng số):
* Mỗi đường thẳng (qua hai điểm, hoặc một đối tượng đường thẳng của hình) có một biến "hướng" d(·) (mod π).
* Sự kiện đã biết → phương trình tuyến tính nguyên giữa các hướng:
      thẳng hàng  d(XY) = d(XZ)          song song d(a) = d(b)        vuông góc d(a) − d(b) = π/2
      đồng viên   d(CA) − d(CB) = d(DA) − d(DB)
      cân (OX = OY, O tâm)               d(XO) + d(YO) = 2 d(XY)
      phân giác / đẳng giác / đối xứng / tiếp tuyến – dây cung…
* Một quan hệ SUY RA ĐƯỢC nếu phương trình của nó nằm trong không gian sinh bởi các phương trình đã biết (hệ số hữu
  tỉ). Hằng số (bội của π/2) và nhánh "mod π/2" khi chia đôi góc được quyết định bằng số – đúng như người giải dùng
  hình vẽ để chọn trường hợp – nên bộ này không vấp lỗi "2x = 2y" như Newclid.
* Lớp AFFINE: điểm dựng bằng trung điểm, đối xứng qua điểm / qua đường (qua chân đường vuông góc "ảo"), trọng tâm,
  vị tự, tịnh tiến, tâm Euler (N trung điểm OH, H = A + B + C − 2O) được viết thành tổ hợp tuyến tính của các điểm
  "gốc"; hai cặp điểm có hiệu tỉ lệ ⇒ hai đường song song (đường trung bình, vị tự, hình bình hành…).
  Trung điểm M của XY và điểm O cách đều X, Y ⇒ OM ⊥ XY.
* Lớp ĐỘ DÀI (đuổi tỉ số, biến log|XY|): cách đều tâm, tỉ số của hai cặp song song trong lớp affine, phương tích
  (PA·PB = PC·PD, PT² = PA·PB với tiếp tuyến). Cân suy ra từ góc ⇔ bằng nhau về độ dài; mục tiêu đồng viên cũng được
  chấp nhận qua đảo phương tích, điểm trên đường tròn qua bán kính bằng nhau.
* Suy diễn theo VÒNG: ở mỗi vòng, mọi bộ 3 điểm thẳng hàng / 4 điểm đồng viên / góc vuông ĐÚNG BẰNG SỐ mà suy ra được
  thì thành sự kiện mới (sinh thêm phương trình; tứ giác nội tiếp có tâm đã biết → thêm điểm cách đều tâm…).

MỨC ĐỘ KHÓ = số vòng cần để suy ra kết luận (1 = đuổi góc thẳng từ giả thiết; 2 = cần một tứ giác nội tiếp / thẳng
hàng trung gian; …); None = không suy ra được bằng đuổi góc (cần tỉ số, điểm phụ, … → "khó").
"""

from __future__ import annotations

import itertools
import math

import numpy as np

from ..core import geom as G
from ..core.model import evaluate, kinds
from ..core.steps import STEP_TYPES

LINE_TYPES = {"line", "segment", "ray"}


class Span:
    """Không gian sinh bởi các phương trình (vectơ hệ số), cơ sở trực chuẩn tăng dần."""

    def __init__(self, n):
        self.n = n
        self.Q = np.zeros((0, n))

    def resize(self, n):
        if n > self.n:
            self.Q = np.hstack([self.Q, np.zeros((self.Q.shape[0], n - self.n))])
            self.n = n

    def residual(self, v):
        if self.Q.shape[0]:
            v = v - self.Q.T @ (self.Q @ v)
        return v

    def contains(self, v, tol=1e-7):
        r = self.residual(v)
        return float(np.linalg.norm(r)) <= tol * max(1.0, float(np.linalg.norm(v)))

    def add(self, v, tol=1e-9):
        r = self.residual(v)
        r = self.residual(r)  # trực chuẩn hoá lại cho ổn định số
        nr = float(np.linalg.norm(r))
        if nr > tol * max(1.0, float(np.linalg.norm(v))):
            self.Q = np.vstack([self.Q, r / nr])
            return True
        return False


class AngleChaser:
    def __init__(self, doc, known=(), max_rounds=5, classical=True, strict=True):
        self.doc = doc
        self.vals = evaluate(doc)
        self.kind = kinds(doc)
        self.max_rounds = max_rounds
        self.strict = strict  # nghiêm ngặt: không gán tính chất cho điểm thật chỉ vì trùng toạ độ với điểm ảo
        self.pts = [s["id"] for s in doc["steps"] if self.kind.get(s["id"]) == "point" and self.vals.get(s["id"]) is not None]
        P = [self.vals[p] for p in self.pts]
        xs = [p.x for p in P] or [0]
        ys = [p.y for p in P] or [0]
        self.scale = max(max(xs) - min(xs), max(ys) - min(ys), 1e-9)
        self.eps = 1e-8 * self.scale
        self.var = {}
        self.eqs = []
        self.span = Span(0)
        self.lines = {}  # đối tượng đường thẳng / đường ảo → tập điểm đã biết nằm trên nó
        self.circles = []  # [tập điểm, tâm hoặc None]
        self.centers = {}  # tâm O → tập điểm cách đều O (đã biết)
        self.known_col = set()
        self.known_cyc = set()
        self.diam = {s["id"]: tuple(s["args"]) for s in doc["steps"] if s["type"] == "circle_diameter"}
        self.midpoints = {s["id"]: tuple(s["args"]) for s in doc["steps"] if s["type"] == "midpoint"}
        self.mids = [(m, a, b) for m, (a, b) in self.midpoints.items()]  # mọi bộ (trung điểm, hai đầu) đã biết
        self._pb_done = set()
        self.reflections = []  # (P, ảnh, U, V): ảnh = đối xứng của P qua đường UV
        self._ax_done = set()
        self.lvar = {}  # biến log-độ dài
        self.leqs = []
        self.lspan = Span(0)
        self._pow_done = set()
        self._alt_done = set()
        self._sim_done = set()
        self.tangents = []  # (đường tròn, tiếp điểm, đường tiếp tuyến hoặc None, điểm ngoài hoặc None)
        # ---- lời giải: mỗi phương trình mang nhãn "sự kiện" sinh ra nó; sự kiện suy ra có "mục tiêu" để giải ngược
        self.facts = []  # dict(text, kind, round, targets, ne, nl)
        self.elog, self.llog = [], []
        self._tag = None
        self.round = 0
        self.vname = {}  # tên hiển thị của điểm ảo
        self._defs = {}
        self.goal_leaves = []
        self._build()
        self._reflected_circles()
        self._virtual_centers()
        self.extra_mid = []
        self._partner_feet()
        self._reflection_feet()
        self._virtual_midpoints()
        if classical:
            self._classical()
        self._affine()
        self._axis_points()
        self._perp_bisectors()
        ids_doc = {s["id"] for s in doc["steps"]}
        for f in known:
            self._fact("Đã biết: " + self._ftext(f), "biet")
            refs = [x for v in f.values() for x in v if isinstance(x, str)]
            if "col" in f or "cyc" in f:
                key = "col" if "col" in f else "cyc"
                sub = [x for x in f[key] if x in ids_doc]
                if len(sub) >= (3 if key == "col" else 4):
                    self._add_fact({key: sub})
            elif all(r in ids_doc for r in refs):
                self._add_fact(f)

    # ---------------------------------------------------------------- biến và phương trình
    def v(self, key):
        if key not in self.var:
            self.var[key] = len(self.var)
        return self.var[key]

    def pair(self, a, b):
        if a == b:
            return None
        return self.v(("P",) + tuple(sorted((a, b))))

    def _vec(self, terms):
        n = len(self.var)
        vec = np.zeros(n)
        for idx, c in terms:
            vec[idx] += c
        return vec

    def equation(self, terms):
        """Thêm phương trình Σ c·d(var) ≡ const (mod π)."""
        terms = [(i, c) for i, c in terms if i is not None]
        if not terms:
            return
        self.eqs.append(terms)
        self.elog.append((terms, self._tag))

    def _flush(self):
        self.span.resize(len(self.var))
        for terms in self.eqs:
            self.span.add(self._vec(terms))
        self.eqs = []

    def derivable(self, terms):
        if any(i is None for i, _ in terms):
            return False
        self._flush()
        vec = self._vec(terms)
        if float(np.linalg.norm(vec)) < 1e-12:
            return True
        self.span.resize(len(self.var))
        return self.span.contains(vec)

    # ---------------------------------------------------------------- độ dài (log)
    def L(self, a, b):
        if a == b:
            return None
        k = tuple(sorted((a, b)))
        if k not in self.lvar:
            self.lvar[k] = len(self.lvar)
        return self.lvar[k]

    def lequation(self, terms):
        terms = [(i, c) for i, c in terms if i is not None]
        if terms:
            self.leqs.append(terms)
            self.llog.append((terms, self._tag))

    def _lvec(self, terms):
        vec = np.zeros(len(self.lvar))
        for idx, c in terms:
            vec[idx] += c
        return vec

    def lderivable(self, terms):
        if any(i is None for i, _ in terms):
            return False
        self.lspan.resize(len(self.lvar))
        for t in self.leqs:
            self.lspan.add(self._lvec(t))
        self.leqs = []
        vec = self._lvec(terms)
        if float(np.linalg.norm(vec)) < 1e-12:
            return True
        self.lspan.resize(len(self.lvar))
        return self.lspan.contains(vec)

    def eq_len(self, o, x, y):
        return [(self.L(o, x), 1), (self.L(o, y), -1)]

    # ---------------------------------------------------------------- lời giải: tên, sự kiện
    def nm(self, x):
        if x in self.vname:
            return self.vname[x]
        from ..present import label_text

        st = next((t for t in self.doc["steps"] if t["id"] == x), None)
        return label_text(st.get("name")) if st and st.get("name") else str(x)

    def ns(self, *xs):
        return "".join(self.nm(x) for x in xs)

    def _fact(self, text, kind="suy", targets=None):
        """Đăng ký một sự kiện (nhãn cho các phương trình sắp thêm). targets: [(không gian 'a'|'l', phương trình)] –
        những gì cần suy ra được để có sự kiện này (dùng khi giải ngược)."""
        self.facts.append({"text": text, "kind": kind, "round": self.round, "targets": targets or [],
                           "ne": len(self.elog), "nl": len(self.llog)})
        self._tag = len(self.facts) - 1
        return self._tag

    def _def(self, st):
        """Nhãn "theo cách dựng" của một bước."""
        if st["id"] not in self._defs:
            from ..present import Namer, _step_sentence, label_text

            try:
                txt = _step_sentence(Namer(self.doc, label_text), st) or ""
            except Exception:  # noqa: BLE001
                txt = ""
            txt = txt.rstrip(".") or f"{self.nm(st['id'])}: {STEP_TYPES[st['type']].label.lower()}"
            self._fact("Giả thiết: " + txt, "gt")
            self._defs[st["id"]] = self._tag
        self._tag = self._defs[st["id"]]

    def _aux_point(self, pid, P, desc):
        """Thêm điểm phụ (ảo) – có tên Z₁, Z₂… và câu "Lấy điểm phụ…" trong lời giải."""
        sub = "₀₁₂₃₄₅₆₇₈₉"
        k = sum(1 for f in self.facts if f["kind"] == "phu") + 1
        self.vname[pid] = "Z" + "".join(sub[int(c)] for c in str(k))
        self.vals[pid], self.kind[pid] = P, "point"
        self.pts.append(pid)
        self._fact(f"Lấy điểm phụ {self.vname[pid]}: {desc}", "phu")
        self._vfact = getattr(self, "_vfact", {})
        self._vfact[pid] = self._tag

    def _ftext(self, f):
        if "col" in f:
            return ", ".join(self.nm(x) for x in f["col"]) + " thẳng hàng"
        if "cyc" in f:
            return ", ".join(self.nm(x) for x in f["cyc"]) + " cùng nằm trên một đường tròn"
        if "on" in f:
            p, ref = f["on"]
            return f"{self.nm(p)} nằm trên {self.nm(ref) if isinstance(ref, str) else 'một đường'}"
        if "par" in f or "perp" in f:
            return "hai đường " + ("song song" if "par" in f else "vuông góc")
        return "quan hệ đã biết"

    def loi_giai(self):
        """Lời giải từng bước (sau khi level() thành công): danh sách dict {loai, text, vi} theo thứ tự trình bày."""
        if not self.goal_leaves:
            return None
        self._flush()
        ex = {"a": _Explainer(self.elog, len(self.var)), "l": _Explainer(self.llog, len(self.lvar))}
        need, stack = set(), []

        def add(tags):
            for t_ in tags or ():
                if t_ is not None and t_ not in need:
                    need.add(t_)
                    stack.append(t_)

        top = set()
        affpar = False
        for (sp, terms), ne, nl in self.goal_leaves:
            if sp == "affpar":
                affpar = True
                continue
            sup = ex[sp].support(terms, ne if sp == "a" else nl)
            top |= sup or set()
            add(sup)
        deps = {}
        while stack:
            fid = stack.pop()
            f = self.facts[fid]
            ds = set()
            for sp, terms in f["targets"]:
                if sp == "affpar":
                    continue
                sup = ex[sp].support(terms, f["ne"] if sp == "a" else f["nl"])
                ds |= sup or set()
            ds.discard(fid)
            deps[fid] = ds
            add(ds)
        # điểm phụ được nhắc tới trong lời giải thì phải có câu "Lấy điểm phụ…"
        vf = getattr(self, "_vfact", {})
        by_name = {self.vname[p_]: vf[p_] for p_ in vf if p_ in self.vname}
        changed = True
        while changed:
            changed = False
            for i in list(need):
                for nm_, fid in by_name.items():
                    if fid not in need and nm_ in self.facts[i]["text"]:
                        need.add(fid)
                        changed = True
        given = sorted((i for i in need if self.facts[i]["kind"] != "suy"), key=lambda i: (self.facts[i]["kind"] != "phu", i))
        derived = sorted((i for i in need if self.facts[i]["kind"] == "suy"), key=lambda i: (self.facts[i]["round"], i))
        label = {}
        out = []
        for k_, i in enumerate(given, 1):
            label[i] = f"({k_})"
            out.append({"loai": self.facts[i]["kind"], "so": label[i], "text": self.facts[i]["text"], "vi": []})
        for k_, i in enumerate(derived, 1):
            label[i] = f"[{k_}]"
        for i in derived:
            out.append({"loai": "suy", "so": label[i], "text": self.facts[i]["text"],
                        "vi": sorted((label[d] for d in deps.get(i, ()) if d in label), key=lambda x: (x[0], int(x[1:-1])))})
        # đánh số lại điểm phụ Z₁, Z₂… theo thứ tự xuất hiện trong lời giải
        sub = "₀₁₂₃₄₅₆₇₈₉"
        used = [nm_ for nm_ in sorted(by_name, key=lambda n_: by_name[n_]) if by_name[nm_] in need]
        ren = {old_: "Z" + "".join(sub[int(c)] for c in str(k_)) for k_, old_ in enumerate(used, 1)}
        if ren:
            import re as _re

            pat = _re.compile("|".join(sorted(map(_re.escape, ren), key=len, reverse=True)))
            for o_ in out:
                o_["text"] = pat.sub(lambda m_: ren[m_.group(0)], o_["text"])
        vi = sorted((label[d] for d in top if d in label), key=lambda x: (x[0], int(x[1:-1])))
        out.append({"loai": "ket_luan", "so": "⇒", "text": "Kết luận" + (" (tổ hợp các vectơ cùng phương)" if affpar else ""),
                    "vi": vi})
        return out

    def _leaves(self, g):
        """Các phương trình lá đã được thoả của mục tiêu g (để giải ngược)."""
        rec = []
        self._goal_ok(g, rec)
        return rec

    # ---------------------------------------------------------------- các dạng sự kiện
    def eq_col(self, a, b, c):
        return [(self.pair(a, b), 1), (self.pair(a, c), -1)]

    def col_any(self, a, b, c):
        """Ba điểm thẳng hàng: một trong ba đẳng thức hướng là đủ (hai đường qua một điểm chung cùng hướng)."""
        return ("any", [self.eq_col(a, b, c), self.eq_col(b, a, c), self.eq_col(c, a, b)])

    def eq_cyc(self, a, b, c, d):
        # ∠(CA, CB) = ∠(DA, DB)
        return [(self.pair(c, a), 1), (self.pair(c, b), -1), (self.pair(d, a), -1), (self.pair(d, b), 1)]

    def eq_iso(self, o, x, y):
        # OX = OY ⇒ d(XO) + d(YO) = 2 d(XY)
        return [(self.pair(x, o), 1), (self.pair(y, o), 1), (self.pair(x, y), -2)]

    def add_col(self, pts):
        pts = list(dict.fromkeys(pts))
        for c in pts[2:]:
            self.equation(self.eq_col(pts[0], pts[1], c))
        for i in range(len(pts)):
            for j in range(i + 1, len(pts)):
                for k in range(j + 1, len(pts)):
                    self.known_col.add(frozenset((pts[i], pts[j], pts[k])))
        # mọi cặp trên cùng đường có cùng hướng
        for x in pts[2:]:
            self.equation([(self.pair(pts[0], x), 1), (self.pair(pts[0], pts[1]), -1)])
        for i in range(1, len(pts)):
            for j in range(i + 1, len(pts)):
                self.equation([(self.pair(pts[i], pts[j]), 1), (self.pair(pts[0], pts[1]), -1)])

    def add_cyc(self, pts):
        pts = list(dict.fromkeys(pts))
        if len(pts) < 4:
            return
        for quad in itertools.combinations(pts, 4):
            a, b, c, d = quad
            self.equation(self.eq_cyc(a, b, c, d))
            self.equation(self.eq_cyc(a, c, b, d))
            self.known_cyc.add(frozenset(quad))
        # tâm đã biết của đường tròn chứa ≥ 3 điểm này → thêm điểm cách đều
        for o, eq in list(self.centers.items()):
            if len(eq & set(pts)) >= 3:
                for x in pts:
                    if x not in eq and x != o:
                        self.add_center_point(o, x)

    def add_center_point(self, o, x):
        s = self.centers.setdefault(o, set())
        if x in s or x == o:
            return
        for y in s:
            if y != x:
                self.equation(self.eq_iso(o, x, y))
                self.lequation(self.eq_len(o, x, y))
        s.add(x)
        # điểm cách đều tâm của một đường tròn đã biết → nằm trên đường tròn đó
        for e in self.circles:
            if e[1] == o and x not in e[0] and (e[0] & s):
                self.on_circle(x, e[2])

    def line_var(self, ref):
        """Biến hướng của một đường (id đối tượng hoặc tham chiếu ảo)."""
        if isinstance(ref, str):
            st = next((s for s in self.doc["steps"] if s["id"] == ref), None)
            if st and st["type"] in LINE_TYPES:
                return self.pair(*st["args"])
            key = ("L", ref)
        elif "L" in ref:
            return self.pair(*ref["L"])
        elif "PB" in ref:
            a, b = ref["PB"]
            key = ("PB",) + tuple(sorted((a, b)))
            idx = self.v(key)
            self.equation([(idx, 1), (self.pair(a, b), -1)])  # (+π/2)
            return idx
        elif "AB" in ref:
            a, vtx, c = ref["AB"]
            key = ("AB", vtx) + tuple(sorted((a, c)))
            idx = self.v(key)
            self.equation([(idx, 2), (self.pair(vtx, a), -1), (self.pair(vtx, c), -1)])
            self.lines.setdefault(key, set()).add(vtx)
            return idx
        else:
            return None
        return self.v(key)

    def on_line(self, p, ref):
        idx = self.line_var(ref)
        if idx is None:
            return
        key = ref if isinstance(ref, str) else ("ref", repr(sorted(ref.items())))
        if isinstance(ref, dict) and "AB" in ref:
            a, vtx, c = ref["AB"]
            key = ("AB", vtx) + tuple(sorted((a, c)))
        s = self.lines.setdefault(key, set())
        if not s and isinstance(ref, str):
            st = next((x for x in self.doc["steps"] if x["id"] == ref), None)
            if st and st["type"] in LINE_TYPES:
                s |= set(st["args"])  # hai điểm xác định đường thẳng
        for q in s:
            if q != p:
                self.equation([(self.pair(p, q), 1), (idx, -1)])
        s.add(p)
        self._line_idx = getattr(self, "_line_idx", {})
        self._line_idx[key] = idx

    def circle_entity(self, ref):
        if isinstance(ref, str):
            key = ref
        elif "C" in ref:
            key = ("C",) + tuple(sorted(ref["C"]))
        elif "IC" in ref:
            key = ("IC",) + tuple(sorted(ref["IC"]))
        else:
            return None
        for e in self.circles:
            if e[2] == key:
                return e
        e = [set(), None, key]
        if isinstance(ref, dict) and "C" in ref:
            e[0] |= set(ref["C"])
        self.circles.append(e)
        return e

    def on_circle(self, p, ref):
        e = self.circle_entity(ref)
        if e is None:
            return
        e[0].add(p)
        diam = self.diam.get(e[2]) if isinstance(e[2], str) else None
        if diam and p not in diam:
            self.equation([(self.pair(p, diam[0]), 1), (self.pair(p, diam[1]), -1)])  # (+π/2) Thales
        if e[1] is not None:
            self.add_center_point(e[1], p)
        if len(e[0]) >= 4:
            self.add_cyc(sorted(e[0]))

    # ---------------------------------------------------------------- dựng hệ phương trình từ hình
    def _add_fact(self, f):
        if "col" in f:
            self.add_col(f["col"])
        elif "cyc" in f:
            self.add_cyc(f["cyc"])
        elif "on" in f:
            p, ref = f["on"]
            k = self.kind.get(ref) if isinstance(ref, str) else ("circle" if ("C" in ref or "IC" in ref) else "line")
            if k == "circle":
                self.on_circle(p, ref)
            elif k == "line":
                self.on_line(p, ref)
        elif "par" in f or "perp" in f:
            a, b = (self.line_var(r) for r in (f.get("par") or f.get("perp")))
            if a is not None and b is not None:
                self.equation([(a, 1), (b, -1)])
        elif "tan" in f:
            pass  # tiếp xúc: dùng qua bước tangent_at (góc tạo bởi tiếp tuyến và dây cung)

    def _build(self):
        steps = self.doc["steps"]
        by = {s["id"]: s for s in steps}
        k = self.kind
        for s in steps:
            d = STEP_TYPES.get(s["type"])
            if d is None or d.facts is None:
                continue
            self._def(s)
            try:
                facts = d.facts(s, [k.get(a) for a in s["args"]], self.doc) or []
            except Exception:  # noqa: BLE001
                facts = []
            for f in facts:
                self._add_fact(f)
        # tâm của các đường tròn
        for s in steps:
            t, a, sid = s["type"], s["args"], s["id"]
            self._def(s)
            if t == "circle":
                e = self.circle_entity(sid)
                e[1] = a[0]
                self.add_center_point(a[0], a[1])
                for p in list(e[0]):
                    self.add_center_point(a[0], p)
            elif t in ("circumcenter",):
                for x in a:
                    self.add_center_point(sid, x)
            elif t == "center":
                c = by.get(a[0])
                e = self.circle_entity(a[0])
                e[1] = sid
                if c and c["type"] in ("circle_3pts", "circumcircle"):
                    e[0] |= set(c["args"])
                for p in list(e[0]):
                    self.add_center_point(sid, p)
            elif t == "circle_diameter":
                m = next((x["id"] for x in steps if x["type"] == "midpoint" and set(x["args"]) == set(a)), None)
                e = self.circle_entity(sid)
                e[0] |= set(a)
                if m:
                    e[1] = m
                    for p in e[0]:
                        self.add_center_point(m, p)
        for s in steps:
            if s["type"] == "nine_point_circle":
                self._def(s)
                A, B, C = s["args"]
                for sid, (x, y) in self.midpoints.items():
                    if {x, y} in ({A, B}, {B, C}, {C, A}):
                        self.on_circle(sid, s["id"])
        # gắn tâm (circumcenter) cho đường tròn ngoại tiếp cùng bộ ba
        cc = {frozenset(s["args"]): s["id"] for s in steps if s["type"] == "circumcenter"}
        for s in steps:
            if s["type"] in ("circumcircle", "circle_3pts") and frozenset(s["args"]) in cc:
                self._def(s)
                e = self.circle_entity(s["id"])
                e[1] = cc[frozenset(s["args"])]
                for p in e[0]:
                    self.add_center_point(e[1], p)
        # các tính chất góc riêng của từng loại bước
        for s in steps:
            t, a, sid = s["type"], s["args"], s["id"]
            self._def(s)
            pr = lambda x, y: self.pair(x, y)  # noqa: E731
            if t in ("incenter", "excenter"):
                A, B, C = a
                for V, X, Y in ((A, B, C), (B, C, A), (C, A, B)):
                    self.equation([(pr(V, sid), 2), (pr(V, X), -1), (pr(V, Y), -1)])
            elif t == "arc_midpoint":
                A, B, C = a
                self.equation([(pr(A, sid), 2), (pr(A, B), -1), (pr(A, C), -1)])
            elif t == "center" and by.get(a[0], {}).get("type") == "mixtilinear":
                A, B, C = by[a[0]]["args"]  # tâm đường tròn mixtilinear nằm trên phân giác góc A
                self.equation([(pr(A, sid), 2), (pr(A, B), -1), (pr(A, C), -1)])
            elif t == "isogonal_conjugate":
                P, A, B, C = a
                for V, X, Y in ((A, B, C), (B, C, A), (C, A, B)):
                    self.equation([(pr(V, P), 1), (pr(V, sid), 1), (pr(V, X), -1), (pr(V, Y), -1)])
            elif t == "isogonal_line":
                B, A, C, P = a
                self.equation([(self.line_var(sid), 1), (pr(A, P), 1), (pr(A, B), -1), (pr(A, C), -1)])
            elif t == "reflect_pts":
                P, U, V = a
                self.equation([(pr(U, P), 1), (pr(U, sid), 1), (pr(U, V), -2)])
                self.equation([(pr(V, P), 1), (pr(V, sid), 1), (pr(U, V), -2)])
                self.add_center_point(U, P)
                self.add_center_point(U, sid)
                self.add_center_point(V, P)
                self.add_center_point(V, sid)
            elif t == "reflect" and k.get(a[0]) == "point" and k.get(a[1]) == "line":
                pts = self._points_on_line_obj(a[1])
                if len(pts) >= 2:
                    U, V = pts[:2]
                    for W in (U, V):
                        self.equation([(pr(W, a[0]), 1), (pr(W, sid), 1), (pr(U, V), -2)])
                        self.add_center_point(W, a[0])
                        self.add_center_point(W, sid)
            elif t == "tangent_at":
                c, T = a
                ce = self.circle_entity(c)
                tl = self.line_var(sid)
                for X, Y in itertools.combinations(sorted(ce[0] - {T}), 2):
                    # góc giữa tiếp tuyến và dây TX = góc nội tiếp chắn cung TX
                    self.equation([(pr(T, X), 1), (tl, -1), (pr(Y, X), -1), (pr(Y, T), 1)])
                    self.equation([(pr(T, Y), 1), (tl, -1), (pr(X, Y), -1), (pr(X, T), 1)])
                if ce[1]:
                    self.equation([(tl, 1), (pr(T, ce[1]), -1)])
                self.tangents.append((c, T, sid, None))
            elif t == "circle_tangent_at":
                # đường tròn tiếp xúc với đường a0a1 tại a0
                self.on_circle(a[0], sid)
                self.on_circle(a[2], sid)
                self.tangents.append((sid, a[0], ("pts", a[0], a[1]), None))
            elif t == "tangent_point":
                c, P = a
                ce = self.circle_entity(c)
                if ce[1]:
                    self.equation([(pr(P, sid), 1), (pr(sid, ce[1]), -1)])
                self.tangents.append((c, sid, None, P))
            elif t == "midpoint":
                self.add_center_point(sid, a[0])
                self.add_center_point(sid, a[1])
            elif t == "reflect" and k.get(a[0]) == "point" and k.get(a[1]) == "point":
                self.add_center_point(a[1], a[0])
                self.add_center_point(a[1], sid)
        # tiếp điểm của đường tròn nội tiếp: I cách đều các tiếp điểm, mỗi đỉnh cách đều hai tiếp điểm kề nó
        touch = {}
        for s_ in steps:
            if s_["type"] == "incircle_touch":
                touch.setdefault(frozenset(s_["args"]), []).append((s_["id"], set(s_["args"][1:])))
        for tri, ts in touch.items():
            self._fact("Tính chất tiếp điểm: IT vuông góc với cạnh, hai tiếp tuyến kẻ từ một đỉnh bằng nhau", "dl")
            inc = next((x["id"] for x in steps if x["type"] == "incenter" and frozenset(x["args"]) == tri), None)
            for t1, side in ts:
                if inc:
                    self.add_center_point(inc, t1)
                    U_, V_ = sorted(side)
                    self.equation([(self.pair(inc, t1), 1), (self.pair(U_, V_), -1)])  # IT ⊥ cạnh (+π/2)
            for (t1, s1), (t2, s2) in itertools.combinations(ts, 2):
                for V in s1 & s2:
                    self.add_center_point(V, t1)
                    self.add_center_point(V, t2)
        # trực tâm X của UVW, F chân đường cao từ U (điểm có sẵn): FU·FX = FV·FW
        for s_ in steps:
            if s_["type"] != "orthocenter" or self.vals.get(s_["id"]) is None:
                continue
            X = s_["id"]
            for U, V, W in itertools.permutations(s_["args"], 3):
                if V > W or any(self.vals.get(z) is None for z in (U, V, W)):
                    continue
                Fp = G.project(self.vals[U], G.line_through(self.vals[V], self.vals[W]))
                F = next((z for z in self.pts if G.dist(self.vals[z], Fp) < self.eps), None)
                if F is None or F in (U, V, W, X):
                    continue
                self._fact(f"Hệ thức trực tâm: {self.ns(F, U)}·{self.ns(F, X)} = {self.ns(F, V)}·{self.ns(F, W)} "
                           f"({self.nm(X)} trực tâm tam giác {self.ns(U, V, W)})", "dl")
                self.lequation([(self.L(F, U), 1), (self.L(F, X), 1), (self.L(F, V), -1), (self.L(F, W), -1)])
        # vị tự (trung điểm / đối xứng qua cùng một tâm): ảnh song song với gốc
        groups = {}
        for s in steps:
            t, a = s["type"], s["args"]
            if t == "midpoint":
                groups.setdefault(a[1], {})[a[0]] = s["id"]
                groups.setdefault(a[0], {})[a[1]] = s["id"]
            elif t == "reflect" and k.get(a[0]) == "point" and k.get(a[1]) == "point":
                groups.setdefault(("r", a[1]), {})[a[0]] = s["id"]
        for m in groups.values():
            for (x, mx), (y, my) in itertools.combinations(m.items(), 2):
                self._fact(f"Đường trung bình / vị tự: {self.ns(mx, my)} ∥ {self.ns(x, y)}", "vecto")
                self.equation([(self.pair(mx, my), 1), (self.pair(x, y), -1)])

    # ---------------------------------------------------------------- lớp affine
    def _may_reuse(self, x):
        return not self.strict or x.startswith("_")

    def _virtual_foot(self, P, U, V, tag):
        """Chân đường vuông góc từ P xuống UV: dùng điểm có sẵn nếu trùng (bằng số), không thì thêm điểm "ảo"."""
        if any(self.vals.get(x) is None for x in (P, U, V)) or G.dist(self.vals[U], self.vals[V]) < self.eps:
            return None
        X = G.project(self.vals[P], G.line_through(self.vals[U], self.vals[V]))
        f = next((x for x in self.pts if self._may_reuse(x) and G.dist(self.vals[x], X) < self.eps), None)
        if f is None:
            f = "_f" + tag
            self._aux_point(f, X, f"hình chiếu của {self.nm(P)} lên đường thẳng {self.ns(U, V)}")
        elif f in getattr(self, "_vfact", {}):
            self._tag = self._vfact[f]
        if f not in (U, V):
            self.add_col([U, V, f])
        if f != P:
            self.equation([(self.pair(P, f), 1), (self.pair(U, V), -1)])  # (+π/2)
        return f

    def _virtual_centers(self):
        """Trực tâm của tam giác chưa có tâm ngoại tiếp đã biết: thêm tâm ngoại tiếp (điểm có sẵn trùng vị trí, hoặc
        điểm ảo) cách đều ba đỉnh – để dùng Sylvester và sổ tri thức (vd tâm (IBC) là S_a)."""
        for s in self.doc["steps"]:
            if s["type"] != "orthocenter" or self.vals.get(s["id"]) is None:
                continue
            a = s["args"]
            if any(set(a) <= eq for eq in self.centers.values()):
                continue
            if any(x["type"] == "circumcenter" and set(x["args"]) == set(a) for x in self.doc["steps"]):
                continue
            Oc = G.circumcenter(*(self.vals[x] for x in a))
            if Oc is None:
                continue
            o = next((x for x in self.pts if self._may_reuse(x) and G.dist(self.vals[x], Oc) < self.eps), None)
            if o is None:
                o = "_o" + s["id"]
                self._aux_point(o, Oc, f"tâm đường tròn ngoại tiếp tam giác {self.ns(*a)}")
            elif o in getattr(self, "_vfact", {}):
                self._tag = self._vfact[o]
            for x in a:
                self.add_center_point(o, x)

    def _partner_feet(self):
        """Đã có chân đường vuông góc từ tâm nội tiếp / một tâm bàng tiếp xuống một cạnh ⇒ thêm chân của các tâm còn
        lại (điểm có sẵn hoặc điểm ảo): các tiếp điểm "bạn đôi" (đối xứng qua trung điểm cạnh…)."""
        steps = self.doc["steps"]
        cen = {s["id"]: frozenset(s["args"]) for s in steps if s["type"] in ("incenter", "excenter")}
        sides = set()
        for s in steps:
            if s["type"] == "foot" and s["args"][0] in cen:
                sides.add((cen[s["args"][0]], s["args"][1], s["args"][2]))
            elif s["type"] == "incircle_touch":
                sides.add((frozenset(s["args"]), s["args"][1], s["args"][2]))
        for tri, U, V in sides:
            for c, t in cen.items():
                if t == tri and self.vals.get(c) is not None:
                    self._virtual_foot(c, U, V, "t" + c + U + V)

    def _reflection_feet(self):
        """Chân đường vuông góc (ảo) của các phép đối xứng qua đường thẳng – tạo trước khi so khớp sổ tri thức
        (vd đối xứng của O qua đường đối trung: chân là điểm Dumpty)."""
        for s in self.doc["steps"]:
            t, a = s["type"], s["args"]
            if self.kind.get(s["id"]) != "point":
                continue
            if t == "reflect" and self.kind.get(a[1]) == "line":
                pts = self._points_on_line_obj(a[1])
                if len(pts) >= 2:
                    self._virtual_foot(a[0], pts[0], pts[1], s["id"])
            elif t == "reflect_pts":
                self._virtual_foot(a[0], a[1], a[2], s["id"])

    def _virtual_midpoints(self):
        """Trung điểm ảo của các cạnh tam giác (đường trung bình, hình thang, tiếp điểm đối xứng qua M_a…)."""
        self._vmids = []
        pairs = [s["args"] for s in self.doc["steps"]
                 if s["type"] in LINE_TYPES and all(self.kind.get(x) == "point" and x in self.vals for x in s["args"])]
        if all(x in self.vals for x in "ABC"):
            pairs += [["B", "C"], ["C", "A"], ["A", "B"]]
        done = set()
        for U, V in pairs:
            if frozenset((U, V)) in done:
                continue
            done.add(frozenset((U, V)))
            M = G.mid(self.vals[U], self.vals[V])
            if any(G.dist(self.vals[x], M) < self.eps for x in self.pts):
                continue
            mv = "_m" + U + V
            self._aux_point(mv, M, f"trung điểm của {self.ns(U, V)}")
            self.add_col([U, mv, V])
            self.add_center_point(mv, U)
            self.add_center_point(mv, V)
            self.mids.append((mv, U, V))
            self._vmids.append((mv, U, V))

    def _classical(self):
        """Kiến thức của các bổ đề trong thư viện, so khớp theo vị trí (lab/reason/atlas.py)."""
        from .atlas import match

        from ..library import BY_KEY

        for kind, ids, key in match(self.vals, self.pts, self.eps):
            ten = BY_KEY[key].ten if key in BY_KEY else key
            n_ = self.nm
            txt = {"col": lambda: ", ".join(map(n_, ids)) + " thẳng hàng",
                   "cyc": lambda: ", ".join(map(n_, ids)) + " cùng nằm trên một đường tròn",
                   "eq": lambda: f"{n_(ids[0])} cách đều " + ", ".join(map(n_, ids[1:])),
                   "pow": lambda: f"{self.ns(ids[0], ids[1])}·{self.ns(ids[0], ids[2])} = {self.ns(ids[0], ids[3])}²",
                   "tch": lambda: f"đường tròn qua {n_(ids[2])}, {n_(ids[3])} tiếp xúc {self.ns(ids[0], ids[1])} tại {n_(ids[0])}",
                   "mid": lambda: f"{n_(ids[0])} là trung điểm của {self.ns(ids[1], ids[2])}"}[kind]()
            self._fact(f"Bổ đề ({ten}): {txt}", "bode")
            if kind == "col":
                if frozenset(ids) not in self.known_col:
                    self.add_col(ids)
            elif kind == "cyc":
                if frozenset(ids) not in self.known_cyc:
                    self.add_cyc(ids)
            elif kind == "eq":
                for x in ids[1:]:
                    self.add_center_point(ids[0], x)
            elif kind == "pow":
                M, X, Y, Z = ids
                self.lequation([(self.L(M, X), 1), (self.L(M, Y), 1), (self.L(M, Z), -2)])
            elif kind == "tch":
                T, U, P, X = ids
                ent = next((st["id"] for st in self.doc["steps"] if st["type"] == "circle_tangent_at"
                            and st["args"][0] == T and st["args"][2] == P and self._num_col(T, U, st["args"][1])), None)
                if ent is not None:
                    self.on_circle(X, ent)  # cùng một đường tròn (tiếp xúc TU tại T, qua P)
                else:  # góc tạo bởi tiếp tuyến và dây cung
                    self.equation([(self.pair(T, U), 1), (self.pair(T, X), -1), (self.pair(P, T), -1), (self.pair(P, X), 1)])
            elif kind == "mid":
                m, x, y = ids
                self.extra_mid.append((m, x, y))
                self.mids.append((m, x, y))
                if frozenset((m, x, y)) not in self.known_col:
                    self.add_col([x, m, y])
                self.add_center_point(m, x)
                self.add_center_point(m, y)

    def _affine(self):
        steps = self.doc["steps"]
        ids = {s["id"] for s in steps}
        co = {}

        def c(x):
            return co.get(x) or {x: 1.0}

        def comb(*terms):
            out = {}
            for k, x in terms:
                for b, v in c(x).items():
                    out[b] = out.get(b, 0.0) + k * v
            return {b: v for b, v in out.items() if abs(v) > 1e-12}

        for s in steps:
            t, a, sid = s["type"], s["args"], s["id"]
            if self.kind.get(sid) != "point" or self.vals.get(sid) is None:
                continue
            if t == "midpoint":
                co[sid] = comb((0.5, a[0]), (0.5, a[1]))
            elif t == "centroid":
                co[sid] = comb((1 / 3, a[0]), (1 / 3, a[1]), (1 / 3, a[2]))
            elif t == "reflect" and self.kind.get(a[1]) == "point":
                co[sid] = comb((2.0, a[1]), (-1.0, a[0]))
                if (a[1], a[0], sid) not in self.mids:
                    self.mids.append((a[1], a[0], sid))
            elif t in ("reflect", "reflect_pts"):
                if t == "reflect":
                    pts = self._points_on_line_obj(a[1])
                    if len(pts) < 2:
                        continue
                    U, V = pts[:2]
                else:
                    U, V = a[1], a[2]
                f = self._virtual_foot(a[0], U, V, sid)
                if (a[0], sid, U, V) not in self.reflections:
                    self.reflections.append((a[0], sid, U, V))
                if f is not None and f not in co and {U, V} <= self.centers.get(a[0], set()):
                    co[f] = comb((0.5, U), (0.5, V))  # P cách đều U, V ⇒ chân đường vuông góc là trung điểm UV
                if f is not None:
                    co[sid] = comb((2.0, f), (-1.0, a[0]))
                    if (f, a[0], sid) not in self.mids:
                        self.mids.append((f, a[0], sid))
            elif t == "homothety" and self.kind.get(a[0]) == "point":
                k = float((s.get("params") or {}).get("k", 2))
                co[sid] = comb((k, a[0]), (1 - k, a[1]))
            elif t == "translate" and self.kind.get(a[0]) == "point":
                co[sid] = comb((1.0, a[0]), (1.0, a[2]), (-1.0, a[1]))
            elif t == "nine_point_center":
                O = next((x["id"] for x in steps if x["type"] == "circumcenter" and sorted(x["args"]) == sorted(a)), None)
                O = O or next((o for o, eq in self.centers.items() if set(a) <= eq and o in self.vals), None)
                H = next((x["id"] for x in steps if x["type"] == "orthocenter" and sorted(x["args"]) == sorted(a)), None)
                if O and H:
                    co[sid] = comb((0.5, O), (0.5, H))
                    if (sid, O, H) not in self.mids:
                        self.mids.append((sid, O, H))
                elif O:  # N = (A + B + C − O)/2
                    co[sid] = comb((0.5, a[0]), (0.5, a[1]), (0.5, a[2]), (-0.5, O))
            elif t == "isogonal_conjugate":
                # liên hợp đẳng giác kinh điển: của O là H, của H là O, của điểm Lemoine là trọng tâm
                P, tri = a[0], a[1:]
                if self.vals.get(P) is None or not G.triangle_ok(*(self.vals[x] for x in tri)):
                    continue
                T3 = [self.vals[x] for x in tri]
                O = next((o for o, eq in self.centers.items() if set(tri) <= eq and o in self.vals), None)
                Pv = self.vals[P]
                if O is not None and G.dist(Pv, self.vals[O]) < self.eps and O == P:
                    co[sid] = comb((1.0, tri[0]), (1.0, tri[1]), (1.0, tri[2]), (-2.0, O))
                elif O is not None and G.dist(Pv, G.orthocenter(*T3)) < self.eps:
                    co[sid] = dict(c(O))
                elif G.dist(Pv, G.lemoine(*T3)) < self.eps and \
                        any(x["id"] == P and x["type"] == "lemoine" and set(x["args"]) == set(tri) for x in steps):
                    co[sid] = comb((1 / 3, tri[0]), (1 / 3, tri[1]), (1 / 3, tri[2]))
            elif t == "orthocenter":
                O = next((x["id"] for x in steps if x["type"] == "circumcenter" and sorted(x["args"]) == sorted(a)), None)
                if O is None:  # tâm ngoại tiếp đã biết khác: điểm cách đều ba đỉnh (vd O với tam giác PBC, P trên (O))
                    O = next((o for o, eq in self.centers.items() if set(a) <= eq and o in self.vals), None)
                if O:  # Sylvester: OH = OA + OB + OC
                    co[sid] = comb((1.0, a[0]), (1.0, a[1]), (1.0, a[2]), (-2.0, O))
        for mv, U, V in self._vmids:
            co[mv] = comb((0.5, U), (0.5, V))
        # trung điểm biết từ sổ tri thức: thay điểm gốc bằng biểu thức (M = (X + Y)/2)
        for m, x, y in self.extra_mid:
            for tgt, expr in ((y, comb((2.0, m), (-1.0, x))), (x, comb((2.0, m), (-1.0, y))), (m, comb((0.5, x), (0.5, y)))):
                if tgt in co or tgt in expr:
                    continue
                for k_, e_ in list(co.items()):
                    if tgt in e_:
                        f_ = e_.pop(tgt)
                        for b_, v_ in expr.items():
                            e_[b_] = e_.get(b_, 0.0) + f_ * v_
                        co[k_] = {b_: v_ for b_, v_ in e_.items() if abs(v_) > 1e-12}
                co[tgt] = expr
                break
        pts = [p for p in self.pts if p in ids or p.startswith("_")]
        basis = sorted({b for p in pts for b in c(p)})
        bi = {b: i for i, b in enumerate(basis)}
        M = np.zeros((len(pts), len(basis)))
        for i, p in enumerate(pts):
            for b, v in c(p).items():
                M[i, bi[b]] = v
        groups = {}
        for i, j in itertools.combinations(range(len(pts)), 2):
            d = M[j] - M[i]
            nz = np.nonzero(np.abs(d) > 1e-9)[0]
            if not len(nz):
                continue  # trùng nhau
            key = tuple(np.round(d / d[nz[0]], 7))
            groups.setdefault(key, []).append((pts[i], pts[j]))
        for g in groups.values():
            if len(g) < 2:
                continue
            x0, y0 = g[0]
            for x, y in g[1:]:
                u = G.sub(self.vals[y0], self.vals[x0])
                v = G.sub(self.vals[y], self.vals[x])
                if abs(G.cross(G.unit(u), G.unit(v))) < 1e-7:  # kiểm lại bằng số
                    self._fact(f"Đẳng thức vectơ: {self.ns(x0, y0)} ∥ {self.ns(x, y)} (tỉ số không đổi)", "vecto")
                    self.equation([(self.pair(x, y), 1), (self.pair(x0, y0), -1)])
                    self.lequation([(self.L(x, y), 1), (self.L(x0, y0), -1)])  # (+ log tỉ số)
        self.affine = co
        self._aff_basis = bi
        self._aff_point = {tuple(np.round(M[i], 7)): p for i, p in enumerate(pts)}
        self._aff_dirs = {k_: g[0] for k_, g in groups.items()}

    def _axis_points(self):
        """X nằm trên trục đối xứng UV (đã biết) ⇒ X cách đều P và ảnh P' của nó, XU là phân giác của góc PXP'."""
        added = 0
        for P, P2, U, V in self.reflections:
            for X in self.pts:
                if X in (P, P2) or (P, P2, X) in self._ax_done or not self._distinct(X, P, P2) or not self._num_col(U, V, X):
                    continue
                if X not in (U, V) and frozenset((U, V, X)) not in self.known_col and not self._goal_ok(self.col_any(U, V, X)):
                    continue
                self._ax_done.add((P, P2, X))
                tg = [] if X in (U, V) or frozenset((U, V, X)) in self.known_col else self._leaves(self.col_any(U, V, X))
                self._fact(f"{self.nm(X)} nằm trên trục đối xứng {self.ns(U, V)} của {self.nm(P)} và {self.nm(P2)} nên "
                           f"{self.ns(X, P)} = {self.ns(X, P2)}", "suy", tg)
                self.equation([(self.pair(X, P), 1), (self.pair(X, P2), 1), (self.pair(U, V), -2)])
                self.add_center_point(X, P)
                self.add_center_point(X, P2)
                added += 1
        return added

    def _reflected_circles(self):
        """Đường tròn đối xứng của c qua đường UV: tâm là đối xứng của tâm (điểm có sẵn trùng bằng số, hoặc điểm ảo);
        đi qua các giao điểm của c với UV và ảnh của các điểm trên c; đối xứng của (ABC) qua BC đi qua trực tâm H."""
        steps = self.doc["steps"]
        for s in steps:
            t, a, sid = s["type"], s["args"], s["id"]
            if t != "reflect" or self.kind.get(sid) != "circle" or self.kind.get(a[1]) != "line":
                continue
            pts = self._points_on_line_obj(a[1])
            if len(pts) < 2 or any(self.vals.get(x) is None for x in pts[:2]):
                continue
            U, V = pts[:2]
            self._fact(f"Đường tròn đối xứng của {self.nm(a[0])} qua {self.ns(U, V)}: đi qua giao điểm với trục, ảnh của "
                       f"các điểm trên {self.nm(a[0])}; đối xứng của (ABC) qua một cạnh đi qua trực tâm", "dl")
            e0, e = self.circle_entity(a[0]), self.circle_entity(sid)
            src = by_args = next((x for x in steps if x["id"] == a[0]), None)
            on0 = set(e0[0]) | (set(by_args["args"]) if src and src["type"] in ("circumcircle", "circle_3pts") else set())
            for X in on0:
                if X in self.vals and self._num_col(U, V, X):
                    self.on_circle(X, sid)  # điểm chung của c với trục
            for x in steps:  # ảnh của các điểm trên c
                if x["type"] in ("reflect", "reflect_pts") and self.kind.get(x["id"]) == "point" and x["args"][0] in on0:
                    axis = x["args"][1:] if x["type"] == "reflect_pts" else self._points_on_line_obj(x["args"][1])
                    if len(axis) >= 2 and self._num_col(U, V, axis[0]) and self._num_col(U, V, axis[1]):
                        self.on_circle(x["id"], sid)
            if src and src["type"] in ("circumcircle", "circle_3pts"):
                tri = frozenset(src["args"])
                on_ax = [X for X in src["args"] if self._num_col(U, V, X)]
                if len(on_ax) == 2:
                    H = next((x["id"] for x in steps if x["type"] == "orthocenter" and frozenset(x["args"]) == tri), None)
                    if H:
                        self.on_circle(H, sid)
            o = e0[1]
            if o is None or self.vals.get(o) is None:
                continue
            Oc = G.reflect_point_over_line(self.vals[o], G.line_through(self.vals[U], self.vals[V]))
            c2 = next((x for x in self.pts if self._may_reuse(x) and G.dist(self.vals[x], Oc) < self.eps), None)
            if c2 is None:
                c2 = "_c" + sid
                self._aux_point(c2, Oc, f"tâm của {self.nm(sid)} (đối xứng của tâm {self.nm(o)} qua {self.ns(U, V)})")
            e[1] = c2
            for X in list(e[0]):
                self.add_center_point(c2, X)
            f = self._virtual_foot(o, U, V, "c" + sid)
            self.reflections.append((o, c2, U, V))
            if f is not None:
                self.mids.append((f, o, c2))

    def _similar(self, max_pts=40, max_pairs=600):
        """Hai tam giác có hai cặp góc bằng nhau (SUY RA ĐƯỢC, cùng hoặc ngược hướng) ⇒ đồng dạng ⇒ tỉ số các cạnh
        tương ứng bằng nhau (lớp độ dài). Ghép cặp nhanh bằng "chữ ký" góc tính bằng số."""
        pts = [p for p in self.pts if not p.startswith("_x")][:max_pts]
        if len(pts) < 4:
            return 0
        sig = {}
        for a, b, c in itertools.combinations(pts, 3):
            A_, B_, C_ = self.vals[a], self.vals[b], self.vals[c]
            area = G.cross(G.sub(B_, A_), G.sub(C_, A_))
            if abs(area) < 1e-6 * self.scale * self.scale:
                continue
            angs = []
            for v, x, y in ((a, b, c), (b, c, a), (c, a, b)):
                V, X, Y = self.vals[v], self.vals[x], self.vals[y]
                angs.append((math.acos(max(-1.0, min(1.0, G.dot(G.unit(G.sub(X, V)), G.unit(G.sub(Y, V)))))), v, x, y))
            angs.sort()
            if angs[1][0] - angs[0][0] < 1e-6 or angs[2][0] - angs[1][0] < 1e-6:
                continue  # tam giác cân: tương ứng đỉnh không duy nhất
            key = (round(angs[0][0], 6), round(angs[1][0], 6))
            sig.setdefault(key, []).append((angs, area > 0))
        added, pairs = 0, 0
        for group in sig.values():
            for (t1, o1), (t2, o2) in itertools.combinations(group, 2):
                k = (tuple(x[1] for x in t1), tuple(x[1] for x in t2))
                if k in self._sim_done:
                    continue
                pairs += 1
                if pairs > max_pairs:
                    return added
                self._sim_done.add(k)
                # đỉnh tương ứng theo thứ tự độ lớn góc; hướng tính theo đúng thứ tự đó
                v1 = [x[1] for x in t1]
                v2 = [x[1] for x in t2]
                P1 = [self.vals[x] for x in v1]
                P2 = [self.vals[x] for x in v2]
                same = (G.cross(G.sub(P1[1], P1[0]), G.sub(P1[2], P1[0])) > 0) == \
                       (G.cross(G.sub(P2[1], P2[0]), G.sub(P2[2], P2[0])) > 0)
                sgn = -1 if same else 1  # cùng hướng: góc có hướng bằng nhau; ngược hướng: đối nhau
                eqs, rat = [], []
                for i_ in range(3):
                    j_, k_ = [t for t in range(3) if t != i_]
                    eqs.append([(self.pair(v1[i_], v1[k_]), 1), (self.pair(v1[i_], v1[j_]), -1),
                                (self.pair(v2[i_], v2[k_]), sgn), (self.pair(v2[i_], v2[j_]), -sgn)])
                    rat.append([(self.L(v1[i_], v1[j_]), 1), (self.L(v1[i_], v1[k_]), -1),
                                (self.L(v2[i_], v2[j_]), -1), (self.L(v2[i_], v2[k_]), 1)])
                got = [self.derivable(e) for e in eqs]
                if sum(got) < 2:
                    # cạnh – góc – cạnh: một góc bằng nhau và tỉ số hai cạnh kề bằng nhau ⇒ đồng dạng ⇒ các góc còn lại
                    if not any(g_ and self.lderivable(r_) for g_, r_ in zip(got, rat)):
                        self._sim_done.discard(k)  # có thể thành công ở vòng sau
                        continue
                    i_ = next(i for i, (g_, r_) in enumerate(zip(got, rat)) if g_ and self.lderivable(r_))
                    self._fact(f"Tam giác {self.ns(*v1)} đồng dạng tam giác {self.ns(*v2)} (c.g.c: góc tại "
                               f"{self.nm(v1[i_])}, {self.nm(v2[i_])} bằng nhau và tỉ số hai cạnh kề bằng nhau)", "suy",
                               [("a", eqs[i_]), ("l", rat[i_])])
                    for e, g_ in zip(eqs, got):
                        if not g_:
                            self.equation(e)
                else:
                    self._fact(f"Tam giác {self.ns(*v1)} đồng dạng tam giác {self.ns(*v2)} (g.g)", "suy",
                               [("a", e) for e, g_ in zip(eqs, got) if g_][:2])
                L = self.L
                s0 = (L(v1[1], v1[2]), L(v2[1], v2[2]))
                for s_ in ((L(v1[0], v1[2]), L(v2[0], v2[2])), (L(v1[0], v1[1]), L(v2[0], v2[1]))):
                    self.lequation([(s_[0], 1), (s_[1], -1), (s0[0], -1), (s0[1], 1)])
                added += 1
        return added

    def _right_altitude(self):
        """Tam giác XPQ vuông tại X (suy ra được), M chân đường cao từ X trên PQ ⇒ XP² = PM·PQ, XQ² = QM·QP,
        XM² = MP·MQ (hệ thức lượng – dùng cho phương tích, tiếp tuyến…)."""
        added = 0
        n = len(self.pts)
        if n < 4:
            return 0
        Pm = np.array([[self.vals[p].x, self.vals[p].y] for p in self.pts])
        tol = 1e-7 * self.scale * self.scale
        for i, X in enumerate(self.pts):
            d = Pm - Pm[i]
            dots = d @ d.T
            for j, k in zip(*np.nonzero(np.abs(np.triu(dots, 1)) < tol)):
                if i in (j, k) or np.hypot(*d[j]) < self.eps or np.hypot(*d[k]) < self.eps:
                    continue
                P, Q = self.pts[j], self.pts[k]
                if G.dist(self.vals[P], self.vals[Q]) < self.eps:
                    continue
                Fp = G.project(self.vals[X], G.line_through(self.vals[P], self.vals[Q]))
                near = np.nonzero(np.hypot(Pm[:, 0] - Fp.x, Pm[:, 1] - Fp.y) < self.eps)[0]
                for m_ in near:  # chân đường cao từ X: tra theo toạ độ thay vì dò mọi điểm
                    M = self.pts[m_]
                    if M in (X, P, Q) or (X, P, Q, M) in self._alt_done or not self._distinct(X, P, Q, M):
                        continue
                    if not (self.derivable([(self.pair(X, P), 1), (self.pair(X, Q), -1)]) and
                            self._goal_ok(self.col_any(P, Q, M)) and
                            self.derivable([(self.pair(X, M), 1), (self.pair(P, Q), -1)])):
                        continue
                    self._alt_done.add((X, P, Q, M))
                    self._fact(f"Hệ thức lượng trong tam giác {self.ns(X, P, Q)} vuông tại {self.nm(X)}, đường cao {self.ns(X, M)}: "
                               f"{self.ns(X, P)}² = {self.ns(P, M)}·{self.ns(P, Q)}", "suy",
                               [("a", [(self.pair(X, P), 1), (self.pair(X, Q), -1)]),
                                ("a", [(self.pair(X, M), 1), (self.pair(P, Q), -1)])] + self._leaves(self.col_any(P, Q, M)))
                    L = self.L
                    self.lequation([(L(X, P), 2), (L(P, M), -1), (L(P, Q), -1)])
                    self.lequation([(L(X, Q), 2), (L(Q, M), -1), (L(P, Q), -1)])
                    self.lequation([(L(X, M), 2), (L(M, P), -1), (L(M, Q), -1)])
                    added += 1
        return added

    def _new_midpoints(self):
        """Tâm O cách đều X, Y và thẳng hàng với X, Y (suy ra được) ⇒ O là trung điểm XY (vd tâm (RPQ) là trung điểm AP
        khi A, Q, P, R đồng viên với AP là đường kính). Cập nhật lớp affine."""
        known = {(m, frozenset((x, y))) for m, x, y in self.extra_mid}
        new = []
        for o, eq in list(self.centers.items()):
            for x, y in itertools.combinations(sorted(eq), 2):
                if (o, frozenset((x, y))) in known or G.dist(self.vals[o], G.mid(self.vals[x], self.vals[y])) > self.eps or \
                        not self._distinct(o, x, y):
                    continue
                if not self._goal_ok(self.col_any(x, o, y)):
                    continue
                new.append((o, x, y))
                known.add((o, frozenset((x, y))))
                self._fact(f"{self.nm(o)} là trung điểm của {self.ns(x, y)} ({self.nm(o)} cách đều {self.nm(x)}, {self.nm(y)} "
                           f"và thẳng hàng với chúng)", "suy", [("l", self.eq_len(o, x, y))] + self._leaves(self.col_any(x, o, y)))
        if new:
            self.extra_mid += new
            for m in new:
                if m not in self.mids:
                    self.mids.append(m)
            self._affine()
        return len(new)

    def _perp_bisectors(self):
        """M trung điểm XY, O cách đều X và Y (đã biết) ⇒ OM ⊥ XY."""
        added = 0
        for m, a, b in self.mids:
            for o, eq in self.centers.items():
                if o in (m, a, b) or a not in eq or b not in eq or (o, m, a, b) in self._pb_done or \
                        not self._distinct(o, m, a, b):
                    continue
                self._pb_done.add((o, m, a, b))
                self._fact(f"{self.ns(o, m)} ⊥ {self.ns(a, b)} ({self.nm(m)} là trung điểm {self.ns(a, b)}, "
                           f"{self.ns(o, a)} = {self.ns(o, b)})", "suy", [("l", self.eq_len(o, a, b))])
                self.equation([(self.pair(o, m), 1), (self.pair(a, b), -1)])
                added += 1
        return added

    def _circle_sets(self):
        sets = [set(e[0]) for e in self.circles if len(e[0]) >= 2]
        for q in self.known_cyc:
            if not any(q <= t for t in sets):
                sets.append(set(q))
        return sets

    def _power(self):
        """Phương tích: P, A, B thẳng hàng (đã biết), A, B trên cùng đường tròn với C, D (P, C, D thẳng hàng)
        ⇒ PA·PB = PC·PD; tiếp tuyến PT ⇒ PT² = PA·PB."""
        added = 0
        tan_by_pt = {}
        for c, T, tl, P in self.tangents:
            e = self.circle_entity(c)
            if isinstance(tl, tuple):
                _, U0, V0 = tl
                on = {X for X in self.pts if X in (U0, V0) or
                      (self._num_col(U0, V0, X) and self._goal_ok(self.col_any(U0, V0, X)))}
            else:
                on = set(self.lines.get(tl, set())) | set(self._points_on_line_obj(tl)) if tl else {P}
            for X in on:
                if X and X != T:
                    tan_by_pt.setdefault(X, []).append((frozenset(e[0] | {T}), T))
        for S in self._circle_sets():
            S = sorted(S)
            for P in self.pts:
                if P in S:
                    continue
                prs = [(a, b) for a, b in itertools.combinations(S, 2)
                       if a in self.vals and b in self.vals and self._distinct(a, b, P) and self._num_col(a, b, P) and
                       (frozenset((P, a, b)) in self.known_col or self._goal_ok(self.col_any(P, a, b)))]
                prs += [(T, T) for cs, T in tan_by_pt.get(P, []) if T in S or len(cs & set(S)) >= 3]
                for (a, b), (c, d) in itertools.combinations(prs, 2):
                    key = (P, frozenset(((a, b), (c, d))))
                    if key in self._pow_done:
                        continue
                    self._pow_done.add(key)
                    tg = []
                    for u_, w_ in ((a, b), (c, d)):
                        if u_ != w_ and frozenset((P, u_, w_)) not in self.known_col:
                            tg += self._leaves(self.col_any(P, u_, w_))
                    sq = lambda u_, w_: f"{self.ns(P, u_)}²" if u_ == w_ else f"{self.ns(P, u_)}·{self.ns(P, w_)}"  # noqa: E731
                    self._fact(f"Phương tích của {self.nm(P)}: {sq(a, b)} = {sq(c, d)}", "suy", tg)
                    self.lequation([(self.L(P, a), 1), (self.L(P, b), 1), (self.L(P, c), -1), (self.L(P, d), -1)])
                    added += 1
        return added

    def _isosceles(self):
        """OX = OY đúng bằng số: suy ra được bằng góc (cân) hoặc bằng độ dài ⇒ O cách đều X, Y (cả hai lớp)."""
        added = 0
        n = len(self.pts)
        P = np.array([[self.vals[p].x, self.vals[p].y] for p in self.pts])
        for i in range(n):
            o = self.pts[i]
            d = np.hypot(P[:, 0] - P[i, 0], P[:, 1] - P[i, 1])
            eq = self.centers.get(o, set())
            for j, k in itertools.combinations(range(n), 2):
                if i in (j, k) or abs(d[j] - d[k]) > self.eps or d[j] < self.eps:
                    continue
                x, y = self.pts[j], self.pts[k]
                if x in eq and y in eq or not self._distinct(x, y):
                    continue
                if frozenset((o, x, y)) in self.known_col:
                    continue
                if self.lderivable(self.eq_len(o, x, y)) or self.derivable(self.eq_iso(o, x, y)):
                    tg = [("l", self.eq_len(o, x, y))] if self.lderivable(self.eq_len(o, x, y)) else [("a", self.eq_iso(o, x, y))]
                    self._fact(f"{self.ns(o, x)} = {self.ns(o, y)}" + (" (tam giác cân)" if tg[0][0] == "a" else ""), "suy", tg)
                    self.add_center_point(o, x)
                    self.add_center_point(o, y)
                    eq = self.centers.get(o, set())
                    added += 1
        return added

    def _aff_vec(self, x):
        co = getattr(self, "affine", None)
        if co is None:
            return None
        v = np.zeros(len(self._aff_basis))
        for b_, c_ in (co.get(x) or {x: 1.0}).items():
            if b_ not in self._aff_basis:
                return None
            v[self._aff_basis[b_]] += c_
        return v

    def affine_parallel(self, p, q, r, t):
        """(q − p) và (t − r) đều nằm trong không gian sinh (affine) của một họ cặp điểm ĐÃ BIẾT cùng phương
        ⇒ cùng phương với họ đó (vd U − X = 2(O − M) − 2(I − T) với OM, IT cùng vuông góc BC)."""
        vp, vq, vr, vt = (self._aff_vec(x) for x in (p, q, r, t))
        if any(v is None for v in (vp, vq, vr, vt)):
            return False
        d1, d2 = vq - vp, vt - vr
        if np.linalg.norm(d1) < 1e-12 or np.linalg.norm(d2) < 1e-12:
            return False
        P0, Q0 = self.vals[p], self.vals[q]
        u = G.unit(G.sub(Q0, P0))
        fam, ref = [], None
        for x, y in itertools.combinations(self.pts, 2):
            X, Y = self.vals[x], self.vals[y]
            if G.dist(X, Y) < self.eps or abs(G.cross(u, G.unit(G.sub(Y, X)))) > 1e-7:
                continue
            vx, vy = self._aff_vec(x), self._aff_vec(y)
            if vx is None or vy is None:
                continue
            if ref is None:
                ref = (x, y)
            elif not self.derivable([(self.pair(x, y), 1), (self.pair(*ref), -1)]):
                continue
            fam.append(vy - vx)
        if len(fam) < 2:
            return False
        M = np.array(fam).T
        for d in (d1, d2):
            sol, *_ = np.linalg.lstsq(M, d, rcond=None)
            if np.linalg.norm(M @ sol - d) > 1e-7 * max(1.0, np.linalg.norm(d)):
                return False
        return True

    def ninepoint_goal(self, a, b, c, d):
        """Ba điểm là trung điểm ba cạnh của một tam giác XYZ có trong hình (lớp affine), điểm thứ tư là chân đường cao
        ⇒ cùng nằm trên đường tròn Euler của XYZ."""
        out = []
        if getattr(self, "affine", None) is None:
            return out
        for F in (a, b, c, d):
            m = [x for x in (a, b, c, d) if x != F]
            vm = [self._aff_vec(x) for x in m]
            if any(v is None for v in vm):
                continue
            verts = []
            for i in range(3):
                j, k = [t for t in range(3) if t != i]
                verts.append(self._aff_point.get(tuple(np.round(vm[j] + vm[k] - vm[i], 7))))
            if any(v is None for v in verts) or len(set(verts)) < 3:
                continue
            X, Y, Z = verts  # m[i] là trung điểm cạnh đối diện đỉnh verts[i]
            for V, W1, W2 in ((X, Y, Z), (Y, Z, X), (Z, X, Y)):
                if F in (W1, W2) or not self._num_col(W1, W2, F):
                    continue
                out.append(("all", [self.col_any(F, W1, W2), [(self.pair(V, F), 1), (self.pair(W1, W2), -1)]]))
        return out

    def trapezoid_goal(self, a, b, c, d):
        """Hình thang cân: PQ ∥ RT và (lớp affine) vectơ nối trung điểm hai đáy ⊥ PQ ⇒ chung trung trực ⇒ đồng viên."""
        out = []
        co = getattr(self, "affine", None)
        if co is None:
            return out
        bi = self._aff_basis
        for (p, q), (r, t) in (((a, b), (c, d)), ((a, c), (b, d)), ((a, d), (b, c))):
            P, Q, R, T = (self.vals[x] for x in (p, q, r, t))
            if abs(G.cross(G.unit(G.sub(Q, P)), G.unit(G.sub(T, R)))) > 1e-7:
                continue
            vec = np.zeros(len(bi))
            ok = True
            for x, sg in ((p, 1), (q, 1), (r, -1), (t, -1)):
                for b_, v_ in (co.get(x) or {x: 1.0}).items():
                    if b_ not in bi:
                        ok = False
                        break
                    vec[bi[b_]] += sg * v_
            nz = np.nonzero(np.abs(vec) > 1e-9)[0]
            if not ok or not len(nz):
                continue
            key = tuple(np.round(vec / vec[nz[0]], 7))
            if key not in self._aff_dirs:
                continue
            x0, y0 = self._aff_dirs[key]
            out.append(("all", [[(self.pair(p, q), 1), (self.pair(r, t), -1)],
                                [(self.pair(x0, y0), 1), (self.pair(p, q), -1)]]))
        return out

    def power_goal(self, a, b, c, d):
        """Đảo phương tích cho 4 điểm a, b, c, d: giao X của (ab), (cd) là một điểm có sẵn."""
        out = []
        for (p, q), (r, t) in (((a, b), (c, d)), ((a, c), (b, d)), ((a, d), (b, c))):
            for X in self.pts:
                if X in (a, b, c, d) or X.startswith("_x") or not self._distinct(X, a, b, c, d):
                    continue
                if self._num_col(p, q, X) and self._num_col(r, t, X):
                    out.append(("all", [self.col_any(X, p, q), self.col_any(X, r, t),
                                        ("len", [(self.L(X, p), 1), (self.L(X, q), 1), (self.L(X, r), -1), (self.L(X, t), -1)])]))
        return out

    def _points_on_line_obj(self, lid):
        st = next((s for s in self.doc["steps"] if s["id"] == lid), None)
        if st and st["type"] in LINE_TYPES:
            return list(st["args"])
        return sorted(self.lines.get(lid, set()))

    # ---------------------------------------------------------------- số
    def _distinct(self, *xs):
        """Các điểm đôi một khác vị trí (điểm ảo có thể trùng vị trí điểm thật: bộ điểm như vậy là suy biến)."""
        P = [self.vals[x] for x in xs]
        return all(G.dist(P[i], P[j]) > self.eps for i in range(len(P)) for j in range(i + 1, len(P)))

    def _num_col(self, a, b, c):
        A, B, C = (self.vals[x] for x in (a, b, c))
        return G.dist_point_line(C, G.line_through(A, B)) < self.eps if G.dist(A, B) > self.eps else False

    def _num_candidates(self):
        """Mọi bộ 3 điểm thẳng hàng, 4 điểm đồng viên ĐÚNG BẰNG SỐ (chưa biết)."""
        pts = self.pts
        P = np.array([[self.vals[p].x, self.vals[p].y] for p in pts])
        n = len(pts)
        cols, cycs = [], []
        for i, j in itertools.combinations(range(n), 2):
            d = P[j] - P[i]
            nd = math.hypot(*d)
            if nd < self.eps:
                continue
            dist = np.abs((P[:, 0] - P[i, 0]) * d[1] - (P[:, 1] - P[i, 1]) * d[0]) / nd
            for k in np.nonzero(dist < self.eps)[0]:
                if k > j and self._distinct(pts[i], pts[j], pts[k]):
                    key = frozenset((pts[i], pts[j], pts[k]))
                    if key not in self.known_col:
                        cols.append((pts[i], pts[j], pts[k]))
        for i, j, k in itertools.combinations(range(n), 3):
            c = G.circle_through(G.pt(*P[i]), G.pt(*P[j]), G.pt(*P[k]))
            if c is None or c.r > 50 * self.scale:
                continue
            dist = np.abs(np.hypot(P[:, 0] - c.c.x, P[:, 1] - c.c.y) - c.r)
            for m in np.nonzero(dist < self.eps)[0]:
                if m > k and self._distinct(pts[i], pts[j], pts[k], pts[m]):
                    key = frozenset((pts[i], pts[j], pts[k], pts[m]))
                    if key not in self.known_cyc:
                        cycs.append((pts[i], pts[j], pts[k], pts[m]))
        return cols, cycs

    # ---------------------------------------------------------------- mục tiêu
    def goal_terms(self, rtype, ids):
        """Danh sách phương trình (mỗi phương trình là list (biến, hệ số)) tương đương với quan hệ; None nếu ngoài tầm."""
        if rtype == "collinear":
            return [("any", [self.col_any(ids[0], ids[1], x), ("affpar", ids[0], ids[1], ids[0], x)]) for x in ids[2:]]
        if rtype == "concyclic":
            return [("any", [self.eq_cyc(ids[0], ids[1], ids[2], x), self.eq_cyc(ids[0], ids[2], ids[1], x),
                             self.eq_cyc(ids[1], ids[2], ids[0], x)] + self.power_goal(ids[0], ids[1], ids[2], x) +
                     self.trapezoid_goal(ids[0], ids[1], ids[2], x) + self.ninepoint_goal(ids[0], ids[1], ids[2], x))
                    for x in ids[3:]]
        if rtype == "on_line":
            pts = self._points_on_line_obj(ids[0])
            if len(pts) >= 2:
                return [self.col_any(pts[0], pts[1], x) for x in ids[1:] if x not in pts[:2]]
            idx = self.line_var(ids[0])
            known = sorted(self.lines.get(ids[0], set()))
            if known:
                return [[(self.pair(known[0], x), 1), (idx, -1)] for x in ids[1:] if x != known[0]]
            return None
        if rtype == "on_circle":
            e = self.circle_entity(ids[0])
            st = next((s for s in self.doc["steps"] if s["id"] == ids[0]), None)
            pts = sorted(e[0]) if e else []
            if st and st["type"] in ("circle_3pts", "circumcircle"):
                pts = list(st["args"])
            if st and st["type"] == "circle_diameter":
                a, b = st["args"]
                return [[(self.pair(x, a), 1), (self.pair(x, b), -1)] for x in ids[1:]]
            pts = [p for p in pts if p not in ids[1:]]
            if e and e[1] and pts:
                o, r = e[1], pts[0]
                return [("any", [self.eq_iso(o, x, r), ("len", self.eq_len(o, x, r))] +
                         ([self.eq_cyc(pts[0], pts[1], pts[2], x)] if len(pts) >= 3 else []))
                        for x in ids[1:]]
            if len(pts) >= 3:
                return [("any", [self.eq_cyc(pts[0], pts[1], pts[2], x), self.eq_cyc(pts[0], pts[2], pts[1], x),
                                 self.eq_cyc(pts[1], pts[2], pts[0], x)]) for x in ids[1:]]
            return None
        if rtype in ("parallel", "perpendicular"):
            a, b = (self.line_var(r) for r in ids)
            return [[(a, 1), (b, -1)]] if a is not None and b is not None else None
        if rtype == "tangent":
            kinds_ = [self.kind.get(i) for i in ids]
            if "line" in kinds_ and "circle" in kinds_:
                lid, cid = (ids[0], ids[1]) if kinds_[0] == "line" else (ids[1], ids[0])
                e = self.circle_entity(cid)
                if e and e[1]:
                    T = [p for p in self.pts if p in self.lines.get(lid, set()) | set(self._points_on_line_obj(lid))
                         and abs(G.dist(self.vals[p], self.vals[e[1]]) - self.vals[cid].r) < self.eps]
                    if T:
                        return [[(self.line_var(lid), 1), (self.pair(T[0], e[1]), -1)]]
            return None
        return None

    def _parallelograms(self):
        """PQRS có PQ ∥ SR và PS ∥ QR (suy ra được) → trung điểm của đường chéo PR cũng là trung điểm của QS."""
        added = 0
        for m, (p, r) in self.midpoints.items():
            M = self.vals[m]
            for q in self.pts:
                if q in (p, r, m):
                    continue
                Q = self.vals[q]
                S = G.pt(2 * M.x - Q.x, 2 * M.y - Q.y)
                s_id = next((x for x in self.pts if G.dist(self.vals[x], S) < self.eps), None)
                if s_id is None or s_id in (p, r, q) or q > s_id or not self._distinct(p, q, r, s_id):
                    continue
                if frozenset((q, m, s_id)) in self.known_col:
                    continue
                if self.derivable([(self.pair(p, q), 1), (self.pair(s_id, r), -1)]) and \
                        self.derivable([(self.pair(p, s_id), 1), (self.pair(q, r), -1)]):
                    self._fact(f"{self.ns(p, q, r, s_id)} là hình bình hành nên {self.nm(m)} là trung điểm {self.ns(q, s_id)}", "suy",
                               [("a", [(self.pair(p, q), 1), (self.pair(s_id, r), -1)]),
                                ("a", [(self.pair(p, s_id), 1), (self.pair(q, r), -1)])])
                    self.add_col([q, m, s_id])
                    self.add_center_point(m, q)
                    self.add_center_point(m, s_id)
                    added += 1
        return added

    def _goal_ok(self, g, rec=None):
        if isinstance(g, tuple) and g and g[0] == "any":
            for x in g[1]:
                sub = [] if rec is not None else None
                if self._goal_ok(x, sub):
                    if rec is not None:
                        rec += sub
                    return True
            return False
        if isinstance(g, tuple) and g and g[0] == "all":
            sub = [] if rec is not None else None
            ok = all(self._goal_ok(x, sub) for x in g[1])
            if ok and rec is not None:
                rec += sub
            return ok
        if isinstance(g, tuple) and g and g[0] == "len":
            ok = self.lderivable(g[1])
            if ok and rec is not None:
                rec.append(("l", g[1]))
            return ok
        if isinstance(g, tuple) and g and g[0] == "affpar":
            ok = self.affine_parallel(*g[1:])
            if ok and rec is not None:
                rec.append(("affpar", g[1:]))
            return ok
        ok = self.derivable(g)
        if ok and rec is not None:
            rec.append(("a", g))
        return ok

    def level(self, rtype, ids):
        """Số vòng suy luận cần để suy ra quan hệ (1, 2, …); None nếu không suy ra được; "?" nếu loại quan hệ
        này bộ đuổi góc không biểu diễn được (vd hai điểm trùng nhau)."""
        if rtype == "concurrent":
            # thêm giao điểm của hai đường đầu làm một điểm "ảo", mục tiêu: điểm đó nằm trên các đường còn lại
            a, b = ids[0], ids[1]
            X = None
            for Y in G.intersect(self.vals[a], self.vals[b]):
                if all(G.dist_to_object(self.vals[c], Y) < self.eps for c in ids[2:]):
                    X = Y
            if X is None:
                return "?"
            self._aux_point("_x", X, f"giao điểm của {self.nm(a)} và {self.nm(b)}")
            self._add_fact({"on": ["_x", a]})
            self._add_fact({"on": ["_x", b]})
            terms = []
            for c in ids[2:]:
                g = self.goal_terms("on_line" if self.kind.get(c) == "line" else "on_circle", [c, "_x"])
                if g is None:
                    return "?"
                terms += g
            return self._run(terms)
        goals = self.goal_terms(rtype, ids)
        if goals is None:
            return "?"
        return self._run(goals)

    def _run(self, goals):
        for rnd in range(1, self.max_rounds + 1):
            self.round = rnd
            if all(self._goal_ok(g) for g in goals):
                self.goal_leaves = [(lf, len(self.elog), len(self.llog)) for g in goals for lf in self._leaves(g)]
                return rnd
            cols, cycs = self._num_candidates()
            added = 0
            for c in cols:
                lv = self._leaves(self.col_any(*c))
                if lv:
                    self._fact(", ".join(map(self.nm, c)) + " thẳng hàng", "suy", lv)
                    self.add_col(c)
                    added += 1
            for q in cycs:
                a, b, c, d = q
                # một đẳng thức góc nội tiếp là đủ (điểm ở vị trí tổng quát – đã kiểm bằng số)
                e_ok = next((e for e in (self.eq_cyc(a, b, c, d), self.eq_cyc(a, c, b, d), self.eq_cyc(a, d, b, c))
                             if self.derivable(e)), None)
                if e_ok is not None:
                    self._fact(", ".join(map(self.nm, q)) + " cùng nằm trên một đường tròn (góc nội tiếp)", "suy", [("a", e_ok)])
                    self.add_cyc(list(q))
                    added += 1
            added += self._parallelograms()
            added += self._new_midpoints()
            added += self._axis_points()
            added += self._perp_bisectors()
            added += self._right_altitude()
            added += self._similar()
            added += self._power()
            added += self._isosceles()
            # góc vuông suy ra được + trung điểm cạnh huyền → điểm cách đều trung điểm
            for m, eq in list(self.centers.items()):
                st = next((s for s in self.doc["steps"] if s["id"] == m and s["type"] == "midpoint"), None)
                if not st:
                    continue
                a, b = st["args"]
                for x in self.pts:
                    if x in (a, b, m) or x in eq or not self._distinct(x, a, b, m):
                        continue
                    X, A, B = self.vals[x], self.vals[a], self.vals[b]
                    if abs(G.dot(G.sub(A, X), G.sub(B, X))) < self.eps * self.scale and \
                            self.derivable([(self.pair(x, a), 1), (self.pair(x, b), -1)]):
                        self._fact(f"{self.ns(m, x)} = {self.ns(m, a)} (trung tuyến ứng với cạnh huyền {self.ns(a, b)})", "suy",
                                   [("a", [(self.pair(x, a), 1), (self.pair(x, b), -1)])])
                        self.add_center_point(m, x)
                        added += 1
            if not added:
                return None
        return None


class _Explainer:
    """Giải ngược: phương trình mục tiêu = tổ hợp những phương trình nào (gọn nhất có thể)."""

    def __init__(self, log, nv):
        self.log = log
        self.nv = nv
        self.M = np.zeros((len(log), nv))
        for i, (t, _) in enumerate(log):
            for idx, c in t:
                self.M[i, idx] += c
        # tập độc lập theo thứ tự xuất hiện (Gram–Schmidt): tiền tố của nó là tập độc lập của mọi tiền tố của log
        Q = np.zeros((0, nv))
        self.indep = []
        for i in range(len(log)):
            v = self.M[i]
            nrm = np.linalg.norm(v)
            if nrm < 1e-12:
                continue
            r = v - Q.T @ (Q @ v) if len(Q) else v.copy()
            if np.linalg.norm(r) > 1e-8 * nrm:
                Q = np.vstack([Q, r / np.linalg.norm(r)])
                self.indep.append(i)

    def support(self, terms, upto):
        t = np.zeros(self.nv)
        for idx, c in terms:
            if idx is not None and idx < self.nv:
                t[idx] += c
        if np.linalg.norm(t) < 1e-12:
            return set()
        rows = [i for i in self.indep if i < upto]
        if not rows:
            return None

        def fit(rs):
            A = self.M[rs].T
            lam, *_ = np.linalg.lstsq(A, t, rcond=None)
            return lam, np.linalg.norm(A @ lam - t) < 1e-7 * max(1.0, np.linalg.norm(t))

        lam, ok = fit(rows)
        if not ok:
            return None
        keep = [r for r, l_ in zip(rows, lam) if abs(l_) > 1e-9]
        for r in sorted(keep, key=lambda r: -r):  # bỏ bớt, ưu tiên giữ phương trình xuất hiện sớm (giả thiết)
            trial = [x for x in keep if x != r]
            if trial and fit(trial)[1]:
                keep = trial
        return {self.log[r][1] for r in keep}


def point_form(doc, rtype, ids):
    """Sự kiện (dạng Knowledge) của một quan hệ, kèm bản viết theo ĐIỂM khi đường tròn/đường thẳng được dựng từ điểm
    (vd "X trên đường tròn (BHC)" → "B, H, C, X đồng viên") – để kiến thức vẫn dùng được trong hình không có chính đối
    tượng đường tròn đó."""
    from ..scan.knowledge import relation_facts

    out = relation_facts(rtype, ids)
    by = {s["id"]: s for s in doc["steps"]}
    st = by.get(ids[0]) if ids else None
    if st and rtype == "on_circle" and st["type"] in ("circle_3pts", "circumcircle"):
        out += relation_facts("concyclic", list(dict.fromkeys(list(st["args"]) + list(ids[1:]))))
    if st and rtype == "on_line" and st["type"] in LINE_TYPES:
        out += relation_facts("collinear", list(dict.fromkeys(list(st["args"]) + list(ids[1:]))))
    return out


def difficulty(doc, rtype, ids, known=(), max_rounds=5, classical=True, strict=True):
    """Mức khó theo bộ đuổi góc: 1, 2, … (vòng suy luận), None (không suy ra được) hoặc "?" (ngoài tầm biểu diễn)."""
    try:
        return AngleChaser(doc, known=known, max_rounds=max_rounds, classical=classical, strict=strict).level(rtype, ids)
    except Exception:  # noqa: BLE001 – không làm đổ vòng khám phá; lỗi ≠ "khó" nên trả "?" (chưa đo được)
        return "?"
