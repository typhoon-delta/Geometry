// "Kiến thức hiển nhiên" rút ra từ chính cách dựng: dùng để loại các quan hệ tầm thường khỏi kết quả khám phá.
//
// Mỗi bước dựng khai báo các sự kiện (xem STEP_TYPES[...].facts). Ở đây ta gom chúng thành:
//   - các THỰC THỂ ĐƯỜNG THẲNG (tập điểm thuộc nó + các đối tượng đường thẳng trùng với nó)
//   - các THỰC THỂ ĐƯỜNG TRÒN
//   - lớp phương (song song) và cặp lớp vuông góc
// rồi áp dụng vài luật suy diễn đơn giản đến khi ổn định:
//   L1  hai đường có chung ≥ 2 điểm  → trùng nhau
//   L2  hai đường cùng phương, có chung 1 điểm → trùng nhau
//   L3  hai lớp cùng vuông góc với một lớp → song song
//   C1  hai đường tròn có chung ≥ 3 điểm → trùng nhau
// Đây KHÔNG phải bộ chứng minh: chỉ đủ để nhận ra những gì "thấy ngay" từ định nghĩa các bước.

import { STEP_TYPES } from '../core/steps.js';
import { kinds } from '../core/model.js';

class UF {
  constructor() { this.p = new Map(); }
  find(x) {
    if (!this.p.has(x)) this.p.set(x, x);
    let r = x;
    while (this.p.get(r) !== r) r = this.p.get(r);
    while (this.p.get(x) !== r) { const n = this.p.get(x); this.p.set(x, r); x = n; }
    return r;
  }
  union(a, b) { const ra = this.find(a), rb = this.find(b); if (ra !== rb) this.p.set(ra, rb); return ra !== rb; }
}

export class Knowledge {
  /**
   * @param doc  tài liệu
   * @param rep  hàm id điểm → id đại diện (các điểm luôn trùng nhau gộp làm một)
   */
  constructor(doc, rep = (x) => x) {
    this.rep = rep;
    this.lines = []; // {pts:Set, objs:Set, tags:Set, alive:true}
    this.circles = [];
    this.dir = new UF(); // lớp phương theo chỉ số thực thể đường thẳng
    this.perps = []; // cặp chỉ số thực thể vuông góc
    this.tans = []; // cặp [ref thực thể]: {t:'L'|'C', i}
    const k = kinds(doc);
    this.kind = k;
    for (const s of doc.steps) {
      const def = STEP_TYPES[s.type];
      if (!def) continue;
      const kind = k.get(s.id);
      if (kind === 'line') {
        const i = this.newLine();
        this.lines[i].objs.add(s.id);
        if (s.type === 'perp_bisector') this.addTag(i, 'PB:' + sortKey(s.args.map(rep)));
        if (s.type === 'angle_bisector' && !(s.params && s.params.external)) this.addTag(i, abTag(s.args.map(rep)));
      } else if (kind === 'circle') {
        const i = this.newCircle();
        this.circles[i].objs.add(s.id);
        if (s.type === 'incircle') this.circles[i].tags.add('IC:' + sortKey(s.args.map(rep)));
        if (s.type === 'circumcircle' || s.type === 'circle_3pts') for (const a of s.args) this.circles[i].pts.add(rep(a));
      }
    }
    for (const s of doc.steps) {
      const def = STEP_TYPES[s.type];
      if (!def || !def.facts) continue;
      let facts = [];
      try { facts = def.facts(s, s.args.map((a) => k.get(a))) || []; } catch { facts = []; }
      for (const f of facts) this.addFact(f);
    }
    this.saturate();
  }

  newLine() { this.lines.push({ pts: new Set(), objs: new Set(), tags: new Set(), alive: true }); return this.lines.length - 1; }
  newCircle() { this.circles.push({ pts: new Set(), objs: new Set(), tags: new Set(), alive: true }); return this.circles.length - 1; }
  addTag(i, tag) { this.lines[i].tags.add(tag); }

  /** Chỉ số thực thể đường thẳng ứng với tham chiếu (id đối tượng hoặc tham chiếu ảo). */
  lineOf(ref) {
    const L = this.lines;
    if (typeof ref === 'string') return L.findIndex((e) => e.alive && e.objs.has(ref));
    if (ref.L) {
      const [a, b] = ref.L.map(this.rep);
      if (a === b) return -1;
      let i = L.findIndex((e) => e.alive && e.pts.has(a) && e.pts.has(b));
      if (i < 0) { i = this.newLine(); L[i].pts.add(a); L[i].pts.add(b); }
      return i;
    }
    if (ref.PB) return this.tagged('PB:' + sortKey(ref.PB.map(this.rep)), () => {
      const j = this.lineOf({ L: ref.PB });
      return j;
    });
    if (ref.AB) return this.tagged(abTag(ref.AB.map(this.rep)), null, this.rep(ref.AB[1]));
    return -1;
  }

  tagged(tag, perpTo, through) {
    let i = this.lines.findIndex((e) => e.alive && e.tags.has(tag));
    if (i < 0) {
      i = this.newLine();
      this.lines[i].tags.add(tag);
      if (through) this.lines[i].pts.add(through);
    }
    if (perpTo) { const j = perpTo(); if (j >= 0) this.perps.push([i, j]); }
    return i;
  }

  circleOf(ref) {
    const C = this.circles;
    if (typeof ref === 'string') return C.findIndex((e) => e.alive && e.objs.has(ref));
    if (ref.C) {
      const ps = ref.C.map(this.rep);
      if (new Set(ps).size < 3) return -1;
      let i = C.findIndex((e) => e.alive && ps.every((p) => e.pts.has(p)));
      if (i < 0) { i = this.newCircle(); ps.forEach((p) => C[i].pts.add(p)); }
      return i;
    }
    if (ref.IC) {
      const tag = 'IC:' + sortKey(ref.IC.map(this.rep));
      let i = C.findIndex((e) => e.alive && e.tags.has(tag));
      if (i < 0) { i = this.newCircle(); C[i].tags.add(tag); }
      return i;
    }
    return -1;
  }

  curveOf(ref) {
    if (typeof ref === 'string') {
      const kd = this.kind.get(ref);
      if (kd === 'line') return { t: 'L', i: this.lineOf(ref) };
      if (kd === 'circle') return { t: 'C', i: this.circleOf(ref) };
      return null;
    }
    if (ref.C || ref.IC) return { t: 'C', i: this.circleOf(ref) };
    return { t: 'L', i: this.lineOf(ref) };
  }

  addFact(f) {
    if (f.on) {
      const P = this.rep(f.on[0]);
      const c = this.curveOf(f.on[1]);
      if (!c || c.i < 0) return;
      (c.t === 'L' ? this.lines : this.circles)[c.i].pts.add(P);
    } else if (f.col) {
      const ps = [...new Set(f.col.map(this.rep))];
      if (ps.length < 2) return;
      const i = this.lineOf({ L: [ps[0], ps[1]] });
      ps.forEach((p) => this.lines[i].pts.add(p));
    } else if (f.cyc) {
      const ps = [...new Set(f.cyc.map(this.rep))];
      if (ps.length < 3) return;
      const i = this.circleOf({ C: ps.slice(0, 3) });
      ps.forEach((p) => this.circles[i].pts.add(p));
    } else if (f.par || f.perp) {
      const [a, b] = (f.par || f.perp).map((r) => this.lineOf(r));
      if (a < 0 || b < 0) return;
      if (f.par) this.dir.union(a, b);
      else this.perps.push([a, b]);
    } else if (f.tan) {
      const [a, b] = f.tan.map((r) => this.curveOf(r));
      if (a && b && a.i >= 0 && b.i >= 0) this.tans.push([a, b]);
    }
  }

  mergeLine(i, j) {
    const a = this.lines[i], b = this.lines[j];
    for (const p of b.pts) a.pts.add(p);
    for (const o of b.objs) a.objs.add(o);
    for (const t of b.tags) a.tags.add(t);
    b.alive = false;
    this.dir.union(i, j);
    this.perps = this.perps.map(([x, y]) => [x === j ? i : x, y === j ? i : y]);
    this.tans = this.tans.map((pr) => pr.map((c) => (c.t === 'L' && c.i === j ? { t: 'L', i } : c)));
    this.redirect = this.redirect || new Map();
    this.redirect.set(j, i);
  }

  mergeCircle(i, j) {
    const a = this.circles[i], b = this.circles[j];
    for (const p of b.pts) a.pts.add(p);
    for (const o of b.objs) a.objs.add(o);
    for (const t of b.tags) a.tags.add(t);
    b.alive = false;
    this.tans = this.tans.map((pr) => pr.map((c) => (c.t === 'C' && c.i === j ? { t: 'C', i } : c)));
  }

  saturate() {
    for (let round = 0; round < 20; round++) {
      let changed = false;
      // L3: hai lớp cùng vuông góc với một lớp thì song song
      const perpOf = new Map();
      for (const [x, y] of this.perps) {
        const rx = this.dir.find(x), ry = this.dir.find(y);
        if (perpOf.has(ry)) changed = this.dir.union(perpOf.get(ry), rx) || changed; else perpOf.set(ry, rx);
        if (perpOf.has(rx)) changed = this.dir.union(perpOf.get(rx), ry) || changed; else perpOf.set(rx, ry);
      }
      // L1, L2
      const L = this.lines;
      for (let i = 0; i < L.length; i++) {
        if (!L[i].alive) continue;
        for (let j = i + 1; j < L.length; j++) {
          if (!L[j].alive) continue;
          let common = 0;
          for (const p of L[j].pts) if (L[i].pts.has(p)) common++;
          const sameTag = [...L[j].tags].some((t) => L[i].tags.has(t));
          if (common >= 2 || sameTag || (common >= 1 && this.dir.find(i) === this.dir.find(j))) {
            this.mergeLine(i, j);
            changed = true;
          }
        }
      }
      // C1
      const C = this.circles;
      for (let i = 0; i < C.length; i++) {
        if (!C[i].alive) continue;
        for (let j = i + 1; j < C.length; j++) {
          if (!C[j].alive) continue;
          let common = 0;
          for (const p of C[j].pts) if (C[i].pts.has(p)) common++;
          const sameTag = [...C[j].tags].some((t) => C[i].tags.has(t));
          if (common >= 3 || sameTag) { this.mergeCircle(i, j); changed = true; }
        }
      }
      if (!changed) break;
    }
  }

  // ---------- truy vấn ----------
  pointOnLineObj(P, lineId) { const i = this.lineOf(lineId); return i >= 0 && this.lines[i].pts.has(this.rep(P)); }
  pointOnCircleObj(P, cId) { const i = this.circleOf(cId); return i >= 0 && this.circles[i].pts.has(this.rep(P)); }
  collinear(ps) { const r = ps.map(this.rep); return this.lines.some((e) => e.alive && r.every((p) => e.pts.has(p))); }
  concyclic(ps) { const r = ps.map(this.rep); return this.circles.some((e) => e.alive && r.every((p) => e.pts.has(p))); }
  sameLine(a, b) { const i = this.lineOf(a), j = this.lineOf(b); return i >= 0 && i === j; }
  sameCircle(a, b) { const i = this.circleOf(a), j = this.circleOf(b); return i >= 0 && i === j; }
  parallel(a, b) { const i = this.lineOf(a), j = this.lineOf(b); return i >= 0 && j >= 0 && this.dir.find(i) === this.dir.find(j); }
  perpendicular(a, b) {
    const i = this.lineOf(a), j = this.lineOf(b);
    if (i < 0 || j < 0) return false;
    const ri = this.dir.find(i), rj = this.dir.find(j);
    return this.perps.some(([x, y]) => { const rx = this.dir.find(x), ry = this.dir.find(y); return (rx === ri && ry === rj) || (rx === rj && ry === ri); });
  }
  tangent(a, b) {
    const ca = this.curveOf(a), cb = this.curveOf(b);
    if (!ca || !cb) return false;
    const eq = (u, v) => u.t === v.t && u.i === v.i;
    return this.tans.some(([x, y]) => (eq(x, ca) && eq(y, cb)) || (eq(x, cb) && eq(y, ca)));
  }
}

const sortKey = (arr) => [...arr].sort().join(',');
const abTag = ([A, V, C]) => `AB:${V}:${sortKey([A, C])}`;
