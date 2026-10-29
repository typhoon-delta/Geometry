"""Đọc tệp cấu hình lab/cau-hinh.toml (thiếu mục nào thì dùng mặc định trong mã)."""

from __future__ import annotations

import copy
import os

try:
    import tomllib
except ModuleNotFoundError:  # Python < 3.11
    tomllib = None

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
CONFIG_PATH = os.path.join(HERE, "cau-hinh.toml")
# có thể đổi bằng biến môi trường (dùng trong test)
DATA_DIR = os.environ.get("LAB_DU_LIEU") or os.path.join(HERE, "du-lieu")
REPORTS_DIR = os.environ.get("LAB_BAO_CAO") or os.path.join(ROOT, "reports")

DEFAULTS = {
    "chay": {
        "mau": 16, "hat_giong_mau": 7, "dung_sai": 1e-7, "do_sau": 3, "so_buoc_toi_da": 6,
        "ngan_sach_lop": [700, 1600, 1600], "ti_le_thoi_gian_lop": [0.25, 0.4, 0.35], "diem_toi_da": 900,
        "thoi_gian_vong": 150, "so_tram": 6, "luu_moi": 60, "bao_cao_moi": 1800, "so_su_kien_luu": 4000,
    },
    "newclid": {"bat": True, "gioi_han_giay": 30, "tong_gioi_han_giay": 120, "so_tien_trinh": 2, "nguong_diem": 6.0,
                "goi_y_diem_phu": "khong"},
    "trong_so": {
        "loai_tiep_xuc": 2.5, "loai_dong_quy": 2.5, "loai_dong_vien": 2.0, "loai_thang_hang": 2.0,
        "loai_tren_duong_tron": 2.0, "loai_tren_duong_thang": 1.5, "loai_song_song": 1.2, "loai_vuong_goc": 1.2,
        "loai_trung_nhau": 1.5, "loai_trung_duong": 0.3,
        "newclid_chung_minh_duoc": -4.0, "newclid_mot_phan": 1.5, "newclid_khong_chung_minh_duoc": 4.0,
        "newclid_het_gio": 3.0, "do_dai_chung_minh": 0.04,
        "xa_nhau": 3.0, "dac_biet": 1.2, "dac_biet_phu": 0.4, "it_buoc": 2.5, "diem_tu_do": -0.3, "so_diem": -0.15,
    },
    "trong_so_phep_dung": {},
    "bao_cao": {"dia_chi_web": "https://typhoon-delta.github.io/Geometry/", "so_su_kien": 150, "cong_may_chu": 8765,
                "hoc_toc_do": 0.15},
}


def load_config(path: str | None = None) -> dict:
    cfg = copy.deepcopy(DEFAULTS)
    path = path or CONFIG_PATH
    if tomllib is not None and os.path.exists(path):
        with open(path, "rb") as f:
            user = tomllib.load(f)
        for sec, vals in user.items():
            if isinstance(vals, dict):
                cfg.setdefault(sec, {}).update(vals)
    return cfg
