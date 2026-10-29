// Dải tab hình trên thanh trên (bản 1.3): bấm để đổi hình, nháy đúp vào tab đang mở để đặt tên, ✕ để đóng, ＋ hình mới.
import { escapeHTML } from './app.js';

export function setupTabBar(app) {
  const host = document.getElementById('tabbar');
  if (!host) return;
  const label = (doc, i) => doc.title || `Hình ${i + 1}`;
  const render = () => {
    if (host.querySelector('input')) return; // đang đặt tên
    host.innerHTML = app.tabs.map((t, i) => {
      const doc = i === app.tabIdx ? app.doc : t.doc;
      return `<div class="dtab${i === app.tabIdx ? ' active' : ''}" data-tab="${i}" title="${escapeHTML(label(doc, i))}${i === app.tabIdx ? ' – nháy đúp để đặt tên' : ''}">
        <span class="dt-name">${escapeHTML(label(doc, i))}</span><button class="dt-x" data-close="${i}" title="Đóng hình">✕</button></div>`;
    }).join('') + '<button id="tab-new" class="dt-new" title="Hình mới (tab mới)">＋</button>';
    host.querySelector('.dtab.active')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  };
  app.renderTabs = render;
  app.on('change', render);
  app.on('load', render);
  host.addEventListener('click', (e) => {
    const x = e.target.closest('[data-close]');
    if (x) { e.stopPropagation(); app.closeTab(+x.dataset.close); return; }
    if (e.target.closest('#tab-new')) { app.newTab(); return; }
    const t = e.target.closest('[data-tab]');
    if (t) app.switchTab(+t.dataset.tab);
  });
  host.addEventListener('dblclick', (e) => {
    const t = e.target.closest('.dtab.active');
    if (!t) return;
    const name = t.querySelector('.dt-name');
    const inp = document.createElement('input');
    inp.className = 'dt-input';
    inp.value = app.doc.title || '';
    inp.placeholder = 'Tên hình…';
    name.replaceWith(inp);
    inp.focus();
    inp.select();
    let done = false;
    const finish = (save) => {
      if (done) return;
      done = true;
      const v = inp.value.trim();
      inp.remove();
      if (save && v !== (app.doc.title || '')) app.commit((doc) => { doc.title = v; });
      render();
    };
    inp.addEventListener('keydown', (ev) => {
      ev.stopPropagation();
      if (ev.key === 'Enter') finish(true);
      else if (ev.key === 'Escape') finish(false);
    });
    inp.addEventListener('blur', () => finish(true));
  });
  render();
}
