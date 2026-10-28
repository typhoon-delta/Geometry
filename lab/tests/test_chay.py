"""Bộ chạy: chạy ngắn, lưu tiến độ, chạy tiếp, sinh báo cáo HTML có link #h=, phản hồi chỉnh trọng số.

Dùng thư mục tạm (biến môi trường LAB_DU_LIEU, LAB_BAO_CAO) để không đụng dữ liệu thật.
"""

import json
import os
import re
import subprocess
import sys
import tempfile
import unittest

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))


def rj(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def rt(path):
    with open(path, encoding="utf-8") as f:
        return f.read()


def run_lab(env, *args, timeout=600):
    return subprocess.run([sys.executable, "-m", "lab", *args], cwd=ROOT, env=env, capture_output=True, text=True,
                          timeout=timeout, encoding="utf-8")


class TestChay(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.mkdtemp(prefix="lab-test-")
        cls.env = dict(os.environ, LAB_DU_LIEU=os.path.join(cls.tmp, "du-lieu"), LAB_BAO_CAO=os.path.join(cls.tmp, "reports"),
                       PYTHONIOENCODING="utf-8")

    def test_1_chay_ngan_roi_chay_tiep(self):
        out = run_lab(self.env, "chay", "--phut", "0.6", "--khong-newclid")
        self.assertEqual(out.returncode, 0, out.stderr[-2000:])
        runs = os.listdir(os.path.join(self.tmp, "du-lieu", "lan-chay"))
        self.assertEqual(len(runs), 1)
        rdir = os.path.join(self.tmp, "du-lieu", "lan-chay", runs[0])
        st = rj(os.path.join(rdir, "trang-thai.json"))
        facts = rj(os.path.join(rdir, "su-kien.json"))
        self.assertTrue(st["xong"])
        self.assertGreater(len(facts), 10)
        # giả lập bị tắt giữa chừng: đánh dấu chưa xong, tăng ngân sách → lần sau chạy TIẾP đúng lần chạy đó
        st["xong"] = False
        st["ngan_sach_giay"] = st["da_chay_giay"] + 20
        with open(os.path.join(rdir, "trang-thai.json"), "w", encoding="utf-8") as f:
            json.dump(st, f)
        out2 = run_lab(self.env, "chay", "--khong-newclid")
        self.assertEqual(out2.returncode, 0, out2.stderr[-2000:])
        self.assertIn("Chạy tiếp", out2.stdout)
        self.assertEqual(len(os.listdir(os.path.join(self.tmp, "du-lieu", "lan-chay"))), 1)
        st2 = rj(os.path.join(rdir, "trang-thai.json"))
        self.assertGreater(st2["vong"], st["vong"])
        self.assertGreaterEqual(len(rj(os.path.join(rdir, "su-kien.json"))), len(facts))

    def test_2_bao_cao(self):
        out = run_lab(self.env, "bao-cao", "--khong-mo")
        self.assertEqual(out.returncode, 0, out.stderr[-2000:])
        reports = os.path.join(self.tmp, "reports")
        run = [d for d in os.listdir(reports) if os.path.isdir(os.path.join(reports, d))][0]
        page = rt(os.path.join(reports, run, "index.html"))
        self.assertIn("Chứng minh rằng", page)
        links = re.findall(r'href="(https://[^"]+#h=z[A-Za-z0-9_-]+)"', page)
        self.assertTrue(links)
        # link giải mã được thành hình hợp lệ (cùng cơ chế với công cụ web)
        from lab.core.codec import decode_doc

        doc = decode_doc(links[0].split("#h=")[1])
        self.assertGreater(len(doc["steps"]), 3)
        self.assertIn("<svg", page)
        self.assertTrue(os.path.exists(os.path.join(reports, "index.html")))

    def test_3_phan_hoi_chinh_trong_so(self):
        from lab.feedback import effective_weights

        base = {"loai_thang_hang": 2.0, "dac_biet": 1.2}
        fb = {"a": {"danh_gia": "chan", "dac_trung": {"loai_thang_hang": 1.0}},
              "b": {"danh_gia": "chan", "dac_trung": {"loai_thang_hang": 1.0}},
              "c": {"danh_gia": "hay", "dac_trung": {"dac_biet": 2.0}}}
        w, d = effective_weights(base, fb, 0.15)
        self.assertLess(w["loai_thang_hang"], 2.0)
        self.assertGreater(w["dac_biet"], 1.2)


if __name__ == "__main__":
    unittest.main()
