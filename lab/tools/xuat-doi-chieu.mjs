#!/usr/bin/env node
// Sinh dữ liệu ĐỐI CHIẾU giữa lõi JS và lõi Python (lab/core):
//   – các hình mẫu (src/core/examples.js, examples/*.json)
//   – MỌI công cụ trong thư viện "Công cụ" (src/ui/library.js) chạy trên một hình mẫu
// Với mỗi hình: tài liệu JSON, vài bộ tham số xê dịch ngẫu nhiên, giá trị JS của mọi đối tượng ở từng bộ,
// và kết quả bộ khám phá JS (để đối chiếu bộ quét quan hệ Python).
//
//   node lab/tools/xuat-doi-chieu.mjs > lab/tests/fixtures/js_doi_chieu.json
//
// Tệp kết quả được commit sẵn để chạy test Python không cần Node.
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { LIBRARY } from '../../src/ui/library.js';
import { runTool } from '../../src/core/apply.js';
import { Builder } from '../../src/core/builder.js';
import { evaluate } from '../../src/core/model.js';
import { EXAMPLES } from '../../src/core/examples.js';
import { explore } from '../../src/explore/explorer.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

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

/** Cách chọn đối tượng đầu vào cho từng công cụ (giống tests/library.test.mjs). */
function picksFor(tool, f) {
  const special = {
    simson_line: [f.A, f.B, f.C, f.Q], steiner_line: [f.A, f.B, f.C, f.Q],
    tangent_at: [f.c1, f.T1], tangents_meet: [f.c1, f.T1, f.T2], tangents_from: [f.c1, f.X],
    invert: [f.X, f.c1], projection: [f.P, f.d], reflect_line: [f.P, f.d],
    reflect_point: [f.P, f.A], rotate: [f.P, f.A], homothety: [f.P, f.A], translate: [f.P, f.B, f.C],
    isogonal_line: [f.B, f.A, f.C, f.P], ext_bisector: [f.B, f.A, f.C], int_ext_bisector: [f.B, f.A, f.C],
    radical_center: [f.c1, f.c2, f.c3],
  };
  if (special[tool.id]) return special[tool.id];
  const pts = [f.A, f.B, f.C, f.P];
  const circles = [f.c1, f.c2, f.c3];
  let ip = 0, ic = 0;
  return tool.inputs.map((t) => (t === 'circle' ? circles[ic++] : t === 'line' ? f.d : pts[ip++]));
}

// số ngẫu nhiên có hạt giống (để Python dựng lại đúng các bộ tham số)
function lcg(seed) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647) * 2 - 1;
}

function overridesFor(doc, n, seed) {
  const rnd = lcg(seed);
  const out = [];
  for (let i = 0; i < n; i++) {
    const ov = {};
    for (const s of doc.steps) {
      if (s.type === 'free_point') ov[s.id] = { x: s.params.x + 0.25 * rnd(), y: s.params.y + 0.25 * rnd() };
      else if (s.type === 'point_on') ov[s.id] = { t: (s.params?.t ?? 0) + 0.1 * rnd() };
    }
    out.push(ov);
  }
  return out;
}

function valuesJSON(vals) {
  const o = {};
  for (const [id, v] of vals) o[id] = v ?? null;
  return o;
}

function caseOf(name, doc, withExplore) {
  const ovs = overridesFor(doc, 3, 7);
  const values = [valuesJSON(evaluate(doc))];
  for (const ov of ovs) values.push(valuesJSON(evaluate(doc, new Map(Object.entries(ov)))));
  const c = { name, doc, overrides: ovs, values };
  if (withExplore) {
    const res = explore(doc);
    c.explore = { relations: res.relations.map((r) => ({ type: r.type, ids: r.ids, score: r.score, text: r.text })), stats: res.stats };
  }
  return c;
}

const cases = [];
for (const [key, ex] of Object.entries(EXAMPLES)) cases.push(caseOf('vi-du:' + key, ex.build(), true));
for (const file of readdirSync(join(ROOT, 'examples')).filter((x) => x.endsWith('.json')).sort()) {
  const doc = JSON.parse(readFileSync(join(ROOT, 'examples', file), 'utf8'));
  cases.push(caseOf('tep:' + file, doc, true));
}
for (const tool of LIBRARY) {
  const f = fixture();
  const opts = tool.id === 'rotate' ? { angle: 60 } : tool.id === 'homothety' ? { k: -1.5 } : {};
  runTool(f.doc, tool, picksFor(tool, f), opts);
  cases.push(caseOf('cong-cu:' + tool.id, f.doc, false));
}
// biến thể: biến hình áp cho đường tròn / đường thẳng
for (const [id, picks, opts] of [['reflect_point', (f) => [f.c1, f.A], {}], ['rotate', (f) => [f.d, f.A], { angle: 90 }], ['homothety', (f) => [f.c1, f.A], { k: 3 }], ['reflect_line', (f) => [f.c2, f.d], {}]]) {
  const f = fixture();
  runTool(f.doc, LIBRARY.find((t) => t.id === id), picks(f), opts);
  cases.push(caseOf(`cong-cu:${id}:bien-the`, f.doc, false));
}
console.log(JSON.stringify({ format: 'doi-chieu-js', cases }));
