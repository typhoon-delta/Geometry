// Kiểm thử trình duyệt cho các mốc 2–5 (được gọi từ smoke.mjs).

export async function run({ page, ok, shot, state, tool, clickAt }) {
  // ---------- Mốc 2: tua bước, đánh dấu, trình chiếu ----------
  console.log('Mốc 2: đánh dấu + tua bước + trình chiếu');
  await page.selectOption('#sel-example', 'euler_line');
  let st = await state();
  ok(st.steps.some((s) => s.name === 'H'), 'mở ví dụ đường thẳng Euler');
  const P = await page.evaluate(() => Object.fromEntries(__app.doc.steps.filter((s) => s.type === 'free_point').map((s) => [s.name, s.params])));
  const at = (n) => clickAt(P[n].x, P[n].y);
  // đánh dấu hai góc bằng nhau? (dùng góc B và góc C với cùng kiểu) + đoạn bằng nhau
  await tool('angle_mark');
  await page.click('#tool-options .sw[data-c="#15803d"]');
  await page.click('#tool-options [data-n="2"]');
  await at('A'); await at('B'); await at('C');
  await at('B'); await at('C'); await at('A');
  await tool('segment_mark');
  await page.click('#tool-options [data-n="2"]');
  await at('A'); await at('B');
  await tool('polygon');
  await at('A'); await at('B'); await at('C'); await at('A');
  st = await state();
  const marks = st.steps.filter((s) => ['angle_mark', 'segment_mark', 'polygon'].includes(s.type));
  ok(marks.length === 4, `tạo 2 dấu góc, 1 dấu đoạn, 1 miền tô (${marks.length})`);
  ok(marks[0].style.arcs === 2 && marks[0].style.color === '#15803d', 'dấu góc dùng kiểu đã chọn (2 cung, xanh lá)');
  // tô nền đường tròn ngoại tiếp
  await tool('move');
  const circId = st.steps.find((s) => s.type === 'circumcircle').id;
  await page.evaluate((id) => __app.select(id), circId);
  await page.locator('#p-fill').evaluate((el) => { el.value = '0.12'; el.dispatchEvent(new Event('change')); });
  ok((await page.evaluate((id) => __app.doc.steps.find((s) => s.id === id).style.fill, circId)) === 0.12, 'tô nền nhạt đường tròn');
  await page.evaluate(() => __app.selection.clear());
  await page.evaluate(() => __app.refresh());
  await shot('m2-danh-dau');

  // tua bước
  await page.click('#btn-present');
  const nFrames = await page.evaluate(() => GeoCore.frames(__app.doc).length);
  let visible = await page.evaluate(() => __app.renderer.els.size);
  ok(visible === 1, `khung 1 chỉ hiện 1 đối tượng (${visible})`);
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  visible = await page.evaluate(() => __app.renderer.els.size);
  ok(visible === 3, `sau 2 lần "Sau" hiện 3 đối tượng (${visible})`);
  await page.click('#btn-next');
  await page.click('#btn-next');
  await shot('m2-trinh-bay');
  await page.keyboard.press('End');
  ok((await page.locator('#frame-label').textContent()).includes(`${nFrames} / ${nFrames}`), 'End tới khung cuối');
  await page.keyboard.press('ArrowLeft');
  ok((await page.evaluate(() => __app.frameIdx)) === nFrames - 2, '← lùi một khung');

  // trình chiếu
  await page.click('#btn-projector').catch(() => page.evaluate(() => __app.setProjector(true)));
  await page.waitForTimeout(250);
  await page.keyboard.press('End');
  ok(await page.evaluate(() => document.body.classList.contains('projector')), 'bật chế độ trình chiếu');
  await shot('m2-trinh-chieu');
  await page.evaluate(() => __app.setProjector(false));
  await page.evaluate(() => __app.setMode('edit'));
  await page.waitForTimeout(150);

  // gộp khung
  const fr0 = await page.evaluate(() => GeoCore.frames(__app.doc).length);
  await page.click('.step:nth-child(3) .join');
  const fr1 = await page.evaluate(() => GeoCore.frames(__app.doc).length);
  ok(fr1 === fr0 - 1, `gộp bước 3 vào khung trước (${fr0} → ${fr1} khung)`);
  // ẩn đối tượng
  await page.click('.step:nth-child(4) .eye');
  ok(await page.evaluate(() => !!__app.doc.steps[3].hidden), 'ẩn đối tượng bằng nút mắt');
  await page.keyboard.press('Control+z');
  await page.keyboard.press('Control+z');

  // ---------- Mốc 3: chia sẻ + lưu ----------
  console.log('Mốc 3: chia sẻ link + lưu/mở JSON + bản nháp');
  const ref = await page.evaluate(() => JSON.stringify(__app.doc.steps));
  await page.click('#btn-share');
  await page.waitForSelector('.modal textarea');
  const url = await page.locator('.modal textarea').inputValue();
  ok(/#h=z[A-Za-z0-9_-]+$/.test(url), `tạo link nén (${url.length} ký tự)`);
  await shot('m3-chia-se');
  await page.click('.modal .primary');
  const p2 = await page.context().newPage();
  await p2.goto(url);
  await p2.waitForFunction(() => window.__app && __app.doc.steps.length > 0);
  ok((await p2.evaluate(() => JSON.stringify(__app.doc.steps))) === ref, 'mở link ở tab mới cho đúng hình');
  await p2.close();

  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#btn-save')]);
  const path = await dl.path();
  const { readFileSync } = await import('node:fs');
  const saved = JSON.parse(readFileSync(path, 'utf8'));
  ok(saved.format === 'hinh-hoc-dong' && saved.steps.length === JSON.parse(ref).length, `lưu tệp JSON "${dl.suggestedFilename()}"`);

  await page.click('#btn-new');
  await page.click('.modal .primary');
  ok((await state()).n === 0, 'hình mới rỗng');
  const [fc] = await Promise.all([page.waitForEvent('filechooser'), page.click('#btn-open')]);
  await fc.setFiles(path);
  await page.waitForFunction(() => __app.doc.steps.length > 0);
  ok((await page.evaluate(() => JSON.stringify(__app.doc.steps))) === ref, 'mở lại tệp JSON đúng hình');

  // bản nháp: tải lại trang (không có #h) vẫn còn hình
  await page.goto(url.split('#')[0]);
  await page.waitForFunction(() => window.__app);
  await page.waitForTimeout(300);
  ok((await page.evaluate(() => JSON.stringify(__app.doc.steps))) === ref, 'tải lại trang khôi phục bản nháp');

  // ---------- Mốc 4: khám phá ----------
  console.log('Mốc 4: khám phá bằng số');
  await page.selectOption('#sel-example', 'nine_point');
  await page.click('#btn-explore');
  await page.waitForSelector('.rel');
  const rels = await page.locator('.rel .rel-text').allTextContents();
  ok(rels.length > 0 && /D, E, F, X, Y, Z nằm trên/.test(rels[0]), `quan hệ đầu tiên là 9 điểm Euler: "${rels[0]}"`);
  await page.click('.rel[data-i="0"]');
  const hl = await page.evaluate(() => __app.highlight.size);
  ok(hl === 7, `bấm kết quả tô sáng đối tượng liên quan (${hl})`);
  await shot('m4-kham-pha-9-diem');
  const iCyc = rels.findIndex((t) => /đồng viên/.test(t));
  await page.click(`.rel[data-i="${iCyc}"]`);
  ok(await page.evaluate(() => __app.renderer.extra.some((e) => e.elType === 'circumcircle')), 'quan hệ đồng viên vẽ đường tròn phụ đứt nét');
  await shot('m4-kham-pha-dong-vien');
  await page.selectOption('#sel-example', 'simson');
  ok(await page.locator('.stale').count() === 1, 'đổi hình → báo kết quả cũ');
  await page.click('#btn-run-explore');
  await page.waitForFunction(() => !document.querySelector('.stale') && document.querySelector('.rel'));
  await page.click('.rel[data-i="0"]');
  // kéo P trên đường tròn: đường Simson vẫn thẳng hàng (tô sáng đi theo)
  await page.evaluate(() => { const s = __app.doc.steps.find((x) => x.name === 'P'); s.params.t = 0.4; __app.quickUpdate(); __app.refresh(); });
  await shot('m4-simson');

  if (globalThis.__smokeMore) await globalThis.__smokeMore({ page, ok, shot, state, tool, clickAt });
}
