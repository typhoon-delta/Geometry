// Các phép toán hình học cơ bản trên toạ độ. Thuần JS, không phụ thuộc giao diện.
//
// Biểu diễn giá trị:
//   điểm      {kind:'point', x, y}
//   đường     {kind:'line', p:{x,y}, d:{x,y}, sub:'line'|'segment'|'ray'}
//             (đường đi qua p, vectơ chỉ phương d; đoạn = p → p+d; tia = p theo hướng d)
//   đường tròn {kind:'circle', c:{x,y}, r}
// Giá trị null nghĩa là "không xác định" (ví dụ hai đường thẳng song song không có giao điểm).

export const EPS = 1e-12;

export const pt = (x, y) => ({ kind: 'point', x, y });
export const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
export const mul = (a, k) => ({ x: a.x * k, y: a.y * k });
export const dot = (a, b) => a.x * b.x + a.y * b.y;
export const cross = (a, b) => a.x * b.y - a.y * b.x;
export const norm = (a) => Math.hypot(a.x, a.y);
export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const perp = (a) => ({ x: -a.y, y: a.x });
export const unit = (a) => {
  const n = norm(a);
  return n < EPS ? null : { x: a.x / n, y: a.y / n };
};
export const mid = (a, b) => pt((a.x + b.x) / 2, (a.y + b.y) / 2);
export const finite = (...xs) => xs.every((v) => Number.isFinite(v));

export function line(p, d, subtype = 'line') {
  if (!p || !d || norm(d) < EPS || !finite(p.x, p.y, d.x, d.y)) return null;
  return { kind: 'line', p: { x: p.x, y: p.y }, d: { x: d.x, y: d.y }, sub: subtype };
}

export function circle(c, r) {
  if (!c || !finite(c.x, c.y, r) || r < EPS) return null;
  return { kind: 'circle', c: { x: c.x, y: c.y }, r };
}

export const lineThrough = (a, b, subtype = 'line') => line(a, sub(b, a), subtype);

/** Hình chiếu vuông góc của P lên đường thẳng l. */
export function project(P, l) {
  const t = dot(sub(P, l.p), l.d) / dot(l.d, l.d);
  return pt(l.p.x + t * l.d.x, l.p.y + t * l.d.y);
}

/** Tham số t của hình chiếu của P lên l (P' = p + t·d). */
export const lineParam = (P, l) => dot(sub(P, l.p), l.d) / dot(l.d, l.d);

export const distPointLine = (P, l) => Math.abs(cross(l.d, sub(P, l.p))) / norm(l.d);

export function reflectPointOverPoint(P, C) {
  return pt(2 * C.x - P.x, 2 * C.y - P.y);
}

export function reflectPointOverLine(P, l) {
  const F = project(P, l);
  return pt(2 * F.x - P.x, 2 * F.y - P.y);
}

/** Giao hai đường thẳng (theo đường mang, không xét giới hạn đoạn/tia). */
export function intersectLL(l1, l2) {
  const den = cross(l1.d, l2.d);
  const scale = norm(l1.d) * norm(l2.d);
  if (Math.abs(den) < 1e-14 * scale) return null;
  const t = cross(sub(l2.p, l1.p), l2.d) / den;
  return pt(l1.p.x + t * l1.d.x, l1.p.y + t * l1.d.y);
}

/**
 * Giao đường thẳng – đường tròn. Trả về mảng 0..2 điểm, SẮP XẾP THEO THAM SỐ TĂNG DẦN
 * dọc vectơ chỉ phương của đường thẳng. Thứ tự này biến thiên liên tục theo dữ liệu vào
 * (chỉ đổi khi hai nghiệm trùng nhau – lúc tiếp xúc), nên chọn nghiệm theo chỉ số
 * không làm điểm giao "nhảy" sang nghiệm kia khi kéo hình.
 */
export function intersectLC(l, c) {
  const dd = dot(l.d, l.d);
  const f = sub(l.p, c.c);
  const b = dot(f, l.d);
  const cc = dot(f, f) - c.r * c.r;
  let disc = b * b - dd * cc;
  const tol = 1e-12 * Math.max(b * b, dd * c.r * c.r);
  if (disc < -tol) return [];
  if (disc < 0) disc = 0;
  const s = Math.sqrt(disc);
  const t1 = (-b - s) / dd;
  const t2 = (-b + s) / dd;
  return [pt(l.p.x + t1 * l.d.x, l.p.y + t1 * l.d.y), pt(l.p.x + t2 * l.d.x, l.p.y + t2 * l.d.y)];
}

/**
 * Giao hai đường tròn. Trả về 0..2 điểm, thứ tự: nghiệm thứ nhất nằm bên PHẢI hướng c1→c2,
 * nghiệm thứ hai nằm bên TRÁI. Thứ tự này liên tục khi kéo hình (chỉ đổi khi hai đường tròn
 * tiếp xúc hoặc đồng tâm).
 */
export function intersectCC(c1, c2) {
  const D = sub(c2.c, c1.c);
  const d = norm(D);
  if (d < EPS) return [];
  const a = (d * d + c1.r * c1.r - c2.r * c2.r) / (2 * d);
  let h2 = c1.r * c1.r - a * a;
  const tol = 1e-12 * c1.r * c1.r;
  if (h2 < -tol) return [];
  if (h2 < 0) h2 = 0;
  const h = Math.sqrt(h2);
  const u = { x: D.x / d, y: D.y / d };
  const M = { x: c1.c.x + a * u.x, y: c1.c.y + a * u.y };
  const n = perp(u); // bên trái hướng c1→c2
  return [pt(M.x - h * n.x, M.y - h * n.y), pt(M.x + h * n.x, M.y + h * n.y)];
}

export function intersect(o1, o2) {
  if (!o1 || !o2) return [];
  if (o1.kind === 'line' && o2.kind === 'line') {
    const P = intersectLL(o1, o2);
    return P ? [P] : [];
  }
  if (o1.kind === 'line' && o2.kind === 'circle') return intersectLC(o1, o2);
  if (o1.kind === 'circle' && o2.kind === 'line') return intersectLC(o2, o1);
  if (o1.kind === 'circle' && o2.kind === 'circle') return intersectCC(o1, o2);
  return [];
}

/** Đường tròn qua 3 điểm (null nếu thẳng hàng). */
export function circleThrough(A, B, C) {
  const d = 2 * (A.x * (B.y - C.y) + B.x * (C.y - A.y) + C.x * (A.y - B.y));
  const s = Math.max(dist(A, B), dist(B, C), dist(C, A));
  if (Math.abs(d) < 1e-12 * s * s) return null;
  const a2 = A.x * A.x + A.y * A.y;
  const b2 = B.x * B.x + B.y * B.y;
  const c2 = C.x * C.x + C.y * C.y;
  const ux = (a2 * (B.y - C.y) + b2 * (C.y - A.y) + c2 * (A.y - B.y)) / d;
  const uy = (a2 * (C.x - B.x) + b2 * (A.x - C.x) + c2 * (B.x - A.x)) / d;
  const O = pt(ux, uy);
  return circle(O, dist(O, A));
}

export function triangleOK(A, B, C) {
  const s = Math.max(dist(A, B), dist(B, C), dist(C, A));
  return s > EPS && Math.abs(cross(sub(B, A), sub(C, A))) > 1e-12 * s * s;
}

export function circumcenter(A, B, C) {
  const c = circleThrough(A, B, C);
  return c ? pt(c.c.x, c.c.y) : null;
}

export function centroid(A, B, C) {
  if (!triangleOK(A, B, C)) return null;
  return pt((A.x + B.x + C.x) / 3, (A.y + B.y + C.y) / 3);
}

export function orthocenter(A, B, C) {
  const O = circumcenter(A, B, C);
  if (!O) return null;
  // H = A + B + C − 2O
  return pt(A.x + B.x + C.x - 2 * O.x, A.y + B.y + C.y - 2 * O.y);
}

export function incenter(A, B, C) {
  if (!triangleOK(A, B, C)) return null;
  const a = dist(B, C), b = dist(C, A), c = dist(A, B);
  const s = a + b + c;
  return pt((a * A.x + b * B.x + c * C.x) / s, (a * A.y + b * B.y + c * C.y) / s);
}

export function inradius(A, B, C) {
  const I = incenter(A, B, C);
  if (!I) return null;
  return distPointLine(I, lineThrough(B, C));
}

export function ninePointCenter(A, B, C) {
  const O = circumcenter(A, B, C);
  const H = orthocenter(A, B, C);
  if (!O || !H) return null;
  return mid(O, H);
}

/** Phân giác trong (external=false) hoặc ngoài của góc ABC, đỉnh B. */
export function angleBisector(A, B, C, external = false) {
  const u = unit(sub(A, B));
  const v = unit(sub(C, B));
  if (!u || !v) return null;
  let d = external ? sub(u, v) : add(u, v);
  if (norm(d) < 1e-9) d = perp(u); // góc bẹt: phân giác trong vuông góc
  const s = (dist(A, B) + dist(C, B)) / 2; // độ dài tự nhiên cho tham số điểm-trên-đường
  return line(B, mul(unit(d), s));
}

/**
 * Điểm chính giữa cung BC của đường tròn ngoại tiếp ABC.
 * containsA = true: cung BC chứa A; false: cung BC không chứa A.
 */
export function arcMidpoint(A, B, C, containsA) {
  const circ = circleThrough(A, B, C);
  if (!circ) return null;
  const M = mid(B, C);
  const n = unit(perp(sub(C, B)));
  if (!n) return null;
  const side = dot(sub(A, M), n); // A nằm phía nào của BC
  if (Math.abs(side) < EPS) return null;
  const sgn = (side > 0) === containsA ? 1 : -1;
  return pt(circ.c.x + sgn * circ.r * n.x, circ.c.y + sgn * circ.r * n.y);
}

/** Điểm thuộc đối tượng theo tham số (dùng cho "điểm trên đường/đường tròn"). */
export function pointOn(obj, t) {
  if (!obj) return null;
  if (obj.kind === 'line') {
    let s = t;
    if (obj.sub === 'segment') s = Math.min(1, Math.max(0, t));
    else if (obj.sub === 'ray') s = Math.max(0, t);
    return pt(obj.p.x + s * obj.d.x, obj.p.y + s * obj.d.y);
  }
  if (obj.kind === 'circle') return pt(obj.c.x + obj.r * Math.cos(t), obj.c.y + obj.r * Math.sin(t));
  return null;
}

/** Tham số của điểm gần P nhất trên đối tượng (ngược của pointOn). */
export function paramOf(obj, P) {
  if (obj.kind === 'line') {
    let t = lineParam(P, obj);
    if (obj.sub === 'segment') t = Math.min(1, Math.max(0, t));
    else if (obj.sub === 'ray') t = Math.max(0, t);
    return t;
  }
  if (obj.kind === 'circle') return Math.atan2(P.y - obj.c.y, P.x - obj.c.x);
  return 0;
}

/** Khoảng cách từ P tới đối tượng (tính cả giới hạn đoạn/tia) – dùng cho chọn bằng chuột. */
export function distToObject(obj, P) {
  if (!obj) return Infinity;
  if (obj.kind === 'point') return dist(obj, P);
  if (obj.kind === 'circle') return Math.abs(dist(obj.c, P) - obj.r);
  if (obj.kind === 'line') return dist(pointOn(obj, paramOf(obj, P)), P);
  return Infinity;
}

export function reflectObject(X, M) {
  if (!X || !M) return null;
  const f = M.kind === 'point' ? (P) => reflectPointOverPoint(P, M) : (P) => reflectPointOverLine(P, M);
  if (X.kind === 'point') return f(X);
  if (X.kind === 'line') {
    const a = f(X.p);
    const b = f(add(X.p, X.d));
    return line(a, sub(b, a), X.sub);
  }
  if (X.kind === 'circle') return circle(f(X.c), X.r);
  return null;
}
