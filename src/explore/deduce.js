// Bộ máy suy luận (bản 1.9): biến đổi góc + biến đổi độ dài, có ghi vết để giải thích "vì sao".
//
// Ý tưởng (như phần "AR" của AlphaGeometry, thu gọn):
//   • Mỗi đường thẳng có một biến "hướng" θ (mod 180°). Mỗi sự kiện góc là một phương trình tuyến tính Σ c·θ = hằng số
//     (vuông góc, song song, phân giác, đẳng giác, góc nội tiếp, tiếp tuyến – dây cung, góc đáy tam giác cân…).
//     Đẳng thức góc suy ra được ⇔ vectơ hệ số nằm trong không gian sinh bởi các sự kiện (khử Gauss, số học mod p).
//     Hằng số không cần theo dõi: chỉ hỏi những đẳng thức ĐÚNG TRÊN HÌNH (kiểm bằng số), nên hằng số tự khớp.
//   • Tương tự cho độ dài: biến log|PQ|; sự kiện "PQ = RS" (trung điểm, bán kính, đối xứng, trung trực…).
//   • Vòng suy luận có số dẫn đường: với các bộ điểm thẳng hàng / đồng viên / tam giác cân ĐÚNG TRÊN HÌNH mà chưa biết,
//     thử suy ra bằng biến đổi góc (độ dài); được thì thành sự kiện mới (kèm lý do) và lặp lại tới khi không thêm được.
//   • Mỗi hàng của hệ mang "lý do" (chỉ số sự kiện); khử Gauss cộng dồn lý do ⇒ biết đẳng thức cần chứng minh dùng những
//     sự kiện nào ⇒ cây chứng minh (sự kiện → các sự kiện nó dùng → … → cách dựng).
//
//   const D = new Deducer(doc).run();
//   D.prove(claim)   → {status: 'proved'|'unproved'|'unsupported', fact, steps: [...] }   (claim theo check.js)
//   D.explain(factId) → các bước chứng minh (đã sắp theo thứ tự) để hiển thị

import { evaluate, kinds, stepById } from '../core/model.js';
import * as G from '../core/geom.js';

// ---------------- đại số tuyến tính mod p ----------------
const P = 67108859; // số nguyên tố < 2^26: tích hai phần tử < 2^52 nên nhân chính xác bằng số thực
const mod = (a) => { a %= P; return a < 0 ? a + P : a; };
const mul = (a, b) => (a * b) % P;
function inv(a) {
  let [r0, r1, s0, s1] = [P, mod(a), 0, 1];
  while (r1) { const q = Math.floor(r0 / r1); [r0, r1] = [r1, r0 - q * r1]; [s0, s1] = [s1, s0 - q * s1]; }
  return mod(s0);
}

/** Hệ phương trình tuyến tính tăng dần (dạng bậc thang), mỗi hàng nhớ tổ hợp các lý do tạo ra nó. */
class AR {
  constructor() { this.index = new Map(); this.rows = new Map(); }
  v(key) { let i = this.index.get(key); if (i === undefined) { i = this.index.size; this.index.set(key, i); } return i; }
  vec(obj) {
    const m = new Map();
    for (const [k, c] of obj) { if (!c) continue; const i = this.v(k); const x = mod((m.get(i) || 0) + c); if (x) m.set(i, x); else m.delete(i); }
    return m;
  }
  reduce(vec, prov) {
    vec = new Map(vec); prov = new Map(prov);
    for (;;) {
      let best = Infinity;
      for (const i of vec.keys()) if (i < best && this.rows.has(i)) best = i;
      if (best === Infinity) return { vec, prov };
      const row = this.rows.get(best);
      const f = vec.get(best);
      for (const [i, c] of row.vec) { const x = mod((vec.get(i) || 0) - mul(f, c)); if (x) vec.set(i, x); else vec.delete(i); }
      for (const [j, c] of row.prov) { const x = mod((prov.get(j) || 0) - mul(f, c)); if (x) prov.set(j, x); else prov.delete(j); }
    }
  }
  /** Thêm phương trình (Map khoá → hệ số) với lý do reason. true nếu độc lập (mang thông tin mới). */
  add(obj, reason) {
    const { vec, prov } = this.reduce(this.vec(obj), new Map([[reason, 1]]));
    if (!vec.size) return false;
    const piv = Math.min(...vec.keys());
    const k = inv(vec.get(piv));
    const nv = new Map(), np = new Map();
    for (const [i, c] of vec) nv.set(i, mul(c, k));
    for (const [j, c] of prov) np.set(j, mul(c, k));
    this.rows.set(piv, { vec: nv, prov: np });
    return true;
  }
  /** Phương trình có suy ra được không: null, hoặc các lý do đã dùng. */
  implies(obj) {
    const { vec, prov } = this.reduce(this.vec(obj), new Map());
    if (vec.size) return null;
    return [...prov.keys()];
  }
}

// ---------------- tiện ích ----------------
const pairKey = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
const TOL = 1e-7;

export class Deducer {
  constructor(doc, { values = null, maxRounds = 6 } = {}) {
    this.doc = doc;
    this.vals = values || evaluate(doc);
    this.k = kinds(doc);
    this.maxRounds = maxRounds;
    this.facts = []; // {id, kind, text, rule, uses: [id], data}
    this.ang = new AR();
    this.len = new AR();
    this.lines = []; // {pts:Set, objs:Set, alive, rep} — nút đường thẳng
    this.lineOf = new Map(); // khoá 'o:id' (đối tượng đường thẳng) → chỉ số nút
    this.circles = []; // {pts:Set, objs:Set, center, alive}
    this.circleOf = new Map();
    this.pairVars = new Map(); // khoá cặp điểm đã dùng làm biến → [a, b]
    this.tangents = []; // {line, circle, point}
    this.reflections = []; // {x, y, line (chỉ số nút)} : y là ảnh của x qua đường
    this.pbisectors = []; // {line, a, b}
    this.diameters = []; // {circle, a, b}
    this.midpoints = []; // {m, a, b}
    this.factKey = new Map();
    this.pts = doc.steps.filter((s) => this.k.get(s.id) === 'point' && this.vals.get(s.id)).map((s) => s.id);
    let x1 = Infinity, x2 = -Infinity, y1 = Infinity, y2 = -Infinity;
    for (const p of this.pts) { const v = this.vals.get(p); x1 = Math.min(x1, v.x); x2 = Math.max(x2, v.x); y1 = Math.min(y1, v.y); y2 = Math.max(y2, v.y); }
    this.scale = Math.max(Math.hypot(x2 - x1, y2 - y1), 1e-9);
    this.e = TOL * this.scale;
  }

  name(id) { return stepById(this.doc, id)?.name || id; }
  V(id) { return this.vals.get(id); }

  // ---------- sự kiện ----------
  fact(kind, text, rule, uses = [], data = null, key = null) {
    if (key && this.factKey.has(key)) return this.factKey.get(key);
    const id = this.facts.length;
    this.facts.push({ id, kind, text, rule, uses, data });
    if (key) this.factKey.set(key, id);
    return id;
  }

  // ---------- đường thẳng ----------
  newLine(pts = [], objs = []) {
    const i = this.lines.length;
    this.lines.push({ pts: new Set(), objs: new Set(objs), alive: true, rep: i, why: new Map() });
    for (const o of objs) this.lineOf.set('o:' + o, i);
    for (const p of pts) this.lines[i].pts.add(p);
    return i;
  }
  lineRoot(i) { while (this.lines[i].rep !== i) i = this.lines[i].rep; return i; }
  /** Nút đường thẳng chứa cả a và b (đã biết), hoặc null. */
  lineThrough(a, b) {
    for (let i = 0; i < this.lines.length; i++) { const L = this.lines[i]; if (L.alive && L.pts.has(a) && L.pts.has(b)) return i; }
    return null;
  }
  /** Biến hướng cho "đường AB": của nút đường thẳng nếu đã biết, không thì biến riêng của cặp điểm. */
  dirAB(a, b) {
    const i = this.lineThrough(a, b);
    if (i !== null) return 'L' + i;
    const key = pairKey(a, b);
    this.pairVars.set(key, [a, b]);
    return 'P' + key;
  }
  dirLine(i) { return 'L' + this.lineRoot(i); }
  /** Thêm điểm p vào nút đường thẳng i (lý do: sự kiện f). */
  addToLine(i, p, f) {
    i = this.lineRoot(i);
    const L = this.lines[i];
    if (L.pts.has(p)) return false;
    // biến cặp điểm (p, q) với q đã ở trên đường: bằng hướng của đường
    for (const q of L.pts) {
      const key = pairKey(p, q);
      if (this.pairVars.has(key)) this.ang.add([['P' + key, 1], ['L' + i, -1]], f);
    }
    L.pts.add(p);
    L.why.set(p, f);
    // hai nút có chung ≥ 2 điểm: gộp
    for (let j = 0; j < this.lines.length; j++) {
      const M = this.lines[j];
      if (j === i || !M.alive || M.rep !== j) continue;
      let common = 0;
      for (const x of M.pts) if (L.pts.has(x)) common++;
      if (common >= 2) this.mergeLines(i, j, f);
    }
    return true;
  }
  mergeLines(i, j, f) {
    i = this.lineRoot(i); j = this.lineRoot(j);
    if (i === j) return;
    this.ang.add([['L' + i, 1], ['L' + j, -1]], f);
    const A = this.lines[i], B = this.lines[j];
    B.alive = false; B.rep = i;
    for (const o of B.objs) { A.objs.add(o); this.lineOf.set('o:' + o, i); }
    for (const p of B.pts) if (!A.pts.has(p)) this.addToLine(i, p, f);
  }
  lineOfObj(id) { const i = this.lineOf.get('o:' + id); return i === undefined ? null : this.lineRoot(i); }

  // ---------- đường tròn ----------
  circleOfObj(id) { const i = this.circleOf.get('o:' + id); return i === undefined ? null : this.circleRoot(i); }
  circleRoot(i) { while (this.circles[i].rep !== i) i = this.circles[i].rep; return i; }
  newCircle(objs = []) {
    const i = this.circles.length;
    this.circles.push({ pts: new Set(), objs: new Set(objs), center: null, alive: true, rep: i, why: new Map() });
    for (const o of objs) this.circleOf.set('o:' + o, i);
    return i;
  }
  /** Điểm p thuộc đường tròn i: thêm các phương trình góc nội tiếp, bán kính bằng nhau, tiếp tuyến – dây. */
  addToCircle(i, p, f) {
    i = this.circleRoot(i);
    const C = this.circles[i];
    if (C.pts.has(p)) return false;
    const old = [...C.pts];
    C.pts.add(p);
    C.why.set(p, f);
    // góc nội tiếp: với mỗi cặp (a, b) đã có và mỗi điểm q đã có: ∠(p a, p b) = ∠(q a, q b)
    if (old.length >= 3) {
      for (let x = 0; x < old.length; x++) for (let y = x + 1; y < old.length; y++) {
        const a = old[x], b = old[y];
        const q = old.find((t) => t !== a && t !== b);
        const r = this.fact('cyc', `${this.ptsName([p, a, b, q])} cùng thuộc đường tròn`, 'concyclic-angle', [f, ...[a, b, q].map((t) => C.why.get(t)).filter((z) => z !== undefined)]);
        this.ang.add([[this.dirAB(p, b), 1], [this.dirAB(p, a), -1], [this.dirAB(q, b), -1], [this.dirAB(q, a), 1]], r);
      }
      // điểm mới cũng là "q" cho các cặp có p
      for (let x = 0; x < old.length; x++) for (let y = 0; y < old.length; y++) {
        if (x === y) continue;
        const a = old[x], q = old[y];
        const others = old.filter((t) => t !== a && t !== q);
        if (!others.length) continue;
        const r0 = others[0];
        const r = this.fact('cyc', `${this.ptsName([p, a, q, r0])} cùng thuộc đường tròn`, 'concyclic-angle', [f]);
        this.ang.add([[this.dirAB(q, p), 1], [this.dirAB(q, a), -1], [this.dirAB(r0, p), -1], [this.dirAB(r0, a), 1]], r);
      }
    }
    if (C.center) this.radius(i, p, f);
    for (const t of this.tangents) if (this.circleRoot(t.circle) === i) this.tangentChord(t, f);
    for (const d of this.diameters) if (this.circleRoot(d.circle) === i) this.thales(d, p, f);
    // hai đường tròn chung ≥ 3 điểm: gộp
    for (let j = 0; j < this.circles.length; j++) {
      const M = this.circles[j];
      if (j === i || !M.alive || M.rep !== j) continue;
      let common = 0;
      for (const x of M.pts) if (C.pts.has(x)) common++;
      if (common >= 3) this.mergeCircles(i, j, f);
    }
    return true;
  }
  mergeCircles(i, j, f) {
    i = this.circleRoot(i); j = this.circleRoot(j);
    if (i === j) return;
    const A = this.circles[i], B = this.circles[j];
    B.alive = false; B.rep = i;
    for (const o of B.objs) { A.objs.add(o); this.circleOf.set('o:' + o, i); }
    if (B.center && !A.center) this.setCenter(i, B.center, f);
    for (const p of B.pts) this.addToCircle(i, p, f);
  }
  setCenter(i, O, f) {
    i = this.circleRoot(i);
    const C = this.circles[i];
    if (C.center) return;
    C.center = O;
    C.centerWhy = f;
    for (const p of C.pts) this.radius(i, p, f);
    for (const t of this.tangents) if (this.circleRoot(t.circle) === i) this.tangentRadius(t, f);
  }
  /** Toạ độ đường tròn của nút (từ đối tượng dựng, tâm, hoặc 3 điểm). */
  circleValue(i) {
    const C = this.circles[i];
    for (const o of C.objs) { const v = this.V(o); if (v && v.kind === 'circle') return v; }
    const ps = [...C.pts];
    if (C.center && ps.length) return { c: this.V(C.center), r: G.dist(this.V(C.center), this.V(ps[0])) };
    if (ps.length >= 3) return G.circleThrough(this.V(ps[0]), this.V(ps[1]), this.V(ps[2]));
    return null;
  }
  circleName(i) {
    const C = this.circles[i];
    for (const o of C.objs) { const n = stepById(this.doc, o)?.name; if (n) return n; }
    if (C.center) return `(${this.name(C.center)})`;
    return `(${[...C.pts].slice(0, 3).map((p) => this.name(p)).join('')})`;
  }
  /** Bán kính: OA = OP với A là điểm đầu tiên trên đường tròn. */
  radius(i, p, f) {
    const C = this.circles[i];
    const O = C.center;
    const a = [...C.pts].find((x) => x !== p);
    if (!a || a === O || p === O) return;
    const r = this.fact('len', `${this.name(O)}${this.name(a)} = ${this.name(O)}${this.name(p)} (bán kính)`, 'radius', [f, C.centerWhy ?? f].filter((z) => z !== undefined));
    this.len.add([['S' + pairKey(O, a), 1], ['S' + pairKey(O, p), -1]], r);
    // góc ở tâm = 2 lần góc nội tiếp: ∠(O a, O p) = 2∠(q a, q p) (mod 180°)
    for (const q of [...C.pts].filter((x) => x !== p && x !== a && x !== O).slice(0, 3)) {
      const g = this.fact('ang', `Góc ở tâm ${this.name(a)}${this.name(O)}${this.name(p)} = 2 lần góc nội tiếp ${this.name(a)}${this.name(q)}${this.name(p)}`, 'central-angle', [r]);
      this.ang.add([[this.dirAB(O, p), 1], [this.dirAB(O, a), -1], [this.dirAB(q, p), -2], [this.dirAB(q, a), 2]], g);
    }
  }
  ptsName(ids) { return ids.map((x) => this.name(x)).join(', '); }

  // ---------- tiếp tuyến ----------
  tangentChord(t, f) {
    // ∠(tiếp tuyến, TA) = ∠(BT, BA) với A, B trên đường tròn
    const C = this.circles[this.circleRoot(t.circle)];
    const others = [...C.pts].filter((x) => x !== t.point);
    if (others.length < 2) return;
    const T = t.point;
    for (let x = 0; x < Math.min(others.length, 4); x++) for (let y = 0; y < Math.min(others.length, 4); y++) {
      if (x === y) continue;
      const A = others[x], B = others[y];
      const r = this.fact('tan', `Góc tạo bởi tiếp tuyến tại ${this.name(T)} và dây ${this.name(T)}${this.name(A)}`, 'tangent-chord', [t.why, f]);
      this.ang.add([[this.dirAB(T, A), 1], [this.dirLine(t.line), -1], [this.dirAB(B, A), -1], [this.dirAB(B, T), 1]], r);
    }
  }
  tangentRadius(t, f) {
    const C = this.circles[this.circleRoot(t.circle)];
    if (!C.center || C.center === t.point) return;
    const r = this.fact('perp', `Tiếp tuyến tại ${this.name(t.point)} ⊥ bán kính ${this.name(C.center)}${this.name(t.point)}`, 'tangent-radius', [t.why, f]);
    this.ang.add([[this.dirLine(t.line), 1], [this.dirAB(C.center, t.point), -1]], r);
  }
  addTangent(line, circle, point, why) {
    const t = { line, circle, point, why };
    this.tangents.push(t);
    this.tangentChord(t, why);
    this.tangentRadius(t, why);
  }
  thales(d, p, f) {
    if (p === d.a || p === d.b) return;
    const r = this.fact('perp', `${this.name(p)}${this.name(d.a)} ⊥ ${this.name(p)}${this.name(d.b)} (góc nội tiếp chắn nửa đường tròn)`, 'thales', [d.why, f]);
    this.ang.add([[this.dirAB(p, d.a), 1], [this.dirAB(p, d.b), -1]], r);
  }

  // ---------- sự kiện cơ bản ----------
  perp(v1, v2, text, uses) { const r = this.fact('perp', text, 'premise', uses); this.ang.add([[v1, 1], [v2, -1]], r); return r; }
  par(v1, v2, text, uses) { const r = this.fact('par', text, 'premise', uses); this.ang.add([[v1, 1], [v2, -1]], r); return r; }
  eqLen(a, b, c, d, text, rule, uses) {
    const r = this.fact('len', text, rule, uses);
    this.len.add([['S' + pairKey(a, b), 1], ['S' + pairKey(c, d), -1]], r);
    return r;
  }
  /** Chọn dấu của đẳng thức góc theo hình: ∠(l1,l2) = ±∠(l3,l4) (góc thường bằng nhau). */
  angleRow(l1, l2, l3, l4, sign) { return [[l2, 1], [l1, -1], [l4, -sign], [l3, sign]]; }
  signOfEq(a1, a2) {
    // a1, a2: góc có hướng (độ) mod 180 – cùng dấu hay ngược dấu
    const m = (x) => ((x % 180) + 180) % 180;
    return Math.abs(m(a1) - m(a2)) < 1e-6 || Math.abs(Math.abs(m(a1) - m(a2)) - 180) < 1e-6 ? 1 : -1;
  }
  /** Bốn điểm đồng viên: thử ba cách chọn dây cung (dây ab nhìn từ c, d) – lấy cách suy ra được. */
  impliesCyclic(a, b, c, d) {
    for (const [x, y, u, v] of [[a, b, c, d], [a, c, b, d], [a, d, b, c], [b, c, a, d], [b, d, a, c], [c, d, a, b]]) {
      const r = this.ang.implies(this.angleRow(this.dirAB(u, x), this.dirAB(u, y), this.dirAB(v, x), this.dirAB(v, y), 1));
      if (r) return r;
    }
    return null;
  }
  /** Đảo phương tích: P = AB ∩ CD (đã biết thẳng hàng) và PA·PB = PC·PD ⇒ A, B, C, D đồng viên. */
  impliesCyclicPow(a, b, c, d) {
    for (const [x, y, u, v] of [[a, b, c, d], [a, c, b, d], [a, d, b, c]]) {
      for (const P of this.pts) {
        if ([x, y, u, v].includes(P)) continue;
        const l1 = this.lineThrough(x, y), l2 = this.lineThrough(u, v);
        if (l1 === null || l2 === null || !this.lines[this.lineRoot(l1)].pts.has(P) || !this.lines[this.lineRoot(l2)].pts.has(P)) continue;
        const r = this.len.implies(this.powRow(P, x, y, u, v));
        if (r) return r;
      }
    }
    return null;
  }
  powRow(P, A, B, C, D) { return [['S' + pairKey(P, A), 1], ['S' + pairKey(P, B), 1], ['S' + pairKey(P, C), -1], ['S' + pairKey(P, D), -1]]; }
  /** Các cát tuyến từ P tới đường tròn ci: đường thẳng (đã biết) qua P chứa ≥ 2 điểm đã biết của đường tròn. */
  secants(P, ci) {
    const C = this.circles[ci];
    const out = [];
    for (let i = 0; i < this.lines.length; i++) {
      const L = this.lines[i];
      if (!L.alive || L.rep !== i || !L.pts.has(P)) continue;
      const on = [...L.pts].filter((q) => q !== P && C.pts.has(q));
      if (on.length >= 2) out.push({ key: i, pts: on.slice(0, 2), why: [L.why.get(P), ...on.slice(0, 2).map((q) => C.why.get(q))].filter((z) => z !== undefined) });
    }
    return out;
  }
  impliesCollinear(a, b, c) {
    for (const [x, y, z] of [[a, b, c], [b, a, c], [c, a, b]]) {
      const r = this.ang.implies([[this.dirAB(x, y), 1], [this.dirAB(x, z), -1]]);
      if (r) return r;
    }
    return null;
  }
  dang(A, B, C) { const a = G.directedAngle(this.V(A), this.V(B), this.V(C)); return a == null ? 0 : a; }

  // ---------- rút sự kiện từ cách dựng ----------
  premises() {
    const nm = (x) => this.name(x);
    for (const s of this.doc.steps) {
      const v = this.V(s.id);
      if (!v) continue;
      const a = s.args;
      const kind = this.k.get(s.id);
      const P = (t) => this.fact('premise', t, 'premise', [], { step: s.id });
      switch (s.type) {
        case 'line': case 'segment': case 'ray': {
          const f = P(`${nm(a[0])}, ${nm(a[1])} thuộc ${s.name || 'đường'} (dựng)`);
          const i = this.newLine([], [s.id]);
          this.addToLine(i, a[0], f); this.addToLine(i, a[1], f);
          break;
        }
        case 'perpendicular': case 'parallel': {
          const f = P(s.type === 'perpendicular' ? `${s.name} qua ${nm(a[0])} vuông góc ${this.descLine(a[1])}` : `${s.name} qua ${nm(a[0])} song song ${this.descLine(a[1])}`);
          const i = this.newLine([], [s.id]);
          this.addToLine(i, a[0], f);
          const j = this.lineOfObj(a[1]);
          if (j !== null) this.ang.add([[this.dirLine(i), 1], [this.dirLine(j), -1]], f);
          break;
        }
        case 'perp_bisector': {
          const f = P(`${s.name} là trung trực ${nm(a[0])}${nm(a[1])}`);
          const i = this.newLine([], [s.id]);
          this.ang.add([[this.dirLine(i), 1], [this.dirAB(a[0], a[1]), -1]], f);
          this.pbisectors.push({ line: i, a: a[0], b: a[1], why: f });
          break;
        }
        case 'angle_bisector': {
          const f = P(`${s.name} là phân giác góc ${nm(a[0])}${nm(a[1])}${nm(a[2])}`);
          const i = this.newLine([], [s.id]);
          this.addToLine(i, a[1], f);
          this.ang.add([[this.dirLine(i), 2], [this.dirAB(a[1], a[0]), -1], [this.dirAB(a[1], a[2]), -1]], f);
          break;
        }
        case 'isogonal_line': {
          const f = P(`${s.name} đẳng giác với ${nm(a[1])}${nm(a[3])} trong góc ${nm(a[0])}${nm(a[1])}${nm(a[2])}`);
          const i = this.newLine([], [s.id]);
          this.addToLine(i, a[1], f);
          this.ang.add([[this.dirLine(i), 1], [this.dirAB(a[1], a[2]), -1], [this.dirAB(a[1], a[0]), -1], [this.dirAB(a[1], a[3]), 1]], f);
          break;
        }
        case 'angle_line': {
          const f = P(`${s.name} tạo với ${nm(a[0])}${nm(a[1])} góc bằng góc ${nm(a[2])}${nm(a[3])}${nm(a[4])}`);
          const i = this.newLine([], [s.id]);
          this.addToLine(i, a[0], f);
          const sg = (s.params && s.params.flip) ? -1 : 1;
          // ∠(O X, l) = ±∠(B A, B C)
          this.ang.add([[this.dirLine(i), 1], [this.dirAB(a[0], a[1]), -1], [this.dirAB(a[3], a[4]), -sg], [this.dirAB(a[3], a[2]), sg]], f);
          break;
        }
        case 'tangent_at': {
          const f = P(`${s.name} tiếp xúc ${this.name(a[0])} tại ${nm(a[1])}`);
          const i = this.newLine([], [s.id]);
          this.addToLine(i, a[1], f);
          const c = this.circleOfObj(a[0]);
          if (c !== null) this.addTangent(i, c, a[1], f);
          break;
        }
        case 'circle': case 'circle_3pts': case 'circumcircle': case 'circle_diameter': case 'circle_tangent_at': {
          const i = this.newCircle([s.id]);
          const f = P(s.type === 'circle' ? `${s.name} có tâm ${nm(a[0])}, đi qua ${nm(a[1])}` : s.type === 'circle_diameter' ? `${s.name} có đường kính ${nm(a[0])}${nm(a[1])}` : s.type === 'circle_tangent_at' ? `${s.name} qua ${nm(a[0])}, ${nm(a[2])}, tiếp xúc ${nm(a[0])}${nm(a[1])} tại ${nm(a[0])}` : `${s.name} = (${a.map(nm).join('')})`);
          if (s.type === 'circle') { this.setCenter(i, a[0], f); this.addToCircle(i, a[1], f); }
          else if (s.type === 'circle_diameter') { this.diameters.push({ circle: i, a: a[0], b: a[1], why: f }); this.addToCircle(i, a[0], f); this.addToCircle(i, a[1], f); }
          else if (s.type === 'circle_tangent_at') {
            this.addToCircle(i, a[0], f); this.addToCircle(i, a[2], f);
            const li = this.lineThrough(a[0], a[1]) ?? this.newLine([], []);
            this.addToLine(li, a[0], f); this.addToLine(li, a[1], f);
            this.addTangent(li, i, a[0], f);
          } else for (const p of a) this.addToCircle(i, p, f);
          break;
        }
        case 'incircle': case 'excircle': case 'nine_point_circle': case 'mixtilinear': case 'invert_circle': case 'circle_radius': {
          this.newCircle([s.id]);
          break;
        }
        case 'center': {
          const c = this.circleOfObj(a[0]);
          if (c !== null) this.setCenter(c, s.id, P(`${s.name} là tâm của ${this.name(a[0])}`));
          break;
        }
        case 'circumcenter': {
          const f = P(`${s.name} là tâm ngoại tiếp ${a.map(nm).join('')}`);
          const i = this.newCircle([]);
          for (const p of a) this.addToCircle(i, p, f);
          this.setCenter(i, s.id, f);
          break;
        }
        case 'orthocenter': {
          const f = P(`${s.name} là trực tâm ${a.map(nm).join('')}`);
          for (let t = 0; t < 3; t++) { const [x, y, z] = [a[t], a[(t + 1) % 3], a[(t + 2) % 3]]; this.ang.add([[this.dirAB(x, s.id), 1], [this.dirAB(y, z), -1]], f); }
          break;
        }
        case 'incenter': case 'excenter': {
          const f = P(`${s.name} là tâm ${s.type === 'incenter' ? 'nội' : 'bàng'} tiếp ${a.map(nm).join('')}`);
          for (let t = 0; t < 3; t++) { const [x, y, z] = [a[t], a[(t + 1) % 3], a[(t + 2) % 3]]; this.ang.add([[this.dirAB(x, s.id), 2], [this.dirAB(x, y), -1], [this.dirAB(x, z), -1]], f); }
          break;
        }
        case 'altitude_foot': case 'foot': {
          // altitude_foot(A,B,C): chân đường cao từ A xuống BC; foot(P,A,B): chân đường vuông góc từ P xuống AB
          const [p, x, y] = a;
          const f = P(`${s.name} là chân đường vuông góc từ ${nm(p)} xuống ${nm(x)}${nm(y)}`);
          const li = this.lineThrough(x, y) ?? this.newLine([], []);
          this.addToLine(li, x, f); this.addToLine(li, y, f); this.addToLine(li, s.id, f);
          this.ang.add([[this.dirAB(p, s.id), 1], [this.dirLine(li), -1]], f);
          break;
        }
        case 'projection': {
          const f = P(`${s.name} là hình chiếu của ${nm(a[0])} lên ${this.descLine(a[1])}`);
          const li = this.lineOfObj(a[1]);
          if (li !== null) { this.addToLine(li, s.id, f); this.ang.add([[this.dirAB(a[0], s.id), 1], [this.dirLine(li), -1]], f); }
          break;
        }
        case 'midpoint': {
          const f = P(`${s.name} là trung điểm ${nm(a[0])}${nm(a[1])}`);
          const li = this.lineThrough(a[0], a[1]) ?? this.newLine([], []);
          this.addToLine(li, a[0], f); this.addToLine(li, a[1], f); this.addToLine(li, s.id, f);
          this.len.add([['S' + pairKey(a[0], s.id), 1], ['S' + pairKey(s.id, a[1]), -1]], f);
          // đường tròn đường kính AB (tâm là trung điểm): điểm nhìn AB dưới góc vuông nằm trên nó
          const ci = this.newCircle([]);
          this.setCenter(ci, s.id, f);
          this.addToCircle(ci, a[0], f); this.addToCircle(ci, a[1], f);
          this.diameters.push({ circle: ci, a: a[0], b: a[1], why: f });
          this.midpoints.push({ m: s.id, a: a[0], b: a[1], why: f });
          break;
        }
        case 'reflect': case 'reflect_pts': {
          if (kind !== 'point') break;
          if (s.type === 'reflect_pts' || this.k.get(a[1]) === 'line') {
            const f = P(`${s.name} đối xứng ${nm(a[0])} qua ${s.type === 'reflect_pts' ? nm(a[1]) + nm(a[2]) : this.descLine(a[1])}`);
            let li = s.type === 'reflect_pts' ? this.lineThrough(a[1], a[2]) : this.lineOfObj(a[1]);
            if (li === null && s.type === 'reflect_pts') { li = this.newLine([], []); this.addToLine(li, a[1], f); this.addToLine(li, a[2], f); }
            if (li === null) break;
            this.ang.add([[this.dirAB(a[0], s.id), 1], [this.dirLine(li), -1]], f);
            this.reflections.push({ x: a[0], y: s.id, line: li, why: f });
          } else {
            const f = P(`${s.name} đối xứng ${nm(a[0])} qua ${nm(a[1])}`);
            const li = this.lineThrough(a[0], s.id) ?? this.newLine([], []);
            this.addToLine(li, a[0], f); this.addToLine(li, a[1], f); this.addToLine(li, s.id, f);
            this.len.add([['S' + pairKey(a[0], a[1]), 1], ['S' + pairKey(a[1], s.id), -1]], f);
          }
          break;
        }
        case 'rotate': case 'rotate_by': case 'homothety': case 'homothety_by': case 'spiral': case 'translate': {
          if (kind !== 'point') break;
          const X = a[0], O = a[1];
          const S2 = (p, q) => 'S' + pairKey(p, q);
          if (s.type === 'translate') {
            const f = P(`${s.name} là ảnh của ${nm(X)} qua phép tịnh tiến theo ${nm(a[1])}${nm(a[2])}`);
            this.ang.add([[this.dirAB(X, s.id), 1], [this.dirAB(a[1], a[2]), -1]], f);
            this.len.add([[S2(X, s.id), 1], [S2(a[1], a[2]), -1]], f);
            break;
          }
          const f = P(`${s.name} là ảnh của ${nm(X)} qua phép ${s.type.startsWith('rotate') ? 'quay' : s.type.startsWith('homothety') ? 'vị tự' : 'đồng dạng'} tâm ${nm(O)}`);
          if (s.type === 'rotate' || s.type === 'rotate_by') {
            this.len.add([[S2(O, X), 1], [S2(O, s.id), -1]], f);
            if (s.type === 'rotate_by') this.ang.add([[this.dirAB(O, s.id), 1], [this.dirAB(O, X), -1], [this.dirAB(a[3], a[4]), -1], [this.dirAB(a[3], a[2]), 1]], f);
            else this.ang.add([[this.dirAB(O, s.id), 1], [this.dirAB(O, X), -1]], f); // góc quay cố định
          } else if (s.type === 'homothety' || s.type === 'homothety_by') {
            const li = this.lineThrough(O, X) ?? this.newLine([], []);
            this.addToLine(li, O, f); this.addToLine(li, X, f); this.addToLine(li, s.id, f);
            if (s.type === 'homothety_by') this.len.add([[S2(O, s.id), 1], [S2(O, X), -1], [S2(a[2], a[3]), -1], [S2(a[4], a[5]), 1]], f);
            else this.len.add([[S2(O, s.id), 1], [S2(O, X), -1]], f); // tỉ số cố định
          } else {
            // spiral(X, O, A, B): quay góc AOB, vị tự tỉ số OB/OA
            this.ang.add([[this.dirAB(O, s.id), 1], [this.dirAB(O, X), -1], [this.dirAB(O, a[3]), -1], [this.dirAB(O, a[2]), 1]], f);
            this.len.add([[S2(O, s.id), 1], [S2(O, X), -1], [S2(O, a[3]), -1], [S2(O, a[2]), 1]], f);
          }
          break;
        }
        case 'point_on': case 'fixed_point': case 'intersection': case 'intersection_other': case 'tangent_point': case 'angle_point': case 'incircle_touch': case 'arc_midpoint': case 'symmedian_foot': case 'cevian_foot': case 'solve_point':
          this.pointFacts(s);
          break;
        default: break;
      }
    }
  }

  descLine(id) { return stepById(this.doc, id)?.name || id; }

  /** Điểm thuộc đường thẳng / đường tròn theo cách dựng (và vài sự kiện góc kèm theo). */
  pointFacts(s) {
    const nm = (x) => this.name(x);
    const a = s.args;
    const onObj = (obj, f) => {
      const li = this.lineOfObj(obj);
      if (li !== null) return this.addToLine(li, s.id, f);
      const ci = this.circleOfObj(obj);
      if (ci !== null) return this.addToCircle(ci, s.id, f);
      return false;
    };
    const P = (t) => this.fact('premise', t, 'premise', [], { step: s.id });
    if (s.type === 'point_on' || s.type === 'fixed_point') onObj(a[0], P(`${s.name} thuộc ${this.descLine(a[0])}`));
    else if (s.type === 'intersection' || s.type === 'intersection_other') { const f = P(`${s.name} là giao điểm của ${this.descLine(a[0])} và ${this.descLine(a[1])}`); onObj(a[0], f); onObj(a[1], f); }
    else if (s.type === 'tangent_point') {
      const f = P(`${s.name} là tiếp điểm của tiếp tuyến kẻ từ ${nm(a[1])} tới ${this.descLine(a[0])}`);
      onObj(a[0], f);
      const ci = this.circleOfObj(a[0]);
      if (ci !== null) { const li = this.newLine([], []); this.addToLine(li, a[1], f); this.addToLine(li, s.id, f); this.addTangent(li, ci, s.id, f); }
    } else if (s.type === 'angle_point') {
      const f = P(`${s.name} thuộc ${this.descLine(a[5])}, ∠(${nm(a[0])}${nm(a[1])}, ${nm(a[0])}${s.name}) = ∠${nm(a[2])}${nm(a[3])}${nm(a[4])}`);
      onObj(a[5], f);
      const sg = (s.params && s.params.flip) ? -1 : 1;
      this.ang.add([[this.dirAB(a[0], s.id), 1], [this.dirAB(a[0], a[1]), -1], [this.dirAB(a[3], a[4]), -sg], [this.dirAB(a[3], a[2]), sg]], f);
    } else if (s.type === 'incircle_touch') {
      const f = P(`${s.name} là tiếp điểm của đường tròn nội tiếp trên ${nm(a[1])}${nm(a[2])}`);
      const li = this.lineThrough(a[1], a[2]) ?? this.newLine([], []);
      this.addToLine(li, a[1], f); this.addToLine(li, a[2], f); this.addToLine(li, s.id, f);
      const I = this.doc.steps.find((x) => x.type === 'incenter' && x.args.join() === a.join())?.id || this.centerOfType('incircle', a);
      if (I) this.ang.add([[this.dirAB(I, s.id), 1], [this.dirLine(li), -1]], f);
    } else if (s.type === 'arc_midpoint') {
      const f = P(`${s.name} là điểm chính giữa cung ${nm(a[1])}${nm(a[2])}${s.params && s.params.contains ? ' chứa' : ' không chứa'} ${nm(a[0])}`);
      let ci = this.circles.findIndex((C) => C.alive && a.every((p) => C.pts.has(p)));
      if (ci < 0) { ci = this.newCircle([]); for (const p of a) this.addToCircle(ci, p, f); }
      this.addToCircle(ci, s.id, f);
      this.len.add([['S' + pairKey(s.id, a[1]), 1], ['S' + pairKey(s.id, a[2]), -1]], f);
    } else if (s.type === 'symmedian_foot' || s.type === 'cevian_foot') {
      const f = P(`${s.name} thuộc ${nm(a[a.length - 2])}${nm(a[a.length - 1])}`);
      const [x, y] = a.slice(-2);
      const li = this.lineThrough(x, y) ?? this.newLine([], []);
      this.addToLine(li, x, f); this.addToLine(li, y, f); this.addToLine(li, s.id, f);
    } else if (s.type === 'solve_point') {
      const conds = (s.params && s.params.conds) || [];
      const g = (i) => (i < 0 ? s.id : a[i]);
      for (const c of conds) {
        if (c.t === 'on') onObj(a[c.a[0]], P(`${s.name} thuộc ${this.descLine(a[c.a[0]])}`));
        else if (c.t === 'len') this.eqLen(g(c.a[0]), g(c.a[1]), g(c.a[2]), g(c.a[3]), `${nm(g(c.a[0]))}${nm(g(c.a[1]))} = ${nm(g(c.a[2]))}${nm(g(c.a[3]))} (điều kiện)`, 'premise', []);
        else if (c.t === 'ang') {
          const [p1, p2, p3, q1, q2, q3] = c.a.map(g);
          const f = P(`∠${nm(p1)}${nm(p2)}${nm(p3)} = ∠${nm(q1)}${nm(q2)}${nm(q3)} (điều kiện)`);
          const sg = this.signOfEq(this.dang(p1, p2, p3), this.dang(q1, q2, q3));
          this.ang.add(this.angleRow(this.dirAB(p2, p1), this.dirAB(p2, p3), this.dirAB(q2, q1), this.dirAB(q2, q3), sg), f);
        } else if (c.t === 'angv') {
          const [p1, p2, p3] = c.a.map(g);
          const f = P(`∠${nm(p1)}${nm(p2)}${nm(p3)} = ${c.v}° (điều kiện)`);
          this.ang.add([[this.dirAB(p2, p3), 1], [this.dirAB(p2, p1), -1]], f);
        }
      }
    }
  }
  centerOfType(type, args) {
    const c = this.doc.steps.find((x) => x.type === type && x.args.join() === args.join());
    if (!c) return null;
    return this.doc.steps.find((x) => x.type === 'center' && x.args[0] === c.id)?.id || null;
  }

  // ---------- vòng suy luận có số dẫn đường ----------
  numericCandidates() {
    const V = (p) => this.V(p);
    const e = this.e;
    const pts = this.pts;
    // thẳng hàng: nhóm điểm theo đường qua từng cặp
    const lines = new Map();
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
      const A = V(pts[i]), B = V(pts[j]);
      if (G.dist(A, B) < e) continue;
      const set = [pts[i], pts[j]];
      for (let k = j + 1; k < pts.length; k++) { const C = V(pts[k]); if (Math.abs(G.cross(G.sub(B, A), G.sub(C, A))) / G.dist(A, B) < e && G.dist(C, A) > e && G.dist(C, B) > e) set.push(pts[k]); }
      if (set.length >= 3) { const key = [...set].sort().join(','); if (!lines.has(key)) lines.set(key, set); }
    }
    // đồng viên: đường tròn qua bộ ba, gộp theo (tâm, bán kính)
    const circles = new Map();
    const lim = Math.min(pts.length, 40);
    for (let i = 0; i < lim; i++) for (let j = i + 1; j < lim; j++) for (let k = j + 1; k < lim; k++) {
      const c = G.circleThrough(V(pts[i]), V(pts[j]), V(pts[k]));
      if (!c || c.r > 50 * this.scale) continue;
      const set = [pts[i], pts[j], pts[k]];
      for (let m = k + 1; m < lim; m++) if (Math.abs(G.dist(V(pts[m]), c.c) - c.r) < e && ![pts[i], pts[j], pts[k]].some((q) => G.dist(V(q), V(pts[m])) < e)) set.push(pts[m]);
      if (set.length >= 4) { const key = [...set].sort().join(','); if (![...circles.keys()].some((kk) => set.every((x) => kk.split(',').includes(x)))) circles.set(key, set); }
    }
    // cân: XA = XB
    const iso = [];
    for (const X of pts) {
      const d = pts.filter((p) => p !== X).map((p) => [p, G.dist(V(p), V(X))]).filter(([, r]) => r > e).sort((x, y) => x[1] - y[1]);
      for (let i = 0; i + 1 < d.length; i++) for (let j = i + 1; j < d.length && d[j][1] - d[i][1] < e; j++) iso.push([X, d[i][0], d[j][0]]);
    }
    // tam giác đồng dạng: chữ ký = các góc (có hướng) – chỉ các tam giác có ít nhất hai cạnh nằm trên đường đã biết
    const similar = [], simSign = new Map();
    const tris = [];
    const lim2 = Math.min(pts.length, 24);
    for (let i = 0; i < lim2; i++) for (let j = 0; j < lim2; j++) for (let k = 0; k < lim2; k++) {
      if (i === j || j === k || i === k) continue;
      const [A, B, C] = [pts[i], pts[j], pts[k]].map(V);
      const area = G.cross(G.sub(B, A), G.sub(C, A));
      if (Math.abs(area) < 1e-6 * this.scale * this.scale) continue;
      const ga = G.directedAngle(B, A, C), gb = G.directedAngle(A, B, C);
      tris.push({ t: [pts[i], pts[j], pts[k]], key: `${Math.round(Math.abs(ga) * 1e5)}|${Math.round(Math.abs(gb) * 1e5)}`, s: Math.sign(area) });
    }
    const byKey = new Map();
    for (const T of tris) { if (!byKey.has(T.key)) byKey.set(T.key, []); byKey.get(T.key).push(T); }
    for (const list of byKey.values()) {
      if (list.length < 2 || list.length > 12) continue;
      for (let x = 0; x < list.length; x++) for (let y = x + 1; y < list.length; y++) {
        const T1 = list[x].t, T2 = list[y].t;
        if (T1.every((p) => T2.includes(p))) continue;
        const key = `sim:${T1.join()}:${T2.join()}`;
        simSign.set(key, list[x].s === list[y].s ? 1 : -1);
        similar.push([T1, T2]);
      }
    }
    return { lines: [...lines.values()], circles: [...circles.values()], iso, similar: similar.slice(0, 400), simSign };
  }

  run() {
    this.premises();
    const cand = this.numericCandidates();
    for (let round = 0; round < this.maxRounds; round++) {
      let changed = false;
      // phản xạ, trung trực: điểm trên trục cách đều hai điểm đối xứng
      for (const R of this.reflections) for (const X of this.lines[this.lineRoot(R.line)].pts) {
        const key = `refl:${X}:${R.x}:${R.y}`;
        if (this.factKey.has(key)) continue;
        const f = this.fact('len', `${this.name(X)}${this.name(R.x)} = ${this.name(X)}${this.name(R.y)} (đối xứng)`, 'reflect-len', [R.why], null, key);
        this.len.add([['S' + pairKey(X, R.x), 1], ['S' + pairKey(X, R.y), -1]], f);
        changed = true;
      }
      for (const B of this.pbisectors) for (const X of this.lines[this.lineRoot(B.line)].pts) {
        const key = `pb:${X}:${B.a}:${B.b}`;
        if (this.factKey.has(key)) continue;
        const f = this.fact('len', `${this.name(X)}${this.name(B.a)} = ${this.name(X)}${this.name(B.b)} (${this.name(X)} thuộc trung trực)`, 'pbisector-len', [B.why], null, key);
        this.len.add([['S' + pairKey(X, B.a), 1], ['S' + pairKey(X, B.b), -1]], f);
        changed = true;
      }
      // điểm cách tâm một bán kính ⇒ thuộc đường tròn; điểm nhìn đường kính dưới góc vuông ⇒ thuộc đường tròn
      for (let ci = 0; ci < this.circles.length; ci++) {
        const C = this.circles[ci];
        if (!C.alive || C.rep !== ci || C.pts.size < 1) continue;
        const cv = this.circleValue(ci);
        if (!cv) continue;
        for (const X of this.pts) {
          if (C.pts.has(X) || X === C.center || Math.abs(G.dist(this.V(X), cv.c) - cv.r) > this.e) continue;
          let uses = null, how = '';
          if (C.center) {
            const A = [...C.pts][0];
            uses = this.len.implies([['S' + pairKey(C.center, X), 1], ['S' + pairKey(C.center, A), -1]]);
            how = `${this.name(C.center)}${this.name(X)} = ${this.name(C.center)}${this.name(A)}`;
          }
          if (!uses) for (const d of this.diameters) {
            if (this.circleRoot(d.circle) !== ci || X === d.a || X === d.b) continue;
            uses = this.ang.implies([[this.dirAB(X, d.a), 1], [this.dirAB(X, d.b), -1]]);
            if (uses) { uses = [...uses, d.why]; how = `∠${this.name(d.a)}${this.name(X)}${this.name(d.b)} = 90°`; break; }
          }
          if (!uses) continue;
          const f = this.fact('cyc', `${this.name(X)} thuộc đường tròn ${this.circleName(ci)} (vì ${how})`, 'radius-circle', uses);
          this.addToCircle(ci, X, f);
          changed = true;
        }
      }
      // đường kính: tâm nằm giữa hai điểm của đường tròn ⇒ góc nội tiếp chắn nửa đường tròn
      for (let ci = 0; ci < this.circles.length; ci++) {
        const C = this.circles[ci];
        if (!C.alive || C.rep !== ci || !C.center) continue;
        const ps = [...C.pts];
        for (let x = 0; x < ps.length; x++) for (let y = x + 1; y < ps.length; y++) {
          const li = this.lineThrough(ps[x], C.center);
          if (li === null || !this.lines[this.lineRoot(li)].pts.has(ps[y])) continue;
          if (this.diameters.some((d) => this.circleRoot(d.circle) === ci && new Set([d.a, d.b, ps[x], ps[y]]).size === 2)) continue;
          const f = this.fact('diam', `${this.name(ps[x])}${this.name(ps[y])} là đường kính của ${this.circleName(ci)}`, 'diameter', [C.why.get(ps[x]), C.why.get(ps[y]), this.lines[this.lineRoot(li)].why.get(ps[y])].filter((z) => z !== undefined));
          const d = { circle: ci, a: ps[x], b: ps[y], why: f };
          this.diameters.push(d);
          for (const q of ps) this.thales(d, q, f);
          changed = true;
        }
      }
      // tam giác đồng dạng (góc – góc) ⇒ tỉ số cạnh
      for (const [T1, T2] of cand.similar) {
        const key = `sim:${T1.join()}:${T2.join()}`;
        if (this.factKey.has(key)) continue;
        const [a, b, c] = T1, [x, y, z] = T2;
        const sg = cand.simSign.get(key);
        const u1 = this.ang.implies(this.angleRow(this.dirAB(a, b), this.dirAB(a, c), this.dirAB(x, y), this.dirAB(x, z), sg));
        const u2 = u1 && this.ang.implies(this.angleRow(this.dirAB(b, a), this.dirAB(b, c), this.dirAB(y, x), this.dirAB(y, z), sg));
        if (!u2) continue;
        const nm = (t) => t.map((q) => this.name(q)).join('');
        const f = this.fact('sim', `Tam giác ${nm(T1)} đồng dạng tam giác ${nm(T2)} (góc – góc)`, 'similar-aa', [...u1, ...u2], null, key);
        const S = (p, q) => 'S' + pairKey(p, q);
        this.len.add([[S(a, b), 1], [S(x, y), -1], [S(b, c), -1], [S(y, z), 1]], f);
        this.len.add([[S(a, b), 1], [S(x, y), -1], [S(a, c), -1], [S(x, z), 1]], f);
        changed = true;
      }
      // trung điểm M của AB, X cách đều A, B (vd tâm đường tròn qua A, B) ⇒ XM ⊥ AB
      for (const m of this.midpoints) for (const X of this.pts) {
        if (X === m.m || X === m.a || X === m.b) continue;
        const key = `mperp:${X}:${m.m}`;
        if (this.factKey.has(key) || Math.abs(G.dist(this.V(X), this.V(m.a)) - G.dist(this.V(X), this.V(m.b))) > this.e) continue;
        const u = this.len.implies([['S' + pairKey(X, m.a), 1], ['S' + pairKey(X, m.b), -1]]);
        if (!u) continue;
        const f = this.fact('perp', `${this.name(X)} cách đều ${this.name(m.a)}, ${this.name(m.b)} nên ${this.name(X)}${this.name(m.m)} ⊥ ${this.name(m.a)}${this.name(m.b)}`, 'equidistant-perp', [...u, m.why], null, key);
        this.ang.add([[this.dirAB(X, m.m), 1], [this.dirAB(m.a, m.b), -1]], f);
        changed = true;
      }
      // phương tích: P nằm trên hai cát tuyến PAB, PCD của cùng một đường tròn ⇒ PA·PB = PC·PD
      for (let ci = 0; ci < this.circles.length; ci++) {
        const C = this.circles[ci];
        if (!C.alive || C.rep !== ci || C.pts.size < 3) continue;
        for (const P of this.pts) {
          if (C.pts.has(P)) continue;
          const sec = this.secants(P, ci);
          for (let x = 1; x < sec.length; x++) {
            const key = `pow:${ci}:${P}:${sec[0].key}:${sec[x].key}`;
            if (this.factKey.has(key)) continue;
            const [A, B] = sec[0].pts, [Cc, D] = sec[x].pts;
            const f = this.fact('pow', `${this.name(P)}${this.name(A)}·${this.name(P)}${this.name(B)} = ${this.name(P)}${this.name(Cc)}·${this.name(P)}${this.name(D)} (phương tích của ${this.name(P)} với ${this.circleName(ci)})`, 'power', [...sec[0].why, ...sec[x].why], null, key);
            this.len.add(this.powRow(P, A, B, Cc, D), f);
            changed = true;
          }
        }
      }
      // trục đẳng phương: W, Z chung của hai đường tròn; P có cùng phương tích với hai đường tròn ⇒ P, W, Z thẳng hàng
      for (const set of cand.lines) for (const P of set) {
        for (let i = 0; i < this.circles.length; i++) for (let j = i + 1; j < this.circles.length; j++) {
          const C1 = this.circles[i], C2 = this.circles[j];
          if (!C1.alive || C1.rep !== i || !C2.alive || C2.rep !== j || C1.pts.has(P) || C2.pts.has(P)) continue;
          const common = set.filter((q) => q !== P && C1.pts.has(q) && C2.pts.has(q));
          if (common.length < 2) continue;
          const [W, Z] = common;
          const li = this.lineThrough(W, Z);
          if (li !== null && this.lines[this.lineRoot(li)].pts.has(P)) continue;
          const s1 = this.secants(P, i), s2 = this.secants(P, j);
          let uses = null;
          for (const a of s1) { for (const b of s2) { uses = this.len.implies(this.powRow(P, a.pts[0], a.pts[1], b.pts[0], b.pts[1])); if (uses) break; } if (uses) break; }
          if (!uses) continue;
          const f = this.fact('col', `${this.name(P)} có cùng phương tích với ${this.circleName(i)} và ${this.circleName(j)} nên nằm trên trục đẳng phương ${this.name(W)}${this.name(Z)}`, 'radical-axis', uses);
          let L = this.lineThrough(W, Z);
          if (L === null) { L = this.newLine([], []); this.addToLine(L, W, f); this.addToLine(L, Z, f); }
          this.addToLine(L, P, f);
          changed = true;
        }
      }
      // thẳng hàng
      for (const set of cand.lines) {
        const [A, B] = set;
        for (const C of set.slice(2)) {
          if (this.lineThrough(A, B) !== null && this.lineThrough(A, C) !== null && this.lineRoot(this.lineThrough(A, B)) === this.lineRoot(this.lineThrough(A, C))) continue;
          const uses = this.impliesCollinear(A, B, C);
          if (!uses) continue;
          const f = this.fact('col', `${this.ptsName([A, B, C])} thẳng hàng`, 'angle-collinear', uses, { pts: [A, B, C] });
          let li = this.lineThrough(A, B);
          if (li === null) { li = this.newLine([], []); this.addToLine(li, A, f); this.addToLine(li, B, f); }
          this.addToLine(li, C, f);
          changed = true;
        }
      }
      // đồng viên
      for (const set of cand.circles) {
        let ci = this.circles.findIndex((C) => C.alive && C.rep === this.circles.indexOf(C) && set.filter((p) => C.pts.has(p)).length >= 3);
        if (ci >= 0 && set.every((p) => this.circles[ci].pts.has(p))) continue;
        const [A, B, C3] = ci >= 0 ? set.filter((p) => this.circles[ci].pts.has(p)) : set;
        for (const D of set) {
          if ([A, B, C3].includes(D) || (ci >= 0 && this.circles[ci].pts.has(D))) continue;
          // góc nội tiếp (có hướng, mod 180°): ∠(C A, C B) = ∠(D A, D B); hoặc đảo của phương tích
          const uses = this.impliesCyclic(A, B, C3, D) || this.impliesCyclicPow(A, B, C3, D);
          if (!uses) continue;
          const f = this.fact('cyc', `${this.ptsName([A, B, C3, D])} cùng thuộc một đường tròn`, 'angle-concyclic', uses, { pts: [A, B, C3, D], seg: [A, B], at: [C3, D] });
          if (ci < 0) { ci = this.newCircle([]); for (const p of [A, B, C3]) this.addToCircle(ci, p, f); }
          this.addToCircle(ci, D, f);
          changed = true;
        }
      }
      // cân: góc đáy bằng nhau ⇔ hai cạnh bên bằng nhau
      for (const [X, A, B] of cand.iso) {
        const keyL = `isoL:${X}:${pairKey(A, B)}`, keyA = `isoA:${X}:${pairKey(A, B)}`;
        const lenRow = [['S' + pairKey(X, A), 1], ['S' + pairKey(X, B), -1]];
        const angRow = [[this.dirAB(A, X), 1], [this.dirAB(B, X), 1], [this.dirAB(A, B), -2]];
        if (Math.abs(G.cross(G.sub(this.V(A), this.V(X)), G.sub(this.V(B), this.V(X)))) < this.e * this.scale) continue; // thẳng hàng (trung điểm)
        if (!this.factKey.has(keyA)) {
          const u = this.len.implies(lenRow);
          if (u) { const f = this.fact('ang', `Tam giác ${this.name(X)}${this.name(A)}${this.name(B)} cân tại ${this.name(X)} nên ∠${this.name(X)}${this.name(A)}${this.name(B)} = ∠${this.name(X)}${this.name(B)}${this.name(A)}`, 'isosceles-angle', u, null, keyA); this.ang.add(angRow, f); changed = true; }
        }
        if (!this.factKey.has(keyL) && !this.factKey.has(keyA)) {
          const u = this.ang.implies(angRow);
          if (u) { const f = this.fact('len', `∠${this.name(X)}${this.name(A)}${this.name(B)} = ∠${this.name(X)}${this.name(B)}${this.name(A)} nên ${this.name(X)}${this.name(A)} = ${this.name(X)}${this.name(B)}`, 'angle-isosceles', u, null, keyL); this.len.add(lenRow, f); changed = true; }
        }
      }
      if (!changed) break;
    }
    return this;
  }

  // ---------- chứng minh một nhận định (check.js) ----------
  prove(claim) {
    const ids = claim.ids;
    const ex = (uses) => (uses ? { status: 'proved', uses } : { status: 'unproved' });
    const lineVar = (id) => { const i = this.lineOfObj(id); return i === null ? null : this.dirLine(i); };
    switch (claim.type) {
      case 'collinear': {
        const [A, B, C] = ids;
        const i = this.lineThrough(A, B);
        if (i !== null && this.lines[this.lineRoot(i)].pts.has(C)) { const L = this.lines[this.lineRoot(i)]; return { status: 'proved', uses: [A, B, C].map((p) => L.why.get(p)).filter((x) => x !== undefined), known: true }; }
        return ex(this.impliesCollinear(A, B, C));
      }
      case 'concyclic': {
        const [A, B, C, D] = ids;
        const K0 = this.circles.find((K) => K.alive && ids.every((p) => K.pts.has(p)));
        if (K0) return { status: 'proved', uses: ids.map((p) => K0.why.get(p)).filter((x) => x !== undefined), known: true };
        return ex(this.impliesCyclic(A, B, C, D));
      }
      case 'on_line': {
        const [X, l] = ids;
        const li = this.lineOfObj(l);
        if (li === null) return { status: 'unsupported' };
        const L = this.lines[li];
        if (L.pts.has(X)) return { status: 'proved', uses: [L.why.get(X)].filter((x) => x !== undefined), known: true };
        for (const Q of [...L.pts].filter((p) => p !== X)) {
          const u = this.ang.implies([[this.dirAB(X, Q), 1], [this.dirLine(li), -1]]);
          if (u) return { status: 'proved', uses: u };
        }
        return { status: 'unproved' };
      }
      case 'on_circle': {
        const [X, c] = ids;
        const ci = this.circleOfObj(c);
        if (ci === null) return { status: 'unsupported' };
        const K = this.circles[ci];
        if (K.pts.has(X)) return { status: 'proved', uses: [K.why.get(X)].filter((x) => x !== undefined), known: true };
        const pts = [...K.pts].filter((p) => p !== X);
        for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) for (let m = j + 1; m < pts.length; m++) {
          const u = this.impliesCyclic(pts[i], pts[j], pts[m], X);
          if (u) return { status: 'proved', uses: u };
        }
        if (K.center && pts.length) return ex(this.len.implies([['S' + pairKey(K.center, X), 1], ['S' + pairKey(K.center, pts[0]), -1]]));
        return { status: 'unproved' };
      }
      case 'parallel': case 'perpendicular': {
        const [a, b] = ids.map(lineVar);
        if (!a || !b) return { status: 'unsupported' };
        return ex(this.ang.implies([[a, 1], [b, -1]]));
      }
      case 'equal_angle': case 'sup_angle': {
        const [p1, p2, p3, q1, q2, q3] = ids;
        // góc thường bằng nhau / bù nhau ⇔ góc có hướng bằng nhau hoặc đối nhau (mod 180°) – chọn theo hình
        const sg = this.signOfEq(this.dang(p1, p2, p3), this.dang(q1, q2, q3));
        return ex(this.ang.implies(this.angleRow(this.dirAB(p2, p1), this.dirAB(p2, p3), this.dirAB(q2, q1), this.dirAB(q2, q3), sg)));
      }
      case 'equal_len': {
        const [A, B, C, D] = ids;
        return ex(this.len.implies([['S' + pairKey(A, B), 1], ['S' + pairKey(C, D), -1]]));
      }
      case 'tangent': {
        // đường thẳng tiếp xúc đường tròn tại một điểm có trên hình: góc tạo bởi tiếp tuyến và dây
        const [l, c] = ids;
        const li = this.lineOfObj(l), ci = this.circleOfObj(c);
        if (li === null || ci === null || this.k.get(l) !== 'line') return { status: 'unsupported' };
        const K = this.circles[ci];
        const T = [...this.lines[li].pts].find((p) => K.pts.has(p));
        if (!T) return { status: 'unsupported' };
        const others = [...K.pts].filter((p) => p !== T);
        if (others.length < 2) return { status: 'unsupported' };
        const [A, B] = others;
        return ex(this.ang.implies([[this.dirAB(T, A), 1], [this.dirLine(li), -1], [this.dirAB(B, A), -1], [this.dirAB(B, T), 1]]));
      }
      default: return { status: 'unsupported' };
    }
  }

  /** Các bước chứng minh (sự kiện suy ra, theo thứ tự dùng) từ danh sách lý do – để hiển thị. */
  explain(uses, maxSteps = 40) {
    const seen = new Set(), order = [];
    const visit = (id) => {
      if (seen.has(id) || order.length > maxSteps) return;
      seen.add(id);
      const f = this.facts[id];
      for (const u of f.uses) visit(u);
      order.push(f);
    };
    for (const u of uses) visit(u);
    const premises = order.filter((f) => f.rule === 'premise');
    const derived = order.filter((f) => f.rule !== 'premise' && f.rule !== 'concyclic-angle');
    const uniq = (arr) => arr.filter((x, i) => arr.findIndex((y) => y.text === x.text) === i);
    return { premises: [...new Set(premises.map((f) => f.text))], steps: uniq(derived).map((f) => ({ text: f.text, rule: f.rule })) };
  }
}

/** Tiện dụng: chứng minh một nhận định trên hình (dựng bộ máy rồi hỏi). */
export function proveClaim(doc, claim, opts) {
  const D = new Deducer(doc, opts).run();
  const r = D.prove(claim);
  return { ...r, explain: r.status === 'proved' ? D.explain(r.uses || []) : null, deducer: D };
}
