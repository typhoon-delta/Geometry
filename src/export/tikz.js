// Xuất hình ra mã TikZ sạch, dễ đọc, dán thẳng vào LaTeX (chỉ cần \usepackage{tikz}, không cần thư viện thêm).
//
// Quy ước:
//   - Toạ độ giữ nguyên đơn vị của hình; kích thước bản in chỉnh bằng x=…cm, y=…cm ở đầu tikzpicture.
//   - Mỗi điểm được đặt tên bằng \coordinate (tên lấy từ nhãn điểm), các lệnh vẽ dùng lại tên đó.
//   - Đường thẳng (vô hạn) và tia được cắt theo khung bao quanh hình.
//   - Giữ màu, nét đứt, độ dày, tô nền, cung đánh dấu góc, vạch đoạn bằng nhau, vị trí nhãn.

import { evaluate, kinds, stepById } from '../core/model.js';
import * as G from '../core/geom.js';
import { autoLabelDirs } from '../core/labels.js';
import { texLabel } from '../core/names.js';

const NAMED_COLORS = {
  '#111827': 'black', '#1d4ed8': 'xanhduong', '#dc2626': 'do', '#15803d': 'xanhla', '#ea580c': 'cam',
  '#7e22ce': 'tim', '#0e7490': 'xanhngoc', '#6b7280': 'xam',
};
const DEFAULT_COLOR = { circumcircle: '#1d4ed8', incircle: '#15803d', nine_point_circle: '#7e22ce', polygon: '#1d4ed8', angle_mark: '#dc2626', segment_mark: '#dc2626' };
const f3 = (v) => {
  const s = (Math.round(v * 1000) / 1000).toFixed(3).replace(/\.?0+$/, '');
  return s === '-0' ? '0' : s;
};
const xy = (P) => `(${f3(P.x)}, ${f3(P.y)})`;

export { texLabel };

function coordName(name, used) {
  let base = (name || 'P').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/'/g, 'p').replace(/[^A-Za-z0-9]/g, '');
  if (!base || /^\d/.test(base)) base = 'P' + base;
  let n = base, i = 2;
  while (used.has(n)) n = base + '-' + i++;
  used.add(n);
  return n;
}

function anchorFor(off) {
  const a = (Math.atan2(off[1], off[0]) * 180) / Math.PI;
  const dirs = ['right', 'above right', 'above', 'above left', 'left', 'below left', 'below', 'below right'];
  return dirs[((Math.round(a / 45) % 8) + 8) % 8];
}

/** Cắt đường thẳng p + t·d theo hình chữ nhật box → [P1, P2] hoặc null. tMin = 0 cho tia. */
function clipLine(l, box, tMin = -Infinity) {
  let t0 = tMin, t1 = Infinity;
  const { p, d } = l;
  for (const [pp, dd, lo, hi] of [[p.x, d.x, box.x1, box.x2], [p.y, d.y, box.y1, box.y2]]) {
    if (Math.abs(dd) < 1e-14) { if (pp < lo || pp > hi) return null; continue; }
    let a = (lo - pp) / dd, b = (hi - pp) / dd;
    if (a > b) [a, b] = [b, a];
    t0 = Math.max(t0, a);
    t1 = Math.min(t1, b);
  }
  if (t0 >= t1) return null;
  return [{ x: p.x + t0 * d.x, y: p.y + t0 * d.y }, { x: p.x + t1 * d.x, y: p.y + t1 * d.y }];
}

/**
 * @param doc    tài liệu
 * @param opts   { width: bề rộng mong muốn (cm, mặc định 12), values: giá trị đã tính (tuỳ chọn) }
 * @returns chuỗi mã LaTeX
 */
export function toTikZ(doc, opts = {}) {
  const width = opts.width || 12;
  const vals = opts.values || evaluate(doc);
  const k = kinds(doc);
  const visible = doc.steps.filter((s) => !s.hidden && vals.get(s.id));

  // ---- khung bao ----
  const pts = [];
  for (const s of visible) {
    const v = vals.get(s.id);
    if (v.kind === 'point') pts.push(v);
    if (v.kind === 'circle') pts.push({ x: v.c.x - v.r, y: v.c.y - v.r }, { x: v.c.x + v.r, y: v.c.y + v.r });
  }
  if (!pts.length) return '% Hình trống\n';
  let x1 = Math.min(...pts.map((p) => p.x)), x2 = Math.max(...pts.map((p) => p.x));
  let y1 = Math.min(...pts.map((p) => p.y)), y2 = Math.max(...pts.map((p) => p.y));
  const span = Math.max(x2 - x1, y2 - y1, 1e-6);
  const m = span * 0.08;
  const box = { x1: x1 - m, x2: x2 + m, y1: y1 - m, y2: y2 + m };
  const unit = width / (box.x2 - box.x1);
  const cm = (c) => c / unit; // đổi cm bản in → đơn vị hình

  // ---- màu ----
  const colorDefs = new Map();
  const col = (s) => {
    const hex = ((s.style && s.style.color) || DEFAULT_COLOR[s.type] || '#111827').toLowerCase();
    if (NAMED_COLORS[hex]) {
      if (NAMED_COLORS[hex] !== 'black') colorDefs.set(NAMED_COLORS[hex], hex);
      return NAMED_COLORS[hex];
    }
    const nm = 'c' + hex.replace('#', '');
    colorDefs.set(nm, hex);
    return nm;
  };
  const opt = (...xs) => {
    const o = xs.filter((x) => x && x !== 'black');
    return o.length ? `[${o.join(', ')}]` : '';
  };
  const lineOpts = (s) => {
    const st = s.style || {};
    const w = st.width && Math.abs(st.width - 1.6) > 1e-9 ? `line width=${f3(st.width * 0.45)}pt` : '';
    return opt(col(s), st.dash ? 'dashed' : '', w);
  };

  // ---- tên toạ độ ----
  const used = new Set();
  const cname = new Map();
  for (const s of visible) if (k.get(s.id) === 'point') cname.set(s.id, coordName(s.name, used));
  // điểm dùng trong đánh dấu/đa giác nhưng bị ẩn: vẫn cần toạ độ
  for (const s of visible) if (k.get(s.id) === 'mark' || ['segment', 'circle'].includes(s.type)) for (const a of s.args) {
    if (!cname.has(a) && vals.get(a)) cname.set(a, coordName(stepById(doc, a)?.name || a, used));
  }
  const ref = (id) => `(${cname.get(id)})`;

  const autoDirs = autoLabelDirs(doc, vals);
  const out = { coords: [], fills: [], circles: [], lines: [], marks: [], points: [], labels: [] };
  for (const [id, n] of cname) out.coords.push(`\\coordinate (${n}) at ${xy(vals.get(id))};${stepById(doc, id)?.hidden ? ' % điểm ẩn' : ''}`);

  for (const s of visible) {
    const v = vals.get(s.id);
    const st = s.style || {};
    const kind = k.get(s.id);
    if (kind === 'circle') {
      const center = s.type === 'circle' || s.type === 'circle_radius' ? ref(s.args[0]) : xy(v.c);
      const fill = st.fill || 0;
      if (fill > 0) out.fills.push(`\\fill[${col(s)}, fill opacity=${f3(fill)}] ${center} circle (${f3(v.r)});`);
      out.circles.push(`\\draw${lineOpts(s)} ${center} circle (${f3(v.r)}); % ${s.name || ''}`);
      if (st.showLabel && s.name) {
        const P = { x: v.c.x + v.r * Math.cos(Math.PI / 4), y: v.c.y + v.r * Math.sin(Math.PI / 4) };
        out.labels.push(`\\node[above right, ${col(s)}] at ${xy(P)} {${texLabel(s.name)}};`);
      }
    } else if (kind === 'line') {
      const sub = s.type === 'segment' ? 'segment' : s.type === 'ray' ? 'ray' : v.sub;
      const desc = s.type === 'line' || s.type === 'segment' || s.type === 'ray' ? s.args.map((a) => stepById(doc, a)?.name).join('') : s.name;
      if (sub === 'segment' && s.type === 'segment') out.lines.push(`\\draw${lineOpts(s)} ${ref(s.args[0])} -- ${ref(s.args[1])};`);
      else if (sub === 'segment') out.lines.push(`\\draw${lineOpts(s)} ${xy(v.p)} -- ${xy(G.add(v.p, v.d))};`);
      else {
        const seg = clipLine(v, box, sub === 'ray' ? 0 : -Infinity);
        if (seg) out.lines.push(`\\draw${lineOpts(s)} ${sub === 'ray' && s.type === 'ray' ? ref(s.args[0]) : xy(seg[0])} -- ${xy(seg[1])}; % ${sub === 'ray' ? 'tia' : 'đường thẳng'} ${desc}`);
        if (seg && st.showLabel && s.name) {
          const P = { x: seg[0].x + 0.85 * (seg[1].x - seg[0].x), y: seg[0].y + 0.85 * (seg[1].y - seg[0].y) };
          out.labels.push(`\\node[above, ${col(s)}] at ${xy(P)} {${texLabel(s.name)}};`);
        }
      }
    } else if (s.type === 'polygon') {
      const path = s.args.map(ref).join(' -- ') + ' -- cycle';
      out.fills.push(`\\fill[${col(s)}, fill opacity=${f3(st.fill ?? 0.12)}] ${path};`);
      if (st.border) out.lines.push(`\\draw${lineOpts(s)} ${path};`);
    } else if (s.type === 'angle_mark') {
      out.marks.push(...angleMark(v, s, col(s), cm, ref));
    } else if (s.type === 'segment_mark') {
      out.marks.push(...segMark(v, s, col(s), cm));
    } else if (kind === 'point') {
      const r = ((st.size || 3) * 0.5).toFixed(1);
      const pc = st.color && st.color.toLowerCase() !== '#111827' ? col(s) : 'black';
      out.points.push(`\\fill${opt(pc)} ${ref(s.id)} circle (${r}pt);`);
      const dir = st.labelOffset || (autoDirs.get(s.id) ? [autoDirs.get(s.id).x, autoDirs.get(s.id).y] : [1, 1]);
      if (st.showLabel !== false && s.name) out.labels.push(`\\node[${anchorFor(dir)}] at ${ref(s.id)} {${texLabel(s.name)}};`);
    }
  }

  const L = [];
  L.push(`% ${doc.title ? doc.title + ' — ' : ''}xuất từ Hình học động`);
  L.push('% Cần trong phần mở đầu: \\usepackage{tikz}');
  L.push('% Đổi kích thước hình: sửa x=…, y=… (đơn vị của một ô toạ độ).');
  L.push(`\\begin{tikzpicture}[x=${f3(unit)}cm, y=${f3(unit)}cm, line width=0.6pt, line cap=round, line join=round]`);
  if (colorDefs.size) {
    L.push('  % Màu');
    for (const [n, hex] of colorDefs) L.push(`  \\definecolor{${n}}{HTML}{${hex.slice(1).toUpperCase()}}`);
  }
  const sec = (title, arr) => { if (arr.length) { L.push(`  % ${title}`); for (const x of arr) L.push('  ' + x); } };
  sec('Toạ độ các điểm', out.coords);
  sec('Tô nền', out.fills);
  sec('Đường tròn', out.circles);
  sec('Đường thẳng, đoạn thẳng, tia', out.lines);
  sec('Đánh dấu góc, đoạn bằng nhau', out.marks);
  sec('Điểm', out.points);
  sec('Nhãn', out.labels);
  L.push('\\end{tikzpicture}');
  return L.join('\n') + '\n';
}

function angleMark(v, s, color, cm, ref) {
  const { A, B, C } = v;
  const st = s.style || {};
  const a1 = Math.atan2(A.y - B.y, A.x - B.x);
  let diff = Math.atan2(C.y - B.y, C.x - B.x) - a1;
  while (diff <= -Math.PI) diff += 2 * Math.PI;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  const deg = (r) => f3((r * 180) / Math.PI);
  const r0 = cm(0.45);
  const vtx = ref(s.args[1]);
  const o = color === 'black' ? '' : `[${color}]`;
  if (Math.abs(Math.abs(diff) - Math.PI / 2) < 1e-6 && st.right !== false) {
    const r = r0 * 0.7;
    return [`\\draw${o} ${vtx} ++(${deg(a1)}:${f3(r)}) -- ++(${deg(a1 + diff)}:${f3(r)}) -- ++(${deg(a1 + Math.PI)}:${f3(r)}); % góc vuông`];
  }
  const n = Math.max(1, Math.min(4, st.arcs || 1));
  const outL = [];
  for (let i = 0; i < n; i++) {
    const r = r0 + i * cm(0.09);
    outL.push(`\\draw${o} ${vtx} ++(${deg(a1)}:${f3(r)}) arc[start angle=${deg(a1)}, end angle=${deg(a1 + diff)}, radius=${f3(r)}];`);
  }
  return outL;
}

function segMark(v, s, color, cm) {
  const { A, B } = v;
  const st = s.style || {};
  const L = G.dist(A, B);
  const u = { x: (B.x - A.x) / L, y: (B.y - A.y) / L };
  const n = { x: -u.y, y: u.x };
  const M = G.mid(A, B);
  const kk = Math.max(1, Math.min(4, st.ticks || 1));
  const h = cm(0.13), gap = cm(0.08);
  const o = color === 'black' ? '' : `[${color}]`;
  const outL = [];
  for (let i = 0; i < kk; i++) {
    const off = (i - (kk - 1) / 2) * gap;
    const c = { x: M.x + off * u.x, y: M.y + off * u.y };
    outL.push(`\\draw${o} ${xy({ x: c.x - h * n.x, y: c.y - h * n.y })} -- ${xy({ x: c.x + h * n.x, y: c.y + h * n.y })};`);
  }
  return outL;
}
