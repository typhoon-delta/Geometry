// Bản 1.8: kiểm tra nhận định, trường hợp đặc biệt, bám nghiệm khi kéo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Builder } from '../src/core/builder.js';
import { evaluate, makeUpdater, clone, paramsOf } from '../src/core/model.js';
import * as G from '../src/core/geom.js';
import { checkClaim, claimsFor } from '../src/explore/check.js';
import { specialCases, caseOverrides } from '../src/explore/special.js';
import { THU_VIEN } from '../src/core/thu-vien.js';

function figure(t = 0.3) {
  const b = new Builder();
  const A = b.point(0.3, 3.1, 'A'), B = b.point(-2.2, -0.4, 'B'), C = b.point(3.7, 0.1, 'C');
  b.add('segment', [A, B]); const bc = b.add('segment', [B, C]); b.add('segment', [C, A]);
  const ids = { A, B, C, bc };
  ids.O = b.add('circumcenter', [A, B, C], {}, 'O');
  ids.H = b.add('orthocenter', [A, B, C], {}, 'H');
  ids.G = b.add('centroid', [A, B, C], {}, 'G');
  ids.I = b.add('incenter', [A, B, C], {}, 'I');
  ids.D = b.add('point_on', [bc], { t }, 'D');
  ids.M = b.add('midpoint', [B, C], {}, 'M');
  return { doc: b.doc, ...ids };
}
const sp = (r, label) => r.special.find((x) => x.label === label)?.status;

test('O, H, G luôn thẳng hàng (Euler); tam giác đều thì suy biến', () => {
  const f = figure();
  const r = checkClaim(f.doc, { type: 'collinear', ids: [f.O, f.H, f.G] });
  assert.equal(r.verdict, 'always');
  assert.ok(r.ok >= 60);
  assert.equal(sp(r, 'tam giác ABC đều'), 'undef');
});

test('O, I, H không thẳng hàng; đúng khi tam giác cân', () => {
  const f = figure();
  const r = checkClaim(f.doc, { type: 'collinear', ids: [f.O, f.I, f.H] });
  assert.equal(r.verdict, 'false');
  for (const v of ['A', 'B', 'C']) assert.equal(sp(r, `tam giác ABC cân tại ${v}`), 'true');
  assert.equal(sp(r, 'tam giác ABC vuông tại A'), 'false');
});

test('đúng trên hình này nhưng không luôn đúng: có phản ví dụ; đúng khi D là trung điểm', () => {
  const f = figure(0.5); // D đang trùng trung điểm BC
  const r = checkClaim(f.doc, { type: 'coincide', ids: [f.D, f.M] });
  assert.equal(r.verdict, 'not_always');
  assert.ok(r.counter && r.counter.ov[f.D]);
  const v = evaluate(f.doc, new Map(Object.entries(r.counter.ov)));
  assert.ok(G.dist(v.get(f.D), v.get(f.M)) > 1e-3);
  assert.equal(sp(r, 'D là trung điểm BC'), 'true');
});

test('các nhận định theo đối tượng đang chọn', () => {
  const f = figure();
  const t = (ids) => claimsFor(f.doc, ids).map((c) => c.type).join(',');
  assert.equal(t([f.O, f.H]), 'coincide');
  assert.equal(t([f.O, f.H, f.G]), 'collinear');
  assert.equal(t([f.A, f.B, f.C, f.D]), 'concyclic,equal_len');
  assert.equal(t([f.A, f.bc]), 'on_line');
  assert.equal(t([f.A, f.B, f.C, f.A, f.B, f.D]), 'equal_angle');
});

test('trường hợp đặc biệt cho đúng hình: cân, vuông, đều, trung điểm, chân đường cao, chân phân giác', () => {
  const f = figure();
  const cases = specialCases(f.doc);
  const at = (key) => evaluate(f.doc, caseOverrides(f.doc, cases.find((c) => c.key === key)));
  const tk = [f.A, f.B, f.C].sort().join(',');
  let v = at(`can:${tk}:${f.A}`);
  assert.ok(Math.abs(G.dist(v.get(f.A), v.get(f.B)) - G.dist(v.get(f.A), v.get(f.C))) < 1e-7);
  v = at(`vuong:${tk}:${f.A}`);
  assert.ok(Math.abs(G.dot(G.sub(v.get(f.B), v.get(f.A)), G.sub(v.get(f.C), v.get(f.A)))) < 1e-7);
  v = at(`deu:${tk}`);
  assert.ok(Math.abs(G.dist(v.get(f.A), v.get(f.B)) - G.dist(v.get(f.B), v.get(f.C))) < 1e-7);
  v = at(`trung-diem:${f.D}`);
  assert.ok(G.dist(v.get(f.D), v.get(f.M)) < 1e-7);
  v = at(`chan-cao:${f.D}:${f.A}`);
  assert.ok(Math.abs(G.dot(G.sub(v.get(f.D), v.get(f.A)), G.sub(v.get(f.C), v.get(f.B)))) < 1e-7);
  v = at(`chan-pg:${f.D}:${f.A}`);
  const DB = G.dist(v.get(f.D), v.get(f.B)), DC = G.dist(v.get(f.D), v.get(f.C));
  assert.ok(Math.abs(DB / DC - G.dist(v.get(f.A), v.get(f.B)) / G.dist(v.get(f.A), v.get(f.C))) < 1e-7);
});

test('kéo điểm: giao điểm bám nghiệm gần vị trí cũ (không nhảy sang nghiệm kia)', () => {
  // IMO 2018/1, kéo C một vòng: không bám nghiệm thì G nhảy sang nghiệm còn lại
  const src = THU_VIEN.find((x) => x.id === 'imo2018-1').doc;
  const jumps = (track) => {
    const doc = clone(src);
    const C = doc.steps.find((s) => s.type === 'free_point' && s.name === 'C');
    const p0 = { ...paramsOf(C) };
    const base = evaluate(doc);
    const pts = [...base.values()].filter((v) => v && v.kind === 'point');
    const scale = Math.hypot(Math.max(...pts.map((p) => p.x)) - Math.min(...pts.map((p) => p.x)), Math.max(...pts.map((p) => p.y)) - Math.min(...pts.map((p) => p.y)));
    const upd = makeUpdater(doc, [C.id], { track });
    let cur = base, n = 0;
    for (let i = 1; i <= 240; i++) {
      const a = (2 * Math.PI * i) / 240;
      C.params = { x: p0.x + 0.25 * scale * (Math.cos(a) - 1), y: p0.y + 0.25 * scale * Math.sin(a) };
      const prev = cur;
      cur = upd(new Map(cur));
      for (const s of doc.steps) {
        if (s.type !== 'intersection') continue;
        const v = cur.get(s.id), pv = prev.get(s.id);
        const r = G.intersect(cur.get(s.args[0]), cur.get(s.args[1]));
        if (!v || !pv || r.length !== 2) continue;
        const alt = G.dist(r[0], v) < 1e-12 ? r[1] : r[0];
        if (G.dist(v, pv) > 4 * G.dist(alt, pv) && G.dist(v, pv) > 0.01 * scale) n++;
      }
    }
    return n;
  };
  assert.ok(jumps(false) > 0, 'hình thử phải có chỗ nhảy nghiệm khi không bám');
  assert.equal(jumps(true), 0);
});
