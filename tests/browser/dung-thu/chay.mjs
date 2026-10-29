// Chạy DÙNG THỬ: dựng từng bài qua giao diện (Chromium headless), đo thao tác, nhãn, kéo thả, kiểm chứng số.
//   node tests/browser/dung-thu/chay.mjs [--nhan sau] [--chi imo2008-1,brocard] [--luu]
// Kết quả: reports/dung-thu/ket-qua-<nhãn>.json, ảnh reports/dung-thu/anh/<id>.png (nhãn "sau")
// hoặc reports/dung-thu/anh-<nhãn>/<id>.png; --luu: ghi hình đã dựng vào examples/thu-vien/<id>.json.
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NguoiDung } from './nguoi-dung.mjs';
import { BAI } from './bai.mjs';
import { compactDoc } from '../../../src/io/codec.js';
import { existsSync, readFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const NHAN = arg('--nhan', 'sau');
const CHI = arg('--chi', null)?.split(',');
const LUU = argv.includes('--luu');
const OUT = resolve('reports/dung-thu');
const ANH = resolve(OUT, NHAN === 'sau' ? 'anh' : 'anh-' + NHAN);
mkdirSync(ANH, { recursive: true });
const TOL = 1e-7;

const browser = await chromium.launch();
const results = [];
const saved = [];
for (const bai of BAI) {
  if (CHI && !CHI.includes(bai.id)) continue;
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 850 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('file://' + resolve('index.html'));
  await page.waitForFunction(() => window.__app);
  const u = new NguoiDung(page);
  await u.init();
  const r = { id: bai.id, nhom: bai.nhom, ten: bai.ten, de: bai.de };
  const t0 = Date.now();
  try {
    await bai.dung(u);
    r.ok = true;
  } catch (e) {
    r.ok = false;
    r.loi = e.message;
    console.log(`  ✗ ${bai.id}: ${e.message}`);
  }
  r.thoiGianDung = Date.now() - t0;
  // thu phóng vừa hình (menu Hiển thị) rồi bỏ chọn để chụp ảnh sạch
  await u.menu('btn-fit');
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await page.mouse.move(2, 840);
  await page.waitForTimeout(150);
  r.thaoTac = { ...u.count, tong: u.total, lanBam: u.clicks, phim: u.keys };
  r.vanDe = u.issues;
  r.doiTuong = await page.evaluate(() => {
    const k = GeoCore.kinds(__app.doc);
    const c = { point: 0, line: 0, circle: 0, mark: 0, an: 0, buoc: __app.doc.steps.length };
    for (const s of __app.doc.steps) { if (s.hidden) c.an++; else c[k.get(s.id)]++; }
    return c;
  });
  r.nhan = await page.evaluate(() => __T.labelReport());
  await snap(page, `${ANH}/${bai.id}.png`);
  // kiểm chứng kết luận bằng số: cấu hình hiện tại + 30 cấu hình xê dịch
  r.kiemChung = await page.evaluate(([c, p, refs]) => __T.verify(c, p, refs), [bai.check.toString(), bai.pre ? bai.pre.toString() : null, u.refs]);
  r.kiemChung.dung = typeof r.kiemChung.base === 'number' && r.kiemChung.base < TOL && r.kiemChung.max < TOL && r.kiemChung.samples >= 10;
  r.khamPha = await page.evaluate((e) => __T.exploreReport(e), bai.kham || null);
  const doc = await page.evaluate(() => JSON.parse(JSON.stringify(__app.doc)));
  mkdirSync(resolve(OUT, 'hinh-' + NHAN), { recursive: true });
  writeFileSync(resolve(OUT, 'hinh-' + NHAN, bai.id + '.json'), JSON.stringify(doc));
  if (LUU && r.ok && r.kiemChung.dung) {
    mkdirSync(resolve('examples/thu-vien'), { recursive: true });
    doc.title = bai.ten;
    doc.view = { bbox: await page.evaluate(() => __app.view.getBoundingBox().map((v) => Math.round(v * 1000) / 1000)) };
    writeFileSync(resolve('examples/thu-vien', bai.id + '.json'), JSON.stringify(compactDoc(doc), null, 1) + '\n');
    saved.push(bai);
  }
  // kéo thử: nhấn vào điểm, kéo một vòng 36 bước; đo nhảy nghiệm, đối tượng mất, thời gian mỗi khung
  r.keo = [];
  const targets = bai.keo || await page.evaluate(() => __app.doc.steps.filter((s) => s.type === 'free_point').slice(0, 1).map((s) => s.name));
  for (const name of targets) {
    const info = await page.evaluate((n) => {
      const s = __app.doc.steps.find((x) => x.name === n);
      if (!s) return null;
      const q = __app.toScreen(__app.values.get(s.id));
      const view = __app.view;
      window.__ft = [];
      if (!view.__orig) { view.__orig = view.drawNow.bind(view); view.drawNow = function () { const t = performance.now(); view.__orig(); window.__ft.push(performance.now() - t); }; }
      const undef0 = __app.doc.steps.filter((x) => !__app.values.get(x.id)).length;
      return { x: q.x, y: q.y, undef0 };
    }, name);
    if (!info) continue;
    await page.evaluate(() => __app.setTool('move'));
    const bx = u.box;
    await page.mouse.move(bx.x + info.x, bx.y + info.y);
    await page.mouse.down();
    const track = [];
    let maxUndef = info.undef0;
    for (let i = 1; i <= 36; i++) {
      const a = (2 * Math.PI * i) / 36;
      await page.mouse.move(bx.x + info.x + 40 * Math.sin(a), bx.y + info.y - 40 * (1 - Math.cos(a)) * 0.6);
      await page.evaluate(() => new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res))));
      const snap = await page.evaluate(() => {
        const out = {}; let undef = 0;
        for (const s of __app.doc.steps) { const v = __app.values.get(s.id); if (!v) { undef++; continue; } if (v.kind === 'point' && !s.hidden) { const q = __app.toScreen(v); out[s.name] = [q.x, q.y]; } }
        return { out, undef };
      });
      maxUndef = Math.max(maxUndef, snap.undef);
      track.push(snap.out);
    }
    await page.mouse.up();
    await page.waitForTimeout(80);
    const ft = await page.evaluate(() => window.__ft.slice());
    // điểm "nhảy": dịch > 80 px trong một bước trong khi điểm kéo chỉ dịch ~7 px
    // "nhảy": một bước dịch > 60 px và gấp 6 lần cả bước trước lẫn bước sau (điểm ở xa chạy nhanh đều thì không tính)
    const jumps = new Set();
    const step = (i, n) => { const a = track[i - 1]?.[n], b = track[i]?.[n]; return a && b ? Math.hypot(a[0] - b[0], a[1] - b[1]) : null; };
    for (let i = 1; i < track.length; i++) for (const n of Object.keys(track[i])) {
      const d = step(i, n);
      if (d == null || d < 60) continue;
      const nb = Math.max(step(i - 1, n) ?? 0, step(i + 1, n) ?? 0);
      if (d > 6 * nb) jumps.add(n);
    }
    const resAfter = await page.evaluate(([c, refs]) => __T.residual(c, refs), [bai.check.toString(), u.refs]);
    const sorted = ft.slice().sort((x, y) => x - y);
    r.keo.push({
      diem: name, nhay: [...jumps], doiTuongMat: maxUndef - info.undef0,
      msKhung: +(ft.reduce((s, x) => s + x, 0) / Math.max(1, ft.length)).toFixed(2), msKhungMax: +(sorted[sorted.length - 1] || 0).toFixed(2),
      saiSoSauKeo: typeof resAfter === 'number' ? resAfter : resAfter,
    });
    await page.keyboard.press('Control+z');
  }
  r.loiTrang = errors;
  results.push(r);
  const kc = r.kiemChung;
  console.log(`${r.ok ? '✓' : '✗'} ${bai.id.padEnd(16)} thao tác ${String(r.thaoTac.tong).padStart(3)} (công cụ ${r.thaoTac.tool}, bấm ${r.thaoTac.board}, tên ${r.thaoTac.rename}, khác ${r.thaoTac.other}; ${r.thaoTac.lanBam} lần bấm)  ` +
    `nhãn đè ${r.nhan.overlapLL.length}/${r.nhan.overPoint.length}/${r.nhan.overCurveCount}  kiểm chứng ${kc.dung ? 'ĐÚNG' : 'SAI'} (gốc ${fmtE(kc.base)}, max ${fmtE(kc.max)}, ${kc.samples} mẫu, ${kc.undef} không xác định, ${kc.skipped} bỏ)  ` +
    `khám phá ${r.khamPha.found ? '#' + r.khamPha.found.rank : '–'} (${r.khamPha.ms} ms)  kéo ${r.keo.map((k) => `${k.diem}:${k.msKhung}ms${k.nhay.length ? ' NHẢY ' + k.nhay.join(',') : ''}${k.doiTuongMat ? ' mất ' + k.doiTuongMat : ''}`).join(' ')}`);
  if (u.issues.length) for (const i of u.issues) console.log(`     · [${i.kind}] ${i.text}`);
  if (errors.length) console.log('     LỖI TRANG:', errors.slice(0, 3));
  await ctx.close();
}
await browser.close();
if (LUU) writeCatalog();
const file = resolve(OUT, `ket-qua-${NHAN}.json`);
let prev = [];
if (CHI) { try { prev = JSON.parse((await import('node:fs')).readFileSync(file, 'utf8')); } catch { prev = []; } }
const merged = CHI ? [...prev.filter((p) => !results.some((r) => r.id === p.id)), ...results].sort((a, b) => BAI.findIndex((x) => x.id === a.id) - BAI.findIndex((x) => x.id === b.id)) : results;
writeFileSync(file, JSON.stringify(merged, null, 1));
console.log(`\nĐã ghi ${file}`);
const bad = results.filter((r) => !r.ok || !r.kiemChung.dung);
if (bad.length) console.log('CHƯA ĐẠT:', bad.map((r) => r.id).join(', '));

function fmtE(x) { return typeof x === 'number' ? x.toExponential(1) : String(x); }

/**
 * Mục lục thư viện ví dụ (examples/thu-vien/muc-luc.json) và module src/core/thu-vien.js nhập các tệp JSON
 * (esbuild đóng gói vào dist/app.js → menu "Ví dụ" chạy được cả khi mở index.html từ ổ đĩa, không mạng).
 */
function writeCatalog() {
  const dir = resolve('examples/thu-vien');
  const list = BAI.filter((b) => existsSync(resolve(dir, b.id + '.json'))).map((b) => ({ id: b.id, nhom: b.nhom, ten: b.ten, de: b.de }));
  writeFileSync(resolve(dir, 'muc-luc.json'), JSON.stringify(list, null, 1) + '\n');
  const L = ['// TỰ SINH bởi `node tests/browser/dung-thu/chay.mjs --luu` – không sửa tay.',
    '// Thư viện ví dụ: các hình dựng qua giao diện khi dùng thử (tests/browser/dung-thu), theo nhóm.',
    "import mucLuc from '../../examples/thu-vien/muc-luc.json' with { type: 'json' };"];
  list.forEach((b, i) => L.push(`import d${i} from '../../examples/thu-vien/${b.id}.json' with { type: 'json' };`));
  L.push('', `const DOCS = [${list.map((_, i) => 'd' + i).join(', ')}];`);
  L.push('export const THU_VIEN = mucLuc.map((m, i) => ({ ...m, doc: DOCS[i] }));', '');
  writeFileSync(resolve('src/core/thu-vien.js'), L.join('\n'));
  void readFileSync;
}

/** Chụp phần có nét vẽ của bảng vẽ (quét điểm ảnh canvas), ẩn thông báo và thanh gợi ý. */
async function snap(page, path) {
  await page.addStyleTag({ content: '#toast, #hint { display: none !important; }' });
  await page.waitForTimeout(60);
  const r = await page.evaluate(() => {
    const cv = __app.view.canvas, ctx = cv.getContext('2d'), W = cv.width, H = cv.height;
    const d = ctx.getImageData(0, 0, W, H).data;
    let x1 = W, y1 = H, x2 = -1, y2 = -1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = 4 * (y * W + x);
      if (d[i + 3] > 20 && (d[i] < 235 || d[i + 1] < 235 || d[i + 2] < 235)) { if (x < x1) x1 = x; if (x > x2) x2 = x; if (y < y1) y1 = y; if (y > y2) y2 = y; }
    }
    const b = cv.getBoundingClientRect(), k = (window.devicePixelRatio || 1);
    if (x2 < 0) return { x: b.left, y: b.top, width: b.width, height: b.height };
    const m = 18;
    const X1 = Math.max(0, x1 / k - m), Y1 = Math.max(0, y1 / k - m), X2 = Math.min(b.width, x2 / k + m), Y2 = Math.min(b.height, y2 / k + m);
    return { x: b.left + X1, y: b.top + Y1, width: X2 - X1, height: Y2 - Y1 };
  });
  await page.screenshot({ path, clip: r });
}
