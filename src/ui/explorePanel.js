// Thẻ "Khám phá" (bản 1.9): khám phá tự do hoặc THEO MỤC TIÊU.
//   • Mục tiêu: gõ ("X, Y, H thẳng hàng"), hoặc lấy từ các đối tượng đang chọn → kiểm tra bằng số, chứng minh bằng bộ máy
//     suy luận (biến đổi góc / độ dài / phương tích) kèm các bước; chưa chứng minh được thì "Tìm điểm phụ".
//   • Danh sách quan hệ: mỗi quan hệ có trạng thái (mục tiêu / sâu / chứng minh được / hiển nhiên), "Vì sao?",
//     "Đặt làm mục tiêu", "Chèn vào lời giải"; bấm để tô sáng trên hình.
//   • Điểm phụ gợi ý: rê chuột để xem trước, "Dựng" để thêm vào hình.

import { discover } from '../explore/discover.js';
import { rankAux } from '../explore/auxPoints.js';
import { claimsFor, claimText, CLAIMS } from '../explore/check.js';
import { parseCommand } from '../core/cmd.js';
import { addSpecs } from '../core/apply.js';
import { evaluate, clone, stepById, kinds } from '../core/model.js';
import * as G from '../core/geom.js';
import { toast } from './dialog.js';

const TYPE_LABEL = {
  collinear: 'Thẳng hàng', concyclic: 'Đồng viên', concurrent: 'Đồng quy', parallel: 'Song song', perpendicular: 'Vuông góc',
  tangent: 'Tiếp xúc', on_circle: 'Đồng viên', on_line: 'Thẳng hàng', coincide: 'Trùng nhau', same_line: 'Trùng nhau', same_circle: 'Trùng nhau',
  equal_len: 'Đoạn bằng nhau', equal_angle: 'Góc bằng nhau',
};
const STATUS = {
  deep: ['sâu', 'Chưa chứng minh được bằng biến đổi góc / độ dài / phương tích – quan hệ "sâu", đáng chú ý'],
  proved: ['chứng minh được', 'Bộ máy suy luận chứng minh được (bấm "Vì sao?")'],
  trivial: ['hiển nhiên', 'Suy ra ngay từ cách dựng'],
  unknown: ['', ''],
};
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
/** Chữ có tên điểm: thoát HTML rồi đổi chỉ số dưới (O_1 → O₁, I_A, M_{BC}). */
const fmt = (s) => esc(s).replace(/([A-Za-zα-ω]'*)_\{([^}]+)\}/g, '$1<sub>$2</sub>').replace(/([A-Za-zα-ω]'*)_([A-Za-z0-9])/g, '$1<sub>$2</sub>');

export function setupExplore(app) {
  const pane = document.getElementById('tab-explore');
  let result = null, stale = false, active = -1, busy = false;
  let goal = null; // {claim, doc, text}
  let goalInput = '';
  let aux = null; // kết quả tìm điểm phụ
  let showTrivial = false;
  const openWhy = new Set();
  let auto = null;

  const proofHTML = (p) => !p ? '' : `<div class="kp-proof">${p.premises.length ? `<div class="kp-prem"><b>Từ giả thiết:</b> ${p.premises.map(fmt).join('; ')}</div>` : ''}<ol>${p.steps.map((s) => `<li>${fmt(s.text)}</li>`).join('')}</ol></div>`;

  const render = () => {
    const rels = result ? result.relations.filter((r) => showTrivial || r.status !== 'trivial' || r.isGoal) : [];
    let html = `<div class="explore-head">
      <div class="kp-goal-row"><input id="kp-goal" type="text" placeholder="Mục tiêu (tuỳ chọn), vd: X, Y, H thẳng hàng" value="${esc(goalInput)}" spellcheck="false">
        <button id="kp-goal-set" class="mini" title="Đặt mục tiêu">Đặt</button></div>
      <div class="kp-goal-help">Gõ như lệnh kiểm tra: <i>A, B, C thẳng hàng</i> · <i>A, B, C, D đồng viên</i> · <i>AB = CD</i> · <i>góc ABC = góc DEF</i> · <i>d1 vuông góc d2</i>… hoặc chọn đối tượng trên hình rồi bấm <button id="kp-goal-sel" class="linkish">lấy từ đối tượng đang chọn</button>.</div>
      <button id="btn-run-explore" class="primary">${busy ? 'Đang khám phá…' : goal ? '🔍 Khám phá theo mục tiêu' : '🔍 Khám phá hình này'}</button>
    </div>`;
    if (goal && result && result.goal) {
      const g = result.goal;
      const ok = g.verdict === 'always';
      html += `<div class="kp-goal ${ok ? 'ok' : 'bad'}">
        <div class="kp-goal-title">Mục tiêu: <b>${fmt(g.text)}</b> <button id="kp-goal-clear" class="linkish">bỏ</button></div>
        <div>${ok ? '✓ Đúng trên mọi hình thử' : g.verdict === 'false' ? '✗ Sai trên hình này' : g.verdict === 'not_always' ? '✗ Không luôn đúng' : 'Không xác định'}</div>
        ${ok ? (g.proved ? `<div class="kp-proved">✓ Chứng minh được (biến đổi góc / độ dài / phương tích) <button class="mini" id="kp-goal-why">${openWhy.has('goal') ? 'Ẩn các bước' : 'Xem các bước'}</button> <button class="mini" id="kp-goal-ins">Chèn vào lời giải</button></div>${openWhy.has('goal') ? proofHTML(g.proof) : ''}`
          : `<div class="kp-unproved">Chưa chứng minh được từ hình hiện tại. <button class="mini primary" id="kp-aux">${aux && aux.running ? 'Đang thử điểm phụ…' : 'Tìm điểm phụ'}</button></div>`) : ''}
      </div>`;
    }
    if (aux && aux.results) {
      html += `<div class="kp-aux"><div class="kp-sub">Điểm phụ gợi ý <span class="muted">(${aux.tried}/${aux.total} cách, ${aux.ms} ms)</span></div>` +
        (aux.results.length ? aux.results.slice(0, 8).map((x, i) => `<div class="kp-aux-row" data-aux="${i}">
          <div><b>${fmt((x.name ? x.name + " = " : "") + x.label)}</b>${x.proved ? ' <span class="badge ok">→ chứng minh được mục tiêu</span>' : ''}</div>
          ${x.notes.length ? `<div class="kp-notes">${x.notes.slice(0, 4).map(fmt).join(' · ')}</div>` : ''}
          <div class="kp-acts"><button class="mini" data-aux-add="${i}">Dựng</button>${x.proved ? ` <button class="mini" data-aux-why="${i}">${openWhy.has('aux' + i) ? 'Ẩn các bước' : 'Xem các bước'}</button>` : ''}</div>
          ${openWhy.has('aux' + i) ? proofHTML(x.explain) : ''}
        </div>`).join('') : '<div class="note">Không tìm được điểm phụ nào có ích.</div>') + '</div>';
    }
    if (result) {
      const st = result.stats;
      const nTriv = result.relations.filter((r) => r.status === 'trivial').length;
      html += `<div class="explore-stats">${rels.length} quan hệ · ${st.samples} mẫu · ${st.ms} ms${stale ? ' · <b class="stale">hình đã đổi, đang khám phá lại…</b>' : ''}
        ${nTriv ? ` · <label class="kp-triv"><input type="checkbox" id="kp-show-triv" ${showTrivial ? 'checked' : ''}> hiện ${nTriv} quan hệ hiển nhiên</label>` : ''}</div>`;
      if (!rels.length) html += '<div class="empty">Không tìm thấy quan hệ nào ngoài các quan hệ hiển nhiên.</div>';
      html += '<div class="rel-list">' + rels.map((r) => {
        const i = result.relations.indexOf(r);
        const [sl, stip] = STATUS[r.status] || STATUS.unknown;
        return `<div class="rel ${i === active ? 'active' : ''} ${r.isGoal ? 'is-goal' : ''}" data-i="${i}">
          <div class="rel-body"><div class="rel-type">${TYPE_LABEL[r.type] || r.type}${r.isGoal ? ' <span class="badge goal">mục tiêu</span>' : ''}${sl ? ` <span class="badge st-${r.status}" title="${esc(stip)}">${sl}</span>` : ''}</div>
          <div class="rel-text">${fmt(r.text)}</div>${r.note ? `<div class="rel-note">${esc(r.note)}</div>` : ''}
          ${i === active ? `<div class="kp-acts">${r.proof ? `<button class="mini" data-why="${i}">${openWhy.has(i) ? 'Ẩn' : 'Vì sao?'}</button>` : ''}<button class="mini" data-goal="${i}">Đặt làm mục tiêu</button><button class="mini" data-ins="${i}">Chèn vào lời giải</button></div>` : ''}
          ${i === active && openWhy.has(i) ? proofHTML(r.proof) : ''}</div>
        </div>`;
      }).join('') + '</div>';
    }
    pane.innerHTML = html;
    const q = (s) => pane.querySelector(s);
    q('#btn-run-explore').onclick = () => run();
    const gi = q('#kp-goal');
    gi.oninput = () => { goalInput = gi.value; };
    gi.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); setGoalText(gi.value); } };
    q('#kp-goal-set').onclick = () => setGoalText(gi.value);
    q('#kp-goal-sel').onclick = goalFromSelection;
    if (q('#kp-goal-clear')) q('#kp-goal-clear').onclick = () => { goal = null; goalInput = ''; aux = null; run(); };
    if (q('#kp-goal-why')) q('#kp-goal-why').onclick = () => { toggle('goal'); };
    if (q('#kp-goal-ins')) q('#kp-goal-ins').onclick = () => insertProof(result.goal.text, result.goal.proof);
    if (q('#kp-aux')) q('#kp-aux').onclick = findAux;
    if (q('#kp-show-triv')) q('#kp-show-triv').onchange = (e) => { showTrivial = e.target.checked; render(); };
    pane.querySelectorAll('.rel').forEach((el) => (el.onclick = (e) => { if (e.target.closest('button')) return; select(+el.dataset.i); }));
    pane.querySelectorAll('[data-why]').forEach((b) => (b.onclick = () => toggle(+b.dataset.why)));
    pane.querySelectorAll('[data-goal]').forEach((b) => (b.onclick = () => goalFromRelation(result.relations[+b.dataset.goal])));
    pane.querySelectorAll('[data-ins]').forEach((b) => (b.onclick = () => insertRelation(result.relations[+b.dataset.ins])));
    pane.querySelectorAll('[data-aux-add]').forEach((b) => (b.onclick = () => addAux(aux.results[+b.dataset.auxAdd])));
    pane.querySelectorAll('[data-aux-why]').forEach((b) => (b.onclick = () => toggle('aux' + b.dataset.auxWhy)));
    pane.querySelectorAll('[data-aux]').forEach((el) => {
      el.onmouseenter = () => previewAux(aux.results[+el.dataset.aux]);
      el.onmouseleave = () => { app.renderer.clearExtra(); app.drawRelationOverlay?.(); };
    });
  };
  const toggle = (k) => { if (openWhy.has(k)) openWhy.delete(k); else openWhy.add(k); render(); };

  // ---------- mục tiêu ----------
  function setGoalText(text) {
    text = String(text || '').trim();
    if (!text) { goal = null; aux = null; return run(); }
    const d = clone(app.doc);
    const r = parseCommand(d, /^ki[eể]m tra/i.test(text) ? text : 'kiểm tra ' + text);
    if (!r.ok || r.kind !== 'check') return toast(r.error || 'Không hiểu mục tiêu – vd: X, Y, H thẳng hàng');
    const claim = r.run(d);
    goal = { claim, doc: d };
    goalInput = text.replace(/^ki[eể]m tra\s*/i, '');
    aux = null;
    run();
  }
  function goalFromSelection() {
    const ids = [...app.selection].filter((id) => stepById(app.doc, id));
    const cl = claimsFor(app.doc, ids);
    if (!cl.length) return toast('Chọn (theo thứ tự) các đối tượng của mục tiêu: 3 điểm (thẳng hàng), 4 điểm (đồng viên / AB = CD), 6 điểm (góc bằng nhau), 2 đường (vuông góc / song song)…', 5000);
    const c = cl[0];
    goal = { claim: c, doc: clone(app.doc) };
    goalInput = claimText(app.doc, c);
    aux = null;
    if (cl.length > 1) toast(`Đặt mục tiêu: ${CLAIMS[c.type].title.toLowerCase()} (các đối tượng này còn có thể là: ${cl.slice(1).map((x) => CLAIMS[x.type].title.toLowerCase()).join(', ')} – gõ vào ô mục tiêu để đổi)`, 5000);
    run();
  }
  function goalFromRelation(r) {
    const cl = relationClaim(r);
    if (!cl) return toast('Không đặt được quan hệ này làm mục tiêu');
    goal = { claim: cl, doc: clone(app.doc) };
    goalInput = claimText(app.doc, cl);
    aux = null;
    run();
  }

  // ---------- chạy ----------
  function run({ quiet = false } = {}) {
    if (busy) return;
    busy = true;
    if (!quiet) { app.togglePanel(true); document.querySelector('[data-tab="tab-explore"]').click(); }
    render();
    setTimeout(() => {
      try {
        // mục tiêu có thể cần đường phụ (vd OP chưa vẽ): khám phá trên bản sao có đường đó
        const d = goal ? goal.doc : app.doc;
        if (goal) syncGoalDoc();
        result = discover(goal ? goal.doc : d, { goal: goal ? goal.claim : null });
        stale = false;
        active = -1;
        app.setRelation(null);
        if (!quiet) toast(`Tìm thấy ${result.relations.filter((r) => r.status !== 'trivial').length} quan hệ${goal ? (result.goal.proved ? ' · mục tiêu chứng minh được' : '') : ''}`);
      } catch (e) {
        console.error(e);
        toast('Lỗi khi khám phá: ' + e.message, 5000);
      }
      busy = false;
      render();
    }, 30);
  }
  /** Hình của mục tiêu = hình hiện tại + các đường phụ mà lệnh mục tiêu cần (dựng lại khi hình đổi). */
  function syncGoalDoc() {
    if (!goal) return;
    const d = clone(app.doc);
    const r = parseCommand(d, 'kiểm tra ' + goalInput);
    if (r.ok && r.kind === 'check') { goal.claim = r.run(d); goal.doc = d; }
    else if (goal.claim.ids.every((id) => stepById(app.doc, id))) goal.doc = d;
  }

  function findAux() {
    if (!goal || !result) return;
    aux = { running: true };
    render();
    setTimeout(() => {
      try {
        aux = rankAux(goal.doc, goal.claim, { budgetMs: 6000 });
        const good = aux.results.find((x) => x.proved);
        toast(good ? `Dựng thêm ${good.label} thì chứng minh được mục tiêu` : `Đã thử ${aux.tried} điểm phụ – chưa cái nào giúp chứng minh được; xem các gợi ý có nhiều quan hệ mới`, 4500);
      } catch (e) { console.error(e); toast('Lỗi khi tìm điểm phụ: ' + e.message); aux = null; }
      render();
    }, 30);
  }
  function previewAux(x) {
    if (!x) return;
    const d = clone(goal ? goal.doc : app.doc);
    let ids;
    try { ids = addSpecs(d, x.specs.map((s) => ({ ...s }))); } catch { return; }
    const v = evaluate(d).get(ids[ids.length - 1]);
    if (!v || v.kind !== 'point') return;
    app.renderer.addExtra({ type: 'point', pts: [() => v], style: { color: '#2563eb', fill: '#bfdbfe', size: 7 } });
  }
  function addAux(x) {
    let ids = [];
    app.commit((doc) => { ids = addSpecs(doc, x.specs.map((s) => ({ ...s }))); });
    const main = ids[ids.length - 1];
    app.selection = new Set(main ? [main] : []);
    app.refresh();
    toast(`Đã dựng ${x.label}${main ? ` (${stepById(app.doc, main)?.name})` : ''} – Ctrl+Z để bỏ`);
    aux = null;
    run({ quiet: true });
  }

  // ---------- chèn vào lời giải ----------
  function insertProof(title, proof) {
    if (!app.textBoxes) return;
    const lines = [`**${title}.**`];
    if (proof) {
      if (proof.premises.length) lines.push(`Từ giả thiết: ${proof.premises.join('; ')}.`);
      for (const s of proof.steps) lines.push(`- ${s.text}`);
    }
    app.textBoxes.appendSolution(lines.join('\n'));
    toast('Đã chèn vào khung lời giải');
  }
  function insertRelation(r) {
    if (!app.textBoxes) return;
    app.textBoxes.appendSolution(relationLatex(app.doc, r));
    toast('Đã chèn vào khung lời giải');
  }

  const select = (i) => {
    active = active === i ? -1 : i;
    const r = active >= 0 ? result.relations[active] : null;
    app.setRelation(r ? { ...r, ids: (r.allPts || r.ids).filter((id) => stepById(app.doc, id)) } : null);
    render();
  };

  app.on('load', () => { result = null; goal = null; goalInput = ''; aux = null; active = -1; openWhy.clear(); render(); });
  app.on('change', () => {
    if (!result) return;
    stale = true;
    render();
    // tự khám phá lại khi hình đổi (gom các thay đổi liên tiếp)
    clearTimeout(auto);
    auto = setTimeout(() => { if (stale && document.getElementById('tab-explore').classList.contains('active') && document.body.classList.contains('panel-open')) run({ quiet: true }); }, 700);
  });
  const top = document.getElementById('btn-explore');
  if (top) top.onclick = () => run();
  render();
  return { run, setGoalText };
}

/** Quan hệ → một nhận định để đặt làm mục tiêu. */
function relationClaim(r) {
  const t = r.type;
  if (t === 'collinear') return { type: 'collinear', ids: r.ids.slice(0, 3) };
  if (t === 'concyclic') return { type: 'concyclic', ids: r.ids.slice(0, 4) };
  if ((t === 'on_line' || t === 'on_circle') && r.ids.length >= 2) return { type: t, ids: [r.ids[r.ids.length - 1], r.ids[0]] };
  if (t === 'parallel' || t === 'perpendicular' || t === 'tangent') return { type: t, ids: r.ids.slice(0, 2) };
  if (t === 'equal_len') return { type: 'equal_len', ids: [...r.segs[0], ...r.segs[1]] };
  if (t === 'equal_angle') return { type: 'equal_angle', ids: [...r.angles[0], ...r.angles[1]] };
  if (t === 'concurrent') return { type: 'concurrent', ids: r.ids.slice(0, 3) };
  return null;
}

/** Câu (có công thức) cho khung lời giải. */
function relationLatex(doc, r) {
  const nm = (id) => stepById(doc, id)?.name || '?';
  const k = kinds(doc);
  const vals = evaluate(doc);
  const lineName = (id) => {
    if (k.get(id) !== 'line') return nm(id);
    const v = vals.get(id);
    const on = doc.steps.filter((s) => k.get(s.id) === 'point' && vals.get(s.id) && v && G.distPointLine(vals.get(s.id), v) < 1e-7).slice(0, 2);
    return on.length === 2 ? on.map((s) => s.name).join('') : nm(id);
  };
  const list = (ids) => ids.map(nm).join(', ');
  switch (r.type) {
    case 'collinear': case 'on_line': return `Ta có $${list(r.allPts || (r.type === 'on_line' ? r.ids.slice(1) : r.ids))}$ thẳng hàng.`;
    case 'concyclic': case 'on_circle': return `Ta có $${list(r.allPts || (r.type === 'on_circle' ? r.ids.slice(1) : r.ids))}$ cùng thuộc một đường tròn.`;
    case 'equal_len': return `Ta có $${r.segs.map(([a, b]) => nm(a) + nm(b)).join(' = ')}$.`;
    case 'equal_angle': return `Ta có $${r.angles.map((a) => `\\widehat{${a.map(nm).join('')}}`).join(' = ')}$.`;
    case 'parallel': return `Ta có $${lineName(r.ids[0])} \\parallel ${lineName(r.ids[1])}$.`;
    case 'perpendicular': return `Ta có $${lineName(r.ids[0])} \\perp ${lineName(r.ids[1])}$.`;
    default: return `Ta có ${r.text}.`;
  }
}

/** Vẽ phần phụ trợ cho quan hệ đang chọn (đường thẳng/đường tròn đứt nét, điểm đồng quy, các đoạn bằng nhau). */
export function drawRelationOverlay(app) {
  const r = app.relation;
  if (!r) return;
  const R = app.renderer;
  const V = (id) => app.values.get(id);
  const style = { color: '#f59e0b', width: 2.2, dash: true };
  const pts = (r.allPts || r.ids).filter((id) => V(id) && V(id).kind === 'point');
  if (r.type === 'collinear' || r.type === 'on_line') {
    let best = [pts[0], pts[1]], bd = -1;
    for (const a of pts) for (const b of pts) { const d = G.dist(V(a), V(b)); if (d > bd) { bd = d; best = [a, b]; } }
    if (best[0] && best[1]) R.addExtra({ type: 'line', pts: best.map((id) => () => V(id)), style });
  } else if (r.type === 'concyclic' || r.type === 'on_circle') {
    if (pts.length >= 3) R.addExtra({ type: 'circle3', pts: pts.slice(0, 3).map((id) => () => V(id)), style });
  } else if (r.type === 'equal_len') {
    for (const [a, b] of r.segs) if (V(a) && V(b)) R.addExtra({ type: 'segment', pts: [() => V(a), () => V(b)], style: { color: '#f59e0b', width: 3, dash: false } });
  } else if (r.type === 'equal_angle') {
    for (const [a, b, c] of r.angles) if (V(a) && V(b) && V(c)) R.addExtra({ type: 'polyline', pts: [() => V(a), () => V(b), () => V(c)], style: { color: '#f59e0b', width: 2.4, dash: false } });
  } else if (r.type === 'concurrent') {
    const common = () => {
      const [a, b, ...rest] = r.ids.map(V);
      if (!a || !b) return null;
      let best = null, bd = Infinity;
      for (const X of G.intersect(a, b)) {
        const d = rest.reduce((s, c) => s + (c ? G.distToObject(c, X) : 1e9), 0);
        if (d < bd) { bd = d; best = X; }
      }
      return best;
    };
    R.addExtra({ type: 'point', pts: [common], style: { color: '#f59e0b', fill: '#fde68a', size: 7 } });
  }
}
