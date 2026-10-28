// Điểm vào giao diện (được đóng gói thành dist/app.js bằng esbuild).
import { App } from './app.js';
import { bindStepList } from './panels.js';
import { EXAMPLES } from '../core/examples.js';
import { Builder } from '../core/builder.js';
import * as core from '../core/index.js';

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

  // Cho phép dùng từ console / test tự động
  window.__app = app;
  window.GeoCore = { ...core, Builder, EXAMPLES };
  return app;
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
else start();
