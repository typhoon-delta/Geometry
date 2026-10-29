"""Đối chiếu lõi Python với lõi JS trên các hình mẫu và MỌI công cụ của thư viện công cụ.

Dữ liệu JS: lab/tests/fixtures/js_doi_chieu.json (sinh bằng `node lab/tools/xuat-doi-chieu.mjs`).
Nếu máy có Node, test còn sinh lại dữ liệu và kiểm tra tệp đã commit vẫn khớp mã JS hiện tại.
"""

import json
import math
import os
import shutil
import subprocess
import unittest

from lab.core.model import evaluate, kinds, validate, value_to_json
from lab.core.codec import encode_doc, decode_doc

HERE = os.path.dirname(__file__)
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
FIXTURE = os.path.join(HERE, "fixtures", "js_doi_chieu.json")
TOL = 1e-9


def load_cases():
    with open(FIXTURE, encoding="utf-8") as f:
        return json.load(f)["cases"]


def close(a, b, scale):
    return abs(a - b) <= TOL * (1 + scale)


def same_value(js, py, scale):
    if js is None or py is None:
        return js is None and py is None
    if js.get("kind") != py.get("kind"):
        return False
    k = js["kind"]
    if k == "point":
        return close(js["x"], py["x"], scale) and close(js["y"], py["y"], scale)
    if k == "line":
        return (js["sub"] == py["sub"] and all(close(js[a][c], py[a][c], scale) for a in ("p", "d") for c in ("x", "y")))
    if k == "circle":
        return close(js["c"]["x"], py["c"]["x"], scale) and close(js["c"]["y"], py["c"]["y"], scale) and close(js["r"], py["r"], scale)
    # dấu trang trí: so sánh toạ độ các điểm
    return _same_mark(js, py, scale)


def _same_mark(a, b, scale):
    if isinstance(a, dict) and isinstance(b, dict):
        return a.keys() == b.keys() and all(_same_mark(a[k], b[k], scale) for k in a)
    if isinstance(a, list) and isinstance(b, list):
        return len(a) == len(b) and all(_same_mark(x, y, scale) for x, y in zip(a, b))
    if isinstance(a, (int, float)) and isinstance(b, (int, float)):
        return close(a, b, scale)
    return a == b


class TestDoiChieuJS(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.cases = load_cases()

    def test_co_du_cong_cu(self):
        names = {c["name"] for c in self.cases}
        self.assertGreaterEqual(sum(n.startswith("cong-cu:") for n in names), 60)
        self.assertIn("vi-du:simson", names)

    def test_gia_tri_khop_js(self):
        checked = 0
        for case in self.cases:
            doc = case["doc"]
            self.assertEqual(validate(doc), [], case["name"])
            k = kinds(doc)
            ovs = [None] + case["overrides"]
            for ov, js_vals in zip(ovs, case["values"]):
                vals = evaluate(doc, ov)
                for sid, jv in js_vals.items():
                    pv = value_to_json(vals.get(sid))
                    scale = 10.0
                    with self.subTest(case=case["name"], id=sid, kind=k.get(sid)):
                        self.assertTrue(same_value(jv, pv, scale), f"{case['name']} {sid}: JS={jv} Py={pv}")
                    checked += 1
        self.assertGreater(checked, 3000)

    def test_ma_hoa_url_hai_chieu(self):
        for case in self.cases[:12]:
            doc = case["doc"]
            back = decode_doc(encode_doc(doc))
            self.assertEqual(len(back["steps"]), len(doc["steps"]))
            v1, v2 = evaluate(doc), evaluate(back)
            for s in doc["steps"]:
                self.assertTrue(same_value(value_to_json(v1[s["id"]]), value_to_json(v2[s["id"]]), 1))

    @unittest.skipUnless(shutil.which("node"), "máy không có Node.js")
    def test_ma_url_python_mo_duoc_bang_js(self):
        """Link do Python sinh ra phải giải mã được bằng chính codec.js của công cụ web."""
        doc = self.cases[2]["doc"]
        code = encode_doc(doc)
        script = (
            "import { decodeDoc } from './src/io/codec.js';"
            f"const d = await decodeDoc({json.dumps(code)});"
            "console.log(JSON.stringify({n: d.steps.length, t: d.title}));"
        )
        out = subprocess.run(["node", "--input-type=module", "-e", script], cwd=ROOT, capture_output=True, text=True, timeout=60)
        self.assertEqual(out.returncode, 0, out.stderr)
        res = json.loads(out.stdout)
        self.assertEqual(res["n"], len(doc["steps"]))

    @unittest.skipUnless(shutil.which("node"), "máy không có Node.js")
    def test_du_lieu_doi_chieu_con_moi(self):
        """Tệp đối chiếu đã commit phải khớp mã JS hiện tại (nhắc chạy lại script khi sửa lõi JS)."""
        out = subprocess.run(["node", os.path.join("lab", "tools", "xuat-doi-chieu.mjs")], cwd=ROOT,
                             capture_output=True, text=True, timeout=300)
        self.assertEqual(out.returncode, 0, out.stderr)
        fresh = json.loads(out.stdout)["cases"]
        self.assertEqual([c["name"] for c in fresh], [c["name"] for c in self.cases])
        for a, b in zip(fresh, self.cases):
            self.assertEqual(json.dumps(a["doc"], sort_keys=True), json.dumps(b["doc"], sort_keys=True), a["name"])


if __name__ == "__main__":
    unittest.main()
