// Kiểm tra trình duyệt cho bản 1.6: phím tắt Ctrl cho công cụ, chọn trước – dựng sau, Alt + bấm để ẩn, bảng lệnh (Space),
// bảng phím tắt sửa được (Ctrl+/), \widehat / \overrightarrow hiển thị đúng.
export async function run({ page, ok, shot, errors }) {
  console.log('Bản 1.6: phím tắt, chọn trước – dựng sau, bảng lệnh');
  await page.evaluate(() => {
    while (__app.tabs.length > 1) __app.tabs.splice(1);
    __app.showTab(0);
    __app.loadDoc(GeoCore.THU_VIEN.find((x) => x.id === 'imo2008-1').doc);
    __app.zoomFit();
    __app.setTool('move');
  });
  const S = (name) => page.evaluate((n) => __app.doc.steps.find((s) => s.name === n)?.id, name);
  const sel = (...names) => page.evaluate((ns) => { const ids = ns.map((n) => __app.doc.steps.find((s) => s.name === n).id); __app.selection = new Set(ids); __app.refresh(); }, names);
  const count = () => page.evaluate(() => __app.doc.steps.length);
  await page.mouse.click(1300, 800);
  await page.keyboard.press('Escape');

  // ---- phím tắt gọi công cụ, hiện trên thanh công cụ ----
  await page.keyboard.press('Control+g');
  ok((await page.evaluate(() => __app.toolId)) === 'intersect', 'Ctrl+G: công cụ Giao điểm');
  ok((await page.evaluate(() => document.querySelector('#tools .tool[data-tool="intersect"] kbd')?.textContent)) === 'Ctrl+G', 'phím tắt hiện cạnh tên công cụ trên thanh công cụ');
  await page.keyboard.press('Escape');

  // ---- chọn trước, dựng sau ----
  let n = await count();
  await sel('H', 'd2');
  await page.keyboard.press('Control+u');
  const perp = await page.evaluate(() => __app.doc.steps[__app.doc.steps.length - 1]);
  const Hid = await S('H');
  ok((await count()) === n + 1 && perp.type === 'perpendicular' && perp.args.includes(Hid), 'chọn H và BC rồi Ctrl+U: dựng ngay đường vuông góc');
  await page.keyboard.press('Escape');
  n = await count();
  await page.evaluate((id) => { __app.selection = new Set([id, __app.doc.steps.find((s) => s.name === 'd2').id]); __app.refresh(); }, perp.id);
  await page.keyboard.press('Control+g');
  ok((await count()) === n + 1 && (await page.evaluate(() => __app.doc.steps[__app.doc.steps.length - 1].type)) === 'intersection', 'chọn đường vuông góc và BC rồi Ctrl+G: dựng ngay giao điểm (chân đường cao)');
  await page.keyboard.press('Escape');
  await sel('A', 'd2');
  await page.keyboard.press('Control+j');
  ok((await page.evaluate(() => __app.doc.steps[__app.doc.steps.length - 1].type)) === 'projection', 'chọn A và BC rồi Ctrl+J: chân đường vuông góc');
  await page.keyboard.press('Escape');
  await sel('A', 'd2');
  await page.keyboard.press('Control+i');
  ok((await page.evaluate(() => __app.doc.steps[__app.doc.steps.length - 1].type)) === 'parallel', 'chọn A và BC rồi Ctrl+I: đường song song');
  await page.keyboard.press('Escape');
  await sel('H');
  n = await count();
  await page.keyboard.press('Control+u');
  ok((await page.evaluate(() => [__app.toolId, __app.picks.length].join())) === 'perpendicular,1' && (await count()) === n, 'chọn mới đủ một phần (chỉ H) rồi Ctrl+U: H là lần chọn đầu, chờ chọn đường');
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');

  // ---- Alt + bấm: ẩn ngay ----
  const pid = perp.id;
  const pt = await page.evaluate((id) => {
    const r = __app.view.canvas.getBoundingClientRect();
    const H = __app.values.get(__app.doc.steps.find((s) => s.name === 'H').id);
    const v = __app.values.get(id); // đường vuông góc qua H: bấm cách H 18 px dọc theo đường
    const L = Math.hypot(v.d.x, v.d.y) || 1;
    const h = __app.toScreen(H);
    const q = { x: h.x + (v.d.x / L) * 18, y: h.y - (v.d.y / L) * 18 };
    return { x: r.left + q.x, y: r.top + q.y };
  }, pid);
  await page.keyboard.down('Alt');
  await page.mouse.click(pt.x, pt.y);
  await page.keyboard.up('Alt');
  ok(await page.evaluate((id) => __app.doc.steps.find((s) => s.id === id).hidden === true, pid), 'Alt + bấm vào đường vuông góc: ẩn ngay');
  await page.keyboard.press('Control+z');
  ok(await page.evaluate((id) => !__app.doc.steps.find((s) => s.id === id).hidden, pid), 'Ctrl+Z hiện lại');

  // ---- bảng lệnh (Space) + chọn trước ----
  await page.evaluate(() => __app.setTool('move'));
  await sel('A', 'B', 'C');
  n = await count();
  await page.keyboard.press('Space');
  await page.waitForSelector('.palette .pal-q');
  await page.keyboard.type('dtnt');
  const first = await page.evaluate(() => document.querySelector('.pal-row.on .pal-l').textContent);
  ok(first === 'Đường tròn nội tiếp', `bảng lệnh: gõ "dtnt" → ${first}`);
  await page.fill('.pal-q', 'duong tron ngoai');
  ok((await page.evaluate(() => document.querySelector('.pal-row.on .pal-l').textContent)) === 'Đường tròn ngoại tiếp', 'bảng lệnh: gõ "duong tron ngoai" không dấu');
  await shot('v16-bang-lenh');
  await page.keyboard.press('Enter');
  ok((await count()) > n && (await page.evaluate(() => __app.toolId)) === 'circumcircle', 'Enter: dùng Đường tròn ngoại tiếp, dựng ngay trên A, B, C đang chọn');
  await page.keyboard.press('Escape');

  // ---- bảng phím tắt: gán phím mới, chặn phím trình duyệt giữ ----
  await page.keyboard.press('Control+/');
  await page.waitForSelector('.keys-win');
  await page.fill('.keys-q', 'tam noi tiep');
  await page.click('.key-row:has-text("Tâm nội tiếp") .kr-k');
  await page.keyboard.press('Control+z');
  ok(/hoàn tác/.test(await page.evaluate(() => document.querySelector('.keys-win .k-msg').textContent)), 'không cho gán tổ hợp đã dùng (Ctrl+Z: hoàn tác)');
  await page.keyboard.press('Control+Shift+K');
  ok((await page.evaluate(() => JSON.parse(localStorage.getItem('hinh-hoc-dong:phim-tat'))['Ctrl+Shift+K'])) === 'incenter', 'gán Ctrl+Shift+K cho Tâm nội tiếp (lưu trong trình duyệt)');
  await shot('v16-phim-tat');
  await page.click('.keys-win .primary');
  await sel('A', 'B', 'C');
  n = await count();
  await page.keyboard.press('Control+Shift+K');
  ok((await page.evaluate(() => __app.doc.steps[__app.doc.steps.length - 1].type)) === 'incenter', 'phím vừa gán dùng được ngay (chọn A, B, C rồi Ctrl+Shift+K → tâm nội tiếp)');
  await page.evaluate(() => localStorage.removeItem('hinh-hoc-dong:phim-tat'));
  await page.keyboard.press('Escape');

  // ---- điểm đặc biệt: Shift + phím của đường tạo ra nó ----
  await page.evaluate(() => __app.setTool('move'));
  await sel('A', 'B', 'C');
  n = await count();
  await page.keyboard.press('Control+Shift+U');
  ok((await page.evaluate(() => __app.toolId)) === 'orthocenter' && (await count()) === n && (await page.evaluate(() => [...__app.selection].join())) === (await S('H')),
    'chọn A, B, C rồi Ctrl+Shift+U (trực tâm): hình đã có H nên chọn lại H, không dựng trùng');
  await page.keyboard.press('Escape');
  await sel('d2');
  n = await count();
  await page.keyboard.press('Control+m');
  ok((await count()) === n + 1 && (await page.evaluate(() => __app.doc.steps[__app.doc.steps.length - 1].type)) === 'midpoint', 'chọn đoạn BC rồi Ctrl+M: trung điểm');
  await page.keyboard.press('Escape');

  // ---- công cụ Chọn: bấm vào chỗ hai đường cắt nhau là có giao điểm ----
  await page.evaluate(() => {
    __app.newTab({ format: 'hinh-hoc-dong', version: 1, steps: [
      { id: 'a', type: 'free_point', args: [], params: { x: -3, y: 0 }, name: 'A' }, { id: 'b', type: 'free_point', args: [], params: { x: 3, y: 0.5 }, name: 'B' },
      { id: 'c', type: 'free_point', args: [], params: { x: -1, y: -3 }, name: 'C' }, { id: 'd', type: 'free_point', args: [], params: { x: 1, y: 3 }, name: 'D' },
      { id: 'ab', type: 'segment', args: ['a', 'b'], name: 'd1' }, { id: 'cd', type: 'segment', args: ['c', 'd'], name: 'd2' },
      { id: 'o', type: 'circle', args: ['a', 'c'], name: 'ω' }] });
    __app.zoomFit();
    __app.setTool('move');
  });
  const X = await page.evaluate(() => { // giao của AB và CD (dò số), bấm lệch 3 px như tay người
    const r = __app.view.canvas.getBoundingClientRect();
    let P = null;
    for (let k = 0; k <= 200 && !P; k++) { const x = -1 + k * 0.01; const yab = (x + 3) / 12; const xcd = (yab + 3) / 3 - 1; if (Math.abs(xcd - x) < 0.006) P = { x, y: yab }; }
    const q = __app.toScreen(P);
    return { x: r.left + q.x + 3, y: r.top + q.y - 2 };
  });
  await page.mouse.move(X.x, X.y);
  await page.waitForTimeout(120);
  ok(/Bấm để lấy giao điểm của d1 và d2/.test(await page.evaluate(() => document.getElementById('hint').textContent)), 'rê chuột tới chỗ AB cắt CD: báo trước "Bấm để lấy giao điểm"');
  n = await count();
  await page.mouse.click(X.x, X.y);
  const got = await page.evaluate(() => { const s = __app.doc.steps[__app.doc.steps.length - 1]; return { type: s.type, sel: __app.selection.has(s.id), args: s.args.join() }; });
  ok((await count()) === n + 1 && got.type === 'intersection' && got.args === 'ab,cd' && got.sel, 'công cụ Chọn: bấm vào chỗ cắt → giao điểm, chọn sẵn để gõ tên');
  await page.mouse.click(X.x, X.y);
  ok((await count()) === n + 1, 'bấm lại chỗ đó: chọn điểm vừa có, không tạo trùng');
  await page.evaluate(() => { __app.closeTab(__app.tabIdx); }); // không chờ: có thể đang hỏi xác nhận
  await page.waitForTimeout(100);
  if (await page.$('.modal-back')) await page.click('.modal .primary');

  // ---- nhiều tab: nút ✕ của tab đang mở và nút ＋ luôn thấy ----
  const nt0 = await page.evaluate(() => __app.tabs.length);
  await page.evaluate(() => { for (let i = 0; i < 14; i++) __app.newTab(); });
  const vis = await page.evaluate(() => { const tb = document.getElementById('tabbar').getBoundingClientRect(); const x = document.querySelector('.dtab.active .dt-x').getBoundingClientRect(); const p = document.getElementById('tab-new').getBoundingClientRect(); return x.width > 0 && x.right <= tb.right + 0.5 && p.right <= tb.right + 0.5 && !(x.right > p.left && x.left < p.right); });
  ok(vis, 'mở 15+ tab: các tab co lại, nút ✕ của tab đang mở và nút ＋ vẫn thấy, không đè nhau');
  await page.evaluate((n) => { __app.tabs.splice(n); __app.showTab(n - 1); }, nt0);

  // ---- \widehat, \overrightarrow ----
  await page.evaluate(() => __app.textBoxes.newBox('ghichu', { fx: 0.3, fy: 0.3, w: 420, text: '$\\widehat{BAC} = \\widehat{BHC}$ và\n$\\overrightarrow{AB} + \\overrightarrow{BC}$' }));
  await page.waitForTimeout(200);
  const hat = await page.evaluate(() => {
    const svgs = [...document.querySelectorAll('.tb-body svg')];
    return { n: svgs.length, br: svgs.some((s) => s.innerHTML.includes('<br')), w: svgs.map((s) => s.getBoundingClientRect().width) };
  });
  ok(hat.n >= 4 && !hat.br && hat.w.every((w) => w > 15), `\\widehat, \\overrightarrow vẽ trùm cả tên (độ rộng ${hat.w.map((w) => Math.round(w)).join(', ')} px)`);
  await shot('v16-widehat');
  const js = errors.filter((x) => !/Failed to load resource/.test(x)); // phản hồi mạng có chủ đích của test kho (smoke7)
  ok(js.length === 0, 'không có lỗi JS: ' + js.join(' | '));
}
