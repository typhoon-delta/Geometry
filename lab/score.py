"""Chấm điểm "lạ" của một sự kiện: tổng (trọng số × đặc trưng), trọng số trong lab/cau-hinh.toml
cộng phần điều chỉnh học từ phản hồi "hay"/"chán" (lab/feedback.py).

Đặc trưng (đều có tên tiếng Việt để hiện trong báo cáo):
    loai_*                  loại quan hệ
    newclid_*               kết quả Newclid (chứng minh được = tầm thường; không chứng minh được = sâu)
    do_dai_chung_minh       số dòng chứng minh (khi chứng minh được)
    xa_nhau                 các đối tượng ở xa nhau trong cây dựng (0..1)
    dac_biet / dac_biet_phu số đối tượng dính (O), (I), đường tròn Euler, O, I, H / G, N
    it_buoc                 cấu hình ít bước dựng (1 = ít nhất)
    diem_tu_do              số điểm tuỳ ý
    so_diem                 số điểm vượt quá 4 trong phát biểu
    dai_dong                số câu dựng hình (kể cả của bổ đề) vượt quá 4
    gia_dac_biet            vẫn đúng khi thả O/H/I/G/N thành điểm bất kỳ (lab/reason/generalize.py)
    kho_*                   độ khó theo bộ đuổi góc (lab/reason/angles.py): 1 vòng, 2 vòng, ≥ 3 vòng, không suy ra được,
                            chưa đánh giá được
    tu_nhien                độ tự nhiên của các đối tượng (0..1)
    giao_thoa / noi_bo      nối phần của hai bổ đề / nằm gọn trong một bổ đề
    he_qua                  hệ quả trực tiếp của một sự kiện đã báo trong cùng vòng

Tầng (lọc có chọn lọc, không bỏ hết cái dễ): xem tier().
"""

from __future__ import annotations

from itertools import combinations

from .core.model import ancestors
from .core.steps import STEP_TYPES
from .present import BASE_IDS

TYPE_FEATURE = {
    "tangent": "loai_tiep_xuc", "concurrent": "loai_dong_quy", "concyclic": "loai_dong_vien",
    "collinear": "loai_thang_hang", "on_circle": "loai_tren_duong_tron", "on_line": "loai_tren_duong_thang",
    "parallel": "loai_song_song", "perpendicular": "loai_vuong_goc", "coincide": "loai_trung_nhau",
    "same_line": "loai_trung_duong", "same_circle": "loai_trung_duong",
}

NEWCLID_FEATURE = {
    "chung-minh-duoc": "newclid_chung_minh_duoc",
    "chung-minh-duoc-voi-diem-phu": "newclid_mot_phan",
    "mot-phan": "newclid_mot_phan",
    "khong-chung-minh-duoc": "newclid_khong_chung_minh_duoc",
    "het-gio": "newclid_het_gio",
}

FEATURE_LABELS = {
    "loai_tiep_xuc": "loại: tiếp xúc", "loai_dong_quy": "loại: đồng quy", "loai_dong_vien": "loại: đồng viên",
    "loai_thang_hang": "loại: thẳng hàng", "loai_tren_duong_tron": "loại: điểm trên đường tròn",
    "loai_tren_duong_thang": "loại: điểm trên đường thẳng", "loai_song_song": "loại: song song",
    "loai_vuong_goc": "loại: vuông góc", "loai_trung_nhau": "loại: hai điểm trùng nhau",
    "loai_trung_duong": "loại: hai đường trùng nhau",
    "newclid_chung_minh_duoc": "Newclid chứng minh được (tầm thường)", "newclid_mot_phan": "Newclid chứng minh được một phần",
    "newclid_khong_chung_minh_duoc": "Newclid không chứng minh được (sâu)", "newclid_het_gio": "Newclid hết giờ",
    "do_dai_chung_minh": "độ dài chứng minh", "xa_nhau": "đối tượng xa nhau trong cây dựng",
    "dac_biet": "dính (O), (I), đường tròn Euler, O, I, H", "dac_biet_phu": "dính G, N", "it_buoc": "ít bước dựng",
    "diem_tu_do": "điểm tuỳ ý", "so_diem": "phát biểu dài",
    "kho_1": "đuổi góc 1 bước", "kho_2": "đuổi góc 2 vòng", "kho_3": "đuổi góc ≥ 3 vòng",
    "kho_khong": "đuổi góc không suy ra được", "kho_chua": "chưa đánh giá được độ khó",
    "tu_nhien": "độ tự nhiên", "giao_thoa": "nối hai bổ đề", "noi_bo": "nằm gọn trong một bổ đề",
    "he_qua": "hệ quả trực tiếp của sự kiện khác", "dai_dong": "phát biểu dài dòng (số câu dựng hình quá 4)",
    "gia_dac_biet": "điểm đặc biệt chỉ để trang trí (vẫn đúng khi thay bằng điểm bất kỳ)",
}

MAIN_SPECIAL = {"O", "I", "H", "circumcircle", "incircle", "ninepoint"}
MINOR_SPECIAL = {"G", "N"}


def _special_code(fact, sid):
    st = next((s for s in fact["doc"]["steps"] if s["id"] == sid), None)
    tag = STEP_TYPES[st["type"]].tag if st and st["type"] in STEP_TYPES else None
    rec = (fact.get("special") or {}).get(sid)
    return tag or (rec or {}).get("code")


def features(fact: dict, max_steps: int = 6) -> dict:
    f = {}
    tf = TYPE_FEATURE.get(fact["type"])
    if tf:
        f[tf] = 1.0
    nc = (fact.get("newclid") or {}).get("status")
    if nc in NEWCLID_FEATURE:
        f[NEWCLID_FEATURE[nc]] = 1.0
        if nc == "chung-minh-duoc":
            f["do_dai_chung_minh"] = float(min((fact["newclid"].get("proof_lines") or 0), 60))
    doc = fact["doc"]
    base = set(fact.get("base_ids") or [])
    ids = [i for i in fact["ids"] if any(s["id"] == i for s in doc["steps"])]
    anc = {i: ancestors(doc, [i]) for i in ids}
    if len(ids) >= 2:
        ds = []
        for a, b in combinations(ids, 2):
            u, v = anc[a], anc[b]
            ds.append(len(u ^ v) / max(1, len(u | v)))
        f["xa_nhau"] = round(sum(ds) / len(ds), 3)
    codes = [_special_code(fact, i) for i in ids]
    f["dac_biet"] = float(min(3, sum(1 for c in codes if c in MAIN_SPECIAL)))
    f["dac_biet_phu"] = float(min(2, sum(1 for c in codes if c in MINOR_SPECIAL)))
    new_steps = [s for s in doc["steps"] if s["id"] not in base and not s.get("hidden")
                 and s["type"] not in ("polygon", "angle_mark", "segment_mark")]
    n = len(new_steps)
    f["it_buoc"] = round(max(0.0, (max_steps - n) / max_steps), 3) if n else 1.0
    f["diem_tu_do"] = float(sum(1 for s in doc["steps"] if s["type"] == "point_on"))
    npts = sum(1 for i in fact["ids"] if any(s["id"] == i and STEP_TYPES.get(s["type"]) and STEP_TYPES[s["type"]].kind == "point"
                                             for s in doc["steps"]))
    f["so_diem"] = float(max(0, npts - 4))
    # phát biểu dài dòng: số câu dựng hình (kể cả bước của bổ đề) ngoài cấu hình gốc, quá 4 câu
    n_all = sum(1 for s in doc["steps"] if s["id"] not in BASE_IDS and not s.get("hidden")
                and s["type"] not in ("polygon", "angle_mark", "segment_mark"))
    f["dai_dong"] = float(max(0, n_all - 4))
    fact["so_buoc"] = n
    if "kho" in fact:
        k = fact["kho"]
        key = {1: "kho_1", 2: "kho_2", None: "kho_khong", "?": "kho_chua"}.get(k, "kho_3")
        f[key] = 1.0
    if "tu_nhien" in fact:
        f["tu_nhien"] = float(fact["tu_nhien"])
    if fact.get("giao_thoa"):
        f["giao_thoa"] = 1.0
    if fact.get("noi_bo"):
        f["noi_bo"] = 1.0
    if fact.get("he_qua"):
        f["he_qua"] = 1.0
    if fact.get("tong_quat"):  # điểm đặc biệt chỉ để trang trí: không được thưởng "đặc biệt"
        f["gia_dac_biet"] = 1.0
        f["dac_biet"] = f["dac_biet_phu"] = 0.0
    return f


TIER_LABELS = {"kho": "Khó", "vua": "Vừa", "de": "Dễ nhưng đẹp", "loai": "Đã lọc bỏ"}


def tier(fact, cfg_loc=None):
    """Tầng của sự kiện trong báo cáo. Lọc CÓ CHỌN LỌC: bỏ hệ quả trực tiếp và đối tượng gượng ép; giữ cái dễ
    nếu tự nhiên và (nối hai bổ đề hoặc dính đối tượng đặc biệt)."""
    loc = {"nguong_tu_nhien": 0.65, "nguong_tu_nhien_de": 0.8}
    loc.update(cfg_loc or {})
    nat = fact.get("tu_nhien", 1.0)
    feats = fact.get("dac_trung", {})
    if fact.get("he_qua") or nat < loc["nguong_tu_nhien"] or fact.get("phan_hoi") == "chan":
        return "loai"
    nc = (fact.get("newclid") or {}).get("status")
    k = fact.get("kho", "?")
    if nc == "chung-minh-duoc" and k in (None, "?"):
        k = 2  # Newclid chứng minh được: không "khó"
    if k is None or (isinstance(k, int) and k >= 3) or nc in ("khong-chung-minh-duoc", "het-gio"):
        return "kho"
    if k == 2 or k == "?":
        return "vua"
    special = feats.get("dac_biet", 0) + feats.get("dac_biet_phu", 0)
    if fact.get("tong_quat"):
        return "loai"  # dễ, và cái "đặc biệt" chỉ là trang trí
    if nat >= loc["nguong_tu_nhien_de"] and (fact.get("giao_thoa") or special >= 1):
        return "de"
    return "loai"


def skeleton(fact, base_ids=()):
    """"Bộ xương" của sự kiện để gom các biến thể cùng một ý: loại quan hệ + các loại bước mới + các bổ đề."""
    base = set(base_ids)
    steps = sorted(s["type"] for s in fact["doc"]["steps"] if s["id"] not in base and not s.get("hidden"))
    return (fact["type"], tuple(steps), tuple(fact.get("nguon") or ()), tuple(sorted(fact.get("cau_hinh") or ())))


def score(feats: dict, weights: dict) -> float:
    return round(sum(weights.get(k, 0.0) * v for k, v in feats.items()), 3)


def explain(feats: dict, weights: dict) -> list:
    """Các thành phần của điểm (để hiện trong báo cáo), sắp theo độ lớn."""
    out = [(FEATURE_LABELS.get(k, k), round(weights.get(k, 0.0) * v, 2)) for k, v in feats.items() if weights.get(k, 0.0) * v]
    return sorted(out, key=lambda t: -abs(t[1]))
