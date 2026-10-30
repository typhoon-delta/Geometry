// Kiểm tra một nhận định (bản 1.8): "A, B, C thẳng hàng?", "AB = CD?", "d ⊥ d′?"… Thử trên nhiều hình ngẫu nhiên
// (xê dịch các bậc tự do như bộ khám phá) và trên các TRƯỜNG HỢP ĐẶC BIỆT (special.js) để báo:
//   – luôn đúng (kèm các trường hợp đặc biệt mà nhận định sai / không xác định – điều kiện "không suy biến");
//   – sai ngay trên hình này; – đúng trên hình này nhưng không luôn đúng (kèm phản ví dụ, các trường hợp mà nó đúng).
// Chỉ dùng các bước mà nhận định phụ thuộc (hình con) nên nhanh cả với hình lớn.

import { kinds, stepById, describe, evaluate } from '../core/model.js';
import * as G from '../core/geom.js';
import { makeSampler, rng, figureScale } from './explorer.js';
import { specialCases, caseOverrides } from './special.js';

export const TOL = 1e-7; // sai lệch tương đối (theo cỡ hình) coi như bằng 0

const segLen = (l) => Math.hypot(l.d.x, l.d.y);
const angleAt = (A, B, C) => { const a = G.directedAngle(A, B, C); return a == null ? null : Math.abs(a); };

/** Các loại nhận định: đối số, tiêu đề, câu hỏi, sai lệch tương đối (null = không xác định / suy biến). */
export const CLAIMS = {
  coincide: { title: 'Trùng nhau', text: (n) => `${n[0]} trùng ${n[1]}`, res: ([P, Q], s) => G.dist(P, Q) / s },
  collinear: {
    title: 'Thẳng hàng', text: (n) => `${n.join(', ')} thẳng hàng`,
    res: ([P, Q, R], s) => {
      const L = Math.max(G.dist(P, Q), G.dist(Q, R), G.dist(R, P));
      return L < 1e-9 * s ? null : Math.abs(G.cross(G.sub(Q, P), G.sub(R, P))) / (L * L);
    },
  },
  concyclic: {
    title: 'Cùng thuộc một đường tròn', text: (n) => `${n.join(', ')} cùng thuộc một đường tròn`,
    res: ([P, Q, R, S], s) => {
      const c = circle3(P, Q, R);
      if (!c || c.r > 1e3 * s) return null;
      return Math.abs(G.dist(S, c.c) - c.r) / s;
    },
  },
  equal_len: { title: 'Bằng nhau', text: (n) => `${n[0]}${n[1]} = ${n[2]}${n[3]}`, res: ([A, B, C, D], s) => Math.abs(G.dist(A, B) - G.dist(C, D)) / s },
  equal_seg: { title: 'Bằng nhau', text: (n, d) => `${d[0]} = ${d[1]}`, res: ([l1, l2], s) => Math.abs(segLen(l1) - segLen(l2)) / s },
  equal_angle: {
    title: 'Góc bằng nhau', text: (n) => `∠${n[0]}${n[1]}${n[2]} = ∠${n[3]}${n[4]}${n[5]}`,
    res: ([A, B, C, D, E, F]) => { const a = angleAt(A, B, C), b = angleAt(D, E, F); return a == null || b == null ? null : Math.abs(a - b) / 180; },
  },
  sup_angle: {
    title: 'Hai góc bù nhau', text: (n) => `∠${n[0]}${n[1]}${n[2]} + ∠${n[3]}${n[4]}${n[5]} = 180°`,
    res: ([A, B, C, D, E, F]) => { const a = angleAt(A, B, C), b = angleAt(D, E, F); return a == null || b == null ? null : Math.abs(a + b - 180) / 180; },
  },
  same_line: { title: 'Trùng nhau', text: (n, d) => `${d[0]} trùng ${d[1]}`, res: ([l1, l2], s) => Math.abs(G.cross(G.unit(l1.d), G.unit(l2.d))) + G.distPointLine(l2.p, l1) / s },
  same_circle: { title: 'Trùng nhau', text: (n, d) => `${d[0]} trùng ${d[1]}`, res: ([c1, c2], s) => (G.dist(c1.c, c2.c) + Math.abs(c1.r - c2.r)) / s },
  on_line: { title: 'Điểm thuộc đường thẳng', text: (n, d) => `${n[0]} nằm trên ${d[1]}`, res: ([P, l], s) => G.distPointLine(P, l) / s },
  on_circle: { title: 'Điểm thuộc đường tròn', text: (n, d) => `${n[0]} nằm trên ${d[1]}`, res: ([P, c], s) => Math.abs(G.dist(P, c.c) - c.r) / s },
  perpendicular: { title: 'Vuông góc', text: (n, d) => `${d[0]} ⊥ ${d[1]}`, res: ([l1, l2]) => Math.abs(G.dot(G.unit(l1.d), G.unit(l2.d))) },
  parallel: { title: 'Song song', text: (n, d) => `${d[0]} ∥ ${d[1]}`, res: ([l1, l2]) => Math.abs(G.cross(G.unit(l1.d), G.unit(l2.d))) },
  concurrent: {
    title: 'Đồng quy', text: (n, d) => `${d.join(', ')} đồng quy`,
    res: ([l1, l2, l3], s) => {
      const X = G.intersectLL(l1, l2);
      if (!X || Math.hypot(X.x - l1.p.x, X.y - l1.p.y) > 1e3 * s) return null;
      return G.distPointLine(X, l3) / s;
    },
  },
  tangent: {
    title: 'Tiếp xúc', text: (n, d) => `${d[0]} tiếp xúc ${d[1]}`,
    res: ([a, b], s) => {
      if (a.kind === 'line') return Math.abs(G.distPointLine(b.c, a) - b.r) / s;
      const d = G.dist(a.c, b.c);
      if (d < 1e-9 * s) return null;
      return Math.min(Math.abs(d - (a.r + b.r)), Math.abs(d - Math.abs(a.r - b.r))) / s;
    },
  },
};

/** Các nhận định hỏi được về các đối tượng đang chọn (theo thứ tự chọn). */
export function claimsFor(doc, ids) {
  const k = kinds(doc);
  const kd = ids.map((id) => k.get(id));
  const cnt = (t) => kd.filter((x) => x === t).length;
  const out = [];
  const of = (type, order) => out.push({ type, ids: order });
  const pts = ids.filter((id, i) => kd[i] === 'point'), lines = ids.filter((id, i) => kd[i] === 'line'), circs = ids.filter((id, i) => kd[i] === 'circle');
  if (pts.length === ids.length) {
    if (ids.length === 2) of('coincide', ids);
    if (ids.length === 3) of('collinear', ids);
    if (ids.length === 4) { of('concyclic', ids); of('equal_len', ids); }
    if (ids.length === 6) of('equal_angle', ids);
  }
  if (ids.length === 2 && cnt('point') === 1 && cnt('line') === 1) of('on_line', [pts[0], lines[0]]);
  if (ids.length === 2 && cnt('point') === 1 && cnt('circle') === 1) of('on_circle', [pts[0], circs[0]]);
  if (ids.length === 2 && cnt('line') === 2) {
    of('perpendicular', lines);
    of('parallel', lines);
    if (lines.every((id) => stepById(doc, id).type === 'segment')) of('equal_seg', lines);
  }
  if (ids.length === 3 && cnt('line') === 3) of('concurrent', lines);
  if (ids.length === 2 && cnt('circle') >= 1 && cnt('point') === 0) of('tangent', [...lines, ...circs]);
  return out;
}

/** Câu hỏi của một nhận định bằng tên trên hình. */
export function claimText(doc, claim) {
  const n = claim.ids.map((id) => stepById(doc, id)?.name || '?');
  const d = claim.ids.map((id) => describe(doc, id));
  return CLAIMS[claim.type].text(n, d);
}

/** Hình con: các bước mà các đối tượng ids phụ thuộc (kể cả chính chúng), giữ thứ tự. */
export function subDoc(doc, ids) {
  const need = new Set(ids);
  for (let i = doc.steps.length - 1; i >= 0; i--) {
    const s = doc.steps[i];
    if (need.has(s.id)) for (const a of s.args) need.add(a);
  }
  return { ...doc, steps: doc.steps.filter((s) => need.has(s.id)) };
}

function residual(claim, vals, scale) {
  const v = claim.ids.map((id) => vals.get(id));
  if (v.some((x) => !x)) return null;
  const r = CLAIMS[claim.type].res(v, scale);
  return r == null || !Number.isFinite(r) ? null : r;
}

/**
 * Kiểm tra nhận định trên hình doc. Trả về
 *   {verdict: 'always'|'false'|'not_always'|'unknown', base, tested, ok, bad, undef, rejected, counter, special: [...], ms}
 *   counter: {ov: {id: params}, res} – cấu hình phản ví dụ (đặt vào hình để xem)
 *   special: [{label, status: 'true'|'false'|'undef'|'degenerate', patch}]
 */
export function checkClaim(doc, claim, { samples = 80, maxAttempts = 600, seed = 2024 } = {}) {
  const t0 = Date.now();
  const sub = subDoc(doc, claim.ids);
  const S = makeSampler(sub, {});
  const scaleOf = (vals) => figureScale(vals, S.pointIds);
  const r0 = residual(claim, S.base, S.scale0);
  const rand = rng(seed);
  let tested = 0, ok = 0, bad = 0, undef = 0, attempts = 0;
  const rejected = {};
  let counter = null;
  while (tested < samples && attempts < maxAttempts) {
    attempts++;
    // xen kẽ xê dịch nhỏ và lớn: vừa sát hình gốc, vừa đủ đa dạng
    const { ov, vals, why } = S.sample(rand, attempts % 2 ? 0.3 : 0.75);
    if (why) { rejected[why] = (rejected[why] || 0) + 1; continue; }
    tested++;
    const r = residual(claim, vals, scaleOf(vals));
    if (r == null) undef++;
    else if (r < TOL) ok++;
    else {
      bad++;
      if (!counter || r > counter.res) counter = { ov: Object.fromEntries(ov), res: r };
    }
  }
  // trường hợp đặc biệt (tìm trên cả hình – tam giác nhận ra nhờ các cạnh vẽ – nhưng chỉ những trường hợp dời các bậc
  // tự do mà nhận định phụ thuộc). Điểm trùng nhau ở đây là bình thường (tam giác vuông tại A thì H ≡ A), chỉ "không xác
  // định" mới là suy biến.
  const inSub = new Set(sub.steps.map((x) => x.id));
  const special = [];
  for (const sc of specialCases(doc)) {
    if (!Object.keys(sc.patch).every((id) => inSub.has(id))) continue;
    const vals = evaluate(sub, caseOverrides(sub, sc));
    const r = residual(claim, vals, scaleOf(vals));
    special.push({ key: sc.key, label: sc.label, status: r == null ? 'undef' : r < TOL ? 'true' : 'false', patch: sc.patch, about: sc.about });
  }
  let verdict;
  if (r0 == null) verdict = 'undef_here';
  else if (r0 >= TOL) verdict = 'false';
  else if (ok + bad < 5) verdict = 'unknown';
  else if (bad === 0) verdict = 'always';
  else verdict = 'not_always';
  return { verdict, base: r0, tested, ok, bad, undef, rejected, counter, special, ms: Date.now() - t0 };
}

function circle3(A, B, C) {
  const d = 2 * (A.x * (B.y - C.y) + B.x * (C.y - A.y) + C.x * (A.y - B.y));
  if (Math.abs(d) < 1e-12) return null;
  const a2 = A.x * A.x + A.y * A.y, b2 = B.x * B.x + B.y * B.y, c2 = C.x * C.x + C.y * C.y;
  const c = { x: (a2 * (B.y - C.y) + b2 * (C.y - A.y) + c2 * (A.y - B.y)) / d, y: (a2 * (C.x - B.x) + b2 * (A.x - C.x) + c2 * (B.x - A.x)) / d };
  return { c, r: G.dist(A, c) };
}
