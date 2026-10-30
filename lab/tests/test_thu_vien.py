"""Thư viện cấu hình kinh điển: mọi cấu hình dựng được, mọi kết luận chính đúng bằng số trên nhiều tam giác."""

import itertools
import unittest

from lab.core import geom as G
from lab.core.model import evaluate, validate
from lab.library import CONFIGS
from lab.library.compose import start_doc
from lab.search.base import make_samples
from lab.search.epoch import free_param_samples


def holds(rtype, ids, v, eps):
    P = [v[i] for i in ids]
    if any(x is None for x in P):
        return False
    if rtype == "collinear":
        return all(G.dist_point_line(x, G.line_through(P[0], P[1])) < eps for x in P[2:])
    if rtype == "concyclic":
        c = G.circle_through(P[0], P[1], P[2])
        return c is not None and all(abs(G.dist(x, c.c) - c.r) < eps for x in P[3:])
    if rtype == "on_circle":
        return all(abs(G.dist(x, P[0].c) - P[0].r) < eps for x in P[1:])
    if rtype == "on_line":
        return all(G.dist_point_line(x, P[0]) < eps for x in P[1:])
    if rtype == "parallel":
        return abs(G.cross(G.unit(P[0].d), G.unit(P[1].d))) < eps
    if rtype == "perpendicular":
        return abs(G.dot(G.unit(P[0].d), G.unit(P[1].d))) < eps
    if rtype == "tangent":
        a, b = P
        if a.kind == "line":
            return abs(G.dist_point_line(b.c, a) - b.r) < eps
        d = G.dist(a.c, b.c)
        return min(abs(d - a.r - b.r), abs(d - abs(a.r - b.r))) < eps
    if rtype == "same_circle":
        return G.dist(P[0].c, P[1].c) < eps and abs(P[0].r - P[1].r) < eps
    if rtype == "midpoint":
        return G.dist(P[0], G.mid(P[1], P[2])) < eps
    if rtype == "phuong_tich":
        return abs(G.dist(P[0], P[1]) * G.dist(P[0], P[2]) - G.dist(P[0], P[3]) ** 2) < eps * 10
    raise AssertionError(rtype)


class TestThuVien(unittest.TestCase):
    def test_ket_luan_dung(self):
        self.assertGreaterEqual(len(CONFIGS), 25)
        samples = make_samples(10, 7)
        for c in CONFIGS:
            with self.subTest(cau_hinh=c.key):
                doc, prov, kls = start_doc([c.key])
                self.assertEqual(validate(doc), [])
                self.assertEqual(len(kls), len(c.ket_luan), "kết luận bị mất khi gộp")
                for ov in free_param_samples(doc, samples):
                    v = evaluate(doc, ov)
                    for key, rtype, ids in kls:
                        if any(v.get(i) is None for i in ids):
                            continue  # cấu hình suy biến ở mẫu này (vd điểm rơi vào trong đường tròn)
                        self.assertTrue(holds(rtype, ids, v, 1e-7), f"{c.key}: {rtype} {ids}")

    def test_ghep_hai_cau_hinh(self):
        n = 0
        for a, b in itertools.combinations([c.key for c in CONFIGS], 2):
            doc, prov, kls = start_doc([a, b])
            self.assertEqual(validate(doc), [], (a, b))
            self.assertTrue(any(p == a for p in prov.values()) or not [s for s in doc["steps"] if s["id"].startswith(a + "_")])
            n += 1
        self.assertGreater(n, 300)

    def test_gop_doi_tuong_trung(self):
        # Simson và Steiner dùng cùng điểm P trên (O) → gộp thành một
        doc, prov, kls = start_doc(["simson", "steiner"])
        self.assertEqual(sum(1 for s in doc["steps"] if s["type"] == "point_on"), 1)
        self.assertEqual(len(kls), 2)

    def test_dich_sang_newclid(self):
        # mọi cấu hình (trừ BHC: đối xứng của đường tròn) dịch được sang JGEX – để Newclid làm ý kiến thứ hai
        from lab.core.model import sub_doc
        from lab.prover.jgex import NotTranslatable, to_jgex

        for c in CONFIGS:
            doc, _, kls = start_doc([c.key])
            for _, rtype, ids in kls:
                if c.key == "BHC":
                    with self.assertRaises(NotTranslatable):
                        to_jgex(sub_doc(doc, ids, title=""), rtype, ids)
                    continue
                pr = to_jgex(sub_doc(doc, ids, title=""), rtype, ids)
                self.assertTrue(pr.goals, c.key)


if __name__ == "__main__":
    unittest.main()
