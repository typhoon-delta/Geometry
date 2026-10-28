// Tự chọn hướng đặt nhãn điểm: tránh các đường thẳng/đường tròn đi qua điểm và các điểm lân cận,
// ưu tiên hướng ra xa tâm hình. Dùng chung cho màn hình và xuất TikZ.

import { kinds } from './model.js';
import * as G from './geom.js';

const N_DIR = 16;

/**
 * Trả về Map id điểm → hướng đơn vị {x, y} (theo hệ toạ độ hình, y hướng lên).
 * Chỉ tính cho điểm KHÔNG có labelOffset riêng.
 */
export function autoLabelDirs(doc, values, isShown = (s) => !s.hidden) {
  const k = kinds(doc);
  const shown = doc.steps.filter((s) => isShown(s) && values.get(s.id));
  const pts = shown.filter((s) => k.get(s.id) === 'point');
  const curves = shown.filter((s) => k.get(s.id) === 'line' || k.get(s.id) === 'circle');
  if (!pts.length) return new Map();
  let cx = 0, cy = 0, x1 = Infinity, x2 = -Infinity, y1 = Infinity, y2 = -Infinity;
  for (const s of pts) {
    const v = values.get(s.id);
    cx += v.x; cy += v.y;
    x1 = Math.min(x1, v.x); x2 = Math.max(x2, v.x); y1 = Math.min(y1, v.y); y2 = Math.max(y2, v.y);
  }
  cx /= pts.length; cy /= pts.length;
  const scale = Math.max(x2 - x1, y2 - y1, 1e-9);
  const near = 0.12 * scale;
  const out = new Map();
  for (const s of pts) {
    if (s.style && s.style.labelOffset) continue;
    const P = values.get(s.id);
    const blocked = []; // [góc, trọng số]
    for (const c of curves) {
      const v = values.get(c.id);
      if (G.distToObject(v, P) > 1e-6 * scale) continue;
      if (v.kind === 'line') {
        const a = Math.atan2(v.d.y, v.d.x);
        const t = G.lineParam(P, v);
        const sub = c.type === 'segment' ? 'segment' : c.type === 'ray' ? 'ray' : v.sub;
        const fwd = sub === 'line' || (sub === 'ray' ? true : t < 1 - 1e-9);
        const back = sub === 'line' || t > 1e-9;
        if (fwd) blocked.push([a, 1]);
        if (back) blocked.push([a + Math.PI, 1]);
      } else {
        const a = Math.atan2(P.y - v.c.y, P.x - v.c.x);
        blocked.push([a + Math.PI / 2, 1], [a - Math.PI / 2, 1], [a + Math.PI, 0.4]);
      }
    }
    for (const o of pts) {
      if (o === s) continue;
      const Q = values.get(o.id);
      const d = G.dist(P, Q);
      if (d > 1e-9 && d < near) blocked.push([Math.atan2(Q.y - P.y, Q.x - P.x), 0.8]);
    }
    const away = Math.atan2(P.y - cy, P.x - cx);
    const hasAway = Math.hypot(P.x - cx, P.y - cy) > 0.02 * scale;
    let best = Math.PI / 4, bestScore = -Infinity;
    for (let i = 0; i < N_DIR; i++) {
      const th = (2 * Math.PI * i) / N_DIR;
      let gap = Math.PI;
      for (const [a, w] of blocked) gap = Math.min(gap, angDiff(th, a) / w);
      let score = Math.min(gap, Math.PI / 2) * 2;
      if (hasAway) score += 0.5 * Math.cos(angDiff(th, away));
      score += 0.05 * Math.cos(angDiff(th, Math.PI / 4)); // ưu tiên nhẹ phía trên-phải
      if (score > bestScore) { bestScore = score; best = th; }
    }
    out.set(s.id, { x: Math.cos(best), y: Math.sin(best) });
  }
  return out;
}

function angDiff(a, b) {
  let d = Math.abs(a - b) % (2 * Math.PI);
  return d > Math.PI ? 2 * Math.PI - d : d;
}
