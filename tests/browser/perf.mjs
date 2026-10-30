// Đo hiệu năng KÉO ĐIỂM trên hình dày (ví dụ "dense": ~28 điểm, ~42 đường, 5 đường tròn).
//   node tests/browser/perf.mjs            in kết quả
//   node tests/browser/perf.mjs --assert   thoát mã 1 nếu không đạt ngưỡng
//   node tests/browser/perf.mjs --profile  in thêm các hàm tốn thời gian nhất (CPU profile)
//   node tests/browser/perf.mjs --khung    thêm 3 khung chữ có công thức (gắn màn hình, gắn hình, gắn điểm B)
//
// Cách đo: nhấn chuột vào A rồi di chuột 120 lần theo một vòng tròn nhỏ; sau mỗi lần di chuyển chờ
// trình duyệt vẽ xong 2 khung hình. Thời gian luồng chính (script + style + layout + vẽ) lấy từ
// Performance.getMetrics (TaskDuration) của Chrome DevTools Protocol, chia cho số khung.
// Chạy ở tốc độ CPU thật và ở chế độ giả lập CPU chậm hơn 4 lần (gần laptop phổ thông/cũ).
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const FRAMES = 120;
const BUDGET_MS = 16.7; // 60 khung hình/giây

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto('file://' + resolve('index.html'));
await page.waitForFunction(() => window.__app);
await page.evaluate(() => {
  const ex = GeoCore.EXAMPLES.dense;
  const d = ex.build();
  d.title = ex.title;
  __app.loadDoc(d);
  __app.zoomFit();
});
if (args.includes('--khung')) {
  await page.evaluate(() => {
    const B = __app.doc.steps.find((x) => x.name === 'B').id;
    const t = 'Ta có $\\angle BAC + \\angle BHC = 180^\\circ$ và $\\frac{AB}{AC} = \\frac{DB}{DC}$.\n---\nVậy $I_A, I_B, I_C$ thẳng hàng.';
    __app.textBoxes.newBox('loigiai', { text: t });
    __app.textBoxes.newBox('ghichu', { text: t, anchor: 'figure', x: 0, y: 0 });
    __app.textBoxes.newBox('ghichu', { text: '$B$ ở đây', anchor: 'point', pt: B, dx: 12, dy: 12 });
  });
}
await page.waitForTimeout(200);
const cdp = await page.context().newCDPSession(page);
await cdp.send('Performance.enable');

async function pointA() {
  const p = await page.evaluate(() => {
    const s = __app.doc.steps.find((x) => x.name === 'A');
    const r = __app.view.canvas.getBoundingClientRect();
    const q = __app.toScreen(__app.values.get(s.id));
    return { x: r.left + q.x, y: r.top + q.y };
  });
  return p;
}

const metric = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));

/** Đo nền: cùng vòng lặp chờ khung hình nhưng KHÔNG kéo (chi phí của chính công cụ đo). */
async function baseline(rate) {
  await cdp.send('Emulation.setCPUThrottlingRate', { rate });
  const m0 = await metric();
  for (let i = 0; i < FRAMES; i++) await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  const m1 = await metric();
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  return ((m1.TaskDuration - m0.TaskDuration) * 1000) / FRAMES;
}

/** Thời gian riêng của việc vẽ lại (đo trong trang, trung bình 200 lần vẽ). */
async function drawCost(rate) {
  await cdp.send('Emulation.setCPUThrottlingRate', { rate });
  const ms = await page.evaluate(() => {
    const t0 = performance.now();
    for (let i = 0; i < 200; i++) __app.view.drawNow();
    return (performance.now() - t0) / 200;
  });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  return ms;
}

async function run(rate, profile = false) {
  await cdp.send('Emulation.setCPUThrottlingRate', { rate });
  const start = await pointA();
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  // khởi động
  for (let i = 0; i < 5; i++) await page.mouse.move(start.x + i, start.y);
  if (profile) { await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 200 }); await cdp.send('Profiler.start'); }
  const m0 = await metric();
  const t0 = Date.now();
  await page.evaluate(() => { window.__frameTimes = []; let last = performance.now(); const f = (t) => { window.__frameTimes.push(t - last); last = t; if (window.__frameTimes.length < 5000) window.__rafId = requestAnimationFrame(f); }; window.__rafId = requestAnimationFrame(f); });
  for (let i = 0; i < FRAMES; i++) {
    const a = (2 * Math.PI * i) / FRAMES;
    await page.mouse.move(start.x + 60 * Math.cos(a) - 60, start.y + 40 * Math.sin(a));
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  }
  const m1 = await metric();
  const wall = Date.now() - t0;
  const frameTimes = await page.evaluate(() => { cancelAnimationFrame(window.__rafId); return window.__frameTimes; });
  let prof = null;
  if (profile) prof = (await cdp.send('Profiler.stop')).profile;
  await page.mouse.up();
  await page.waitForTimeout(300);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  const per = (k) => ((m1[k] - m0[k]) * 1000) / FRAMES;
  const sorted = frameTimes.slice(2).sort((x, y) => x - y);
  return {
    rate,
    mainThreadMsPerFrame: +per('TaskDuration').toFixed(2),
    scriptMs: +per('ScriptDuration').toFixed(2),
    layoutMs: +per('LayoutDuration').toFixed(2),
    styleMs: +per('RecalcStyleDuration').toFixed(2),
    p95FrameIntervalMs: +(sorted[Math.floor(sorted.length * 0.95)] || 0).toFixed(1),
    wallMs: wall,
    prof,
  };
}

function topFunctions(profile, n = 18) {
  const self = new Map();
  const byId = new Map(profile.nodes.map((nd) => [nd.id, nd]));
  const dt = profile.timeDeltas;
  const counts = new Map();
  profile.samples.forEach((id, i) => counts.set(id, (counts.get(id) || 0) + (dt[i] || 0)));
  for (const [id, us] of counts) {
    const nd = byId.get(id);
    const cf = nd.callFrame;
    const key = `${cf.functionName || '(anonymous)'} ${cf.url.split('/').pop()}:${cf.lineNumber + 1}`;
    self.set(key, (self.get(key) || 0) + us);
  }
  const total = [...self.values()].reduce((a, b) => a + b, 0);
  return [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, us]) => `${(us / 1000).toFixed(1).padStart(8)} ms ${((100 * us) / total).toFixed(1).padStart(5)}%  ${k}`);
}

const stats = await page.evaluate(() => {
  const k = GeoCore.kinds(__app.doc);
  const c = { point: 0, line: 0, circle: 0 };
  for (const s of __app.doc.steps) if (!s.hidden && c[k.get(s.id)] !== undefined) c[k.get(s.id)]++;
  return c;
});
console.log(`Hình đo: ${stats.point} điểm, ${stats.line} đường thẳng/đoạn, ${stats.circle} đường tròn; ${FRAMES} khung kéo`);
const results = [];
for (const rate of [1, 4]) {
  const r = await run(rate, args.includes('--profile') && rate === 4);
  r.baselineMs = +(await baseline(rate)).toFixed(2);
  r.dragMsPerFrame = +Math.max(0, r.mainThreadMsPerFrame - r.baselineMs).toFixed(2);
  r.drawCallMs = await drawCost(rate).then((v) => (v == null ? null : +v.toFixed(2))).catch(() => null);
  results.push(r);
  console.log(`CPU ×${rate}: luồng chính ${r.mainThreadMsPerFrame} ms/khung (script ${r.scriptMs}, style ${r.styleMs}, layout ${r.layoutMs}); nền đo ${r.baselineMs} ms → riêng việc kéo ≈ ${r.dragMsPerFrame} ms/khung; một lần vẽ (JS) ${r.drawCallMs} ms; p95 khoảng cách khung ${r.p95FrameIntervalMs} ms`);
  if (r.prof) console.log('  Hàm tốn thời gian nhất (CPU ×4, self time):\n  ' + topFunctions(r.prof).join('\n  '));
}
await browser.close();
if (errors.length) console.log('Lỗi JS:', errors);
if (args.includes('--json')) console.log(JSON.stringify(results.map(({ prof, ...r }) => r)));
if (args.includes('--assert')) {
  const slow = results.find((r) => r.rate === 4);
  // Ngưỡng (đều là phần do ứng dụng kiểm soát; chi phí bơm sự kiện chuột của Playwright ~8 ms/khung ở ×4
  // không tính – nó vẫn còn khi tắt hẳn việc vẽ):
  //   - khung hình đều: khoảng cách khung p95 ≤ 1,5 khung (25 ms) ngay cả khi CPU chậm 4 lần
  //   - JS mỗi khung (tính lại + vẽ) < 6 ms ở ×4;  một lần vẽ < 3 ms ở ×4
  //   - tổng luồng chính < 8 ms/khung ở CPU thật
  const fast = results.find((r) => r.rate === 1);
  const checks = [
    [slow.p95FrameIntervalMs <= BUDGET_MS * 1.5, `p95 khoảng cách khung ở ×4 = ${slow.p95FrameIntervalMs} ms (≤ 25)`],
    [slow.scriptMs < 6, `JS mỗi khung ở ×4 = ${slow.scriptMs} ms (< 6)`],
    [slow.drawCallMs != null && slow.drawCallMs < 3, `một lần vẽ ở ×4 = ${slow.drawCallMs} ms (< 3)`],
    [fast.mainThreadMsPerFrame < 8, `luồng chính ở ×1 = ${fast.mainThreadMsPerFrame} ms (< 8)`],
    [!errors.length, 'không có lỗi JS'],
  ];
  for (const [c, m] of checks) console.log((c ? '  ✓ ' : '  ✗ ') + m);
  const ok = checks.every(([c]) => c);
  console.log(ok ? 'ĐẠT ngưỡng hiệu năng' : 'KHÔNG ĐẠT ngưỡng hiệu năng');
  process.exit(ok ? 0 : 1);
}
