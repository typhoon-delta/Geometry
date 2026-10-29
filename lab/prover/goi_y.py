"""CHỖ CẮM bộ gợi ý điểm phụ (mô hình ngôn ngữ kiểu AlphaGeometry) – để sẵn, chưa dùng.

Một bộ gợi ý nhận bài toán JGEX (văn bản, có toạ độ cố định) và trả về tối đa k mệnh đề dựng điểm phụ
dạng JGEX, ví dụ "x = midpoint x a b" hoặc "x = on_line x a b, on_circle x o c". Cầu nối Newclid
(lab/prover/bridge.py) thêm từng mệnh đề vào bài toán và chạy lại bộ suy diễn.

Để cắm một mô hình thật:
    1. viết lớp con của Suggester với hàm suggest(problem_text, k) -> list[str];
    2. đăng ký trong SUGGESTERS (vd SUGGESTERS["alphageometry"] = MyLM);
    3. đặt goi_y_diem_phu = "alphageometry" trong lab/cau-hinh.toml (mục [newclid]).
Lưu ý: điểm phụ không có toạ độ cố định sẽ được Newclid tự đặt toạ độ ngẫu nhiên theo phép dựng.
"""

from __future__ import annotations


class Suggester:
    name = "khong"

    def suggest(self, problem_text: str, k: int = 3) -> list[str]:
        return []


class MidpointSuggester(Suggester):
    """Ví dụ đơn giản (không phải mô hình ngôn ngữ): đề xuất trung điểm của vài cặp điểm đầu tiên."""

    name = "trung-diem"

    def suggest(self, problem_text: str, k: int = 3) -> list[str]:
        names = []
        for clause in problem_text.split(" ? ")[0].split("; "):
            for p in clause.split(" = ")[0].split():
                names.append(p.split("@")[0])
        out = []
        for i in range(len(names)):
            for j in range(i + 1, len(names)):
                out.append(f"aux{i}_{j} = midpoint aux{i}_{j} {names[i]} {names[j]}")
                if len(out) >= k:
                    return out
        return out


SUGGESTERS = {"khong": None, "trung-diem": MidpointSuggester}


def get_suggester(name):
    cls = SUGGESTERS.get(name or "khong")
    return cls() if cls else None
