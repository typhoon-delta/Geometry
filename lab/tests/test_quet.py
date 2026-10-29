"""Bộ quét quan hệ Python: cho cùng kết quả với bộ khám phá JS, và tự tìm các định lý quen thuộc."""

import json
import os
import unittest

from lab.core.model import step_by_id
from lab.scan.explorer import explore, rng

FIXTURE = os.path.join(os.path.dirname(__file__), "fixtures", "js_doi_chieu.json")


def cases_with_explore():
    with open(FIXTURE, encoding="utf-8") as f:
        return [c for c in json.load(f)["cases"] if "explore" in c]


def by_name(doc):
    return lambda n: next(s["id"] for s in doc["steps"] if s.get("name") == n)


class TestQuet(unittest.TestCase):
    def test_bo_sinh_ngau_nhien_giong_js(self):
        r = rng(12345)
        # giá trị đầu của mulberry32(12345) trong JS
        self.assertAlmostEqual(r(), 0.9797282677609473, places=15)

    def test_khop_ket_qua_js(self):
        for case in cases_with_explore():
            with self.subTest(case=case["name"]):
                res = explore(case["doc"])
                js = case["explore"]
                self.assertEqual(res["stats"]["samples"], js["stats"]["samples"])
                self.assertEqual(res["stats"]["attempts"], js["stats"]["attempts"])
                got = [(r["type"], tuple(r["ids"]), r["score"]) for r in res["relations"]]
                want = [(r["type"], tuple(r["ids"]), r["score"]) for r in js["relations"]]
                self.assertEqual(got, want)
                self.assertEqual([r["text"] for r in res["relations"]], [r["text"] for r in js["relations"]])

    def test_simson(self):
        doc = next(c["doc"] for c in cases_with_explore() if c["name"] == "vi-du:simson")
        i = by_name(doc)
        res = explore(doc)
        self.assertTrue(any(r["type"] == "collinear" and {i("D"), i("E"), i("F")} <= set(r["ids"]) for r in res["relations"]))
        self.assertFalse(any(r["type"] == "on_line" for r in res["relations"]))

    def test_euler_dung_dau(self):
        doc = next(c["doc"] for c in cases_with_explore() if c["name"] == "vi-du:euler_line")
        i = by_name(doc)
        res = explore(doc)
        top = res["relations"][0]
        self.assertEqual(top["type"], "collinear")
        self.assertEqual(set(top["ids"]), {i("O"), i("G"), i("H")})
        self.assertEqual(step_by_id(doc, top["ids"][0])["name"], "O")


if __name__ == "__main__":
    unittest.main()
