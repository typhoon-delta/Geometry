// Quan hệ do bộ khám phá báo có "nói lên" một nhận định không (bản 1.9)? Dùng cho thước đo (tests/kham-pha) và cho
// khám phá theo mục tiêu (đánh dấu quan hệ chính là kết luận / bổ đề).
//
//   relationImplies(doc, vals, rel, claim) → true nếu quan hệ rel (từ explore) bao hàm nhận định claim (từ check.js)
//
// Quan hệ "điểm cùng nằm trên một đường" (thẳng hàng, đồng viên, X nằm trên (ABC)…) được mở rộng thành tập mọi điểm
// trên đường đó; đường thẳng / đường tròn so bằng số (hai đối tượng dựng khác nhau nhưng trùng nhau vẫn khớp).

import { kinds } from '../core/model.js';
import * as G from '../core/geom.js';

const TOL = 1e-7;

function scaleOf(vals) {
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
  for (const v of vals.values()) if (v && v.kind === 'point') { x1 = Math.min(x1, v.x); x2 = Math.max(x2, v.x); y1 = Math.min(y1, v.y); y2 = Math.max(y2, v.y); }
  const s = Math.hypot(x2 - x1, y2 - y1);
  return Number.isFinite(s) && s > 0 ? s : 1;
}

export function onCurve(P, c, e) {
  if (!P || !c) return false;
  if (c.kind === 'line') return G.distPointLine(P, c) < e;
  if (c.kind === 'circle') return Math.abs(G.dist(P, c.c) - c.r) < e;
  return false;
}

export function sameCurve(a, b, e) {
  if (!a || !b || a.kind !== b.kind) return false;
  if (a.kind === 'line') return Math.abs(G.cross(G.unit(a.d), G.unit(b.d))) < e && G.distPointLine(b.p, a) < e;
  return G.dist(a.c, b.c) < e && Math.abs(a.r - b.r) < e;
}

/** Ngữ cảnh so khớp cho một hình (tính một lần). */
export function matchContext(doc, vals) {
  const k = kinds(doc);
  const pts = doc.steps.filter((s) => k.get(s.id) === 'point' && vals.get(s.id)).map((s) => s.id);
  const scale = scaleOf(vals);
  const e = TOL * scale;
  const ptsOn = (cid) => pts.filter((p) => onCurve(vals.get(p), vals.get(cid), e));
  return { doc, vals, k, pts, e, ptsOn };
}

/** Quan hệ → các "khẳng định" dạng chuẩn. */
function assertionsOf(ctx, rel) {
  const { k } = ctx;
  const t = rel.type;
  if (t === 'collinear') return [{ on: 'line', pts: new Set(rel.ids) }];
  if (t === 'concyclic') return [{ on: 'circle', pts: new Set(rel.ids) }];
  if (t === 'on_line' || t === 'on_circle') return [{ on: t === 'on_line' ? 'line' : 'circle', pts: new Set([...rel.ids.slice(1), ...ctx.ptsOn(rel.ids[0])]), curve: rel.ids[0] }];
  if (t === 'coincide') return [{ same: new Set(rel.ids) }];
  if (t === 'concurrent' && rel.ids.every((id) => k.get(id))) return [{ curves: 'concurrent', ids: rel.ids }];
  if (['parallel', 'perpendicular', 'tangent', 'same_line', 'same_circle'].includes(t)) return [{ curves: t, ids: rel.ids }];
  if (t === 'equal_len') return [{ segs: rel.segs }];
  if (t === 'equal_angle') return [{ angles: rel.angles }];
  return [];
}

const segKey = ([a, b]) => (a < b ? a + '|' + b : b + '|' + a);

export function relationImplies(ctx, rel, claim) {
  const { vals, e } = ctx;
  const ids = claim.ids;
  const V = (id) => vals.get(id);
  const curveIn = (cid, list) => list.some((x) => sameCurve(V(cid), V(x), e));
  for (const a of assertionsOf(ctx, rel)) {
    switch (claim.type) {
      case 'collinear': if (a.on === 'line' && ids.every((p) => a.pts.has(p))) return true; break;
      case 'concyclic': if (a.on === 'circle' && ids.every((p) => a.pts.has(p))) return true; break;
      case 'on_line':
      case 'on_circle': {
        const want = claim.type === 'on_line' ? 'line' : 'circle';
        if (a.on !== want || !a.pts.has(ids[0])) break;
        const onC = [...a.pts].filter((p) => p !== ids[0] && onCurve(V(p), V(ids[1]), e));
        if (onC.length >= (want === 'line' ? 2 : 3) || (a.curve && sameCurve(V(a.curve), V(ids[1]), e))) return true;
        break;
      }
      case 'coincide': if (a.same && ids.every((p) => a.same.has(p))) return true; break;
      case 'parallel': case 'perpendicular': case 'tangent': case 'same_line': case 'same_circle':
        if (a.curves === claim.type && ids.every((id) => curveIn(id, a.ids))) return true;
        break;
      case 'concurrent': if (a.curves === 'concurrent' && ids.every((id) => curveIn(id, a.ids))) return true; break;
      case 'equal_len': {
        if (!a.segs) break;
        const keys = new Set(a.segs.map(segKey));
        if (keys.has(segKey([ids[0], ids[1]])) && keys.has(segKey([ids[2], ids[3]]))) return true;
        break;
      }
      case 'equal_angle': case 'sup_angle': {
        if (!a.angles) break;
        // góc (bộ ba điểm) thuộc lớp – so bằng số đo trên hình: hai góc của nhận định đều có trong lớp
        const has = (A, B, C) => a.angles.some(([x, y, z]) => y === B && ((x === A && z === C) || (x === C && z === A)));
        if (has(ids[0], ids[1], ids[2]) && has(ids[3], ids[4], ids[5])) return true;
        break;
      }
      default: break;
    }
  }
  return false;
}
