// Bộ khám phá bằng số: tìm các quan hệ hình học đúng trên MỌI cấu hình ngẫu nhiên (xê dịch các điểm tự do
// và vị trí điểm trên đối tượng), loại quan hệ hiển nhiên từ cách dựng, xếp hạng theo mức "đáng chú ý".
//
// Thuần JS, không phụ thuộc giao diện. Dùng:  explore(doc, {samples, seed, ...}) → {relations, stats}

import { evaluate, kinds, describe, stepById, paramsOf } from '../core/model.js';
import { STEP_TYPES } from '../core/steps.js';
import * as G from '../core/geom.js';
import { Knowledge } from './knowledge.js';

export const DEFAULTS = {
  samples: 12, // số cấu hình ngẫu nhiên hợp lệ cần có (ngoài cấu hình gốc)
  maxAttempts: 150, // số lần thử tối đa (cấu hình suy biến bị loại)
  perturb: 0.3, // biên độ xê dịch điểm tự do, tính theo kích thước hình
  tol: 1e-6, // dung sai TƯƠNG ĐỐI theo kích thước hình
  minSep: 0.012, // hai điểm (vốn khác nhau) gần hơn minSep·kích thước → cấu hình suy biến
  minAngle: 4, // tam giác có góc < minAngle độ → suy biến
  maxRadius: 25, // đường tròn bán kính > maxRadius·kích thước → gần suy biến (3 điểm gần thẳng hàng)
  seed: 12345,
  maxPoints: 90, // giới hạn để tránh bùng nổ tổ hợp
};

// ---------- số ngẫu nhiên có hạt giống (tái lập được) ----------
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function figureScale(vals, pointIds) {
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
  for (const id of pointIds) {
    const v = vals.get(id);
    if (!v) continue;
    x1 = Math.min(x1, v.x); x2 = Math.max(x2, v.x); y1 = Math.min(y1, v.y); y2 = Math.max(y2, v.y);
  }
  const s = Math.hypot(x2 - x1, y2 - y1);
  return Number.isFinite(s) && s > 1e-12 ? s : 1;
}

const TRIANGLE_TYPES = new Set(['circumcenter', 'orthocenter', 'incenter', 'centroid', 'nine_point_center', 'altitude_foot', 'incircle_touch', 'arc_midpoint', 'circle_3pts', 'circumcircle', 'incircle', 'nine_point_circle', 'angle_bisector',
  'excenter', 'excircle', 'lemoine', 'kosnita', 'symmedian_foot', 'mixtilinear']);

/**
 * Các tam giác trong hình: bộ 3 điểm dùng trong bước kiểu tam giác, hoặc 3 điểm đôi một nối bằng
 * đoạn/đường thẳng/tia. Dùng để loại cấu hình có tam giác dẹt và để nhận diện O, H, I, đường tròn Euler...
 */
export function findTriangles(doc, kindOf, { strict = false, drawn = false } = {}) {
  const tri = new Map();
  const addTri = (ids) => {
    if (new Set(ids).size !== 3 || !ids.every((a) => kindOf.get(a) === 'point')) return;
    const key = [...ids].sort().join(',');
    if (!tri.has(key)) tri.set(key, ids);
  };
  // strict: chỉ tam giác "thật" (dựng bằng công cụ tam giác hoặc vẽ cạnh), không tính bộ 3 điểm của
  // "đường tròn qua 3 điểm" hay góc của phân giác
  // drawn: chỉ tam giác có đủ ba cạnh vẽ trên hình
  for (const s of doc.steps)
    if (!drawn && TRIANGLE_TYPES.has(s.type) && s.args.length === 3 && !(strict && (s.type === 'circle_3pts' || s.type === 'angle_bisector'))) addTri(s.args);
  const adj = new Map();
  const link = (a, b) => {
    if (!adj.has(a)) adj.set(a, new Set());
    if (!adj.has(b)) adj.set(b, new Set());
    adj.get(a).add(b);
    adj.get(b).add(a);
  };
  for (const s of doc.steps) if (['line', 'segment', 'ray'].includes(s.type)) link(s.args[0], s.args[1]);
  for (const [a, nb] of adj) for (const b of nb) for (const c of nb) if (a < b && b < c && adj.get(b).has(c)) addTri([a, b, c]);
  return [...tri.values()];
}

/** Sinh một cấu hình ngẫu nhiên: trả về Map id → params thay thế. */
function randomOverrides(doc, base, scale, rand, perturb) {
  const ov = new Map();
  for (const s of doc.steps) {
    const p = paramsOf(s);
    if (s.type === 'free_point') {
      const r = perturb * scale * Math.sqrt(rand()), a = 2 * Math.PI * rand();
      ov.set(s.id, { x: p.x + r * Math.cos(a), y: p.y + r * Math.sin(a) });
    } else if (s.type === 'point_on') {
      const host = base.get(s.args[0]);
      if (!host) continue;
      let t = p.t;
      if (host.kind === 'circle') t += (rand() * 2 - 1) * 0.9;
      else if (host.sub === 'segment') t = Math.min(0.92, Math.max(0.08, t + (rand() * 2 - 1) * 0.3));
      else if (host.sub === 'ray') t = Math.max(0.05, t * Math.exp((rand() * 2 - 1) * 0.5));
      else t += (rand() * 2 - 1) * 0.4;
      ov.set(s.id, { t });
    } else if (s.type === 'point_in') {
      // điểm trong tam giác: (u, v) ngẫu nhiên, tránh sát cạnh
      let u = rand(), v = rand();
      if (u + v > 1) { u = 1 - u; v = 1 - v; }
      ov.set(s.id, { u: 0.08 + 0.84 * u, v: 0.08 + 0.84 * v });
    }
  }
  return ov;
}

/** Cấu hình có gần suy biến không? */
function degenerate(doc, vals, ctx) {
  const { pointIds, curveIds, sameClassPairs, opts, kindOf, triangles, baseDist, baseShape, shapeTriangles, onSegments, tangentAtBase } = ctx;
  const scale = figureScale(vals, pointIds);
  for (const id of [...pointIds, ...curveIds]) if (!vals.get(id)) return 'không xác định';
  // điểm gần trùng nhau
  const sep = opts.minSep * scale;
  for (let i = 0; i < pointIds.length; i++) {
    const a = vals.get(pointIds[i]);
    for (let j = i + 1; j < pointIds.length; j++) {
      if (sameClassPairs.has(pointIds[i] + '|' + pointIds[j])) continue;
      const d = G.dist(a, vals.get(pointIds[j]));
      // gần trùng: vừa nhỏ so với kích thước hình, vừa co lại nhiều so với cấu hình gốc
      // (hai điểm vốn ở gần nhau trong hình gốc thì không bị coi là suy biến)
      if (d < sep && (!baseDist || d < 0.3 * baseDist[i][j])) return 'điểm gần trùng';
    }
  }
  // tam giác dẹt, đường tròn quá lớn, giao điểm gần tiếp xúc
  const sinMin = Math.sin((opts.minAngle * Math.PI) / 180);
  const ang = (P, Q, R) => Math.abs(G.cross(G.sub(Q, P), G.sub(R, P))) / (G.dist(P, Q) * G.dist(P, R) + 1e-300);
  for (const t of triangles) {
    const [A, B, C] = t.map((a) => vals.get(a));
    if (Math.min(ang(A, B, C), ang(B, C, A), ang(C, A, B)) < sinMin) return 'tam giác dẹt';
  }
  // bản 1.2: giao điểm với một ĐOẠN THẲNG nằm trong đoạn ở hình gốc thì phải còn nằm trong đoạn (vd "D, E thuộc
  // các cạnh"); điểm chạy ra ngoài đoạn là đã sang một cấu hình khác của đề
  if (onSegments) for (const [pid, sid] of onSegments) if (!insideSegment(vals.get(pid), vals.get(sid))) return 'ra ngoài đoạn thẳng';
  // bản 1.2: giữ "dạng" của các tam giác như hình gốc (chiều; góc nhọn/tù rõ ràng) – đề Olympic thường có điều kiện
  // kiểu "tam giác nhọn", và các nghiệm giao điểm/cung được chọn theo hình gốc
  if (baseShape) for (let i = 0; i < shapeTriangles.length; i++) {
    const sh = triShape(shapeTriangles[i].map((a) => vals.get(a)));
    if (baseShape[i].some((x, j) => x !== 0 && x !== sh[j])) return 'đổi dạng tam giác';
  }
  for (const s of doc.steps) {
    const v = vals.get(s.id);
    if (v && v.kind === 'circle' && v.r > opts.maxRadius * scale) return 'đường tròn quá lớn';
    if (s.type === 'intersection' || s.type === 'intersection_other') {
      const r = G.intersect(vals.get(s.args[0]), vals.get(s.args[1]));
      // tiếp điểm theo cách dựng (hai đường tiếp xúc ngay ở hình gốc, vd đường tròn mixtilinear và (O)) không tính
      if (r.length === 2 && G.dist(r[0], r[1]) < sep * 2 && !(tangentAtBase && tangentAtBase.has(s.id))) return 'gần tiếp xúc';
      if (r.length === 1 && kindOf.get(s.args[0]) === 'line' && kindOf.get(s.args[1]) === 'line') {
        const l1 = vals.get(s.args[0]), l2 = vals.get(s.args[1]);
        if (Math.abs(G.cross(G.unit(l1.d), G.unit(l2.d))) < sinMin) return 'hai đường gần song song';
      }
    }
  }
  return null;
}

const insideSegment = (P, l) => { const t = G.lineParam(P, l); return t > -1e-9 && t < 1 + 1e-9; };

/** Giao điểm (step) dựng trên một đoạn thẳng mà ở hình gốc nằm trong đoạn đó: [[id điểm, id đoạn]]. */
function pointsOnSegments(doc, base) {
  const out = [];
  const typeOf = new Map(doc.steps.map((s) => [s.id, s.type]));
  for (const s of doc.steps) {
    if (s.type !== 'intersection' && s.type !== 'intersection_other') continue;
    const P = base.get(s.id);
    if (!P) continue;
    for (const a of s.args.slice(0, 2)) if (typeOf.get(a) === 'segment' && base.get(a) && insideSegment(P, base.get(a))) out.push([s.id, a]);
  }
  return out;
}

/** Dạng tam giác: [chiều, góc A, góc B, góc C] với +1/−1 (góc: nhọn/tù), 0 nếu gần ranh giới (góc gần vuông). */
function triShape([A, B, C]) {
  const area = G.cross(G.sub(B, A), G.sub(C, A));
  const cosAt = (P, Q, R) => G.dot(G.sub(Q, P), G.sub(R, P)) / (G.dist(P, Q) * G.dist(P, R) + 1e-300);
  const sg = (c) => (Math.abs(c) < 0.05 ? 0 : Math.sign(c));
  return [Math.sign(area), sg(cosAt(A, B, C)), sg(cosAt(B, C, A)), sg(cosAt(C, A, B))];
}

// ---------- các phép thử quan hệ (dung sai tương đối theo kích thước hình) ----------
const T = {
  coincide: (P, Q, e) => G.dist(P, Q) < e,
  onLine: (P, l, e) => G.distPointLine(P, l) < e,
  onCircle: (P, c, e) => Math.abs(G.dist(P, c.c) - c.r) < e,
  collinear: (P, Q, R, e) => G.distPointLine(R, G.lineThrough(P, Q)) < e,
  parallel: (l1, l2, e, s) => Math.abs(G.cross(G.unit(l1.d), G.unit(l2.d))) < e / s,
  perpendicular: (l1, l2, e, s) => Math.abs(G.dot(G.unit(l1.d), G.unit(l2.d))) < e / s,
  sameLine: (l1, l2, e, s) => T.parallel(l1, l2, e, s) && G.distPointLine(l2.p, l1) < e,
  sameCircle: (c1, c2, e) => G.dist(c1.c, c2.c) < e && Math.abs(c1.r - c2.r) < e,
  tangentLC: (l, c, e) => Math.abs(G.distPointLine(c.c, l) - c.r) < e,
  tangentCC: (c1, c2, e) => {
    const d = G.dist(c1.c, c2.c);
    if (d < e) return false; // đồng tâm
    return Math.abs(d - (c1.r + c2.r)) < e || Math.abs(d - Math.abs(c1.r - c2.r)) < e;
  },
};

/**
 * Khám phá. Trả về {relations:[{type, ids, text, score, ...}], stats}.
 */
export function explore(doc, options = {}) {
  const opts = { ...DEFAULTS, ...options };
  const t0 = Date.now();
  const kindOf = kinds(doc);
  const base = evaluate(doc);
  const pointIds = [], lineIds = [], circleIds = [];
  for (const s of doc.steps) {
    if (!base.get(s.id)) continue;
    const kd = kindOf.get(s.id);
    if (kd === 'point') pointIds.push(s.id);
    else if (kd === 'line') lineIds.push(s.id);
    else if (kd === 'circle') circleIds.push(s.id);
  }
  if (pointIds.length > opts.maxPoints) pointIds.length = opts.maxPoints;
  const curveIds = [...lineIds, ...circleIds];
  const scale0 = figureScale(base, pointIds);

  // Các điểm trùng nhau trong cấu hình gốc (ứng viên "luôn trùng")
  const sameClassPairs = new Set();
  for (let i = 0; i < pointIds.length; i++)
    for (let j = i + 1; j < pointIds.length; j++)
      if (G.dist(base.get(pointIds[i]), base.get(pointIds[j])) < opts.tol * scale0) sameClassPairs.add(pointIds[i] + '|' + pointIds[j]);

  // ---- lấy mẫu ----
  const rand = rng(opts.seed);
  const triangles = findTriangles(doc, kindOf);
  const baseDist = pointIds.map((a) => pointIds.map((b) => G.dist(base.get(a), base.get(b))));
  const shapeTriangles = findTriangles(doc, kindOf, { drawn: true });
  const baseShape = shapeTriangles.map((t) => (t.every((a) => base.get(a)) ? triShape(t.map((a) => base.get(a))) : [0, 0, 0, 0]));
  // giao điểm của hai đường tiếp xúc ngay ở hình gốc (hai nghiệm trùng tới sai số làm tròn)
  const tangentAtBase = new Set(doc.steps.filter((s) => (s.type === 'intersection' || s.type === 'intersection_other') && (() => {
    const r = G.intersect(base.get(s.args[0]), base.get(s.args[1]));
    return r.length === 2 && G.dist(r[0], r[1]) < 1e-6 * scale0;
  })()).map((s) => s.id));
  const ctx = { pointIds, curveIds, sameClassPairs, opts, kindOf, triangles, baseDist, baseShape, shapeTriangles, onSegments: pointsOnSegments(doc, base), tangentAtBase };
  const samples = [{ vals: base, scale: scale0 }];
  let attempts = 0;
  const rejected = {};
  const baseDegenerate = degenerate(doc, base, { ...ctx, baseDist: null, baseShape: null, onSegments: null });
  while (samples.length < opts.samples + 1 && attempts < opts.maxAttempts) {
    attempts++;
    const ov = randomOverrides(doc, base, scale0, rand, opts.perturb);
    const vals = evaluate(doc, ov);
    const why = degenerate(doc, vals, ctx);
    if (why) { rejected[why] = (rejected[why] || 0) + 1; continue; }
    samples.push({ vals, scale: figureScale(vals, pointIds) });
  }
  const all = (fn) => samples.every(({ vals, scale }) => fn(vals, opts.tol * scale, scale));

  // ---- lớp điểm luôn trùng nhau ----
  const repOf = new Map(pointIds.map((id) => [id, id]));
  const classes = [];
  for (const id of pointIds) {
    if (repOf.get(id) !== id) continue;
    const cls = [id];
    for (const j of pointIds) {
      if (j === id || repOf.get(j) !== j || !sameClassPairs.has(id + '|' + j)) continue;
      if (all((v, e) => T.coincide(v.get(id), v.get(j), e))) { cls.push(j); repOf.set(j, id); }
    }
    if (cls.length > 1) classes.push(cls);
  }
  const rep = (id) => repOf.get(id) || id;
  const reps = pointIds.filter((id) => rep(id) === id);
  const know = new Knowledge(doc, rep);

  const special = recognizeSpecial(doc, samples, reps, circleIds, kindOf, opts, findTriangles(doc, kindOf, { strict: true }));
  const rel = [];
  const name = (id) => stepById(doc, id)?.name || id;
  const desc = (id) => describe(doc, id);
  const list = (ids) => ids.map(name).join(', ');

  for (const cls of classes) rel.push({ type: 'coincide', ids: cls, text: `${cls.map(name).join(' ≡ ')} (trùng nhau)` });

  // ---- đường thẳng trùng nhau / đường tròn trùng nhau ----
  const lineRep = new Map(lineIds.map((id) => [id, id]));
  for (let i = 0; i < lineIds.length; i++) {
    const a = lineIds[i];
    if (lineRep.get(a) !== a) continue;
    for (let j = i + 1; j < lineIds.length; j++) {
      const b = lineIds[j];
      if (lineRep.get(b) !== b) continue;
      if (all((v, e, s) => T.sameLine(v.get(a), v.get(b), e, s))) {
        lineRep.set(b, a);
        if (!know.sameLine(a, b)) rel.push({ type: 'same_line', ids: [a, b], text: `${desc(a)} trùng ${desc(b)}` });
      }
    }
  }
  const circRep = new Map(circleIds.map((id) => [id, id]));
  for (let i = 0; i < circleIds.length; i++) {
    const a = circleIds[i];
    if (circRep.get(a) !== a) continue;
    for (let j = i + 1; j < circleIds.length; j++) {
      const b = circleIds[j];
      if (circRep.get(b) !== b) continue;
      if (all((v, e) => T.sameCircle(v.get(a), v.get(b), e))) {
        circRep.set(b, a);
        if (!know.sameCircle(a, b)) rel.push({ type: 'same_circle', ids: [a, b], text: `${desc(a)} trùng ${desc(b)}` });
      }
    }
  }
  const lines = lineIds.filter((id) => lineRep.get(id) === id);
  const circles = circleIds.filter((id) => circRep.get(id) === id);
  const v0 = base, e0 = opts.tol * scale0;

  // ---- điểm thuộc đường thẳng / đường tròn đã dựng ----
  const onLineSets = new Map(); // line → các điểm (đại diện) thuộc nó (cả hiển nhiên)
  for (const l of lines) {
    const on = reps.filter((P) => T.onLine(v0.get(P), v0.get(l), e0) && all((v, e) => T.onLine(v.get(P), v.get(l), e)));
    onLineSets.set(l, on);
    const fresh = on.filter((P) => !lineIdsSameAs(l, lineIds, lineRep).some((ll) => know.pointOnLineObj(P, ll)));
    if (fresh.length) rel.push({ type: 'on_line', ids: [l, ...fresh], text: `${list(fresh)} nằm trên ${desc(l)}` });
  }
  const onCircleSets = new Map();
  for (const c of circles) {
    const on = reps.filter((P) => T.onCircle(v0.get(P), v0.get(c), e0) && all((v, e) => T.onCircle(v.get(P), v.get(c), e)));
    onCircleSets.set(c, on);
    const fresh = on.filter((P) => !lineIdsSameAs(c, circleIds, circRep).some((cc) => know.pointOnCircleObj(P, cc)));
    if (fresh.length) rel.push({ type: 'on_circle', ids: [c, ...fresh], text: `${list(fresh)} nằm trên ${desc(c)}` });
  }

  // ---- thẳng hàng (tập tối đại, không nằm trọn trên đường thẳng đã dựng) ----
  const seenCol = new Set();
  for (let i = 0; i < reps.length; i++)
    for (let j = i + 1; j < reps.length; j++) {
      const A = reps[i], B = reps[j];
      const pa = v0.get(A), pb = v0.get(B);
      const set = [A, B];
      for (let k = 0; k < reps.length; k++) {
        if (k === i || k === j) continue;
        if (T.collinear(pa, pb, v0.get(reps[k]), e0)) set.push(reps[k]);
      }
      if (set.length < 3) continue;
      const verified = [A, B, ...set.slice(2).filter((C) => all((v, e) => T.collinear(v.get(A), v.get(B), v.get(C), e)))];
      if (verified.length < 3) continue;
      const key = [...verified].sort().join(',');
      if (seenCol.has(key)) continue;
      seenCol.add(key);
      if ([...onLineSets.values()].some((on) => verified.every((P) => on.includes(P)))) continue;
      if (know.collinear(verified)) continue;
      // bỏ tập con của một tập thẳng hàng lớn hơn sẽ được báo (xử lý sau)
      rel.push({ type: 'collinear', ids: sortByDoc(doc, verified), text: `${list(sortByDoc(doc, verified))} thẳng hàng` });
    }

  // ---- đồng viên (≥ 4 điểm, không nằm trọn trên đường tròn đã dựng) ----
  const seenCyc = new Set();
  const nR = reps.length;
  for (let i = 0; i < nR; i++)
    for (let j = i + 1; j < nR; j++)
      for (let k = j + 1; k < nR; k++) {
        const A = reps[i], B = reps[j], C = reps[k];
        const circ = G.circleThrough(v0.get(A), v0.get(B), v0.get(C));
        if (!circ || circ.r > opts.maxRadius * scale0) continue;
        const set = [A, B, C];
        for (let m = k + 1; m < nR; m++) if (T.onCircle(v0.get(reps[m]), circ, e0)) set.push(reps[m]);
        if (set.length < 4) continue;
        const key0 = set.join(',');
        if (seenCyc.has('raw:' + key0)) continue;
        // tập đầy đủ (kể cả điểm có chỉ số nhỏ hơn) để khử trùng lặp
        const full = reps.filter((P) => T.onCircle(v0.get(P), circ, e0));
        const ok = full.filter((P, idx) => idx < 3 || all((v, e) => {
          const c = G.circleThrough(v.get(full[0]), v.get(full[1]), v.get(full[2]));
          return c && T.onCircle(v.get(P), c, e);
        }));
        const key = [...ok].sort().join(',');
        seenCyc.add('raw:' + key0);
        if (ok.length < 4 || seenCyc.has(key)) continue;
        seenCyc.add(key);
        if ([...onCircleSets.values()].some((on) => ok.every((P) => on.includes(P)))) continue;
        if (know.concyclic(ok)) continue;
        const ids = sortByDoc(doc, ok);
        rel.push({ type: 'concyclic', ids, text: `${list(ids)} đồng viên` });
      }

  // ---- song song, vuông góc, tiếp xúc ----
  for (let i = 0; i < lines.length; i++)
    for (let j = i + 1; j < lines.length; j++) {
      const a = lines[i], b = lines[j];
      if (T.parallel(v0.get(a), v0.get(b), e0, scale0) && all((v, e, s) => T.parallel(v.get(a), v.get(b), e, s)) && !know.parallel(a, b))
        rel.push({ type: 'parallel', ids: [a, b], text: `${desc(a)} ∥ ${desc(b)}` });
      if (T.perpendicular(v0.get(a), v0.get(b), e0, scale0) && all((v, e, s) => T.perpendicular(v.get(a), v.get(b), e, s)) && !know.perpendicular(a, b))
        rel.push({ type: 'perpendicular', ids: [a, b], text: `${desc(a)} ⊥ ${desc(b)}` });
    }
  for (const l of lines)
    for (const c of circles)
      if (T.tangentLC(v0.get(l), v0.get(c), e0) && all((v, e) => T.tangentLC(v.get(l), v.get(c), e)) && !know.tangent(l, c))
        rel.push({ type: 'tangent', ids: [l, c], text: `${desc(l)} tiếp xúc ${desc(c)}` });
  for (let i = 0; i < circles.length; i++)
    for (let j = i + 1; j < circles.length; j++) {
      const a = circles[i], b = circles[j];
      if (T.tangentCC(v0.get(a), v0.get(b), e0) && all((v, e) => T.tangentCC(v.get(a), v.get(b), e)) && !know.tangent(a, b))
        rel.push({ type: 'tangent', ids: [a, b], text: `${desc(a)} tiếp xúc ${desc(b)}` });
    }

  // ---- đồng quy (≥ 3 đường thẳng/đường tròn qua một điểm CHƯA được dựng) ----
  const curves = [...lines, ...circles];
  const seenConc = new Set();
  for (let i = 0; i < curves.length; i++)
    for (let j = i + 1; j < curves.length; j++) {
      const a = curves[i], b = curves[j];
      for (const X of G.intersect(v0.get(a), v0.get(b))) {
        if (G.dist(X, { x: 0, y: 0 }) > 1e6 || reps.some((P) => G.dist(v0.get(P), X) < 1e3 * e0)) continue;
        if (pointIds.length && minDistToPoints(X, v0, pointIds) > 20 * scale0) continue; // quá xa hình
        const through = curves.filter((c) => c !== a && c !== b && onCurve(X, v0.get(c), e0));
        if (!through.length) continue;
        const set = [a, b, ...through];
        const key = [...set].sort().join(',');
        if (seenConc.has(key)) continue;
        seenConc.add(key);
        const ok = all((v, e) => G.intersect(v.get(a), v.get(b)).some((Y) => through.every((c) => onCurve(Y, v.get(c), e))));
        if (!ok) continue;
        const allLines = set.every((c) => kindOf.get(c) === 'line');
        rel.push({ type: 'concurrent', ids: set, text: allLines ? `${set.map(desc).join(', ')} đồng quy` : `${set.map(desc).join(', ')} cùng đi qua một điểm` });
      }
    }

  // ---- bỏ các tập thẳng hàng/đồng viên là tập con của tập khác đã báo ----
  const final = rel.filter((r) => !((r.type === 'collinear' || r.type === 'concyclic') &&
    rel.some((o) => o !== r && o.type === r.type && o.ids.length > r.ids.length && r.ids.every((x) => o.ids.includes(x)))));
  for (const r of final) {
    r.score = scoreOf(r, doc, kindOf, special);
    const notes = [...new Set(r.ids.filter((id) => special.has(id) && !STEP_TYPES[stepById(doc, id)?.type]?.tag).map((id) => `${describe(doc, id)} là ${special.get(id).label}`))];
    if (notes.length) r.note = notes.join('; ');
  }
  final.sort((a, b) => b.score - a.score || a.ids.length - b.ids.length);

  return {
    relations: final,
    stats: {
      samples: samples.length - 1,
      attempts,
      rejected,
      baseDegenerate,
      points: reps.length,
      lines: lines.length,
      circles: circles.length,
      ms: Date.now() - t0,
    },
  };
}

function lineIdsSameAs(id, ids, repMap) {
  return ids.filter((x) => repMap.get(x) === id);
}

function onCurve(P, c, e) {
  return c.kind === 'line' ? T.onLine(P, c, e) : T.onCircle(P, c, e);
}

function minDistToPoints(X, vals, ids) {
  let m = Infinity;
  for (const id of ids) m = Math.min(m, G.dist(vals.get(id), X));
  return m;
}

function sortByDoc(doc, ids) {
  const idx = new Map(doc.steps.map((s, i) => [s.id, i]));
  return [...ids].sort((a, b) => idx.get(a) - idx.get(b));
}

// ---------- xếp hạng ----------
const BASE_SCORE = { tangent: 6, concurrent: 5, concyclic: 5, on_circle: 5, collinear: 5, on_line: 3.5, perpendicular: 3, parallel: 3, coincide: 3, same_line: 3, same_circle: 3 };
const SPECIAL_NAMES = new Set(['O', 'I', 'H']);

/** Mức độ đặc biệt của một đối tượng: dính đường tròn ngoại/nội tiếp, Euler, hoặc các điểm O, I, H (rồi G, N). */
export function specialWeight(step) {
  const tag = STEP_TYPES[step.type]?.tag;
  if (tag === 'circumcircle' || tag === 'incircle' || tag === 'ninepoint') return 3;
  if (tag === 'O' || tag === 'I' || tag === 'H') return 3;
  if (SPECIAL_NAMES.has(step.name)) return 2.5;
  if (tag === 'G' || tag === 'N') return 2;
  return 0;
}

function scoreOf(r, doc, kindOf, recognized) {
  let s = BASE_SCORE[r.type] || 2;
  let special = 0;
  for (const id of r.ids) special += Math.max(specialWeight(stepById(doc, id) || {}), recognized.get(id)?.weight || 0);
  s += Math.min(special, 7);
  if (r.ids.some((id) => kindOf.get(id) === 'circle')) s += 0.5;
  return Math.round(s * 10) / 10;
}

// ---------- nhận diện đối tượng đặc biệt của các tam giác trong hình ----------
// Tam giác = bộ 3 điểm dùng trong các bước kiểu tam giác, hoặc 3 điểm đôi một nối bởi đoạn/đường thẳng.
// Đối tượng (dựng theo cách bất kỳ) trùng với O, H, I, G, N hay đường tròn ngoại tiếp/nội tiếp/Euler
// của một tam giác như vậy trên mọi mẫu sẽ được ưu tiên khi xếp hạng.
function recognizeSpecial(doc, samples, reps, circleIds, kindOf, opts, tri) {
  const out = new Map();
  const name = (id) => stepById(doc, id)?.name || id;
  let count = 0;
  for (const [A, B, C] of tri) {
    if (++count > 12) break;
    const triName = name(A) + name(B) + name(C);
    const at = (v) => [v.get(A), v.get(B), v.get(C)];
    const PTS = [
      ['O', 3, 'tâm ngoại tiếp', G.circumcenter], ['H', 3, 'trực tâm', G.orthocenter], ['I', 3, 'tâm nội tiếp', G.incenter],
      ['G', 2, 'trọng tâm', G.centroid], ['N', 2, 'tâm đường tròn Euler', G.ninePointCenter],
    ];
    for (const [, w, label, f] of PTS)
      for (const P of reps) {
        if (out.has(P) && out.get(P).weight >= w) continue;
        if (samples.every(({ vals, scale }) => { const X = f(...at(vals)); return X && G.dist(X, vals.get(P)) < opts.tol * scale; }))
          out.set(P, { weight: w, label: `${label} tam giác ${triName}` });
      }
    const CIRC = [
      [3, 'đường tròn ngoại tiếp', (a, b, c) => G.circleThrough(a, b, c)],
      [3, 'đường tròn nội tiếp', (a, b, c) => G.circle(G.incenter(a, b, c), G.inradius(a, b, c))],
      [3, 'đường tròn Euler', (a, b, c) => G.circleThrough(G.mid(a, b), G.mid(b, c), G.mid(c, a))],
    ];
    for (const [w, label, f] of CIRC)
      for (const c of circleIds) {
        if (out.has(c)) continue;
        if (samples.every(({ vals, scale }) => { const X = f(...at(vals)); const Y = vals.get(c); return X && Y && T.sameCircle(X, Y, opts.tol * scale); }))
          out.set(c, { weight: w, label: `${label} tam giác ${triName}` });
      }
  }
  return out;
}
