// Tự dựng thử điểm / đường phụ (bản 1.9). Sinh các đối tượng phụ "chuẩn" của lời giải Olympic từ chính hình đang có,
// rồi xếp hạng theo mức giúp ích cho mục tiêu:
//   1. dựng thêm thì CHỨNG MINH ĐƯỢC mục tiêu bằng bộ máy suy luận (deduce.js);
//   2. không thì: số quan hệ "lạ" (đúng trên mọi hình, không có sẵn từ cách dựng) nối đối tượng phụ với mục tiêu.
//
//   auxCandidates(doc, focusIds) → [{label, specs}]       (specs: đặc tả bước như công cụ – apply.js)
//   rankAux(doc, claim, {budgetMs}) → [{label, specs, proved, explain, score, notes}]
//
// Loại điểm phụ: giao điểm thứ hai của hai đường tròn / đường thẳng với đường tròn, giao điểm của hai đường thẳng chưa
// lấy, trung điểm, điểm đối tâm, chân đường vuông góc, đối xứng qua đường, tâm ngoại tiếp / trực tâm của tam giác
// gồm các điểm của mục tiêu, đường tròn qua ba điểm (và giao điểm của nó với các đường tròn đã có – điểm Miquel),
// tâm đồng dạng quay của hai đoạn thẳng.

import { evaluate, kinds, stepById, clone, describe } from '../core/model.js';
import { addSpecs } from '../core/apply.js';
import * as G from '../core/geom.js';
import { Deducer } from './deduce.js';
import { makeSampler, rng, figureScale } from './explorer.js';

const nm = (doc, id) => stepById(doc, id)?.name || '?';
// đường thẳng / đường tròn: tả theo cách dựng ("XY", "(BWN)") – dễ hiểu hơn tên tự động d6, ω1
const cv = (doc, id) => { const d = describe(doc, id); return d && d !== id ? d : nm(doc, id); };

/** Các điểm "liên quan" tới mục tiêu: các điểm của mục tiêu và tổ tiên gần của chúng. */
function focusPoints(doc, ids, k) {
  const out = new Set();
  const add = (id, depth) => {
    const s = stepById(doc, id);
    if (!s) return;
    if (k.get(id) === 'point') out.add(id);
    if (depth > 0) for (const a of s.args) add(a, depth - 1);
  };
  for (const id of ids) add(id, 2);
  return [...out];
}

export function auxCandidates(doc, focusIds = []) {
  const k = kinds(doc);
  const vals = evaluate(doc);
  const pts = doc.steps.filter((s) => k.get(s.id) === 'point' && vals.get(s.id)).map((s) => s.id);
  const lines = doc.steps.filter((s) => k.get(s.id) === 'line' && vals.get(s.id) && !s.hidden).map((s) => s.id);
  const circles = doc.steps.filter((s) => k.get(s.id) === 'circle' && vals.get(s.id) && !s.hidden).map((s) => s.id);
  const xs = pts.map((p) => vals.get(p));
  const scale = Math.max(1e-9, Math.hypot(Math.max(...xs.map((p) => p.x)) - Math.min(...xs.map((p) => p.x)), Math.max(...xs.map((p) => p.y)) - Math.min(...xs.map((p) => p.y))));
  const e = 1e-6 * scale;
  const exists = (P) => P && pts.some((q) => G.dist(vals.get(q), P) < e);
  const near = (P) => P && Math.hypot(P.x - xs[0].x, P.y - xs[0].y) < 6 * scale;
  const focus = focusPoints(doc, focusIds, k);
  const fset = new Set(focus);
  const out = [];
  const seen = new Set();
  const push = (label, specs, P, prio = 0) => {
    if (P && (exists(P) || !near(P))) return;
    const key = P ? `${Math.round(P.x / e)}:${Math.round(P.y / e)}` : label;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ label, specs, prio });
  };
  const touches = (ids) => ids.filter((id) => fset.has(id) || focusIds.includes(id)).length;
  // giao điểm thứ hai của hai đường tròn; đường thẳng với đường tròn; hai đường thẳng
  const curves = [...lines, ...circles];
  for (let i = 0; i < curves.length; i++) for (let j = i + 1; j < curves.length; j++) {
    const a = curves[i], b = curves[j];
    const roots = G.intersect(vals.get(a), vals.get(b));
    roots.forEach((R, w) => {
      if (exists(R)) return;
      const other = roots.length === 2 ? pts.find((q) => G.dist(vals.get(q), roots[1 - w]) < e) : null;
      const specs = other ? [{ type: 'intersection_other', args: [a, b, other] }] : [{ type: 'intersection', args: [a, b], params: { which: w } }];
      push(`giao điểm ${roots.length === 2 && other ? 'thứ hai ' : ''}của ${cv(doc, a)} và ${cv(doc, b)}`, specs, R, 3 + touches([a, b]));
    });
  }
  const F = focus.length ? focus : pts.slice(0, 8);
  // trung điểm các cặp điểm của mục tiêu; chân đường vuông góc từ điểm mục tiêu xuống các đường đã vẽ
  for (let i = 0; i < F.length; i++) for (let j = i + 1; j < F.length; j++) {
    const M = G.mid(vals.get(F[i]), vals.get(F[j]));
    push(`trung điểm ${nm(doc, F[i])}${nm(doc, F[j])}`, [{ type: 'midpoint', args: [F[i], F[j]] }], M, 2);
  }
  for (const p of F) for (const l of lines) {
    const L = vals.get(l), P = vals.get(p);
    if (G.distPointLine(P, L) < e) continue;
    const u = G.unit(L.d);
    const Fp = G.add(L.p, G.mul(u, G.dot(G.sub(P, L.p), u)));
    push(`chân đường vuông góc từ ${nm(doc, p)} xuống ${cv(doc, l)}`, [{ type: 'projection', args: [p, l] }], Fp, 2);
  }
  // điểm đối tâm trên các đường tròn có tâm là điểm của hình
  for (const c of circles) {
    const C = vals.get(c);
    const center = pts.find((q) => G.dist(vals.get(q), C.c) < e);
    if (!center) continue;
    for (const p of pts) {
      const P = vals.get(p);
      if (Math.abs(G.dist(P, C.c) - C.r) > e || !(fset.has(p) || !focus.length)) continue;
      push(`điểm đối tâm của ${nm(doc, p)} trên ${cv(doc, c)}`, [{ type: 'reflect', args: [p, center] }], G.sub(G.mul(C.c, 2), P), 2);
    }
  }
  // tâm ngoại tiếp / trực tâm / đường tròn qua ba điểm của mục tiêu (và giao của nó với các đường tròn có sẵn)
  for (let i = 0; i < F.length; i++) for (let j = i + 1; j < F.length; j++) for (let m = j + 1; m < F.length; m++) {
    const T = [F[i], F[j], F[m]];
    const [A, B, C] = T.map((x) => vals.get(x));
    if (!G.triangleOK(A, B, C)) continue;
    const tn = T.map((x) => nm(doc, x)).join('');
    const cc = G.circleThrough(A, B, C);
    const direct = T.filter((x) => focusIds.includes(x)).length;
    if (cc && cc.r < 5 * scale) {
      push(`tâm đường tròn (${tn})`, [{ type: 'circumcenter', args: T }], cc.c, 1);
      if (direct >= 2) for (const c of circles) {
        const roots = G.intersect(cc, vals.get(c));
        roots.forEach((R, w) => {
          if (exists(R)) return;
          const other = roots.length === 2 ? pts.find((q) => G.dist(vals.get(q), roots[1 - w]) < e) : null;
          const specs = [{ type: 'circumcircle', args: T, hidden: true }, other ? { type: 'intersection_other', args: ['$0', c, other] } : { type: 'intersection', args: ['$0', c], params: { which: w } }];
          push(`giao điểm của (${tn}) với ${cv(doc, c)}`, specs, R, 1);
        });
      }
    }
    push(`trực tâm tam giác ${tn}`, [{ type: 'orthocenter', args: T }], null, 0);
  }
  // tâm đồng dạng quay biến đoạn AB thành CD: giao điểm thứ hai của (XAC), (XBD) với X = AC ∩ BD
  for (let i = 0; i + 3 < Math.min(F.length, 7); i++) {
    const [A, B, C, D] = F.slice(i, i + 4);
    const l1 = G.lineThrough(vals.get(A), vals.get(C)), l2 = G.lineThrough(vals.get(B), vals.get(D));
    const X = G.intersectLL(l1, l2);
    if (!X) continue;
    push(`tâm đồng dạng quay biến ${nm(doc, A)}${nm(doc, B)} thành ${nm(doc, C)}${nm(doc, D)}`, [
      { type: 'line', args: [A, C], hidden: true }, { type: 'line', args: [B, D], hidden: true }, { type: 'intersection', args: ['$0', '$1'], hidden: true },
      { type: 'circumcircle', args: ['$2', A, B], hidden: true }, { type: 'circumcircle', args: ['$2', C, D], hidden: true },
      { type: 'intersection_other', args: ['$3', '$4', '$2'] },
    ], null, 0);
  }
  out.sort((a, b) => b.prio - a.prio);
  return out;
}

/** Số quan hệ mới (đúng trên mọi mẫu) nối điểm phụ X với các điểm của mục tiêu: thẳng hàng, đồng viên, X trên đường đã vẽ. */
function auxRelations(doc, X, focus, samples) {
  const notes = [];
  // quan hệ có sẵn từ cách dựng (đường / đường tròn dựng qua chúng) không tính
  const P0 = new Deducer(doc, { values: samples[0], maxRounds: 0 }).run();
  const trivial = (ids, circle) => (circle ? P0.circles : P0.lines).some((N) => N.alive && ids.every((q) => N.pts.has(q)));
  const k = kinds(doc);
  const all = (fn) => samples.every((v) => fn(v));
  const E = (v) => 1e-7 * figureScale(v, focus);
  const ptsF = focus.filter((p) => p !== X);
  for (let i = 0; i < ptsF.length; i++) for (let j = i + 1; j < ptsF.length; j++) {
    const [a, b] = [ptsF[i], ptsF[j]];
    if (all((v) => { const L = v.get(a) && v.get(b) && G.lineThrough(v.get(a), v.get(b)); return L && v.get(X) && G.distPointLine(v.get(X), L) < E(v) && G.dist(v.get(a), v.get(b)) > E(v); }) && !trivial([X, a, b], false)) notes.push(`${nm(doc, X)}, ${nm(doc, a)}, ${nm(doc, b)} thẳng hàng`);
    for (let m = j + 1; m < ptsF.length; m++) {
      const c = ptsF[m];
      if (all((v) => { const C = v.get(a) && v.get(b) && v.get(c) && v.get(X) && G.circleThrough(v.get(a), v.get(b), v.get(c)); return C && Math.abs(G.dist(v.get(X), C.c) - C.r) < E(v); }) && !trivial([X, a, b, c], true)) notes.push(`${nm(doc, X)}, ${nm(doc, a)}, ${nm(doc, b)}, ${nm(doc, c)} đồng viên`);
    }
  }
  for (const s of doc.steps) {
    if (s.id === X || k.get(s.id) === 'point' || k.get(s.id) === 'mark' || s.hidden) continue;
    if (stepById(doc, X).args.includes(s.id)) continue;
    if (all((v) => { const c = v.get(s.id), P = v.get(X); if (!c || !P) return false; return c.kind === 'line' ? G.distPointLine(P, c) < E(v) : Math.abs(G.dist(P, c.c) - c.r) < E(v); })) notes.push(`${nm(doc, X)} nằm trên ${s.name || 'đường'}`);
  }
  return notes;
}

/**
 * Thử từng điểm phụ: dựng vào bản sao, chạy bộ máy suy luận, xem mục tiêu có chứng minh được không; đếm quan hệ mới.
 * budgetMs: giới hạn thời gian (giao diện chạy theo từng đợt).
 */
export function rankAux(doc, claim, { budgetMs = 4000, max = 60, onProgress = null } = {}) {
  const t0 = Date.now();
  const cands = auxCandidates(doc, claim ? claim.ids : []).slice(0, max);
  const k = kinds(doc);
  const focus = focusPoints(doc, claim ? claim.ids : [], k);
  const results = [];
  let i = 0;
  for (const c of cands) {
    if (Date.now() - t0 > budgetMs) break;
    i++;
    const d = clone(doc);
    let ids;
    try { ids = addSpecs(d, c.specs.map((sp) => ({ ...sp }))); } catch { continue; }
    const main = ids[ids.length - 1];
    const vals = evaluate(d);
    if (!vals.get(main)) continue;
    // điểm phụ dùng tên tạm dễ đọc
    const st = stepById(d, main);
    let proved = false, explain = null;
    if (claim) {
      const D = new Deducer(d, { values: vals }).run();
      const r = D.prove(claim);
      if (r.status === 'proved') { proved = true; explain = D.explain(r.uses || []); }
    }
    // quan hệ mới trên vài cấu hình ngẫu nhiên
    const S = makeSampler(d, {});
    const rand = rng(77);
    const samples = [vals];
    for (let t = 0; t < 30 && samples.length < 6; t++) { const smp = S.sample(rand); if (!smp.why) samples.push(smp.vals); }
    const notes = k.get(main) === 'point' || kinds(d).get(main) === 'point' ? auxRelations(d, main, focus, samples) : [];
    results.push({ label: c.label, specs: c.specs, name: st.name, proved, explain, notes, score: (proved ? 100 : 0) + notes.length * 3 + c.prio });
    if (onProgress) onProgress(i, cands.length);
  }
  results.sort((a, b) => b.score - a.score);
  return { results, tried: i, total: cands.length, ms: Date.now() - t0 };
}
