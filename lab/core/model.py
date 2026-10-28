"""Mô hình dữ liệu: một hình = một DANH SÁCH BƯỚC DỰNG có thứ tự (docs/DINH_DANG_JSON.md).

Bản Python của các hàm thuần toán trong src/core/model.js: tính giá trị, loại đối tượng, phụ thuộc,
đặt tên, kiểm tra hợp lệ, mô tả đối tượng. Tài liệu (doc) là dict đúng như tệp JSON.
"""

from __future__ import annotations

import copy
import json
import math
import re

from . import geom as G
from .steps import STEP_TYPES, arg_accepts

FORMAT = "hinh-hoc-dong"
VERSION = 1


def empty_doc(title: str = "") -> dict:
    return {"format": FORMAT, "version": VERSION, "title": title, "steps": []}


def step_by_id(doc, sid):
    for s in doc["steps"]:
        if s["id"] == sid:
            return s
    return None


def index_of(doc) -> dict:
    return {s["id"]: i for i, s in enumerate(doc["steps"])}


def kind_of_value(v):
    if v is None:
        return None
    if isinstance(v, dict):
        return "mark"
    return v.kind


def kinds(doc) -> dict:
    """Loại đối tượng của từng bước ('point'|'line'|'circle'|'mark'|None)."""
    k = {}
    for s in doc["steps"]:
        d = STEP_TYPES.get(s["type"])
        if d is None:
            k[s["id"]] = None
            continue
        k[s["id"]] = (k.get(s["args"][0]) if s["args"] else None) if d.kind == "same" else d.kind
    return k


def params_of(step) -> dict:
    d = STEP_TYPES.get(step["type"])
    p = dict(d.params) if d else {}
    p.update(step.get("params") or {})
    return p


def _value_finite(v):
    if isinstance(v, dict):
        return True
    if v.kind == "point":
        return math.isfinite(v.x) and math.isfinite(v.y)
    if v.kind == "line":
        return all(math.isfinite(t) for t in (v.p.x, v.p.y, v.d.x, v.d.y))
    if v.kind == "circle":
        return all(math.isfinite(t) for t in (v.c.x, v.c.y, v.r))
    return True


def compute_step(s, vals, overrides=None):
    """Tính giá trị một bước từ giá trị các bước trước (vals: dict id → giá trị)."""
    d = STEP_TYPES.get(s["type"])
    if d is None:
        return None
    variadic = bool(d.args) and d.args[0] == "...point"
    arg_vals = []
    for i, a in enumerate(s["args"]):
        v = vals.get(a)
        if v is None:
            return None
        t = "...point" if variadic else (d.args[i] if i < len(d.args) else None)
        if t is None or not arg_accepts(t, kind_of_value(v)):
            return None
        arg_vals.append(v)
    p = params_of(s)
    if overrides and s["id"] in overrides:
        p.update(overrides[s["id"]])
    try:
        v = d.compute(arg_vals, p)
    except (ZeroDivisionError, ValueError, OverflowError, TypeError, AttributeError, IndexError):
        v = None
    if v is not None and d.kind != "mark" and not _value_finite(v):
        v = None
    return v


def evaluate(doc, overrides=None) -> dict:
    """Tính giá trị mọi đối tượng. overrides: dict id → params thay thế (dùng khi lấy mẫu ngẫu nhiên)."""
    vals = {}
    for s in doc["steps"]:
        vals[s["id"]] = compute_step(s, vals, overrides)
    return vals


def dependents(doc, ids) -> set:
    """Các bước phụ thuộc (trực tiếp/gián tiếp) vào ids, không gồm chính chúng."""
    base = set(ids)
    out = set()
    for s in doc["steps"]:
        if any(a in base or a in out for a in s["args"]):
            out.add(s["id"])
    return out


def ancestors(doc, ids) -> set:
    """Bao đóng phụ thuộc: các bước cần để dựng ids (gồm cả chính chúng)."""
    by = {s["id"]: s for s in doc["steps"]}
    out = set()
    stack = list(ids)
    while stack:
        x = stack.pop()
        if x in out or x not in by:
            continue
        out.add(x)
        stack.extend(by[x]["args"])
    return out


def sub_doc(doc, ids, title=None) -> dict:
    """Tài liệu con gồm bao đóng phụ thuộc của ids (giữ thứ tự dựng)."""
    keep = ancestors(doc, ids)
    out = {"format": FORMAT, "version": VERSION, "title": title if title is not None else doc.get("title", ""),
           "steps": [copy.deepcopy(s) for s in doc["steps"] if s["id"] in keep]}
    return out


def new_id(doc) -> str:
    m = 0
    for s in doc["steps"]:
        r = re.fullmatch(r"s(\d+)", s["id"])
        if r:
            m = max(m, int(r.group(1)))
    return f"s{m + 1}"


POINT_LETTERS = list("ABCDEFKLMPQRSTUVXYZJW")


def next_name(doc, kind, preferred=None) -> str:
    used = {s.get("name") for s in doc["steps"] if s.get("name")}
    if preferred:
        if preferred not in used:
            return preferred
        i = 1
        while preferred + str(i) in used:
            i += 1
        return preferred + str(i)
    if kind == "point":
        for L in POINT_LETTERS:
            if L not in used:
                return L
        i = 1
        while True:
            for L in POINT_LETTERS:
                if L + str(i) not in used:
                    return L + str(i)
            i += 1
    base = "d" if kind == "line" else "ω" if kind == "circle" else "m"
    i = 1
    while base + str(i) in used:
        i += 1
    return base + str(i)


def validate(doc) -> list:
    """Kiểm tra hợp lệ; trả về danh sách lỗi (rỗng nếu hợp lệ)."""
    errs = []
    if not isinstance(doc, dict):
        return ["Không phải đối tượng JSON"]
    if doc.get("format") != FORMAT:
        errs.append(f'Thiếu "format": "{FORMAT}"')
    if not isinstance(doc.get("steps"), list):
        return errs + ['Thiếu danh sách "steps"']
    seen = set()
    k = {}
    for i, s in enumerate(doc["steps"]):
        where = f"Bước {i + 1} ({s.get('id') if isinstance(s, dict) else s})"
        if not isinstance(s, dict) or not isinstance(s.get("id"), str):
            errs.append(f"{where}: thiếu id")
            continue
        if s["id"] in seen:
            errs.append(f"{where}: id trùng")
        d = STEP_TYPES.get(s.get("type"))
        if d is None:
            errs.append(f'{where}: loại bước không rõ "{s.get("type")}"')
            seen.add(s["id"])
            continue
        if not isinstance(s.get("args"), list):
            errs.append(f"{where}: thiếu args")
            seen.add(s["id"])
            continue
        variadic = bool(d.args) and d.args[0] == "...point"
        if (len(s["args"]) < 3) if variadic else (len(s["args"]) != len(d.args)):
            errs.append(f"{where}: số đối số sai")
        for j, a in enumerate(s["args"]):
            if a not in seen:
                errs.append(f'{where}: tham chiếu "{a}" chưa được dựng ở bước trước')
            else:
                t = "...point" if variadic else (d.args[j] if j < len(d.args) else None)
                if t and not arg_accepts(t, k.get(a)):
                    errs.append(f'{where}: đối số "{a}" sai loại')
        k[s["id"]] = (k.get(s["args"][0]) if s["args"] else None) if d.kind == "same" else d.kind
        seen.add(s["id"])
    return errs


def load_doc(path) -> dict:
    with open(path, encoding="utf-8") as f:
        doc = json.load(f)
    errs = validate(doc)
    if errs:
        raise ValueError("Hình không hợp lệ:\n" + "\n".join(errs[:6]))
    return doc


def clone(doc):
    return copy.deepcopy(doc)


def describe(doc, sid) -> str:
    """Tên hiển thị của đối tượng (vd đường thẳng "AB", đường tròn "(ABC)") – như bản JS."""
    s = step_by_id(doc, sid)
    if s is None:
        return sid

    def n(a):
        x = step_by_id(doc, a)
        return (x.get("name") if x else None) or a

    names = "".join(n(a) for a in s["args"])
    t = s["type"]
    if t in ("line", "segment", "ray"):
        return names
    if t == "perpendicular":
        return f"{s.get('name')} (⊥ {describe(doc, s['args'][1])} qua {n(s['args'][0])})"
    if t == "parallel":
        return f"{s.get('name')} (∥ {describe(doc, s['args'][1])} qua {n(s['args'][0])})"
    if t == "perp_bisector":
        return f"{s.get('name')} (trung trực {names})"
    if t == "angle_bisector":
        ext = "ngoài " if (s.get("params") or {}).get("external") else ""
        return f"{s.get('name')} (phân giác {ext}góc {names})"
    if t == "circle_radius":
        return f"({n(s['args'][0])}, {n(s['args'][1])}{n(s['args'][2])})"
    if t in ("circle_3pts", "circumcircle"):
        return f"({names})"
    if t == "circle":
        return f"({n(s['args'][0])}, {n(s['args'][0])}{n(s['args'][1])})"
    if t == "incircle":
        return f"đường tròn nội tiếp {names}"
    if t == "nine_point_circle":
        return f"đường tròn Euler {names}"
    return s.get("name") or sid


def value_to_json(v):
    """Giá trị → dạng JSON giống bản JS (để đối chiếu)."""
    if v is None:
        return None
    if isinstance(v, dict):
        return v
    if v.kind == "point":
        return {"kind": "point", "x": v.x, "y": v.y}
    if v.kind == "line":
        return {"kind": "line", "p": {"x": v.p.x, "y": v.p.y}, "d": {"x": v.d.x, "y": v.d.y}, "sub": v.sub}
    if v.kind == "circle":
        return {"kind": "circle", "c": {"x": v.c.x, "y": v.c.y}, "r": v.r}
    return None


def point_values(vals) -> dict:
    return {k: v for k, v in vals.items() if isinstance(v, G.Pt)}
