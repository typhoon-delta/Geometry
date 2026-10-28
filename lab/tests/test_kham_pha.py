"""Vòng khám phá phải TỰ tìm lại: đường thẳng Euler, đường tròn Euler (cả 9 điểm), đường thẳng Simson, điểm Miquel.

Chạy đúng mã của `python -m lab chay` (cấu hình gốc + một vòng mở rộng), không gợi ý gì thêm. Mất khoảng 1–2 phút.
"""

import time
import unittest

from lab.config import load_config
from lab.search.base import make_samples
from lab.search.epoch import Epoch, base_facts
from lab.search.facts import FactPipeline


def new_steps(f, base):
    return [s for s in f["doc"]["steps"] if s["id"] not in base and not s.get("hidden")]


class TestKhamPha(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cfg = load_config()["chay"] | {"trong_so_phep_dung": load_config()["trong_so_phep_dung"]}
        cls.pl = FactPipeline()
        cls.base = base_facts(cls.pl, make_samples(cfg["mau"], cfg["hat_giong_mau"]))
        ep = Epoch(cfg, 1, cls.pl)
        cls.found = []
        cls.base_ids = ep.U.base_ids
        cls.t = {}
        t0 = time.time()

        def on(f):
            cls.found.append(f)
            for k, ok in (("simson", cls.is_simson), ("miquel", cls.is_miquel), ("nine", cls.is_nine)):
                if k not in cls.t and ok(f):
                    cls.t[k] = time.time() - t0

        ep.run(time.time() + 150, on)

    @classmethod
    def is_simson(cls, f):
        ns = new_steps(f, cls.base_ids)
        return f["type"] == "collinear" and sorted(s["type"] for s in ns) == ["foot", "foot", "foot", "point_on"] and \
            next(s for s in ns if s["type"] == "point_on")["args"] == ["w"]

    @classmethod
    def is_miquel(cls, f):
        ns = new_steps(f, cls.base_ids)
        ty = sorted(s["type"] for s in ns)
        hosts = sorted(s["args"][0] for s in ns if s["type"] == "point_on")
        if hosts != ["AB", "BC", "CA"]:
            return False
        if f["type"] == "concurrent" and ty.count("circle_3pts") == 3:
            return True
        return f["type"] in ("on_circle", "concyclic") and "intersection_other" in ty

    @classmethod
    def is_nine(cls, f):
        ns = new_steps(f, cls.base_ids)
        return f["type"] == "on_circle" and f["ids"][0] == "e" and len(ns) == 1 and ns[0]["type"] == "midpoint" \
            and "H" in ns[0]["args"] and set(ns[0]["args"]) & {"A", "B", "C"}

    def test_duong_thang_euler(self):
        self.assertTrue(any(f["type"] == "collinear" and {"O", "G", "H"} <= set(f["ids"]) for f in self.base))

    def test_duong_tron_euler(self):
        r = next((f for f in self.base if f["type"] == "on_circle" and f["ids"][0] == "e"), None)
        self.assertIsNotNone(r)
        self.assertTrue({"D", "E", "F", "Ma", "Mb", "Mc"} <= set(r["ids"]))
        # ba điểm còn lại (trung điểm AH, BH, CH) được tìm ở lớp 1 – ít nhất một (hai cái kia trùng theo đối xứng tên đỉnh)
        self.assertIn("nine", self.t, "không tìm thấy trung điểm của AH (BH, CH) nằm trên đường tròn Euler")

    def test_simson(self):
        self.assertIn("simson", self.t, "không tìm thấy đường thẳng Simson")

    def test_miquel(self):
        self.assertIn("miquel", self.t, "không tìm thấy điểm Miquel")

    def test_khong_bao_hien_nhien(self):
        # chân đường vuông góc nằm trên cạnh, trung điểm nằm trên đoạn… không được báo
        for f in self.found:
            ns = new_steps(f, self.base_ids)
            if f["type"] == "collinear" and len(ns) == 1 and ns[0]["type"] == "midpoint":
                self.assertFalse(set(ns[0]["args"]) <= set(f["ids"]) and len(f["ids"]) == 3, f["text"])


if __name__ == "__main__":
    unittest.main()
