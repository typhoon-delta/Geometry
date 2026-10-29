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

// ======================= Phép biến hình =======================
export function rotatePoint(P, O, deg) {
  const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  const x = P.x - O.x, y = P.y - O.y;
  return pt(O.x + c * x - s * y, O.y + s * x + c * y);
}

export const homothetyPoint = (P, O, k) => pt(O.x + k * (P.x - O.x), O.y + k * (P.y - O.y));
export const translatePoint = (P, A, B) => pt(P.x + B.x - A.x, P.y + B.y - A.y);

/** Nghịch đảo điểm P qua đường tròn (tâm O, bán kính r): OP·OP' = r². */
export function invertPoint(P, c) {
  const dx = P.x - c.c.x, dy = P.y - c.c.y, d2 = dx * dx + dy * dy;
  if (d2 < EPS * EPS) return null;
  const k = (c.r * c.r) / d2;
  return pt(c.c.x + k * dx, c.c.y + k * dy);
}

// ---- Nghịch đảo đường thẳng / đường tròn (bản 1.2) ----
// Ảnh của đường tròn qua TÂM nghịch đảo là đường thẳng, của đường tròn không qua tâm là đường tròn; đường thẳng
// qua tâm biến thành chính nó, không qua tâm thành đường tròn qua tâm. Loại đối tượng của ảnh phải cố định theo
// cách dựng nên có hai hàm (hai loại bước): ảnh là đường thẳng / ảnh là đường tròn; cấu hình "sai loại" → null.
const passesThrough = (X, O) => (X.kind === 'line' ? distPointLine(O, X) : Math.abs(dist(O, X.c) - X.r)) <= 1e-7 * (X.kind === 'line' ? Math.max(norm(X.d), dist(O, X.p)) : X.r);

/** Ảnh qua phép nghịch đảo (đường tròn c) của đường thẳng/đường tròn X ĐI QUA tâm của c: một đường thẳng. */
export function invertToLine(X, c) {
  if (!X || !c) return null;
  const O = c.c;
  if (!passesThrough(X, O)) return null;
  if (X.kind === 'line') return line(X.p, X.d);
  // điểm đối tâm của O trên X → ảnh của nó nằm trên ảnh cần tìm, ảnh vuông góc với đường nối O với tâm X
  const P = invertPoint(pt(2 * X.c.x - O.x, 2 * X.c.y - O.y), c);
  return P ? line(P, perp(sub(X.c, O))) : null;
}

/** Ảnh qua phép nghịch đảo (đường tròn c) của đường thẳng/đường tròn X KHÔNG đi qua tâm của c: một đường tròn. */
export function invertToCircle(X, c) {
  if (!X || !c) return null;
  const O = c.c, k2 = c.r * c.r;
  if (passesThrough(X, O)) return null;
  if (X.kind === 'line') {
    const F = invertPoint(project(O, X), c);
    return F ? circle(mid(O, F), dist(O, F) / 2) : null;
  }
  const v = sub(X.c, O), s = k2 / (dot(v, v) - X.r * X.r);
  return circle(pt(O.x + s * v.x, O.y + s * v.y), Math.abs(s) * X.r);
}

/** Góc có hướng ∠ABC (từ tia BA sang tia BC, ngược chiều kim đồng hồ), độ, trong (−180°, 180°]. */
export function directedAngle(A, B, C) {
  const u = sub(A, B), v = sub(C, B);
  if (norm(u) < EPS || norm(v) < EPS) return null;
  return (Math.atan2(cross(u, v), dot(u, v)) * 180) / Math.PI;
}

/** Phép đồng dạng thuận tâm O biến A thành B (quay góc ∠AOB, vị tự tỉ số OB/OA). */
export function spiralPoint(P, O, A, B) {
  const a = sub(A, O), b = sub(B, O), a2 = dot(a, a);
  if (a2 < EPS * EPS) return null;
  const re = dot(a, b) / a2, im = cross(a, b) / a2; // (B−O)/(A−O) dạng số phức
  const x = P.x - O.x, y = P.y - O.y;
  return pt(O.x + re * x - im * y, O.y + im * x + re * y);
}

/** Áp một phép biến đổi điểm f cho điểm / đường thẳng / đường tròn (phép đồng dạng). */
export function mapObject(X, f) {
  if (!X) return null;
  if (X.kind === 'point') return f(X);
  if (X.kind === 'line') {
    const a = f(X.p), b = f(add(X.p, X.d));
    return a && b ? line(a, sub(b, a), X.sub) : null;
  }
  if (X.kind === 'circle') {
    const c = f(X.c), q = f(add(X.c, { x: X.r, y: 0 }));
    return c && q ? circle(c, dist(c, q)) : null;
  }
  return null;
}

// ======================= Tiếp tuyến, đẳng phương, vị tự =======================
/** Tiếp tuyến của đường tròn tại P (đường qua P vuông góc với bán kính). */
export function tangentAt(c, P) {
  const r = sub(P, c.c);
  if (norm(r) < EPS) return null;
  return line(P, perp(r));
}

/** Hai tiếp điểm của tiếp tuyến kẻ từ P (thứ tự chuẩn như intersectCC → liên tục khi kéo). */
export function tangentPoints(c, P) {
  const M = mid(c.c, P);
  return intersectCC(c, { kind: 'circle', c: M, r: dist(M, P) });
}

/**
 * Tiếp tuyến chung của hai đường tròn. internal = false: tiếp tuyến chung ngoài, true: chung trong.
 * which = 0/1 chọn một trong hai (theo phía của pháp tuyến so với hướng tâm₁→tâm₂ – liên tục khi kéo).
 * Đường trả về đi từ tiếp điểm trên c1 tới tiếp điểm trên c2.
 */
export function commonTangent(c1, c2, internal, which) {
  const D = sub(c2.c, c1.c);
  const d2 = dot(D, D);
  const k = (internal ? -c2.r : c2.r) - c1.r; // n·D = s2 r2 − s1 r1 với s1 = 1
  const h2 = d2 - k * k;
  if (d2 < EPS || h2 < -1e-12 * d2) return null;
  const h = Math.sqrt(Math.max(0, h2));
  const sg = which ? 1 : -1;
  const n = { x: (k * D.x + sg * h * -D.y) / d2, y: (k * D.y + sg * h * D.x) / d2 };
  const T1 = { x: c1.c.x - c1.r * n.x, y: c1.c.y - c1.r * n.y };
  const s2 = internal ? -1 : 1;
  const T2 = { x: c2.c.x - s2 * c2.r * n.x, y: c2.c.y - s2 * c2.r * n.y };
  const dir = dist(T1, T2) > EPS ? sub(T2, T1) : perp(n);
  return line(T1, dir);
}

/** Trục đẳng phương của hai đường tròn (không đồng tâm). */
export function radicalAxis(c1, c2) {
  const D = sub(c2.c, c1.c);
  const d = norm(D);
  if (d < EPS) return null;
  const t = (d * d + c1.r * c1.r - c2.r * c2.r) / (2 * d);
  const u = { x: D.x / d, y: D.y / d };
  return line(pt(c1.c.x + t * u.x, c1.c.y + t * u.y), perp(D));
}

export function radicalCenter(c1, c2, c3) {
  const a = radicalAxis(c1, c2), b = radicalAxis(c1, c3);
  return a && b ? intersectLL(a, b) : null;
}

/** Tâm vị tự của hai đường tròn: ngoài (tỉ số +r2/r1) hoặc trong (tỉ số −r2/r1). */
export function homothetyCenter(c1, c2, internal) {
  if (internal) {
    const s = c1.r + c2.r;
    return pt((c2.r * c1.c.x + c1.r * c2.c.x) / s, (c2.r * c1.c.y + c1.r * c2.c.y) / s);
  }
  const s = c2.r - c1.r;
  if (Math.abs(s) < 1e-12 * Math.max(c1.r, c2.r)) return null; // hai bán kính bằng nhau: tâm vị tự ngoài ở vô cực
  return pt((c2.r * c1.c.x - c1.r * c2.c.x) / s, (c2.r * c1.c.y - c1.r * c2.c.y) / s);
}

// ======================= Tam giác: toạ độ tỉ cự =======================
const area2 = (P, Q, R) => cross(sub(Q, P), sub(R, P));

/** Toạ độ tỉ cự (có dấu) của P đối với tam giác ABC. */
export function barycentric(P, A, B, C) {
  return [area2(P, B, C), area2(P, C, A), area2(P, A, B)];
}

export function fromBarycentric(u, v, w, A, B, C) {
  const s = u + v + w;
  const m = Math.max(Math.abs(u), Math.abs(v), Math.abs(w));
  if (!(m > 0) || Math.abs(s) < 1e-12 * m) return null;
  return pt((u * A.x + v * B.x + w * C.x) / s, (u * A.y + v * B.y + w * C.y) / s);
}

const sides2 = (A, B, C) => [dist(B, C) ** 2, dist(C, A) ** 2, dist(A, B) ** 2];

/** Tâm bàng tiếp đối diện đỉnh A. */
export function excenter(A, B, C) {
  if (!triangleOK(A, B, C)) return null;
  const a = dist(B, C), b = dist(C, A), c = dist(A, B);
  return fromBarycentric(-a, b, c, A, B, C);
}

/** Liên hợp đẳng giác của P: (u:v:w) ↦ (a²/u : b²/v : c²/w). */
export function isogonalConjugate(P, A, B, C) {
  if (!triangleOK(A, B, C)) return null;
  const [u, v, w] = barycentric(P, A, B, C);
  const sc = Math.abs(area2(A, B, C));
  if ([u, v, w].some((x) => Math.abs(x) < 1e-12 * sc)) return null; // P nằm trên đường thẳng chứa cạnh
  const [a2, b2, c2] = sides2(A, B, C);
  return fromBarycentric(a2 / u, b2 / v, c2 / w, A, B, C);
}

/** Điểm Lemoine (giao ba đường đối trung): (a² : b² : c²). */
export function lemoine(A, B, C) {
  if (!triangleOK(A, B, C)) return null;
  const [a2, b2, c2] = sides2(A, B, C);
  return fromBarycentric(a2, b2, c2, A, B, C);
}

/** Chân đường đối trung từ A trên BC: BL/LC = AB²/AC². */
export function symmedianFoot(A, B, C) {
  if (!triangleOK(A, B, C)) return null;
  const b2 = dist(C, A) ** 2, c2 = dist(A, B) ** 2;
  return pt((b2 * B.x + c2 * C.x) / (b2 + c2), (b2 * B.y + c2 * C.y) / (b2 + c2));
}

/** Điểm Kosnita = liên hợp đẳng giác của tâm đường tròn Euler. */
export function kosnita(A, B, C) {
  const N = ninePointCenter(A, B, C);
  return N ? isogonalConjugate(N, A, B, C) : null;
}

/** Đường đẳng giác của AP đối với góc BAC (đối xứng của AP qua phân giác góc A). */
export function isogonalLine(B, A, C, P) {
  const u = unit(sub(B, A)), v = unit(sub(C, A)), p = sub(P, A);
  if (!u || !v || norm(p) < EPS) return null;
  let w = add(u, v);
  w = norm(w) < 1e-9 ? perp(u) : unit(w);
  const k = 2 * dot(p, w);
  return line(A, { x: k * w.x - p.x, y: k * w.y - p.y });
}

/** Đường tròn tiếp xúc với đường thẳng AB tại A và đi qua C. */
export function circleTangentAt(A, B, C) {
  const l1 = line(A, perp(sub(B, A)));
  const l2 = dist(A, C) < EPS ? null : line(mid(A, C), perp(sub(C, A)));
  if (!l1 || !l2) return null;
  const O = intersectLL(l1, l2);
  return O ? circle(O, dist(O, A)) : null;
}

/**
 * Đường tròn mixtilinear ứng với đỉnh A: tiếp xúc hai đường thẳng AB, AC và tiếp xúc trong (external = false)
 * hoặc tiếp xúc ngoài (external = true) với đường tròn ngoại tiếp. Tâm X = A + t·u (u: phân giác trong),
 * bán kính t·sin(A/2); điều kiện |XO| = R ∓ bán kính cho phương trình bậc nhất theo t.
 */
export function mixtilinear(A, B, C, external = false) {
  const circ = circleThrough(A, B, C);
  if (!circ) return null;
  const u0 = unit(sub(B, A)), v0 = unit(sub(C, A));
  const u = unit(add(u0, v0));
  if (!u) return null;
  const s = Math.abs(cross(u, u0)); // sin(A/2)
  const c2 = 1 - s * s; // cos²(A/2)
  const AO = sub(A, circ.c);
  const t = (-2 * (dot(u, AO) + (external ? -1 : 1) * circ.r * s)) / c2;
  if (!(t > 0)) return null;
  return circle(pt(A.x + t * u.x, A.y + t * u.y), t * s);
}

/**
 * Đoạn cần vẽ của một đường thẳng/tia kiểu sách (bản 1.2): từ điểm ngoài cùng tới điểm ngoài cùng trong số các
 * điểm NẰM TRÊN đường, nhô ra mỗi đầu `ext` = kẹp(15% độ dài, minExt, maxExt). Dùng chung cho màn hình (toạ độ
 * px) và TikZ (toạ độ hình). Ít hơn 2 điểm nằm trên đường → null (để bên gọi cắt theo khung hình như cũ).
 * Trả về [t0, t1] theo tham số p + t·d của đường.
 */
export function trimmedRange(l, sub, pts, tol, minExt, maxExt) {
  const dd = Math.hypot(l.d.x, l.d.y);
  if (!(dd > 0)) return null;
  let t0 = Infinity, t1 = -Infinity, n = 0;
  for (const P of pts) {
    const ex = P.x - l.p.x, ey = P.y - l.p.y;
    if (Math.abs(l.d.x * ey - l.d.y * ex) / dd > tol) continue;
    const t = (ex * l.d.x + ey * l.d.y) / (dd * dd);
    if (sub === 'ray' && t < -1e-9) continue;
    if (t < t0) t0 = t;
    if (t > t1) t1 = t;
    n++;
  }
  if (sub === 'ray') { t0 = 0; if (n < 1) return null; } else if (n < 2) return null;
  const len = (t1 - t0) * dd;
  const ext = Math.min(maxExt, Math.max(minExt, 0.15 * len)) / dd;
  return [sub === 'ray' ? 0 : t0 - ext, t1 + ext];
}
