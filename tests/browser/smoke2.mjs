// Kiểm thử trình duyệt cho các mốc 2–5 (được gọi từ smoke.mjs).

export async function run({ page, ok, shot, state, tool, clickAt, menu, example }) {
  // ---------- Mốc 2: tua bước, đánh dấu, trình chiếu ----------
  console.log('Mốc 2: đánh dấu + tua bước + trình chiếu');
  await example('euler_line');
  let st = await state();
  ok(st.steps.some((s) => s.name === 'H'), 'mở ví dụ đường thẳng Euler');
  const P = await page.evaluate(() => Object.fromEntries(__app.doc.steps.filter((s) => s.type === 'free_point').map((s) => [s.name, s.params])));
  const at = (n) => clickAt(P[n].x, P[n].y);
  // đánh dấu hai góc bằng nhau? (dùng góc B và góc C với cùng kiểu) + đoạn bằng nhau
  await tool('angle_mark');
  await page.click('#tool-options .sw[data-c="#4e8f5a"]');
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
  ok(marks[0].style.arcs === 2 && marks[0].style.color === '#4e8f5a', 'dấu góc dùng kiểu đã chọn (2 cung, xanh lá)');
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
  let visible = await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(__app.renderer.drawnIds.size)))));
  ok(visible === 1, `khung 1 chỉ hiện 1 đối tượng (${visible})`);
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  visible = await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(__app.renderer.drawnIds.size)))));
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
  await page.click('#btn-panel');
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
  await menu('btn-share');
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

  const [dl] = await Promise.all([page.waitForEvent('download'), menu('btn-save')]);
  const path = await dl.path();
  const { readFileSync } = await import('node:fs');
  const saved = JSON.parse(readFileSync(path, 'utf8'));
  ok(saved.format === 'hinh-hoc-dong' && saved.steps.length === JSON.parse(ref).length, `lưu tệp JSON "${dl.suggestedFilename()}"`);

  await menu('btn-new');
  await page.click('.modal .primary');
  ok((await state()).n === 0, 'hình mới rỗng');
  const [fc] = await Promise.all([page.waitForEvent('filechooser'), menu('btn-open')]);
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
  await example('nine_point');
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
  ok(await page.evaluate(() => __app.renderer.extra.some((e) => e.type === 'circle3')), 'quan hệ đồng viên vẽ đường tròn phụ đứt nét');
  await shot('m4-kham-pha-dong-vien');
  await page.evaluate(() => __app.commit((d) => { d.steps[0].params.x += 0.1; }));
  ok(await page.locator('.stale').count() === 1, 'sửa hình → báo kết quả cũ');
  await example('simson');
  ok(await page.locator('.rel').count() === 0, 'mở hình khác → xoá kết quả cũ');
  await page.click('#btn-run-explore');
  await page.waitForFunction(() => !document.querySelector('.stale') && document.querySelector('.rel'));
  await page.click('.rel[data-i="0"]');
  // kéo P trên đường tròn: đường Simson vẫn thẳng hàng (tô sáng đi theo)
  await page.evaluate(() => { const s = __app.doc.steps.find((x) => x.name === 'P'); s.params.t = 0.4; __app.quickUpdate(); __app.refresh(); });
  await shot('m4-simson');

  // ---------- Mốc 5: TikZ ----------
  console.log('Mốc 5: xuất TikZ');
  await menu('btn-tikz');
  await page.waitForSelector('.modal textarea');
  const tex = await page.locator('.modal textarea').inputValue();
  ok(/\\begin\{tikzpicture\}/.test(tex) && /\\coordinate \(P\)/.test(tex) && !/NaN|undefined/.test(tex), 'xuất TikZ từ giao diện');
  await shot('m5-tikz');
  await page.click('.modal .primary');

  // ---------- Bổ sung: điểm trên đường tròn, vuông góc, đối xứng ----------
  console.log('Bổ sung: điểm trên đối tượng, vuông góc (chọn tuỳ thứ tự), đối xứng');
  await page.evaluate(() => __app.loadDoc(GeoCore.emptyDoc()));
  await tool('circle');
  await clickAt(0, 0); await clickAt(3, 0);
  await tool('point');
  await clickAt(0, 3.0);
  let s3 = await state();
  const pon = s3.steps[s3.n - 1];
  ok(pon.type === 'point_on', 'bấm lên đường tròn bằng công cụ Điểm tạo điểm trên đường tròn');
  await tool('move');
  const pp = await page.evaluate((id) => { const v = __app.values.get(id); return __app.toScreen(v); }, pon.id);
  const bb = await page.locator('#board').boundingBox();
  await page.mouse.move(bb.x + pp.x, bb.y + pp.y);
  await page.mouse.down();
  await page.mouse.move(bb.x + pp.x + 120, bb.y + pp.y + 200, { steps: 6 });
  await page.mouse.up();
  const r = await page.evaluate((id) => { const v = __app.values.get(id); return Math.hypot(v.x, v.y); }, pon.id);
  ok(Math.abs(r - 3) < 1e-9, `kéo điểm trên đường tròn vẫn nằm trên đường tròn (r = ${r.toFixed(6)})`);
  await tool('line');
  await clickAt(-4, -4); await clickAt(4, -3);
  await tool('perpendicular');
  await clickAt(0, -3.5); // bấm đường thẳng trước
  await clickAt(0, 0); // rồi tâm
  s3 = await state();
  ok(s3.steps[s3.n - 1].type === 'perpendicular' && s3.steps[s3.n - 1].args[0] === s3.steps[0].id, 'đường vuông góc: chọn đường trước, điểm sau vẫn đúng thứ tự đối số');
  await tool('reflect');
  await clickAt(1.5, 1.5); // một điểm tự do mới
  await clickAt(0, -3.5); // trục là đường thẳng
  s3 = await state();
  ok(s3.steps[s3.n - 1].type === 'reflect', 'đối xứng qua đường thẳng');
  await shot('bo-sung');

  // ---------- Bản 1.1: menu Công cụ ----------
  console.log('Bản 1.1: thư viện công cụ');
  await page.evaluate(() => __app.loadDoc(GeoCore.emptyDoc()));
  await page.click('.tb-btn[data-group="library"]');
  await page.locator('#tools .tb-group[data-group="library"] .sub-title').nth(5).hover();
  await shot('p3-menu-cong-cu');
  await tool('model_excentral');
  await clickAt(0.5, 2.2); await clickAt(-1.2, -0.6); await clickAt(2.2, -0.6);
  let s4 = await state();
  const centers = s4.steps.filter((x) => x.type === 'center').map((x) => x.name);
  ok(['O', 'I', 'I_A', 'I_B', 'I_C'].every((n) => centers.includes(n)), `mô hình tâm nội tiếp – bàng tiếp: có tâm ${centers.join(', ')}`);
  await page.evaluate(() => __app.zoomFit());
  await tool('move');
  await shot('p3-mo-hinh-bang-tiep');
  // công cụ có tham số: quay 60°
  await tool('rotate');
  await page.fill('#tool-options [data-opt="angle"]', '60');
  await page.dispatchEvent('#tool-options [data-opt="angle"]', 'change');
  const pa = await page.evaluate(() => { const v = __app.values.get(__app.doc.steps.find((x) => x.name === 'B').id); return v; });
  const pc = await page.evaluate(() => { const v = __app.values.get(__app.doc.steps.find((x) => x.name === 'A').id); return v; });
  await clickAt(pa.x, pa.y); await clickAt(pc.x, pc.y);
  s4 = await state();
  const rot = s4.steps[s4.n - 1];
  ok(rot.type === 'rotate' && rot.params.angle === 60, 'công cụ Quay dùng góc 60° đặt ở thẻ tuỳ chọn');

  // ---------- Bản 1.1: tự tạo công cụ ----------
  console.log('Bản 1.1: tự tạo công cụ');
  await example('euler_line');
  await tool('move');
  await page.evaluate(() => __app.select(__app.doc.steps.find((x) => x.name === 'H').id));
  await page.click('.tb-btn[data-group="library"]');
  await page.locator('#tools .tb-group[data-group="library"] .sub-title').nth(6).click();
  await shot('p3-cong-cu-cua-toi');
  await page.click('[data-action="create"]');
  await page.waitForSelector('.modal input');
  await page.fill('.modal input', 'Trực tâm của tôi');
  await page.click('.modal .primary');
  const uid = await page.evaluate(() => __app.userTools[0] && __app.userTools[0].id);
  ok(!!uid && (await page.locator(`#tools .tool[data-tool="${uid}"]`).count()) === 1, 'công cụ tự tạo xuất hiện trong menu "7. Công cụ của tôi"');
  await page.evaluate(() => __app.loadDoc(GeoCore.emptyDoc()));
  await tool(uid);
  await clickAt(0, 3); await clickAt(-3, -1); await clickAt(4, -1);
  const okH = await page.evaluate(() => {
    const pts = __app.doc.steps.filter((x) => x.type === 'free_point').map((x) => __app.values.get(x.id));
    const H = __app.values.get(__app.doc.steps.find((x) => x.type === 'orthocenter').id);
    const h = GeoCore.geom.orthocenter(...pts);
    return Math.hypot(H.x - h.x, H.y - h.y) < 1e-9;
  });
  ok(okH, 'dùng công cụ tự tạo trên tam giác mới cho đúng trực tâm');
  const savedTools = await page.evaluate(() => localStorage.getItem('hinh-hoc-dong:tools'));
  ok(savedTools && savedTools.includes('Trực tâm của tôi'), 'công cụ tự tạo được lưu trong trình duyệt');

  if (globalThis.__smokeMore) await globalThis.__smokeMore({ page, ok, shot, state, tool, clickAt });
}
