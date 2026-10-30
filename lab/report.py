"""Báo cáo HTML tĩnh của một lần chạy: reports/<mã lần chạy>/index.html (+ reports/index.html liệt kê các lần chạy).

Mỗi sự kiện: điểm "lạ", phát biểu tiếng Việt, hình tĩnh kiểu "Đơn sắc", link mở thẳng hình trong công cụ web
(cùng cơ chế #h=… của nút "Chia sẻ bằng link") và link mở bản công cụ trên máy, nút "Hay"/"Chán".
Phản hồi: khi xem qua `python -m lab bao-cao` → ghi thẳng vào lab/du-lieu/phan-hoi.json; khi mở tệp trực tiếp →
lưu trong trình duyệt, bấm "Tải phản hồi" rồi chép tệp vào lab/du-lieu/phan-hoi/.
"""

from __future__ import annotations

import html
import json
import os
from datetime import datetime

from .config import REPORTS_DIR, load_config
from .core.codec import share_url
from .feedback import load_feedback
from .present import display_doc, statement, statement_text
from .render_svg import render_svg
from .run import RUNS_DIR, _read_json, list_runs
from .library import BY_KEY
from .score import TIER_LABELS, explain, skeleton, tier

TYPE_LABEL = {
    "collinear": "thẳng hàng", "concyclic": "đồng viên", "concurrent": "đồng quy", "tangent": "tiếp xúc",
    "on_line": "điểm trên đường thẳng", "on_circle": "điểm trên đường tròn", "parallel": "song song",
    "perpendicular": "vuông góc", "coincide": "trùng nhau", "same_line": "trùng đường", "same_circle": "trùng đường tròn",
}
NC_LABEL = {
    None: ("chưa kiểm tra", "nc-none"),
    "chung-minh-duoc": ("Newclid: chứng minh được – tầm thường", "nc-easy"),
    "chung-minh-duoc-voi-diem-phu": ("Newclid: chứng minh được nhờ điểm phụ", "nc-part"),
    "mot-phan": ("Newclid: chứng minh được một phần", "nc-part"),
    "khong-chung-minh-duoc": ("Newclid: KHÔNG chứng minh được – ứng viên sâu", "nc-deep"),
    "het-gio": ("Newclid: hết giờ – ứng viên sâu", "nc-deep"),
    "khong-dich-duoc": ("Newclid: chưa dịch được", "nc-none"),
    "loi-suy-dien": ("Newclid: lỗi khi suy diễn", "nc-none"),
    "loi-dung-hinh": ("Newclid: lỗi khi dựng hình", "nc-none"),
}

CSS = """
:root{--ink:#1d2433;--muted:#5b6474;--line:#e3e6ec;--bg:#f6f7f9;--card:#fff;--accent:#2f5d9e;--good:#2e7d4f;--bad:#a23b3b;--warn:#9a6a12}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
header{background:#fff;border-bottom:1px solid var(--line);padding:18px 20px}
h1{font-size:20px;margin:0 0 6px}main{max-width:1100px;margin:0 auto;padding:16px}
.meta{color:var(--muted);font-size:13.5px}.meta b{color:var(--ink)}
.bar{position:sticky;top:0;z-index:5;background:var(--bg);padding:10px 0;display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.bar select,.bar input,.bar button{font:inherit;font-size:14px;padding:5px 8px;border:1px solid #cfd4dc;border-radius:6px;background:#fff}
.bar button{cursor:pointer}
.card{background:var(--card);border:1px solid var(--line);border-radius:10px;margin:12px 0;padding:14px 16px;display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:16px}
@media(max-width:820px){.card{grid-template-columns:1fr}}
.head{display:flex;gap:10px;align-items:baseline;flex-wrap:wrap}
.rank{font-weight:700;color:var(--muted)}.score{font-weight:700;font-size:18px;color:var(--accent)}
.chip{display:inline-block;font-size:12.5px;padding:1px 8px;border-radius:999px;background:#eef1f5;color:#384152}
.nc-easy{background:#eef1f5;color:#6b7280}.nc-deep{background:#fbeaea;color:var(--bad)}.nc-part{background:#fdf3e1;color:var(--warn)}.nc-none{background:#f1f2f4;color:#6b7280}
.st p{margin:6px 0}.st .kl{font-weight:600}
i.lb{font-family:'Times New Roman',Times,serif;font-size:1.08em}
svg.hinh{width:100%;height:auto;border:1px solid var(--line);border-radius:6px;background:#fff}
.actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
.actions a,.actions button{font:inherit;font-size:13.5px;padding:5px 10px;border-radius:6px;border:1px solid #cfd4dc;background:#fff;color:var(--ink);text-decoration:none;cursor:pointer}
.actions a.web{border-color:var(--accent);color:var(--accent)}
button.hay.on{background:var(--good);border-color:var(--good);color:#fff}button.chan.on{background:var(--bad);border-color:var(--bad);color:#fff}
details{margin-top:8px;font-size:13.5px}summary{cursor:pointer;color:var(--muted)}
pre{white-space:pre-wrap;word-break:break-word;background:#f7f8fa;border:1px solid var(--line);border-radius:6px;padding:8px;font-size:12px;max-height:340px;overflow:auto}
table.pts{border-collapse:collapse;font-size:13px}table.pts td{padding:1px 8px 1px 0}
.note{background:#fff8e6;border:1px solid #f0d9a7;border-radius:8px;padding:8px 12px;font-size:13.5px;margin:8px 0}
.hidden{display:none}
h2{font-size:18px;margin:26px 0 4px;padding-top:6px;border-top:2px solid var(--line)}
.tier-note{color:var(--muted);font-size:13.5px;margin:0 0 6px}
.toc a{margin-right:14px}
.kho-hard{background:#fbeaea;color:var(--bad)}.kho-mid{background:#fdf3e1;color:var(--warn)}.kho-easy{background:#eaf4ee;color:var(--good)}
ul.var{margin:4px 0 0 0;padding-left:18px}ul.var li{margin:3px 0}
"""

JS = r"""
const RUN = document.body.dataset.run;
const LS = 'lab-phan-hoi:' + RUN;
let store = {};
try { store = JSON.parse(localStorage.getItem(LS) || '{}'); } catch (e) { store = {}; }
const FROM_FILE = JSON.parse(document.getElementById('fb-file').textContent || '{}');
function current(key) { return (store[key] && store[key].danh_gia) || (FROM_FILE[key] && FROM_FILE[key].danh_gia) || null; }
function paint(card) {
  const k = card.dataset.key, v = current(k);
  card.querySelector('button.hay').classList.toggle('on', v === 'hay');
  card.querySelector('button.chan').classList.toggle('on', v === 'chan');
}
let serverOK = location.protocol.startsWith('http');
async function send(key, entry) {
  if (!serverOK) return false;
  try {
    const r = await fetch('/api/phan-hoi', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({key, ...entry})});
    return r.ok;
  } catch (e) { return false; }
}
document.querySelectorAll('.card').forEach((card) => {
  paint(card);
  card.querySelectorAll('button.hay, button.chan').forEach((b) => b.addEventListener('click', async () => {
    const k = card.dataset.key, val = b.classList.contains('hay') ? 'hay' : 'chan';
    const now = current(k) === val ? null : val;
    const entry = {danh_gia: now, dac_trung: JSON.parse(card.dataset.feat), luc: new Date().toISOString(), lan_chay: RUN};
    store[k] = entry;
    try { localStorage.setItem(LS, JSON.stringify(store)); } catch (e) {}
    FROM_FILE[k] = entry;
    paint(card);
    const ok = await send(k, entry);
    document.getElementById('fb-status').textContent = ok ? 'Đã ghi phản hồi vào lab/du-lieu/phan-hoi.json.' :
      'Phản hồi đang lưu trong trình duyệt. Bấm "Tải phản hồi" rồi chép tệp vào thư mục lab/du-lieu/phan-hoi/.';
  }));
});
document.getElementById('dl').addEventListener('click', () => {
  const data = {};
  for (const [k, v] of Object.entries(store)) if (v && v.danh_gia) data[k] = v;
  const blob = new Blob([JSON.stringify({phan_hoi: data}, null, 1)], {type: 'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'phan-hoi-' + RUN + '.json';
  document.body.appendChild(a); a.click(); setTimeout(() => a.remove(), 500);
});
function filter() {
  const t = document.getElementById('f-type').value, n = document.getElementById('f-nc').value, s = document.getElementById('f-src').value;
  const q = document.getElementById('f-q').value.toLowerCase(), hideJudged = document.getElementById('f-judged').checked;
  let shown = 0;
  document.querySelectorAll('.card').forEach((c) => {
    const ok = (!t || c.dataset.type === t) && (!n || c.dataset.nc === n) && (!s || (' ' + c.dataset.src + ' ').includes(' ' + s + ' ')) && (!q || c.dataset.text.includes(q)) && (!hideJudged || !current(c.dataset.key));
    c.classList.toggle('hidden', !ok); if (ok) shown++;
  });
  document.getElementById('count').textContent = shown + ' sự kiện';
}
['f-type', 'f-nc', 'f-src', 'f-q', 'f-judged'].forEach((id) => document.getElementById(id).addEventListener('input', filter));
filter();
"""


TIER_NOTES = [
    ("kho", "Đuổi góc (kể cả dùng kết luận các bổ đề) không suy ra được, hoặc cần ≥ 3 vòng, hoặc Newclid không chứng minh được."),
    ("vua", "Cần một tứ giác nội tiếp / thẳng hàng trung gian (2 vòng đuổi góc), hoặc loại quan hệ chưa đo được độ khó."),
    ("de", "Đuổi góc một bước, nhưng giữ lại vì đối tượng tự nhiên và nối hai bổ đề hoặc dính (O), (I), O, H…"),
]


def _nc_group(nc):
    st = (nc or {}).get("status")
    if st in ("khong-chung-minh-duoc", "het-gio"):
        return "sau"
    if st in ("mot-phan", "chung-minh-duoc-voi-diem-phu"):
        return "mot-phan"
    if st == "chung-minh-duoc":
        return "tam-thuong"
    return "chua"


def _proof_text(nc, doc):
    """Vết chứng minh của Newclid, tên điểm đổi về tên trên hình (điểm phụ của bản dịch giữ tên gốc)."""
    import re

    names = {s["id"]: s.get("name") for s in doc["steps"]}
    out = []
    for part in nc.get("parts") or []:
        pr = part.get("proof")
        if not pr:
            continue
        mp = {v.upper(): names.get(k) or v for k, v in (part.get("names") or {}).items()}
        if mp:
            pr = re.sub(r"\b(" + "|".join(sorted(map(re.escape, mp), key=len, reverse=True)) + r")\b", lambda m: mp[m.group(1)], pr)
        out.append(pr.strip())
    return "\n\n".join(out) or (nc.get("proof") or "").strip()


KHO_LABEL = {1: ("đuổi góc 1 bước", "kho-easy"), 2: ("đuổi góc 2 vòng", "kho-mid"),
             None: ("đuổi góc không ra – cần ý khác", "kho-hard"), "?": ("chưa đo được độ khó", "")}


def _kho_chip(k):
    if isinstance(k, int) and k >= 3:
        return f'<span class="chip kho-hard">đuổi góc {k} vòng</span>'
    lab, cls = KHO_LABEL.get(k, (None, ""))
    return f'<span class="chip {cls}">{lab}</span>' if lab else ""


def _src_text(f):
    keys = f.get("cau_hinh") or []
    if not keys:
        return "cấu hình gốc"
    return " + ".join(BY_KEY[k].ten if k in BY_KEY else k for k in keys)


def _variants(vs, cfg):
    """Các biến thể cùng "bộ xương" với sự kiện đại diện: chỉ phát biểu ngắn + link mở hình."""
    items = []
    for f in vs:
        try:
            doc = display_doc(f, title="Biến thể")
            txt = statement_text(f, doc)
            doc["title"] = txt[:180]
            web = share_url(doc, cfg["bao_cao"]["dia_chi_web"])
            items.append(f'<li>{html.escape(txt)} <span class="meta">({f["score"]:.2f})</span> '
                         f'<a href="{html.escape(web)}" target="_blank" rel="noopener">mở hình</a></li>')
        except Exception:  # noqa: BLE001
            continue
    if not items:
        return ""
    return f'<details><summary>{len(items)} biến thể cùng ý (gom lại)</summary><ul class="var">{"".join(items)}</ul></details>'


def _card(i, f, cfg, weights, variants=()):
    title = f"Sự kiện {i}"
    doc = display_doc(f, title=title)
    st = statement(f, doc)
    doc["title"] = statement_text(f, doc)[:180]
    web = share_url(doc, cfg["bao_cao"]["dia_chi_web"])
    local = share_url(doc, "../../index.html")
    svg = render_svg(doc, highlight=[x for x in f["ids"]])
    nc = f.get("newclid") or {}
    nc_label, nc_cls = NC_LABEL.get(nc.get("status"), (f"Newclid: {nc.get('status')}", "nc-none"))
    chips = [f'<span class="chip">{TYPE_LABEL.get(f["type"], f["type"])}</span>', f'<span class="chip {nc_cls}">{nc_label}</span>',
             f'<span class="chip">{f.get("so_buoc", 0)} bước dựng mới</span>']
    if "kho" in f:
        chips.insert(1, _kho_chip(f["kho"]))
    if "tu_nhien" in f:
        chips.append(f'<span class="chip">tự nhiên {f["tu_nhien"]:.2f}</span>')
    if f.get("giao_thoa"):
        chips.append('<span class="chip kho-mid">nối hai bổ đề</span>')
    if nc.get("goals_total", 0) > 1:
        chips.append(f'<span class="chip">{nc.get("goals_proved", 0)}/{nc["goals_total"]} mục tiêu</span>')
    parts = explain(f.get("dac_trung", {}), weights)
    expl = "".join(f"<tr><td>{html.escape(k)}</td><td>{v:+.2f}</td></tr>" for k, v in parts)
    proof = _proof_text(nc, doc)
    probs = "\n\n".join(p.get("problem", "") for p in nc.get("parts", []) if p.get("problem"))
    reasons = "; ".join(p.get("reason") or p.get("error") or "" for p in nc.get("parts", []) if p.get("reason") or p.get("error"))
    text = statement_text(f, doc).lower()
    gt = "".join(f"<p>{s}</p>" for s in st["gia_thiet"])
    src = f'<p class="meta">Xuất phát: <b>{html.escape(_src_text(f))}</b>'
    if f.get("nguon"):
        src += " · kết luận dính phần của: " + html.escape(", ".join(BY_KEY[k].ten if k in BY_KEY else k for k in f["nguon"]))
    src += "</p>"
    det = [_variants(variants, cfg)] if variants else []
    det += [f'<details><summary>Thành phần điểm</summary><table class="pts">{expl}</table></details>']
    if proof:
        det.append(f"<details><summary>Chứng minh của Newclid ({nc.get('proof_lines', 0)} dòng)</summary><pre>{html.escape(proof)}</pre></details>")
    if probs:
        det.append(f"<details><summary>Bài toán đã gửi Newclid (JGEX)</summary><pre>{html.escape(probs)}</pre></details>")
    if reasons:
        det.append(f"<details><summary>Ghi chú Newclid</summary><pre>{html.escape(reasons)}</pre></details>")
    det.append(f"<details><summary>Ghi chú kỹ thuật</summary><pre>{html.escape(f['text'])}\nđộ sâu {f.get('depth')} · vòng {f.get('vong')} · "
               f"phép dựng: {', '.join(f.get('ops') or []) or '—'}\nkhoá {f['key']}</pre></details>")
    feat = html.escape(json.dumps(f.get("dac_trung", {})))
    return f"""
<article class="card" data-key="{f['key']}" data-type="{f['type']}" data-nc="{_nc_group(nc)}" data-src="{html.escape(' '.join(f.get('cau_hinh') or ['goc']))}" data-feat="{feat}" data-text="{html.escape(text)}">
 <div>
  <div class="head"><span class="rank">#{i}</span><span class="score">{f['score']:.2f}</span>{''.join(chips)}</div>
  {src}
  <div class="st">{gt}<p class="kl">{st['ket_luan']}</p></div>
  <div class="actions">
   <a class="web" href="{html.escape(web)}" target="_blank" rel="noopener">Mở trong công cụ (web)</a>
   <a href="{html.escape(local)}" target="_blank">Mở bản trên máy</a>
   <button class="hay" title="Sự kiện hay – ưu tiên hướng này">👍 Hay</button>
   <button class="chan" title="Sự kiện chán – hạ những sự kiện giống thế">👎 Chán</button>
  </div>
  {''.join(det)}
 </div>
 <div>{svg}</div>
</article>"""


def build_report(run_id=None, cfg=None):
    cfg = cfg or load_config()
    run_id = run_id or (list_runs()[-1]["id"] if list_runs() else None)
    if run_id is None:
        raise FileNotFoundError("Chưa có lần chạy nào (chạy: python -m lab chay --gio 1)")
    rdir = os.path.join(RUNS_DIR, run_id)
    state = _read_json(os.path.join(rdir, "trang-thai.json"), {})
    facts = _read_json(os.path.join(rdir, "su-kien.json"), [])
    fb = load_feedback()
    weights = state.get("trong_so") or cfg["trong_so"]
    for f in facts:
        if f["key"] in fb:
            f["phan_hoi"] = fb[f["key"]].get("danh_gia")
    loc = cfg.get("loc")
    for f in facts:
        f["tang"] = tier(f, loc)
    per = int(cfg["bao_cao"]["so_su_kien"])
    sections, n_card = [], 0
    for t, note in TIER_NOTES:
        fs = sorted((f for f in facts if f["tang"] == t), key=lambda f: -f["score"])
        groups = {}
        for f in fs:
            groups.setdefault(skeleton(f, f.get("base_ids") or ()), []).append(f)
        reps = list(groups.values())[:per]  # thứ tự nhóm theo điểm của đại diện (fs đã sắp)
        cards = []
        for g in reps:
            n_card += 1
            try:
                cards.append(_card(n_card, g[0], cfg, weights, variants=g[1:9]))
            except Exception as e:  # noqa: BLE001 – một sự kiện lỗi không làm hỏng cả báo cáo
                cards.append(f'<article class="card"><div>Sự kiện #{n_card}: lỗi khi trình bày ({html.escape(str(e))})</div></article>')
        more = f" (hiện {len(reps)} nhóm đầu)" if len(groups) > len(reps) else ""
        sections.append((t, len(fs), len(groups), f'<h2 id="tang-{t}">{TIER_LABELS[t]} – {len(fs)} sự kiện, {len(groups)} nhóm{more}</h2>'
                         f'<p class="tier-note">{note}</p>' + ("".join(cards) or "<p>Chưa có.</p>")))
    dropped = [f for f in facts if f["tang"] == "loai"]
    why = {"hệ quả trực tiếp của sự kiện khác": 0, "đối tượng gượng ép (độ tự nhiên thấp)": 0,
           "dễ (đuổi góc 1 bước) và không đặc sắc": 0, "bị đánh Chán": 0}
    for f in dropped:
        if f.get("phan_hoi") == "chan":
            why["bị đánh Chán"] += 1
        elif f.get("he_qua"):
            why["hệ quả trực tiếp của sự kiện khác"] += 1
        elif f.get("tu_nhien", 1.0) < (loc or {}).get("nguong_tu_nhien", 0.65):
            why["đối tượng gượng ép (độ tự nhiên thấp)"] += 1
        else:
            why["dễ (đuổi góc 1 bước) và không đặc sắc"] += 1
    dropped.sort(key=lambda f: -f["score"])
    peek = []
    for f in dropped[:40]:
        try:
            doc = display_doc(f, title="")
            peek.append(f"<li>{html.escape(statement_text(f, doc))} <span class='meta'>({f['score']:.2f})</span></li>")
        except Exception:  # noqa: BLE001
            continue
    why_txt = " · ".join(f"{k}: <b>{v}</b>" for k, v in why.items() if v)
    sections.append(("loai", len(dropped), 0, f'<h2 id="tang-loai">{TIER_LABELS["loai"]} – {len(dropped)} sự kiện</h2>'
                     f'<p class="tier-note">{why_txt or "không có"}. Ngưỡng lọc sửa trong mục [loc] của lab/cau-hinh.toml.</p>'
                     + (f'<details><summary>Xem 40 sự kiện điểm cao nhất bị lọc (để kiểm tra bộ lọc)</summary><ul class="var">{"".join(peek)}</ul></details>' if peek else "")))
    toc = " ".join(f'<a href="#tang-{t}">{TIER_LABELS[t]} ({n})</a>' for t, n, _, _ in sections)
    pairs = state.get("cap_da_ghep") or {}
    srcs = sorted({k for f in facts for k in (f.get("cau_hinh") or [])})
    opt_src = "".join(f'<option value="{k}">{html.escape(BY_KEY[k].ten if k in BY_KEY else k)}</option>' for k in srcs)
    nc = state.get("newclid") or {}
    nc_txt = f"Newclid {nc.get('version')}" if nc.get("ok") else f"Newclid KHÔNG dùng được: {nc.get('reason', 'chưa rõ')}"
    st = state.get("thong_ke", {})
    deep = sum(1 for f in facts if _nc_group(f.get("newclid")) == "sau")
    easy = sum(1 for f in facts if _nc_group(f.get("newclid")) == "tam-thuong")
    deltas = state.get("dieu_chinh_tu_phan_hoi") or {}
    delta_txt = ", ".join(f"{html.escape(k)} {v:+}" for k, v in deltas.items()) or "chưa có phản hồi"
    hours = state.get("da_chay_giay", 0) / 3600
    types = sorted({f["type"] for f in facts})
    opt_types = "".join(f'<option value="{t}">{TYPE_LABEL.get(t, t)}</option>' for t in types)
    fb_embed = json.dumps({k: v for k, v in fb.items()}, ensure_ascii=False).replace("</", "<\\/")
    page = f"""<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Báo cáo phòng thí nghiệm {html.escape(run_id)}</title><style>{CSS}</style></head>
<body data-run="{html.escape(run_id)}">
<header><h1>Phòng thí nghiệm hình học – lần chạy {html.escape(run_id)}</h1>
<div class="meta">Bắt đầu <b>{html.escape(state.get('bat_dau', ''))}</b> · đã chạy <b>{hours:.2f}</b> / {state.get('ngan_sach_giay', 0) / 3600:.2f} giờ
{'· <b>đã xong</b>' if state.get('xong') else '· <b>chưa xong</b> (chạy lại lệnh để tiếp tục)'} · {state.get('vong', 0)} vòng ·
<b>{len(facts)}</b> sự kiện (giữ lại) · {len(pairs)} cặp bổ đề đã ghép · {html.escape(nc_txt)} · Newclid đã kiểm {st.get('newclid_da_kiem', 0)}:
<b>{deep}</b> sâu, {easy} tầm thường · ứng viên đã xét {st.get('ung_vien', 0)}, loại hiển nhiên {st.get('hien_nhien', 0)}
· trọng số chỉnh từ phản hồi: {delta_txt} · sinh lúc {datetime.now().strftime('%H:%M %d/%m/%Y')}</div></header>
<main>
<div class="note">Mỗi vòng ghép hai cấu hình kinh điển rồi dựng thêm; kết luận chính của các bổ đề coi là đã biết.
Sự kiện chia tầng theo độ khó đo bằng bộ đuổi góc của phòng thí nghiệm (dùng kết luận các bổ đề làm kiến thức), các biến thể
cùng một ý được gom lại dưới một đại diện. Mỗi sự kiện đã được kiểm chứng bằng số trên nhiều tam giác ngẫu nhiên (không phải chứng minh). "Ứng viên sâu" =
bộ suy diễn Newclid không tự chứng minh được trong giới hạn thời gian. Bấm <b>Mở trong công cụ</b> để kéo thả kiểm tra;
<b>Hay</b>/<b>Chán</b> để lần chạy sau chấm điểm theo ý thầy/cô. <span id="fb-status"></span></div>
<div class="toc">{toc}</div>
<div class="bar">
 <select id="f-src"><option value="">Mọi bổ đề</option><option value="goc">Cấu hình gốc</option>{opt_src}</select>
 <select id="f-type"><option value="">Mọi loại quan hệ</option>{opt_types}</select>
 <select id="f-nc"><option value="">Mọi kết quả Newclid</option><option value="sau">Ứng viên sâu</option><option value="mot-phan">Một phần</option>
 <option value="tam-thuong">Tầm thường</option><option value="chua">Chưa kiểm tra / chưa dịch được</option></select>
 <input id="f-q" type="search" placeholder="Tìm trong phát biểu…">
 <label><input id="f-judged" type="checkbox"> ẩn sự kiện đã đánh giá</label>
 <button id="dl" type="button">Tải phản hồi (JSON)</button> <span id="count" class="meta"></span>
</div>
{''.join(sec for _, _, _, sec in sections) if facts else '<p>Chưa có sự kiện nào.</p>'}
</main>
<script id="fb-file" type="application/json">{fb_embed}</script>
<script>{JS}</script>
</body></html>"""
    out_dir = os.path.join(REPORTS_DIR, run_id)
    os.makedirs(out_dir, exist_ok=True)
    path = os.path.join(out_dir, "index.html")
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        f.write(page)
    os.replace(tmp, path)
    _index()
    return path


def _index():
    runs = list_runs()
    rows = "".join(
        f'<li><a href="{html.escape(r["id"])}/index.html">{html.escape(r["id"])}</a> – {r.get("da_chay_giay", 0) / 3600:.2f} giờ, '
        f'{r.get("thong_ke", {}).get("so_su_kien", 0)} sự kiện{"" if r.get("xong") else " (chưa xong)"}</li>'
        for r in reversed(runs) if os.path.exists(os.path.join(REPORTS_DIR, r["id"], "index.html")))
    page = f"""<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Các lần chạy</title><style>{CSS}</style></head><body><header><h1>Phòng thí nghiệm hình học – các lần chạy</h1></header>
<main><ul>{rows}</ul></main></body></html>"""
    os.makedirs(REPORTS_DIR, exist_ok=True)
    with open(os.path.join(REPORTS_DIR, "index.html"), "w", encoding="utf-8") as f:
        f.write(page)
