"""Bộ suy luận đo độ khó (lab/reason/angles.py): đuổi góc + lớp affine + lớp độ dài.

Mức khó = số vòng suy luận (1 = thẳng từ giả thiết); None = không suy ra được (cần tỉ số phức tạp, Ceva…).
"""

import unittest

from lab.core.model import sub_doc
from lab.library.compose import start_doc
from lab.reason.angles import difficulty


def tri(*extra):
    steps = [{"id": "A", "type": "free_point", "args": [], "params": {"x": 0.3, "y": 3.1}},
             {"id": "B", "type": "free_point", "args": [], "params": {"x": -2.2, "y": -0.4}},
             {"id": "C", "type": "free_point", "args": [], "params": {"x": 3.0, "y": -0.6}}]
    for sid, typ, args, *rest in extra:
        s = {"id": sid, "type": typ, "args": list(args)}
        if rest:
            s["params"] = rest[0]
        steps.append(s)
    return {"format": "hinh-hoc-dong", "version": 1, "steps": steps}


def kl_level(key, i=0):
    doc, _, kls = start_doc([key])
    _, rtype, ids = kls[i]
    return difficulty(sub_doc(doc, ids, title=""), rtype, ids)


class TestSuyLuan(unittest.TestCase):
    def test_bo_de_kinh_dien(self):
        self.assertEqual(kl_level("simson"), 2)      # cần các tứ giác nội tiếp có góc vuông
        self.assertEqual(kl_level("miquel"), 1)
        self.assertEqual(kl_level("dxH"), 1)          # đối xứng của H qua BC nằm trên (O)
        self.assertEqual(kl_level("tbt", 1), 1)       # A, I, S_a, I_a thẳng hàng
        self.assertIsNone(kl_level("gergonne"))       # cần Ceva – ngoài tầm đuổi góc
        self.assertIsNone(kl_level("nagel"))

    def test_duong_trung_binh(self):
        # M, N trung điểm AB, AC ⇒ MN ∥ BC (lớp affine)
        d = tri(("M", "midpoint", ["A", "B"]), ("N", "midpoint", ["A", "C"]), ("l1", "line", ["M", "N"]),
                ("l2", "line", ["B", "C"]))
        self.assertEqual(difficulty(d, "parallel", ["l1", "l2"]), 1)

    def test_duong_thang_euler_tam_giac_bat_ky(self):
        d = tri(("O", "circumcenter", ["A", "B", "C"]), ("H", "orthocenter", ["B", "C", "A"]),
                ("G", "centroid", ["C", "A", "B"]))
        self.assertEqual(difficulty(d, "collinear", ["O", "G", "H"]), 1)

    def test_phuong_tich(self):
        # Q trên AB; U đối xứng Q qua B, W trung điểm QA; QR cắt (O) tại V ⇒ R, V, U, W đồng viên (QU·QW = QA·QB = QR·QV)
        d = tri(("w", "circumcircle", ["A", "B", "C"]), ("AB", "segment", ["A", "B"]),
                ("Q", "point_on", ["AB"], {"t": 0.35}), ("R", "point_on", ["w"], {"t": 4.4}),
                ("U", "reflect", ["Q", "B"]), ("W", "midpoint", ["Q", "A"]), ("QR", "line", ["Q", "R"]),
                ("V", "intersection_other", ["QR", "w", "R"]))
        lv = difficulty(d, "concyclic", ["R", "U", "V", "W"])
        self.assertIsInstance(lv, int)
        self.assertLessEqual(lv, 2)

    def test_diem_tren_truc_doi_xung(self):
        # U trên AB, V đối xứng U qua phân giác BI ⇒ V nằm trên BC
        d = tri(("I", "incenter", ["A", "B", "C"]), ("AB", "segment", ["A", "B"]), ("BC", "line", ["B", "C"]),
                ("U", "point_on", ["AB"], {"t": 0.4}), ("V", "reflect_pts", ["U", "B", "I"]))
        self.assertIsInstance(difficulty(d, "on_line", ["BC", "V"]), int)

    def test_khong_suy_ra_dieu_sai_kieu(self):
        # "?" cho loại quan hệ không biểu diễn được, không làm đổ chương trình
        d = tri(("M", "midpoint", ["A", "B"]), ("M2", "midpoint", ["B", "A"]))
        self.assertEqual(difficulty(d, "coincide", ["M", "M2"]), "?")


if __name__ == "__main__":
    unittest.main()
