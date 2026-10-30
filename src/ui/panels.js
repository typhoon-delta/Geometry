// Bảng bên phải: danh sách bước dựng (giao thức dựng hình) và thuộc tính đối tượng đang chọn.

import { kinds, frames, stepById, paramsOf } from '../core/model.js';
import { STEP_TYPES } from '../core/steps.js';
import { intersect } from '../core/geom.js';
import { PALETTE, styleOf, isDraggableType } from '../core/styles.js';
import { labelHTML } from '../core/names.js';
import { TOOL_BY_ID } from './tools.js';

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function stepTitle(doc, s, values = null) {
  const def = STEP_TYPES[s.type];
  const n = (a) => stepById(doc, a)?.name || '?';
  let label = def ? def.label : s.type;
  const p = paramsOf(s);
  if (s.type === 'arc_midpoint') label += p.contains ? ' (chứa đỉnh)' : ' (không chứa đỉnh)';
  if (s.type === 'angle_bisector' && p.external) label = 'Phân giác ngoài';
  if (s.type === 'intersection' && values && intersectCount(values, s) === 2) label += ` (nghiệm ${p.which + 1})`;
  if (s.type === 'free_point' || !s.args.length) return label;
  let args = s.args.map(n);
  if (s.type === 'intersection_other') return `${label} của ${args[0]}, ${args[1]} (khác ${args[2]})`;
  if (s.type === 'angle_mark') return `${label} ${args.join('')}`;
  return `${label} (${args.join(', ')})`;
}

function intersectCount(values, s) {
  return intersect(values.get(s.args[0]), values.get(s.args[1])).length;
}

export function renderStepList(app) {
  const host = document.getElementById('steps');
  if (!host) return;
  const doc = app.doc;
  const fr = frames(doc);
  const frameOf = new Map();
  fr.forEach((ids, i) => ids.forEach((id) => frameOf.set(id, i)));
  const k = kinds(doc);
  const present = app.mode === 'present';
  if (!doc.steps.length) {
    host.innerHTML = '<div class="empty">Chưa có bước dựng nào.<br>Chọn công cụ bên trái rồi bấm lên bảng vẽ.<br><br>Hoặc mở <b>Ví dụ</b> ở thanh trên.</div>';
    return;
  }
  let lastFrame = -1;
  const rows = doc.steps.map((s, i) => {
    const f = frameOf.get(s.id);
    const st = styleOf(s, k.get(s.id), app.theme);
    const cls = ['step'];
    if (app.selection.has(s.id)) cls.push('sel');
    if (app.highlight.has(s.id)) cls.push('hl');
    if (s.hidden) cls.push('hidden');
    if (present && f > app.frameIdx) cls.push('future');
    if (present && f === app.frameIdx) cls.push('current');
    const newFrame = f !== lastFrame;
    lastFrame = f;
    const valid = !!app.values.get(s.id);
    return `<div class="${cls.join(' ')}${newFrame ? ' frame-start' : ''}" data-id="${s.id}">
      <span class="sn">${newFrame ? `<span class="fbadge" title="Khung trình bày">${f + 1}</span>` : ''}</span>
      <button class="eye" data-act="eye" title="${s.hidden ? 'Hiện' : 'Ẩn'}">${s.hidden ? '◌' : '●'}</button>
      <span class="dot" style="background:${esc(st.fillColor && k.get(s.id) === 'point' ? st.fillColor : st.color)}"></span>
      <span class="nm">${s.name ? labelHTML(s.name) : ''}</span>
      <span class="ds">${esc(stepTitle(doc, s, app.values))}${valid ? '' : ' <i class="undef">(không xác định)</i>'}</span>
      <button class="join ${s.joinPrev ? 'on' : ''}" data-act="join" title="Gộp vào cùng khung trình bày với bước phía trên" ${i === 0 ? 'disabled' : ''}>⤒</button>
    </div>`;
  });
  host.innerHTML = rows.join('');
  const sel = host.querySelector('.step.sel, .step.current');
  if (sel && !host.dataset.noScroll) sel.scrollIntoView({ block: 'nearest' });
}

export function bindStepList(app) {
  const host = document.getElementById('steps');
  host.addEventListener('click', (e) => {
    const row = e.target.closest('.step');
    if (!row) return;
    const id = row.dataset.id;
    const act = e.target.closest('[data-act]')?.dataset.act;
    const s = stepById(app.doc, id);
    if (act === 'eye') return app.setStepProp(id, 'hidden', !s.hidden);
    if (act === 'join') return app.setStepProp(id, 'joinPrev', !s.joinPrev);
    if (app.mode === 'present') {
      const fr = frames(app.doc);
      const i = fr.findIndex((ids) => ids.includes(id));
      if (i >= 0) app.gotoFrame(i);
      return;
    }
    app.select(id, e.shiftKey || e.ctrlKey || e.metaKey);
  });
  host.addEventListener('dblclick', (e) => {
    const row = e.target.closest('.step');
    if (row && app.mode !== 'present') app.renameStep(row.dataset.id);
  });
}

export function renderProps(app) {
  const host = document.getElementById('props');
  if (!host) return;
  // ảnh dán vào hình đang chọn (bản 1.3)
  const im = app.imageSel && app.toolId === 'move' && app.mode !== 'present' ? (app.doc.images || []).find((x) => x.id === app.imageSel) : null;
  if (im) {
    host.classList.add('show');
    host.innerHTML = `<div class="prop-title">Ảnh dán vào hình</div>
      <label class="row">Độ đậm <input id="p-img-op" type="range" min="0.1" max="1" step="0.05" value="${im.opacity ?? 1}"></label>
      <label class="row"><input id="p-img-lock" type="checkbox"> Khoá làm nền (không chọn, không kéo được; mở lại ở Sửa › Mở khoá các ảnh nền)</label>
      <div class="note">Kéo ảnh để dời, kéo ô vuông ở góc dưới phải để đổi cỡ. Ảnh được lưu trong tệp .json (không có trong link chia sẻ).</div>
      <div class="row"><button id="p-img-del" class="danger">Xoá ảnh</button></div>`;
    host.querySelector('#p-img-op').onchange = (e) => app.setImageProp(im.id, { opacity: +e.target.value });
    host.querySelector('#p-img-lock').onchange = (e) => { if (e.target.checked) { app.setImageProp(im.id, { locked: true }); app.selectImage(null); } };
    host.querySelector('#p-img-del').onclick = () => app.deleteImage(im.id);
    return;
  }
  const ids = [...app.selection].filter((id) => stepById(app.doc, id));
  // Thẻ thuộc tính chỉ hiện với công cụ Chọn: khi đang dựng, đối tượng vừa dựng được chọn sẵn (để gõ tên)
  // nhưng thẻ không được nổi lên che hình và chặn lần bấm tiếp theo.
  const show = ids.length > 0 && app.mode !== 'present' && app.toolId === 'move';
  host.classList.toggle('show', show);
  if (!show) {
    host.innerHTML = '';
    return;
  }
  const k = kinds(app.doc);
  const steps = ids.map((id) => stepById(app.doc, id));
  const s = steps[0];
  const kind = k.get(s.id);
  const st = styleOf(s, kind, app.theme);
  const one = steps.length === 1;
  const allKinds = new Set(steps.map((x) => k.get(x.id)));
  const swatches = PALETTE.map((c) => `<button class="sw ${st.color === c.hex ? 'on' : ''}" data-color="${c.hex}" title="${c.name}" style="background:${c.hex}"></button>`).join('');
  let html = '';
  if (one) {
    html += `<div class="prop-title">${s.name ? `<b>${labelHTML(s.name)}</b> · ` : ''}${esc(stepTitle(app.doc, s, app.values))}</div>`;
    if (s.name) html += `<label class="row">Tên <input id="p-name" type="text" value="${esc(s.name)}"></label>`;
  } else {
    html += `<div class="prop-title">Đang chọn ${steps.length} đối tượng</div>`;
  }
  html += `<div class="row">Màu <span class="swatches">${swatches}</span></div>`;
  if (allKinds.has('line') || allKinds.has('circle') || allKinds.has('mark')) {
    html += `<label class="row">Độ dày nét <select id="p-width">${[1, 1.6, 2.5, 3.5].map((w) => `<option value="${w}" ${st.width === w ? 'selected' : ''}>${w}</option>`).join('')}</select></label>`;
  }
  if (allKinds.has('line') || allKinds.has('circle')) html += `<label class="row"><input id="p-dash" type="checkbox" ${st.dash ? 'checked' : ''}> Nét đứt</label>`;
  if (allKinds.has('circle') || s.type === 'polygon') {
    const f = st.fill || 0;
    html += `<label class="row">Tô nền nhạt <input id="p-fill" type="range" min="0" max="0.4" step="0.04" value="${f}"></label>`;
  }
  if (allKinds.has('point')) html += `<label class="row">Cỡ điểm <select id="p-size">${[2, 3, 4, 5].map((w) => `<option ${st.size === w ? 'selected' : ''}>${w}</option>`).join('')}</select></label>`;
  if (one && kind !== 'mark') html += `<label class="row"><input id="p-label" type="checkbox" ${st.showLabel ? 'checked' : ''}> Hiện nhãn</label>`;
  if (one && s.type === 'angle_mark') html += `<div class="row">Số cung ${[1, 2, 3].map((n) => `<button class="mini ${st.arcs === n ? 'on' : ''}" data-arcs="${n}">${n}</button>`).join('')}</div>`;
  if (one && s.type === 'segment_mark') html += `<div class="row">Số vạch ${[1, 2, 3].map((n) => `<button class="mini ${st.ticks === n ? 'on' : ''}" data-ticks="${n}">${n}</button>`).join('')}</div>`;
  if (one && s.type === 'polygon') html += `<label class="row"><input id="p-border" type="checkbox" ${st.border ? 'checked' : ''}> Vẽ viền</label>`;
  if (one && s.type === 'intersection' && intersectCount(app.values, s) === 2) html += `<div class="row"><button id="p-swap" class="mini wide">Đổi sang giao điểm còn lại</button></div>`;
  if (one && s.type === 'arc_midpoint') html += `<div class="row"><button id="p-arc" class="mini wide">Đổi sang cung ${paramsOf(s).contains ? 'không chứa' : 'chứa'} đỉnh</button></div>`;
  if (one && isDraggableType(s.type)) {
    const v = app.values.get(s.id);
    if (v) html += `<div class="row coords">(${v.x.toFixed(3)}; ${v.y.toFixed(3)})</div>`;
  }
  if (one && (kind === 'line' || kind === 'circle')) html += `<label class="row" title="Đường phụ: nét đứt, ẩn/hiện tất cả cùng lúc bằng Ctrl+Shift+D. Bỏ chọn: đường chính."><input id="p-aux" type="checkbox" ${s.aux ? 'checked' : ''}> Đường phụ (bỏ chọn: đường chính)</label>`;
  if (one && kind !== 'mark') html += `<label class="row"><input id="p-trace" type="checkbox" ${app.traceIds.has(s.id) ? 'checked' : ''}> Để lại vết khi kéo</label>`;
  if (one && s.args.length && STEP_TYPES[s.type] && !['locus', 'fixed_point'].includes(s.type)) {
    // sửa đối tượng cha: bấm một tên rồi bấm đối tượng thay thế trên hình
    html += `<div class="row redef">Dựng từ ${s.args.map((a, i) => `<button class="mini" data-redef="${i}" title="Thay đối tượng này (các đối tượng phụ thuộc giữ nguyên)">${labelHTML(stepById(app.doc, a)?.name || '?')}</button>`).join('')}</div>`;
  }
  if (one) {
    html += `<label class="row"><input id="p-hidden" type="checkbox" ${s.hidden ? 'checked' : ''}> Ẩn (đối tượng phụ)</label>`;
    html += `<label class="row"><input id="p-join" type="checkbox" ${s.joinPrev ? 'checked' : ''}> Gộp khung trình bày với bước trước</label>`;
  }
  html += `<div class="row"><button id="p-del" class="danger">Xoá ${one ? '' : steps.length + ' đối tượng'}</button></div>`;
  host.innerHTML = html;

  const q = (sel) => host.querySelector(sel);
  host.querySelectorAll('.sw').forEach((b) => (b.onclick = () => app.setStyle(ids, { color: b.dataset.color, ...(allKinds.has('point') ? { fillColor: b.dataset.color } : {}) })));
  if (q('#p-name')) q('#p-name').onchange = (e) => { if (!app.setName(s.id, e.target.value.trim())) e.target.value = s.name; };
  if (q('#p-width')) q('#p-width').onchange = (e) => app.setStyle(ids, { width: +e.target.value });
  if (q('#p-dash')) q('#p-dash').onchange = (e) => app.setStyle(ids, { dash: e.target.checked });
  if (q('#p-fill')) q('#p-fill').onchange = (e) => app.setStyle(ids, { fill: +e.target.value });
  if (q('#p-size')) q('#p-size').onchange = (e) => app.setStyle(ids, { size: +e.target.value });
  if (q('#p-label')) q('#p-label').onchange = (e) => app.setStyle(ids, { showLabel: e.target.checked });
  if (q('#p-border')) q('#p-border').onchange = (e) => app.setStyle(ids, { border: e.target.checked });
  host.querySelectorAll('[data-arcs]').forEach((b) => (b.onclick = () => app.setStyle(ids, { arcs: +b.dataset.arcs })));
  host.querySelectorAll('[data-ticks]').forEach((b) => (b.onclick = () => app.setStyle(ids, { ticks: +b.dataset.ticks })));
  if (q('#p-swap')) q('#p-swap').onclick = () => app.setParams(s.id, { which: 1 - (paramsOf(s).which || 0) });
  if (q('#p-arc')) q('#p-arc').onclick = () => app.setParams(s.id, { contains: !paramsOf(s).contains });
  if (q('#p-aux')) q('#p-aux').onchange = (e) => app.setStepProp(s.id, 'aux', e.target.checked);
  if (q('#p-trace')) q('#p-trace').onchange = (e) => app.toggleTrace(s.id, e.target.checked);
  host.querySelectorAll('[data-redef]').forEach((b) => (b.onclick = () => app.startRedefine(s.id, +b.dataset.redef)));
  if (q('#p-hidden')) q('#p-hidden').onchange = (e) => app.setStepProp(s.id, 'hidden', e.target.checked);
  if (q('#p-join')) q('#p-join').onchange = (e) => app.setStepProp(s.id, 'joinPrev', e.target.checked);
  q('#p-del').onclick = () => app.deleteSteps(ids);
  placeCard(app, host, ids);
}

/** Thẻ nổi không được che chính đối tượng đang chọn: nếu che thì chuyển xuống góc dưới bên phải. */
function placeCard(app, host, ids) {
  host.classList.remove('alt');
  const st = app.stage.getBoundingClientRect(), r = host.getBoundingClientRect();
  const box = { x: r.left - st.left - 14, y: r.top - st.top - 14, w: r.width + 28, h: r.height + 28 };
  const covered = ids.some((id) => {
    const v = app.values.get(id);
    if (!v) return false;
    const pts = v.kind === 'point' ? [v] : v.kind === 'circle' ? [v.c, { x: v.c.x + v.r, y: v.c.y }, { x: v.c.x - v.r, y: v.c.y }, { x: v.c.x, y: v.c.y + v.r }] : v.kind === 'line' ? [v.p, { x: v.p.x + v.d.x, y: v.p.y + v.d.y }] : [];
    return pts.some((P) => { const q = app.toScreen(P); return q.x > box.x && q.x < box.x + box.w && q.y > box.y && q.y < box.y + box.h; });
  });
  if (covered) host.classList.add('alt');
}

/** Tuỳ chọn cho công cụ đánh dấu (màu, số cung, số vạch của dấu sắp tạo). */
export function renderToolOptions(app) {
  const host = document.getElementById('tool-options');
  if (!host) return;
  const t = app.toolId;
  const m = app.markDefaults;
  const tool = TOOL_BY_ID[t];
  if (tool && tool.options && app.mode === 'edit') {
    // tham số số của công cụ (góc quay, tỉ số vị tự…)
    const vals = (app.toolParams ||= {})[t] ||= {};
    host.classList.add('show');
    host.innerHTML = `<div class="tool-group-name">${tool.label}</div>` + tool.options.map((o) =>
      `<label class="row">${o.label} <input type="number" step="any" data-opt="${o.key}" value="${vals[o.key] ?? o.def}" style="width:80px"></label>`).join('');
    host.querySelectorAll('[data-opt]').forEach((inp) => (inp.onchange = () => { const v = parseFloat(inp.value); if (Number.isFinite(v)) vals[inp.dataset.opt] = v; }));
    return;
  }
  const show = ['angle_mark', 'segment_mark', 'polygon'].includes(t) && app.mode === 'edit';
  host.classList.toggle('show', show);
  if (!show) { host.innerHTML = ''; return; }
  const key = t === 'polygon' ? 'polyColor' : 'color';
  let html = `<div class="tool-group-name">Kiểu dấu mới</div><div class="swatches"><button class="sw def ${!m[key] ? 'on' : ''}" data-c="" title="Màu mặc định của bộ kiểu"></button>${PALETTE.map((c) => `<button class="sw ${m[key] === c.hex ? 'on' : ''}" data-c="${c.hex}" style="background:${c.hex}" title="${c.name}"></button>`).join('')}</div>`;
  if (t === 'angle_mark') html += `<div class="row">Số cung ${[1, 2, 3].map((n) => `<button class="mini ${m.arcs === n ? 'on' : ''}" data-n="${n}">${n}</button>`).join('')}</div><div class="note">Các góc bằng nhau: dùng cùng màu và cùng số cung.</div>`;
  if (t === 'segment_mark') html += `<div class="row">Số vạch ${[1, 2, 3].map((n) => `<button class="mini ${m.ticks === n ? 'on' : ''}" data-n="${n}">${n}</button>`).join('')}</div>`;
  host.innerHTML = html;
  host.querySelectorAll('[data-c]').forEach((b) => (b.onclick = () => { m[key] = b.dataset.c || null; renderToolOptions(app); }));
  host.querySelectorAll('[data-n]').forEach((b) => (b.onclick = () => { m[t === 'angle_mark' ? 'arcs' : 'ticks'] = +b.dataset.n; renderToolOptions(app); }));
}
