"""Phát biểu tiếng Việt và hình SVG của các sự kiện mẫu."""

import json
import os
import unittest

from lab.core.model import validate
from lab.present import display_doc, statement_text
from lab.render_svg import render_svg

FIX = os.path.join(os.path.dirname(__file__), "fixtures", "bon_dinh_ly.json")


class TestTrinhBay(unittest.TestCase):
    def setUp(self):
        with open(FIX, encoding="utf-8") as f:
            self.f = json.load(f)

    def test_simson(self):
        f = self.f["simson"]
        doc = display_doc(f)
        self.assertEqual(validate(doc), [])
        t = statement_text(f, doc)
        self.assertIn("Lấy điểm P tuỳ ý trên (O)", t)
        self.assertIn("hình chiếu vuông góc của P lên đường thẳng BC", t)
        self.assertIn("thẳng hàng", t)
        svg = render_svg(doc)
        self.assertTrue(svg.startswith("<svg") and "<text" in svg)

    def test_miquel(self):
        f = self.f["miquel"]
        t = statement_text(f, display_doc(f))
        self.assertIn("tuỳ ý trên cạnh BC", t)
        self.assertIn("cùng đi qua một điểm", t)

    def test_euler(self):
        f = self.f["euler"]
        t = statement_text(f, display_doc(f))
        self.assertIn("trực tâm H", t)
        self.assertIn("O, H, G, N thẳng hàng", t)


if __name__ == "__main__":
    unittest.main()
