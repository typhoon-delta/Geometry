""""Kiến thức hiển nhiên" rút ra từ chính cách dựng – bản Python của src/explore/knowledge.js.

Gom các sự kiện do từng bước khai báo (STEP_TYPES[...].facts) thành thực thể đường thẳng, đường tròn,
lớp phương (song song) và cặp vuông góc, rồi áp dụng các luật đến khi ổn định:
    L1  hai đường chung ≥ 2 điểm → trùng
    L2  hai đường cùng phương, chung 1 điểm → trùng
    L3  hai lớp cùng vuông góc với một lớp → song song
    C1  hai đường tròn chung ≥ 3 điểm → trùng
Không phải bộ chứng minh: chỉ đủ để loại những gì "thấy ngay" từ định nghĩa các bước.
"""

from __future__ import annotations

from ..core.model import kinds
from ..core.steps import STEP_TYPES


class UF:
    def __init__(self):
        self.p = {}

    def find(self, x):
        self.p.setdefault(x, x)
        r = x
        while self.p[r] != r:
            r = self.p[r]
        while self.p[x] != r:
            n = self.p[x]
            self.p[x] = r
            x = n
        return r

    def union(self, a, b):
        ra, rb = self.find(a), self.find(b)
        if ra != rb:
            self.p[ra] = rb
        return ra != rb


def _sort_key(arr):
    return ",".join(sorted(arr))


def _ab_tag(abc):
    A, V, C = abc
    return f"AB:{V}:{_sort_key([A, C])}"


def _entity():
    return {"pts": set(), "objs": set(), "tags": set(), "alive": True}


class Knowledge:
    def __init__(self, doc, rep=lambda x: x):
        self.rep = rep
        self.lines = []
        self.circles = []
        self.dir = UF()
        self.perps = []
        self.tans = []
        k = kinds(doc)
        self.kind = k
        for s in doc["steps"]:
            d = STEP_TYPES.get(s["type"])
            if d is None:
                continue
            kd = k.get(s["id"])
            if kd == "line":
                i = self.new_line()
                self.lines[i]["objs"].add(s["id"])
                if s["type"] == "perp_bisector":
                    self.lines[i]["tags"].add("PB:" + _sort_key([rep(a) for a in s["args"]]))
                if s["type"] == "angle_bisector" and not (s.get("params") or {}).get("external"):
                    self.lines[i]["tags"].add(_ab_tag([rep(a) for a in s["args"]]))
            elif kd == "circle":
                i = self.new_circle()
                self.circles[i]["objs"].add(s["id"])
                if s["type"] == "incircle":
                    self.circles[i]["tags"].add("IC:" + _sort_key([rep(a) for a in s["args"]]))
                if s["type"] in ("circumcircle", "circle_3pts"):
                    for a in s["args"]:
                        self.circles[i]["pts"].add(rep(a))
        for s in doc["steps"]:
            d = STEP_TYPES.get(s["type"])
            if d is None or d.facts is None:
                continue
            try:
                facts = d.facts(s, [k.get(a) for a in s["args"]], doc) or []
            except Exception:  # noqa: BLE001 – như bản JS: bước lỗi thì bỏ qua
                facts = []
            for f in facts:
                self.add_fact(f)
        self.saturate()

    def new_line(self):
        self.lines.append(_entity())
        return len(self.lines) - 1

    def new_circle(self):
        self.circles.append(_entity())
        return len(self.circles) - 1

    def line_of(self, ref):
        L = self.lines
        if isinstance(ref, str):
            return next((i for i, e in enumerate(L) if e["alive"] and ref in e["objs"]), -1)
        if "L" in ref:
            a, b = (self.rep(x) for x in ref["L"])
            if a == b:
                return -1
            i = next((i for i, e in enumerate(L) if e["alive"] and a in e["pts"] and b in e["pts"]), -1)
            if i < 0:
                i = self.new_line()
                L[i]["pts"].update((a, b))
            return i
        if "PB" in ref:
            return self._tagged("PB:" + _sort_key([self.rep(x) for x in ref["PB"]]), lambda: self.line_of({"L": ref["PB"]}))
        if "AB" in ref:
            return self._tagged(_ab_tag([self.rep(x) for x in ref["AB"]]), None, self.rep(ref["AB"][1]))
        return -1

    def _tagged(self, tag, perp_to, through=None):
        i = next((i for i, e in enumerate(self.lines) if e["alive"] and tag in e["tags"]), -1)
        if i < 0:
            i = self.new_line()
            self.lines[i]["tags"].add(tag)
            if through:
                self.lines[i]["pts"].add(through)
        if perp_to:
            j = perp_to()
            if j >= 0:
                self.perps.append([i, j])
        return i

    def circle_of(self, ref):
        C = self.circles
        if isinstance(ref, str):
            return next((i for i, e in enumerate(C) if e["alive"] and ref in e["objs"]), -1)
        if "C" in ref:
            ps = [self.rep(x) for x in ref["C"]]
            if len(set(ps)) < 3:
                return -1
            i = next((i for i, e in enumerate(C) if e["alive"] and all(p in e["pts"] for p in ps)), -1)
            if i < 0:
                i = self.new_circle()
                C[i]["pts"].update(ps)
            return i
        if "IC" in ref:
            tag = "IC:" + _sort_key([self.rep(x) for x in ref["IC"]])
            i = next((i for i, e in enumerate(C) if e["alive"] and tag in e["tags"]), -1)
            if i < 0:
                i = self.new_circle()
                C[i]["tags"].add(tag)
            return i
        return -1

    def curve_of(self, ref):
        if isinstance(ref, str):
            kd = self.kind.get(ref)
            if kd == "line":
                return ("L", self.line_of(ref))
            if kd == "circle":
                return ("C", self.circle_of(ref))
            return None
        if "C" in ref or "IC" in ref:
            return ("C", self.circle_of(ref))
        return ("L", self.line_of(ref))

    def add_fact(self, f):
        if "on" in f:
            P = self.rep(f["on"][0])
            c = self.curve_of(f["on"][1])
            if not c or c[1] < 0:
                return
            (self.lines if c[0] == "L" else self.circles)[c[1]]["pts"].add(P)
        elif "col" in f:
            ps = list(dict.fromkeys(self.rep(x) for x in f["col"]))
            if len(ps) < 2:
                return
            i = self.line_of({"L": [ps[0], ps[1]]})
            self.lines[i]["pts"].update(ps)
        elif "cyc" in f:
            ps = list(dict.fromkeys(self.rep(x) for x in f["cyc"]))
            if len(ps) < 3:
                return
            i = self.circle_of({"C": ps[:3]})
            self.circles[i]["pts"].update(ps)
        elif "par" in f or "perp" in f:
            refs = f.get("par") or f.get("perp")
            a, b = (self.line_of(r) for r in refs)
            if a < 0 or b < 0:
                return
            if "par" in f:
                self.dir.union(a, b)
            else:
                self.perps.append([a, b])
        elif "tan" in f:
            a, b = (self.curve_of(r) for r in f["tan"])
            if a and b and a[1] >= 0 and b[1] >= 0:
                self.tans.append([a, b])

    def _merge_line(self, i, j):
        a, b = self.lines[i], self.lines[j]
        a["pts"] |= b["pts"]
        a["objs"] |= b["objs"]
        a["tags"] |= b["tags"]
        b["alive"] = False
        self.dir.union(i, j)
        self.perps = [[i if x == j else x, i if y == j else y] for x, y in self.perps]
        self.tans = [[("L", i) if c == ("L", j) else c for c in pr] for pr in self.tans]

    def _merge_circle(self, i, j):
        a, b = self.circles[i], self.circles[j]
        a["pts"] |= b["pts"]
        a["objs"] |= b["objs"]
        a["tags"] |= b["tags"]
        b["alive"] = False
        self.tans = [[("C", i) if c == ("C", j) else c for c in pr] for pr in self.tans]

    def saturate(self):
        for _ in range(20):
            changed = False
            perp_of = {}
            for x, y in self.perps:
                rx, ry = self.dir.find(x), self.dir.find(y)
                if ry in perp_of:
                    changed = self.dir.union(perp_of[ry], rx) or changed
                else:
                    perp_of[ry] = rx
                if rx in perp_of:
                    changed = self.dir.union(perp_of[rx], ry) or changed
                else:
                    perp_of[rx] = ry
            L = self.lines
            for i in range(len(L)):
                if not L[i]["alive"]:
                    continue
                for j in range(i + 1, len(L)):
                    if not L[j]["alive"]:
                        continue
                    common = len(L[j]["pts"] & L[i]["pts"])
                    same_tag = bool(L[j]["tags"] & L[i]["tags"])
                    if common >= 2 or same_tag or (common >= 1 and self.dir.find(i) == self.dir.find(j)):
                        self._merge_line(i, j)
                        changed = True
            C = self.circles
            for i in range(len(C)):
                if not C[i]["alive"]:
                    continue
                for j in range(i + 1, len(C)):
                    if not C[j]["alive"]:
                        continue
                    common = len(C[j]["pts"] & C[i]["pts"])
                    same_tag = bool(C[j]["tags"] & C[i]["tags"])
                    if common >= 3 or same_tag:
                        self._merge_circle(i, j)
                        changed = True
            if not changed:
                break

    # ---------- truy vấn ----------
    def point_on_line_obj(self, P, line_id):
        i = self.line_of(line_id)
        return i >= 0 and self.rep(P) in self.lines[i]["pts"]

    def point_on_circle_obj(self, P, cid):
        i = self.circle_of(cid)
        return i >= 0 and self.rep(P) in self.circles[i]["pts"]

    def collinear(self, ps):
        r = [self.rep(p) for p in ps]
        return any(e["alive"] and all(p in e["pts"] for p in r) for e in self.lines)

    def concyclic(self, ps):
        r = [self.rep(p) for p in ps]
        return any(e["alive"] and all(p in e["pts"] for p in r) for e in self.circles)

    def same_line(self, a, b):
        i, j = self.line_of(a), self.line_of(b)
        return i >= 0 and i == j

    def same_circle(self, a, b):
        i, j = self.circle_of(a), self.circle_of(b)
        return i >= 0 and i == j

    def parallel(self, a, b):
        i, j = self.line_of(a), self.line_of(b)
        return i >= 0 and j >= 0 and self.dir.find(i) == self.dir.find(j)

    def perpendicular(self, a, b):
        i, j = self.line_of(a), self.line_of(b)
        if i < 0 or j < 0:
            return False
        ri, rj = self.dir.find(i), self.dir.find(j)
        for x, y in self.perps:
            rx, ry = self.dir.find(x), self.dir.find(y)
            if (rx == ri and ry == rj) or (rx == rj and ry == ri):
                return True
        return False

    def tangent(self, a, b):
        ca, cb = self.curve_of(a), self.curve_of(b)
        if not ca or not cb:
            return False
        return any((x == ca and y == cb) or (x == cb and y == ca) for x, y in self.tans)


class KnowledgePlus(Knowledge):
    """Kiến thức hiển nhiên MỞ RỘNG cho phòng thí nghiệm (không có trong bản JS): coi thêm là "dễ suy ra"
      T1  (Thales) X nhìn PQ dưới góc vuông theo cách dựng (XP ⊥ XQ) → X thuộc đường tròn đường kính PQ;
      T2  (đường trung bình) M, N là trung điểm PQ, PR → MN ∥ QR;
      T3  (phép vị tự) các trung điểm XP (hoặc điểm đối xứng của X qua P) với cùng P là ảnh của X qua một phép
          vị tự tâm P → ảnh của các điểm thẳng hàng/đồng viên cũng thẳng hàng/đồng viên, ảnh song song với gốc;
      (phép đối xứng tâm M biến P thành P' được coi như M là trung điểm PP').
    """

    def __init__(self, doc, rep=lambda x: x, extra=()):
        super().__init__(doc, rep)
        # sự kiện đã biết (vd đã tìm được trước đó) được dùng như kiến thức: hệ quả của chúng không còn "mới"
        known_ids = {s["id"] for s in doc["steps"]}
        for f in extra:
            if "col" in f or "cyc" in f:
                # tập con của một tập thẳng hàng / đồng viên vẫn thẳng hàng / đồng viên
                key = "col" if "col" in f else "cyc"
                sub = [x for x in f[key] if x in known_ids]
                if len(sub) >= (3 if key == "col" else 4):
                    self.add_fact({key: sub})
                continue
            refs = [x for v in f.values() for x in v if isinstance(x, str)]
            if all(r in known_ids for r in refs):
                self.add_fact(f)
        mids = []  # (M, P, Q): M trung điểm PQ
        for s in doc["steps"]:
            if s["type"] == "midpoint":
                mids.append((s["id"], s["args"][0], s["args"][1]))
            elif s["type"] == "reflect" and self.kind.get(s["args"][0]) == "point" and self.kind.get(s["args"][1]) == "point":
                mids.append((s["args"][1], s["args"][0], s["id"]))
        for i in range(len(mids)):
            for j in range(i + 1, len(mids)):
                M, a1, b1 = (rep(x) for x in mids[i])
                N, a2, b2 = (rep(x) for x in mids[j])
                for P, Q in ((a1, b1), (b1, a1)):
                    for P2, R in ((a2, b2), (b2, a2)):
                        if P == P2 and Q != R and M != N:
                            self.add_fact({"par": [{"L": [M, N]}, {"L": [Q, R]}]})
        self.saturate()
        self._thales()
        self.saturate()
        groups = {}
        for s in doc["steps"]:
            t, a = s["type"], s["args"]
            if t == "midpoint":
                groups.setdefault(("mid", rep(a[1])), {})[rep(a[0])] = rep(s["id"])
                groups.setdefault(("mid", rep(a[0])), {})[rep(a[1])] = rep(s["id"])
            elif t == "reflect" and self.kind.get(a[0]) == "point" and self.kind.get(a[1]) == "point":
                groups.setdefault(("ref", rep(a[1])), {})[rep(a[0])] = rep(s["id"])
            elif t == "homothety" and self.kind.get(a[0]) == "point":
                k = (s.get("params") or {}).get("k", 2)
                groups.setdefault(("hom", rep(a[1]), k), {})[rep(a[0])] = rep(s["id"])
        groups = {g: m for g, m in groups.items() if len(m) >= 2}
        for _ in range(2):
            if not groups:
                break
            for m in groups.values():
                for e in list(self.lines):
                    if not e["alive"]:
                        continue
                    src = [x for x in e["pts"] if x in m]
                    if len(src) >= 2:
                        img = [m[x] for x in src]
                        if len(img) >= 3:
                            self.add_fact({"col": img})
                        self.add_fact({"par": [{"L": img[:2]}, {"L": src[:2]}]})
                for e in list(self.circles):
                    if not e["alive"]:
                        continue
                    src = [x for x in e["pts"] if x in m]
                    if len(src) >= 3:
                        self.add_fact({"cyc": [m[x] for x in src]})
            self.saturate()

    def _thales(self):
        L = self.lines
        perp_cls = set()
        for x, y in self.perps:
            rx, ry = self.dir.find(x), self.dir.find(y)
            perp_cls.add((rx, ry))
            perp_cls.add((ry, rx))
        alive = [i for i, e in enumerate(L) if e["alive"]]
        for a in range(len(alive)):
            for b in range(a + 1, len(alive)):
                i, j = alive[a], alive[b]
                if (self.dir.find(i), self.dir.find(j)) not in perp_cls:
                    continue
                for X in L[i]["pts"] & L[j]["pts"]:
                    for P in L[i]["pts"] - {X}:
                        for Q in L[j]["pts"] - {X}:
                            tag = "DIA:" + _sort_key([P, Q])
                            k = next((t for t, e in enumerate(self.circles) if e["alive"] and tag in e["tags"]), -1)
                            if k < 0:
                                k = self.new_circle()
                                self.circles[k]["tags"].add(tag)
                            self.circles[k]["pts"].update((P, Q, X))


def relation_facts(rel_type, ids):
    """Quan hệ (loại, ids) → các sự kiện dạng Knowledge (để dùng làm kiến thức)."""
    if rel_type == "collinear":
        return [{"col": list(ids)}]
    if rel_type == "concyclic":
        return [{"cyc": list(ids)}]
    if rel_type == "on_line" or rel_type == "on_circle":
        return [{"on": [p, ids[0]]} for p in ids[1:]]
    if rel_type == "parallel":
        return [{"par": list(ids)}]
    if rel_type == "perpendicular":
        return [{"perp": list(ids)}]
    if rel_type == "tangent":
        return [{"tan": list(ids)}]
    return []


def fact_known(k, f):
    """Sự kiện f (dạng facts của STEP_TYPES) đã suy ra được từ kiến thức k chưa?"""
    if "on" in f:
        P, ref = f["on"]
        c = k.curve_of(ref)
        if not c or c[1] < 0:
            return False
        return k.rep(P) in (k.lines if c[0] == "L" else k.circles)[c[1]]["pts"]
    if "col" in f:
        return k.collinear(f["col"])
    if "cyc" in f:
        return k.concyclic(f["cyc"])
    if "par" in f or "perp" in f:
        a, b = (k.line_of(r) for r in (f.get("par") or f.get("perp")))
        if a < 0 or b < 0:
            return False
        ra, rb = k.dir.find(a), k.dir.find(b)
        if "par" in f:
            return ra == rb
        return any({k.dir.find(x), k.dir.find(y)} == {ra, rb} for x, y in k.perps)
    if "tan" in f:
        a, b = (k.curve_of(r) for r in f["tan"])
        return bool(a and b) and any((x == a and y == b) or (x == b and y == a) for x, y in k.tans)
    return False
