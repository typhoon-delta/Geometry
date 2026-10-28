// Thẻ "Khám phá": chạy bộ khám phá, liệt kê quan hệ, bấm để tô sáng đối tượng liên quan.

import { explore } from '../explore/explorer.js';
import * as G from '../core/geom.js';
import { toast } from './dialog.js';

const TYPE_LABEL = {
  collinear: 'Thẳng hàng', concyclic: 'Đồng viên', concurrent: 'Đồng quy', parallel: 'Song song', perpendicular: 'Vuông góc',
  tangent: 'Tiếp xúc', on_circle: 'Điểm trên đường tròn', on_line: 'Điểm trên đường thẳng', coincide: 'Trùng nhau',
  same_line: 'Trùng nhau', same_circle: 'Trùng nhau',
};
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

export function setupExplore(app) {
  const pane = document.getElementById('tab-explore');
  let result = null;
  let stale = false;
  let active = -1;

  const render = () => {
    let html = `<div class="explore-head">
      <button id="btn-run-explore" class="primary">🔍 Khám phá hình này</button>
      <div class="note">Xê dịch ngẫu nhiên các điểm tự do nhiều lần, chỉ giữ quan hệ đúng trên <b>mọi</b> mẫu, bỏ quan hệ hiển nhiên từ cách dựng.</div>
    </div>`;
    if (result) {
      const st = result.stats;
      html += `<div class="explore-stats">${result.relations.length} quan hệ · ${st.samples} mẫu ngẫu nhiên (${st.attempts} lần thử) · ${st.ms} ms${stale ? ' · <b class="stale">hình đã thay đổi, hãy khám phá lại</b>' : ''}</div>`;
      if (st.samples < 5) html += `<div class="note warn">Ít mẫu hợp lệ – hình có thể gần suy biến; kết quả kém tin cậy.</div>`;
      if (!result.relations.length) html += '<div class="empty">Không tìm thấy quan hệ nào ngoài các quan hệ hiển nhiên.</div>';
      html += '<div class="rel-list">' + result.relations.map((r, i) => `<div class="rel ${i === active ? 'active' : ''}" data-i="${i}">
          <span class="rel-score" title="Điểm xếp hạng">${r.score}</span>
          <div class="rel-body"><div class="rel-type">${TYPE_LABEL[r.type] || r.type}</div><div class="rel-text">${esc(r.text)}</div>${r.note ? `<div class="rel-note">${esc(r.note)}</div>` : ''}</div>
        </div>`).join('') + '</div>';
    }
    pane.innerHTML = html;
    pane.querySelector('#btn-run-explore').onclick = run;
    pane.querySelectorAll('.rel').forEach((el) => (el.onclick = () => select(+el.dataset.i)));
  };

  const run = () => {
    const btn = pane.querySelector('#btn-run-explore');
    if (btn) { btn.disabled = true; btn.textContent = 'Đang khám phá…'; }
    document.querySelector('[data-tab="tab-explore"]').click();
    setTimeout(() => {
      try {
        result = explore(app.doc);
        stale = false;
        active = -1;
        app.setRelation(null);
        toast(`Tìm thấy ${result.relations.length} quan hệ`);
      } catch (e) {
        console.error(e);
        toast('Lỗi khi khám phá: ' + e.message, 5000);
      }
      render();
    }, 30);
  };

  const select = (i) => {
    active = active === i ? -1 : i;
    app.setRelation(active >= 0 ? result.relations[active] : null);
    render();
  };

  app.on('change', () => {
    if (result && !stale) { stale = true; render(); }
  });
  const top = document.getElementById('btn-explore');
  if (top) top.onclick = run;
  render();
}

/** Vẽ phần phụ trợ cho quan hệ đang chọn (đường thẳng/đường tròn đứt nét, điểm đồng quy). */
export function drawRelationOverlay(app) {
  const r = app.relation;
  if (!r) return;
  const R = app.renderer;
  const V = (id) => app.values.get(id);
  const st = { strokeColor: '#f59e0b', strokeWidth: 2.2 * (app.projector ? 1.9 : 1), dash: 2 };
  const pt = (id) => R.addExtra('point', [() => V(id)?.x ?? NaN, () => V(id)?.y ?? NaN], { visible: false });
  if (r.type === 'collinear') {
    // đường qua hai điểm xa nhau nhất
    const ids = r.ids;
    let best = [ids[0], ids[1]], bd = -1;
    for (const a of ids) for (const b of ids) { const d = V(a) && V(b) ? G.dist(V(a), V(b)) : 0; if (d > bd) { bd = d; best = [a, b]; } }
    R.addExtra('line', best.map(pt), st);
  } else if (r.type === 'concyclic') {
    R.addExtra('circumcircle', r.ids.slice(0, 3).map(pt), { ...st, center: { visible: false } });
  } else if (r.type === 'concurrent') {
    const common = () => {
      const [a, b, ...rest] = r.ids.map(V);
      if (!a || !b) return null;
      const roots = G.intersect(a, b);
      let best = null, bd = Infinity;
      for (const X of roots) {
        const d = rest.reduce((s, c) => s + (c ? G.distToObject(c, X) : 1e9), 0);
        if (d < bd) { bd = d; best = X; }
      }
      return best;
    };
    R.addExtra('point', [() => common()?.x ?? NaN, () => common()?.y ?? NaN], { size: 7 * (app.projector ? 1.9 : 1), strokeColor: '#f59e0b', fillColor: '#fde68a', strokeWidth: 2 });
  }
  app.board.update();
}
