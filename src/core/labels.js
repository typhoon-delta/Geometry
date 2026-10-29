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

// ======================= Đặt nhãn theo KHUNG CHỮ trên màn hình (bản 1.2) =======================
// autoLabelDirs ở trên chỉ chọn HƯỚNG và đặt TÂM nhãn cách điểm một khoảng cố định – nhãn rộng (I_A, M_{BC})
// đặt sang trái/phải sẽ đè lên chính điểm của nó, và không biết nhãn có cắt đường hay đè nhãn khác không.
// placeLabels làm việc trong toạ độ màn hình với kích thước chữ thật: mỗi ứng viên là một khung chữ đặt sát
// điểm theo kiểu "neo" của TikZ (cạnh/góc gần điểm nhất cách điểm `gap` px), chấm điểm theo số đường cắt qua
// khung, điểm bị che, nhãn đã đặt bị đè, ra ngoài khung nhìn; nhãn khó đặt (nhiều đường qua, sát điểm khác)
// được đặt trước (tham lam).

const N_CAND = 24;

/**
 * pts   : [{id, x, y, w, h, r}] – toạ độ màn hình (y hướng xuống), w×h khung chữ, r bán kính chấm điểm
 * curves: [{kind:'seg', x1, y1, x2, y2} | {kind:'circle', cx, cy, r}] – các đường đang hiện (màn hình)
 * fixed : [{x, y, w, h}] – khung chữ đã cố định (nhãn người dùng tự kéo) để tránh
 * opts  : {W, H, gap, center:{x,y}}
 * Trả về Map id → {dx, dy}: độ dời TÂM khung chữ so với điểm (px, y hướng xuống).
 */
export function placeLabels(pts, curves, fixed = [], opts = {}) {
  const W = opts.W ?? Infinity, H = opts.H ?? Infinity, gap = opts.gap ?? 3;
  const center = opts.center || centroidOf(pts);
  const placed = fixed.map((b) => ({ x: b.x, y: b.y, w: b.w, h: b.h }));
  // độ khó: số đường đi qua sát điểm + số điểm lân cận
  const crowd = pts.map((p) => {
    let c = 0;
    for (const cv of curves) if (distToCurve(cv, p.x, p.y) < 2) c += 1;
    for (const q of pts) if (q !== p && Math.hypot(q.x - p.x, q.y - p.y) < 3 * (p.w + p.h)) c += 0.7;
    return c;
  });
  const order = pts.map((_, i) => i).sort((a, b) => crowd[b] - crowd[a]);
  const out = new Map();
  for (const i of order) {
    const p = pts[i];
    const away = Math.atan2(p.y - center.y, p.x - center.x);
    const hasAway = Math.hypot(p.x - center.x, p.y - center.y) > 4;
    let best = null;
    for (const ring of [0, 1]) {
      const g = p.r + gap + ring * 7;
      for (let k = 0; k < N_CAND; k++) {
        const th = (2 * Math.PI * k) / N_CAND;
        const c = Math.cos(th), s = Math.sin(th); // màn hình: y xuống
        const ax = clamp(1.6 * c), ay = clamp(1.6 * s);
        const cx = p.x + g * c + (p.w / 2) * ax, cy = p.y + g * s + (p.h / 2) * ay;
        const box = { x: cx - p.w / 2, y: cy - p.h / 2, w: p.w, h: p.h };
        let cost = ring * 1.2;
        const inner = shrink(box, 1);
        for (const cv of curves) if (curveHitsBox(cv, inner)) cost += 8;
        for (const q of pts) if (q !== p && q.x > box.x - q.r - 1 && q.x < box.x + box.w + q.r + 1 && q.y > box.y - q.r - 1 && q.y < box.y + box.h + q.r + 1) cost += 12;
        for (const b of placed) { const a = overlapArea(box, b); if (a > 0) cost += 14 + (20 * a) / (box.w * box.h); }
        if (box.x < 2 || box.y < 2 || box.x + box.w > W - 2 || box.y + box.h > H - 2) cost += 6;
        if (hasAway) cost += 0.6 * (1 - Math.cos(th - away)) / 2;
        cost += 0.08 * (1 - Math.cos(th + Math.PI / 4)) / 2; // hơi ưu tiên phía trên-phải
        if (!best || cost < best.cost - 1e-9) best = { cost, box, dx: cx - p.x, dy: cy - p.y };
      }
      if (best && best.cost < 1.5) break; // vòng sát điểm đã có chỗ tốt
    }
    placed.push(best.box);
    out.set(p.id, { dx: best.dx, dy: best.dy });
  }
  return out;
}

const clamp = (v) => Math.max(-1, Math.min(1, v));
const shrink = (b, m) => ({ x: b.x + m, y: b.y + m, w: b.w - 2 * m, h: b.h - 2 * m });

function centroidOf(pts) {
  let x = 0, y = 0;
  for (const p of pts) { x += p.x; y += p.y; }
  return pts.length ? { x: x / pts.length, y: y / pts.length } : { x: 0, y: 0 };
}

function overlapArea(a, b) {
  const ix = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), iy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return ix > 0 && iy > 0 ? ix * iy : 0;
}

function distToCurve(cv, x, y) {
  if (cv.kind === 'circle') return Math.abs(Math.hypot(x - cv.cx, y - cv.cy) - cv.r);
  const dx = cv.x2 - cv.x1, dy = cv.y2 - cv.y1, L2 = dx * dx + dy * dy;
  const t = L2 > 0 ? Math.max(0, Math.min(1, ((x - cv.x1) * dx + (y - cv.y1) * dy) / L2)) : 0;
  return Math.hypot(x - cv.x1 - t * dx, y - cv.y1 - t * dy);
}

/** Đường (đoạn hoặc đường tròn, toạ độ màn hình) có đi qua bên trong khung chữ nhật không. */
export function curveHitsBox(cv, b) {
  if (cv.kind === 'circle') {
    const nx = Math.max(b.x, Math.min(cv.cx, b.x + b.w)), ny = Math.max(b.y, Math.min(cv.cy, b.y + b.h));
    const dmin = Math.hypot(nx - cv.cx, ny - cv.cy);
    const dmax = Math.max(Math.hypot(b.x - cv.cx, b.y - cv.cy), Math.hypot(b.x + b.w - cv.cx, b.y - cv.cy), Math.hypot(b.x - cv.cx, b.y + b.h - cv.cy), Math.hypot(b.x + b.w - cv.cx, b.y + b.h - cv.cy));
    return dmin < cv.r && cv.r < dmax;
  }
  let t0 = 0, t1 = 1;
  const dx = cv.x2 - cv.x1, dy = cv.y2 - cv.y1;
  for (const [p, d, lo, hi] of [[cv.x1, dx, b.x, b.x + b.w], [cv.y1, dy, b.y, b.y + b.h]]) {
    if (Math.abs(d) < 1e-12) { if (p < lo || p > hi) return false; continue; }
    let a = (lo - p) / d, c = (hi - p) / d;
    if (a > c) [a, c] = [c, a];
    t0 = Math.max(t0, a);
    t1 = Math.min(t1, c);
  }
  return t0 < t1;
}
