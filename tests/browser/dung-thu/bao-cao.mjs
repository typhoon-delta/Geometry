// Sinh trang reports/dung-thu.html từ kết quả dùng thử (ket-qua-truoc.json: bản 1.1, ket-qua-sau.json: bản 1.2).
//   node tests/browser/dung-thu/bao-cao.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { BAI } from './bai.mjs';
import { VAN_DE, matchIssue } from './van-de.mjs';

const DIR = resolve('reports/dung-thu');
const truoc = JSON.parse(readFileSync(resolve(DIR, 'ket-qua-truoc.json'), 'utf8'));
const sau = JSON.parse(readFileSync(resolve(DIR, 'ket-qua-sau.json'), 'utf8'));
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const by = (list, id) => list.find((r) => r.id === id);
const sum = (list, f) => list.reduce((s, r) => s + f(r), 0);
const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
const fmtE = (x) => {
  if (typeof x !== 'number') return esc(x);
  if (x === 0) return '0';
  const [m, e] = x.toExponential(0).split('e');
  return `${m}·10${[...String(+e)].map((c) => SUP[c]).join('')}`;
};
const nhanDe = (r) => r.nhan.overlapLL.length + r.nhan.overPoint.length + r.nhan.overCurveCount;
const STATUS = { 'đã sửa': 'ok', 'đỡ hơn': 'part', 'chưa sửa': 'no', 'không phải lỗi': 'na' };

const rows = BAI.map((b) => ({ b, t: by(truoc, b.id), s: by(sau, b.id) })).filter((x) => x.t && x.s);
const T = { thaoTac: sum(rows, (x) => x.t.thaoTac.tong), thaoTac2: sum(rows, (x) => x.s.thaoTac.tong), bam: sum(rows, (x) => x.t.thaoTac.lanBam), bam2: sum(rows, (x) => x.s.thaoTac.lanBam), de: sum(rows, (x) => nhanDe(x.t)), de2: sum(rows, (x) => nhanDe(x.s)) };
const dung = rows.filter((x) => x.s.kiemChung.dung).length;
const khamT = rows.filter((x) => x.t.khamPha.found).length, khamS = rows.filter((x) => x.s.khamPha.found).length;
const msMax = Math.max(...rows.flatMap((x) => x.s.keo.map((k) => k.msKhung)));
const nhay = rows.filter((x) => x.s.keo.some((k) => k.nhay.length)).map((x) => x.b.ten);
const pct = (a, b) => Math.round((100 * (a - b)) / a);

function issuesOf(x) {
  // vấn đề ghi được khi dựng (bản cũ) + vấn đề đo được (nhãn đè, khám phá…), kèm trạng thái
  const out = new Map();
  for (const i of x.t.vanDe) { const v = matchIssue(i.text); if (v) out.set(v.id, { v, text: i.text }); }
  const conLai = new Set(x.s.vanDe.map((i) => matchIssue(i.text)?.id).filter(Boolean));
  if (nhanDe(x.t) > nhanDe(x.s)) out.set('nhan', { v: VAN_DE.find((v) => v.id === 'nhan'), text: `${nhanDe(x.t)} chỗ nhãn đè (nhãn–nhãn / nhãn–điểm / nhãn–đường) → còn ${nhanDe(x.s)}` });
  if (x.t.thaoTac.rename && x.t.thaoTac.tong - x.s.thaoTac.tong >= 5) out.set('ten', { v: VAN_DE.find((v) => v.id === 'ten'), text: `Đặt ${x.t.thaoTac.rename} tên tốn nhiều thao tác` });
  if (!x.t.khamPha.found && x.s.khamPha.found) out.set('kham', { v: VAN_DE.find((v) => v.id === 'kham'), text: `Bộ khám phá không tìm thấy kết luận → bản 1.2 xếp hạng #${x.s.khamPha.found.rank}: “${x.s.khamPha.found.text}”` });
  return [...out.values()].map((o) => ({ ...o, con: conLai.has(o.v.id) }));
}

const issueTable = VAN_DE.map((v, i) => `<tr>
  <td class="num">${i + 1}</td>
  <td><span class="lv lv-${v.muc === 'Cao' ? 'hi' : v.muc === 'Vừa' ? 'mid' : 'lo'}">${v.muc}</span><div class="sub">${esc(v.nhom)}</div></td>
  <td><b>${esc(v.ten)}</b><div class="sub">${esc(v.moTa)}</div></td>
  <td><span class="st st-${STATUS[v.trangThai]}">${esc(v.trangThai)}</span><div class="sub">${esc(v.sua)}</div></td>
</tr>`).join('');

const cards = rows.map(({ b, t, s }) => {
  const iss = issuesOf({ t, s });
  const kc = s.kiemChung;
  const kham = s.khamPha.found ? `#${s.khamPha.found.rank}: ${esc(s.khamPha.found.text)}` : (b.khamGhiChu || 'không (dạng kết luận chưa hỗ trợ: đoạn/góc bằng nhau, tổng độ dài…)');
  const keo = s.keo.map((k) => `${esc(k.diem)}: ${k.msKhung} ms/khung${k.nhay.length ? ` · <b class="bad">nhảy ${esc(k.nhay.join(', '))}</b>` : ''}${k.doiTuongMat ? ` · mất ${k.doiTuongMat} đối tượng` : ''}`).join('<br>');
  return `<article class="card" id="${b.id}">
  <figure><a href="dung-thu/anh/${b.id}.png" target="_blank"><img src="dung-thu/anh/${b.id}.png" alt="Hình ${esc(b.ten)} dựng bằng bản 1.2" loading="lazy"></a>
  <figcaption>Bản 1.2 · <a href="dung-thu/anh-truoc/${b.id}.png" target="_blank">ảnh cùng kịch bản trên bản 1.1</a></figcaption></figure>
  <div class="body">
    <h3>${esc(b.ten)} <span class="tag">${esc(b.nhom)}</span></h3>
    <p class="de">${esc(b.de)}</p>${b.ghiChu ? `<p class="sub">${esc(b.ghiChu)}</p>` : ''}
    <table class="kv">
      <tr><th>Thao tác</th><td><s>${t.thaoTac.tong}</s> → <b>${s.thaoTac.tong}</b> <span class="sub">(chọn công cụ ${s.thaoTac.tool}, bấm lên hình ${s.thaoTac.board}, đặt tên ${s.thaoTac.rename}, khác ${s.thaoTac.other}) · lần bấm chuột <s>${t.thaoTac.lanBam}</s> → ${s.thaoTac.lanBam}</span></td></tr>
      <tr><th>Nhãn đè</th><td><s>${nhanDe(t)}</s> → <b>${nhanDe(s)}</b></td></tr>
      <tr><th>Kiểm chứng</th><td>${kc.dung ? '<b class="good">đúng</b>' : '<b class="bad">SAI</b>'} – sai số lớn nhất ${fmtE(kc.max)} trên ${kc.samples} cấu hình xê dịch${kc.skipped ? ` (bỏ ${kc.skipped} cấu hình trái giả thiết)` : ''}${kc.undef ? `, ${kc.undef} cấu hình không xác định` : ''}</td></tr>
      <tr><th>Khám phá</th><td>${kham}</td></tr>
      <tr><th>Kéo thử</th><td>${keo || '–'}</td></tr>
    </table>
    ${iss.length ? `<ul class="iss">${iss.map((o) => `<li><span class="st st-${o.con ? 'part' : STATUS[o.v.trangThai]}">${o.con ? 'còn' : esc(o.v.trangThai)}</span> ${esc(o.text)} <a href="#vd-${o.v.id}" class="sub">→ vấn đề ${VAN_DE.indexOf(o.v) + 1}</a></li>`).join('')}</ul>` : '<p class="sub">Không gặp vấn đề riêng.</p>'}
  </div>
</article>`;
}).join('\n');

const html = `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Dùng thử bản 1.2</title>
<style>
:root { --bg: #fafaf9; --card: #fff; --ink: #1c1917; --muted: #78716c; --line: #e7e5e4; --accent: #2563eb; --good: #15803d; --bad: #b91c1c; --warn: #b45309; --hi: #fee2e2; --mid: #fef3c7; --lo: #e0f2fe; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --bg: #1c1917; --card: #292524; --ink: #f5f5f4; --muted: #a8a29e; --line: #44403c; --accent: #60a5fa; --good: #4ade80; --bad: #f87171; --warn: #fbbf24; --hi: #7f1d1d; --mid: #78350f; --lo: #0c4a6e; } :root:not([data-theme="light"]) .card img { filter: invert(.9) hue-rotate(180deg); } }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--ink); font: 15px/1.55 system-ui, -apple-system, 'Segoe UI', Roboto, 'Noto Sans', sans-serif; }
main { max-width: 1180px; margin: 0 auto; padding: 28px 16px 60px; }
h1 { font-size: 26px; margin: 0 0 6px; } h2 { font-size: 20px; margin: 36px 0 10px; } h3 { font-size: 17px; margin: 0 0 6px; }
.lead { color: var(--muted); max-width: 900px; }
.stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 10px; margin: 18px 0; }
.stat { background: var(--card); border: 1px solid var(--line); border-radius: 10px; padding: 12px 14px; }
.stat b { display: block; font-size: 22px; } .stat span { color: var(--muted); font-size: 13px; }
table.iss-t { width: 100%; border-collapse: collapse; background: var(--card); border: 1px solid var(--line); border-radius: 10px; overflow: hidden; }
.iss-t td, .iss-t th { padding: 8px 10px; border-bottom: 1px solid var(--line); vertical-align: top; text-align: left; }
.iss-t th { font-size: 13px; color: var(--muted); font-weight: 600; }
.num { color: var(--muted); width: 28px; } .sub { color: var(--muted); font-size: 13px; }
.lv, .st, .tag { display: inline-block; font-size: 12px; font-weight: 600; padding: 1px 7px; border-radius: 99px; white-space: nowrap; }
.lv-hi { background: var(--hi); } .lv-mid { background: var(--mid); } .lv-lo { background: var(--lo); }
.st-ok { color: var(--good); border: 1px solid currentColor; } .st-part { color: var(--warn); border: 1px solid currentColor; } .st-no { color: var(--bad); border: 1px solid currentColor; } .st-na { color: var(--muted); border: 1px solid currentColor; }
.tag { background: var(--line); color: var(--ink); font-weight: 500; }
.cards { display: grid; gap: 16px; }
.card { display: grid; grid-template-columns: minmax(0, 46%) minmax(0, 1fr); gap: 16px; background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 14px; }
.card figure { margin: 0; } .card figcaption { font-size: 12px; color: var(--muted); margin-top: 4px; }
.card img { width: 100%; border: 1px solid var(--line); border-radius: 8px; background: #fff; display: block; }
.de { margin: 0 0 8px; }
table.kv { border-collapse: collapse; width: 100%; font-size: 14px; } .kv th { text-align: left; color: var(--muted); font-weight: 500; padding: 3px 10px 3px 0; white-space: nowrap; vertical-align: top; } .kv td { padding: 3px 0; }
.good { color: var(--good); } .bad { color: var(--bad); }
ul.iss { margin: 10px 0 0; padding-left: 0; list-style: none; font-size: 14px; } ul.iss li { margin: 4px 0; }
a { color: var(--accent); }
@media (max-width: 760px) { .card { grid-template-columns: 1fr; } .iss-t td:nth-child(1) { display: none; } }
</style>
</head>
<body>
<main>
<h1>Dùng thử bản 1.2</h1>
<p class="lead">Dựng ${rows.length} bài hình Olympic HOÀN TOÀN QUA GIAO DIỆN bằng một “người dùng ảo” (Chromium headless bấm biểu tượng công cụ, bấm lên bảng vẽ vào điểm, lên đường, vào chỗ hai đường cắt nhau, gõ tên điểm) – không ghi JSON trực tiếp. Mỗi bài được dựng hai lần với cùng kịch bản: trên bản 1.1 (trước khi sửa) và bản 1.2. Kết luận của đề được kiểm chứng bằng số trên hình vừa dựng và trên 30 cấu hình xê dịch. Mã: <code>tests/browser/dung-thu/</code>; chạy lại: <code>node tests/browser/dung-thu/chay.mjs</code>.</p>
<div class="stats">
  <div class="stat"><b>${dung}/${rows.length}</b><span>bài kết luận đúng trên hình dựng (sai số ≤ 10⁻⁷)</span></div>
  <div class="stat"><b>${T.thaoTac} → ${T.thaoTac2}</b><span>tổng thao tác (−${pct(T.thaoTac, T.thaoTac2)}%)</span></div>
  <div class="stat"><b>${T.bam} → ${T.bam2}</b><span>tổng lần bấm chuột (−${pct(T.bam, T.bam2)}%)</span></div>
  <div class="stat"><b>${T.de} → ${T.de2}</b><span>chỗ nhãn đè (nhãn–nhãn, nhãn–điểm, nhãn–đường)</span></div>
  <div class="stat"><b>${khamT} → ${khamS}</b><span>bài bộ khám phá tự tìm ra kết luận</span></div>
  <div class="stat"><b>≤ ${msMax} ms</b><span>mỗi khung khi kéo (JS), ${nhay.length ? 'có nhảy nghiệm: ' + esc(nhay.join(', ')) : 'không nhảy nghiệm'}</span></div>
</div>
<p class="sub">Thao tác = chọn một công cụ, một lần bấm lên hình, đặt một tên, hoặc một lệnh menu/phím. Nhãn đè đo trên ảnh chụp sau khi “Thu phóng vừa hình”. Thời gian khung đo trên Chromium headless không GPU.</p>

<h2>Các vấn đề, xếp theo mức ảnh hưởng tới việc dạy</h2>
<table class="iss-t"><thead><tr><th>#</th><th>Mức</th><th>Vấn đề</th><th>Đã sửa chưa</th></tr></thead><tbody>
${issueTable.replace(/<tr>\n  <td class="num">(\d+)<\/td>/g, (m, n) => `<tr id="vd-${VAN_DE[n - 1].id}">\n  <td class="num">${n}</td>`)}
</tbody></table>

<h2>Từng bài</h2>
<div class="cards">
${cards}
</div>
</main>
</body>
</html>
`;
writeFileSync(resolve('reports/dung-thu.html'), html);
console.log('Đã ghi reports/dung-thu.html');
