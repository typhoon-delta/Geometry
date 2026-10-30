// Kiểm tra trình duyệt cho bản 1.3: tên ảnh qua phép biến hình (A → A′), nhiều tab hình, dán/chèn ảnh.
export async function run({ page, ok, shot, state, tool, clickAt }) {
  console.log('Bản 1.3: tên phẩy, nhiều tab, dán ảnh');
  await page.evaluate(() => { while (__app.tabs.length > 1) { __app.tabs.splice(1); } __app.showTab(0); __app.loadDoc({ format: 'hinh-hoc-dong', version: 1, steps: [] }); });
  // ---- tên ảnh = tên tạo ảnh + ' ----
  await tool('triangle');
  await clickAt(-2, 3); await clickAt(-4, -2); await clickAt(3, -2);
  await tool('reflect_point');
  await clickAt(-2, 3); await clickAt(3, -2);
  await clickAt(-4, -2); await clickAt(3, -2);
  let st = await state();
  ok(st.steps.filter((s) => s.type === 'reflect').map((s) => s.name).join() === "A',B'", "đối xứng tâm của A, B qua C có tên A′, B′");
  await tool('reflect_point');
  const Ap = await page.evaluate(() => { const v = __app.values.get(__app.doc.steps.find((s) => s.name === "A'").id); return [v.x, v.y]; });
  await clickAt(Ap[0], Ap[1]); await clickAt(-4, -2);
  st = await state();
  ok(st.steps[st.n - 1].name === "A''", 'ảnh của A′ có tên A″');

  // ---- giữ Shift: căn hướng (đường nằm ngang/thẳng đứng/bước 15°) ----
  await page.evaluate(() => __app.newTab());
  await tool('segment');
  await clickAt(-3, -1);
  await page.keyboard.down('Shift');
  await clickAt(2.5, -0.8);
  await page.keyboard.up('Shift');
  let pts = await page.evaluate(() => __app.doc.steps.filter((s) => s.type === 'free_point').map((s) => s.params));
  ok(pts.length === 2 && pts[0].y === pts[1].y, `Shift khi bấm điểm thứ hai: đoạn nằm ngang (y = ${pts.map((p) => p.y).join(', ')})`);
  await tool('move');
  const B = await page.evaluate(() => { const s = __app.doc.steps[1]; const r = __app.view.canvas.getBoundingClientRect(); const q = __app.toScreen(__app.values.get(s.id)); return { x: r.left + q.x, y: r.top + q.y }; });
  await page.keyboard.down('Shift');
  await page.mouse.move(B.x, B.y);
  await page.mouse.down();
  await page.mouse.move(B.x - 60, B.y - 190, { steps: 5 });
  await page.mouse.up();
  await page.keyboard.up('Shift');
  pts = await page.evaluate(() => __app.doc.steps.filter((s) => s.type === 'free_point').map((s) => s.params));
  const k = (Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x) * 12) / Math.PI;
  ok(Math.abs(k - Math.round(k)) < 1e-5 && JSON.stringify(pts[1]) !== JSON.stringify(pts[0]), `Shift khi kéo: đoạn bắt về bội số 15° (${(k * 15).toFixed(4)}°)`);
  await page.evaluate(() => { __app.closeTab(__app.tabIdx); }); // không chờ: hộp thoại xác nhận đang mở
  await page.click('.modal .primary');
  await page.waitForFunction(() => __app.tabs.length === 1);

  // ---- nhiều tab ----
  const n0 = st.n;
  await page.click('#tab-new');
  ok((await page.evaluate(() => [__app.tabs.length, __app.tabIdx, __app.doc.steps.length])).join() === '2,1,0', 'nút ＋ mở hình mới ở tab thứ hai');
  await tool('circle');
  await clickAt(0, 0); await clickAt(2, 0);
  await page.click('.dtab[data-tab="0"]');
  ok((await state()).n === n0, 'đổi về tab 1: đúng hình cũ');
  await page.keyboard.press('Control+z');
  ok((await state()).n === n0 - 1, 'hoàn tác riêng từng tab');
  await page.click('.dtab[data-tab="1"]');
  ok((await state()).n === 3, 'tab 2 vẫn giữ hình của nó');
  await page.dblclick('.dtab.active .dt-name');
  await page.fill('.dt-input', 'Đường tròn');
  await page.keyboard.press('Enter');
  ok((await page.evaluate(() => [__app.doc.title, document.querySelector('.dtab.active .dt-name').textContent])).join() === 'Đường tròn,Đường tròn', 'nháy đúp vào tab để đặt tên hình');
  // mở ví dụ khi tab đang có hình → mở tab mới
  const i = await page.evaluate(() => [...document.querySelectorAll('#topbar .menu')].indexOf(document.getElementById('example-menu').closest('.menu')));
  await page.click(`#topbar .menu:nth-child(${i + 1}) .menu-btn`);
  await page.click('[data-lib="brocard"]');
  ok((await page.evaluate(() => [__app.tabs.length, __app.doc.title])).join() === '3,Tứ giác nội tiếp – định lý Brocard', 'mở ví dụ ở tab mới');
  await shot('v13-tab');

  // ---- ảnh nền để đồ hình (Chèn › Ảnh nền…; bản 1.4: Ctrl+V tạo khung Đề bài – xem smoke5) ----
  await page.click('#tab-new');
  const png = await page.evaluate(() => {
    const cv = document.createElement('canvas');
    cv.width = 300; cv.height = 120;
    const c = cv.getContext('2d');
    c.fillStyle = '#fde68a'; c.fillRect(0, 0, 300, 120);
    c.fillStyle = '#000'; c.font = '28px serif'; c.fillText('Hình để đồ lại', 14, 70);
    return cv.toDataURL('image/png').split(',')[1];
  });
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.evaluate(() => document.getElementById('btn-image-bg').click())]);
  await chooser.setFiles({ name: 'hinh.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
  await page.waitForFunction(() => (__app.doc.images || []).length === 1);
  const im = await page.evaluate(() => ({ ...__app.doc.images[0], sel: __app.imageSel, data: __app.withImageData(__app.doc).imageData }));
  ok(im.sel === im.id && im.data && im.data[im.id].startsWith('data:image/png'), 'chèn ảnh nền vào hình, ảnh được chọn');
  const undoLen = await page.evaluate(() => __app.undoStack[__app.undoStack.length - 1].length);
  ok(undoLen < 2000, `lịch sử hoàn tác không chứa dữ liệu ảnh (${undoLen} ký tự)`);
  // kéo ảnh
  const ctr = await page.evaluate(() => { const im = __app.doc.images[0]; const r = __app.view.canvas.getBoundingClientRect(); const p = __app.toScreen({ x: im.x + im.w / 2, y: im.y - im.h / 2 }); return { x: r.left + p.x, y: r.top + p.y, x0: im.x }; });
  await page.mouse.move(ctr.x, ctr.y);
  await page.mouse.down();
  await page.mouse.move(ctr.x + 60, ctr.y + 20, { steps: 4 });
  await page.mouse.up();
  const x1 = await page.evaluate(() => __app.doc.images[0].x);
  ok(x1 > ctr.x0 + 0.5, 'kéo ảnh để dời');
  // vẽ lên trên ảnh
  await tool('point');
  await clickAt(ctr.x0 + 1, (await page.evaluate(() => __app.doc.images[0].y)) - 0.5);
  ok((await state()).n === 1, 'bấm lên ảnh bằng công cụ Điểm vẫn tạo điểm (ảnh nằm dưới hình)');
  ok((await page.evaluate(() => __app.imageSel)) === null, 'tạo điểm thì ảnh không còn được chọn');
  await tool('move');
  await shot('v13-anh');
  // lưu tệp có ảnh, mở lại
  const doc = await page.evaluate(() => GeoCore.codec.compactDoc(__app.withImageData(__app.doc)));
  ok(doc.images.length === 1 && Object.keys(doc.imageData).length === 1, 'tệp .json lưu cả vị trí và dữ liệu ảnh');
  await page.evaluate((d) => __app.newTab(d), doc);
  ok(await page.evaluate(() => __app.doc.images.length === 1 && __app.images.get(__app.doc.images[0].id).src.startsWith('data:')), 'mở lại tệp có ảnh');
  // khoá làm nền: bấm lên ảnh thì dời hình, không chọn ảnh
  await page.evaluate(() => __app.setImageProp(__app.doc.images[0].id, { locked: true }));
  ok((await page.evaluate(() => { const im = __app.doc.images[0]; const p = __app.toScreen({ x: im.x + 0.2, y: im.y - 0.2 }); return __app.imageAt(p.x, p.y); })) === null, 'ảnh khoá làm nền không chọn được');
  // bản nháp giữ mọi tab
  await page.waitForTimeout(500);
  const draft = await page.evaluate(() => JSON.parse(localStorage.getItem('hinh-hoc-dong:nhap-tab') || 'null'));
  ok(draft && draft.tabs.length === (await page.evaluate(() => __app.tabs.length)), `bản nháp lưu ${draft && draft.tabs.length} tab`);
  await page.reload();
  await page.waitForFunction(() => window.__app);
  await page.waitForTimeout(300);
  ok((await page.evaluate(() => [__app.tabs.length, (__app.doc.images || []).length])).join() === `${draft.tabs.length},1`, 'tải lại trang khôi phục mọi tab và ảnh');
}
