// Kiểm tra trình duyệt cho bản 1.4: khung chữ (đề bài, lời giải, ghi chú) – soạn nhanh, công thức, trình bày theo bước,
// dán ảnh đề, gắn hình/điểm, lưu/mở, xuất phiếu LaTeX.
export async function run({ page, ok, shot, state, clickAt, errors }) {
  console.log('Bản 1.4: khung chữ');
  await page.evaluate(() => { const ex = GeoCore.THU_VIEN.find((x) => x.id === 'imo2008-1'); __app.newTab(ex.doc); __app.zoomFit(); });
  const nSteps = (await state()).n;

  // ---- Ctrl+Enter: khung lời giải, soạn tại chỗ ----
  await page.mouse.click(300, 400); // tiêu điểm vào bảng vẽ
  await page.keyboard.press('Escape');
  await page.keyboard.press('Control+Enter');
  await page.waitForSelector('.tbox.editing .cm-content');
  ok(await page.evaluate(() => __app.doc.boxes.length === 1 && __app.doc.boxes[0].role === 'loigiai'), 'Ctrl+Enter tạo khung lời giải và mở bộ soạn');
  await page.keyboard.type('Gọi $M_a$ là trung điểm $BC$. Ta có $goc BHC + goc A = 180^o$ và $ff');
  await page.keyboard.type('A_1A_2');
  await page.keyboard.press('Tab');
  await page.keyboard.type('2');
  await page.keyboard.press('Tab');
  await page.keyboard.press('End');
  await page.keyboard.type(' và $M_aA_1 = M_aA_2 =$ ');
  await page.keyboard.press('Control+Enter');
  await page.keyboard.type(';cm');
  await page.keyboard.press('Tab');
  await page.keyboard.type('Sáu điểm cùng nằm trên đường tròn tâm $');
  // bấm một điểm trên hình khi đang soạn → chèn tên điểm
  const O = await page.evaluate(() => { const s = __app.doc.steps.find((x) => x.name === 'O'); const r = __app.view.canvas.getBoundingClientRect(); const q = __app.toScreen(__app.values.get(s.id)); return { x: r.left + q.x, y: r.top + q.y }; });
  await page.mouse.click(O.x, O.y);
  await page.keyboard.press('End');
  await page.keyboard.type('. ;dpcm');
  await page.keyboard.press('Tab');
  await shot('v14-soan');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
  const text = await page.evaluate(() => __app.doc.boxes[0].text);
  ok(text.includes('$\\angle BHC + \\angle A = 180^\\circ$'), 'tự đổi trong công thức: goc → \\angle, ^o → ^\\circ');
  ok(text.includes('\\frac{A_1A_2}{2}'), 'ff → \\frac{}{} với ô nhảy bằng Tab');
  ok(/\n---\n\*\*Chứng minh\.\*\* /.test(text), 'Ctrl+Enter tạo bước mới, ;cm + Tab → **Chứng minh.**');
  ok(text.includes('tâm $O$') && text.endsWith('(đpcm)'), 'bấm điểm trên hình chèn tên điểm; ;dpcm → (đpcm)');
  ok((await state()).n === nSteps, 'bấm điểm khi đang soạn không tạo/đổi gì trên hình');
  const view = await page.evaluate(() => ({ steps: document.querySelectorAll('.tbox .tb-step').length, katex: document.querySelectorAll('.tbox .katex').length, link: document.querySelectorAll('.tbox [data-p]').length, err: document.querySelectorAll('.tbox .katex-error, .tbox .tex-err').length }));
  ok(view.steps === 2 && view.katex >= 5 && view.err === 0, `khung hiện 2 bước, ${view.katex} công thức, không lỗi công thức`);
  ok(view.link >= 4, `tên điểm trong công thức được gắn với hình (${view.link} chỗ)`);

  // rê chuột lên tên điểm → tô sáng điểm
  await page.hover('.tbox [data-p]');
  const hl = await page.evaluate(() => { const id = document.querySelector('.tbox [data-p]').dataset.p; return __app.highlight.has(id); });
  ok(hl, 'rê chuột lên tên trong công thức tô sáng đối tượng trên hình');
  await page.mouse.move(300, 700);

  // ---- kéo, đổi cỡ chữ, thu gọn, gắn hình ----
  const head = await page.evaluate(() => { const r = document.querySelector('.tbox .tb-title').getBoundingClientRect(); return { x: r.left + 30, y: r.top + r.height / 2 }; });
  const fx0 = await page.evaluate(() => __app.doc.boxes[0].fx);
  await page.mouse.move(head.x, head.y);
  await page.mouse.down();
  await page.mouse.move(head.x - 200, head.y + 120, { steps: 5 });
  await page.mouse.up();
  const b1 = await page.evaluate(() => __app.doc.boxes[0]);
  ok(b1.fx < fx0 && b1.fy > 0.1, 'kéo thanh tiêu đề để dời khung');
  await page.hover('.tbox');
  await page.click('.tbox [data-a="bigger"]');
  ok((await page.evaluate(() => __app.doc.boxes[0].font)) > 1, 'A+ phóng to chữ trong khung');
  await page.click('.tbox [data-a="anchor"]');
  ok((await page.evaluate(() => __app.doc.boxes[0].anchor)) === 'figure', 'đổi sang gắn hình');
  const before = await page.evaluate(() => document.querySelector('.tbox').getBoundingClientRect().left);
  await page.mouse.move(600, 450);
  await page.mouse.wheel(0, -300);
  await page.waitForTimeout(100);
  const after = await page.evaluate(() => document.querySelector('.tbox').getBoundingClientRect().left);
  ok(Math.abs(after - before) > 3, 'khung gắn hình đi theo khi phóng hình');
  await page.mouse.wheel(0, 300);
  await page.waitForTimeout(100);
  await page.click('.tbox [data-a="anchor"]');
  await page.click('.tbox [data-a="anchor"]');
  ok((await page.evaluate(() => __app.doc.boxes[0].anchor)) === 'screen', 'trở lại gắn màn hình');
  await page.keyboard.press('Home');

  // ---- dán ảnh đề (Ctrl+V) → khung Đề bài ----
  await page.evaluate(async () => {
    const cv = document.createElement('canvas');
    cv.width = 360; cv.height = 110;
    const c = cv.getContext('2d');
    c.fillStyle = '#fff'; c.fillRect(0, 0, 360, 110);
    c.fillStyle = '#000'; c.font = '14px serif';
    c.fillText('Bài 1 (IMO 2008). Cho tam giác nhọn ABC, trực tâm H.', 10, 34);
    c.fillText('Chứng minh A1, A2, B1, B2, C1, C2 đồng viên.', 10, 70);
    const blob = await new Promise((r) => cv.toBlob(r, 'image/png'));
    const dt = new DataTransfer();
    dt.items.add(new File([blob], 'de.png', { type: 'image/png' }));
    document.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true }));
  });
  await page.waitForFunction(() => (__app.doc.boxes || []).some((b) => b.role === 'de'));
  const de = await page.evaluate(() => { const b = __app.doc.boxes.find((x) => x.role === 'de'); const el = document.querySelector(`.tbox[data-id="${b.id}"] img.tb-img`); return { text: b.text, img: !!el && el.naturalWidth > 0, bg: (__app.doc.images || []).length }; });
  ok(/^!\[\]\(img:\w+\)$/.test(de.text) && de.bg === 0, 'Ctrl+V dán ảnh đề thành khung Đề bài (không thành ảnh nền)');
  await page.waitForTimeout(100);
  ok(await page.evaluate(() => [...document.querySelectorAll('.tbox img.tb-img')].every((i) => i.complete && i.naturalWidth > 0)), 'ảnh đề hiện trong khung');
  await shot('v14-khung');

  // ---- trình bày: lời giải hiện dần theo khung ----
  const nf = await page.evaluate(() => GeoCore.frames(__app.doc).length);
  await page.click('#btn-present');
  const visSteps = () => page.evaluate(() => document.querySelectorAll('.tbox.role-loigiai .tb-step').length);
  ok((await visSteps()) === 1, 'trình bày khung 1: lời giải chỉ hiện bước 1');
  await page.keyboard.press('ArrowRight');
  ok((await visSteps()) === 2, 'khung 2: hiện thêm bước 2');
  ok((await page.evaluate(() => __app.frameCount())) === Math.max(nf, 2), 'số khung trình bày tính cả bước lời giải');
  await page.keyboard.press('ArrowLeft');
  ok((await visSteps()) === 1, 'lùi khung: bước 2 ẩn lại');
  await page.keyboard.press('ArrowRight');
  await shot('v14-trinhbay');
  await page.click('#btn-exit-present');

  // ---- lưu / mở lại, chia sẻ ----
  const saved = await page.evaluate(() => GeoCore.codec.compactDoc(__app.withImageData(__app.doc)));
  ok(saved.boxes.length === 2 && Object.keys(saved.imageData || {}).length === 1, 'tệp .json lưu các khung chữ và ảnh trong khung');
  await page.evaluate((d) => __app.newTab(JSON.parse(JSON.stringify(d))), saved);
  await page.waitForTimeout(100);
  ok(await page.evaluate(() => document.querySelectorAll('.tbox').length === 2 && document.querySelector('.tbox img.tb-img') !== null), 'mở lại tệp: khung chữ và ảnh đề hiện đúng');

  // ---- xuất phiếu LaTeX ----
  const [dl] = await Promise.all([page.waitForEvent('download'), page.evaluate(() => document.getElementById('btn-latex').click())]);
  const fs = await import('node:fs');
  const tex = fs.readFileSync(await dl.path(), 'utf8');
  ok(dl.suggestedFilename().endsWith('.tex') && tex.includes('\\begin{tikzpicture}') && tex.includes('\\includegraphics') && tex.includes('\\item') && tex.includes('\\frac{A_1A_2}{2}'),
    'xuất phiếu .tex: đề (ảnh) + hình TikZ + lời giải theo bước');

  // ---- xoá khung, hoàn tác ----
  await page.hover('.tbox.role-loigiai');
  await page.click('.tbox.role-loigiai [data-a="del"]');
  await page.click('.modal .primary');
  ok((await page.evaluate(() => __app.doc.boxes.length)) === 1, 'xoá khung (có hỏi lại)');
  await page.keyboard.press('Control+z');
  ok((await page.evaluate(() => __app.doc.boxes.length)) === 2, 'hoàn tác xoá khung');

  // ---- bấm điểm khi soạn: tự bọc $…$, bấm liền nhau gộp một công thức; đổi tên điểm → chữ đổi theo ----
  await page.keyboard.press('Home');
  const nb = await page.evaluate(() => __app.textBoxes.newBox('ghichu', { fx: 0.7, fy: 0.8 }));
  await page.evaluate((id) => __app.textBoxes.edit(id), nb);
  // tạm ẩn các khung khác để không che điểm cần bấm
  await page.evaluate((id) => document.querySelectorAll('.tbox').forEach((el) => { if (el.dataset.id !== id) el.style.visibility = 'hidden'; }), nb);
  await page.keyboard.type('Tam giác ');
  const at = (nm) => page.evaluate((nm) => { const s = __app.doc.steps.find((x) => x.name === nm); const r = __app.view.canvas.getBoundingClientRect(); const q = __app.toScreen(__app.values.get(s.id)); return { x: r.left + q.x, y: r.top + q.y }; }, nm);
  for (const nm of ['A', 'B', 'C']) { const p = await at(nm); await page.mouse.click(p.x, p.y); }
  await page.keyboard.type(' có trực tâm ');
  { const p = await at('H'); await page.mouse.click(p.x, p.y); }
  await page.keyboard.press('Escape');
  await page.evaluate(() => document.querySelectorAll('.tbox').forEach((el) => { el.style.visibility = ''; }));
  const nt = () => page.evaluate((id) => __app.doc.boxes.find((b) => b.id === id).text, nb);
  ok((await nt()) === 'Tam giác $ABC$ có trực tâm $H$', `bấm điểm ngoài công thức tự bọc $…$, bấm liền A, B, C ra $ABC$ (${await nt()})`);
  await page.evaluate(() => __app.setName(__app.doc.steps.find((x) => x.name === 'H').id, 'H_1'));
  const sol = await page.evaluate(() => __app.doc.boxes.find((b) => b.role === 'loigiai').text);
  ok((await nt()) === 'Tam giác $ABC$ có trực tâm $H_1$' && sol.includes('\\angle BH_1C'), 'đổi tên H → H_1: mọi khung chữ đổi theo');
  await page.keyboard.press('Control+z');
  ok((await nt()).endsWith('$H$') && (await page.evaluate(() => __app.doc.steps.some((x) => x.name === 'H'))), 'một lần hoàn tác trả lại cả tên điểm lẫn chữ');

  // ---- Ctrl+H ẩn đối tượng đang chọn, Ctrl+Shift+H hiện lại ----
  await page.mouse.click(300, 700);
  const lid = await page.evaluate(() => { const s = __app.doc.steps.find((x) => x.type === 'segment'); __app.select(s.id); return s.id; });
  await page.keyboard.press('Control+h');
  ok(await page.evaluate((id) => __app.doc.steps.find((x) => x.id === id).hidden === true && __app.selection.size === 0, lid), 'Ctrl+H ẩn đường đang chọn');
  await page.keyboard.press('Control+Shift+h');
  ok(await page.evaluate(() => !__app.doc.steps.some((x) => x.hidden)), 'Ctrl+Shift+H hiện lại mọi đối tượng đã ẩn');

  // ---- chuyển tab bằng bàn phím ----
  await page.mouse.click(300, 700);
  const n = await page.evaluate(() => __app.tabs.length);
  await page.keyboard.press('Alt+1');
  ok((await page.evaluate(() => __app.tabIdx)) === 0, 'Alt+1: sang tab đầu');
  await page.keyboard.press('Alt+PageUp');
  ok((await page.evaluate(() => __app.tabIdx)) === n - 1, 'Alt+PageUp: vòng về tab cuối');
  await page.keyboard.press('Alt+PageDown');
  ok((await page.evaluate(() => __app.tabIdx)) === 0, 'Alt+PageDown: tab sau');
  ok(errors.length === 0, 'không có lỗi JS: ' + errors.join(' | '));
}
