"""Cầu nối Newclid: dịch sang JGEX (không cần Newclid) và đánh giá bốn định lý quen thuộc (cần Newclid 2.x).

Bốn sự kiện trong fixtures/bon_dinh_ly.json là đúng các sự kiện do vòng khám phá tìm ra (đường thẳng Euler,
đường tròn Euler, đường thẳng Simson, ba đường tròn Miquel đồng quy) – xem test_kham_pha.py.
"""

import json
import os
import unittest

from lab.prover.bridge import check_fact, newclid_available
from lab.prover.jgex import NotTranslatable, atomic_relations, to_jgex

FIX = os.path.join(os.path.dirname(__file__), "fixtures", "bon_dinh_ly.json")


def facts():
    with open(FIX, encoding="utf-8") as f:
        return json.load(f)


class TestDichJGEX(unittest.TestCase):
    def test_dich_bon_dinh_ly(self):
        for name, f in facts().items():
            if name == "ninepoint2":
                continue
            for rt, ids in atomic_relations(f["type"], f["ids"]):
                with self.subTest(name=name, goal=ids):
                    try:
                        p = to_jgex(f["doc"], rt, ids)
                    except NotTranslatable as e:
                        self.assertEqual(str(e), "không có mục tiêu")
                        continue
                    self.assertIn(" ? ", p.text)
                    self.assertTrue(p.goals)
                    # mọi điểm đều có toạ độ cố định đủ chính xác
                    for clause in p.text.split(" ? ")[0].split("; "):
                        for pt in clause.split(" = ")[0].split():
                            self.assertIn("@", pt)

    def test_simson_dung_cu_phap(self):
        f = facts()["simson"]
        p = to_jgex(f["doc"], f["type"], f["ids"])
        self.assertIn("= triangle", p.text)
        self.assertIn("on_circle", p.text)
        self.assertEqual(p.text.count("foot"), 3)
        self.assertRegex(p.text.split(" ? ")[1], r"^coll ")


@unittest.skipUnless(newclid_available().get("ok"), "chưa cài Newclid 2.x (pip install newclid==2.0.2)")
class TestNewclid(unittest.TestCase):
    def test_bon_dinh_ly_la_tam_thuong(self):
        """Newclid phải chứng minh được (⇒ "tầm thường"): Euler, đường tròn Euler, Simson, Miquel."""
        for name in ("euler", "ninepoint", "simson", "miquel"):
            with self.subTest(name=name):
                r = check_fact(facts()[name], timeout=60)
                self.assertEqual(r["status"], "chung-minh-duoc", json.dumps(r, ensure_ascii=False)[:600])
                self.assertEqual(r["goals_proved"], r["goals_total"])


if __name__ == "__main__":
    unittest.main()
