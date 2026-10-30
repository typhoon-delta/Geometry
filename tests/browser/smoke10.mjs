// Kiểm tra trình duyệt cho bản 1.8: lệnh tiếng Việt trong bảng lệnh (Space), điểm thoả điều kiện, kiểm tra nhận định,
// đưa về trường hợp đặc biệt, xuất Asymptote.
export async function run({ page, ok, shot }) {
  console.log('Bản 1.8: lệnh tiếng Việt, điểm thoả điều kiện, kiểm tra nhận định, trường hợp đặc biệt, Asymptote');
  const S = (id, type, args, params, name) => ({ id, type, args, ...(params ? { params } : {}), ...(name ? { name } : {}) });
  const tri = [
    S('A', 'free_point', [], { x: 0.3, y: 4 }, 'A'), S('B', 'free_point', [], { x: -3, y: 0 }, 'B'), S('C', 'free_point', [], { x: 4, y: 0 }, 'C'),
    S('ab', 'segment', ['A', 'B'], null, 'd1'), S('bc', 'segment', ['B', 'C'], null, 'd2'), S('ca', 'segment', ['C', 'A'], null, 'd3'),
  ];
  const load = (steps) => page.evaluate((st) => {
    while (__app.tabs.length > 1) __app.tabs.splice(1);
    __app.showTab(0);
    __app.loadDoc({ format: 'hinh-hoc-dong', version: 1, steps: st });
    __app.view.setBoundingBox([-6, 6, 7, -3]);
    __app.setTool('move');
  }, steps);
  const scr = (P) => page.evaluate((p) => { const r = __app.view.canvas.getBoundingClientRect(); const q = __app.toScreen(p); return { x: r.left + q.x, y: r.top + q.y }; }, P);
  const byName = (n) => page.evaluate((nn) => { const s = __app.doc.steps.find((x) => x.name === nn); return s ? { ...s, v: __app.values.get(s.id) } : null; }, n);
  const ang = (P, Q, R) => { const u = { x: P.x - Q.x, y: P.y - Q.y }, v = { x: R.x - Q.x, y: R.y - Q.y }; return Math.abs(Math.atan2(u.x * v.y - u.y * v.x, u.x * v.x + u.y * v.y)) * 180 / Math.PI; };
  const palette = async (text) => {
    await page.mouse.move(5, 300);
    await page.keyboard.press('Space');
    await page.waitForSelector('.palette .pal-q');
    await page.fill('.palette .pal-q', text);
  };

  // ---- lệnh dựng hình ----
  await load(tri);
  await palette('M = trung điểm BC');
  ok(/Dựng: M – Trung điểm/.test(await page.textContent('.palette .pal-list .pal-row.on')), 'bảng lệnh: hiểu "M = trung điểm BC", dòng đầu là lệnh dựng');
  await page.keyboard.press('Enter');
  let M = await byName('M');
  ok(M && M.type === 'midpoint' && Math.abs(M.v.x - 0.5) < 1e-9 && Math.abs(M.v.y) < 1e-9, 'Enter: dựng trung điểm M của BC');
  ok(await page.evaluate(() => [...__app.selection].length === 1 && __app.doc.steps.find((s) => s.name === 'M').id === [...__app.selection][0]), 'điểm vừa dựng được chọn sẵn');
  await palette('S = (ABM) cắt d3');
  await page.keyboard.press('Enter');
  const Sx = await byName('S');
  ok(Sx && Sx.type === 'intersection_other' && (await page.evaluate(() => __app.doc.steps.filter((s) => s.type === 'circumcircle').length)) === 1, '"S = (ABM) cắt d3": tự dựng đường tròn (ABM), lấy giao điểm khác A');
  await palette('T = (ABM) cắt (ABC)');
  ok(/đều đã có/.test(await page.textContent('.palette .pal-list')), 'hai giao điểm đều đã có (A, B): báo, không dựng trùng');
  await page.keyboard.press('Escape');
  await palette('K = AM cắt d3');
  ok(/chính là điểm A/.test(await page.textContent('.palette .pal-list')), 'AM cắt CA là A đã có: báo, không dựng trùng');
  await page.fill('.palette .pal-q', 'K = AM cắt BS');
  ok(/Dựng: K/.test(await page.textContent('.palette .pal-list')), 'hiểu đường qua hai điểm chưa vẽ (AM, BS)');
  await page.keyboard.press('Enter');
  const K = await byName('K');
  ok(K && K.v && (await page.evaluate(() => __app.doc.steps.filter((s) => s.type === 'line' && s.aux).length)) === 2, 'AM, BS chưa có: tự dựng thành hai đường phụ, lấy giao điểm K');
  await palette('trung điểm XY');
  ok(/Chưa có điểm X/.test(await page.textContent('.palette .pal-list')), 'tên chưa có: báo lỗi dễ hiểu ngay khi gõ');
  await page.fill('.palette .pal-q', 'truc tam');
  ok(/H = trực tâm ABC/.test(await page.textContent('.palette .pal-list')), 'gõ "truc tam": gợi ý mẫu lệnh');
  await page.click('.palette .pal-ex');
  ok((await page.inputValue('.palette .pal-q')) === 'H = trực tâm ABC', 'bấm mẫu lệnh: chép vào ô để sửa/dùng');
  await page.keyboard.press('Enter');
  ok((await byName('H'))?.type === 'orthocenter', 'Enter: dựng trực tâm H');
  const n = await page.evaluate(() => __app.doc.steps.length);
  await page.keyboard.press('Control+z');
  ok((await page.evaluate(() => __app.doc.steps.length)) < n && !(await byName('H')), 'Ctrl+Z: bỏ lệnh vừa dựng');

  // ---- điểm thoả điều kiện bằng lệnh ----
  await palette('P thoả góc PAB = góc PBC, góc PBC = góc PCA');
  await page.keyboard.press('Enter');
  let P = await byName('P');
  const v = async (nm) => (await byName(nm)).v;
  let [a, b, c] = [await v('A'), await v('B'), await v('C')];
  ok(P && P.type === 'solve_point' && Math.abs(ang(P.v, a, b) - ang(P.v, b, c)) < 1e-6 && Math.abs(ang(P.v, b, c) - ang(P.v, c, a)) < 1e-6, 'điểm Brocard: ∠PAB = ∠PBC = ∠PCA');
  // kéo đỉnh C: P vẫn thoả điều kiện
  const qa = await scr(c), qa2 = await scr({ x: 4.6, y: -0.7 });
  await page.mouse.move(qa.x, qa.y);
  await page.mouse.down();
  await page.mouse.move(qa2.x, qa2.y, { steps: 8 });
  await page.mouse.up();
  P = await byName('P');
  [a, b, c] = [await v('A'), await v('B'), await v('C')];
  ok(P.v && Math.abs(ang(P.v, a, b) - ang(P.v, b, c)) < 1e-6 && Math.abs(ang(P.v, b, c) - ang(P.v, c, a)) < 1e-6 && Math.hypot(c.x - 4.6, c.y + 0.7) < 0.05, 'kéo C: P đi theo, vẫn là điểm Brocard');
  await shot('v18-brocard');

  // ---- công cụ Điểm thoả điều kiện: bấm gần chỗ, gõ điều kiện ----
  await load(tri);
  await page.evaluate(() => __app.setTool('solve_point'));
  const near = await scr({ x: 0.5, y: -2 });
  await page.mouse.click(near.x, near.y);
  await page.waitForSelector('.modal-input');
  ok(/thoả $/.test(await page.inputValue('.modal-input')), 'công cụ: hỏi điều kiện, đặt sẵn "… thoả "');
  await page.keyboard.type('góc DBC = 999');
  await page.keyboard.press('Enter');
  await page.waitForSelector('.modal-err');
  ok(/Không/.test(await page.textContent('.modal-err')), 'điều kiện không thoả được: báo lỗi, hỏi lại');
  await page.fill('.modal-input', 'D thoả DB = DC, góc BDC = 120');
  await page.keyboard.press('Enter');
  const D = await byName('D');
  ok(D && D.v.y < 0 && Math.abs(Math.hypot(D.v.x + 3, D.v.y) - Math.hypot(D.v.x - 4, D.v.y)) < 1e-7 && Math.abs(ang(await v('B'), D.v, await v('C')) - 120) < 1e-6, 'D: DB = DC, ∠BDC = 120°, ở phía đã bấm (dưới BC)');
  // kéo D sang phía bên kia BC: chọn nghiệm còn lại
  const qd = await scr(D.v), qd2 = await scr({ x: 0.5, y: 2.2 });
  await page.mouse.move(qd.x, qd.y);
  await page.mouse.down();
  await page.mouse.move(qd2.x, qd2.y, { steps: 12 });
  await page.mouse.up();
  const D2 = await byName('D');
  ok(D2.v.y > 0 && Math.abs(ang(await v('B'), D2.v, await v('C')) - 120) < 1e-6, 'kéo D sang phía kia: nghiệm còn lại (vẫn thoả điều kiện)');

  // ---- kiểm tra nhận định (thẻ thuộc tính) ----
  await load([...tri, S('O', 'circumcenter', ['A', 'B', 'C'], null, 'O'), S('H', 'orthocenter', ['A', 'B', 'C'], null, 'H'), S('G', 'centroid', ['A', 'B', 'C'], null, 'G'), S('I', 'incenter', ['A', 'B', 'C'], null, 'I')]);
  await page.evaluate(() => { __app.selection = new Set(['O', 'H', 'G']); __app.refresh(); });
  await page.click('#props [data-claim="0"]');
  await page.waitForSelector('.check-win');
  ok(/Luôn đúng/.test(await page.textContent('.check-win .check-verdict')) && /đều/.test(await page.textContent('.check-win')), 'O, H, G thẳng hàng: luôn đúng; báo suy biến khi tam giác đều');
  await page.click('.check-win .primary');
  await page.evaluate(() => { __app.selection = new Set(['O', 'I', 'H']); __app.refresh(); });
  await page.click('#props [data-claim="0"]');
  await page.waitForSelector('.check-win');
  ok(/Sai/.test(await page.textContent('.check-win .check-verdict')) && /cân tại A/.test(await page.textContent('.check-win')), 'O, I, H thẳng hàng: sai; đúng khi tam giác cân');
  await page.click('.check-win [data-sp]');
  [a, b, c] = [await v('A'), await v('B'), await v('C')];
  ok(Math.abs(Math.hypot(a.x - b.x, a.y - b.y) - Math.hypot(a.x - c.x, a.y - c.y)) < 1e-7, 'bấm "xem": hình đưa về tam giác cân tại A');
  await shot('v18-check');
  await page.keyboard.press('Control+z');
  // lệnh kiểm tra
  await palette('kiểm tra O, H, G thẳng hàng');
  ok(/Kiểm tra/.test(await page.textContent('.palette .pal-row.on')), 'bảng lệnh hiểu "kiểm tra …"');
  await page.keyboard.press('Enter');
  await page.waitForSelector('.check-win');
  ok(/Luôn đúng/.test(await page.textContent('.check-win .check-verdict')), 'lệnh kiểm tra mở hộp kết quả');
  await page.click('.check-win .primary');

  // ---- đưa về trường hợp đặc biệt ----
  await load([...tri, S('D', 'point_on', ['bc'], { t: 0.3 }, 'D')]);
  await page.evaluate(() => { __app.selection = new Set(['A']); __app.refresh(); });
  const labels = await page.$$eval('#props [data-special]', (bs) => bs.map((b) => b.textContent));
  ok(labels.includes('cân tại A') && labels.includes('vuông tại A') && labels.includes('đều'), 'chọn A: "Đưa về" cân tại A, vuông tại A, đều');
  await page.click('#props [data-special]:text("vuông tại A")');
  [a, b, c] = [await v('A'), await v('B'), await v('C')];
  ok(Math.abs((b.x - a.x) * (c.x - a.x) + (b.y - a.y) * (c.y - a.y)) < 1e-7, 'bấm "vuông tại A": góc A vuông');
  await page.evaluate(() => { __app.selection = new Set(['D']); __app.refresh(); });
  await page.click('#props [data-special]:text("chân đường cao từ A")');
  const Dv = await v('D');
  a = await v('A');
  ok(Math.abs(Dv.x - a.x) < 1e-7, 'D về chân đường cao từ A');

  // ---- xuất Asymptote ----
  await page.evaluate(() => document.getElementById('btn-asy').click());
  await page.waitForSelector('.modal textarea, .modal pre');
  const code = await page.evaluate(() => (document.querySelector('.modal textarea') || document.querySelector('.modal pre')).textContent || document.querySelector('.modal textarea').value);
  ok(/unitsize\(/.test(code) && /pair A = /.test(code) && /draw\(A--B\)/.test(code), 'Tệp › Xuất Asymptote…: mã Asymptote');
  await page.keyboard.press('Escape');
}
