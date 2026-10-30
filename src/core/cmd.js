// Dựng hình bằng câu lệnh tiếng Việt (bản 1.8). Gõ có dấu hay không dấu đều được; tên điểm giữ nguyên chữ hoa.
//
//   M = trung điểm BC              H = trực tâm ABC            (ABC)  hoặc  đường tròn ngoại tiếp ABC
//   d = qua A vuông góc BC          qua A song song BC          trung trực BC     phân giác góc BAC
//   D = chân đường cao từ A xuống BC                         A' = đối xứng A qua BC  (hoặc qua O)
//   S = (AEF) cắt (O)   K = AD cắt BC   E = AC cắt (O) khác A    đường tròn tâm O qua A    đường tròn đường kính BC
//   P = điểm trên (O)   AB  (đoạn)   đường thẳng AB   tia AB     tiếp tuyến tại A của (O)
//   P thoả góc PAB = góc PBC, góc PBC = góc PCA      Q sao cho QB = QC, góc BQC = 120      R thoả R thuộc (O), RB = RC
//   kiểm tra A, B, C thẳng hàng   kiểm tra AB = CD   kiểm tra A, B, C, D đồng viên   kiểm tra d1 vuông góc d2 …
//
// parseCommand(doc, text, ctx) → {ok, kind: 'build'|'check', desc, run(doc) → {ids} | claim} hoặc {ok: false, error}.
// run(doc) sửa trực tiếp doc (thêm bước) – giao diện gọi trong một lần commit để hoàn tác được.

import { evaluate, kinds, stepById } from './model.js';
import { addSpecs } from './apply.js';
import { STEP_TYPES } from './steps.js';
import * as G from './geom.js';

const fold = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');

/** Chuẩn hoá: từ khoá (chữ thường) bỏ dấu; tên điểm giữ nguyên; tách dấu câu. */
export function normalize(text) {
  return text
    .replace(/∠/g, ' góc ').replace(/∈/g, ' thuộc ').replace(/⊥/g, ' vuông góc ').replace(/∥/g, ' song song ').replace(/∩/g, ' cắt ')
    .replace(/([=,;:()])/g, ' $1 ')
    .split(/\s+/).filter(Boolean)
    // từ khoá: chữ thường (kể cả viết hoa chữ đầu câu: "Kiểm tra", "Đường tròn…"); chữ Hy Lạp (ω1) là tên
    .map((w) => ((/^[a-zà-ỹđ]+$/u.test(w) || /^[A-ZĐ][a-zà-ỹđ]{2,}$/u.test(w)) && !/^[α-ω]/.test(w) ? fold(w.toLowerCase()) : w))
    .join(' ')
    .replace(/\( /g, '(').replace(/ \)/g, ')');
}

class Fail extends Error {}
const fail = (msg) => { throw new Fail(msg); };

/** Ngữ cảnh tra tên trên một tài liệu (tài liệu có thể đang được thêm bước). */
class Ctx {
  constructor(doc, opts = {}) {
    this.doc = doc;
    this.mouse = opts.mouse || null;
    this.extraNames = new Set(opts.extraNames || []);
    this.refresh();
  }
  refresh() {
    this.k = kinds(this.doc);
    this.vals = evaluate(this.doc);
  }
  byName(n, kind) {
    const s = this.doc.steps.find((x) => x.name === n && (!kind || this.k.get(x.id) === kind));
    return s ? s.id : null;
  }
  /** Tách chuỗi thành các tên điểm có trên hình (khớp tên dài nhất trước): "ABC", "A, B, C", "I_AB" → I_A, B. */
  points(str, { allowNew = false } = {}) {
    const names = this.doc.steps.filter((s) => this.k.get(s.id) === 'point' && s.name).map((s) => s.name);
    for (const n of this.extraNames) names.push(n);
    names.sort((a, b) => b.length - a.length);
    const out = [];
    let i = 0;
    const t = str.replace(/[\s,]+/g, ' ').trim();
    while (i < t.length) {
      if (t[i] === ' ') { i++; continue; }
      const n = names.find((x) => t.startsWith(x, i) && !/^['_\d]/.test(t.slice(i + x.length, i + x.length + 1)));
      if (!n) {
        const m = /^[A-Z](?:_\{[^}]*\}|_[A-Za-z0-9])?\d*'*/.exec(t.slice(i));
        if (!m) fail(`Không hiểu "${t.slice(i)}"`);
        if (!allowNew) fail(`Chưa có điểm ${m[0]} trên hình`);
        out.push(m[0]);
        i += m[0].length;
        continue;
      }
      out.push(n);
      i += n.length;
    }
    return out;
  }
  pointIds(str, n) {
    const ps = this.points(str);
    if (n && ps.length !== n) fail(`Cần ${n} điểm, gõ được ${ps.length} (${ps.join(', ') || '–'})`);
    return ps.map((x) => this.byName(x, 'point'));
  }
  add(type, args, extra = {}) {
    const [id] = addSpecs(this.doc, [{ type, args, ...extra }], { join: true });
    if (extra.aux) stepById(this.doc, id).aux = true;
    this.refresh();
    return id;
  }
  /** Đường thẳng: tên (d1) hoặc hai điểm (BC) – dùng đường có sẵn qua hai điểm, không có thì dựng đường phụ. */
  line(tok) {
    const named = this.byName(tok, 'line');
    if (named) return named;
    const [P, Q] = this.pointIds(tok, 2);
    const own = this.doc.steps.find((s) => ['segment', 'line', 'ray'].includes(s.type) && ((s.args[0] === P && s.args[1] === Q) || (s.args[0] === Q && s.args[1] === P)));
    if (own) return own.id;
    const p = this.vals.get(P), q = this.vals.get(Q);
    const tol = 1e-9 * (1 + G.dist(p, q));
    const any = this.doc.steps.find((s) => this.k.get(s.id) === 'line' && this.vals.get(s.id) && G.distPointLine(p, this.vals.get(s.id)) < tol && G.distPointLine(q, this.vals.get(s.id)) < tol);
    if (any) return any.id;
    return this.add('line', [P, Q], { aux: true });
  }
  /** Đường tròn: tên (ω1), (O) – tâm O, (ABC) – qua A, B, C (chưa có thì dựng đường tròn ngoại tiếp). */
  circle(tok) {
    const named = this.byName(tok, 'circle');
    if (named) return named;
    const m = /^\((.+)\)$/.exec(tok);
    if (!m) fail(`"${tok}" không phải đường tròn – viết (O), (ABC) hoặc tên đường tròn`);
    const pts = this.points(m[1]);
    const circles = this.doc.steps.filter((s) => this.k.get(s.id) === 'circle' && this.vals.get(s.id));
    if (pts.length === 1) {
      const O = this.vals.get(this.byName(pts[0], 'point'));
      const c = circles.find((s) => G.dist(this.vals.get(s.id).c, O) < 1e-9 * (1 + this.vals.get(s.id).r));
      if (!c) fail(`Chưa có đường tròn tâm ${pts[0]}`);
      return c.id;
    }
    if (pts.length !== 3) fail(`Đường tròn (${m[1]}): cần tâm (1 điểm) hoặc 3 điểm`);
    const ids = pts.map((x) => this.byName(x, 'point'));
    const V = ids.map((id) => this.vals.get(id));
    const c = circles.find((s) => V.every((P) => Math.abs(G.dist(P, this.vals.get(s.id).c) - this.vals.get(s.id).r) < 1e-9 * (1 + this.vals.get(s.id).r)));
    if (c) return c.id;
    return this.add('circumcircle', ids);
  }
  curve(tok) {
    if (/^\(/.test(tok) || this.byName(tok, 'circle')) return this.circle(tok);
    return this.line(tok);
  }
  /** Đối tượng: điểm, đường thẳng hoặc đường tròn. */
  obj(tok) {
    const p = this.byName(tok, 'point');
    if (p) return p;
    return this.curve(tok);
  }
  name(id) { return stepById(this.doc, id)?.name || '?'; }
}

const NAME = String.raw`([^\s=,;:]+)`; // một tên / cụm tên điểm
const REST = String.raw`(.+?)`;
const TYPE_OF_CENTER = {
  'truc tam': 'orthocenter', 'trong tam': 'centroid', 'tam noi tiep': 'incenter', 'tam duong tron noi tiep': 'incenter',
  'tam ngoai tiep': 'circumcenter', 'tam duong tron ngoai tiep': 'circumcenter', 'tam euler': 'nine_point_center',
  'tam duong tron euler': 'nine_point_center', 'diem lemoine': 'lemoine',
};
const TYPE_OF_CIRCLE = { 'ngoai tiep': 'circumcircle', 'noi tiep': 'incircle', 'euler': 'nine_point_circle' };

/** Các quy tắc dựng: [regex trên câu đã chuẩn hoá (không gồm phần "X ="), hàm (match, ctx) → id kết quả chính]. */
const RULES = [
  [/^trung diem (?:cua )?(?:doan )?(.+)$/, (m, c) => {
    const seg = c.byName(m[1], 'line');
    const [A, B] = seg ? stepById(c.doc, seg).args : c.pointIds(m[1], 2);
    return c.add('midpoint', [A, B]);
  }],
  [new RegExp(`^(${Object.keys(TYPE_OF_CENTER).join('|')}) (?:cua )?(?:tam giac )?(.+)$`), (m, c) => c.add(TYPE_OF_CENTER[m[1]], c.pointIds(m[2], 3))],
  [/^duong tron (ngoai tiep|noi tiep|euler) (?:cua )?(?:tam giac )?(.+)$/, (m, c) => c.add(TYPE_OF_CIRCLE[m[1]], c.pointIds(m[2], 3))],
  [/^\(([^()]+)\)$/, (m, c) => c.add('circumcircle', c.pointIds(m[1], 3))],
  [/^(?:duong thang |duong )?qua (\S+) (vuong goc|song song)(?: voi)? (\S+)$/, (m, c) => c.add(m[2] === 'vuong goc' ? 'perpendicular' : 'parallel', [c.pointIds(m[1], 1)[0], c.line(m[3])], { aux: true })],
  [/^(?:duong )?trung truc (?:cua )?(?:doan )?(.+)$/, (m, c) => c.add('perp_bisector', c.pointIds(m[1], 2), { aux: true })],
  [/^(?:duong )?phan giac (trong |ngoai )?(?:cua )?(?:goc )?(.+)$/, (m, c) => c.add('angle_bisector', c.pointIds(m[2], 3), { aux: true, params: m[1] === 'ngoai ' ? { external: true } : undefined })],
  [/^(?:chan duong cao|chan duong vuong goc|hinh chieu) (?:ke )?(?:tu |cua )?(\S+) (?:xuong|len|tren) (\S+)$/, (m, c) => {
    const P = c.pointIds(m[1], 1)[0];
    const named = c.byName(m[2], 'line');
    if (named) return c.add('projection', [P, named]);
    const [A, B] = c.pointIds(m[2], 2);
    return c.add('foot', [P, A, B]);
  }],
  [/^doi xung (?:cua )?(\S+) qua (\S+)$/, (m, c) => {
    const X = c.obj(m[1]);
    const M = c.byName(m[2], 'point') || c.line(m[2]);
    return c.add('reflect', [X, M], { prime: true });
  }],
  [/^(?:giao (?:diem )?(?:cua )?)?(\S+) (?:cat|giao|va|voi) (\S+)(?: khac (\S+))?$/, (m, c) => intersect(c, m[1], m[2], m[3])],
  [/^(?:doan thang|doan) (\S+)$/, (m, c) => c.add('segment', c.pointIds(m[1], 2))],
  [/^duong thang (\S+)$/, (m, c) => c.add('line', c.pointIds(m[1], 2))],
  [/^tia (\S+)$/, (m, c) => c.add('ray', c.pointIds(m[1], 2))],
  [/^duong tron tam (\S+) (?:qua|di qua) (\S+)$/, (m, c) => c.add('circle', [c.pointIds(m[1], 1)[0], c.pointIds(m[2], 1)[0]])],
  [/^duong tron tam (\S+) ban kinh (\S+)$/, (m, c) => c.add('circle_radius', [c.pointIds(m[1], 1)[0], ...c.pointIds(m[2], 2)])],
  [/^duong tron duong kinh (\S+)$/, (m, c) => c.add('circle_diameter', c.pointIds(m[1], 2))],
  [/^diem (?:tren|thuoc) (\S+)$/, (m, c) => {
    const host = c.curve(m[1]);
    const v = c.vals.get(host);
    const t = c.mouse && v ? G.paramOf(v, c.mouse) : v && v.kind === 'circle' ? 0.6 : 0.4;
    return c.add('point_on', [host], { params: { t: Math.round(t * 1e9) / 1e9 } });
  }],
  [/^tiep tuyen (?:tai|o) (\S+) (?:cua|voi) (\S+)$/, (m, c) => c.add('tangent_at', [c.circle(m[2]), c.pointIds(m[1], 1)[0]])],
  [/^(\S+)$/, (m, c) => {
    // hai tên điểm liền nhau: đoạn thẳng
    const ps = c.points(m[1]);
    if (ps.length !== 2) fail('Không hiểu lệnh');
    return c.add('segment', ps.map((x) => c.byName(x, 'point')));
  }],
];

function intersect(c, t1, t2, other) {
  const a = c.curve(t1), b = c.curve(t2);
  const roots = G.intersect(c.vals.get(a), c.vals.get(b));
  if (!roots.length) fail(`${t1} và ${t2} không cắt nhau (ở hình hiện tại)`);
  if (other) return c.add('intersection_other', [a, b, c.pointIds(other, 1)[0]]);
  const pts = c.doc.steps.filter((s) => c.k.get(s.id) === 'point' && c.vals.get(s.id));
  if (roots.length === 1) {
    const same = pts.find((s) => G.dist(c.vals.get(s.id), roots[0]) < 1e-9 * (1 + Math.hypot(roots[0].x, roots[0].y)));
    if (same) fail(`Giao điểm chính là điểm ${same.name} đã có`);
    return c.add('intersection', [a, b], { params: { which: 0 } });
  }
  // một nghiệm là điểm đã có → lấy nghiệm còn lại ("giao điểm thứ hai")
  const tol = 1e-9 * (1 + G.dist(roots[0], roots[1]));
  const known = roots.map((R) => pts.find((s) => G.dist(c.vals.get(s.id), R) < tol));
  if (known[0] && known[1]) fail(`Hai giao điểm đều đã có trên hình: ${known[0].name}, ${known[1].name}`);
  if (known[0] && !known[1]) return c.add('intersection_other', [a, b, known[0].id]);
  if (known[1] && !known[0]) return c.add('intersection_other', [a, b, known[1].id]);
  // hai nghiệm mới: lấy nghiệm gần con trỏ (hoặc nghiệm thứ nhất)
  const which = c.mouse && G.dist(roots[1], c.mouse) < G.dist(roots[0], c.mouse) ? 1 : 0;
  return c.add('intersection', [a, b], { params: { which } });
}

// ---------------- điểm thoả điều kiện ----------------
const COND_RULES = [
  [/^goc (\S+) = goc (\S+)$/, 'ang'],
  [/^goc (\S+) = (\d+(?:[.,]\d+)?)(?: ?(?:do|°))?$/, 'angv'],
  [/^(\S+) = (\S+)$/, 'len'],
  [/^(\S+) (?:thuoc|nam tren|tren) (\S+)$/, 'on'],
];

function solvePointCmd(c, name, condText) {
  if (c.byName(name)) fail(`Tên ${name} đã có trên hình`);
  c.extraNames.add(name);
  const args = [];
  const ref = (id) => { let i = args.indexOf(id); if (i < 0) { args.push(id); i = args.length - 1; } return i; };
  const pt = (n) => (n === name ? -1 : ref(c.byName(n, 'point')));
  const conds = [];
  for (const part of condText.split(/ ?[,;] ?| va /).map((x) => x.trim()).filter(Boolean)) {
    const rule = COND_RULES.find(([re]) => re.test(part));
    if (!rule) fail(`Không hiểu điều kiện "${part}" – dùng: góc XYZ = góc UVW, góc XYZ = 30, XY = ZT, ${name} thuộc (O) / BC`);
    const m = rule[0].exec(part);
    if (rule[1] === 'ang') {
      const p1 = c.points(m[1]), p2 = c.points(m[2]);
      if (p1.length !== 3 || p2.length !== 3) fail(`Góc cần 3 điểm: "${part}"`);
      conds.push({ t: 'ang', a: [...p1, ...p2].map(pt) });
    } else if (rule[1] === 'angv') {
      const p1 = c.points(m[1]);
      if (p1.length !== 3) fail(`Góc cần 3 điểm: "${part}"`);
      conds.push({ t: 'angv', a: p1.map(pt), v: parseFloat(m[2].replace(',', '.')) });
    } else if (rule[1] === 'len') {
      const p1 = c.points(m[1]), p2 = c.points(m[2]);
      if (p1.length !== 2 || p2.length !== 2) fail(`Độ dài cần 2 điểm mỗi vế: "${part}"`);
      conds.push({ t: 'len', a: [...p1, ...p2].map(pt) });
    } else {
      if (c.points(m[1]).join() !== name) fail(`"${part}": vế trái phải là ${name}`);
      conds.push({ t: 'on', a: [ref(c.curve(m[2]))] });
    }
  }
  if (!conds.length) fail('Cần ít nhất một điều kiện');
  if (conds.length > 2) fail('Tối đa hai điều kiện (một điểm có hai bậc tự do)');
  if (conds.every((x) => !x.a.includes(-1)) && conds.some((x) => x.t !== 'on')) fail(`Điều kiện phải nhắc tới điểm ${name}`);
  c.extraNames.delete(name);
  // vị trí xuất phát: con trỏ chuột, rồi trọng tâm các điểm liên quan và vài chỗ quanh đó
  const objs = args.map((id) => c.vals.get(id));
  const ptsV = objs.filter((o) => o.kind === 'point');
  const cen = ptsV.length ? { x: ptsV.reduce((s, p) => s + p.x, 0) / ptsV.length, y: ptsV.reduce((s, p) => s + p.y, 0) / ptsV.length } : { x: 0, y: 0 };
  const size = Math.max(1, ...ptsV.map((p) => G.dist(p, cen)));
  const guesses = [c.mouse, cen, ...[0, 1, 2, 3, 4, 5].map((i) => ({ x: cen.x + 0.6 * size * Math.cos(i + 0.3), y: cen.y + 0.6 * size * Math.sin(i + 0.3) }))].filter(Boolean);
  let sol = null;
  for (const g of guesses) { sol = G.solvePoint(objs, conds, g.x, g.y); if (sol) break; }
  if (!sol) fail('Không tìm được điểm thoả các điều kiện (thử đặt con trỏ chuột gần chỗ điểm cần tìm rồi gõ lại)');
  return c.add('solve_point', args, { params: { x: Math.round(sol.x * 1e9) / 1e9, y: Math.round(sol.y * 1e9) / 1e9, conds }, name });
}

// ---------------- kiểm tra nhận định ----------------
const CHECK_RULES = [
  [/^(.+) thang hang$/, (m, c) => ({ type: 'collinear', ids: c.pointIds(m[1], 3) })],
  [/^(.+) (?:dong vien|cung thuoc (?:mot )?duong tron)$/, (m, c) => ({ type: 'concyclic', ids: c.pointIds(m[1], 4) })],
  [/^goc (\S+) = goc (\S+)$/, (m, c) => ({ type: 'equal_angle', ids: [...c.pointIds(m[1], 3), ...c.pointIds(m[2], 3)] })],
  [/^(\S+) (?:vuong goc|⊥)(?: voi)? (\S+)$/, (m, c) => ({ type: 'perpendicular', ids: [c.line(m[1]), c.line(m[2])] })],
  [/^(\S+) song song(?: voi)? (\S+)$/, (m, c) => ({ type: 'parallel', ids: [c.line(m[1]), c.line(m[2])] })],
  [/^(\S+) , (\S+) , (\S+) dong quy$/, (m, c) => ({ type: 'concurrent', ids: [c.line(m[1]), c.line(m[2]), c.line(m[3])] })],
  [/^(\S+) tiep xuc(?: voi)? (\S+)$/, (m, c) => ({ type: 'tangent', ids: [c.curve(m[1]), c.circle(m[2])] })],
  [/^(\S+) (?:thuoc|nam tren) (\S+)$/, (m, c) => {
    const P = c.pointIds(m[1], 1)[0], X = c.curve(m[2]);
    return { type: c.k.get(X) === 'circle' ? 'on_circle' : 'on_line', ids: [P, X] };
  }],
  [/^(\S+) trung(?: voi)? (\S+)$/, (m, c) => ({ type: 'coincide', ids: [c.pointIds(m[1], 1)[0], c.pointIds(m[2], 1)[0]] })],
  [/^(\S+) = (\S+)$/, (m, c) => ({ type: 'equal_len', ids: [...c.pointIds(m[1], 2), ...c.pointIds(m[2], 2)] })],
];

/**
 * Phân tích một câu lệnh. ctx: {mouse: {x, y}} (toạ độ hình của con trỏ – chọn nghiệm, chỗ đặt điểm).
 * Thử chạy trên bản sao để báo lỗi / mô tả trước khi thật sự dựng.
 */
export function parseCommand(doc, text, ctx = {}) {
  const t = normalize(text || '').trim();
  if (!t) return { ok: false, error: '' };
  const attempt = (d) => {
    const c = new Ctx(d, ctx);
    const chk = /^kiem tra (.+?)\??$/.exec(t);
    if (chk) {
      const r = CHECK_RULES.find(([re]) => re.test(chk[1]));
      if (!r) fail('Kiểm tra: thẳng hàng, đồng viên, AB = CD, góc ABC = góc DEF, d1 vuông góc d2, song song, đồng quy, tiếp xúc, thuộc, trùng');
      return { kind: 'check', claim: r[1](r[0].exec(chk[1]), c) };
    }
    const n0 = d.steps.length;
    let name = null, body = t;
    const sp = /^(\S+) (?:thoa(?: man)?|sao cho|:) (.+)$/.exec(t);
    let main;
    if (sp && !/ = /.test(sp[1])) main = solvePointCmd(c, sp[1], sp[2]);
    else {
      const eq = /^([^\s=]+) = (.+)$/.exec(t);
      if (eq && !/^\(/.test(eq[1])) { name = eq[1]; body = eq[2]; }
      if (name && c.byName(name)) fail(`Tên ${name} đã có trên hình`);
      const rule = RULES.find(([re]) => re.test(body));
      if (!rule) fail('Không hiểu lệnh – xem các mẫu lệnh bên dưới');
      main = rule[1](rule[0].exec(body), c);
      if (name) stepById(d, main).name = name;
    }
    const ids = d.steps.slice(n0).map((s) => s.id);
    if (!c.vals.get(main) && !ids.length) fail('Không dựng được');
    c.refresh();
    if (!c.vals.get(main)) fail('Đối tượng không xác định ở hình hiện tại');
    return { kind: 'build', ids, main };
  };
  try {
    const trial = JSON.parse(JSON.stringify(doc));
    const r = attempt(trial);
    if (r.kind === 'check') return { ok: true, kind: 'check', claim: r.claim, desc: 'Kiểm tra nhận định', run: (d = doc) => attempt(d).claim };
    const s = stepById(trial, r.main);
    const extra = r.ids.filter((id) => id !== r.main).map((id) => stepById(trial, id));
    const label = (x) => `${x.name ? x.name + ' – ' : ''}${(STEP_TYPES[x.type] || {}).label || x.type}`;
    const desc = label(s) + (extra.length ? ` (kèm ${extra.map((x) => (x.aux ? 'đường phụ ' : '') + (x.name || '')).join(', ')})` : '');
    return { ok: true, kind: 'build', desc, run: (d = doc) => attempt(d) };
  } catch (e) {
    if (e instanceof Fail) return { ok: false, error: e.message };
    return { ok: false, error: 'Không hiểu lệnh' };
  }
}

/** Mẫu lệnh (gợi ý trong bảng lệnh). */
export const COMMAND_EXAMPLES = [
  'M = trung điểm BC', 'H = trực tâm ABC', 'O = tâm ngoại tiếp ABC', 'I = tâm nội tiếp ABC', 'G = trọng tâm ABC',
  '(ABC)', 'đường tròn nội tiếp ABC', 'qua A vuông góc BC', 'qua A song song BC', 'trung trực BC', 'phân giác góc BAC',
  'D = chân đường cao từ A xuống BC', "A' = đối xứng A qua BC", 'K = AD cắt BC', 'S = (AEF) cắt (O)', 'E = AC cắt (O) khác A',
  'đường tròn tâm O qua A', 'đường tròn đường kính BC', 'P = điểm trên (O)', 'tiếp tuyến tại A của (O)', 'đoạn AB', 'đường thẳng AB',
  'P thoả góc PAB = góc PBC, góc PBC = góc PCA', 'Q sao cho QB = QC, góc BQC = 120', 'kiểm tra A, B, C thẳng hàng',
  'kiểm tra A, B, C, D đồng viên', 'kiểm tra AB = CD',
];
export { fold };
