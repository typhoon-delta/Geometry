"""THƯ VIỆN CẤU HÌNH KINH ĐIỂN cho vòng khám phá "ghép bổ đề".

Mỗi cấu hình dựng trên tam giác ABC chung, được phép tham chiếu các đối tượng chuẩn của cấu hình gốc
(lab/search/base.py: O, H, I, G, N, D, E, F, M_a…, T_a…, S_a…, S'_a…, ω, γ, ε, ba cạnh BC, CA, AB) và
thêm các bước riêng (id dạng "<khoá>_<số>"). Mỗi cấu hình khai báo:

    ten        tên tiếng Việt
    ket_luan   các KẾT LUẬN CHÍNH của bổ đề (coi là đã biết: không báo lại, và được dùng như kiến thức khi
               đo độ khó) – các quan hệ khác nằm gọn trong một bổ đề vẫn được báo (trừ nhẹ điểm). Ngoài các
               loại quan hệ thường, có loại "midpoint" [M, X, Y]: M là trung điểm XY, và "phuong_tich" [M, X, Y, Z]: X, Y nằm trên
               một đường qua M và MX·MY = MZ².
    the        nhãn (để ưu tiên ghép các cấu hình "hợp nhau")

Khi ghép hai cấu hình, các đối tượng trùng nhau (bằng số) được gộp; quan hệ nối phần của cấu hình này với
phần của cấu hình kia được cộng điểm "giao thoa".
"""

from __future__ import annotations

from dataclasses import dataclass, field

BASE_REFS = {"A", "B", "C", "BC", "CA", "AB", "w", "O", "H", "I", "G", "N", "g", "e", "D", "E", "F", "Ma", "Mb", "Mc",
             "Ta", "Tb", "Tc", "Sa", "Sb", "Sc", "Ra", "Rb", "Rc"}


class Builder:
    def __init__(self, key):
        self.key = key
        self.steps = []
        self.refs = set()
        self.ket_luan = []

    def _arg(self, a):
        if a in BASE_REFS:
            self.refs.add(a)
        return a

    def add(self, typ, args, name=None, params=None, hidden=False):
        sid = f"{self.key}_{len(self.steps)}"
        s = {"id": sid, "type": typ, "args": [self._arg(a) for a in args]}
        if params:
            s["params"] = dict(params)
        if name:
            s["name"] = name
        if hidden:
            s["hidden"] = True
        self.steps.append(s)
        return sid

    def line(self, a, b):
        return self.add("line", [a, b], hidden=True)

    def kl(self, rtype, ids):
        self.ket_luan.append((rtype, [self._arg(i) for i in ids]))


@dataclass
class Config:
    key: str
    ten: str
    build: object
    the: tuple = ()
    steps: list = field(default_factory=list)
    refs: set = field(default_factory=set)
    ket_luan: list = field(default_factory=list)

    def make(self):
        b = Builder(self.key)
        self.build(b)
        self.steps, self.refs, self.ket_luan = b.steps, b.refs, b.ket_luan
        return self


# ---------------------------------------------------------------------------------------------- các cấu hình
def _simson(b):
    P = b.add("point_on", ["w"], "P", {"t": 2.2})
    X = b.add("foot", [P, "B", "C"], "X")
    Y = b.add("foot", [P, "C", "A"], "Y")
    Z = b.add("foot", [P, "A", "B"], "Z")
    b.kl("collinear", [X, Y, Z])


def _steiner(b):
    P = b.add("point_on", ["w"], "P", {"t": 2.2})
    X = b.add("reflect_pts", [P, "B", "C"], "X")
    Y = b.add("reflect_pts", [P, "C", "A"], "Y")
    Z = b.add("reflect_pts", [P, "A", "B"], "Z")
    b.kl("collinear", [X, Y, Z, "H"])


def _miquel(b):
    X = b.add("point_on", ["BC"], "X", {"t": 0.37})
    Y = b.add("point_on", ["CA"], "Y", {"t": 0.42})
    Z = b.add("point_on", ["AB"], "Z", {"t": 0.58})
    c1 = b.add("circle_3pts", ["A", Y, Z])
    c2 = b.add("circle_3pts", ["B", Z, X])
    c3 = b.add("circle_3pts", ["C", X, Y])
    M = b.add("intersection_other", [c1, c2, Z], "M")
    b.kl("on_circle", [c3, M])


def _tam_bang_tiep(b):
    J = b.add("excenter", ["A", "B", "C"], "J")
    c = b.add("circle", ["Sa", "B"])
    b.kl("on_circle", [c, "I", "C", J])
    b.kl("collinear", ["A", "I", "Sa", J])
    b.kl("midpoint", ["Sa", "I", J])  # S_a là trung điểm II_a


def _mixtilinear(b):
    m = b.add("mixtilinear", ["A", "B", "C"])
    Q = b.add("center", [m], "Q")
    K = b.add("foot", [Q, "A", "B"], "K")
    L = b.add("foot", [Q, "A", "C"], "L")
    l = b.line("O", Q)
    T = b.add("intersection", [l, "w"], "T", {"which": 1})
    b.kl("collinear", [K, "I", L])
    b.kl("collinear", [T, "I", "Ra"])


def _doi_trung(b):
    tB = b.add("tangent_at", ["w", "B"])
    tC = b.add("tangent_at", ["w", "C"])
    T = b.add("intersection", [tB, tC], "T")
    K = b.add("lemoine", ["A", "B", "C"], "K")
    L = b.add("symmedian_foot", ["A", "B", "C"], "L")
    b.kl("collinear", ["A", K, L, T])


def _doi_xung_H(b):
    X = b.add("reflect_pts", ["H", "B", "C"], "X")
    Y = b.add("reflect_pts", ["H", "C", "A"], "Y")
    Z = b.add("reflect_pts", ["H", "A", "B"], "Z")
    b.kl("on_circle", ["w", X, Y, Z])


def _xuyen_tam(b):
    A2 = b.add("reflect", ["A", "O"], "A'")
    b.kl("collinear", ["H", "Ma", A2])


def _queue(b):
    cd = b.add("circle_diameter", ["A", "H"])
    Q = b.add("intersection_other", [cd, "w", "A"], "Q")
    A2 = b.add("reflect", ["A", "O"], "A'")
    b.kl("collinear", [Q, "H", "Ma", A2])
    b.kl("concyclic", ["A", "E", "F", "H", Q])


def _humpty(b):
    X = b.add("foot", ["H", "A", "Ma"], "X")
    c = b.add("circle_3pts", ["B", "H", "C"])
    b.kl("on_circle", [c, X])


def _bang_tiep(b):
    Jb = b.add("excenter", ["B", "C", "A"], "J_b")
    Jc = b.add("excenter", ["C", "A", "B"], "J_c")
    U = b.add("foot", [b.add("excenter", ["A", "B", "C"], "J_a"), "B", "C"], "U")
    b.kl("concyclic", ["B", "C", Jb, Jc])
    b.kl("collinear", [Jb, "A", Jc])
    M = b.add("midpoint", [Jb, Jc], "M")
    b.kl("on_circle", [b.add("circle", [M, "B"]), "C", Jb, Jc])  # tâm là trung điểm I_bI_c (góc I_bBI_c vuông)
    b.kl("midpoint", [M, Jb, Jc])


def _feuerbach(b):
    b.add("midpoint", ["B", "C"], "M_a")
    b.kl("tangent", ["g", "e"])


def _gergonne(b):
    la = b.line("A", "Ta")
    lb = b.line("B", "Tb")
    Ge = b.add("intersection", [la, lb], "Ge")
    b.kl("collinear", ["C", "Tc", Ge])


def _nagel(b):
    Ja = b.add("excenter", ["A", "B", "C"], "J_a")
    Jb = b.add("excenter", ["B", "C", "A"], "J_b")
    Ua = b.add("foot", [Ja, "B", "C"], "U")
    Ub = b.add("foot", [Jb, "C", "A"], "V")
    Na = b.add("intersection", [b.line("A", Ua), b.line("B", Ub)], "Na")
    b.kl("collinear", ["I", "G", Na])


def _tiep_tuyen_A(b):
    t = b.add("tangent_at", ["w", "A"])
    T = b.add("intersection", [t, "BC"], "T")
    L = b.add("intersection", [b.line("A", "Sa"), "BC"], "L")
    c = b.add("circle", [T, "A"])
    b.kl("on_circle", [c, L])


def _pedal(b):
    P = b.add("free_point", [], "P", {"x": 0.35, "y": 0.4})
    Q = b.add("isogonal_conjugate", [P, "A", "B", "C"], "Q")
    X = b.add("foot", [P, "B", "C"], "X")
    Y = b.add("foot", [P, "C", "A"], "Y")
    Z = b.add("foot", [P, "A", "B"], "Z")
    U = b.add("foot", [Q, "B", "C"], "U")
    V = b.add("foot", [Q, "C", "A"], "V")
    W = b.add("foot", [Q, "A", "B"], "W")
    c = b.add("circle_3pts", [X, Y, Z])
    b.kl("on_circle", [c, U, V, W])


def _cevian(b):
    P = b.add("free_point", [], "P", {"x": 0.25, "y": 0.1})
    b.add("cevian_foot", [P, "A", "B", "C"], "X")
    b.add("cevian_foot", [P, "B", "C", "A"], "Y")
    b.add("cevian_foot", [P, "C", "A", "B"], "Z")


def _tiep_tuyen_cung(b):
    t = b.add("tangent_at", ["w", "Sa"])
    b.kl("parallel", [t, "BC"])


def _apollonius(b):
    ab = b.add("angle_bisector", ["B", "A", "C"], hidden=True)
    L = b.add("intersection", [ab, "BC"], "L")
    ae = b.add("angle_bisector", ["B", "A", "C"], params={"external": True}, hidden=True)
    L2 = b.add("intersection", [ae, "BC"], "L'")
    apo = b.add("circle_diameter", [L, L2])
    b.kl("on_circle", [apo, "A"])


def _trung_diem_duong_cao(b):
    Mh = b.add("midpoint", ["A", "D"], "K")
    Ja = b.add("excenter", ["A", "B", "C"], "J_a")
    b.kl("collinear", [Mh, "Ta", Ja])
    U = b.add("foot", [Ja, "B", "C"], "U")
    b.kl("collinear", [Mh, U, "I"])  # bản đối ngẫu: I, trung điểm AD, tiếp điểm của (I_a) thẳng hàng


def _BHC(b):
    r = b.add("reflect", ["w", "BC"])
    b.kl("on_circle", [r, "H"])


def _tiep_diem_doi_xung(b):
    X = b.add("reflect", ["Ta", "I"], "X")
    Ja = b.add("excenter", ["A", "B", "C"], "J_a")
    U = b.add("foot", [Ja, "B", "C"], "U")
    b.kl("collinear", ["A", X, U])
    Y = b.add("reflect", [U, Ja], "Y")
    b.kl("collinear", ["A", "Ta", Y])  # vị tự tâm A biến (I_a) thành (I): điểm "trên cùng" của (I_a) ↦ T_a
    b.kl("midpoint", ["Ma", "Ta", U])  # hai tiếp điểm đối xứng qua trung điểm BC


def _cuc_doi_cuc(b):
    P = b.add("free_point", [], "P", {"x": 7.0, "y": 6.0})
    T1 = b.add("tangent_point", ["w", P], "T", {"which": 0})
    T2 = b.add("tangent_point", ["w", P], "T'", {"which": 1})
    lT = b.add("line", [T1, T2])
    b.kl("perpendicular", [b.line("O", P), lT])


def _duong_tron_A_E_F(b):
    c = b.add("circle_3pts", ["A", "E", "F"])
    b.kl("on_circle", [c, "H"])


def _dien_tich_N(b):
    X = b.add("midpoint", ["A", "H"], "X")
    b.kl("on_circle", ["e", X])
    b.kl("collinear", [X, "N", "Ma"])


def _dumpty(b):
    # đường đối trung từ A cắt (O) tại X; trung điểm D của AX (điểm Dumpty); tiếp tuyến tại A cắt BC tại T
    Sf = b.add("symmedian_foot", ["A", "B", "C"], "S")
    X = b.add("intersection_other", [b.line("A", Sf), "w", "A"], "X")
    D = b.add("midpoint", ["A", X], "D")
    T = b.add("intersection", [b.add("tangent_at", ["w", "A"]), "BC"], "T")
    b.kl("concyclic", ["B", "O", "C", D])  # D trên (BOC)
    b.kl("collinear", ["O", T, D])  # T là cực của đường đối trung: OT ⊥ AX tại D
    b.kl("phuong_tich", ["Ma", Sf, T, "B"])  # (B, C; S, T) điều hoà: M_aS·M_aT = M_aB²


def _hai_duong_tron(b):
    c1 = b.add("circle_tangent_at", ["B", "C", "A"])
    c2 = b.add("circle_tangent_at", ["C", "B", "A"])
    X = b.add("intersection_other", [c1, c2, "A"], "X")
    b.kl("collinear", ["A", X, "Ma"])


CONFIGS = [Config(*c).make() for c in [
    ("simson", "Đường thẳng Simson", _simson, ("w", "chan-vuong-goc")),
    ("steiner", "Đường thẳng Steiner", _steiner, ("w", "H", "doi-xung")),
    ("miquel", "Điểm Miquel", _miquel, ("canh", "duong-tron")),
    ("tbt", "Bổ đề tâm nội tiếp – bàng tiếp", _tam_bang_tiep, ("I", "w", "bang-tiep")),
    ("mixt", "Đường tròn mixtilinear", _mixtilinear, ("I", "w", "tiep-xuc")),
    ("doitrung", "Đường đối trung, điểm Lemoine", _doi_trung, ("w", "tiep-tuyen")),
    ("dxH", "Đối xứng của H qua ba cạnh", _doi_xung_H, ("H", "w", "doi-xung")),
    ("xuyentam", "Điểm xuyên tâm đối của A", _xuyen_tam, ("H", "w")),
    ("queue", "Điểm Queue (đường tròn đường kính AH)", _queue, ("H", "w")),
    ("humpty", "Điểm Humpty", _humpty, ("H", "trung-tuyen")),
    ("bangtiep", "Ba tâm bàng tiếp", _bang_tiep, ("bang-tiep",)),
    ("feuerbach", "Định lý Feuerbach", _feuerbach, ("I", "e", "tiep-xuc")),
    ("gergonne", "Điểm Gergonne", _gergonne, ("I", "tiep-diem")),
    ("nagel", "Điểm Nagel", _nagel, ("bang-tiep", "I")),
    ("tiep_A", "Tiếp tuyến tại A cắt BC", _tiep_tuyen_A, ("w", "tiep-tuyen")),
    ("pedal", "Đường tròn pedal của hai điểm liên hợp đẳng giác", _pedal, ("dang-giac",)),
    ("cevian", "Tam giác Cevian của một điểm", _cevian, ("canh",)),
    ("tt_cung", "Tiếp tuyến tại điểm chính giữa cung", _tiep_tuyen_cung, ("w", "tiep-tuyen")),
    ("apollonius", "Đường tròn Apollonius", _apollonius, ("phan-giac",)),
    ("tdcao", "Trung điểm đường cao, tiếp điểm, tâm bàng tiếp", _trung_diem_duong_cao, ("bang-tiep", "I")),
    ("BHC", "Đường tròn (BHC) đối xứng với (O)", _BHC, ("H", "w", "doi-xung")),
    ("tdx", "Điểm đối xứng tiếp điểm qua I", _tiep_diem_doi_xung, ("I", "bang-tiep")),
    ("cuc", "Hai tiếp tuyến kẻ từ một điểm", _cuc_doi_cuc, ("w", "tiep-tuyen")),
    ("AEF", "Đường tròn (AEF) qua H", _duong_tron_A_E_F, ("H",)),
    ("euler9", "Trung điểm AH trên đường tròn Euler", _dien_tich_N, ("H", "e")),
    ("tiepxucBC", "Hai đường tròn tiếp xúc AB, AC tại B, C qua A", _hai_duong_tron, ("tiep-tuyen", "trung-tuyen")),
    ("dumpty", "Điểm Dumpty, cực của đường đối trung", _dumpty, ("w", "tiep-tuyen", "doi-trung")),
]]
BY_KEY = {c.key: c for c in CONFIGS}
