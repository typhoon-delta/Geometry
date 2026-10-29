// Điểm vào giao diện (được đóng gói thành dist/app.js bằng esbuild).
import { App } from './app.js';
import { bindStepList } from './panels.js';
import { EXAMPLES } from '../core/examples.js';
import { Builder } from '../core/builder.js';
import * as core from '../core/index.js';
import { initShare, shareLink, saveFile, openFile } from './share.js';
import * as codec from '../io/codec.js';
import { setupExplore, drawRelationOverlay } from './explorePanel.js';
import { explore } from '../explore/explorer.js';
import { toTikZ } from '../export/tikz.js';
import { textDialog, toast } from './dialog.js';
import { THU_VIEN } from '../core/thu-vien.js';
import { setupTabBar } from './tabbar.js';
import { setupImages } from './images.js';
import { setupTextBoxes } from './textboxes.js';
import { toLatexHandout } from '../export/latex.js';
import { fileSafeName } from './share.js';

function start() {
  const app = new App();
  app.mount();
  bindStepList(app);

  // Thẻ bên phải
  document.querySelectorAll('.tab').forEach((t) =>
    t.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((x) => x.classList.toggle('active', x === t));
      document.querySelectorAll('.tabpane').forEach((p) => p.classList.toggle('active', p.id === t.dataset.tab));
    }));
  document.getElementById('exit-projector').onclick = () => app.setProjector(false);

  // Menu "Ví dụ": thư viện các bài đã dựng khi dùng thử (theo nhóm) + các hình mẫu dựng bằng mã
  const exMenu = document.getElementById('example-menu');
  const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const groups = [];
  for (const e of THU_VIEN) {
    let g = groups.find((x) => x.name === e.nhom);
    if (!g) groups.push((g = { name: e.nhom, items: [] }));
    g.items.push(`<button data-lib="${e.id}" title="${esc(e.de)}">${esc(e.ten)}</button>`);
  }
  groups.push({ name: 'Hình mẫu', items: Object.entries(EXAMPLES).map(([k, e]) => `<button data-example="${k}">${esc(e.title)}</button>`) });
  const GROUP_LABEL = { 'Cấu hình': 'Cấu hình hay gặp' };
  exMenu.innerHTML = groups.map((g) => `<div class="ex-col"><div class="menu-label">${esc(GROUP_LABEL[g.name] || g.name)}</div>${g.items.join('')}</div>`).join('');
  app.loadExample = (key) => {
    const ex = EXAMPLES[key];
    if (!ex) return;
    const doc = ex.build();
    doc.title = ex.title;
    app.openDoc(doc);
    app.zoomFit();
  };
  app.loadLibrary = (id) => {
    const e = THU_VIEN.find((x) => x.id === id);
    if (!e) return;
    app.openDoc(e.doc);
    app.zoomFit();
    toast(`${e.ten}. ${e.de}`, 9000);
  };
  exMenu.addEventListener('click', (e) => {
    const b = e.target.closest('[data-example], [data-lib]');
    if (b && b.dataset.example) app.loadExample(b.dataset.example);
    else if (b) app.loadLibrary(b.dataset.lib);
  });

  // Khám phá
  app.drawRelationOverlay = () => drawRelationOverlay(app);
  setupExplore(app);

  // Xuất TikZ (các đối tượng đang hiện; ở chế độ trình bày: tới khung hiện tại)
  document.getElementById('btn-tikz').onclick = () => {
    const vis = app.visibleSet();
    const doc = vis ? { ...app.doc, steps: app.doc.steps.map((s) => (vis.has(s.id) ? s : { ...s, hidden: true })) } : app.doc;
    textDialog('Mã TikZ', toTikZ(doc, { values: app.values, theme: app.theme, trimLines: app.renderer.trimLines }),
      `<div class="modal-body">Theo bộ kiểu đang chọn (<b>${app.theme === 'mono' ? 'Đơn sắc' : 'Sách giáo khoa'}</b>). Dán vào tài liệu LaTeX (chỉ cần <code>\\usepackage{tikz}</code>). Đổi kích thước bằng cách sửa <code>x=…, y=…</code>.</div>`);
  };

  // Lưu / mở / chia sẻ
  document.getElementById('btn-share').onclick = () => shareLink(app);
  document.getElementById('btn-save').onclick = () => saveFile(app);
  document.getElementById('btn-open').onclick = () => openFile(app);
  setupTabBar(app);
  setupImages(app);
  const tb = setupTextBoxes(app);
  const onClick = (id, fn) => { const el = document.getElementById(id); if (el) el.onclick = fn; };
  for (const role of ['loigiai', 'de', 'ghichu']) onClick('btn-box-' + role, () => { const id = role === 'loigiai' ? null : tb.newBox(role); if (id) { tb.render(); tb.edit(id); } else tb.editSolution(); });
  onClick('btn-rules', () => tb.editRules());
  onClick('btn-latex', () => exportLatex(app));
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); saveFile(app); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') { e.preventDefault(); openFile(app); }
  });
  initShare(app).then(() => app.renderTabs());

  // Cho phép dùng từ console / test tự động
  window.__app = app;
  window.GeoCore = { ...core, Builder, EXAMPLES, THU_VIEN, codec, explore, toTikZ };
  return app;
}

/** Tệp › Xuất phiếu LaTeX: tải tệp .tex (đề + hình TikZ + lời giải) và các ảnh trong khung chữ. */
function exportLatex(app) {
  const vis = app.visibleSet();
  const doc = vis ? { ...app.doc, steps: app.doc.steps.map((s) => (vis.has(s.id) ? s : { ...s, hidden: true })) } : app.doc;
  const { tex, files } = toLatexHandout(doc, { values: app.values, theme: app.theme, trimLines: app.renderer.trimLines, imageSrc: (id) => app.images.get(id)?.src });
  const base = fileSafeName(app.doc.title || 'phieu');
  const download = (name, href) => { const a = document.createElement('a'); a.download = name; a.href = href; document.body.appendChild(a); a.click(); setTimeout(() => a.remove(), 500); };
  const url = URL.createObjectURL(new Blob([tex], { type: 'application/x-tex' }));
  download(base + '.tex', url);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  files.forEach((f, i) => setTimeout(() => download(f.name, f.dataURL), 300 * (i + 1)));
  toast(files.length ? `Đã tải ${base}.tex và ${files.length} ảnh (để cùng thư mục rồi biên dịch bằng pdflatex)` : `Đã tải ${base}.tex (biên dịch bằng pdflatex)`, 6000);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
else start();
