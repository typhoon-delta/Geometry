"""25 bài đứng đầu tầng Khó của lần chạy 1 tiếng (thầy/cô gửi). Giải tay: 14 bài là hệ quả ngắn của các bổ đề
kinh điển về đường tròn nội tiếp – bàng tiếp (tiếp điểm đối xứng qua M_a, vị tự tâm A, S_a là trung điểm II_a, trực tâm
IBC = B + C − I_a…) ⇒ phải đo được là dễ (≤ 2 vòng) khi dùng sổ tri thức bổ đề; các bài còn lại cần ý thật (vị tự,
hàng điểm điều hoà, đối trung…) ⇒ vẫn "khó"."""

import copy
import unittest

from lab.core.model import evaluate, sub_doc
from lab.reason.angles import difficulty
from lab.reason.generalize import holds
from lab.search.base import build_base_doc, make_samples

def S(i, t, a, p=None):
    return (i, t, a, p)

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


DE = {1, 2, 3, 4, 5, 6, 8, 9, 12, 15, 17, 19, 21, 24}


def doc_of(k):
    extra, rt, ids = B25[k]
    d = copy.deepcopy(build_base_doc())
    d["steps"] += [dict(id=i, type=t, args=a, **({"params": p} if p else {})) for i, t, a, p in extra]
    return sub_doc(d, ids, title=""), rt, ids


class TestHaiMuoiLamBai(unittest.TestCase):
    def test_dung_bang_so(self):
        S = make_samples(6, 11)
        for k in B25:
            d, rt, ids = doc_of(k)
            self.assertTrue(all(holds(rt, ids, evaluate(d, o), 1e-5) for o in S), f"bài #{k}")

    def test_do_kho(self):
        for k in B25:
            d, rt, ids = doc_of(k)
            lv = difficulty(d, rt, ids)
            if k in DE:
                self.assertIsInstance(lv, int, f"bài #{k}")
                self.assertLessEqual(lv, 2, f"bài #{k}")
            else:
                self.assertIsNone(lv, f"bài #{k} (khó thật)")
            # không có sổ tri thức thì (gần như) không bài nào suy ra được
        self.assertIsNone(difficulty(*doc_of(1), classical=False))


if __name__ == "__main__":
    unittest.main()
