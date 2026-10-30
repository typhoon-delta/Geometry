// Kiểm tra trình duyệt cho bản 1.7: góc bằng góc (chọn phía bằng chuột), điểm trong tam giác, quỹ tích, vết, điểm cố
// định, đo đạc, Ctrl + kéo chọn vùng, đường phụ, chép/dán, sửa đối tượng cha.
export async function run({ page, ok, shot }) {
  console.log('Bản 1.7: quỹ tích, điểm cố định, góc bằng góc, đo đạc, chọn vùng, đường phụ, chép/dán, sửa đối tượng cha');
  const S = (id, type, args, params, name) => ({ id, type, args, ...(params ? { params } : {}), ...(name ? { name } : {}) });
  const tri = [
    S('A', 'free_point', [], { x: 0, y: 4 }, 'A'), S('B', 'free_point', [], { x: -3, y: 0 }, 'B'), S('C', 'free_point', [], { x: 4, y: 0 }, 'C'),
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
  const clickAt = async (P, opts) => { const q = await scr(P); await page.mouse.click(q.x, q.y, opts); };
  const val = (id) => page.evaluate((i) => __app.values.get(i), id);
  const last = () => page.evaluate(() => __app.doc.steps[__app.doc.steps.length - 1]);
  const pts = { A: { x: 0, y: 4 }, B: { x: -3, y: 0 }, C: { x: 4, y: 0 } };

  // ---- đường tạo góc bằng góc: chọn phía bằng chuột ----
  await load(tri);
  await page.evaluate(() => __app.setTool('angle_line'));
  // góc mẫu ∠ABC, dựng tại A trên tia AC
  for (const p of ['A', 'B', 'C', 'A', 'C']) await clickAt(pts[p]);
  ok(await page.evaluate(() => __app.awaitExtra === true), 'góc bằng góc: chọn đủ 5 điểm thì chờ bấm chọn phía');
  ok(/phía/.test(await page.textContent('#hint')), 'gợi ý nhắc rê chuột sang phía muốn dựng');
  await clickAt({ x: 3, y: 4.5 }); // phía trên AC (không chứa B)
  let s = await last();
  let v = await val(s.id);
  // đường qua A tạo với AC góc bằng góc B; phía trên AC: điểm A + d ở phía không chứa B
  const side = (P) => (pts.C.x - pts.A.x) * (P.y - pts.A.y) - (pts.C.y - pts.A.y) * (P.x - pts.A.x);
  const dirP = { x: v.p.x + v.d.x, y: v.p.y + v.d.y };
  const ang = (u, w) => Math.acos((u.x * w.x + u.y * w.y) / Math.hypot(u.x, u.y) / Math.hypot(w.x, w.y));
  const angB = ang({ x: 3, y: 4 }, { x: 7, y: 0 });
  const dAC = { x: 4, y: -4 };
  const a1 = ang(v.d, dAC);
  ok(s.type === 'angle_line' && Math.min(Math.abs(a1 - angB), Math.abs(Math.PI - a1 - angB)) < 1e-6, 'dựng được đường tạo với AC góc bằng ∠ABC');
  ok(s.aux === true, 'đường dựng thêm là đường phụ (aux)');
  const sgnMouse = Math.sign(side({ x: 3, y: 4.5 })), sgnB = Math.sign(side(pts.B));
  // tia OX quay một góc: điểm theo hướng d (hoặc −d) cùng phía chuột
  const r1 = Math.sign(side(dirP)), r2 = Math.sign(side({ x: v.p.x - v.d.x, y: v.p.y - v.d.y }));
  ok(sgnMouse !== sgnB && (r1 === sgnMouse || r2 === sgnMouse), 'đường nằm về phía đã rê chuột');
  // bấm phía kia → flip ngược lại
  await page.evaluate(() => __app.setTool('angle_line'));
  for (const p of ['A', 'B', 'C', 'A', 'C']) await clickAt(pts[p]);
  await clickAt({ x: 0.5, y: 1 });
  const s2 = await last();
  ok(s2.type === 'angle_line' && !!s2.params.flip !== !!s.params.flip, 'bấm phía bên kia: được đường đối xứng (flip khác)');
  await shot('v17-angle-line');

  // ---- điểm trên đường tạo góc bằng góc: điểm E trên AC với ∠BAE... (∠EBC = ∠BAC) ----
  await load(tri);
  await page.evaluate(() => __app.setTool('angle_point'));
  for (const p of ['B', 'A', 'C', 'B', 'C']) await clickAt(pts[p]);
  // chọn đường CA, bấm gần chỗ giao (phía trên BC)
  await clickAt({ x: 2, y: 2 });
  s = await last();
  v = await val(s.id);
  const bae = ang({ x: -3, y: -4 }, { x: 4, y: -4 });
  const ebc = v && ang({ x: v.x + 3, y: v.y }, { x: 7, y: 0 });
  ok(s.type === 'angle_point' && v && Math.abs(ebc - bae) < 1e-6 && Math.abs(v.x + v.y - 4) < 1e-9, 'điểm E trên AC với ∠EBC = ∠BAC');

  // ---- điểm trong tam giác ----
  await load(tri);
  await page.evaluate(() => __app.setTool('point_in'));
  for (const p of ['A', 'B', 'C']) await clickAt(pts[p]);
  ok(/trong tam giác/.test(await page.textContent('#hint')), 'điểm trong tam giác: chờ bấm vào trong tam giác');
  await clickAt({ x: 0.5, y: 1.5 });
  s = await last();
  v = await val(s.id);
  ok(s.type === 'point_in' && Math.hypot(v.x - 0.5, v.y - 1.5) < 0.05, 'đặt điểm trong tam giác đúng chỗ bấm');
  await page.evaluate(() => __app.setTool('move'));
  const q0 = await scr(v), q1 = await scr({ x: 6, y: 5 });
  await page.mouse.move(q0.x, q0.y);
  await page.mouse.down();
  await page.mouse.move(q1.x, q1.y, { steps: 6 });
  await page.mouse.up();
  const p2 = await page.evaluate((id) => __app.doc.steps.find((x) => x.id === id).params, s.id);
  ok(p2.u >= 0 && p2.v >= 0 && p2.u + p2.v <= 1 + 1e-9 && (p2.u === 0 || p2.v === 0 || p2.u + p2.v > 0.999), 'kéo ra ngoài: điểm dừng ở cạnh tam giác (u, v ≥ 0, u + v ≤ 1)');

  // ---- quỹ tích: trung điểm N của AD khi D chạy trên BC ----
  await load([...tri, S('D', 'point_on', ['bc'], { t: 0.4 }, 'D'), S('N', 'midpoint', ['A', 'D'], null, 'N')]);
  await page.evaluate(() => __app.setTool('locus'));
  await clickAt(await val('N'));
  await clickAt(await val('D'));
  s = await last();
  v = await val(s.id);
  ok(s.type === 'locus' && v && v.kind === 'locus' && v.pts.length >= 100 && v.pts.every((p) => p && Math.abs(p.y - 2) < 1e-9), 'quỹ tích trung điểm N: đoạn thẳng y = 2 (đường trung bình)');
  await page.evaluate(() => __app.setTool('locus'));
  await clickAt(await val('N'));
  await clickAt(pts.A);
  ok((await page.evaluate(() => __app.doc.steps.filter((x) => x.type === 'locus').length)) === 1, 'điểm chạy không nằm trên đường: không dựng quỹ tích (có thông báo)');
  await page.evaluate(() => __app.setTool('move'));
  // vết: bật vết cho N rồi kéo D
  await page.evaluate(() => { __app.toggleTrace('N', true); });
  const d0 = await scr(await val('D')), d1 = await scr({ x: 3, y: 0 });
  await page.mouse.move(d0.x, d0.y);
  await page.mouse.down();
  await page.mouse.move(d1.x, d1.y, { steps: 10 });
  await page.mouse.up();
  ok(await page.evaluate(() => (__app.renderer.traces?.get('N')?.items.length || 0) >= 5), 'vết: kéo D để lại vết của N');
  await shot('v17-locus-trace');
  await page.click('#topbar .menu:nth-of-type(3) .menu-btn').catch(() => {});
  await page.evaluate(() => document.getElementById('btn-clear-trace').click());
  ok(await page.evaluate(() => !__app.renderer.traces), 'Xoá vết');
  await page.keyboard.press('Escape');

  // ---- điểm cố định: đường thẳng qua D vuông góc với BC luôn… không cố định; đường AD luôn qua A ----
  await load([...tri, S('D', 'point_on', ['bc'], { t: 0.4 }, 'D'), S('ad', 'line', ['A', 'D'], null, 'd4')]);
  await page.evaluate(() => __app.setTool('fixed_point'));
  await clickAt({ x: -0.1, y: 2 }); // trên đường AD (D(−0,2; 0))
  await clickAt(await val('D'));
  s = await last();
  v = await val(s.id);
  ok(s.type === 'fixed_point' && v && Math.hypot(v.x, v.y - 4) < 1e-6, 'điểm cố định của đường AD khi D chạy trên BC: A');
  ok((await page.evaluate(() => __app.doc.steps.filter((x) => x.type === 'fixed_point').length)) === 1, 'chỉ giữ điểm cố định tìm được (đường thẳng: một điểm)');

  // ---- đo đạc ----
  await load(tri);
  await page.evaluate(() => __app.setTool('measure_len'));
  await clickAt({ x: 0.5, y: 0 }); // bấm vào đoạn BC
  await page.evaluate(() => __app.setTool('measure_angle'));
  for (const p of ['B', 'A', 'C']) await clickAt(pts[p]);
  await page.evaluate(() => __app.setTool('measure_ratio'));
  for (const p of ['A', 'B', 'A', 'C']) await clickAt(pts[p]);
  await page.evaluate(() => __app.setTool('move'));
  const ms = await page.evaluate(() => __app.doc.steps.filter((x) => x.type.startsWith('measure_')).map((x) => x.id));
  ok(ms.length === 3, 'thêm được 3 số đo (độ dài, góc, tỉ số)');
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  ok((await page.evaluate(() => __app.renderer.measureBoxes.size)) === 3, 'số đo được vẽ trên hình (có khung chữ)');
  ok(Math.abs((await val(ms[0])).value - 7) < 1e-9 && Math.abs((await val(ms[2])).value - 5 / Math.hypot(4, 4)) < 1e-9, 'giá trị đo đúng: BC = 7, AB/AC = 5/(4√2)');
  ok(Math.abs((await val(ms[1])).value - (ang({ x: -3, y: -4 }, { x: 4, y: -4 }) * 180) / Math.PI) < 1e-9, 'góc BAC đo bằng độ');
  const box = await page.evaluate((id) => { const b = __app.renderer.measureBoxes.get(id); const r = __app.view.canvas.getBoundingClientRect(); return { x: r.left + b.x + b.w / 2, y: r.top + b.y + b.h / 2 }; }, ms[0]);
  await page.mouse.move(box.x, box.y);
  await page.mouse.down();
  await page.mouse.move(box.x + 40, box.y + 30, { steps: 4 });
  await page.mouse.up();
  const mp = await page.evaluate((id) => __app.doc.steps.find((x) => x.id === id).params, ms[0]);
  ok(Math.abs(mp.dx - 40) < 2 && Math.abs(mp.dy - 30) < 2, 'kéo chữ số đo để dời chỗ');
  await page.evaluate(() => { __app.setParams(__app.doc.steps[0].id, { x: 1, y: 5 }); });
  ok(Math.abs((await val(ms[2])).value - Math.hypot(4, 5) / Math.hypot(3, 5)) < 1e-9, 'số đo cập nhật khi hình đổi');
  await shot('v17-measure');

  // ---- Ctrl + kéo: chọn vùng ----
  await load([...tri, S('M', 'midpoint', ['B', 'C'], null, 'M'), S('w', 'circumcircle', ['A', 'B', 'C'], null, 'ω')]);
  const c1 = await scr({ x: -3.5, y: 0.6 }), c2 = await scr({ x: 4.5, y: -0.6 });
  await page.keyboard.down('Control');
  await page.mouse.move(c1.x, c1.y);
  await page.mouse.down();
  await page.mouse.move(c2.x, c2.y, { steps: 5 });
  await page.mouse.up();
  await page.keyboard.up('Control');
  let sel = await page.evaluate(() => [...__app.selection].sort().join());
  ok(sel === ['B', 'C', 'M', 'bc'].sort().join(), 'Ctrl + kéo chọn B, C, M và đoạn BC (không chọn ω vì A ở ngoài)');
  const c3 = await scr({ x: -0.5, y: 4.5 }), c4 = await scr({ x: 0.5, y: 3.5 });
  await page.keyboard.down('Control');
  await page.keyboard.down('Shift');
  await page.mouse.move(c3.x, c3.y);
  await page.mouse.down();
  await page.mouse.move(c4.x, c4.y, { steps: 3 });
  await page.mouse.up();
  await page.keyboard.up('Shift');
  await page.keyboard.up('Control');
  sel = await page.evaluate(() => [...__app.selection]);
  ok(sel.includes('A') && sel.includes('B') && sel.length === 5, 'Ctrl+Shift + kéo: chọn thêm A');
  // không kéo Ctrl: dời hình như cũ
  const bb0 = await page.evaluate(() => __app.view.bbox?.join() ?? JSON.stringify(__app.toUser(0, 0)));
  const e1 = await scr({ x: -5, y: -2.5 });
  await page.mouse.move(e1.x, e1.y);
  await page.mouse.down();
  await page.mouse.move(e1.x - 50, e1.y + 20, { steps: 3 });
  await page.mouse.up();
  ok((await page.evaluate(() => __app.view.bbox?.join() ?? JSON.stringify(__app.toUser(0, 0)))) !== bb0, 'kéo nền (không Ctrl) vẫn là dời hình');

  // ---- đường phụ ----
  await load(tri);
  await page.evaluate(() => { __app.selection = new Set(['A', 'bc']); __app.refresh(); });
  await page.keyboard.press('Control+u');
  s = await last();
  ok(s.type === 'perpendicular' && s.aux === true, 'đường vuông góc dựng thêm là đường phụ');
  await page.keyboard.press('Escape');
  await page.keyboard.press('Control+Shift+D');
  ok(await page.evaluate(() => __app.doc.hideAux === true && !__app.renderer.items.some((it) => it.s.type === 'perpendicular')), 'Ctrl+Shift+D: ẩn mọi đường phụ');
  ok(await page.evaluate(() => /(perpendicular|vuông)/.test(GeoCore.toTikZ(__app.doc)) === false), 'TikZ không có đường phụ đang ẩn');
  await page.keyboard.press('Control+Shift+D');
  ok(await page.evaluate(() => !__app.doc.hideAux && __app.renderer.items.some((it) => it.s.type === 'perpendicular' && it.st.dash)), 'Ctrl+Shift+D lần nữa: hiện lại, nét đứt');
  await page.evaluate((id) => { __app.selection = new Set([id]); __app.refresh(); }, s.id);
  await page.uncheck('#p-aux');
  ok(await page.evaluate((id) => !__app.doc.steps.find((x) => x.id === id).aux, s.id), 'bỏ chọn "Đường phụ" ở thẻ thuộc tính: thành đường chính');

  // ---- chép / dán ----
  await load([...tri, S('M', 'midpoint', ['B', 'C'], null, 'M')]);
  await page.evaluate(() => { __app.selection = new Set(['M']); __app.refresh(); });
  await page.evaluate(() => { const c = __app.copySelection(); window.__clip = JSON.stringify(c); });
  const n0 = await page.evaluate(() => __app.doc.steps.length);
  await page.evaluate(() => __app.pasteClip(JSON.parse(window.__clip)));
  const after = await page.evaluate(() => __app.doc.steps.map((x) => x.name));
  ok(after.length === n0 + 3 && new Set(after).size === after.length, 'dán vào chính hình: chép M kèm B, C (tên mới, không trùng)');
  await page.evaluate(() => __app.newTab());
  await page.evaluate(() => __app.pasteClip(JSON.parse(window.__clip)));
  const t2 = await page.evaluate(() => __app.doc.steps.map((x) => x.type + ':' + x.name).join());
  ok(t2 === 'free_point:B,free_point:C,midpoint:M', 'dán sang tab mới: giữ nguyên tên B, C, M');
  // qua sự kiện copy/paste thật của trình duyệt
  await page.evaluate(() => __app.showTab(0));
  await page.evaluate(() => { __app.selection = new Set(['M']); __app.refresh(); });
  const viaEvent = await page.evaluate(() => {
    const dt = new DataTransfer();
    document.dispatchEvent(Object.assign(new Event('copy', { bubbles: true, cancelable: true }), { clipboardData: dt }));
    const txt = dt.getData('text/plain');
    const n = __app.doc.steps.length;
    const dt2 = new DataTransfer();
    dt2.setData('text/plain', txt);
    document.dispatchEvent(Object.assign(new Event('paste', { bubbles: true, cancelable: true }), { clipboardData: dt2 }));
    return [txt.includes('hinh-hoc-dong-chep'), __app.doc.steps.length - n];
  });
  ok(viaEvent[0] && viaEvent[1] === 3, 'Ctrl+C / Ctrl+V (sự kiện chép/dán): ghi JSON vào clipboard và dán lại được');

  // ---- sửa đối tượng cha ----
  await load([...tri, S('M', 'midpoint', ['A', 'B'], null, 'M'), S('w', 'circle', ['M', 'C'], null, 'ω'), S('D', 'free_point', [], { x: 2, y: 3 }, 'D')]);
  await page.evaluate(() => { __app.selection = new Set(['M']); __app.refresh(); });
  await page.click('#props [data-redef="1"]');
  ok(/Thay B/.test(await page.textContent('#hint')), 'bấm B trong "Dựng từ": chờ chọn đối tượng thay thế');
  await clickAt({ x: 2, y: 3 });
  const st = await page.evaluate(() => __app.doc.steps.map((x) => x.id).join());
  const M = await val('M');
  ok(await page.evaluate(() => __app.doc.steps.find((x) => x.id === 'M').args.join()) === 'A,D' && Math.hypot(M.x - 1, M.y - 3.5) < 1e-9, 'M thành trung điểm AD (D dựng sau M)');
  ok(st.indexOf('D') < st.indexOf('M') && st.indexOf('M') < st.indexOf('w') && !!(await val('w')), 'các bước được sắp lại: D trước M, ω vẫn phụ thuộc M');
  await page.evaluate(() => { __app.selection = new Set(['A']); __app.refresh(); });
  ok(await page.evaluate(() => !document.querySelector('#props [data-redef]')), 'điểm tự do không có mục "Dựng từ"');
  await page.evaluate(() => { __app.selection = new Set(['M']); __app.refresh(); });
  await page.click('#props [data-redef="0"]');
  await clickAt(await val('M'));
  ok(await page.evaluate(() => __app.doc.steps.find((x) => x.id === 'M').args.join()) === 'A,D', 'không cho thay bằng chính nó / đối tượng phụ thuộc');
  await page.keyboard.press('Escape');
  await page.evaluate(() => __app.undo());
  ok(await page.evaluate(() => __app.doc.steps.find((x) => x.id === 'M').args.join()) === 'A,B', 'Ctrl+Z: trở lại như trước khi sửa');
}
