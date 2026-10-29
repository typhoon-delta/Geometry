// KHUNG CHỮ nổi trên bảng vẽ (bản 1.4): đề bài, lời giải, ghi chú – chữ + công thức LaTeX (KaTeX), ảnh dán vào.
//
// doc.boxes = [{id, role: 'de'|'loigiai'|'ghichu', title?, text, anchor: 'screen'|'figure'|'point',
//               fx, fy (gắn màn hình: góc trên-trái theo tỉ lệ khung vẽ) | x, y (gắn hình: toạ độ hình) |
//               pt, dx, dy (gắn điểm: id điểm + độ lệch px), w (px), h (px hoặc null = tự cao), font (hệ số cỡ chữ),
//               collapsed?, from? (khung trình bày 1-based bắt đầu hiện)}]
// Khung là phần tử HTML đặt trên canvas; vị trí tính lại khi dời/phóng hình và mỗi khung hình khi kéo điểm.
// Văn bản chia bước bằng dòng "---" (markup.js); khi trình bày, bước k hiện từ khung trình bày tương ứng.
import { splitSteps, stepFrames, renderStep } from '../text/markup.js';
import { createEditor } from '../text/editor.js';
import { defaultRules, parseRules, serializeRules } from '../text/snippets.js';
import { kinds, frames } from '../core/model.js';
import { confirmDialog, toast } from './dialog.js';
import { escapeHTML } from './app.js';

const ROLE = { de: 'Đề bài', loigiai: 'Lời giải', ghichu: 'Ghi chú' };
const ANCHOR = { screen: 'Gắn màn hình (đứng yên khi dời/phóng hình)', figure: 'Gắn hình (đi theo hình)', point: 'Gắn điểm (bám theo điểm gần nhất)' };
const ic = (body) => `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
const ANCHOR_ICON = {
  screen: ic('<rect x="2" y="3" width="12" height="9" rx="1.5"/><path d="M6 14.5h4"/>'),
  figure: ic('<circle cx="8" cy="8" r="4.5"/><path d="M8 1.5v3M8 11.5v3M1.5 8h3M11.5 8h3"/>'),
  point: ic('<circle cx="8" cy="8" r="2.2" fill="currentColor"/><circle cx="8" cy="8" r="5.5" stroke-dasharray="2 2.2"/>'),
};
const TOOL_ICON = {
  smaller: ic('<path d="M3 12.5L6.5 4l3.5 8.5M4.3 9.5h4.4"/><path d="M11.5 8h3"/>'),
  bigger: ic('<path d="M2.5 12.5L6 4l3.5 8.5M3.8 9.5h4.4"/><path d="M11 8h4M13 6v4"/>'),
  collapse: ic('<path d="M4 6l4 4 4-4"/>'),
  del: ic('<path d="M4.5 4.5l7 7M11.5 4.5l-7 7"/>'),
};
const RULES_KEY = 'hinh-hoc-dong:go-tat';

export function loadRules() {
  try { const t = localStorage.getItem(RULES_KEY); if (t) return parseRules(t); } catch { /* bỏ qua */ }
  return defaultRules();
}
function saveRules(text) {
  try { localStorage.setItem(RULES_KEY, text); } catch { /* bỏ qua */ }
}

export function setupTextBoxes(app) {
  const stage = document.getElementById('stage');
  const layer = document.createElement('div');
  layer.id = 'tb-layer';
  stage.appendChild(layer);
  const els = new Map(); // id → {el, body, key}
  let editing = null; // {id, ed, preview}
  let rules = loadRules();

  const boxes = () => app.doc.boxes || [];
  const byId = (id) => boxes().find((b) => b.id === id);
  const W = () => app.view.W, H = () => app.view.H;
  const projector = () => (app.projector ? 1.6 : 1);
  const pointNames = () => { const k = kinds(app.doc); return app.doc.steps.filter((s) => k.get(s.id) === 'point' && s.name).map((s) => ({ name: s.name, id: s.id })); };

  // ---------- vị trí ----------
  function screenPos(b) {
    if (b.anchor === 'figure') return app.toScreen({ x: b.x, y: b.y });
    if (b.anchor === 'point') {
      const v = app.values.get(b.pt);
      if (v) { const q = app.toScreen(v); return { x: q.x + b.dx, y: q.y + b.dy }; }
    }
    return { x: (b.fx ?? 0.02) * W(), y: (b.fy ?? 0.03) * H() };
  }
  function layout() {
    // đọc hết kích thước trước rồi mới ghi vị trí: không bắt trình duyệt tính lại bố cục giữa chừng (gọi mỗi khung khi kéo)
    const todo = [];
    for (const b of boxes()) {
      const r = els.get(b.id);
      if (!r || r.el.style.display === 'none') continue;
      const p = screenPos(b);
      // khung gắn màn hình luôn nằm trong khung vẽ (vd khi mở bảng bên làm khung vẽ hẹp lại)
      if ((b.anchor || 'screen') === 'screen') {
        p.x = Math.max(4, Math.min(p.x, W() - r.el.offsetWidth - 8));
        p.y = Math.max(4, Math.min(p.y, H() - Math.min(r.el.offsetHeight, 60) - 8));
      }
      todo.push([r.el, `translate(${Math.round(p.x)}px, ${Math.round(p.y)}px)`]);
    }
    for (const [el, t] of todo) if (el.style.transform !== t) el.style.transform = t;
  }
  /** Đặt lại toạ độ neo của khung sao cho góc trên-trái ở (px, py) trên màn hình. */
  function placeAt(b, px, py) {
    if (b.anchor === 'figure') { const P = app.toUser(px, py); b.x = round(P.x); b.y = round(P.y); }
    else if (b.anchor === 'point' && app.values.get(b.pt)) { const q = app.toScreen(app.values.get(b.pt)); b.dx = Math.round(px - q.x); b.dy = Math.round(py - q.y); }
    else { b.fx = round(px / W()); b.fy = round(py / H()); }
  }

  // ---------- vẽ ----------
  function render() {
    const present = app.mode === 'present';
    const fi = present ? app.frameIdx : Infinity;
    const live = new Set();
    const names = pointNames();
    const nameKey = names.map((n) => n.name + n.id).join(',');
    for (const b of boxes()) {
      live.add(b.id);
      let r = els.get(b.id);
      if (!r) r = create(b);
      const visible = !present || !b.from || fi >= b.from - 1;
      r.el.style.display = visible ? '' : 'none';
      r.el.classList.toggle('collapsed', !!b.collapsed);
      r.el.className = r.el.className.replace(/\brole-\w+/, 'role-' + (b.role || 'ghichu'));
      r.el.style.width = b.w ? b.w + 'px' : '';
      r.el.style.height = b.h && !b.collapsed ? b.h + 'px' : '';
      r.el.style.setProperty('--tb-font', `${(15 * (b.font || 1) * projector()).toFixed(1)}px`);
      r.title.textContent = b.title || ROLE[b.role] || 'Ghi chú';
      if (r.anchor !== (b.anchor || 'screen')) { r.anchor = b.anchor || 'screen'; r.anchorBtn.innerHTML = ANCHOR_ICON[r.anchor]; }
      r.anchorBtn.title = ANCHOR[b.anchor || 'screen'] + ' – bấm để đổi';
      if (editing && editing.id === b.id) continue;
      const key = [b.text, present, fi, nameKey, b.from].join('\u0001');
      if (r.key !== key) {
        r.key = key;
        r.body.innerHTML = bodyHTML(b, present, fi, names);
      }
    }
    for (const [id, r] of els) if (!live.has(id)) { if (editing && editing.id === id) stopEdit(false); r.el.remove(); els.delete(id); }
    layout();
  }

  function bodyHTML(b, present, fi, names) {
    if (!b.text || !b.text.trim()) return present ? '' : '<div class="tb-empty">Nháy đúp để soạn…</div>';
    const steps = splitSteps(b.text);
    const fr = stepFrames(steps, b.from ? b.from - 1 : 0);
    const image = (id) => app.images.get(id)?.src || null;
    let shown = 0;
    const parts = steps.map((s, i) => {
      if (present && fr[i] > fi) return '';
      shown = i;
      const head = steps.length > 1 && !present ? `<div class="tb-step-mark" title="Bước ${i + 1} hiện ở khung trình bày ${fr[i] + 1}">bước ${i + 1} · khung ${fr[i] + 1}</div>` : '';
      return `<div class="tb-step" data-step="${i}">${head}${renderStep(s.text, { names, image })}</div>`;
    });
    if (present && steps.length > 1) parts[shown] = parts[shown].replace('class="tb-step"', 'class="tb-step tb-new"');
    return parts.join('');
  }

  function create(b) {
    const el = document.createElement('div');
    el.className = 'tbox role-' + (b.role || 'ghichu');
    el.dataset.id = b.id;
    el.innerHTML = `<div class="tb-head"><span class="tb-title"></span><span class="tb-tools">
      <button data-a="anchor"></button><button data-a="smaller" title="Chữ nhỏ hơn">${TOOL_ICON.smaller}</button><button data-a="bigger" title="Chữ to hơn">${TOOL_ICON.bigger}</button>
      <button data-a="collapse" title="Thu gọn / mở">${TOOL_ICON.collapse}</button><button data-a="del" title="Xoá khung">${TOOL_ICON.del}</button></span></div><div class="tb-body"></div>`;
    layer.appendChild(el);
    const r = { el, body: el.querySelector('.tb-body'), title: el.querySelector('.tb-title'), anchorBtn: el.querySelector('[data-a="anchor"]'), key: null };
    els.set(b.id, r);
    el.querySelector('.tb-head').addEventListener('pointerdown', (e) => { if (!e.target.closest('button')) startMove(e, b.id); });
    el.querySelector('.tb-tools').addEventListener('click', (e) => { const a = e.target.closest('[data-a]'); if (a) action(b.id, a.dataset.a); });
    r.body.addEventListener('dblclick', () => { if (app.mode === 'edit') edit(b.id); });
    // đổi cỡ bằng góc dưới phải (CSS resize) → lưu khi thả chuột
    el.addEventListener('pointerup', () => setTimeout(() => saveSize(b.id), 0));
    return r;
  }

  function saveSize(id) {
    const b = byId(id), r = els.get(id);
    if (!b || !r || b.collapsed) return;
    const w = Math.round(r.el.offsetWidth), h = Math.round(r.el.offsetHeight);
    const autoH = !b.h && Math.abs(h - r.el.scrollHeight) < 3;
    if (Math.abs(w - (b.w || 0)) > 2 || (!autoH && Math.abs(h - (b.h || 0)) > 2)) app.commit(() => { b.w = w; if (!autoH) b.h = h; });
  }

  function startMove(e, id) {
    e.preventDefault();
    e.stopPropagation();
    const b = byId(id), r = els.get(id);
    const st = stage.getBoundingClientRect();
    const p0 = screenPos(b), m0 = { x: e.clientX, y: e.clientY };
    let moved = false, p = p0;
    const move = (ev) => {
      p = { x: p0.x + ev.clientX - m0.x, y: p0.y + ev.clientY - m0.y };
      // hít vào mép khung vẽ
      const w = r.el.offsetWidth, h = r.el.offsetHeight;
      if (Math.abs(p.x - 8) < 14) p.x = 8;
      if (Math.abs(p.y - 8) < 14) p.y = 8;
      if (Math.abs(p.x + w - (st.width - 8)) < 14) p.x = st.width - 8 - w;
      if (Math.abs(p.y + h - (st.height - 8)) < 14) p.y = st.height - 8 - h;
      moved = true;
      r.el.style.transform = `translate(${Math.round(p.x)}px, ${Math.round(p.y)}px)`;
    };
    const up = () => {
      window.removeEventListener('pointermove', move, true);
      window.removeEventListener('pointerup', up, true);
      if (moved) app.commit(() => placeAt(b, p.x, p.y));
    };
    window.addEventListener('pointermove', move, true);
    window.addEventListener('pointerup', up, true);
  }

  async function action(id, a) {
    const b = byId(id);
    if (!b) return;
    if (a === 'smaller' || a === 'bigger') app.commit(() => { b.font = Math.max(0.6, Math.min(3, round((b.font || 1) * (a === 'bigger' ? 1.15 : 1 / 1.15)))); });
    else if (a === 'collapse') app.commit(() => { b.collapsed = !b.collapsed; });
    else if (a === 'anchor') {
      const p = screenPos(b);
      const next = { screen: 'figure', figure: 'point', point: 'screen' }[b.anchor || 'screen'];
      if (next === 'point') {
        // điểm gần góc trên-trái của khung nhất
        let best = null;
        for (const n of pointNames()) { const v = app.values.get(n.id); if (!v) continue; const q = app.toScreen(v); const d = Math.hypot(q.x - p.x, q.y - p.y); if (!best || d < best.d) best = { d, id: n.id, name: n.name }; }
        if (!best) { app.commit(() => { b.anchor = 'screen'; placeAt(b, p.x, p.y); }); return; }
        app.commit(() => { b.anchor = 'point'; b.pt = best.id; placeAt(b, p.x, p.y); });
        toast(`Khung gắn vào điểm ${best.name}`);
      } else app.commit(() => { b.anchor = next; placeAt(b, p.x, p.y); });
    } else if (a === 'del') {
      if (b.text && b.text.trim() && !(await confirmDialog('Xoá khung', `Xoá khung <b>${escapeHTML(b.title || ROLE[b.role] || 'Ghi chú')}</b>? (Hoàn tác được bằng Ctrl+Z.)`, 'Xoá'))) return;
      app.commit((doc) => { doc.boxes = boxes().filter((x) => x.id !== id); if (!doc.boxes.length) delete doc.boxes; });
    }
  }

  // ---------- soạn tại chỗ ----------
  function edit(id, { atEnd = false } = {}) {
    if (editing && editing.id === id) { editing.ed.focus(); return; }
    if (editing) stopEdit(true);
    const b = byId(id), r = els.get(id);
    if (!b || !r) return;
    if (b.collapsed) app.commit(() => { b.collapsed = false; });
    r.el.classList.add('editing');
    r.body.innerHTML = '<div class="tb-editor"></div><div class="tb-preview"></div>';
    const preview = r.body.querySelector('.tb-preview');
    let timer = null;
    const showPreview = (text) => {
      preview.innerHTML = text.trim() ? splitSteps(text).map((s) => `<div class="tb-step">${renderStep(s.text, { names: pointNames(), image: (iid) => app.images.get(iid)?.src || null })}</div>`).join('') : '';
    };
    const ed = createEditor(r.body.querySelector('.tb-editor'), {
      text: b.text || '',
      rules: () => rules,
      names: () => pointNames().map((n) => n.name),
      onChange: (t) => { clearTimeout(timer); timer = setTimeout(() => showPreview(t), 120); },
      onDone: (save) => stopEdit(save),
    });
    showPreview(b.text || '');
    editing = { id, ed };
    app.textEditing = editing;
    ed.focus();
    if (atEnd) ed.view.dispatch({ selection: { anchor: ed.view.state.doc.length } });
  }

  function stopEdit(save) {
    if (!editing) return;
    const { id, ed } = editing;
    const text = ed.text();
    ed.destroy();
    editing = null;
    app.textEditing = null;
    const r = els.get(id);
    if (r) { r.el.classList.remove('editing'); r.key = null; }
    const b = byId(id);
    if (save && b && text !== (b.text || '')) app.commit(() => { b.text = text; });
    else render();
  }

  // bấm ra ngoài khung đang soạn: bấm trúng một ĐIỂM trên hình → chèn tên điểm; chỗ khác → xong
  document.addEventListener('pointerdown', (e) => {
    if (!editing) return;
    const r = els.get(editing.id);
    if (r && r.el.contains(e.target)) return;
    if (e.target.closest('.cm-tooltip, .modal-back')) return;
    if (e.target.closest('#board')) {
      const st = app.view.canvas.getBoundingClientRect();
      const h = app.hitTest(e.clientX - st.left, e.clientY - st.top).find((x) => x.kind === 'point');
      e.stopPropagation();
      e.preventDefault();
      if (h) { editing.ed.insertName(app.doc.steps.find((s) => s.id === h.id).name); return; }
    }
    stopEdit(true);
  }, true);

  // ---------- tạo khung ----------
  function newBox(role, extra = {}) {
    const id = 'tb' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    const w = role === 'loigiai' ? 380 : role === 'de' ? 420 : 260;
    const b = { id, role, text: '', anchor: 'screen', w, ...extra };
    if (b.fx == null && b.anchor === 'screen') {
      if (role === 'loigiai') { b.fx = round(Math.max(0.02, (W() - w - 12) / W())); b.fy = round(12 / H()); }
      else if (role === 'de') { b.fx = round(12 / W()); b.fy = round(12 / H()); }
      else { b.fx = round(Math.max(0.02, (W() / 2 - w / 2) / W())); b.fy = 0.35; }
    }
    app.commit((doc) => { (doc.boxes ||= []).push(b); });
    return id;
  }

  /** Ảnh (data URL) → khung Đề bài (hoặc chèn vào khung đang soạn). */
  function pasteImage(src, wpx) {
    const imgId = 'img' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    app.registerImage(imgId, src);
    if (editing) { editing.ed.insert(`![](img:${imgId})`); return; }
    const hasDe = boxes().some((b) => b.role === 'de');
    const w = Math.round(Math.min(wpx + 24, W() * 0.45));
    const id = newBox(hasDe ? 'ghichu' : 'de', { w, text: `![](img:${imgId})`, ...(hasDe ? { title: 'Ảnh' } : {}) });
    toast(hasDe ? 'Đã dán ảnh thành một khung mới' : 'Đã dán ảnh thành khung Đề bài – kéo thanh tiêu đề để dời, kéo góc để đổi cỡ', 4500);
    return id;
  }

  async function editRules() {
    const { textDialogEditable } = await import('./dialog.js');
    const t = await textDialogEditable('Gõ tắt và tự đổi', serializeRules(rules),
      'Mỗi dòng: <code>chuỗi gõ =&gt; thay bằng</code>. <b>[tự đổi]</b>: trong công thức, gõ xong là đổi. <b>[gõ tắt]</b>: gõ rồi nhấn Tab. <code>${}</code> là ô nhảy (Tab để sang ô tiếp), <code>\\n</code> là xuống dòng.', 'Mặc định');
    if (t == null) return;
    if (t === '\u0000default') { rules = defaultRules(); saveRules(serializeRules(rules)); toast('Đã đặt lại bộ gõ tắt mặc định'); return; }
    rules = parseRules(t);
    saveRules(t);
    toast(`Đã lưu ${rules.auto.length} quy tắc tự đổi, ${rules.short.length} gõ tắt`);
  }

  // ---------- nối với ứng dụng ----------
  app.on('change', render);
  app.on('load', () => { if (editing) stopEdit(false); render(); });
  app.on('refresh', render);
  app.view.onViewChange(layout);
  app.view.afterPaint = layout;
  window.addEventListener('resize', layout);

  // rê chuột lên tên điểm trong công thức → tô sáng điểm trên hình
  let hoverId = null;
  layer.addEventListener('mouseover', (e) => {
    const t = e.target.closest('[data-p]');
    const id = t ? t.dataset.p : null;
    if (id === hoverId) return;
    hoverId = id;
    app.setHover(id ? [id] : null);
  });
  layer.addEventListener('mouseleave', () => { if (hoverId) { hoverId = null; app.setHover(null); } });

  const api = {
    render, layout, edit, stopEdit, newBox, pasteImage, editRules,
    get editing() { return editing; },
    /** Ctrl+Enter: soạn khung lời giải (tạo mới nếu chưa có), con trỏ ở cuối. */
    editSolution() {
      let b = boxes().find((x) => x.role === 'loigiai');
      const id = b ? b.id : newBox('loigiai');
      render();
      edit(id, { atEnd: true });
    },
    /** Khung trình bày cuối cùng mà chữ cần (để trình bày đi hết các bước lời giải). */
    lastFrame() {
      let m = 0;
      for (const b of boxes()) { const st = splitSteps(b.text); const fr = stepFrames(st, b.from ? b.from - 1 : 0); m = Math.max(m, fr[fr.length - 1] || 0, b.from ? b.from - 1 : 0); }
      return m;
    },
  };
  app.textBoxes = api;
  void frames;
  render();
  return api;
}

const round = (x) => Math.round(x * 1e4) / 1e4;
