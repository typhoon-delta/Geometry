"""Dòng lệnh của phòng thí nghiệm (xem lab/HUONG_DAN.md).

    python -m lab chay --gio 7        chạy 7 tiếng (tắt giữa chừng thì lần sau chạy tiếp)
    python -m lab chay --phut 10      chạy thử 10 phút
    python -m lab chay --moi --gio 2  bỏ lần chạy dở, bắt đầu lần chạy mới
    python -m lab bao-cao             sinh lại báo cáo lần chạy gần nhất và mở trong trình duyệt
    python -m lab kiem-tra            kiểm tra môi trường (numpy, Newclid…)
    python -m lab quet hinh.json      quét quan hệ của một hình JSON (như nút Khám phá)
"""

from __future__ import annotations

import argparse
import json
import os
import sys


def _utf8():
    for s in (sys.stdout, sys.stderr):
        try:
            s.reconfigure(encoding="utf-8")
        except Exception:  # noqa: BLE001
            pass


def cmd_chay(a):
    from .run import Lab

    if a.gio is None and a.phut is None:
        hours = None
    else:
        hours = (a.gio or 0) + (a.phut or 0) / 60
    lab = Lab(new=a.moi, hours=hours, use_newclid=not a.khong_newclid, global_dedupe=not a.ca_cu)
    if lab.state["ngan_sach_giay"] <= 0:
        lab.state["ngan_sach_giay"] = 3600.0
        print("Không ghi thời gian chạy → chạy 1 giờ (dùng --gio hoặc --phut).")
    path = lab.run()
    if path:
        print(f"\nBáo cáo: {path}\nXem và đánh giá: python -m lab bao-cao")


def cmd_bao_cao(a):
    from .config import REPORTS_DIR, ROOT, load_config
    from .report import build_report

    cfg = load_config()
    path = build_report(a.lan, cfg)
    print(f"Đã sinh báo cáo: {path}")
    if a.khong_mo:
        return
    from .server import serve

    serve(os.path.relpath(path, ROOT), port=int(cfg["bao_cao"]["cong_may_chu"]))


def cmd_kiem_tra(a):
    print(f"Python {sys.version.split()[0]}")
    ok = True
    try:
        import numpy

        print(f"numpy {numpy.__version__}: có")
    except ImportError:
        ok = False
        print("numpy: CHƯA CÀI  →  pip install numpy")
    from .prover.bridge import newclid_available

    info = newclid_available()
    print(f"Newclid: {'có, bản ' + str(info.get('version')) if info.get('ok') else 'không dùng được – ' + info.get('reason', '')}")
    if info.get("ok") and a.thu:
        from .prover.bridge import check_fact
        from .tests.test_newclid import facts

        r = check_fact(facts()["simson"], timeout=60)
        print(f"Thử Newclid với đường thẳng Simson: {r['status']} ({r['runtime']} giây)")
    print("Sẵn sàng." if ok else "Chưa sẵn sàng.")


def cmd_quet(a):
    from .core.model import load_doc
    from .scan.explorer import explore

    res = explore(load_doc(a.tep), samples=a.mau)
    if a.json:
        res.pop("_samples", None)
        res.pop("_rep", None)
        print(json.dumps(res, ensure_ascii=False, indent=1))
        return
    for r in res["relations"]:
        print(f"{r['score']}\t{r['type']}\t{r['text']}" + (f"\t({r['note']})" if r.get("note") else ""))


def main(argv=None):
    _utf8()
    p = argparse.ArgumentParser(prog="python -m lab", description="Phòng thí nghiệm hình học tự chạy")
    sub = p.add_subparsers(dest="lenh")
    c = sub.add_parser("chay", help="chạy vòng khám phá")
    c.add_argument("--gio", type=float, help="số giờ chạy (tổng của lần chạy, kể cả phần đã chạy trước khi bị tắt)")
    c.add_argument("--phut", type=float, help="số phút chạy (cộng thêm vào --gio)")
    c.add_argument("--moi", action="store_true", help="bỏ lần chạy dở (nếu có), bắt đầu lần mới")
    c.add_argument("--khong-newclid", action="store_true", help="không dùng Newclid")
    c.add_argument("--ca-cu", action="store_true", help="báo cả các sự kiện đã có trong các lần chạy trước")
    c.set_defaults(fn=cmd_chay)
    b = sub.add_parser("bao-cao", help="sinh lại và mở báo cáo")
    b.add_argument("--lan", help="mã lần chạy (mặc định: gần nhất)")
    b.add_argument("--khong-mo", action="store_true", help="chỉ sinh tệp, không mở trình duyệt")
    b.set_defaults(fn=cmd_bao_cao)
    k = sub.add_parser("kiem-tra", help="kiểm tra môi trường")
    k.add_argument("--thu", action="store_true", help="chạy thử Newclid với một bài")
    k.set_defaults(fn=cmd_kiem_tra)
    q = sub.add_parser("quet", help="quét quan hệ của một hình JSON")
    q.add_argument("tep")
    q.add_argument("--mau", type=int, default=12)
    q.add_argument("--json", action="store_true")
    q.set_defaults(fn=cmd_quet)
    a = p.parse_args(argv)
    if not getattr(a, "fn", None):
        p.print_help()
        return 1
    a.fn(a)
    return 0


if __name__ == "__main__":
    sys.exit(main())
