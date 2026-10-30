// Khám phá (bản 1.9) – lớp bọc ngoài bộ quét quan hệ explorer.js (giữ nguyên explore() để khớp bản Python):
//   • thêm ĐẠI LƯỢNG: đoạn bằng nhau, góc bằng nhau (đúng trên mọi hình thử, không có sẵn từ cách dựng);
//   • gắn TRẠNG THÁI cho từng quan hệ bằng bộ máy suy luận: hiển nhiên (suy ra ngay từ cách dựng) / chứng minh được
//     (kèm các bước) / chưa chứng minh được (quan hệ "sâu");
//   • gom tập điểm lớn nhất ("A₁, A₂, B₁, B₂, C₁, C₂ cùng thuộc một đường tròn");
//   • THEO MỤC TIÊU: đánh dấu quan hệ chính là mục tiêu, đẩy lên các quan hệ dính tới đối tượng của mục tiêu, chứng
//     minh mục tiêu (nếu được) kèm các bước đệm.
//
//   discover(doc, {goal}) → {relations: [{type, ids, text, status, proof, score, isGoal, near}], goal, stats}

import { evaluate, kinds, stepById, describe } from '../core/model.js';
import * as G from '../core/geom.js';
import { explore } from './explorer.js';
import { makeSampler, rng, figureScale } from './explorer.js';
import { Deducer } from './deduce.js';
import { matchContext, relationImplies } from './match.js';
import { checkClaim, claimText } from './check.js';

const BASE = { tangent: 6, concurrent: 5, concyclic: 5, on_circle: 5, collinear: 5, on_line: 3.5, perpendicular: 3, parallel: 3, coincide: 3, same_line: 3, same_circle: 3, equal_len: 3.5, equal_angle: 3 };

/** Các nhận định (check.js) mà một quan hệ khẳng định – để hỏi bộ máy suy luận. */
function claimsOf(ctx, rel) {
  const t = rel.type;
  if (t === 'collinear') return rel.ids.slice(2).map((x) => ({ type: 'collinear', ids: [rel.ids[0], rel.ids[1], x] }));
  if (t === 'concyclic') return rel.ids.slice(3).map((x) => ({ type: 'concyclic', ids: [rel.ids[0], rel.ids[1], rel.ids[2], x] }));
  if (t === 'on_line' || t === 'on_circle') return rel.ids.slice(1).map((x) => ({ type: t, ids: [x, rel.ids[0]] }));
  if (t === 'parallel' || t === 'perpendicular') return [{ type: t, ids: rel.ids }];
  if (t === 'tangent' && ctx.k.get(rel.ids[0]) === 'line') return [{ type: 'tangent', ids: rel.ids }];
  if (t === 'equal_len') return rel.segs.slice(1).map((s) => ({ type: 'equal_len', ids: [...rel.segs[0], ...s] }));
  if (t === 'equal_angle') return rel.angles.slice(1).map((a) => ({ type: 'equal_angle', ids: [...rel.angles[0], ...a] }));
  return [];
}

/** Đoạn bằng nhau, góc bằng nhau đúng trên mọi mẫu – bỏ những gì suy ra ngay từ cách dựng (D0). */
function quantities(doc, samples, pts, D0, { maxLen = 10, maxAng = 10, repOf = (x) => x } = {}) {
  const nm = (id) => stepById(doc, id)?.name || '?';
  // điểm luôn trùng nhau (D ≡ D′): chỉ giữ một đại diện
  pts = [...new Set(pts.map(repOf))];
  const out = [];
  const scales = samples.map((v) => figureScale(v, pts));
  // ---- đoạn bằng nhau ----
  const segs = [];
  for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) segs.push([pts[i], pts[j]]);
  const byLen = new Map();
  for (const s of segs) {
    const key = samples.map((v, t) => { const a = v.get(s[0]), b = v.get(s[1]); return a && b ? Math.round((G.dist(a, b) / scales[t]) * 1e6) : 'x'; }).join(',');
    if (key.includes('x') || key.split(',').some((x) => +x < 10)) continue;
    if (!byLen.has(key)) byLen.set(key, []);
    byLen.get(key).push(s);
  }
  let nLen = 0;
  for (const cls of byLen.values()) {
    if (cls.length < 2 || cls.length > 8) continue;
    // bỏ cặp suy ra ngay từ cách dựng: gom theo lớp tương đương của D0
    const fresh = cls.filter((s, i) => i === 0 || !D0.len.implies([['S' + key2(cls[0]), 1], ['S' + key2(s), -1]]));
    if (fresh.length < 2) continue;
    // cùng một đầu mút X với ≥ 3 điểm: X là tâm đường tròn qua các điểm đó
    const common = cls.every((s2) => s2.includes(cls[0][0])) ? cls[0][0] : cls.every((s2) => s2.includes(cls[0][1])) ? cls[0][1] : null;
    const text = common && cls.length >= 3
      ? `${nm(common)} cách đều ${cls.map((s2) => nm(s2[0] === common ? s2[1] : s2[0])).join(', ')} (${nm(common)} là tâm đường tròn qua các điểm đó)`
      : cls.map(([a, b]) => nm(a) + nm(b)).join(' = ');
    out.push({ type: 'equal_len', segs: cls, ids: [...new Set(cls.flat())], text, center: common && cls.length >= 3 ? common : null });
    if (++nLen >= maxLen) break;
  }
  // ---- góc bằng nhau (góc thường, đỉnh là một điểm của hình) ----
  const angs = [];
  const lim = Math.min(pts.length, 22);
  for (let b = 0; b < lim; b++) for (let a = 0; a < lim; a++) for (let c = a + 1; c < lim; c++) {
    if (a === b || c === b) continue;
    angs.push([pts[a], pts[b], pts[c]]);
  }
  const byAng = new Map();
  for (const A of angs) {
    let bad = false;
    const vals = samples.map((v) => { const x = G.directedAngle(v.get(A[0]), v.get(A[1]), v.get(A[2])); if (x == null) { bad = true; return 0; } return Math.abs(x); });
    if (bad || vals.some((x) => x < 2 || x > 178 || Math.abs(x - 90) < 0.5 || Math.abs(x - 60) < 1e-6)) continue;
    const key = vals.map((x) => Math.round(x * 1e5)).join(',');
    if (!byAng.has(key)) byAng.set(key, []);
    byAng.get(key).push(A);
  }
  let nAng = 0;
  const classes = [...byAng.values()].filter((c) => c.length >= 2 && c.length <= 10);
  for (const cls of classes) {
    // bỏ góc "trùng tên" (cùng đỉnh, cùng hai tia trên hình) và các đẳng thức có sẵn từ cách dựng
    const reps = [];
    const rayKey = (A) => {
      const v0 = samples[0];
      const dir = (P) => Math.round(((Math.atan2(v0.get(P).y - v0.get(A[1]).y, v0.get(P).x - v0.get(A[1]).x) * 180) / Math.PI) * 1e4);
      return A[1] + ':' + [dir(A[0]), dir(A[2])].sort().join(',');
    };
    const seenRay = new Set();
    for (const A of cls) {
      const rk = rayKey(A);
      if (seenRay.has(rk)) continue;
      seenRay.add(rk);
      const same = reps.find((R) => D0.prove({ type: 'equal_angle', ids: [...R, ...A] }).status === 'proved');
      if (!same) reps.push(A);
    }
    if (reps.length < 2) continue;
    out.push({ type: 'equal_angle', angles: reps, ids: [...new Set(reps.flat())], text: reps.map((A) => '∠' + A.map(nm).join('')).join(' = ') });
    if (++nAng >= maxAng) break;
  }
  return out;
}
const key2 = ([a, b]) => (a < b ? `${a}|${b}` : `${b}|${a}`);

/** Tập điểm (đã dựng) nằm trên đường của quan hệ → phát biểu gọn "… thẳng hàng / cùng thuộc một đường tròn". */
function restate(doc, ctx, rel) {
  const nm = (id) => stepById(doc, id)?.name || '?';
  if (rel.type !== 'on_line' && rel.type !== 'on_circle') return rel;
  const cid = rel.ids[0];
  const all = [...new Set([...ctx.ptsOn(cid), ...rel.ids.slice(1)])].sort((a, b) => doc.steps.findIndex((s) => s.id === a) - doc.steps.findIndex((s) => s.id === b));
  const cname = stepById(doc, cid)?.name;
  if (rel.type === 'on_circle' && all.length >= 4) return { ...rel, text: `${all.map(nm).join(', ')} cùng thuộc một đường tròn${cname ? ` (${cname})` : ''}`, allPts: all };
  if (rel.type === 'on_line' && all.length >= 3) return { ...rel, text: `${all.map(nm).join(', ')} thẳng hàng${cname ? ` (cùng nằm trên ${describe(doc, cid)})` : ''}`, allPts: all };
  return rel;
}

/**
 * @param goal  nhận định (check.js) hoặc null
 */
export function discover(doc, { goal = null, explore: run = explore, maxRounds = 6 } = {}) {
  const t0 = Date.now();
  const vals = evaluate(doc);
  const k = kinds(doc);
  const base = run(doc);
  const ctx = matchContext(doc, vals);
  const D0 = new Deducer(doc, { values: vals, maxRounds: 0 }).run();
  const D = new Deducer(doc, { values: vals, maxRounds }).run();
  const pts = doc.steps.filter((s) => k.get(s.id) === 'point' && vals.get(s.id) && !s.hidden).map((s) => s.id).slice(0, 40);
  // mẫu ngẫu nhiên cho đại lượng
  const S = makeSampler(doc, {});
  const rand = rng(4242);
  const samples = [vals];
  for (let t = 0; t < 40 && samples.length < 8; t++) { const smp = S.sample(rand); if (!smp.why) samples.push(smp.vals); }
  const repMap = new Map();
  for (const r of base.relations) if (r.type === 'coincide') for (const id of r.ids.slice(1)) repMap.set(id, r.ids[0]);
  const rels = [...base.relations.map((r) => restate(doc, ctx, r)), ...quantities(doc, samples, pts, D0, { repOf: (x) => repMap.get(x) || x })];
  const order = new Map(doc.steps.map((s2, i) => [s2.id, i / Math.max(1, doc.steps.length - 1)]));

  // đối tượng liên quan tới mục tiêu (điểm của mục tiêu + đối số trực tiếp)
  const near = new Set();
  if (goal) for (const id of goal.ids) { near.add(id); for (const a of stepById(doc, id)?.args || []) near.add(a); }

  for (const r of rels) {
    const cl = claimsOf(ctx, r);
    let status = cl.length ? 'trivial' : 'unknown';
    let uses = [];
    for (const c of cl) {
      if (D0.prove(c).status === 'proved') continue;
      const p = D.prove(c);
      if (p.status === 'proved') { if (status === 'trivial') status = 'proved'; uses.push(...(p.uses || [])); }
      else { status = 'deep'; }
    }
    r.status = status;
    r.proof = status === 'proved' ? D.explain([...new Set(uses)]) : null;
    r.isGoal = goal ? relationImplies(ctx, r, goal) : false;
    r.near = goal ? (r.ids || []).filter((id) => near.has(id)).length : 0;
    const b = BASE[r.type] ?? 3;
    // nhiều điểm hơn tối thiểu (6 điểm đồng viên…), dính đối tượng dựng sau cùng: giống kết luận của đề hơn
    const minPts = { collinear: 3, concyclic: 4, on_line: 2, on_circle: 2 }[r.type];
    const npts = r.allPts ? r.allPts.length : r.ids.length;
    const size = minPts ? Math.max(0, npts - (r.type.startsWith('on_') ? minPts + 1 : minPts)) * 0.8 : 0;
    const late = Math.max(...(r.ids || []).map((id) => order.get(id) ?? 0));
    r.score = b * (status === 'trivial' ? 0.3 : status === 'deep' ? 1.2 : 1) + size + late * 2.5 + (r.isGoal ? 50 : 0) + r.near * 2;
  }
  rels.sort((a, b) => b.score - a.score);

  let goalInfo = null;
  if (goal) {
    const chk = checkClaim(doc, goal, { samples: 40 });
    const p = D.prove(goal);
    goalInfo = {
      claim: goal, text: claimText(doc, goal), verdict: chk.verdict, check: chk,
      proved: p.status === 'proved', proof: p.status === 'proved' ? D.explain(p.uses || []) : null, status: p.status,
    };
  }
  return { relations: rels, goal: goalInfo, stats: { ...base.stats, ms: Date.now() - t0, quantities: rels.filter((r) => r.type === 'equal_len' || r.type === 'equal_angle').length } };
}
