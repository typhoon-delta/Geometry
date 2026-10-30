// Bản 1.8: lệnh dựng hình tiếng Việt và điểm thoả điều kiện.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCommand, normalize } from '../src/core/cmd.js';
import { evaluate, validate } from '../src/core/model.js';
import * as G from '../src/core/geom.js';

const S = (id, type, args, params, name) => ({ id, type, args, ...(params ? { params } : {}), ...(name ? { name } : {}) });
const base = () => ({ format: 'hinh-hoc-dong', version: 1, steps: [
  S('A', 'free_point', [], { x: 0.3, y: 4 }, 'A'), S('B', 'free_point', [], { x: -3, y: 0 }, 'B'), S('C', 'free_point', [], { x: 4, y: 0 }, 'C'),
  S('bc', 'segment', ['B', 'C'], null, 'd2'), S('ca', 'segment', ['C', 'A'], null, 'd3'),
  S('w', 'circumcircle', ['A', 'B', 'C'], null, 'ω'), S('O', 'center', ['w'], null, 'O'), S('IA', 'excenter', ['A', 'B', 'C'], null, 'I_A'),
] });
const run = (doc, text, ctx) => {
  const r = parseCommand(doc, text, ctx);
  assert.ok(r.ok, `${text}: ${r.error}`);
  const out = r.run(doc);
  assert.deepEqual(validate(doc), []);
  return { ...out, v: evaluate(doc), step: doc.steps.find((s) => s.id === out.main) };
};
const ang = (P, Q, R) => Math.abs(G.directedAngle(P, Q, R));

test('chuẩn hoá: bỏ dấu từ khoá, giữ tên điểm', () => {
  assert.equal(normalize('M = Trung điểm BC'), 'M = trung diem BC');
  assert.equal(normalize("A'=đối xứng A qua (O)"), "A' = doi xung A qua (O)");
  assert.equal(normalize('Kiểm tra ∠ABC = ∠ABD'), 'kiem tra goc ABC = goc ABD');
});

test('dựng: trung điểm, trực tâm, chân đường cao, đối xứng, đường tròn, đặt tên', () => {
  const d = base();
  let r = run(d, 'M = trung điểm BC');
  assert.equal(r.step.name, 'M');
  assert.ok(G.dist(r.v.get(r.main), { x: 0.5, y: 0 }) < 1e-12);
  r = run(d, 'H = trực tâm ABC');
  assert.equal(r.step.type, 'orthocenter');
  r = run(d, 'D = chân đường cao từ A xuống BC');
  assert.ok(G.dist(r.v.get(r.main), { x: 0.3, y: 0 }) < 1e-12);
  r = run(d, "A' = đối xứng A qua BC");
  assert.ok(G.dist(r.v.get(r.main), { x: 0.3, y: -4 }) < 1e-12);
  r = run(d, 'đường tròn đường kính BC');
  assert.equal(r.step.type, 'circle_diameter');
  r = run(d, 'qua A vuông góc BC');
  assert.equal(r.step.type, 'perpendicular');
  assert.equal(r.step.aux, true);
  assert.ok(!parseCommand(d, 'M = trung điểm AB').ok, 'tên M đã có');
  assert.match(parseCommand(d, 'trung điểm XY').error, /Chưa có điểm X/);
});

test('tên nhiều chữ khớp theo tên có trên hình: I_AB = đoạn I_A B', () => {
  const d = base();
  const r = run(d, 'I_AB');
  assert.equal(r.step.type, 'segment');
  assert.deepEqual(r.step.args, ['IA', 'B']);
});

test('giao điểm: tự dựng đường (ABC)/(O)/đường qua hai điểm; nghiệm đã có thì lấy nghiệm còn lại', () => {
  const d = base();
  let r = run(d, 'E = AO cắt (O)');
  assert.equal(r.step.type, 'intersection_other'); // A đã có → điểm đối tâm của A
  const O = r.v.get('O'), A = r.v.get('A');
  assert.ok(G.dist(r.v.get(r.main), { x: 2 * O.x - A.x, y: 2 * O.y - A.y }) < 1e-9);
  assert.ok(d.steps.some((s) => s.type === 'line' && s.aux), 'AO chưa có: dựng đường phụ');
  assert.match(parseCommand(d, 'X = d2 cắt (O)').error, /đều đã có/);
  assert.match(parseCommand(d, 'X = d2 cắt d3').error, /chính là điểm C/);
  r = run(d, 'F = (ABE) cắt d2 khác B');
  assert.equal(r.step.type, 'intersection_other');
});

test('điểm thoả điều kiện: Brocard, PB = PC và góc 120°, thuộc đường tròn; chọn nghiệm gần con trỏ', () => {
  const d = base();
  let r = run(d, 'P thoả góc PAB = góc PBC, góc PBC = góc PCA');
  const [A, B, C] = ['A', 'B', 'C'].map((id) => r.v.get(id));
  const P = r.v.get(r.main);
  assert.ok(Math.abs(ang(P, A, B) - ang(P, B, C)) < 1e-7 && Math.abs(ang(P, B, C) - ang(P, C, A)) < 1e-7);
  r = run(d, 'Q sao cho QB = QC, góc BQC = 120', { mouse: { x: 0.5, y: -2 } });
  const Q = r.v.get(r.main);
  assert.ok(Q.y < 0 && Math.abs(G.dist(Q, B) - G.dist(Q, C)) < 1e-7 && Math.abs(ang(B, Q, C) - 120) < 1e-7);
  r = run(d, 'Q2 sao cho Q2B = Q2C, góc BQ2C = 120', { mouse: { x: 0.5, y: 2 } });
  assert.ok(r.v.get(r.main).y > 0, 'con trỏ phía trên: nghiệm phía trên');
  r = run(d, 'R thoả R thuộc (O), RB = RC', { mouse: { x: 0.5, y: -3 } });
  const R = r.v.get(r.main), W = r.v.get('w');
  assert.ok(Math.abs(G.dist(R, W.c) - W.r) < 1e-7 && R.y < 0);
  assert.match(parseCommand(d, 'Z thoả góc ZAB = 500').error, /Không tìm được/);
  assert.match(parseCommand(d, 'Z thoả ZA = ZB, ZB = ZC, góc AZB = 30').error, /Tối đa hai/);
});

test('lệnh kiểm tra trả về nhận định', () => {
  const d = base();
  run(d, 'H = trực tâm ABC');
  const r = parseCommand(d, 'kiểm tra O, H, A thẳng hàng');
  assert.ok(r.ok && r.kind === 'check');
  assert.equal(r.run(d).type, 'collinear');
  assert.equal(parseCommand(d, 'kiểm tra d2 vuông góc d3').run(d).type, 'perpendicular');
  assert.equal(parseCommand(d, 'kiểm tra góc BAH = góc OAC').run(d).type, 'equal_angle');
});
