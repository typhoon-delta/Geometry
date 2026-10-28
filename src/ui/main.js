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
import { textDialog } from './dialog.js';

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

  // Menu ví dụ
  const sel = document.getElementById('sel-example');
  if (sel) {
    sel.innerHTML = '<option value="">Ví dụ…</option>' + Object.entries(EXAMPLES).map(([k, e]) => `<option value="${k}">${e.title}</option>`).join('');
    sel.onchange = () => {
      const ex = EXAMPLES[sel.value];
      sel.value = '';
      if (!ex) return;
      const doc = ex.build();
      doc.title = ex.title;
      app.loadDoc(doc, { keepHistory: true });
      app.zoomFit();
    };
  }

  // Khám phá
  app.drawRelationOverlay = () => drawRelationOverlay(app);
  setupExplore(app);

  // Xuất TikZ (các đối tượng đang hiện; ở chế độ trình bày: tới khung hiện tại)
  document.getElementById('btn-tikz').onclick = () => {
    const vis = app.visibleSet();
    const doc = vis ? { ...app.doc, steps: app.doc.steps.map((s) => (vis.has(s.id) ? s : { ...s, hidden: true })) } : app.doc;
    textDialog('Mã TikZ', toTikZ(doc, { values: app.values }),
      '<div class="modal-body">Dán vào tài liệu LaTeX (chỉ cần <code>\\usepackage{tikz}</code>). Đổi kích thước bằng cách sửa <code>x=…, y=…</code>.</div>');
  };

  // Lưu / mở / chia sẻ
  document.getElementById('btn-share').onclick = () => shareLink(app);
  document.getElementById('btn-save').onclick = () => saveFile(app);
  document.getElementById('btn-open').onclick = () => openFile(app);
  const title = document.getElementById('doc-title');
  app.on('change', () => { if (document.activeElement !== title) title.value = app.doc.title || ''; });
  title.onchange = () => app.commit((doc) => { doc.title = title.value.trim(); });
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); saveFile(app); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') { e.preventDefault(); openFile(app); }
  });
  initShare(app).then(() => { title.value = app.doc.title || ''; });

  // Cho phép dùng từ console / test tự động
  window.__app = app;
  window.GeoCore = { ...core, Builder, EXAMPLES, codec, explore, toTikZ };
  return app;
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
else start();
