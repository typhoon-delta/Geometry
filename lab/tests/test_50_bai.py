"""50 bài đứng đầu tầng Khó của lần chạy 1 tiếng (thầy/cô gửi hai đợt: #1–#25, #26–#50), giải tay từng bài.

Gần như tất cả là hệ quả 1–3 bước của bổ đề kinh điển (tiếp điểm đối xứng qua M_a, vị tự tâm A, S_a trung điểm II_a,
điểm Dumpty, hàng điểm điều hoà, bổ đề "bắn" S_aX·S_aR = S_aB²…) và tam giác đồng dạng ⇒ phải đo được (≤ 3 vòng).
Còn lại 5 bài máy chưa tự giải: #7 (thực ra dễ: hình chữ nhật, R chỉ cần nằm trên đường qua A song song CI),
#22 (tứ giác điều hoà), #42, #44, #47."""

import copy
import unittest

from lab.core.model import evaluate, sub_doc
from lab.reason.angles import difficulty
from lab.reason.generalize import holds
from lab.search.base import build_base_doc, make_samples


def S(i, t, a, p=None):
    return (i, t, a, p)


# ---- đợt 1 (#1–#25)
Ia = S("Ia", "excenter", ["A", "B", "C"])
Ra = S("Xa", "foot", ["Ia", "B", "C"])
Q2 = S("Q2", "reflect", ["Ta", "I"])  # đối tâm của T_a
mAD = S("K", "midpoint", ["A", "D"])
pole = [S("d1", "tangent_at", ["w", "B"]), S("d2", "tangent_at", ["w", "C"]), S("Pp", "intersection", ["d1", "d2"])]
tA = [S("d3", "tangent_at", ["w", "A"]), S("Rt", "intersection", ["d3", "BC"])]
hum = [S("Hu", "foot", ["H", "A", "Ma"])]
B25 = {
 1: ([mAD, Ia, Ra], "collinear", ["I", "K", "Xa"]),
 2: ([Ia, Q2, Ra, S("U", "reflect", ["Q2", "BC"]), S("V", "orthocenter", ["C", "Ia", "B"])], "concyclic", ["I", "Xa", "U", "V"]),
 3: ([Ia, Ra, S("R", "reflect", ["Xa", "Ia"])], "collinear", ["A", "Ta", "R"]),
 4: ([S("P", "orthocenter", ["I", "B", "C"]), Ia, S("R", "centroid", ["B", "Ia", "C"])], "collinear", ["P", "Ia", "R"]),
 5: ([Ia, Q2, Ra, S("U", "reflect", ["I", "Q2"]), S("V", "midpoint", ["U", "Xa"])], "collinear", ["O", "Sa", "V"]),
 6: ([Ia, Ra] + pole + [S("U", "midpoint", ["Xa", "I"])], "collinear", ["O", "Pp", "U"]),
 7: ([Ia, S("Ic", "excenter", ["C", "A", "B"]), S("R", "orthocenter", ["A", "Ia", "C"]), S("U", "foot", ["R", "B", "C"]),
      S("lQC", "line", ["Ic", "C"]), S("V", "reflect", ["R", "lQC"])], "concyclic", ["A", "R", "U", "V"]),
 8: (hum + [S("w1", "circle_tangent_at", ["B", "C", "A"]), S("lPC", "line", ["Hu", "C"]), S("Q", "intersection_other", ["lPC", "w1", "Hu"]),
      S("R", "midpoint", ["Hu", "C"])], "concyclic", ["B", "Ma", "Q", "R"]),
 9: ([Ia, Ra, Q2, S("U", "reflect", ["Q2", "O"])], "collinear", ["Ia", "Xa", "U"]),
 10: ([Ia, S("Q", "incenter", ["C", "Ia", "A"]), S("R", "incenter", ["A", "I", "B"])], "concyclic", ["I", "Ia", "Q", "R"]),
 11: (pole + [S("K", "lemoine", ["A", "B", "C"])] + tA + [S("lPK", "line", ["Pp", "K"]), S("U", "reflect", ["O", "lPK"])], "collinear", ["O", "Rt", "U"]),
 12: ([Ia, Q2, Ra, S("U", "orthocenter", ["C", "Ia", "B"]), S("V", "reflect", ["Q2", "Xa"])], "collinear", ["Ta", "U", "V"]),
 13: (hum + [S("Q", "isogonal_conjugate", ["Hu", "A", "B", "C"]), S("R", "circumcenter", ["A", "C", "H"]), S("U", "circumcenter", ["A", "B", "Hu"])], "concyclic", ["O", "Q", "R", "U"]),
 14: (pole + [S("Q", "symmedian_foot", ["A", "B", "C"])] + tA + [S("lOP", "line", ["O", "Pp"]), S("U", "reflect", ["Q", "lOP"])], "concyclic", ["O", "Pp", "Rt", "U"]),
 15: ([Ia, Q2, S("R", "reflect", ["I", "Q2"]), S("U", "midpoint", ["R", "Ia"]), S("V", "reflect", ["Sa", "BC"])], "concyclic", ["I", "Ta", "U", "V"]),
 16: ([mAD, Ia, Q2, S("U", "midpoint", ["Ia", "K"]), S("V", "midpoint", ["K", "Q2"])], "collinear", ["A", "U", "V"]),
 17: ([Ia, S("Ic", "excenter", ["C", "A", "B"]), S("R", "orthocenter", ["A", "Ia", "C"]), S("U", "reflect", ["R", "A"]), S("V", "midpoint", ["Ic", "A"])], "collinear", ["C", "U", "V"]),
 18: ([S("mx", "mixtilinear", ["A", "B", "C"]), S("P", "center", ["mx"]), S("Q", "foot", ["P", "A", "B"]), S("R", "foot", ["P", "A", "C"]),
       S("U", "reflect", ["A", "O"]), S("V", "circumcenter", ["R", "P", "Q"]), S("W", "midpoint", ["P", "U"])], "concyclic", ["O", "Sa", "V", "W"]),
 19: ([mAD, Ia, Ra, S("U", "orthocenter", ["Xa", "Ia", "K"]), S("lRI", "line", ["Xa", "I"]), S("V", "reflect", ["Ia", "lRI"])], "concyclic", ["K", "Xa", "U", "V"]),
 20: ([Ia, Q2, S("R", "centroid", ["B", "Ia", "C"]), S("U", "midpoint", ["Q2", "I"]), S("V", "midpoint", ["Q2", "R"])], "collinear", ["A", "U", "V"]),
 21: ([S("Ib", "excenter", ["B", "C", "A"]), Q2, S("R", "foot", ["I", "A", "B"]), S("U", "reflect", ["Ib", "I"])], "concyclic", ["Ib", "Q2", "R", "U"]),
 22: ([S("K", "lemoine", ["A", "B", "C"])] + tA[:1] + [S("Q", "intersection", ["d3", "BC"]), S("lKB", "line", ["K", "B"]), S("R", "intersection_other", ["lKB", "w", "B"]),
       S("lKC", "line", ["K", "C"]), S("U", "intersection_other", ["lKC", "w", "C"])], "collinear", ["Q", "R", "U"]),
 23: ([S("Ib", "excenter", ["B", "C", "A"]), Q2, S("R", "reflect", ["I", "AB"]), S("U", "reflect", ["Ib", "I"]), S("V", "reflect", ["Ib", "Q2"])], "concyclic", ["I", "R", "U", "V"]),
 24: ([Ia, S("Q", "reflect", ["Ia", "C"]), S("R", "orthocenter", ["I", "B", "C"])], "concyclic", ["C", "I", "Q", "R"]),
 25: ([S("P", "orthocenter", ["B", "C", "O"]), S("Q", "orthocenter", ["A", "C", "O"]), S("lCH", "line", ["C", "H"]), S("R", "reflect", ["O", "lCH"])], "concyclic", ["O", "P", "Q", "R"]),
}

# ---- đợt 2 (#26–#50)
Ia = S("Ia", "excenter", ["A", "B", "C"]); Ic = S("Ic", "excenter", ["C", "A", "B"])
Xa = S("Xa", "foot", ["Ia", "B", "C"]); Q2 = S("Q2", "reflect", ["Ta", "I"]); K = S("K", "midpoint", ["A", "D"])
Hu = S("Hu", "foot", ["H", "A", "Ma"]); w1 = S("w1", "circle_tangent_at", ["B", "C", "A"]); w2 = S("w2", "circle_tangent_at", ["C", "B", "A"])
cS = S("cS", "circle", ["Sa", "B"]); mx = [S("mx", "mixtilinear", ["A", "B", "C"]), S("Pm", "center", ["mx"])]
RAC = S("Rh", "orthocenter", ["A", "Ia", "C"])
B50 = {
 26: ([Ia, Xa, S("l1", "line", ["Sa", "Xa"]), S("R", "intersection_other", ["l1", "w", "Sa"]), S("U", "reflect", ["Xa", "Sa"])], "concyclic", ["I", "Ia", "R", "U"]),
 27: ([K, Ia, Xa, S("U", "reflect", ["Xa", "Ia"]), S("V", "reflect", ["I", "BC"])], "collinear", ["K", "U", "V"]),
 28: ([Ia, Xa, RAC, S("l1", "line", ["Ia", "C"]), S("U", "reflect", ["Rh", "l1"]), S("V", "reflect", ["Rh", "C"])], "concyclic", ["A", "Xa", "U", "V"]),
 29: ([Ia, Q2, S("R", "reflect", ["Ia", "O"]), S("U", "reflect", ["Ia", "I"]), S("V", "reflect", ["I", "Q2"])], "concyclic", ["A", "R", "U", "V"]),
 30: ([Hu, S("Q", "foot", ["C", "Hu", "H"]), S("R", "foot", ["Ma", "C", "A"])], "concyclic", ["A", "H", "Q", "R"]),
 31: ([Hu, w1, S("l1", "line", ["Hu", "C"]), S("Q", "intersection_other", ["l1", "w1", "Hu"]), S("R", "reflect", ["C", "Hu"]), S("U", "reflect", ["C", "AB"])], "concyclic", ["B", "Q", "R", "U"]),
 32: ([Ia, Xa, S("R", "reflect", ["Sa", "BC"]), S("U", "midpoint", ["Xa", "I"])], "collinear", ["Sa", "R", "U"]),
 33: ([Q2, S("Q", "reflect", ["I", "Q2"]), S("R", "reflect", ["Q2", "CA"]), S("l1", "line", ["Q", "C"]), S("U", "reflect", ["Q2", "l1"])], "concyclic", ["C", "I", "R", "U"]),
 34: ([Ia, cS, Xa, S("l1", "line", ["Xa", "Ia"]), S("R", "intersection_other", ["l1", "cS", "Ia"])], "concyclic", ["I", "Ta", "Xa", "R"]),
 35: ([K, Ia, Xa, S("l1", "line", ["Xa", "I"]), S("U", "reflect", ["Ia", "l1"]), S("V", "reflect", ["Ia", "K"]), S("W", "reflect", ["I", "K"])], "concyclic", ["I", "U", "V", "W"]),
 36: ([Ia, Xa, S("l1", "line", ["Ia", "Xa"]), S("R", "reflect", ["I", "l1"]), S("U", "foot", ["I", "Ia", "Xa"]), S("V", "reflect", ["U", "I"])], "concyclic", ["B", "C", "R", "V"]),
 37: ([Ia, Ic, RAC, S("U", "reflect", ["Ic", "C"])], "concyclic", ["C", "Ia", "Rh", "U"]),
 38: ([S("P", "reflect", ["H", "BC"]), S("Q", "reflect", ["A", "O"]), S("R", "reflect", ["Ma", "Ta"]), S("U", "reflect", ["R", "I"]), S("l1", "line", ["U", "Q"]), S("V", "intersection_other", ["l1", "w", "Q"])], "concyclic", ["O", "P", "U", "V"]),
 39: ([Hu, w1, w2, S("Q", "reflect", ["H", "Hu"]), S("l1", "line", ["H", "B"]), S("R", "intersection_other", ["l1", "w1", "B"]), S("l2", "line", ["C", "H"]), S("U", "intersection_other", ["l2", "w2", "C"])], "concyclic", ["H", "Q", "R", "U"]),
 40: ([Ia, Q2, Xa, S("l1", "line", ["Xa", "Ia"]), S("U", "reflect", ["Q2", "Sa"])], "on_line", ["l1", "U"]),
 41: ([Ia, Xa, S("l1", "line", ["I", "Ia"]), S("R", "reflect", ["Xa", "l1"]), S("l2", "line", ["R", "A"]), S("U", "intersection_other", ["l2", "w", "A"])], "concyclic", ["I", "Ia", "R", "U"]),
 42: (mx + [S("Q", "foot", ["Pm", "A", "C"]), S("R", "reflect", ["A", "O"]), S("l1", "line", ["I", "Q"]), S("U", "reflect", ["H", "l1"]), S("l2", "line", ["Pm", "R"])], "on_line", ["l2", "U"]),
 43: ([cS, S("P", "orthocenter", ["I", "B", "C"]), S("Q", "reflect", ["P", "BC"])], "on_circle", ["cS", "I", "Q"]),
 44: (mx + [S("Q", "reflect", ["A", "O"]), S("R", "orthocenter", ["I", "B", "C"]), S("l1", "line", ["H", "R"]), S("l2", "line", ["Pm", "Q"]), S("U", "intersection", ["l1", "l2"]), S("V", "reflect", ["R", "H"])], "concyclic", ["I", "Q", "U", "V"]),
 45: ([Ia, Q2, Xa, S("U", "midpoint", ["Xa", "Ia"]), S("cd", "circle_diameter", ["Q2", "U"])], "on_circle", ["cd", "B", "C"]),
 46: ([cS, S("P", "reflect", ["Ta", "I"]), S("Q", "reflect", ["C", "I"]), S("l1", "line", ["P", "B"]), S("R", "intersection_other", ["l1", "cS", "B"]), S("l2", "line", ["I", "C"]), S("U", "reflect", ["P", "l2"])], "concyclic", ["I", "P", "Q", "R", "U"]),
 47: ([S("P", "reflect", ["H", "AB"]), S("Q", "reflect", ["A", "O"]), S("l1", "line", ["O", "Ta"]), S("l2", "line", ["Ta", "Q"]), S("R", "intersection_other", ["l2", "w", "Q"]), S("l3", "line", ["C", "H"]), S("U", "intersection", ["l3", "l1"]), S("V", "reflect", ["P", "l1"])], "concyclic", ["H", "R", "U", "V"]),
 48: ([Ia, Ic, RAC, S("U", "midpoint", ["Ic", "Rh"]), S("V", "foot", ["Ia", "Rh", "Ic"]), S("W", "foot", ["Rh", "Ia", "O"])], "concyclic", ["O", "U", "V", "W"]),
 49: ([Ia, Ic, RAC, S("U", "reflect", ["Rh", "O"]), S("V", "foot", ["Ic", "C", "A"])], "collinear", ["Ic", "U", "V"]),
 50: ([Ia, Ic, RAC, S("l1", "line", ["Ia", "C"]), S("U", "reflect", ["Rh", "l1"]), S("l2", "line", ["Ic", "C"]), S("V", "reflect", ["Rh", "l2"]), S("W", "isogonal_conjugate", ["U", "A", "B", "C"])], "concyclic", ["C", "I", "V", "W"]),
}

ALL = {**B25, **B50}
CHUA = {7, 22, 42, 44, 47}


def doc_of(k):
    extra, rt, ids = ALL[k]
    d = copy.deepcopy(build_base_doc())
    d["steps"] += [dict(id=i, type=t, args=a, **({"params": p} if p else {})) for i, t, a, p in extra]
    return sub_doc(d, ids, title=""), rt, ids


class TestNamMuoiBai(unittest.TestCase):
    def test_dung_bang_so(self):
        smp = make_samples(6, 11)
        for k in ALL:
            d, rt, ids = doc_of(k)
            self.assertTrue(all(holds(rt, ids, evaluate(d, o), 1e-5) for o in smp), f"bài #{k}")

    def test_do_kho(self):
        for k in ALL:
            d, rt, ids = doc_of(k)
            lv = difficulty(d, rt, ids)
            if k in CHUA:
                self.assertIsNone(lv, f"bài #{k}")
            else:
                self.assertIsInstance(lv, int, f"bài #{k}")
                self.assertLessEqual(lv, 3, f"bài #{k}")
        # bài #1 (đối ngẫu bổ đề trung điểm đường cao): với sổ tri thức là 1 bước, không có thì phải tự chứng minh lại
        self.assertEqual(difficulty(*doc_of(1)), 1)
        self.assertGreater(difficulty(*doc_of(1), classical=False), 1)


if __name__ == "__main__":
    unittest.main()
