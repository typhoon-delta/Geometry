import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/core/geom.js';
import { evaluate, validate, removeSteps, dependents, frames, emptyDoc } from '../src/core/model.js';
import { Builder } from '../src/core/builder.js';

const close = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) < tol, `${a} ≠ ${b}`);
const closeP = (P, Q, tol = 1e-9) => {
  assert.ok(P && Q, 'điểm không xác định');
  close(P.x, Q.x, tol);
  close(P.y, Q.y, tol);
};
const collinear = (P, Q, R) => Math.abs(G.cross(G.sub(Q, P), G.sub(R, P)));

function triangle(ax = 0.3, ay = 3.1, bx = -2.2, by = -0.4, cx = 3.7, cy = 0.1) {
  const b = new Builder();
  const A = b.point(ax, ay, 'A'), B = b.point(bx, by, 'B'), C = b.point(cx, cy, 'C');
  return { b, A, B, C };
}

test('các điểm đặc biệt của tam giác', () => {
  const { b, A, B, C } = triangle();
  const O = b.add('circumcenter', [A, B, C], {}, 'O');
  const H = b.add('orthocenter', [A, B, C], {}, 'H');
  const I = b.add('incenter', [A, B, C], {}, 'I');
  const Gc = b.add('centroid', [A, B, C], {}, 'G');
  const N = b.add('nine_point_center', [A, B, C], {}, 'N');
  const v = evaluate(b.doc);
  const [a, bb, c] = [v.get(A), v.get(B), v.get(C)];
  // O cách đều ba đỉnh
  close(G.dist(v.get(O), a), G.dist(v.get(O), bb));
  close(G.dist(v.get(O), a), G.dist(v.get(O), c));
  // AH ⟂ BC
  close(G.dot(G.sub(v.get(H), a), G.sub(c, bb)), 0);
  close(G.dot(G.sub(v.get(H), bb), G.sub(c, a)), 0);
  // Đường thẳng Euler và N là trung điểm OH
  assert.ok(collinear(v.get(O), v.get(Gc), v.get(H)) < 1e-9);
  closeP(v.get(N), G.mid(v.get(O), v.get(H)));
  // I cách đều ba cạnh
  const dI = (P, Q) => G.distPointLine(v.get(I), G.lineThrough(P, Q));
  close(dI(a, bb), dI(bb, c));
  close(dI(a, bb), dI(c, a));
});

test('đường tròn Euler đi qua 9 điểm', () => {
  const { b, A, B, C } = triangle();
  const n = b.add('nine_point_circle', [A, B, C]);
  const H = b.add('orthocenter', [A, B, C]);
  const pts = [
    b.add('midpoint', [A, B]), b.add('midpoint', [B, C]), b.add('midpoint', [C, A]),
    b.add('altitude_foot', [A, B, C]), b.add('altitude_foot', [B, C, A]), b.add('altitude_foot', [C, A, B]),
    b.add('midpoint', [A, H]), b.add('midpoint', [B, H]), b.add('midpoint', [C, H]),
  ];
  const v = evaluate(b.doc);
  const circ = v.get(n);
  for (const p of pts) close(G.dist(v.get(p), circ.c), circ.r);
});

test('điểm chính giữa cung: chứa A và không chứa A', () => {
  const { b, A, B, C } = triangle();
  const M1 = b.add('arc_midpoint', [A, B, C], { contains: false });
  const M2 = b.add('arc_midpoint', [A, B, C], { contains: true });
  const I = b.add('incenter', [A, B, C]);
  const v = evaluate(b.doc);
  const [a, bb, c] = [v.get(A), v.get(B), v.get(C)];
  close(G.dist(v.get(M1), bb), G.dist(v.get(M1), c));
  close(G.dist(v.get(M2), bb), G.dist(v.get(M2), c));
  // M1 (không chứa A) nằm trên phân giác AI; M1 khác phía A so với BC
  assert.ok(collinear(a, v.get(I), v.get(M1)) < 1e-9);
  const side = (P) => G.cross(G.sub(c, bb), G.sub(P, bb));
  assert.ok(side(a) * side(v.get(M1)) < 0);
  assert.ok(side(a) * side(v.get(M2)) > 0);
  // M1 cách đều B, C, I (định lý con dao / trillium)
  close(G.dist(v.get(M1), v.get(I)), G.dist(v.get(M1), bb));
});

test('giao điểm, hình chiếu, đối xứng, phân giác', () => {
  const b = new Builder();
  const A = b.point(0, 0), B = b.point(4, 0), C = b.point(1, 3), D = b.point(3, 2);
  const l1 = b.add('line', [A, B]);
  const l2 = b.add('line', [C, D]);
  const X = b.add('intersection', [l1, l2]);
  const F = b.add('projection', [C, l1]);
  const R = b.add('reflect', [C, l1]);
  const Rp = b.add('reflect', [C, A]);
  const bis = b.add('angle_bisector', [B, A, C]);
  const v = evaluate(b.doc);
  closeP(v.get(X), { x: 7, y: 0 });
  closeP(v.get(F), { x: 1, y: 0 });
  closeP(v.get(R), { x: 1, y: -3 });
  closeP(v.get(Rp), { x: -1, y: -3 });
  const d = v.get(bis).d;
  close(Math.atan2(d.y, d.x), Math.atan2(3, 1) / 2);
});

test('giao điểm thứ hai và điểm trên đường tròn', () => {
  const b = new Builder();
  const O = b.point(0, 0), A = b.point(1, 0);
  const c = b.add('circle', [O, A]);
  const P = b.add('point_on', [c], { t: Math.PI / 2 });
  const l = b.add('line', [A, P]);
  const Q = b.add('intersection_other', [l, c, A]);
  const v = evaluate(b.doc);
  closeP(v.get(P), { x: 0, y: 1 });
  closeP(v.get(Q), { x: 0, y: 1 });
});

test('giao điểm biến thiên liên tục khi kéo (không nhảy nghiệm)', () => {
  // Đường tròn – đường tròn và đường thẳng – đường tròn; kéo một điểm tự do theo đường dài, bước nhỏ.
  const b = new Builder();
  const O1 = b.point(0, 0), A1 = b.point(2, 0);
  const O2 = b.point(2.5, 0.3), A2 = b.point(2.5, 2.2);
  const c1 = b.add('circle', [O1, A1]);
  const c2 = b.add('circle', [O2, A2]);
  const P = b.point(-3, 0.5), Q = b.point(3, -0.4);
  const l = b.add('line', [P, Q]);
  const X0 = b.add('intersection', [c1, c2], { which: 0 });
  const X1 = b.add('intersection', [c1, c2], { which: 1 });
  const Y0 = b.add('intersection', [l, c1], { which: 0 });
  const Y1 = b.add('intersection', [l, c1], { which: 1 });
  const steps = 400;
  let prev = null;
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * 2 * Math.PI;
    // kéo tâm O2 đi một vòng quanh, và kéo Q lên xuống
    b.doc.steps.find((s) => s.id === O2).params = { x: 2.5 * Math.cos(t), y: 2.5 * Math.sin(t) };
    b.doc.steps.find((s) => s.id === A2).params = { x: 2.5 * Math.cos(t), y: 2.5 * Math.sin(t) + 1.9 };
    b.doc.steps.find((s) => s.id === Q).params = { x: 3, y: -0.4 + Math.sin(t) };
    const v = evaluate(b.doc);
    const cur = [X0, X1, Y0, Y1].map((id) => v.get(id));
    if (prev) {
      cur.forEach((p, k) => {
        if (p && prev[k]) assert.ok(G.dist(p, prev[k]) < 0.2, `nhảy nghiệm tại bước ${i}, điểm ${k}`);
      });
    }
    prev = cur;
  }
});

test('xoá kéo theo đối tượng phụ thuộc; khung trình bày; kiểm tra hợp lệ', () => {
  const { b, A, B, C } = triangle();
  const s1 = b.add('segment', [A, B]);
  const M = b.add('midpoint', [A, B], {}, undefined, { joinPrev: true });
  const h = b.add('line', [M, C], {}, undefined, { hidden: true });
  const X = b.add('projection', [A, h]);
  assert.deepEqual([...dependents(b.doc, [M])].sort(), [h, X].sort());
  const { doc, removed } = removeSteps(b.doc, [M]);
  assert.equal(removed.length, 3);
  assert.equal(doc.steps.length, 4);
  assert.deepEqual(frames(b.doc), [[A], [B], [C], [s1, M], [h, X]]);
  assert.deepEqual(validate(b.doc), []);
  const bad = { ...emptyDoc(), steps: [{ id: 'x', type: 'midpoint', args: ['p', 'q'] }] };
  assert.ok(validate(bad).length > 0);
});

test('suy biến cho kết quả null thay vì NaN', () => {
  const b = new Builder();
  const A = b.point(0, 0), B = b.point(1, 1), C = b.point(2, 2);
  const O = b.add('circumcenter', [A, B, C]);
  const l1 = b.add('line', [A, B]);
  const l2 = b.add('parallel', [C, l1]);
  const X = b.add('intersection', [l1, l2]);
  const M = b.add('midpoint', [X, A]);
  const v = evaluate(b.doc);
  assert.equal(v.get(O), null);
  assert.equal(v.get(X), null);
  assert.equal(v.get(M), null);
});

test('cập nhật từng phần khi kéo cho kết quả y hệt tính lại toàn bộ', async () => {
  const { EXAMPLES } = await import('../src/core/examples.js');
  const { makeUpdater } = await import('../src/core/model.js');
  const doc = EXAMPLES.dense.build();
  const A = doc.steps.find((s) => s.name === 'A');
  const vals = evaluate(doc);
  const upd = makeUpdater(doc, [A.id]);
  assert.ok(upd.size < doc.steps.length, 'không phải mọi bước đều phụ thuộc A');
  for (let i = 0; i < 20; i++) {
    A.params = { x: 0.6 + 0.05 * i, y: 3.6 - 0.03 * i };
    upd(vals);
    const full = evaluate(doc);
    for (const s of doc.steps) assert.deepEqual(vals.get(s.id), full.get(s.id), s.id);
  }
});

// ---------- bản 1.7 ----------
test('góc bằng góc: đường qua O tạo với OX góc bằng ∠ABC (hai phía), điểm trên đường', () => {
  const { b, A, B, C } = triangle();
  const ca = b.add('segment', [C, A]);
  const l0 = b.add('angle_line', [A, C, A, B, C], { flip: false });
  const l1 = b.add('angle_line', [A, C, A, B, C], { flip: true });
  const E = b.add('angle_point', [B, C, B, A, C, ca], { flip: false });
  const v = evaluate(b.doc);
  const angB = Math.abs(G.directedAngle(v.get(A), v.get(B), v.get(C)));
  for (const l of [l0, l1]) {
    const L = v.get(l);
    const X = { x: L.p.x + L.d.x, y: L.p.y + L.d.y };
    const a = Math.abs(G.directedAngle(v.get(C), v.get(A), X));
    assert.ok(Math.abs(a - angB) < 1e-9 || Math.abs(180 - a - angB) < 1e-9);
  }
  assert.ok(Math.abs(G.cross(v.get(l0).d, v.get(l1).d)) > 1e-6, 'hai phía cho hai đường khác nhau');
  // điểm E trên CA với ∠CBE = ∠BAC
  const Ev = v.get(E);
  assert.ok(collinear(v.get(C), v.get(A), Ev) < 1e-9);
  close(Math.abs(G.directedAngle(v.get(C), v.get(B), Ev)), Math.abs(G.directedAngle(v.get(B), v.get(A), v.get(C))));
});

test('điểm trong tam giác theo (u, v)', () => {
  const { b, A, B, C } = triangle();
  const P = b.add('point_in', [A, B, C], { u: 0.2, v: 0.5 });
  const v = evaluate(b.doc);
  const a = v.get(A), bb = v.get(B), c = v.get(C);
  closeP(v.get(P), { x: a.x + 0.2 * (bb.x - a.x) + 0.5 * (c.x - a.x), y: a.y + 0.2 * (bb.y - a.y) + 0.5 * (c.y - a.y) });
});

test('điểm cố định: đường AD (D chạy trên BC) luôn qua A; đường tròn qua hai điểm cố định; họ song song thì không có', () => {
  const { b, A, B, C } = triangle();
  const bc = b.add('segment', [B, C]);
  const D = b.add('point_on', [bc], { t: 0.3 });
  const ad = b.add('line', [A, D]);
  const X = b.add('fixed_point', [ad, D]);
  const X1 = b.add('fixed_point', [ad, D], { which: 1 });
  // đường tròn (ABD) khi D chạy trên BC: qua A và B
  const w = b.add('circumcircle', [A, B, D]);
  const Y0 = b.add('fixed_point', [w, D]), Y1 = b.add('fixed_point', [w, D], { which: 1 });
  const par = b.add('parallel', [D, b.add('line', [A, C])]);
  const Z = b.add('fixed_point', [par, D]);
  const v = evaluate(b.doc);
  closeP(v.get(X), v.get(A), 1e-6);
  assert.equal(v.get(X1), null);
  const ys = [v.get(Y0), v.get(Y1)].sort((p, q) => p.x - q.x);
  const ab = [v.get(A), v.get(B)].sort((p, q) => p.x - q.x);
  closeP(ys[0], ab[0], 1e-6);
  closeP(ys[1], ab[1], 1e-6);
  assert.equal(v.get(Z), null);
});

test('quỹ tích: trung điểm AD khi D chạy trên BC là đường trung bình; trực tâm khi D chạy trên đường tròn ngoại tiếp', () => {
  const { b, A, B, C } = triangle();
  const bc = b.add('segment', [B, C]);
  const D = b.add('point_on', [bc], { t: 0.3 });
  const N = b.add('midpoint', [A, D]);
  const L = b.add('locus', [N, D], { n: 50 });
  const w = b.add('circumcircle', [A, B, C]);
  const Q = b.add('point_on', [w], { t: 1 });
  const H = b.add('orthocenter', [A, B, Q]);
  const L2 = b.add('locus', [H, Q], { n: 80 });
  const bad = b.add('locus', [N, A]);
  const v = evaluate(b.doc);
  const a = v.get(A), mB = G.mid(a, v.get(B)), mC = G.mid(a, v.get(C));
  const loc = v.get(L);
  assert.equal(loc.kind, 'locus');
  assert.equal(loc.closed, false);
  for (const p of loc.pts) assert.ok(collinear(mB, mC, p) < 1e-9);
  closeP(loc.pts[0], mB);
  closeP(loc.pts[loc.pts.length - 1], mC);
  // trực tâm ABQ: ảnh của Q qua phép đối xứng → nằm trên đường tròn đối xứng của ω qua AB
  const W = v.get(w), refl = G.reflectObject(W, { kind: 'line', p: a, d: G.sub(v.get(B), a), sub: 'line' });
  const loc2 = v.get(L2);
  assert.equal(loc2.closed, true);
  for (const p of loc2.pts.filter(Boolean)) close(G.dist(p, refl.c), refl.r, 1e-6);
  assert.equal(v.get(bad), null, 'điểm chạy phải là điểm trên đường');
});

test('số đo: độ dài, góc (độ), tỉ số', () => {
  const b = new Builder();
  const A = b.point(0, 0), B = b.point(3, 0), C = b.point(0, 4);
  const l = b.add('measure_len', [B, C]), g = b.add('measure_angle', [B, A, C]), r = b.add('measure_ratio', [A, B, A, C]);
  const v = evaluate(b.doc);
  close(v.get(l).value, 5);
  close(v.get(g).value, 90);
  close(v.get(r).value, 0.75);
});
