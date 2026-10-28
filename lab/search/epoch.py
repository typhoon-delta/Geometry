"""Một VÒNG khám phá: dựng vũ trụ từ cấu hình gốc (+ các "trạm"), mở rộng theo lớp độ sâu (tìm theo chiều
rộng có giới hạn độ sâu, trong mỗi lớp ưu tiên hướng triển vọng), dò và kiểm chứng sự kiện.
"""

from __future__ import annotations

import copy
import random
import time

from ..scan.explorer import explore
from .base import build_base_doc, make_fp_samples, make_samples
from .facts import FactPipeline, canonical, key_str
from .operators import CandidateGen, apply
from .universe import Universe


def base_with_stations(stations_specs, check_samples=None):
    """Cấu hình gốc + các trạm (mỗi trạm: danh sách bước dựng ra nó, id đã đổi để không trùng).

    Bước của trạm trùng (bằng số, trên vài tam giác mẫu) một đối tượng đã có thì được GỘP vào đối tượng đó – nếu
    không, vũ trụ có những điểm trùng hẳn nhau và sinh ra vô số "quan hệ" rác.
    """
    from ..core import geom as G
    from ..core.model import compute_step, evaluate

    doc = build_base_doc()
    samples = check_samples or make_samples(3, 99)
    vals = [evaluate(doc, o) for o in samples]
    have = {s["id"] for s in doc["steps"]}
    names = {s.get("name") for s in doc["steps"]}
    alias = {}

    def same(u, v):
        if u is None or v is None or isinstance(u, dict) or isinstance(v, dict) or u.kind != v.kind:
            return False
        if u.kind == "point":
            return G.dist(u, v) < 1e-9
        if u.kind == "circle":
            return G.dist(u.c, v.c) < 1e-9 and abs(u.r - v.r) < 1e-9
        du, dv = G.unit(u.d), G.unit(v.d)
        return abs(G.cross(du, dv)) < 1e-9 and G.dist_point_line(v.p, u) < 1e-9

    for spec in stations_specs:
        for s in spec["steps"]:
            if s["id"] in have:
                continue
            s = copy.deepcopy(s)
            s["args"] = [alias.get(a, a) for a in s["args"]]
            vs = [compute_step(s, vals[k], samples[k]) for k in range(len(samples))]
            if any(v is None for v in vs):
                break  # trạm không dựng được trong cấu hình này: bỏ phần còn lại của trạm
            dup = next((t["id"] for t in doc["steps"] if all(same(vs[k], vals[k].get(t["id"])) for k in range(len(samples)))), None)
            if dup is not None:
                alias[s["id"]] = dup
                continue
            if s.get("name") in names:
                s.pop("name", None)
            doc["steps"].append(s)
            for k in range(len(samples)):
                vals[k][s["id"]] = vs[k]
            have.add(s["id"])
            if s.get("name"):
                names.add(s["name"])
    return doc


def base_facts(pipeline, samples, seed=2024):
    """Quan hệ của chính cấu hình gốc (lớp 0): đường thẳng Euler, đường tròn Euler…"""
    doc = build_base_doc()
    from ..scan.knowledge import KnowledgePlus

    res = explore(doc, samples=pipeline.samples, seed=seed, knowledge=KnowledgePlus)
    U = Universe(doc, samples, fp_samples=make_fp_samples(samples))
    out = []
    from ..core.model import sub_doc

    for r in res["relations"]:
        try:
            k = key_str(canonical(U, r["type"], r["ids"]))
        except (KeyError, AttributeError):
            continue
        pipeline.remember(r["type"], r["ids"], base=True)
        if k in pipeline.seen:
            continue
        pipeline.seen[k] = "su-kien"
        fd = sub_doc(doc, r["ids"], title="")
        ids_in = {s["id"] for s in fd["steps"]}
        newest = max(r["ids"], key=lambda i: [s["id"] for s in doc["steps"]].index(i))
        out.append({"key": k, "type": r["type"], "ids": r["ids"], "text": r["text"], "note": r.get("note"),
                    "js_score": r["score"], "doc": fd, "newest": newest,
                    "special": {i: v for i, v in res["special"].items() if i in ids_in}, "depth": 0, "ops": []})
    return out


def free_param_samples(doc, samples):
    """Điểm tuỳ ý (point_on) có sẵn trong cấu hình xuất phát (của các trạm) cũng phải được xê dịch giữa các mẫu,
    nếu không vũ trụ sẽ "thấy" các quan hệ chỉ đúng tại đúng một vị trí của điểm đó."""
    from .operators import _h

    by = {s["id"]: s for s in doc["steps"]}
    out = [dict(o) for o in samples]
    for s in doc["steps"]:
        if s["type"] != "point_on":
            continue
        t0 = (s.get("params") or {}).get("t", 0)
        host = by.get(s["args"][0], {})
        for k in range(1, len(out)):
            r = 2 * _h(s["id"], k) - 1
            if host.get("type") == "segment":
                t = min(0.92, max(0.08, t0 + 0.15 * r))
            elif host.get("type") in ("line", "ray") or host.get("type") in ("perpendicular", "parallel", "tangent_at"):
                t = t0 + 0.3 * r
            else:
                t = t0 + 0.6 * r
            out[k][s["id"]] = {"t": t}
    return out


class Epoch:
    def __init__(self, cfg, seed, pipeline, stations=None, station_specs=(), log=print):
        self.cfg = cfg
        self.seed = seed
        self.pipeline = pipeline
        self.stations = stations or {}
        self.log = log
        samples = make_samples(cfg["mau"], cfg["hat_giong_mau"])
        doc0 = base_with_stations(station_specs)
        samples = free_param_samples(doc0, samples)
        self.U = Universe(doc0, samples, tol=cfg["dung_sai"], fp_samples=make_fp_samples(samples),
                          base_ids={s["id"] for s in build_base_doc()["steps"]})
        # các trạm được tính là lớp 0 của vòng này
        self.rnd = random.Random(seed)
        self.gen = CandidateGen(self.U, self.rnd, cfg["trong_so_phep_dung"], self.stations, cfg["do_sau"], cfg["so_buoc_toi_da"])
        self.stats = {"thu": 0, "moi": 0, "trung": 0, "loai": 0}
        pipeline.new_epoch()

    def run(self, deadline, on_fact):
        """Chạy đến khi hết lớp hoặc hết giờ. on_fact(fact) được gọi cho mỗi sự kiện mới."""
        U, cfg = self.U, self.cfg
        budgets = cfg["ngan_sach_lop"]
        shares = cfg.get("ti_le_thoi_gian_lop", [0.25, 0.4, 0.35])
        t0 = time.time()
        total = max(1.0, deadline - t0)
        level_end = t0
        for lvl in range(1, cfg["do_sau"] + 1):
            if time.time() > deadline or len(U.points) > cfg["diem_toi_da"]:
                break
            level_end = min(deadline, max(time.time(), level_end) + total * shares[min(lvl - 1, len(shares) - 1)])
            cands = self.gen.level(lvl, budgets[min(lvl - 1, len(budgets) - 1)])
            limit = budgets[min(lvl - 1, len(budgets) - 1)]
            done = 0
            for op, args in cands:
                if done >= limit or time.time() > level_end or len(U.points) > cfg["diem_toi_da"]:
                    break
                done += 1
                self.stats["thu"] += 1
                n_ev = len(U.events)
                n_obj = len(U.objs)
                st, info = apply(U, op, args)
                if st == "bad":
                    self.stats["loai"] += 1
                    continue
                new_ids = [o for o in list(U.objs)[n_obj:]]
                if st == "dup":
                    self.stats["trung"] += 1
                for nid in new_ids:
                    o = U.objs[nid]
                    if o.aux:
                        continue
                    if o.op in ("", "line") and op != "line":
                        o.op = op
                    o.op = op if not o.op or o.op == "line" else o.op
                    self.stats["moi"] += 1
                    for rel in U.relations_of(nid):
                        for i in rel[1]:
                            if i in U.objs:
                                U.objs[i].hits += 1
                        for f in self.pipeline.consider(U, rel, nid):
                            self._emit(f, on_fact)
                for ev in U.events[n_ev:]:
                    ex = ev["existing"]
                    f_list = self.pipeline.consider(U, ("coincide", [ex, ev["step"]["id"]]), ev["step"]["id"], extra_step=ev["step"])
                    for f in f_list:
                        self._emit(f, on_fact)
        return self.stats

    def _emit(self, f, on_fact):
        U = self.U
        ids_in = [s["id"] for s in f["doc"]["steps"]]
        f["depth"] = max((U.objs[i].depth for i in ids_in if i in U.objs), default=0)
        f["ops"] = [U.objs[i].op for i in ids_in if i in U.objs and U.objs[i].depth > 0 and not U.objs[i].aux]
        f["fingerprints"] = {i: list(U.fingerprint(i)) for i in f["ids"] if i in U.objs}
        on_fact(f)
        # đối tượng trong sự kiện được ưu tiên hơn trong phần còn lại của vòng
        for i in f["ids"]:
            if i in U.objs:
                U.objs[i].weight *= 1.3
