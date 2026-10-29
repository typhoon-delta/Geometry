"""Phản hồi "hay"/"chán" từ báo cáo → điều chỉnh trọng số chấm điểm.

Tệp: lab/du-lieu/phan-hoi.json (máy chủ nhỏ của `python -m lab bao-cao` ghi trực tiếp), cộng mọi tệp *.json
người dùng tự đặt vào lab/du-lieu/phan-hoi/ (tải từ nút "Tải phản hồi" khi mở báo cáo bằng cách nháy đúp).
Dạng: {"<khoá sự kiện>": {"danh_gia": "hay" | "chan", "dac_trung": {...}, "luc": "..."}}

Học: Δw[đặc trưng] = tốc_độ × Σ (±1) × giá_trị_đặc_trưng, kẹp trong ±(|w gốc| + 3). Trọng số dùng cho lần
chạy = trọng số trong cau-hinh.toml + Δw. Sự kiện bị đánh "chán" không còn được đưa lên báo cáo;
đối tượng của sự kiện "hay" được ưu tiên làm trạm.
"""

from __future__ import annotations

import glob
import json
import os

from .config import DATA_DIR

FEEDBACK_FILE = os.path.join(DATA_DIR, "phan-hoi.json")
FEEDBACK_DIR = os.path.join(DATA_DIR, "phan-hoi")


def load_feedback() -> dict:
    out = {}
    files = ([FEEDBACK_FILE] if os.path.exists(FEEDBACK_FILE) else []) + sorted(glob.glob(os.path.join(FEEDBACK_DIR, "*.json")))
    for p in files:
        try:
            with open(p, encoding="utf-8") as f:
                data = json.load(f)
        except (OSError, json.JSONDecodeError):
            continue
        if isinstance(data, dict) and "phan_hoi" in data:
            data = data["phan_hoi"]
        if isinstance(data, dict):
            for k, v in data.items():
                if isinstance(v, dict) and v.get("danh_gia") in ("hay", "chan", None):
                    out[k] = v
    return out


def save_feedback_entry(key: str, entry: dict) -> None:
    os.makedirs(DATA_DIR, exist_ok=True)
    data = {}
    if os.path.exists(FEEDBACK_FILE):
        try:
            with open(FEEDBACK_FILE, encoding="utf-8") as f:
                data = json.load(f)
        except (OSError, json.JSONDecodeError):
            data = {}
    if entry.get("danh_gia") in ("hay", "chan"):
        data[key] = entry
    else:
        data.pop(key, None)
    tmp = FEEDBACK_FILE + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    os.replace(tmp, FEEDBACK_FILE)


def learned_deltas(feedback: dict, base_weights: dict, rate: float = 0.15) -> dict:
    acc = {}
    for v in feedback.values():
        y = 1.0 if v.get("danh_gia") == "hay" else -1.0 if v.get("danh_gia") == "chan" else 0.0
        for k, x in (v.get("dac_trung") or {}).items():
            try:
                x = float(x)
            except (TypeError, ValueError):
                continue
            # đặc trưng đếm (độ dài chứng minh…) được chuẩn hoá để không lấn át
            if k == "do_dai_chung_minh":
                x = x / 20.0
            acc[k] = acc.get(k, 0.0) + rate * y * x
    out = {}
    for k, d in acc.items():
        lim = abs(base_weights.get(k, 0.0)) + 3.0
        out[k] = round(max(-lim, min(lim, d)), 3)
    return out


def effective_weights(base_weights: dict, feedback: dict, rate: float) -> tuple[dict, dict]:
    deltas = learned_deltas(feedback, base_weights, rate)
    w = dict(base_weights)
    for k, d in deltas.items():
        w[k] = round(w.get(k, 0.0) + d, 3)
    return w, deltas
