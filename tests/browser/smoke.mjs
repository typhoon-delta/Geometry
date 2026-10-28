// Kiểm thử trên trình duyệt thật (Chromium headless qua Playwright): thao tác như người dùng,
// kiểm tra trạng thái, chụp màn hình vào tests/browser/out/ (hoặc thư mục SHOT_DIR) để tự xem lại.
//   node tests/browser/smoke.mjs
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const OUT = process.env.SHOT_DIR || resolve('tests/browser/out');
mkdirSync(OUT, { recursive: true });
const URL = 'file://' + resolve('index.html');

let failures = 0;
const ok = (cond, msg) => {
  console.log((cond ? '  ✓ ' : '  ✗ ') + msg);
  if (!cond) failures++;
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1400, height: 850 }, acceptDownloads: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto(URL);
await page.waitForFunction(() => window.__app);
const shot = (name) => page.screenshot({ path: `${OUT}/${name}.png` });
const state = () => page.evaluate(() => ({ n: __app.doc.steps.length, steps: __app.doc.steps }));
const boardBox = await page.locator('#board').boundingBox();
const toPage = async (x, y) => {
  const s = await page.evaluate(([x, y]) => __app.toScreen({ x, y }), [x, y]);
  return { x: boardBox.x + s.x, y: boardBox.y + s.y };
};
const clickAt = async (x, y) => { const p = await toPage(x, y); await page.mouse.click(p.x, p.y); };
const tool = (id) => page.click(`.tool[data-tool="${id}"]`);

// ---------- Mốc 1: dựng hình, kéo thả, hoàn tác ----------
console.log('Mốc 1: dựng hình + kéo thả + hoàn tác');
await tool('triangle');
await clickAt(-1, 3);
await clickAt(-4, -2);
await clickAt(4, -2);
let st = await state();
ok(st.n === 6, `tam giác tạo 3 điểm + 3 cạnh (có ${st.n} bước)`);
await tool('circumcenter');
await clickAt(-1, 3); await clickAt(-4, -2); await clickAt(4, -2);
await tool('circumcircle');
await clickAt(-1, 3); await clickAt(-4, -2); await clickAt(4, -2);
await tool('orthocenter');
await clickAt(-1, 3); await clickAt(-4, -2); await clickAt(4, -2);
await tool('altitude_foot');
await clickAt(-1, 3); await clickAt(-4, -2); await clickAt(4, -2);
await tool('arc_mid_no');
await clickAt(-1, 3); await clickAt(-4, -2); await clickAt(4, -2);
st = await state();
ok(st.steps.some((s) => s.type === 'circumcenter' && s.name === 'O'), 'có tâm ngoại tiếp O');
ok(st.steps.some((s) => s.type === 'orthocenter' && s.name === 'H'), 'có trực tâm H');
ok(st.steps.some((s) => s.type === 'arc_midpoint'), 'có điểm chính giữa cung');
// giao điểm: bấm gần chỗ cắt nhau của đường tròn ngoại tiếp và một đường thẳng mới
await tool('line');
await clickAt(-1, 3); await clickAt(3.5, -4);
await tool('intersect');
const before = (await state()).n;
const Opt = await page.evaluate(() => {
  const d = __app.doc.steps.find((s) => s.type === 'line');
  const c = __app.doc.steps.find((s) => s.type === 'circumcircle');
  const r = GeoCore.geom.intersect(__app.values.get(d.id), __app.values.get(c.id));
  return r.map((p) => ({ x: p.x, y: p.y }));
});
const far = Opt.reduce((a, b) => (Math.hypot(a.x + 1, a.y - 3) > Math.hypot(b.x + 1, b.y - 3) ? a : b));
await clickAt(far.x, far.y);
st = await state();
ok(st.n === before + 1 && st.steps[st.n - 1].type === 'intersection_other', 'giao điểm thứ hai của đường thẳng qua A với (O) dùng "giao điểm thứ hai"');
await page.click('.tool[data-tool="move"]');
await shot('m1-dung-hinh');

// kéo điểm A
const O0 = await page.evaluate(() => { const o = __app.doc.steps.find((s) => s.name === 'O'); const v = __app.values.get(o.id); return { x: v.x, y: v.y }; });
const a = await toPage(-1, 3);
await page.mouse.move(a.x, a.y);
await page.mouse.down();
for (let i = 1; i <= 10; i++) await page.mouse.move(a.x + i * 6, a.y - i * 3);
await page.mouse.up();
const after = await page.evaluate(() => {
  const s = __app.doc.steps[0];
  const o = __app.doc.steps.find((x) => x.name === 'O');
  const v = __app.values.get(o.id);
  return { A: s.params, O: { x: v.x, y: v.y } };
});
ok(Math.abs(after.A.x - -1) > 0.5, `kéo A làm A di chuyển (${after.A.x.toFixed(2)}, ${after.A.y.toFixed(2)})`);
ok(Math.hypot(after.O.x - O0.x, after.O.y - O0.y) > 0.01, 'O cập nhật theo');
await shot('m1-sau-khi-keo');
await page.keyboard.press('Control+z');
const undone = await page.evaluate(() => __app.doc.steps[0].params);
ok(Math.abs(undone.x - -1) < 1e-6 && Math.abs(undone.y - 3) < 1e-6, 'Ctrl+Z đưa A về chỗ cũ');
await page.keyboard.press('Control+y');
const redone = await page.evaluate(() => __app.doc.steps[0].params);
ok(Math.abs(redone.x - after.A.x) < 1e-9, 'Ctrl+Y làm lại');

// xoá kéo theo phụ thuộc, có cảnh báo
const n0 = (await state()).n;
await page.evaluate(() => __app.select(__app.doc.steps[0].id));
await page.keyboard.press('Delete');
await page.waitForSelector('.modal');
await shot('m1-canh-bao-xoa');
await page.click('.modal .primary');
const n1 = (await state()).n;
ok(n1 < n0 - 1, `xoá A kéo theo phụ thuộc (${n0} → ${n1} bước)`);
await page.keyboard.press('Control+z');
ok((await state()).n === n0, 'hoàn tác phục hồi phép xoá');

// đổi tên nhãn
await page.evaluate(() => __app.select(__app.doc.steps[0].id));
await page.fill('#p-name', 'A1');
await page.press('#p-name', 'Enter');
ok((await page.evaluate(() => __app.doc.steps[0].name)) === 'A1', 'đổi tên A → A1');
await page.keyboard.press('Control+z');

// kéo nhãn
const labBox = await page.evaluate(() => new Promise((res) => requestAnimationFrame(() => {
  const b = __app.renderer.labelBoxes.get(__app.doc.steps[1].id);
  const r = __app.view.canvas.getBoundingClientRect();
  res({ x: r.left + b.x + b.w / 2, y: r.top + b.y + b.h / 2 });
})));
await page.mouse.move(labBox.x, labBox.y);
await page.mouse.down();
await page.mouse.move(labBox.x - 20, labBox.y + 15, { steps: 4 });
await page.mouse.up();
const off = await page.evaluate(() => __app.doc.steps[1].style?.labelOffset);
ok(off && off[0] < 0, `kéo nhãn B thay đổi vị trí nhãn (${JSON.stringify(off)})`);

ok(errors.length === 0, 'không có lỗi JS: ' + errors.join(' | '));


// Các mốc sau được nối tiếp từ file riêng nếu có
const extra = process.env.SMOKE_ONLY_M1 ? [] : ['./smoke2.mjs'];
for (const f of extra) {
  try {
    const m = await import(f);
    await m.run({ page, ok, shot, state, tool, clickAt, toPage, errors });
  } catch (e) {
    if (e.code === 'ERR_MODULE_NOT_FOUND' && String(e.message).includes('smoke2')) continue;
    console.log('  ✗ lỗi khi chạy ' + f + ': ' + e.stack);
    failures++;
  }
}

await browser.close();
console.log(failures ? `\n${failures} kiểm tra THẤT BẠI` : '\nTất cả kiểm tra trình duyệt đều đạt');
process.exit(failures ? 1 : 0);
