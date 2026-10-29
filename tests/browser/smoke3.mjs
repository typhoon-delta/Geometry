// Kiểm tra trình duyệt cho bản 1.2 (dùng thử): menu Ví dụ, gõ để đặt tên, đổi chỗ tên, thẻ thuộc tính không che
// khi đang dựng, nghịch đảo đường tròn, quay theo góc trên hình (chọn lặp điểm), công cụ vừa dùng, đường vừa đủ.
export async function run({ page, ok, shot, state, tool, clickAt }) {
  console.log('Bản 1.2: dùng thử');
  const n0 = await page.evaluate(() => GeoCore.THU_VIEN.length);
  ok(n0 >= 20, `thư viện ví dụ có ${n0} hình`);
  const i = await page.evaluate(() => [...document.querySelectorAll('#topbar .menu')].indexOf(document.getElementById('example-menu').closest('.menu')));
  await page.click(`#topbar .menu:nth-child(${i + 1}) .menu-btn`);
  const groups = await page.evaluate(() => [...document.querySelectorAll('#example-menu .ex-col .menu-label')].map((x) => x.textContent));
  ok(['IMO', 'VMO', 'Cấu hình hay gặp', 'Hình mẫu'].every((g) => groups.includes(g)), 'menu Ví dụ chia nhóm: ' + groups.join(', '));
  await shot('v12-menu-vi-du');
  await page.click('[data-lib="imo2008-1"]');
  let st = await state();
  ok(st.n > 20 && (await page.evaluate(() => __app.doc.title)) === 'IMO 2008 – Bài 1', `mở ví dụ IMO 2008 (${st.n} bước)`);
  const undef = await page.evaluate(() => __app.doc.steps.filter((s) => !__app.values.get(s.id)).length);
  ok(undef === 0, 'mọi đối tượng của ví dụ đều xác định');

  // gõ để đặt tên: dựng trung điểm bằng công cụ, gõ ngay tên
  await page.evaluate(() => { __app.loadDoc({ format: 'hinh-hoc-dong', version: 1, steps: [] }); });
  await tool('triangle');
  await clickAt(-2, 3); await clickAt(-4, -2); await clickAt(3, -2);
  await tool('midpoint');
  await clickAt(-2, 3); await clickAt(3, -2);
  await page.keyboard.type("M_b'");
  await page.keyboard.press('Enter');
  st = await state();
  ok(st.steps.some((s) => s.type === 'midpoint' && s.name === "M_b'"), 'gõ ngay để đặt tên điểm vừa dựng (công cụ vẫn là Trung điểm)');
  ok((await page.evaluate(() => __app.toolId)) === 'midpoint', 'vẫn giữ công cụ đang dùng');
  ok(!(await page.evaluate(() => document.getElementById('props').classList.contains('show'))), 'thẻ thuộc tính không hiện khi đang dựng');
  // đổi chỗ tên
  await page.evaluate(() => { const a = __app.doc.steps.find((s) => s.name === 'A'); __app.setName(a.id, 'C'); });
  st = await state();
  ok(st.steps[0].name === 'C' && st.steps[2].name === 'A', 'đổi sang tên đã có thì đổi chỗ hai tên');
  // công cụ vừa dùng
  ok(await page.evaluate(() => !!document.querySelector('#tb-recent [data-recent="triangle"]')), 'dải công cụ vừa dùng có "Dựng tam giác"');
  // nghịch đảo đường tròn: ảnh của đường tròn qua tâm nghịch đảo là đường thẳng
  await page.evaluate(() => {
    const b = new GeoCore.Builder();
    const O = b.point(0, 0, 'O'), R = b.point(2, 0, 'R');
    b.add('circle', [O, R], {}, 'k');
    const P = b.point(1, 1, 'P');
    b.add('circle', [P, O], {}, 'w');
    const Q = b.point(4, 1, 'Q'), S = b.point(5, 1, 'S');
    b.add('circle', [Q, S], {}, 'u');
    __app.loadDoc(b.doc);
  });
  await tool('invert');
  await clickAt(1 + Math.SQRT2 * Math.cos(2.4), 1 + Math.SQRT2 * Math.sin(2.4));
  await clickAt(2 * Math.cos(-2), 2 * Math.sin(-2));
  await clickAt(4 + Math.cos(2), 1 + Math.sin(2)); // lên đường tròn u (không bấm vào điểm S)
  await clickAt(2 * Math.cos(-2.6), 2 * Math.sin(-2.6));
  st = await state();
  ok(st.steps.some((s) => s.type === 'invert_line') && st.steps.some((s) => s.type === 'invert_circle'), 'Nghịch đảo: đường tròn qua tâm → đường thẳng, không qua tâm → đường tròn');
  // quay theo góc trên hình: chọn lại cùng một điểm (tâm quay là đỉnh góc)
  await tool('rotate_by');
  for (const [x, y] of [[4, 1], [0, 0], [2, 0], [0, 0], [1, 1]]) await clickAt(x, y);
  st = await state();
  ok(st.steps.some((s) => s.type === 'rotate_by' && new Set(s.args).size === 4), 'Quay theo góc ROP quanh O: chọn O hai lần được');
  // đường thẳng vừa đủ: hai điểm trên đường → đoạn vẽ ngắn hơn khung nhìn
  await page.evaluate(() => { const b = new GeoCore.Builder(); const A = b.point(-1, 0, 'A'), B = b.point(1, 0, 'B'); b.add('line', [A, B]); __app.loadDoc(b.doc); __app.setTool('move'); });
  await page.waitForTimeout(50);
  const rg = await page.evaluate(() => [...__app.renderer.lineRanges.values()][0]);
  ok(rg && rg[0] < 0 && rg[0] > -2 && rg[1] > 1 && rg[1] < 3, `đường thẳng vừa đủ qua A, B (tham số ${rg && rg.map((v) => v.toFixed(2))})`);
}
