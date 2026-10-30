// Kiểm tra trình duyệt cho bản 1.9: Khám phá theo mục tiêu – trạng thái quan hệ, "Vì sao?", đặt mục tiêu (gõ / chọn
// trên hình / từ một quan hệ), tìm điểm phụ, dựng điểm phụ rồi chứng minh được, chèn vào lời giải, tự khám phá lại.
export async function run({ page, ok, shot }) {
  console.log('Bản 1.9: Khám phá theo mục tiêu, điểm phụ, bộ máy suy luận');
  const lib = (id) => page.evaluate((x) => {
    while (__app.tabs.length > 1) __app.tabs.splice(1);
    __app.showTab(0);
    __app.loadDoc(GeoCore.THU_VIEN.find((t) => t.id === x).doc);
    __app.zoomFit();
    __app.setTool('move');
  }, id);

  // ---- khám phá tự do: trạng thái, gom tập điểm ----
  await lib('imo2008-1');
  await page.click('#btn-explore');
  await page.waitForSelector('#tab-explore .rel');
  const first = await page.textContent('#tab-explore .rel .rel-text');
  ok(/A1, A2, B1, B2, C1, C2 cùng thuộc một đường tròn/.test(first.replace(/\s/g, ' ')), `IMO 2008/1: dòng đầu là 6 điểm đồng viên ("${first}")`);
  ok(await page.evaluate(() => [...document.querySelectorAll('#tab-explore .badge.st-deep')].length > 0), 'quan hệ có nhãn trạng thái (sâu / chứng minh được / hiển nhiên)');
  ok(/O cách đều A, B, C/.test(await page.textContent('#tab-explore .rel-list')), 'đại lượng: "O cách đều A, B, C" (bổ đề then chốt: O là tâm ngoại tiếp ABC)');

  // ---- mục tiêu gõ tay: chứng minh được ngay (VMO 2016/3a) ----
  await lib('vmo2016-3');
  await page.click('#btn-explore');
  await page.waitForSelector('#tab-explore .rel');
  await page.fill('#kp-goal', 'D thuộc ω1');
  await page.keyboard.press('Enter');
  await page.waitForSelector('.kp-goal .kp-proved');
  ok(true, 'VMO 2016/3a: mục tiêu "D thuộc (AMN)" chứng minh được');
  await page.click('#kp-goal-why');
  const steps = await page.locator('.kp-goal .kp-proof li').allTextContents();
  ok(steps.length >= 3 && /A, M, N, D cùng thuộc một đường tròn/.test(steps[steps.length - 1]) && new Set(steps).size === steps.length, `các bước (không lặp), kết thúc bằng A, M, N, D đồng viên (${steps.length} bước)`);
  ok(/mục tiêu/.test(await page.textContent('#tab-explore .rel.is-goal')), 'quan hệ chính là mục tiêu được đánh dấu, đứng đầu');
  // chèn vào lời giải
  await page.click('#kp-goal-ins');
  ok(await page.evaluate(() => (__app.doc.boxes || []).some((b) => b.role === 'loigiai' && /A, M, N, D cùng thuộc một đường tròn/.test(b.text))), 'Chèn vào lời giải: thêm các bước vào khung lời giải');
  await shot('v19-goal-proved');

  // ---- mục tiêu cần điểm phụ (IMO 2013/4) ----
  await lib('imo2013-4');
  await page.click('#btn-explore');
  await page.waitForSelector('#tab-explore .rel');
  // lấy mục tiêu từ các đối tượng đang chọn: X, Y, H
  await page.evaluate(() => { const id = (n) => __app.doc.steps.find((s) => s.name === n).id; __app.selection = new Set([id('X'), id('Y'), id('H')]); __app.refresh(); });
  await page.click('#kp-goal-sel');
  await page.waitForSelector('.kp-goal');
  ok(/X, Y, H thẳng hàng/.test(await page.textContent('.kp-goal')) && /Chưa chứng minh được/.test(await page.textContent('.kp-goal')), 'lấy mục tiêu từ đối tượng đang chọn: X, Y, H thẳng hàng – chưa chứng minh được');
  await page.click('#kp-aux');
  await page.waitForSelector('.kp-aux-row', { timeout: 30000 });
  const firstAux = await page.textContent('.kp-aux-row');
  ok(/giao điểm thứ hai của XY và \(BWN\)/.test(firstAux) && /chứng minh được mục tiêu/.test(firstAux), `điểm phụ đầu tiên chứng minh được mục tiêu ("${firstAux.trim().slice(0, 60)}…")`);
  await page.hover('.kp-aux-row');
  ok(await page.evaluate(() => __app.renderer.extra.some((e) => e.type === 'point')), 'rê chuột lên gợi ý: xem trước điểm phụ trên hình');
  const n0 = await page.evaluate(() => __app.doc.steps.length);
  await page.click('[data-aux-add="0"]');
  await page.waitForSelector('.kp-goal .kp-proved', { timeout: 30000 });
  ok((await page.evaluate(() => __app.doc.steps.length)) === n0 + 1, 'Dựng: thêm điểm phụ vào hình');
  ok(true, 'sau khi dựng điểm phụ: mục tiêu chứng minh được (khám phá lại tự động)');
  await page.click('#kp-goal-why');
  ok(/trục đẳng phương/.test(await page.textContent('.kp-goal .kp-proof')), 'lời giải dùng trục đẳng phương (như lời giải chính thức)');
  await shot('v19-aux-proved');
  await page.keyboard.press('Control+z');

  // ---- đặt mục tiêu từ một quan hệ; "Vì sao?" ----
  await lib('noi-bang-tiep');
  await page.click('#btn-explore');
  await page.waitForSelector('#tab-explore .rel');
  await page.evaluate(() => { document.getElementById('kp-show-triv')?.click(); });
  const i = await page.evaluate(() => [...document.querySelectorAll('#tab-explore .rel')].findIndex((el) => el.querySelector('.st-proved')));
  ok(i >= 0, 'có quan hệ "chứng minh được"');
  if (i >= 0) {
    const el = page.locator('#tab-explore .rel').nth(i);
    await el.click();
    await page.locator('#tab-explore .rel.active [data-why]').click();
    ok((await page.locator('#tab-explore .rel.active .kp-proof li').count()) > 0, '"Vì sao?" hiện các bước chứng minh');
    await page.locator('#tab-explore .rel.active [data-goal]').click();
    await page.waitForSelector('.kp-goal');
    ok(/Chứng minh được/.test(await page.textContent('.kp-goal')), '"Đặt làm mục tiêu" từ một quan hệ');
  }
  // ---- tự khám phá lại khi hình đổi ----
  const before = await page.evaluate(() => document.querySelector('#tab-explore .explore-stats').textContent);
  await page.evaluate(() => { const a = __app.doc.steps.find((s) => s.name === 'A'); __app.setParams(a.id, { x: a.params.x + 0.3 }); });
  ok(/hình đã đổi/.test(await page.textContent('#tab-explore .explore-stats')), 'hình đổi: báo đang khám phá lại');
  await page.waitForFunction((b) => !/hình đã đổi/.test(document.querySelector('#tab-explore .explore-stats').textContent), before, { timeout: 10000 });
  ok(true, 'tự khám phá lại sau khi hình đổi');
}
