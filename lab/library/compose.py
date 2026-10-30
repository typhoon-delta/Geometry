"""Ghép các cấu hình kinh điển thành cấu hình xuất phát của một vòng khám phá."""

from __future__ import annotations

import copy

from ..core import geom as G
from ..core.model import ancestors, compute_step, evaluate
from ..search.base import build_base_doc, make_samples
from . import BY_KEY

CORE_BASE = ["A", "B", "C", "BC", "CA", "AB", "w", "O"]


def _same(u, v):
    if u is None or v is None or isinstance(u, dict) or isinstance(v, dict) or u.kind != v.kind:
        return False
    if u.kind == "point":
        return G.dist(u, v) < 1e-9
    if u.kind == "circle":
        return G.dist(u.c, v.c) < 1e-9 and abs(u.r - v.r) < 1e-9
    du, dv = G.unit(u.d), G.unit(v.d)
    return abs(G.cross(du, dv)) < 1e-9 and G.dist_point_line(v.p, u) < 1e-9


def merge_steps(doc, groups, check_samples=None, provenance=None):
    """Thêm các nhóm bước (key, steps) vào doc; bước trùng (bằng số) một đối tượng đã có được GỘP.

    Trả về (doc, alias, provenance): alias id cũ → id được giữ; provenance id → khoá cấu hình đầu tiên dựng ra nó.
    """
    samples = check_samples or make_samples(3, 99)
    vals = [evaluate(doc, o) for o in samples]
    have = {s["id"] for s in doc["steps"]}
    names = {s.get("name") for s in doc["steps"]}
    alias = {}
    prov = dict(provenance or {})
    for key, steps in groups:
        for s in steps:
            if s["id"] in have:
                continue
            s = copy.deepcopy(s)
            s["args"] = [alias.get(a, a) for a in s["args"]]
            vs = [compute_step(s, vals[k], samples[k]) for k in range(len(samples))]
            if any(v is None for v in vs):
                break  # không dựng được trong cấu hình này: bỏ phần còn lại của nhóm
            dup = next((t["id"] for t in doc["steps"] if all(_same(vs[k], vals[k].get(t["id"])) for k in range(len(samples)))), None)
            if dup is not None:
                alias[s["id"]] = dup
                continue
            if s.get("name") in names:
                s.pop("name", None)
            doc["steps"].append(s)
            for k in range(len(samples)):
                vals[k][s["id"]] = vs[k]
            have.add(s["id"])
            prov[s["id"]] = key
            if s.get("name"):
                names.add(s["name"])
    return doc, alias, prov


def start_doc(keys, full_base=False, extra_refs=()):
    """Cấu hình xuất phát = phần cần dùng của cấu hình gốc + các cấu hình trong keys (gộp đối tượng trùng).

    Trả về (doc, provenance, ket_luan) – ket_luan: các kết luận chính (đã đổi id theo phép gộp) kèm khoá cấu hình.
    """
    base = build_base_doc()
    cfgs = [BY_KEY[k] for k in keys]
    need = set(CORE_BASE)
    if full_base:
        need = {s["id"] for s in base["steps"]}
    for c in cfgs:
        need |= c.refs
    need |= {r for r in extra_refs if any(s["id"] == r for s in base["steps"])}
    keep = ancestors(base, need)
    doc = {"format": "hinh-hoc-dong", "version": 1, "title": " + ".join(c.ten for c in cfgs),
           "steps": [copy.deepcopy(s) for s in base["steps"] if s["id"] in keep]}
    prov = {s["id"]: "goc" for s in doc["steps"]}
    doc, alias, prov = merge_steps(doc, [(c.key, c.steps) for c in cfgs], provenance=prov)
    have = {s["id"] for s in doc["steps"]}
    kls = []
    for c in cfgs:
        for rtype, ids in c.ket_luan:
            ids2 = [alias.get(i, i) for i in ids]
            if all(i in have for i in ids2) and len(set(ids2)) == len(ids2):
                kls.append((c.key, rtype, ids2))
    return doc, prov, kls


def choose_pair(rnd, used=None):
    """Chọn hai cấu hình để ghép: ưu tiên cặp có nhãn chung (cùng dính H, ω, I…) và cặp ít được chọn trước đó."""
    from . import CONFIGS

    used = used or {}
    pairs, weights = [], []
    for i, a in enumerate(CONFIGS):
        for b in CONFIGS[i + 1:]:
            share = len(set(a.the) & set(b.the))
            k = f"{a.key}+{b.key}"
            pairs.append((a.key, b.key))
            weights.append((1.0 + 1.5 * share) / (1.0 + 2.0 * used.get(k, 0)))
    return list(rnd.choices(pairs, weights=weights, k=1)[0])
