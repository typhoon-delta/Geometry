"""Tiến trình con chạy Newclid trên MỘT bài toán (đọc JSON từ stdin, ghi JSON ra stdout).

    python -m lab.prover.worker  <<< '{"problem": "...", "timeout": 30}'

Chạy trong tiến trình riêng để tiến trình chính có thể dừng hẳn khi quá giờ (bộ suy diễn đôi khi chạy rất lâu
trong một bước), và để lỗi của Newclid không làm đổ vòng khám phá.
Hỗ trợ Newclid 2.x (khuyên dùng, thuần Python). Newclid 3.x thuần Python có lỗi trong bản phát hành
(cần bộ máy C++ "yuclid" không có sẵn qua pip) – xem lab/HUONG_DAN.md.
"""

from __future__ import annotations

import io
import json
import os
import sys
import tempfile
import time
import contextlib


def newclid_version():
    try:
        from importlib.metadata import version

        return version("newclid")
    except Exception:  # noqa: BLE001
        return None


def run(problem: str, timeout: float, seed: int = 1) -> dict:
    t0 = time.time()
    ver = newclid_version()
    if ver is None:
        return {"status": "khong-co-newclid", "proved": False, "runtime": 0.0}
    if not ver.startswith("2."):
        return {"status": "phien-ban-khong-ho-tro", "version": ver, "proved": False, "runtime": 0.0}
    sink = io.StringIO()
    with contextlib.redirect_stdout(sink), contextlib.redirect_stderr(sink):
        import logging

        logging.disable(logging.CRITICAL)
        from newclid import GeometricSolverBuilder

        try:
            solver = GeometricSolverBuilder(seed=seed).load_problem_from_txt(problem, translate=False).build()
        except Exception as e:  # noqa: BLE001
            return {"status": "loi-dung-hinh", "error": f"{type(e).__name__}: {e}"[:400], "proved": False,
                    "runtime": time.time() - t0, "version": ver}
        build_time = time.time() - t0
        try:
            ok = solver.run(timeout=timeout, max_steps=100000)
        except Exception as e:  # noqa: BLE001
            return {"status": "loi-suy-dien", "error": f"{type(e).__name__}: {e}"[:400], "proved": False,
                    "runtime": time.time() - t0, "version": ver}
        infos = solver.run_infos or {}
        out = {"status": "chung-minh-duoc" if ok else ("het-gio" if infos.get("timeout") else "khong-chung-minh-duoc"),
               "proved": bool(ok), "runtime": time.time() - t0, "build_time": build_time,
               "steps": infos.get("step"), "version": ver}
        if ok:
            try:
                fd, path = tempfile.mkstemp(suffix=".txt")
                os.close(fd)
                solver.write_solution(path)
                with open(path, encoding="utf-8") as f:
                    out["proof"] = f.read()
                os.unlink(path)
                out["proof_lines"] = sum(1 for line in out["proof"].splitlines() if line.strip()[:3].isdigit())
            except Exception as e:  # noqa: BLE001
                out["proof_error"] = str(e)[:200]
        return out


def main():
    req = json.loads(sys.stdin.read())
    res = run(req["problem"], float(req.get("timeout", 30)), int(req.get("seed", 1)))
    sys.stdout.write(json.dumps(res, ensure_ascii=False))


if __name__ == "__main__":
    main()
