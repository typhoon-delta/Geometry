"""Cầu nối Newclid: dịch sự kiện sang JGEX, chạy bộ suy diễn trong tiến trình con có giới hạn thời gian.

    check_fact(fact, timeout) -> dict kết quả, gồm 'status':
        chung-minh-duoc        Newclid chứng minh được (→ sự kiện "tầm thường", hạ hạng)
        khong-chung-minh-duoc  bộ suy diễn bão hoà mà không chứng minh được (→ ứng viên "sâu", tăng hạng)
        het-gio                quá thời gian cho phép (→ cũng coi là chưa chứng minh được)
        khong-dich-duoc        hình/quan hệ chưa dịch được sang ngôn ngữ của Newclid (trung tính)
        loi-dung-hinh / loi-suy-dien / khong-co-newclid / phien-ban-khong-ho-tro  (trung tính)

Chỗ cắm mô hình ngôn ngữ (AlphaGeometry): xem lab/prover/goi_y.py – với sự kiện chưa chứng minh được,
bộ gợi ý có thể đề xuất điểm phụ; mỗi đề xuất được thử lại bằng Newclid.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys

from .goi_y import get_suggester
from ..core.model import sub_doc
from .jgex import NotTranslatable, atomic_relations, to_jgex

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DEEP = {"khong-chung-minh-duoc", "het-gio"}


def newclid_available() -> dict:
    """Kiểm tra Newclid trong môi trường hiện tại (gọi ở tiến trình con để không nạp vào tiến trình chính)."""
    code = "import json; from lab.prover.worker import newclid_version as v; print(json.dumps(v()))"
    try:
        out = subprocess.run([sys.executable, "-c", code], cwd=ROOT, capture_output=True, text=True, timeout=120)
        ver = json.loads(out.stdout.strip() or "null")
    except Exception as e:  # noqa: BLE001
        return {"ok": False, "reason": str(e)}
    if ver is None:
        return {"ok": False, "reason": "chưa cài newclid (pip install newclid==2.0.2)"}
    if not str(ver).startswith("2."):
        return {"ok": False, "version": ver, "reason": f"newclid {ver}: bản 3.x thuần Python có lỗi; cài newclid==2.0.2"}
    return {"ok": True, "version": ver}


def run_problem(text: str, timeout: float) -> dict:
    req = json.dumps({"problem": text, "timeout": timeout})
    try:
        out = subprocess.run([sys.executable, "-m", "lab.prover.worker"], input=req, cwd=ROOT, capture_output=True,
                             text=True, timeout=timeout + 60, encoding="utf-8")
    except subprocess.TimeoutExpired:
        return {"status": "het-gio", "proved": False, "runtime": timeout + 60}
    if out.returncode != 0 or not out.stdout.strip():
        return {"status": "loi-suy-dien", "proved": False, "error": (out.stderr or "")[-400:]}
    try:
        return json.loads(out.stdout)
    except json.JSONDecodeError:
        return {"status": "loi-suy-dien", "proved": False, "error": out.stdout[-400:]}


def check_fact(fact: dict, timeout: float = 30.0, suggester_name: str | None = None, total_timeout: float | None = None) -> dict:
    """Chạy Newclid cho một sự kiện. Quan hệ nhiều điểm được tách thành các mục tiêu nguyên tử, mỗi mục tiêu
    chỉ mang theo phần hình cần để dựng nó; dừng ở mục tiêu đầu tiên không chứng minh được."""
    import time

    t0 = time.time()
    extra = None
    doc = fact["doc"]
    if fact["type"] == "coincide":
        extra = next((s for s in doc["steps"] if s["id"] == fact.get("newest")), None)
        doc = {**doc, "steps": [s for s in doc["steps"] if extra is None or s["id"] != extra["id"]]}
        atoms = [("coincide", list(fact["ids"]))]
    else:
        atoms = atomic_relations(fact["type"], fact["ids"])
    results = []
    status = "chung-minh-duoc"
    for rt, ids in atoms:
        if total_timeout is not None and time.time() - t0 > total_timeout:
            status = "het-gio"
            break
        need = [i for i in ids if i != (extra or {}).get("id")]
        if extra is not None:
            need += [a for a in extra["args"]]
        sub = sub_doc(doc, need)
        try:
            prob = to_jgex(sub, rt, ids, extra_step=extra)
        except NotTranslatable as e:
            if str(e) == "không có mục tiêu":  # mục tiêu đúng theo chính định nghĩa đối tượng (vd trung điểm trên ε)
                results.append({"status": "chung-minh-duoc", "proved": True, "reason": "đúng theo định nghĩa", "runtime": 0})
                continue
            results.append({"status": "khong-dich-duoc", "reason": str(e)})
            status = "khong-dich-duoc"
            break
        except Exception as e:  # noqa: BLE001
            results.append({"status": "khong-dich-duoc", "reason": f"{type(e).__name__}: {e}"})
            status = "khong-dich-duoc"
            break
        r = run_problem(prob.text, timeout)
        r["problem"] = prob.text
        r["names"] = prob.names  # id bước → tên điểm trong Newclid (để đổi tên trong vết chứng minh)
        if prob.notes:
            r["notes"] = prob.notes
        sug = get_suggester(suggester_name)
        if r.get("status") in DEEP and sug is not None:
            r["aux_tried"] = []
            for aux in sug.suggest(prob.text, k=3):
                r2 = run_problem(prob.text.replace(" ? ", f"; {aux} ? ", 1), timeout)
                r["aux_tried"].append({"aux": aux, "status": r2.get("status")})
                if r2.get("proved"):
                    r.update(status="chung-minh-duoc-voi-diem-phu", proved=True, aux=aux, proof=r2.get("proof"),
                             proof_lines=r2.get("proof_lines"))
                    break
        results.append(r)
        if not r.get("proved"):
            status = r.get("status", "loi-suy-dien")
            break
    proved = sum(1 for r in results if r.get("proved"))
    out = {"status": status, "proved": status == "chung-minh-duoc", "goals_total": len(atoms), "goals_proved": proved,
           "runtime": round(time.time() - t0, 2), "parts": results}
    if status == "chung-minh-duoc":
        out["proof"] = "\n\n".join(r.get("proof", "") for r in results)
        out["proof_lines"] = sum(r.get("proof_lines") or 0 for r in results)
        out["steps"] = sum(r.get("steps") or 0 for r in results)
    elif proved and status in DEEP:
        out["status"] = "mot-phan"  # chứng minh được một phần các mục tiêu
    return out
