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
