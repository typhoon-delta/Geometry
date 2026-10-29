// Kiểm tra trình duyệt cho bản 1.5 – bước 1: lưu tất cả các tab vào một tệp, mở lại (cả nhiều tệp), dấu "chưa lưu",
// mở lại hình vừa đóng, bản nháp trong IndexedDB khi localStorage đầy, khôi phục bản nháp cũ.
import fs from 'node:fs';

export async function run({ page, ok, shot }) {
  console.log('Bản 1.5: lưu tất cả tab, bản nháp');
  // ba hình: hai ví dụ + một hình có khung lời giải
  await page.evaluate(() => {
    while (__app.tabs.length > 1) __app.tabs.splice(1);
    __app.showTab(0);
    __app.loadDoc({ format: 'hinh-hoc-dong', version: 1, steps: [] });
    const ex = (id) => GeoCore.THU_VIEN.find((x) => x.id === id).doc;
    __app.openDoc(ex('imo2008-1'));
    __app.openDoc(ex('brocard'));
    __app.newTab(ex('monge'));
    __app.textBoxes.newBox('loigiai', { text: 'Ta có $\\angle O_1 S O_2 = 90^\\circ$.\n---\nVậy (đpcm).' });
  });
  const dots = () => page.evaluate(() => document.querySelectorAll('#tabbar .dt-dot').length);
  ok((await dots()) === 3, 'ba tab có thay đổi chưa lưu → có chấm ở tab');

  // ---- Ctrl+S một tab: chỉ tab đó hết chấm ----
  let [dl] = await Promise.all([page.waitForEvent('download'), page.keyboard.press('Control+s')]);
  ok(dl.suggestedFilename().endsWith('.json') && (await dots()) === 2, `Ctrl+S lưu tab đang mở (${dl.suggestedFilename()}), tab đó hết chấm`);

  // ---- Ctrl+Shift+S: mọi tab vào một tệp ----
  await page.evaluate(() => __app.switchTab(1));
  [dl] = await Promise.all([page.waitForEvent('download'), page.keyboard.press('Control+Shift+s')]);
  const bundle = JSON.parse(fs.readFileSync(await dl.path(), 'utf8'));
  ok(bundle.format === 'hinh-hoc-dong-bo' && bundle.tabs.length === 3 && bundle.active === 1 && bundle.tabs[2].boxes.length === 1 && bundle.tabs.every((d) => d.view && d.view.bbox),
    `Ctrl+Shift+S: một tệp ${dl.suggestedFilename()} chứa 3 hình (giữ tab đang mở, khung nhìn, khung chữ)`);
  ok((await dots()) === 0, 'lưu tất cả → không tab nào còn chấm');
  await page.evaluate(() => __app.commit((d) => { d.title = 'Brocard (sửa)'; }));
  ok((await dots()) === 1, 'sửa tiếp một tab → tab đó có chấm lại');

  // ---- đóng hình đã lưu: không hỏi; mở lại hình vừa đóng ----
  await page.evaluate(() => __app.switchTab(0));
  await page.evaluate(() => __app.closeTab(0));
  ok((await page.evaluate(() => [__app.tabs.length, document.querySelector('.modal-back')])).join() === '2,', 'đóng hình đã lưu không hỏi lại');
  await page.evaluate(() => document.getElementById('btn-reopen').click());
  ok(await page.evaluate(() => __app.tabs.length === 3 && __app.doc.title === 'IMO 2008 – Bài 1' && !document.querySelector('#tabbar .dtab.active .dt-dot')), 'Tệp › Mở lại hình vừa đóng (vẫn là hình đã lưu)');

  // ---- mở tệp bộ hình: mở đủ các tab, không mở trùng ----
  await page.evaluate(() => { while (__app.tabs.length > 1) __app.tabs.splice(1); __app.showTab(0); __app.loadDoc({ format: 'hinh-hoc-dong', version: 1, steps: [] }); });
  const tmp = await dl.path();
  let [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.keyboard.press('Control+o')]);
  await chooser.setFiles(tmp);
  await page.waitForFunction(() => __app.tabs.length === 3);
  ok(await page.evaluate(() => __app.tabIdx === 1 && __app.tabs[2].doc.boxes.length === 1 && document.querySelectorAll('#tabbar .dt-dot').length === 0), 'Ctrl+O tệp bộ hình: mở 3 tab, đúng tab đang mở, có khung chữ, chưa sửa gì');
  [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.keyboard.press('Control+o')]);
  await chooser.setFiles(tmp);
  await page.waitForTimeout(300);
  ok((await page.evaluate(() => __app.tabs.length)) === 3, 'mở lại cùng tệp: không mở trùng tab');
  await shot('v15-tab');

  // ---- localStorage đầy: bản nháp vẫn còn nhờ IndexedDB ----
  await page.evaluate(() => {
    const orig = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) { if (k === 'hinh-hoc-dong:nhap-tab' && v.length > 200) throw new Error('QuotaExceededError'); return orig.call(this, k, v); };
    __app.commit((d) => { d.title = 'Sau khi localStorage đầy'; });
  });
  await page.waitForTimeout(800);
  await page.reload();
  await page.waitForFunction(() => window.__app && __app.tabs.length === 3);
  ok(await page.evaluate(() => __app.tabs.some((t, i) => (i === __app.tabIdx ? __app.doc : t.doc).title === 'Sau khi localStorage đầy')), 'localStorage đầy: tải lại trang vẫn khôi phục từ IndexedDB');

  // ---- khôi phục bản nháp cũ ----
  await page.waitForTimeout(700); // bản chụp đầu tiên sau khi mở trang
  await page.evaluate(() => { __app.closeTab(__app.tabIdx); });
  if (await page.$('.modal-back')) await page.click('.modal .primary');
  await page.evaluate(() => document.getElementById('btn-restore').click());
  await page.waitForSelector('.pick');
  await shot('v15-khoiphuc');
  await page.click('.pick >> text=/3 hình/');
  await page.waitForTimeout(200);
  ok((await page.evaluate(() => __app.tabs.length)) === 3, 'Khôi phục bản nháp cũ: mở lại hình đã đóng, không mở trùng hình đang có');
}
