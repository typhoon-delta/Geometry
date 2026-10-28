import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMacro, macroTool, validMacro } from '../src/core/macro.js';
import { runTool } from '../src/core/apply.js';
import { Builder } from '../src/core/builder.js';
import { evaluate } from '../src/core/model.js';
import * as G from '../src/core/geom.js';

function figure() {
  const b = new Builder();
  const A = b.point(0, 3, 'A'), B = b.point(-2, 0, 'B'), C = b.point(3, 0, 'C');
  const H = b.add('orthocenter', [A, B, C], {}, 'H');
  const O = b.add('circumcenter', [A, B, C], {}, 'O');
  const l = b.add('line', [O, H], {}, 'e');
  return { b, A, B, C, H, O, l };
}

test('tạo công cụ chỉ từ kết quả: đầu vào là các điểm gốc', () => {
  const f = figure();
  const r = createMacro(f.b.doc, [f.l], 'Đường thẳng Euler của tôi');
  assert.ok(r.ok, r.error);
  assert.deepEqual(r.tool.inputs, ['point', 'point', 'point']);
  assert.ok(validMacro(JSON.parse(JSON.stringify(r.tool))));
  // dùng công cụ trên một tam giác khác: đường thẳng đi qua trọng tâm của tam giác mới
  const b2 = new Builder();
  const P = b2.point(1, 4), Q = b2.point(-3, -1), R = b2.point(5, 0.5);
  const ids = runTool(b2.doc, macroTool(r.tool), [P, Q, R]);
  const v = evaluate(b2.doc);
  const line = v.get(ids[ids.length - 1]);
  assert.equal(line.kind, 'line');
  const Gc = G.centroid(v.get(P), v.get(Q), v.get(R));
  assert.ok(G.distPointLine(Gc, line) < 1e-9, 'kết quả không phải đường thẳng Euler');
  // bước trung gian bị ẩn, kết quả hiện
  const created = b2.doc.steps.filter((s) => ids.includes(s.id));
  assert.ok(created.slice(0, -1).every((s) => s.hidden) && !created[created.length - 1].hidden);
});

test('tạo công cụ với đầu vào chọn rõ: đường tròn và một điểm', () => {
  const b = new Builder();
  const O = b.point(0, 0, 'O'), A = b.point(2, 0, 'A');
  const c = b.add('circle', [O, A], {}, 'c');
  const P = b.point(5, 1, 'P');
  const T = b.add('tangent_point', [c, P], { which: 0 }, 'T');
  const t = b.add('line', [P, T], {}, 't');
  const r = createMacro(b.doc, [c, P, T, t], 'Tiếp tuyến từ P');
  assert.ok(r.ok, r.error);
  assert.deepEqual(r.tool.inputs, ['circle', 'point']);
  const b2 = new Builder();
  const O2 = b2.point(1, 1), A2 = b2.point(1, 4);
  const c2 = b2.add('circle', [O2, A2]);
  const X = b2.point(-6, 2);
  const ids = runTool(b2.doc, macroTool(r.tool), [c2, X]);
  const v = evaluate(b2.doc);
  const tan = v.get(ids[ids.length - 1]);
  assert.ok(Math.abs(G.distPointLine(v.get(O2), tan) - 3) < 1e-9, 'không tiếp xúc');
});

test('báo lỗi khi không chọn gì hoặc chọn điểm tự do làm kết quả', () => {
  const f = figure();
  assert.equal(createMacro(f.b.doc, [], 'x').ok, false);
  assert.equal(createMacro(f.b.doc, [f.A], 'x').ok, false);
});
