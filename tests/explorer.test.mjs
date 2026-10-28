import { test } from 'node:test';
import assert from 'node:assert/strict';
import { explore } from '../src/explore/explorer.js';
import { EXAMPLES } from '../src/core/examples.js';
import { Builder } from '../src/core/builder.js';

const byName = (doc) => (n) => doc.steps.find((s) => s.name === n).id;
const has = (rels, type, ids) => rels.find((r) => r.type === type && ids.every((i) => r.ids.includes(i)));
const show = (res) => res.relations.map((r) => `${r.score} [${r.type}] ${r.text}`).join('\n');

test('đường thẳng Euler: tìm ra O, G, H thẳng hàng', () => {
  const doc = EXAMPLES.euler_line.build();
  const id = byName(doc);
  const res = explore(doc);
  assert.ok(res.stats.samples >= 10, 'đủ mẫu');
  const r = has(res.relations, 'collinear', [id('O'), id('G'), id('H')]);
  assert.ok(r, 'không tìm thấy đường thẳng Euler:\n' + show(res));
  assert.equal(res.relations[0], r, 'đường thẳng Euler phải đứng đầu:\n' + show(res));
  // không có quan hệ hiển nhiên: A, B, C nằm trên đường tròn ngoại tiếp
  assert.ok(!res.relations.some((x) => x.type === 'on_circle'), show(res));
});

test('đường tròn Euler: 6 điểm còn lại nằm trên đường tròn qua 3 trung điểm', () => {
  const doc = EXAMPLES.nine_point.build();
  const id = byName(doc);
  const res = explore(doc);
  const r = has(res.relations, 'on_circle', ['D', 'E', 'F', 'X', 'Y', 'Z'].map(id));
  assert.ok(r, 'không tìm thấy 9 điểm:\n' + show(res));
  assert.equal(res.relations[0], r, 'quan hệ với đường tròn Euler phải đứng đầu:\n' + show(res));
  assert.match(r.note, /đường tròn Euler tam giác ABC/);
  // A, H, D thẳng hàng là hiển nhiên (D chân đường cao, H trực tâm) → không được báo
  assert.ok(!has(res.relations, 'collinear', [id('A'), id('H'), id('D')]), show(res));
  // X là trung điểm AH → A, X, H thẳng hàng là hiển nhiên
  assert.ok(!has(res.relations, 'collinear', [id('A'), id('X'), id('H')]), show(res));
});

test('đường thẳng Simson: chân ba đường vuông góc thẳng hàng', () => {
  const doc = EXAMPLES.simson.build();
  const id = byName(doc);
  const res = explore(doc);
  const r = has(res.relations, 'collinear', [id('D'), id('E'), id('F')]);
  assert.ok(r, 'không tìm thấy đường thẳng Simson:\n' + show(res));
  // D nằm trên BC (hình chiếu) là hiển nhiên
  assert.ok(!res.relations.some((x) => x.type === 'on_line'), show(res));
});

test('định lý Miquel: giao điểm thứ hai của hai đường tròn nằm trên đường tròn thứ ba', () => {
  const doc = EXAMPLES.miquel.build();
  const id = byName(doc);
  const res = explore(doc);
  const w3 = doc.steps.filter((s) => s.type === 'circle_3pts')[2].id;
  const r = has(res.relations, 'on_circle', [w3, id('M')]);
  assert.ok(r, 'không tìm thấy điểm Miquel:\n' + show(res));
});

test('Miquel không dựng điểm M: ba đường tròn cùng đi qua một điểm', () => {
  const doc = EXAMPLES.miquel.build();
  doc.steps.pop();
  const res = explore(doc);
  const cs = doc.steps.filter((s) => s.type === 'circle_3pts').map((s) => s.id);
  assert.ok(has(res.relations, 'concurrent', cs), show(res));
});

test('hình "ngẫu nhiên" không có quan hệ nào (không báo sai)', () => {
  const b = new Builder();
  const A = b.point(0.3, 3.1), B = b.point(-2.2, -0.4), C = b.point(3.7, 0.1);
  const P = b.point(1.1, 0.9), Q = b.point(-0.7, 1.7);
  b.add('segment', [A, B]); b.add('segment', [B, C]); b.add('segment', [C, A]);
  b.add('circle_3pts', [A, P, Q]);
  b.add('line', [P, C]);
  b.add('midpoint', [P, Q]);
  b.add('circumcenter', [A, B, C], {}, 'O');
  const res = explore(b.doc);
  assert.equal(res.relations.length, 0, show(res));
});

test('tiếp xúc, song song, vuông góc, đồng quy và loại bỏ hiển nhiên', () => {
  const b = new Builder();
  const A = b.point(0.2, 3.3, 'A'), B = b.point(-2.5, -0.5, 'B'), C = b.point(3.4, -0.2, 'C');
  const BC = b.add('line', [B, C]), CA = b.add('line', [C, A]), AB = b.add('line', [A, B]);
  const I = b.add('incenter', [A, B, C], {}, 'I');
  const inc = b.add('incircle', [A, B, C]);
  const T = b.add('incircle_touch', [A, B, C], {}, 'T');
  const perpIT = b.add('line', [I, T]);
  const Ma = b.add('midpoint', [B, C], {}, 'M');
  const Mc = b.add('midpoint', [A, B], {}, 'K');
  const mid = b.add('line', [Ma, Mc]);
  const hA = b.add('perpendicular', [A, BC]);
  const hB = b.add('perpendicular', [B, CA]);
  const hC = b.add('perpendicular', [C, AB]);
  const res = explore(b.doc);
  const s = show(res);
  // MK ∥ AC (đường trung bình) – không hiển nhiên từ cách dựng
  assert.ok(has(res.relations, 'parallel', [mid, CA]), s);
  // IT ⊥ BC – hiển nhiên? (T là hình chiếu của I lên BC trong định nghĩa) → hiện chưa suy ra được, chấp nhận báo
  // ba đường cao đồng quy (không có điểm H dựng sẵn)
  assert.ok(has(res.relations, 'concurrent', [hA, hB, hC]), s);
  // đường tròn nội tiếp tiếp xúc BC: hiển nhiên → không báo
  assert.ok(!has(res.relations, 'tangent', [BC, inc]), s);
  // T nằm trên đường tròn nội tiếp: hiển nhiên
  assert.ok(!has(res.relations, 'on_circle', [inc, T]), s);
  // hai đường vuông góc cùng ⊥ BC... hA ⊥ BC hiển nhiên
  assert.ok(!has(res.relations, 'perpendicular', [hA, BC]), s);
  void perpIT;
});

test('hình lớn (~30 điểm): tìm Feuerbach, đường thẳng Euler; chạy đủ nhanh', () => {
  const b = new Builder();
  const A = b.point(-0.6, 3.4, 'A'), B = b.point(-3.4, -1.6, 'B'), C = b.point(3.6, -1.6, 'C');
  const sAB = b.add('line', [A, B]), sBC = b.add('line', [B, C]), sCA = b.add('line', [C, A]);
  const O = b.add('circumcenter', [A, B, C], {}, 'O'), H = b.add('orthocenter', [A, B, C], {}, 'H');
  const I = b.add('incenter', [A, B, C], {}, 'I');
  const Gc = b.add('centroid', [A, B, C], {}, 'G'), N = b.add('nine_point_center', [A, B, C], {}, 'N');
  const w = b.add('circumcircle', [A, B, C]);
  const inc = b.add('incircle', [A, B, C]);
  const npc = b.add('nine_point_circle', [A, B, C]);
  for (const [X, Y, Z] of [[A, B, C], [B, C, A], [C, A, B]]) {
    b.add('altitude_foot', [X, Y, Z]); b.add('incircle_touch', [X, Y, Z]);
    b.add('arc_midpoint', [X, Y, Z], { contains: false }); b.add('arc_midpoint', [X, Y, Z], { contains: true });
    b.add('midpoint', [Y, Z]); b.add('midpoint', [X, H]); b.add('line', [X, I]); b.add('line', [X, O]);
  }
  const OH = b.add('line', [O, H]);
  const P = b.add('point_on', [w], { t: 2.1 }, 'P');
  for (const l of [sAB, sBC, sCA]) b.add('projection', [P, l]);
  const t0 = Date.now();
  const res = explore(b.doc);
  const ms = Date.now() - t0;
  assert.ok(ms < 3000, `chạy quá lâu: ${ms} ms`);
  assert.ok(res.stats.samples >= 10, JSON.stringify(res.stats));
  assert.ok(has(res.relations, 'tangent', [inc, npc]), 'không tìm thấy Feuerbach:\n' + show(res));
  assert.ok(has(res.relations, 'on_line', [OH, Gc, N]), show(res));
  assert.equal(res.relations[0].type, 'tangent');
});
