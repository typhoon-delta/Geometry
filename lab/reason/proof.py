"""Lời giải của máy cho một sự kiện (để in trong báo cáo): chạy lại bộ suy luận trên hình hiển thị (có tên điểm), với
kết luận của các bổ đề xuất phát làm kiến thức, rồi giải ngược ra các bước."""

from __future__ import annotations

from .angles import AngleChaser, point_form

_KNOWN = {}


def _known_of(keys):
    keys = tuple(keys or ())
    if keys not in _KNOWN:
        from ..library.compose import start_doc

        known = []
        if keys:
            try:
                doc, _, kls = start_doc(list(keys))
                for _, rtype, ids in kls:
                    known += point_form(doc, rtype, ids)
            except Exception:  # noqa: BLE001
                known = []
        _KNOWN[keys] = known
    return _KNOWN[keys]


def loi_giai(fact, doc):
    """(mức, các bước) – các bước là list dict {loai, so, text, vi}; None nếu không dựng lại được."""
    try:
        ch = AngleChaser(doc, known=_known_of(fact.get("cau_hinh")))
        lv = ch.level(fact["type"], fact["ids"])
        if not isinstance(lv, int):
            return lv, None
        return lv, ch.loi_giai()
    except Exception:  # noqa: BLE001 – lời giải là phần phụ của báo cáo
        return None, None
