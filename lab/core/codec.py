"""Mã hoá / giải mã hình vào URL – đúng cơ chế của src/io/codec.js.

Dạng: 'z' + base64url(deflate-raw(JSON))   (deflate-raw = zlib với wbits = -15, không header)
      'j' + base64url(UTF-8 JSON)           (dự phòng, không nén)
Link mở thẳng trong công cụ web: <địa chỉ trang>#h=<mã>.
"""

from __future__ import annotations

import base64
import json
import zlib

from .model import validate


def compact_doc(doc) -> dict:
    """Bỏ các trường không cần khi chia sẻ (giữ nguyên ngữ nghĩa) – như compactDoc của bản JS."""
    out = {"format": doc["format"], "version": doc["version"]}
    if doc.get("title"):
        out["title"] = doc["title"]
    if doc.get("view"):
        out["view"] = doc["view"]
    if doc.get("hideAux"):
        out["hideAux"] = True  # bản 1.7: đang tắt các đường phụ
    steps = []
    for s in doc["steps"]:
        t = {"id": s["id"], "type": s["type"], "args": s["args"]}
        for k in ("params", "name", "style", "hidden", "aux", "joinPrev"):
            v = s.get(k)
            if v is None or v is False or (isinstance(v, dict) and not v):
                continue
            t[k] = v
        steps.append(t)
    out["steps"] = steps
    return out


def _b64url(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).decode("ascii").rstrip("=")


def _from_b64url(s: str) -> bytes:
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


def _json_num(o):
    # số thực có giá trị nguyên ghi gọn như JSON.stringify của JS (3.0 → 3)
    if isinstance(o, float) and o.is_integer() and abs(o) < 1e15:
        return int(o)
    if isinstance(o, dict):
        return {k: _json_num(v) for k, v in o.items()}
    if isinstance(o, list):
        return [_json_num(v) for v in o]
    return o


def doc_json(doc) -> str:
    return json.dumps(_json_num(compact_doc(doc)), ensure_ascii=False, separators=(",", ":"))


def encode_doc(doc) -> str:
    raw = doc_json(doc).encode("utf-8")
    c = zlib.compressobj(9, zlib.DEFLATED, -15)
    return "z" + _b64url(c.compress(raw) + c.flush())


def decode_doc(code: str) -> dict:
    try:
        if code.startswith("z"):
            raw = zlib.decompress(_from_b64url(code[1:]), -15)
        elif code.startswith("j"):
            raw = _from_b64url(code[1:])
        else:
            raise ValueError
        doc = json.loads(raw.decode("utf-8"))
    except Exception as e:  # noqa: BLE001
        raise ValueError("Link hình bị hỏng hoặc bị cắt cụt.") from e
    errs = validate(doc)
    if errs:
        raise ValueError("Hình không hợp lệ:\n" + "\n".join(errs[:6]))
    return doc


def share_url(doc, base: str) -> str:
    """Link mở hình trong công cụ web. base: địa chỉ trang (vd https://…/Geometry/ hoặc ../../index.html)."""
    return f"{base.split('#')[0]}#h={encode_doc(doc)}"
