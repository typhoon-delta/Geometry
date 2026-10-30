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

    def test_diem_dac_biet_chi_de_trang_tri(self):
        import copy

        from lab.reason.generalize import decorative
        from lab.search.base import build_base_doc, make_samples

        base = build_base_doc()

        def mk(extra, ids):
            d = copy.deepcopy(base)
            d["steps"] += extra
            return sub_doc(d, ids, title="")

        S = make_samples(6, 11)
        # Q đối xứng A qua đường Euler, P = CA ∩ OH ⇒ C, O, P, Q đồng viên: đúng với MỌI đường qua O
        d = mk([{"id": "lOH", "type": "line", "args": ["O", "H"]}, {"id": "P", "type": "intersection", "args": ["CA", "lOH"]},
                {"id": "lHN", "type": "line", "args": ["H", "N"]}, {"id": "Q", "type": "reflect", "args": ["A", "lHN"]}],
               ["C", "O", "P", "Q"])
        self.assertEqual(decorative(d, "concyclic", ["C", "O", "P", "Q"], S), {"loai": "euler"})
        # chính đường thẳng Euler, đối xứng của H qua BC trên (O), trung điểm AH trên đường tròn Euler: cần thật
        self.assertIsNone(decorative(mk([], ["O", "G", "H"]), "collinear", ["O", "G", "H"], S))
        self.assertIsNone(decorative(mk([{"id": "X", "type": "reflect", "args": ["H", "BC"]}], ["w", "X"]), "on_circle", ["w", "X"], S))
        self.assertIsNone(decorative(mk([{"id": "X", "type": "midpoint", "args": ["A", "H"]}], ["e", "X"]), "on_circle", ["e", "X"], S))

    def test_nam_bai_thay_co_gui(self):
        """Năm bài đứng đầu tầng Khó của một lần chạy thật, thầy/cô gửi lại: bốn bài thực ra dễ, một bài khó thật."""
        import copy

        from lab.reason.angles import point_form
        from lab.reason.generalize import decorative
        from lab.search.base import build_base_doc, make_samples

        def mk(extra):
            d = copy.deepcopy(build_base_doc())
            d["steps"] += [dict(id=i, type=t, args=a, **({"params": p} if p else {})) for i, t, a, p in extra]
            return d

        humpty = [("hX", "foot", ["H", "A", "Ma"], None), ("hc", "circle_3pts", ["B", "H", "C"], None)]
        bai = {
            # Q là điểm Humpty (đã biết: nằm trên (BHC)), R trực tâm PBC cũng trên (BHC)
            1: (humpty + [("P", "point_on", ["w"], {"t": 2.2}), ("R", "orthocenter", ["C", "P", "B"], None)],
                "concyclic", ["B", "C", "H", "hX", "R"], [("on_circle", ["hc", "hX"])], 1),
            # đường tròn đối xứng của (O) qua BC là (BHC)
            2: ([("P", "circumcenter", ["B", "H", "C"], None), ("w1", "reflect", ["w", "BC"], None),
                 ("Q", "intersection_other", ["CA", "w1", "C"], None), ("R", "circumcenter", ["Q", "B", "A"], None),
                 ("U", "reflect", ["R", "BC"], None)], "concyclic", ["B", "O", "P", "R", "U"], [], 1),
            # phương tích + hệ thức lượng: PM·PO = PB² = PQ·PR
            3: ([("d1", "tangent_at", ["w", "B"], None), ("d2", "tangent_at", ["w", "C"], None),
                 ("P", "intersection", ["d1", "d2"], None), ("Q", "reflect", ["A", "O"], None), ("PQ", "line", ["P", "Q"], None),
                 ("R", "intersection_other", ["PQ", "w", "Q"], None)], "concyclic", ["O", "Ma", "Q", "R"], [], 2),
            4: ([("w1", "reflect", ["w", "BC"], None), ("P", "intersection_other", ["CA", "w1", "C"], None),
                 ("Q", "circumcenter", ["P", "B", "A"], None)], "collinear", ["B", "H", "E", "Q"], [], 1),
            # đối xứng của điểm Humpty qua BC trên đường tròn đường kính OP: khó thật
            5: ([("d1", "tangent_at", ["w", "A"], None), ("P", "intersection", ["d1", "BC"], None),
                 ("w1", "circle_tangent_at", ["B", "C", "A"], None), ("w2", "circle_tangent_at", ["C", "B", "A"], None),
                 ("Q", "intersection_other", ["w1", "w2", "A"], None), ("R", "reflect", ["Q", "BC"], None)],
                "concyclic", ["A", "O", "Ma", "P", "R"], [("collinear", ["A", "Q", "Ma"])], None),
        }
        S = make_samples(6, 11)
        for k, (extra, rt, ids, kls, want) in bai.items():
            full = mk(extra)
            known = [x for r2, i2 in kls for x in point_form(full, r2, i2)]
            d = sub_doc(full, ids, title="")
            self.assertEqual(difficulty(d, rt, ids, known=known), want, f"bài #{k}")
        # bài #3: điểm xuyên tâm đối Q chỉ để trang trí – mọi Q trên (O) đều đúng
        extra, rt, ids, _, _ = bai[3]
        d = sub_doc(mk(extra), ids, title="")
        self.assertEqual(decorative(d, rt, ids, S), {"loai": "tren", "diem": "Q", "duong": "w"})

    def test_dang_thuc_vecto_va_truc_tam(self):
        import copy

        from lab.search.base import build_base_doc

        def mk(extra, ids):
            d = copy.deepcopy(build_base_doc())
            d["steps"] += [dict(id=i, type=t, args=a) for i, t, a in extra]
            return sub_doc(d, ids, title="")

        # P xuyên tâm đối của A; trực tâm PBC = B + C − A (Sylvester với tâm O của (PBC)); đối xứng của O qua BC = B + C − O
        d = mk([("P", "reflect", ["A", "O"]), ("Q", "reflect", ["O", "BC"]), ("R", "orthocenter", ["P", "C", "B"])], ["H", "Q", "R"])
        self.assertEqual(difficulty(d, "collinear", ["H", "Q", "R"]), 1)
        d = mk([("P", "reflect", ["A", "O"]), ("Q", "orthocenter", ["P", "C", "B"]), ("R", "reflect", ["H", "A"])], ["O", "Q", "R"])
        self.assertEqual(difficulty(d, "collinear", ["O", "Q", "R"]), 1)
        # trực tâm Q của BOC: M_aO·M_aQ = M_aB·M_aC; P, R trên BC với M_aP·M_aR = M_aB²
        d = mk([("P", "midpoint", ["Ma", "B"]), ("Q", "orthocenter", ["C", "B", "O"]), ("R", "reflect", ["Ma", "B"])],
               ["O", "P", "Q", "R"])
        self.assertEqual(difficulty(d, "concyclic", ["O", "P", "Q", "R"]), 1)


if __name__ == "__main__":
    unittest.main()
