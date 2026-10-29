// Mỗi công cụ trong thư viện "Công cụ" được chạy trên một hình mẫu rồi đối chiếu với ĐỊNH NGHĨA toán học.
// Các tính chất được kiểm tra ở cấu hình gốc và ở nhiều cấu hình xê dịch ngẫu nhiên (kéo điểm tự do),
// nên công cụ phải đúng "theo cách dựng", không chỉ đúng ở một vị trí.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LIBRARY } from '../src/ui/library.js';
import { runTool } from '../src/core/apply.js';
import { Builder } from '../src/core/builder.js';
import { evaluate, stepById } from '../src/core/model.js';
import * as G from '../src/core/geom.js';

const TOL = 1e-7;
const near = (a, b, msg = '') => assert.ok(Math.abs(a - b) < TOL * (1 + Math.abs(a) + Math.abs(b)), `${msg} ${a} ≠ ${b}`);
const nearP = (P, Q, msg = '') => { assert.ok(P && Q, msg + ' (điểm không xác định)'); near(P.x, Q.x, msg); near(P.y, Q.y, msg); };
const col = (P, Q, R, msg = 'không thẳng hàng') => near(G.cross(G.sub(Q, P), G.sub(R, P)) / (1 + G.dist(P, Q) * G.dist(P, R)), 0, msg);
const perpV = (u, v, msg = 'không vuông góc') => near(G.dot(u, v) / (G.norm(u) * G.norm(v)), 0, msg);
const parV = (u, v, msg = 'không song song') => near(G.cross(u, v) / (G.norm(u) * G.norm(v)), 0, msg);
const onC = (P, c, msg = 'không nằm trên đường tròn') => near(G.dist(P, c.c), c.r, msg);
const onL = (P, l, msg = 'không nằm trên đường thẳng') => near(G.distPointLine(P, l), 0, msg);
const tanLC = (l, c, msg = 'không tiếp xúc') => near(G.distPointLine(c.c, l), c.r, msg);
const L2 = (A, B) => G.lineThrough(A, B);
/** Góc có hướng từ u tới v (radian, (−π, π]). */
const ang = (u, v) => Math.atan2(G.cross(u, v), G.dot(u, v));

/** Hình mẫu: tam giác nhọn không cân ABC, điểm P bên trong, Q trên (ABC), ba đường tròn rời nhau, đường thẳng d. */
function fixture() {
  const b = new Builder();
  const A = b.point(0.4, 3.3, 'A'), B = b.point(-2.3, -0.5, 'B'), C = b.point(3.1, -0.3, 'C');
  const P = b.point(0.7, 1.0, 'P');
  const w = b.add('circumcircle', [A, B, C], {}, 'ω', { hidden: true });
  const Q = b.add('point_on', [w], { t: 3.8 }, 'Q');
  const O1 = b.point(-8, 1, 'O_1'), R1 = b.point(-6, 1, 'R_1');
  const O2 = b.point(-3, 6, 'O_2'), R2 = b.point(-3, 7.2, 'R_2');
  const O3 = b.point(-10, 7, 'O_3'), R3 = b.point(-10, 8.5, 'R_3');
  const c1 = b.add('circle', [O1, R1], {}, 'c1');
  const c2 = b.add('circle', [O2, R2], {}, 'c2');
  const c3 = b.add('circle', [O3, R3], {}, 'c3');
  const D1 = b.point(5, -3, 'U'), D2 = b.point(8, -1.5, 'V');
  const d = b.add('line', [D1, D2], {}, 'd');
  const T1 = b.add('point_on', [c1], { t: 0.9 }, 'T');
  const T2 = b.add('point_on', [c1], { t: 2.6 }, 'S');
  const X = b.point(-4.5, -2, 'X');
  return { doc: b.doc, A, B, C, P, Q, w, c1, c2, c3, d, T1, T2, X };
}

/** Các cấu hình để kiểm tra: gốc + 4 cấu hình xê dịch điểm tự do (giữ tam giác nhọn, P bên trong). */
function samples(doc) {
  const out = [evaluate(doc)];
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
  for (let i = 0; i < 4; i++) {
    const ov = new Map();
    for (const s of doc.steps) if (s.type === 'free_point') ov.set(s.id, { x: s.params.x + 0.25 * rnd(), y: s.params.y + 0.25 * rnd() });
    out.push(evaluate(doc, ov));
  }
  return out;
}

/** Chạy công cụ trên hình mẫu; trả về các bước mới tạo (theo thứ tự) và hàm tiện ích. */
function apply(toolId, pickFn, options = {}) {
  const f = fixture();
  const tool = LIBRARY.find((t) => t.id === toolId);
  const before = new Set(f.doc.steps.map((s) => s.id));
  runTool(f.doc, tool, pickFn(f), options);
  const created = f.doc.steps.filter((s) => !before.has(s.id));
  const of = (type) => created.filter((s) => s.type === type).map((s) => s.id);
  return { ...f, created, of, check: (fn) => { for (const v of samples(f.doc)) fn((id) => v.get(id), v); } };
}

const tri = (f) => [f.A, f.B, f.C];
const triP = (f) => [f.A, f.B, f.C, f.P];
const triQ = (f) => [f.A, f.B, f.C, f.Q];
const lastPoint = (r) => {
  const pts = r.created.filter((s) => ['point_on', 'rotate', 'translate', 'reflect', 'intersection_other', 'intersection', 'cevian_foot', 'foot', 'center'].includes(s.type));
  return pts[pts.length - 1].id;
};

const CHECKS = {
  // ---------------- 1. Dựng hình ----------------
  triangle: () => { const r = apply('triangle', tri); assert.equal(r.of('segment').length, 3); },
  right_triangle: () => {
    const r = apply('right_triangle', (f) => [f.A, f.B]);
    const C = r.of('point_on')[0];
    r.check((v) => perpV(G.sub(v(r.B), v(r.A)), G.sub(v(C), v(r.A)), 'góc A không vuông'));
    // kéo C (đổi tham số) vẫn vuông tại A
    stepById(r.doc, C).params.t = -1.3;
    r.check((v) => perpV(G.sub(v(r.B), v(r.A)), G.sub(v(C), v(r.A))));
  },
  right_isosceles: () => {
    const r = apply('right_isosceles', (f) => [f.A, f.B]);
    const C = r.of('rotate')[0];
    r.check((v) => { perpV(G.sub(v(r.B), v(r.A)), G.sub(v(C), v(r.A))); near(G.dist(v(r.A), v(r.B)), G.dist(v(r.A), v(C)), 'AB ≠ AC'); });
  },
  equilateral: () => {
    const r = apply('equilateral', (f) => [f.A, f.B]);
    const C = r.of('rotate')[0];
    r.check((v) => { near(G.dist(v(r.A), v(r.B)), G.dist(v(r.B), v(C))); near(G.dist(v(r.A), v(r.B)), G.dist(v(C), v(r.A))); });
  },
  trapezoid: () => {
    const r = apply('trapezoid', tri);
    const D = r.of('point_on')[0];
    r.check((v) => parV(G.sub(v(r.B), v(r.A)), G.sub(v(D), v(r.C)), 'AB không song song CD'));
    assert.equal(r.of('segment').length, 4);
  },
  isosceles_trapezoid: () => {
    const r = apply('isosceles_trapezoid', tri);
    const D = r.of('reflect')[0];
    r.check((v) => { parV(G.sub(v(r.B), v(r.A)), G.sub(v(D), v(r.C))); near(G.dist(v(r.A), v(D)), G.dist(v(r.B), v(r.C)), 'AD ≠ BC'); });
  },
  parallelogram: () => {
    const r = apply('parallelogram', tri);
    const D = r.of('translate')[0];
    r.check((v) => { nearP(G.sub(v(r.B), v(r.A)), G.sub(v(r.C), v(D)), 'AB ≠ DC (vectơ)'); parV(G.sub(v(D), v(r.A)), G.sub(v(r.C), v(r.B))); });
  },
  rectangle: () => {
    const r = apply('rectangle', (f) => [f.A, f.B]);
    const C = r.of('point_on')[0], D = r.of('translate')[0];
    r.check((v) => {
      const [a, b, c, d] = [v(r.A), v(r.B), v(C), v(D)];
      perpV(G.sub(b, a), G.sub(c, b)); perpV(G.sub(c, b), G.sub(d, c)); perpV(G.sub(d, c), G.sub(a, d));
    });
  },
  rhombus: () => {
    const r = apply('rhombus', (f) => [f.A, f.B]);
    const C = r.of('point_on')[0], D = r.of('translate')[0];
    r.check((v) => {
      const [a, b, c, d] = [v(r.A), v(r.B), v(C), v(D)];
      const s = G.dist(a, b);
      near(G.dist(b, c), s); near(G.dist(c, d), s); near(G.dist(d, a), s);
    });
  },
  square: () => {
    const r = apply('square', (f) => [f.A, f.B]);
    const D = r.of('rotate')[0], C = r.of('translate')[0];
    r.check((v) => {
      const [a, b, c, d] = [v(r.A), v(r.B), v(C), v(D)];
      const s = G.dist(a, b);
      near(G.dist(b, c), s); near(G.dist(c, d), s); near(G.dist(d, a), s); perpV(G.sub(b, a), G.sub(d, a));
    });
  },
  harmonic_quad: () => {
    const r = apply('harmonic_quad', tri);
    const D = r.of('intersection_other')[0];
    r.check((v) => {
      const [a, b, c, d] = [v(r.A), v(r.B), v(r.C), v(D)];
      onC(d, G.circleThrough(a, b, c), 'D không thuộc (ABC)');
      near(G.dist(a, b) * G.dist(c, d), G.dist(b, c) * G.dist(d, a), 'AB·CD ≠ BC·DA');
    });
  },
  circle_tangent_at: () => {
    const r = apply('circle_tangent_at', tri);
    const c = r.of('circle_tangent_at')[0];
    r.check((v) => { onC(v(r.A), v(c)); onC(v(r.C), v(c)); tanLC(L2(v(r.A), v(r.B)), v(c), 'không tiếp xúc AB'); });
    assert.equal(r.of('center').length, 1, 'phải dựng kèm tâm');
  },
  cevian_triangle: () => {
    const r = apply('cevian_triangle', triP);
    const [D, E, F] = r.of('cevian_foot');
    r.check((v) => {
      const [a, b, c, p, d, e, f] = [r.A, r.B, r.C, r.P, D, E, F].map(v);
      onL(d, L2(b, c)); col(a, p, d); onL(e, L2(c, a)); col(b, p, e); onL(f, L2(a, b)); col(c, p, f);
      near((G.dist(b, d) / G.dist(d, c)) * (G.dist(c, e) / G.dist(e, a)) * (G.dist(a, f) / G.dist(f, b)), 1, 'Ceva');
    });
  },
  quadrilateral: () => { const r = apply('quadrilateral', (f) => [f.A, f.B, f.C, f.P]); assert.equal(r.of('segment').length, 4); },
  cyclic_quad: () => {
    const r = apply('cyclic_quad', tri);
    const D = r.of('point_on')[0];
    r.check((v) => onC(v(D), G.circleThrough(v(r.A), v(r.B), v(r.C))));
    assert.equal(r.of('segment').length, 4);
  },

  // ---------------- 2. Đường đặc biệt ----------------
  altitude: () => {
    const r = apply('altitude', tri);
    const D = r.of('foot')[0];
    r.check((v) => { onL(v(D), L2(v(r.B), v(r.C))); perpV(G.sub(v(D), v(r.A)), G.sub(v(r.C), v(r.B))); });
  },
  median: () => {
    const r = apply('median', tri);
    const M = r.of('midpoint')[0];
    r.check((v) => nearP(v(M), G.mid(v(r.B), v(r.C))));
  },
  perp_bisector: () => {
    const r = apply('perp_bisector', (f) => [f.A, f.B]);
    const l = r.of('perp_bisector')[0];
    r.check((v) => { const X = G.add(v(l).p, G.mul(v(l).d, 1.7)); near(G.dist(X, v(r.A)), G.dist(X, v(r.B))); });
  },
  isogonal_line: () => {
    const r = apply('isogonal_line', (f) => [f.B, f.A, f.C, f.P]);
    const l = r.of('isogonal_line')[0];
    r.check((v) => {
      const a = v(r.A);
      onL(a, v(l));
      near(ang(G.sub(v(r.B), a), G.sub(v(r.P), a)), ang(v(l).d, G.sub(v(r.C), a)), '∠(AB, AP) ≠ ∠(AQ, AC)');
    });
  },
  symmedian: () => {
    const r = apply('symmedian', tri);
    const L = r.of('symmedian_foot')[0];
    r.check((v) => {
      const [a, b, c, l] = [r.A, r.B, r.C, L].map(v);
      onL(l, L2(b, c));
      near(G.dist(b, l) / G.dist(l, c), (G.dist(a, b) / G.dist(a, c)) ** 2, 'BL/LC ≠ AB²/AC²');
      near(ang(G.sub(b, a), G.sub(l, a)), ang(G.sub(G.mid(b, c), a), G.sub(c, a)), 'không đẳng giác với trung tuyến');
    });
  },
  ext_bisector: () => {
    const r = apply('ext_bisector', (f) => [f.B, f.A, f.C]);
    const l = r.of('angle_bisector')[0];
    r.check((v) => {
      const a = v(r.A), d = v(l).d;
      onL(a, v(l));
      near(Math.abs(G.dot(G.unit(d), G.unit(G.sub(v(r.B), a)))), Math.abs(G.dot(G.unit(d), G.unit(G.sub(v(r.C), a)))), 'không tạo góc bằng nhau với AB, AC');
      perpV(d, G.add(G.unit(G.sub(v(r.B), a)), G.unit(G.sub(v(r.C), a))), 'không vuông góc phân giác trong');
    });
  },
  int_ext_bisector: () => {
    const r = apply('int_ext_bisector', (f) => [f.B, f.A, f.C]);
    const [l1, l2] = r.of('angle_bisector');
    r.check((v) => { perpV(v(l1).d, v(l2).d); onL(v(r.A), v(l1)); onL(v(r.A), v(l2)); });
  },
  tangent_at: () => {
    const r = apply('tangent_at', (f) => [f.c1, f.T1]);
    const l = r.of('tangent_at')[0];
    r.check((v) => { tanLC(v(l), v(r.c1)); onL(v(r.T1), v(l)); });
  },
  tangents_meet: () => {
    const r = apply('tangents_meet', (f) => [f.c1, f.T1, f.T2]);
    const X = r.of('intersection')[0];
    r.check((v) => {
      near(G.dist(v(X), v(r.T1)), G.dist(v(X), v(r.T2)), 'XT ≠ XS');
      perpV(G.sub(v(X), v(r.T1)), G.sub(v(r.T1), v(r.c1).c));
    });
  },
  tangents_from: () => {
    const r = apply('tangents_from', (f) => [f.c1, f.X]);
    const T = r.of('tangent_point');
    assert.equal(T.length, 2);
    r.check((v) => { for (const t of T) { onC(v(t), v(r.c1)); perpV(G.sub(v(t), v(r.X)), G.sub(v(t), v(r.c1).c)); } });
  },
  common_tangents: () => {
    const r = apply('common_tangents', (f) => [f.c1, f.c2]);
    const ls = r.of('common_tangent');
    assert.equal(ls.length, 4, 'hai đường tròn rời nhau có 4 tiếp tuyến chung');
    r.check((v) => { for (const l of ls) { tanLC(v(l), v(r.c1)); tanLC(v(l), v(r.c2)); } });
  },
  euler_line: () => {
    const r = apply('euler_line', tri);
    const l = r.of('line')[0], Gc = r.of('centroid')[0];
    r.check((v) => onL(v(Gc), v(l), 'G không nằm trên OH'));
  },
  simson_line: () => {
    const r = apply('simson_line', triQ);
    const l = r.of('line')[0], F = r.of('foot')[2];
    r.check((v) => onL(v(F), v(l), 'ba chân đường vuông góc không thẳng hàng'));
  },
  steiner_line: () => {
    const r = apply('steiner_line', triQ);
    const l = r.of('line')[0], Z = r.of('reflect_pts')[2];
    r.check((v) => { onL(v(Z), v(l)); onL(G.orthocenter(v(r.A), v(r.B), v(r.C)), v(l), 'không đi qua trực tâm'); });
  },

  // ---------------- 3. Đường tròn ----------------
  circumcircle: () => {
    const r = apply('circumcircle', tri);
    const c = r.of('circumcircle')[0];
    r.check((v) => { for (const X of tri(r)) onC(v(X), v(c)); });
  },
  pedal_circle: () => {
    const r = apply('pedal_circle', triP);
    const c = r.of('circle_3pts')[0];
    r.check((v) => { for (const [X, Y] of [[r.B, r.C], [r.C, r.A], [r.A, r.B]]) onC(G.project(v(r.P), L2(v(X), v(Y))), v(c)); });
    assert.ok(r.of('foot').every((id) => stepById(r.doc, id).hidden), 'bản thường: chân đường vuông góc ẩn');
  },
  pedal_circle_detail: () => {
    const r = apply('pedal_circle_detail', triP);
    const c = r.of('circle_3pts')[0];
    r.check((v) => { for (const f of r.of('foot')) onC(v(f), v(c)); });
    assert.ok(r.of('foot').every((id) => !stepById(r.doc, id).hidden));
    assert.ok(r.created.some((s) => s.type === 'segment' && s.style && s.style.dash), 'có đường dựng phụ nét đứt');
  },
  incircle: () => {
    const r = apply('incircle', tri);
    const c = r.of('incircle')[0];
    r.check((v) => { for (const [X, Y] of [[r.B, r.C], [r.C, r.A], [r.A, r.B]]) tanLC(L2(v(X), v(Y)), v(c)); });
  },
  excircle: () => {
    const r = apply('excircle', tri);
    const c = r.of('excircle')[0];
    r.check((v) => {
      for (const [X, Y] of [[r.B, r.C], [r.C, r.A], [r.A, r.B]]) tanLC(L2(v(X), v(Y)), v(c));
      const side = (P) => G.cross(G.sub(v(r.C), v(r.B)), G.sub(P, v(r.B)));
      assert.ok(side(v(c).c) * side(v(r.A)) < 0, 'tâm bàng tiếp phải khác phía A so với BC');
    });
    assert.equal(stepById(r.doc, r.of('center')[0]).name, 'I_A');
  },
  circle_diameter: () => {
    const r = apply('circle_diameter', (f) => [f.A, f.B]);
    const c = r.of('circle_diameter')[0];
    r.check((v) => { onC(v(r.A), v(c)); onC(v(r.B), v(c)); nearP(v(c).c, G.mid(v(r.A), v(r.B))); });
  },
  mixtilinear_in: () => {
    const r = apply('mixtilinear_in', tri);
    const c = r.of('mixtilinear')[0];
    r.check((v) => {
      const m = v(c), O = G.circleThrough(v(r.A), v(r.B), v(r.C));
      tanLC(L2(v(r.A), v(r.B)), m); tanLC(L2(v(r.A), v(r.C)), m);
      near(G.dist(m.c, O.c), O.r - m.r, 'không tiếp xúc trong với (O)');
    });
  },
  mixtilinear_ex: () => {
    const r = apply('mixtilinear_ex', tri);
    const c = r.of('mixtilinear')[0];
    r.check((v) => {
      const m = v(c), O = G.circleThrough(v(r.A), v(r.B), v(r.C));
      tanLC(L2(v(r.A), v(r.B)), m); tanLC(L2(v(r.A), v(r.C)), m);
      near(G.dist(m.c, O.c), O.r + m.r, 'không tiếp xúc ngoài với (O)');
    });
  },
  radical_axis: () => {
    const r = apply('radical_axis', (f) => [f.c1, f.c2]);
    const l = r.of('radical_axis')[0];
    const pow = (X, c) => G.dist(X, c.c) ** 2 - c.r ** 2;
    r.check((v) => { for (const t of [-2, 0.3, 5]) { const X = G.add(v(l).p, G.mul(v(l).d, t)); near(pow(X, v(r.c1)), pow(X, v(r.c2)), 'phương tích khác nhau'); } });
  },
  radical_center: () => {
    const r = apply('radical_center', (f) => [f.c1, f.c2, f.c3]);
    const X = r.of('radical_center')[0];
    const pow = (P, c) => G.dist(P, c.c) ** 2 - c.r ** 2;
    r.check((v) => { near(pow(v(X), v(r.c1)), pow(v(X), v(r.c2))); near(pow(v(X), v(r.c1)), pow(v(X), v(r.c3))); });
  },
  nine_point_circle: () => {
    const r = apply('nine_point_circle', tri);
    const c = r.of('nine_point_circle')[0];
    r.check((v) => {
      const [a, b, cc] = tri(r).map(v);
      const H = G.orthocenter(a, b, cc);
      for (const X of [G.mid(a, b), G.mid(b, cc), G.mid(cc, a), G.project(a, L2(b, cc)), G.mid(a, H), G.mid(cc, H)]) onC(X, v(c));
    });
    assert.equal(stepById(r.doc, r.of('center')[0]).name, 'N');
  },

  // ---------------- 4. Điểm đặc biệt ----------------
  centroid: () => {
    const r = apply('centroid', tri);
    const g = r.of('centroid')[0];
    r.check((v) => nearP(v(g), { x: (v(r.A).x + v(r.B).x + v(r.C).x) / 3, y: (v(r.A).y + v(r.B).y + v(r.C).y) / 3 }));
  },
  centroid_detail: () => {
    const r = apply('centroid_detail', tri);
    const g = r.of('centroid')[0];
    assert.equal(r.of('midpoint').length, 3);
    r.check((v) => { for (const s of r.created.filter((x) => x.type === 'segment')) col(v(s.args[0]), v(s.args[1]), v(g), 'G không nằm trên trung tuyến'); });
  },
  orthocenter: () => {
    const r = apply('orthocenter', tri);
    const h = r.of('orthocenter')[0];
    r.check((v) => { perpV(G.sub(v(h), v(r.A)), G.sub(v(r.C), v(r.B))); perpV(G.sub(v(h), v(r.B)), G.sub(v(r.C), v(r.A))); });
  },
  orthocenter_detail: () => {
    const r = apply('orthocenter_detail', tri);
    const h = r.of('orthocenter')[0];
    assert.equal(r.of('foot').length, 3);
    r.check((v) => { for (const s of r.created.filter((x) => x.type === 'segment')) col(v(s.args[0]), v(s.args[1]), v(h), 'H không nằm trên đường cao'); });
  },
  isogonal_conjugate: () => {
    const r = apply('isogonal_conjugate', triP);
    const Ps = r.of('isogonal_conjugate')[0];
    r.check((v) => {
      const [a, b, c, p, q] = [r.A, r.B, r.C, r.P, Ps].map(v);
      for (const [X, Y, Z] of [[a, b, c], [b, c, a], [c, a, b]]) near(ang(G.sub(Y, X), G.sub(p, X)), ang(G.sub(q, X), G.sub(Z, X)), 'góc không đẳng giác');
      nearP(G.isogonalConjugate(q, a, b, c), p, 'liên hợp hai lần phải trở về P');
    });
  },
  lemoine: () => {
    const r = apply('lemoine', tri);
    const K = r.of('lemoine')[0];
    r.check((v) => {
      const [a, b, c] = tri(r).map(v);
      nearP(v(K), G.isogonalConjugate(G.centroid(a, b, c), a, b, c), 'K không phải liên hợp đẳng giác của G');
      col(a, v(K), G.symmedianFoot(a, b, c), 'K không nằm trên đường đối trung');
    });
  },
  pedal_feet: () => {
    const r = apply('pedal_feet', triP);
    const F = r.of('foot');
    assert.equal(F.length, 3);
    r.check((v) => F.forEach((f, i) => { const [X, Y] = [[r.B, r.C], [r.C, r.A], [r.A, r.B]][i]; onL(v(f), L2(v(X), v(Y))); perpV(G.sub(v(f), v(r.P)), G.sub(v(Y), v(X))); }));
  },
  ext_homothety_center: () => {
    const r = apply('ext_homothety_center', (f) => [f.c1, f.c2]);
    const S = r.of('homothety_center')[0];
    r.check((v) => { const a = v(r.c1), b = v(r.c2), s = v(S); nearP(G.homothetyPoint(a.c, s, b.r / a.r), b.c, 'phép vị tự tâm S tỉ số r2/r1 không biến c1 thành c2'); });
  },
  int_homothety_center: () => {
    const r = apply('int_homothety_center', (f) => [f.c1, f.c2]);
    const S = r.of('homothety_center')[0];
    r.check((v) => { const a = v(r.c1), b = v(r.c2), s = v(S); nearP(G.homothetyPoint(a.c, s, -b.r / a.r), b.c); });
  },
  kosnita: () => {
    const r = apply('kosnita', tri);
    const K = r.of('kosnita')[0];
    r.check((v) => {
      const [a, b, c] = tri(r).map(v);
      const O = G.circumcenter(a, b, c);
      // Định lý Kosnita: A–tâm(BOC), B–tâm(COA), C–tâm(AOB) đồng quy tại điểm Kosnita
      for (const [X, Y, Z] of [[a, b, c], [b, c, a], [c, a, b]]) col(X, G.circumcenter(Y, O, Z), v(K), 'đường qua đỉnh và tâm (BOC) không qua K');
    });
  },
  nine_point_center: () => {
    const r = apply('nine_point_center', tri);
    const N = r.of('nine_point_center')[0];
    r.check((v) => { const [a, b, c] = tri(r).map(v); nearP(v(N), G.mid(G.circumcenter(a, b, c), G.orthocenter(a, b, c))); });
  },
  circumcenter: () => {
    const r = apply('circumcenter', tri);
    const O = r.of('circumcenter')[0];
    r.check((v) => { near(G.dist(v(O), v(r.A)), G.dist(v(O), v(r.B))); near(G.dist(v(O), v(r.A)), G.dist(v(O), v(r.C))); });
  },
  incenter: () => {
    const r = apply('incenter', tri);
    const I = r.of('incenter')[0];
    r.check((v) => { const d = [[r.B, r.C], [r.C, r.A], [r.A, r.B]].map(([X, Y]) => G.distPointLine(v(I), L2(v(X), v(Y)))); near(d[0], d[1]); near(d[0], d[2]); });
  },
  excenter: () => {
    const r = apply('excenter', tri);
    const J = r.of('excenter')[0];
    r.check((v) => { const d = [[r.B, r.C], [r.C, r.A], [r.A, r.B]].map(([X, Y]) => G.distPointLine(v(J), L2(v(X), v(Y)))); near(d[0], d[1]); near(d[0], d[2]); col(v(r.A), G.incenter(v(r.A), v(r.B), v(r.C)), v(J)); });
  },
  incircle_touch: () => {
    const r = apply('incircle_touch', tri);
    const T = r.of('incircle_touch')[0];
    r.check((v) => { const [a, b, c] = tri(r).map(v); near(G.dist(b, v(T)), (G.dist(a, b) + G.dist(b, c) - G.dist(c, a)) / 2, 'BT ≠ (AB+BC−CA)/2'); });
  },
  arc_mid_no: () => {
    const r = apply('arc_mid_no', tri);
    const M = r.of('arc_midpoint')[0];
    r.check((v) => { const [a, b, c] = tri(r).map(v); near(G.dist(v(M), b), G.dist(v(M), c)); col(a, G.incenter(a, b, c), v(M)); onC(v(M), G.circleThrough(a, b, c)); });
  },
  arc_mid_yes: () => {
    const r = apply('arc_mid_yes', tri);
    const M = r.of('arc_midpoint')[0];
    r.check((v) => { const [a, b, c] = tri(r).map(v); near(G.dist(v(M), b), G.dist(v(M), c)); onC(v(M), G.circleThrough(a, b, c)); col(a, G.excenter(a, b, c), a); perpV(G.sub(v(M), a), G.sub(G.incenter(a, b, c), a), 'AM không vuông góc AI (phân giác ngoài)'); });
  },
  altitude_foot: () => {
    const r = apply('altitude_foot', tri);
    const D = r.of('altitude_foot')[0];
    r.check((v) => { onL(v(D), L2(v(r.B), v(r.C))); perpV(G.sub(v(D), v(r.A)), G.sub(v(r.C), v(r.B))); });
  },

  // ---------------- 5. Phép biến hình ----------------
  reflect_point: () => {
    const r = apply('reflect_point', (f) => [f.P, f.A]);
    const X = r.of('reflect')[0];
    r.check((v) => nearP(G.mid(v(r.P), v(X)), v(r.A)));
    const r2 = apply('reflect_point', (f) => [f.c1, f.A]);
    const c = r2.of('reflect')[0];
    r2.check((v) => { nearP(G.mid(v(r2.c1).c, v(c).c), v(r2.A)); near(v(c).r, v(r2.c1).r); });
  },
  reflect_line: () => {
    const r = apply('reflect_line', (f) => [f.P, f.d]);
    const X = r.of('reflect')[0];
    r.check((v) => { onL(G.mid(v(r.P), v(X)), v(r.d)); perpV(G.sub(v(X), v(r.P)), v(r.d).d); });
  },
  rotate: () => {
    const r = apply('rotate', (f) => [f.P, f.A], { angle: 60 });
    const X = r.of('rotate')[0];
    r.check((v) => { near(G.dist(v(r.A), v(X)), G.dist(v(r.A), v(r.P))); near(ang(G.sub(v(r.P), v(r.A)), G.sub(v(X), v(r.A))), Math.PI / 3, 'góc quay ≠ 60°'); });
    const r2 = apply('rotate', (f) => [f.d, f.A], { angle: 90 });
    const l = r2.of('rotate')[0];
    r2.check((v) => perpV(v(l).d, v(r2.d).d));
  },
  homothety: () => {
    const r = apply('homothety', (f) => [f.P, f.A], { k: -1.5 });
    const X = r.of('homothety')[0];
    r.check((v) => nearP(G.sub(v(X), v(r.A)), G.mul(G.sub(v(r.P), v(r.A)), -1.5)));
    const r2 = apply('homothety', (f) => [f.c1, f.A], { k: 3 });
    const c = r2.of('homothety')[0];
    r2.check((v) => near(v(c).r, 3 * v(r2.c1).r));
  },
  translate: () => {
    const r = apply('translate', (f) => [f.P, f.B, f.C]);
    const X = r.of('translate')[0];
    r.check((v) => nearP(G.sub(v(X), v(r.P)), G.sub(v(r.C), v(r.B))));
  },
  invert: () => {
    const r = apply('invert', (f) => [f.X, f.c1]);
    const Y = r.of('invert')[0];
    r.check((v) => { const c = v(r.c1); near(G.dist(c.c, v(r.X)) * G.dist(c.c, v(Y)), c.r * c.r, 'OX·OY ≠ r²'); col(c.c, v(r.X), v(Y)); });
    // bản 1.2: ảnh của đường tròn / đường thẳng – mọi điểm của X có ảnh nằm trên ảnh của X
    const onImage = (rr, X, img) => rr.check((v) => {
      const k = v(rr.c1), x = v(X), y = v(img);
      for (const t of [0.3, 1.7, 2.9, 4.4]) {
        const P = G.invertPoint(x.kind === 'circle' ? G.pointOn(x, t) : G.pointOn(x, t - 2), k);
        if (y.kind === 'circle') onC(P, y, 'ảnh của một điểm không nằm trên đường tròn ảnh'); else onL(P, y, 'ảnh của một điểm không nằm trên đường thẳng ảnh');
      }
    });
    const r2 = apply('invert', (f) => [f.c2, f.c1]);
    assert.equal(r2.of('invert_circle').length, 1, 'đường tròn không qua tâm → ảnh là đường tròn');
    onImage(r2, r2.c2, r2.of('invert_circle')[0]);
    const r3 = apply('invert', (f) => [f.d, f.c1]);
    onImage(r3, r3.d, r3.of('invert_circle')[0]);
    // đường tròn qua tâm nghịch đảo → đường thẳng
    const f4 = fixture();
    const thr = new Builder(f4.doc).add('circle', [f4.X, f4.doc.steps.find((x) => x.name === 'O_1').id]);
    runTool(f4.doc, LIBRARY.find((t) => t.id === 'invert'), [thr, f4.c1]);
    const img = f4.doc.steps.find((x) => x.type === 'invert_line');
    assert.ok(img, 'đường tròn qua tâm → ảnh là đường thẳng');
    for (const v of samples(f4.doc)) {
      const k = v.get(f4.c1), x = v.get(thr), y = v.get(img.id);
      for (const t of [0.5, 2, 4]) { const P = G.pointOn(x, t); if (G.dist(P, k.c) > 1e-3) onL(G.invertPoint(P, k), y); }
    }
  },
  rotate_by: () => {
    // quay P quanh A một góc bằng ∠BCQ (lấy trên hình) – đổi theo khi kéo
    const r = apply('rotate_by', (f) => [f.P, f.A, f.B, f.C, f.Q]);
    const X = r.of('rotate_by')[0];
    r.check((v) => { near(G.dist(v(r.A), v(X)), G.dist(v(r.A), v(r.P))); near(ang(G.sub(v(r.P), v(r.A)), G.sub(v(X), v(r.A))), ang(G.sub(v(r.B), v(r.C)), G.sub(v(r.Q), v(r.C))), 'góc quay ≠ ∠BCQ'); });
  },
  homothety_by: () => {
    const r = apply('homothety_by', (f) => [f.P, f.A, f.B, f.C, f.X, f.Q], { k: -1 });
    const X = r.of('homothety_by')[0];
    r.check((v) => nearP(G.sub(v(X), v(r.A)), G.mul(G.sub(v(r.P), v(r.A)), -G.dist(v(r.B), v(r.C)) / G.dist(v(r.X), v(r.Q)))));
    const r2 = apply('homothety_by', (f) => [f.c1, f.A, f.B, f.C, f.X, f.Q]);
    const c = r2.of('homothety_by')[0];
    r2.check((v) => near(v(c).r, (v(r2.c1).r * G.dist(v(r2.B), v(r2.C))) / G.dist(v(r2.X), v(r2.Q))));
  },
  spiral: () => {
    // đồng dạng tâm P biến A thành B: biến B thành điểm Y với tam giác PAB ∼ PBY (cùng hướng)
    const r = apply('spiral', (f) => [f.B, f.P, f.A, f.B]);
    const Y = r.of('spiral')[0];
    r.check((v) => {
      const [P, A, B, y] = [v(r.P), v(r.A), v(r.B), v(Y)];
      near(G.dist(P, y) / G.dist(P, B), G.dist(P, B) / G.dist(P, A), 'tỉ số');
      near(ang(G.sub(B, P), G.sub(y, P)), ang(G.sub(A, P), G.sub(B, P)), 'góc quay');
    });
    const r2 = apply('spiral', (f) => [f.A, f.P, f.A, f.B]);
    r2.check((v) => nearP(v(r2.of('spiral')[0]), v(r2.B), 'ảnh của A phải là B'));
  },
  projection: () => {
    const r = apply('projection', (f) => [f.P, f.d]);
    const F = r.of('projection')[0];
    r.check((v) => { onL(v(F), v(r.d)); perpV(G.sub(v(F), v(r.P)), v(r.d).d); });
  },

  // ---------------- 6. Mô hình ----------------
  model_excentral: () => {
    const r = apply('model_excentral', tri);
    const ex = r.of('excircle');
    assert.equal(ex.length, 3);
    const names = r.created.filter((s) => s.type === 'center').map((s) => s.name);
    for (const n of ['I_A', 'I_B', 'I_C']) assert.ok(names.includes(n), 'thiếu ' + n);
    r.check((v) => { for (const c of [...ex, r.of('incircle')[0]]) tanLC(L2(v(r.B), v(r.C)), v(c)); col(v(r.A), v(r.of('incircle')[0]).c, v(ex[0]).c); });
  },
  model_euler: () => {
    const r = apply('model_euler', tri);
    const l = r.of('line')[0];
    r.check((v) => { onL(v(r.of('centroid')[0]), v(l)); onL(v(r.of('nine_point_circle')[0]).c, v(l)); });
  },
  model_orthic: () => {
    const r = apply('model_orthic', tri);
    const [D, E, F] = r.of('foot'), H = r.of('orthocenter')[0];
    // H là tâm nội tiếp của tam giác orthic (tam giác nhọn)
    r.check((v) => nearP(G.incenter(v(D), v(E), v(F)), v(H)));
  },
  model_medial: () => {
    const r = apply('model_medial', tri);
    const m = r.of('midpoint'), g = r.of('centroid')[0];
    r.check((v) => nearP(G.centroid(...m.map(v)), v(g)));
  },
  model_miquel: () => {
    const r = apply('model_miquel', tri);
    const M = r.of('intersection_other')[0], w3 = r.of('circle_3pts')[2];
    r.check((v) => onC(v(M), v(w3), 'điểm Miquel không nằm trên đường tròn thứ ba'));
  },
  model_mixtilinear: () => {
    const r = apply('model_mixtilinear', tri);
    const [K, L] = r.of('foot'), I = r.of('incenter')[0];
    // Bổ đề: tâm nội tiếp là trung điểm của hai tiếp điểm trên AB, AC
    r.check((v) => nearP(G.mid(v(K), v(L)), v(I)));
  },
};

test('công cụ không tạo hai điểm trùng nhau (dùng lại điểm đã có / vừa dựng)', () => {
  for (const tool of LIBRARY) {
    if (tool.inputs.join() !== 'point,point,point') continue;
    const r = apply(tool.id, tri);
    const v = evaluate(r.doc);
    const pts = r.doc.steps.filter((s) => v.get(s.id) && v.get(s.id).kind === 'point');
    for (const s of r.created) {
      const P = v.get(s.id);
      if (!P || P.kind !== 'point') continue;
      const dup = pts.find((o) => o.id !== s.id && G.dist(v.get(o.id), P) < 1e-9);
      assert.ok(!dup, `${tool.label}: ${s.name} trùng ${dup && dup.name}`);
    }
  }
});

test('mọi công cụ trong menu "Công cụ" đều có bài kiểm tra theo định nghĩa', () => {
  const missing = LIBRARY.filter((t) => !CHECKS[t.id]).map((t) => t.id);
  assert.deepEqual(missing, []);
});

for (const tool of LIBRARY) {
  test(`${tool.menu} › ${tool.label}`, () => CHECKS[tool.id]());
}
