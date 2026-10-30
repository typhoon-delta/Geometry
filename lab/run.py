"""Bộ chạy phòng thí nghiệm: nhiều vòng khám phá liên tiếp trong thời gian cho trước.

    python -m lab chay --gio 7

* Mỗi vòng: GHÉP hai cấu hình kinh điển (lab/library) – ưu tiên cặp có chung đối tượng (H, ω, I…) và cặp chưa
  thử – rồi mở rộng bằng các phép dựng (đối xứng, giao điểm, chân đường vuông góc…). Một phần nhỏ các vòng
  (ghep.xac_suat_cau_hinh_goc) chạy từ cấu hình gốc. Cả hai kiểu đều thêm các TRẠM (đối tượng mới trong các sự
  kiện điểm cao / được đánh "hay"); hạt giống khác nhau → hướng tìm khác nhau.
* Sự kiện điểm sơ bộ cao được gửi Newclid (chạy song song trong tiến trình con, có giới hạn thời gian), chấm lại.
* Tiến độ lưu định kỳ vào lab/du-lieu/lan-chay/<mã>/ (ghi tệp tạm rồi đổi tên – không hỏng khi mất điện giữa chừng).
  Tắt giữa chừng (Ctrl+C, tắt máy) → lần sau `python -m lab chay` chạy tiếp lần chạy dở đó.
* Báo cáo HTML sinh lại định kỳ và khi kết thúc: reports/<mã>/index.html.
"""

from __future__ import annotations

import concurrent.futures as cf
import hashlib
import heapq
import json
import os
import random
import threading
import time
from datetime import datetime

from .config import DATA_DIR, load_config
from .core.model import sub_doc
from .feedback import effective_weights, load_feedback
from .library import BY_KEY
from .library.compose import choose_pair
from .score import features, score, tier
from .search.base import build_base_doc, make_samples
from .search.epoch import Epoch, base_facts
from .search.facts import FactPipeline

RUNS_DIR = os.path.join(DATA_DIR, "lan-chay")
GLOBAL_SEEN = os.path.join(DATA_DIR, "da-gap-chung.json")
BASE_IDS = [s["id"] for s in build_base_doc()["steps"]]


def _write_json(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False)
    os.replace(tmp, path)


def _read_json(path, default):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, json.JSONDecodeError):
        return default


def list_runs():
    if not os.path.isdir(RUNS_DIR):
        return []
    out = []
    for d in sorted(os.listdir(RUNS_DIR)):
        st = _read_json(os.path.join(RUNS_DIR, d, "trang-thai.json"), None)
        if st:
            out.append(st)
    return out


def latest_run_id():
    runs = list_runs()
    return runs[-1]["id"] if runs else None


class Lab:
    def __init__(self, cfg=None, log=print, run_id=None, new=False, hours=None, use_newclid=True, global_dedupe=True):
        self.cfg = cfg or load_config()
        self.log = log
        os.makedirs(RUNS_DIR, exist_ok=True)
        rid = None if new else (run_id or self._unfinished())
        if rid:
            self.dir = os.path.join(RUNS_DIR, rid)
            self.state = _read_json(os.path.join(self.dir, "trang-thai.json"), None)
        else:
            self.state = None
        if self.state is None:
            rid = datetime.now().strftime("%Y-%m-%d_%H%M%S")
            self.dir = os.path.join(RUNS_DIR, rid)
            self.state = {"id": rid, "bat_dau": datetime.now().isoformat(timespec="seconds"), "ngan_sach_giay": 0,
                          "da_chay_giay": 0.0, "vong": 0, "xong": False, "thong_ke": {}, "lan_tiep": 0}
            self.facts = []
            seen = {}
            if global_dedupe:
                seen = {k: "cu" for k in _read_json(GLOBAL_SEEN, [])}
            self.log(f"Lần chạy mới: {rid}")
        else:
            self.facts = _read_json(os.path.join(self.dir, "su-kien.json"), [])
            seen = _read_json(os.path.join(self.dir, "da-gap.json"), {})
            self.state["lan_tiep"] = self.state.get("lan_tiep", 0) + 1
            self.state["thong_ke_truoc"] = {k: v for k, v in (self.state.get("thong_ke") or {}).items()
                                            if k in ("ung_vien", "da_gap", "hien_nhien", "khong_xac_nhan", "su_kien")}
            self.log(f"Chạy tiếp lần chạy {rid}: đã chạy {self.state['da_chay_giay'] / 3600:.2f} giờ, "
                     f"{len(self.facts)} sự kiện, vòng {self.state['vong']}.")
        if hours is not None:
            self.state["ngan_sach_giay"] = float(hours) * 3600
        self.pipeline = FactPipeline(seen=seen)
        self.feedback = load_feedback()
        self.weights, self.deltas = effective_weights(self.cfg["trong_so"], self.feedback, self.cfg["bao_cao"]["hoc_toc_do"])
        self.state["trong_so"] = self.weights
        self.state["dieu_chinh_tu_phan_hoi"] = self.deltas
        self.by_key = {f["key"]: f for f in self.facts}
        nc = self.cfg["newclid"]
        self.newclid_on = use_newclid and nc.get("bat", True)
        self.newclid_info = None
        if self.newclid_on:
            from .prover.bridge import newclid_available

            self.newclid_info = newclid_available()
            if not self.newclid_info.get("ok"):
                self.log(f"Không dùng được Newclid: {self.newclid_info.get('reason')}. Vẫn chạy phần còn lại.")
                self.newclid_on = False
        self.state["newclid"] = self.newclid_info or {"ok": False, "reason": "đã tắt"}
        self.pool = cf.ThreadPoolExecutor(max_workers=max(1, int(nc.get("so_tien_trinh", 2)))) if self.newclid_on else None
        self.pending = []  # heap (-điểm, khoá)
        self.running = {}
        self.lock = threading.Lock()
        self.last_save = time.time()
        self.last_report = time.time()
        self.t_start = time.time()
        self.used0 = self.state["da_chay_giay"]
        # sự kiện chưa kiểm tra bằng Newclid từ lần trước → đưa lại vào hàng đợi
        for f in self.facts:
            if self.newclid_on and f.get("newclid") is None and self._want_newclid(f):
                heapq.heappush(self.pending, (-f["score"], f["key"]))

    def _unfinished(self):
        runs = list_runs()
        if runs and not runs[-1].get("xong"):
            return runs[-1]["id"]
        return None

    # ------------------------------------------------------------------ thời gian
    def used(self):
        return self.used0 + (time.time() - self.t_start)

    def remaining(self):
        return self.state["ngan_sach_giay"] - self.used()

    # ------------------------------------------------------------------ sự kiện
    def rescore(self, f):
        f.setdefault("base_ids", BASE_IDS)
        f["dac_trung"] = features(f, self.cfg["chay"]["so_buoc_toi_da"])
        f["score"] = score(f["dac_trung"], self.weights)
        fb = self.feedback.get(f["key"])
        if fb:
            f["phan_hoi"] = fb.get("danh_gia")
        f["tang"] = tier(f, self.cfg.get("loc"))
        return f

    def _want_newclid(self, f):
        """Newclid là ý kiến thứ hai cho ứng viên KHÓ (bộ đuổi góc không suy ra được): chỉ gửi các sự kiện tầng "khó"
        (hoặc chưa đo được độ khó) có điểm từ ngưỡng trở lên – gửi cả cái dễ thì hàng đợi dài vô tận."""
        return f["score"] >= self.cfg["newclid"]["nguong_diem"] and f.get("tang", "kho") == "kho"

    def on_fact(self, f):
        f["vong"] = self.state["vong"]
        f["luc"] = round(self.used(), 1)
        f["newclid"] = None
        self.rescore(f)
        self.facts.append(f)
        self.by_key[f["key"]] = f
        if self.newclid_on and self._want_newclid(f):
            heapq.heappush(self.pending, (-f["score"], f["key"]))
        self.tick()

    def tick(self, force=False):
        self._dispatch()
        now = time.time()
        if force or now - self.last_save > self.cfg["chay"]["luu_moi"]:
            self.save()
        if now - self.last_report > self.cfg["chay"]["bao_cao_moi"]:
            self.report()

    def _dispatch(self):
        if not self.newclid_on:
            return
        with self.lock:
            done = [k for k, fu in self.running.items() if fu.done()]
            for k in done:
                fu = self.running.pop(k)
                f = self.by_key.get(k)
                try:
                    res = fu.result()
                except Exception as e:  # noqa: BLE001
                    res = {"status": "loi-suy-dien", "error": str(e)}
                if f is not None:
                    f["newclid"] = res
                    self.rescore(f)
            n = max(1, int(self.cfg["newclid"].get("so_tien_trinh", 2)))
            while self.pending and len(self.running) < n:
                _, k = heapq.heappop(self.pending)
                f = self.by_key.get(k)
                if f is None or f.get("newclid") is not None or k in self.running:
                    continue
                from .prover.bridge import check_fact

                nc = self.cfg["newclid"]
                self.running[k] = self.pool.submit(check_fact, f, float(nc["gioi_han_giay"]), nc.get("goi_y_diem_phu"),
                                                   float(nc["tong_gioi_han_giay"]))

    # ------------------------------------------------------------------ trạm
    def stations(self, rnd):
        """Chọn trạm cho vòng sau: đối tượng mới nhất của các sự kiện điểm cao (ưu tiên sự kiện được đánh "hay")."""
        n = int(self.cfg["chay"]["so_tram"])
        cands = [f for f in self.facts if f.get("phan_hoi") != "chan" and f.get("depth", 0) > 0]
        if not cands or n <= 0:
            return {}, []
        cands.sort(key=lambda f: -(f["score"] + (5 if f.get("phan_hoi") == "hay" else 0)))
        top = cands[: max(n * 4, 20)]
        chosen = rnd.sample(top, min(n, len(top)))
        weights, specs = {}, []
        base = set(BASE_IDS)
        for f in chosen:
            nid = f["newest"]
            fp = (f.get("fingerprints") or {}).get(nid)
            if fp:
                weights[tuple(fp)] = 3.0 if f.get("phan_hoi") == "hay" else 2.0
            sd = sub_doc(f["doc"], [nid])
            steps = [s for s in sd["steps"] if s["id"] not in base]
            if not steps or len(steps) > 8:
                continue
            tag = hashlib.blake2b(f["key"].encode(), digest_size=3).hexdigest()
            ren = {s["id"]: f"t{tag}_{i}" for i, s in enumerate(steps)}
            out = []
            for s in steps:
                s2 = dict(s, id=ren[s["id"]], args=[ren.get(a, a) for a in s["args"]])
                s2.pop("name", None)
                out.append(s2)
            specs.append({"steps": out})
        return weights, specs

    # ------------------------------------------------------------------ lưu / báo cáo
    def save(self):
        self.last_save = time.time()
        self.state["da_chay_giay"] = round(self.used(), 1)
        prev = self.state.get("thong_ke_truoc", {})
        st = {k: v + prev.get(k, 0) for k, v in self.pipeline.stats.items()}
        self.state["thong_ke"] = dict(st, so_su_kien=len(self.facts),
                                      newclid_da_kiem=sum(1 for f in self.facts if f.get("newclid")))
        keep = int(self.cfg["chay"]["so_su_kien_luu"])
        if len(self.facts) > keep:
            self.facts.sort(key=lambda f: -(f["score"] + (100 if f.get("newclid") or f.get("phan_hoi") else 0)))
            dropped = self.facts[keep:]
            self.facts = self.facts[:keep]
            for f in dropped:
                self.by_key.pop(f["key"], None)
        _write_json(os.path.join(self.dir, "su-kien.json"), self.facts)
        seen = self.pipeline.seen
        if len(seen) > 400000:  # giữ khoá của sự kiện, bỏ bớt khoá "tầm thường"
            seen = {k: v for k, v in seen.items() if v == "su-kien"}
            self.pipeline.seen = seen
        _write_json(os.path.join(self.dir, "da-gap.json"), seen)
        _write_json(os.path.join(self.dir, "trang-thai.json"), self.state)

    def report(self):
        from .report import build_report

        self.last_report = time.time()
        try:
            path = build_report(self.state["id"], self.cfg)
            self.log(f"Đã cập nhật báo cáo: {path}")
            return path
        except Exception as e:  # noqa: BLE001
            self.log(f"Lỗi khi sinh báo cáo: {e}")
            return None

    def _remember_global(self):
        keys = set(_read_json(GLOBAL_SEEN, []))
        keys |= {f["key"] for f in self.facts}
        _write_json(GLOBAL_SEEN, sorted(keys))

    # ------------------------------------------------------------------ vòng chính
    def run(self):
        cfg = self.cfg["chay"]
        self.log(f"Ngân sách: {self.state['ngan_sach_giay'] / 3600:.2f} giờ; còn lại {max(0, self.remaining()) / 3600:.2f} giờ. "
                 f"Newclid: {'bật' if self.newclid_on else 'tắt'}.")
        if self.deltas:
            self.log("Trọng số đã chỉnh theo phản hồi: " + ", ".join(f"{k} {v:+}" for k, v in self.deltas.items()))
        interrupted = False
        try:
            if self.state["vong"] == 0:
                for f in base_facts(self.pipeline, make_samples(cfg["mau"], cfg["hat_giong_mau"])):
                    self.on_fact(f)
                self.log(f"Cấu hình gốc: {len(self.facts)} sự kiện.")
            while self.remaining() > 5:
                self.state["vong"] += 1
                e = self.state["vong"]
                seed = int(hashlib.blake2b(f"{self.state['id']}|{e}".encode(), digest_size=4).hexdigest(), 16)
                rnd = random.Random(seed)
                st_w, st_specs = self.stations(rnd)
                keys = None
                if rnd.random() >= float(self.cfg["ghep"]["xac_suat_cau_hinh_goc"]):
                    keys = choose_pair(rnd, self.state.setdefault("cap_da_ghep", {}))
                    k = "+".join(keys)
                    self.state["cap_da_ghep"][k] = self.state["cap_da_ghep"].get(k, 0) + 1
                ep = Epoch(cfg | {"trong_so_phep_dung": self.cfg["trong_so_phep_dung"]}, seed, self.pipeline,
                           stations=st_w, station_specs=st_specs if keys is None else st_specs[:2], log=self.log, keys=keys)
                n0 = len(self.facts)
                if keys:
                    ep.start_facts(self.on_fact)
                deadline = time.time() + min(cfg["thoi_gian_vong"], max(1.0, self.remaining()))
                stats = ep.run(deadline, self.on_fact)
                ten = " + ".join(BY_KEY[k].ten for k in keys) if keys else "cấu hình gốc"
                self.log(f"Vòng {e} [{ten}]: {len(self.facts) - n0} sự kiện mới (thử {stats['thu']} phép dựng, "
                         f"{len(st_specs)} trạm). Tổng {len(self.facts)}; Newclid đã kiểm {sum(1 for f in self.facts if f.get('newclid'))}, "
                         f"đang chờ {len(self.pending)}. Còn {max(0, self.remaining()) / 60:.0f} phút.")
                self.tick(force=True)
        except KeyboardInterrupt:
            interrupted = True
            self.log("Đã dừng theo yêu cầu – lưu tiến độ…")
        # kết thúc: chờ các bài Newclid đang chạy (tối đa vài phút)
        if self.pool is not None:
            t_end = time.time() + (0 if interrupted else 240)
            while self.running and time.time() < t_end:
                time.sleep(1)
                self._dispatch_finish_only()
            self.pool.shutdown(wait=False, cancel_futures=True)
        if not interrupted and self.remaining() <= 5:
            self.state["xong"] = True
            self.state["ket_thuc"] = datetime.now().isoformat(timespec="seconds")
        self.save()
        if self.state["xong"]:
            self._remember_global()
        return self.report()

    def _dispatch_finish_only(self):
        with self.lock:
            for k in [k for k, fu in self.running.items() if fu.done()]:
                fu = self.running.pop(k)
                f = self.by_key.get(k)
                try:
                    res = fu.result()
                except Exception as e:  # noqa: BLE001
                    res = {"status": "loi-suy-dien", "error": str(e)}
                if f is not None:
                    f["newclid"] = res
                    self.rescore(f)
