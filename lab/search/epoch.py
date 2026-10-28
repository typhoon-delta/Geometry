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


def base_with_stations(stations_specs):
    """Cấu hình gốc + các trạm (mỗi trạm: danh sách bước dựng ra nó, id đã đổi để không trùng)."""
    doc = build_base_doc()
    have = {s["id"] for s in doc["steps"]}
    names = {s.get("name") for s in doc["steps"]}
    for spec in stations_specs:
        for s in spec["steps"]:
            if s["id"] in have:
                continue
            s = copy.deepcopy(s)
            if s.get("name") in names:
                s.pop("name", None)
            doc["steps"].append(s)
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


class Epoch:
    def __init__(self, cfg, seed, pipeline, stations=None, station_specs=(), log=print):
        self.cfg = cfg
        self.seed = seed
        self.pipeline = pipeline
        self.stations = stations or {}
        self.log = log
        samples = make_samples(cfg["mau"], cfg["hat_giong_mau"])
        self.U = Universe(base_with_stations(station_specs), samples, tol=cfg["dung_sai"], fp_samples=make_fp_samples(samples))
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
