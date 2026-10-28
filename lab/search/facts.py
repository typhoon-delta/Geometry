"""Từ ỨNG VIÊN quan hệ trong vũ trụ đến SỰ KIỆN đã kiểm chứng.

1. Khoá chuẩn (dấu vân tay hình học) → bỏ qua nếu đã gặp (ở vòng này hoặc vòng trước).
2. Tài liệu con tối thiểu = bao đóng phụ thuộc của các đối tượng trong quan hệ.
3. Lọc nhanh bằng "kiến thức hiển nhiên" (Knowledge) của tài liệu con.
4. Kiểm chứng lại bằng bộ quét đầy đủ (lab/scan/explorer.py) trên cấu hình ngẫu nhiên MỚI của tài liệu con
   (loại cấu hình suy biến, loại quan hệ hiển nhiên) – chỉ giữ các quan hệ có chứa đối tượng mới nhất.
"""

from __future__ import annotations

import copy
import hashlib

from ..core.model import sub_doc
from ..scan.explorer import explore
import functools

from ..core.steps import STEP_TYPES
from ..scan.knowledge import KnowledgePlus, fact_known, relation_facts

POINT_SET = {"collinear", "concyclic"}


def _fp_list(U, ids, j=None):
    return sorted(U.fingerprint(i, j) for i in ids)


def _through(U, cid):
    """Các điểm dựng nên đường thẳng (qua 2 điểm) / đường tròn (qua 3 điểm), nếu có."""
    st = U.step.get(cid)
    if st and st["type"] in ("line", "segment", "ray"):
        return "col", list(st["args"])
    if st and st["type"] in ("circle_3pts", "circumcircle"):
        return "cyc", list(st["args"])
    return None, None


def _canonical_j(U, rtype, ids, j):
    if rtype in ("on_line", "on_circle"):
        c, pts = ids[0], ids[1:]
        tag, through = _through(U, c)
        if tag:
            return (tag, tuple(sorted(set(_fp_list(U, through + pts, j)))))
        return ("on" if rtype == "on_line" else "onc", U.fingerprint(c, j), tuple(_fp_list(U, pts, j)))
    if rtype in ("same_line", "same_circle"):
        a, b = ids
        ta, pa = _through(U, a)
        tb, pb = _through(U, b)
        if ta and tb:
            return (ta, tuple(sorted(set(_fp_list(U, pa + pb, j)))))
    if rtype == "collinear":
        return ("col", tuple(_fp_list(U, ids, j)))
    if rtype == "concyclic":
        return ("cyc", tuple(_fp_list(U, ids, j)))
    return (rtype, tuple(_fp_list(U, ids, j)))


def canonical(U, rtype, ids):
    """Khoá chuẩn của một quan hệ: độc lập với cách dựng (on_line qua 2 điểm ≡ thẳng hàng...) và với cách
    gọi tên các đỉnh A, B, C (lấy nhỏ nhất qua 6 hoán vị)."""
    js = list(range(U.F)) or [None]
    return min(_canonical_j(U, rtype, ids, j) for j in js)


def coincide_key(U, existing, step):
    js = list(range(U.F)) or [None]
    args = [a for a in step["args"] if a in U.objs]
    return min(("eq", U.fingerprint(existing, j), step["type"], tuple(_fp_list(U, args, j))) for j in js)


def key_str(key) -> str:
    return hashlib.blake2b(repr(key).encode(), digest_size=10).hexdigest()


def trivial_by_knowledge(doc, rtype, ids, extra=()):
    k = KnowledgePlus(doc, extra=extra)
    try:
        if rtype == "collinear":
            return k.collinear(ids)
        if rtype == "concyclic":
            return k.concyclic(ids)
        if rtype == "on_line":
            return all(k.point_on_line_obj(p, ids[0]) for p in ids[1:])
        if rtype == "on_circle":
            return all(k.point_on_circle_obj(p, ids[0]) for p in ids[1:])
        if rtype == "parallel":
            return k.parallel(*ids)
        if rtype == "perpendicular":
            return k.perpendicular(*ids)
        if rtype == "tangent":
            return k.tangent(*ids)
    except Exception:  # noqa: BLE001
        return False
    return False


def coincide_trivial(doc, step, existing, extra=()):
    """Điểm mới (bước step) trùng điểm existing: tầm thường nếu existing đã thoả mọi sự kiện định nghĩa của step."""
    d = STEP_TYPES.get(step["type"])
    if d is None or d.facts is None:
        return False
    k = KnowledgePlus(doc, extra=extra)
    kinds_ = [k.kind.get(a) for a in step["args"]]
    st = dict(step, id=existing)
    try:
        facts = d.facts(st, kinds_, doc) or []
    except Exception:  # noqa: BLE001
        return False
    return bool(facts) and all(fact_known(k, f) for f in facts)


class FactPipeline:
    def __init__(self, seen=None, samples=12, seed=2024):
        self.seen = seen if seen is not None else {}  # khoá → 'tam-thuong' | 'sai' | id sự kiện
        self.samples = samples
        self.seed = seed
        self.known = []  # sự kiện đã tìm được trong vòng này (dạng Knowledge) – dùng làm kiến thức
        self.base_known = []  # sự kiện của cấu hình gốc (id cố định, dùng cho mọi vòng)
        self.stats = {"ung_vien": 0, "da_gap": 0, "hien_nhien": 0, "khong_xac_nhan": 0, "su_kien": 0}

    def new_epoch(self):
        self.known = []

    def remember(self, rel_type, ids, base=False):
        (self.base_known if base else self.known).extend(relation_facts(rel_type, ids))

    def consider(self, U, rel, newest, extra_step=None):
        """rel = (loại, ids). Trả về danh sách sự kiện mới (dict)."""
        rtype, ids = rel
        self.stats["ung_vien"] += 1
        try:
            key = key_str(canonical(U, rtype, ids)) if extra_step is None else None
        except (KeyError, AttributeError):
            key = None
        if key is not None and key in self.seen:
            self.stats["da_gap"] += 1
            return []
        doc = U.doc
        if extra_step is not None:
            doc = copy.deepcopy(U.doc)
            doc["steps"].append(extra_step)
        sub = sub_doc(doc, ids, title="")
        extra = self.base_known + self.known
        if extra_step is None and trivial_by_knowledge(sub, rtype, ids, extra):
            self.stats["hien_nhien"] += 1
            self.seen[key] = "tam-thuong"
            return []
        if extra_step is not None:
            sub0 = sub_doc(U.doc, [ids[0]] + [a for a in extra_step["args"] if a in U.objs], title="")
            if coincide_trivial(sub0, extra_step, ids[0], extra):
                self.stats["hien_nhien"] += 1
                return []
        res = explore(sub, samples=self.samples, seed=self.seed, knowledge=functools.partial(KnowledgePlus, extra=extra))
        found = [r for r in res["relations"] if newest in r["ids"]]
        if not found:
            self.stats["khong_xac_nhan"] += 1
            if key is not None:
                self.seen[key] = "khong-xac-nhan"
            return []
        out = []
        for r in found:
            if extra_step is not None:
                # quan hệ trùng nhau: khoá theo điểm đã có + cách dựng mới
                k2 = key_str(coincide_key(U, ids[0], extra_step))
            else:
                try:
                    k2 = key_str(canonical(U, r["type"], r["ids"]))
                except (KeyError, AttributeError):
                    k2 = key_str((r["type"], tuple(r["ids"])))
            if k2 in self.seen:
                continue
            self.seen[k2] = "su-kien"
            if key is not None:
                self.seen.setdefault(key, "su-kien")
            self.remember(r["type"], r["ids"])
            fact_doc = sub_doc(doc, r["ids"], title="")
            out.append({
                "key": k2,
                "type": r["type"],
                "ids": r["ids"],
                "text": r["text"],
                "note": r.get("note"),
                "js_score": r["score"],
                "doc": fact_doc,
                "newest": newest,
                "special": {i: v for i, v in res["special"].items() if i in {s["id"] for s in fact_doc["steps"]}},
            })
        self.stats["su_kien"] += len(out)
        return out
