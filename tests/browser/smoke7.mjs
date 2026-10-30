// Kiểm tra trình duyệt cho bản 1.5 – bước 2: KHO BÀI trên GitHub (dùng GitHub giả chặn ở tầng mạng).
// Kết nối, Ctrl+S lưu bài mới (hộp thông tin), lưu tiếp, sửa ở máy khác → hỏi, mất mạng → hàng chờ, Ctrl+K tìm/mở,
// nhập các bài ví dụ, lưu các tab thành buổi dạy, xuất phiếu cho buổi.
import fs from 'node:fs';
import { createFakeGitHub } from '../fake-github.mjs';

export async function run({ page, ok, shot, errors }) {
  console.log('Bản 1.5: kho bài trên GitHub');
  const fake = createFakeGitHub({ repo: 'gv/kho-bai', token: 'github_pat_thu', empty: true });
  await fake.attach(page);
  await page.evaluate(() => { while (__app.tabs.length > 1) __app.tabs.splice(1); __app.showTab(0); __app.loadDoc({ format: 'hinh-hoc-dong', version: 1, steps: [] }); });
  const chip = () => page.evaluate(() => document.getElementById('kho-status').textContent.trim());
  ok((await chip()) === 'Kết nối kho bài', 'chưa kết nối: nút "Kết nối kho bài" trên thanh trên');

  // ---- kết nối (repo trống → tạo mục lục) ----
  await page.click('#kho-status');
  await page.fill('.k-repo', 'https://github.com/gv/kho-bai');
  await page.fill('.k-token', 'sai');
  await page.click('.modal .primary');
  await page.waitForFunction(() => /Token không đúng/.test(document.querySelector('.k-msg').textContent));
  ok(true, 'token sai: báo ngay trong hộp kết nối');
  await page.fill('.k-token', 'github_pat_thu');
  await page.click('.modal .primary');
  await page.waitForFunction(() => /Kho · 0 bài/.test(document.getElementById('kho-status').textContent));
  ok(fake.files().join() === 'chu-de.json,muc-luc.json', 'kết nối repo trống: tạo muc-luc.json và chu-de.json');

  // ---- Ctrl+S: bài mới ----
  await page.evaluate(() => __app.openDoc(GeoCore.THU_VIEN.find((x) => x.id === 'imo2008-1').doc));
  await page.mouse.click(300, 600);
  await page.keyboard.press('Escape');
  await page.keyboard.press('Control+s');
  await page.waitForSelector('.kmeta');
  const pre = await page.evaluate(() => ({ ten: document.querySelector('.k-ten').value, ky: document.querySelector('.k-ky').value, nam: document.querySelector('.k-nam').value, so: document.querySelector('.k-so').value }));
  ok(pre.ten === 'IMO 2008 – Bài 1' && pre.ky === 'IMO' && pre.nam === '2008' && pre.so === '1', `hộp thông tin: tên và nguồn tự điền (${JSON.stringify(pre)})`);
  await page.click('.k-topics .chip >> text=Góc, đường tròn, tứ giác nội tiếp');
  await page.click('.k-dk [data-d="3"]');
  await page.fill('.k-the', 'đường tròn đồng tâm');
  await shot('v15-luu-kho');
  await page.click('.kmeta .primary');
  await page.waitForFunction(() => /Kho · 1 bài/.test(document.getElementById('kho-status').textContent));
  const files = fake.files();
  ok(files.includes('bai/imo-2008-bai-1/bai.json') && files.includes('bai/imo-2008-bai-1/thu-nho.jpg'), 'lưu bài mới: bai/imo-2008-bai-1/{bai.json, thu-nho.jpg}');
  const ix = JSON.parse(fake.readText('muc-luc.json'));
  const e = ix.bai['imo-2008-bai-1'];
  ok(e.doKho === 3 && e.chuDe[0] === 'Góc, đường tròn, tứ giác nội tiếp' && e.the[0] === 'đường tròn đồng tâm' && e.trangThai === 'hinh', 'mục lục: chủ đề, thẻ, độ khó, trạng thái');
  ok(await page.evaluate(() => __app.tabs[__app.tabIdx].kho.ma === 'imo-2008-bai-1' && !document.querySelector('#tabbar .dtab.active .dt-dot')), 'tab gắn với bài trong kho, hết dấu chưa lưu');

  // ---- sửa rồi Ctrl+S: lưu luôn, không hỏi ----
  await page.evaluate(() => __app.textBoxes.newBox('loigiai', { text: 'Sáu điểm cùng nằm trên đường tròn tâm $O$.' }));
  ok(await page.evaluate(() => !!document.querySelector('#tabbar .dtab.active .dt-dot')), 'sửa hình → có dấu chưa lưu');
  await page.keyboard.press('Control+s');
  await page.waitForFunction(() => !document.querySelector('#tabbar .dtab.active .dt-dot') && !/Đang lưu/.test(document.getElementById('kho-status').textContent));
  ok(!(await page.$('.modal-back')) && JSON.parse(fake.readText('muc-luc.json')).bai['imo-2008-bai-1'].trangThai === 'loigiai', 'Ctrl+S lần sau lưu thẳng (không hỏi), trạng thái thành "Có lời giải"');

  // ---- máy khác sửa bài → hỏi trước khi ghi đè ----
  const cur = JSON.parse(fake.readText('bai/imo-2008-bai-1/bai.json'));
  cur.meta.ghiChu = 'sửa ở máy khác';
  fake.commitExternal({ 'bai/imo-2008-bai-1/bai.json': JSON.stringify(cur) });
  await page.evaluate(() => __app.commit((d) => { d.title = 'IMO 2008 – Bài 1 (lần 3)'; }));
  await page.keyboard.press('Control+s');
  await page.waitForSelector('.modal-back >> text=đã được sửa ở nơi khác');
  ok(true, 'bài bị sửa ở máy khác: hỏi trước khi ghi đè');
  await page.click('.modal button >> text=Ghi đè bằng hình này');
  await page.waitForFunction(() => !document.querySelector('#tabbar .dtab.active .dt-dot'));
  ok(JSON.parse(fake.readText('bai/imo-2008-bai-1/bai.json')).hinh[0].title === 'IMO 2008 – Bài 1 (lần 3)', 'chọn "Ghi đè": lưu bản này');

  // ---- mất mạng: giữ trong hàng chờ, có mạng tự lưu ----
  fake.state.offline = true;
  await page.evaluate(() => __app.commit((d) => { d.title = 'IMO 2008 – Bài 1 (lúc mất mạng)'; }));
  await page.keyboard.press('Control+s');
  await page.waitForFunction(() => /Chưa đồng bộ \(1\)/.test(document.getElementById('kho-status').textContent));
  ok(true, 'mất mạng: Ctrl+S giữ lại, nút kho báo "Chưa đồng bộ (1)"');
  fake.state.offline = false;
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await page.waitForFunction(() => /Kho · 1 bài/.test(document.getElementById('kho-status').textContent));
  ok(JSON.parse(fake.readText('bai/imo-2008-bai-1/bai.json')).hinh[0].title === 'IMO 2008 – Bài 1 (lúc mất mạng)' && (await page.evaluate(() => !document.querySelector('#tabbar .dtab.active .dt-dot'))),
    'có mạng lại: tự lưu lên kho, hết dấu chưa lưu');

  // ---- nhập các bài ví dụ ----
  await page.evaluate(() => document.getElementById('btn-kho-import').click());
  await page.click('.i-ex');
  const nImp = await page.evaluate(() => document.querySelectorAll('.i-row input[type=checkbox]:checked').length);
  await page.click('.modal .primary');
  await page.waitForFunction((n) => new RegExp(`Kho · ${n + 1} bài`).test(document.getElementById('kho-status').textContent), nImp);
  ok(nImp >= 20, `nhập ${nImp} bài ví dụ trong một lần (bài đã có trong kho được bỏ chọn sẵn)`);

  // ---- Ctrl+K: tìm, lọc, mở ----
  await page.evaluate(() => { __app.tabs.splice(0, __app.tabs.length - 1); __app.showTab(0); __app.loadDoc({ format: 'hinh-hoc-dong', version: 1, steps: [] }); });
  await page.keyboard.press('Control+k');
  await page.waitForSelector('.kcard');
  await page.waitForFunction(() => document.querySelector('.kcard .kc-thumb img'));
  await shot('v15-kho');
  await page.fill('.kw-q', 'brocard');
  const found = await page.evaluate(() => [...document.querySelectorAll('.kcard .kc-ten')].map((x) => x.textContent));
  ok(found.length === 1 && /Brocard/.test(found[0]), `tìm "brocard" (không dấu): ${found.join(', ')}`);
  await page.fill('.kw-q', '');
  await page.click('.kf-i:has-text("IMO") input');
  const nIMO = await page.evaluate(() => document.querySelectorAll('.kcard').length);
  ok(nIMO >= 13, `lọc nguồn IMO: ${nIMO} bài`);
  await page.click('.kcard >> nth=0');
  await page.waitForFunction(() => __app.tabs[__app.tabIdx].kho && !document.querySelector('.modal-back'));
  ok(await page.evaluate(() => __app.doc.steps.length > 0 && !document.querySelector('#tabbar .dtab.active .dt-dot')), 'bấm một bài: mở thành tab, gắn với kho');

  // ---- mở thêm bài, lưu các tab thành buổi dạy, xuất phiếu ----
  await page.keyboard.press('Control+k');
  await page.waitForSelector('.kcard');
  await page.fill('.kw-q', 'imo 2008');
  await page.click('.kcard >> nth=0');
  await page.waitForFunction(() => __app.tabs.length === 2);
  await page.evaluate(() => __app.newTab(GeoCore.THU_VIEN.find((x) => x.id === 'monge').doc));
  await page.evaluate(() => __app.commit((d) => { d.title = 'Bài tự ra – tiếp tuyến chung'; }));
  await page.evaluate(() => document.getElementById('btn-kho-buoi-tabs').click());
  await page.waitForSelector('.b-tab');
  await page.click('.modal .primary');
  await page.waitForSelector('.b-list .b-item');
  ok((await page.evaluate(() => document.querySelectorAll('.b-list .b-item').length)) === 3, 'buổi dạy gồm 3 tab đang mở (tab chưa có trong kho được lưu thành bài mới)');
  await page.fill('.b-ten', 'Buổi 5 – Đường tròn');
  await page.fill('.b-lop', '11 Toán');
  await page.click('.modal .primary');
  await page.waitForFunction(() => !document.querySelector('.modal-back') && !/Đang lưu/.test(document.getElementById('kho-status').textContent));
  const ix2 = JSON.parse(fake.readText('muc-luc.json'));
  const bm = Object.keys(ix2.buoi)[0];
  ok(bm && ix2.buoi[bm].bai.length === 3 && ix2.buoi[bm].lop === '11 Toán' && fake.files().includes(`buoi/${bm}.json`), `buổi dạy lưu vào buoi/${bm}.json`);
  await page.keyboard.press('Control+k');
  await page.click('.kw-tabs [data-v="buoi"]');
  await page.waitForSelector('.kb-row');
  await shot('v15-buoi');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('.kb-row [data-a="full"]')]);
  const tex = fs.readFileSync(await dl.path(), 'utf8');
  ok(dl.suggestedFilename().endsWith('.tex') && (tex.match(/\\subsection\*\{Bài \d/g) || []).length === 3 && tex.includes('11 Toán') && tex.includes('tikzpicture'), 'phiếu cho buổi: 3 bài, có hình TikZ, tên lớp');
  await page.keyboard.press('Escape');
  // mở buổi: các bài đã đang mở thì chuyển tới, không mở trùng
  await page.keyboard.press('Control+k');
  await page.click('.kw-tabs [data-v="buoi"]');
  await page.click('.kb-row [data-a="open"]');
  await page.waitForTimeout(400);
  ok((await page.evaluate(() => __app.tabs.length)) === 3, 'mở buổi: bài đang mở không mở trùng');
  // các phản hồi 404/409/401 có chủ đích (repo trống, token sai, mất mạng) trình duyệt cũng ghi vào console – không phải lỗi JS
  const js = errors.filter((x) => !/Failed to load resource/.test(x));
  ok(js.length === 0, 'không có lỗi JS: ' + js.join(' | '));
}
