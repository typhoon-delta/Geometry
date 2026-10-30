// Xuất hình ra mã Asymptote (bản 1.8) – định dạng vẽ hình quen thuộc của cộng đồng Olympic (AoPS: dán trong [asy]…[/asy]).
// Cùng cách làm với TikZ (tikz.js): mỗi điểm là một biến pair theo nhãn, đường thẳng/tia cắt vừa khung (hoặc "vừa đủ"
// qua các điểm như trên màn hình), giữ màu, nét đứt, độ dày, tô nền, cung góc, vạch đoạn, hướng nhãn, quỹ tích.
// Chỉ dùng Asymptote thuần (không cần olympiad.asy).

import { evaluate, kinds, stepById } from '../core/model.js';
import * as G from '../core/geom.js';
import { autoLabelDirs } from '../core/labels.js';
import { texLabel } from '../core/names.js';
import { styleOf, isShown } from '../core/styles.js';

const f3 = (v) => {
  const s = (Math.round(v * 1000) / 1000).toFixed(3).replace(/\.?0+$/, '');
  return s === '-0' ? '0' : s;
};
const xy = (P) => `(${f3(P.x)},${f3(P.y)})`;
const PT_PER_PX = 0.4;

function varName(name, used) {
  let base = (name || 'P').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd').replace(/'/g, 'p').replace(/[^A-Za-z0-9]/g, '');
  if (!base || /^\d/.test(base)) base = 'P' + base;
  // tránh trùng từ khoá / hàm của Asymptote
  if (/^(dot|draw|fill|label|circle|arc|pair|real|path|pen|dir|unitsize|size|cycle|black|white|red|blue|green|gray|E|N|S|W|NE|NW|SE|SW|I)$/.test(base)) base += '_';
  let n = base, i = 2;
  while (used.has(n)) n = base + i++;
  used.add(n);
  return n;
}

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
  return [G.add(p, G.mul(d, t0)), G.add(p, G.mul(d, t1))];
}

const rgb = (hex) => {
  const h = hex.replace('#', '');
  const c = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  return c.every((x) => x < 0.15) ? null : `rgb(${c.map(f3).join(',')})`;
};

/**
 * @param opts { width: bề rộng (cm, mặc định 12), values, theme, trimLines }
 */
export function toAsymptote(doc, opts = {}) {
  const width = opts.width || 12;
  const theme = opts.theme || 'mono';
  const vals = opts.values || evaluate(doc);
  const k = kinds(doc);
  const visible = doc.steps.filter((s) => isShown(doc, s) && vals.get(s.id));
  const pts = [];
  for (const s of visible) {
    const v = vals.get(s.id);
    if (v.kind === 'point') pts.push(v);
    if (v.kind === 'circle') pts.push({ x: v.c.x - v.r, y: v.c.y - v.r }, { x: v.c.x + v.r, y: v.c.y + v.r });
  }
  if (!pts.length) return '// Hình trống\n';
  const x1 = Math.min(...pts.map((p) => p.x)), x2 = Math.max(...pts.map((p) => p.x));
  const y1 = Math.min(...pts.map((p) => p.y)), y2 = Math.max(...pts.map((p) => p.y));
  const m = Math.max(x2 - x1, y2 - y1, 1e-6) * 0.08;
  const box = { x1: x1 - m, x2: x2 + m, y1: y1 - m, y2: y2 + m };
  const unit = width / (box.x2 - box.x1);
  const cm = (c) => c / unit;
  const full = (s) => styleOf(s, k.get(s.id), theme);
  const baseWidth = styleOf({ type: 'line' }, 'line', theme).width;
  const pen = (s, extra = []) => {
    const st = full(s);
    const p = [];
    const c = rgb(st.color || '#000000');
    if (c) p.push(c);
    if (st.dash) p.push('dashed');
    if (st.width && Math.abs(st.width - baseWidth) > 1e-9) p.push(`linewidth(${f3(st.width * PT_PER_PX)})`);
    p.push(...extra);
    return p.length ? ', ' + p.join('+') : '';
  };

  const used = new Set();
  const vname = new Map();
  for (const s of visible) if (k.get(s.id) === 'point') vname.set(s.id, varName(s.name, used));
  for (const s of visible) if (k.get(s.id) === 'mark' || ['segment', 'circle'].includes(s.type)) for (const a of s.args) {
    if (!vname.has(a) && vals.get(a) && k.get(a) === 'point') vname.set(a, varName(stepById(doc, a)?.name || a, used));
  }
  const ref = (id) => vname.get(id);
  const centerOf = new Map();
  for (const s of doc.steps) if (s.type === 'center' && !centerOf.has(s.args[0])) centerOf.set(s.args[0], s.id);
  const autoDirs = autoLabelDirs(doc, vals);
  const out = { pairs: [], fills: [], circles: [], lines: [], marks: [], dots: [] };
  for (const [id, n] of vname) out.pairs.push(`pair ${n} = ${xy(vals.get(id))};${stepById(doc, id)?.hidden ? ' // điểm ẩn' : ''}`);

  for (const s of visible) {
    const v = vals.get(s.id);
    const st = full(s);
    const kind = k.get(s.id);
    if (kind === 'circle') {
      const cId = s.type === 'circle' || s.type === 'circle_radius' ? s.args[0] : centerOf.get(s.id);
      const cAt = cId && vname.has(cId) ? cId : [...vname.keys()].find((id) => G.dist(vals.get(id), v.c) < 1e-9 * (1 + v.r));
      const center = cAt ? ref(cAt) : xy(v.c);
      if ((st.fill || 0) > 0) out.fills.push(`fill(circle(${center}, ${f3(v.r)}), ${rgb(st.fillColor || st.color || '#000000') || 'black'}+opacity(${f3(st.fill)}));`);
      out.circles.push(`draw(circle(${center}, ${f3(v.r)})${pen(s)}); // ${s.name || ''}`);
    } else if (kind === 'line') {
      const sub = s.type === 'segment' ? 'segment' : s.type === 'ray' ? 'ray' : v.sub;
      if (sub === 'segment' && s.type === 'segment') out.lines.push(`draw(${ref(s.args[0])}--${ref(s.args[1])}${pen(s)});`);
      else if (sub === 'segment') out.lines.push(`draw(${xy(v.p)}--${xy(G.add(v.p, v.d))}${pen(s)});`);
      else {
        const rg = opts.trimLines ? G.trimmedRange(v, sub, visible.filter((x) => k.get(x.id) === 'point').map((x) => vals.get(x.id)), 1e-9 * (box.x2 - box.x1), cm(0.35), cm(1.1)) : null;
        const seg = rg ? [G.add(v.p, G.mul(v.d, rg[0])), G.add(v.p, G.mul(v.d, rg[1]))] : clipLine(v, box, sub === 'ray' ? 0 : -Infinity);
        if (seg) out.lines.push(`draw(${sub === 'ray' && s.type === 'ray' ? ref(s.args[0]) : xy(seg[0])}--${xy(seg[1])}${pen(s)}); // ${sub === 'ray' ? 'tia' : 'đường thẳng'} ${s.name || ''}`);
      }
    } else if (s.type === 'polygon') {
      const path = s.args.map(ref).join('--') + '--cycle';
      out.fills.push(`fill(${path}, ${rgb(st.fillColor || st.color || '#000000') || 'black'}+opacity(${f3(st.fill ?? 0.1)}));`);
      if (st.border) out.lines.push(`draw(${path}${pen(s)});`);
    } else if (s.type === 'angle_mark') {
      const { A, B, C } = v;
      const a1 = Math.atan2(A.y - B.y, A.x - B.x);
      let diff = Math.atan2(C.y - B.y, C.x - B.x) - a1;
      while (diff <= -Math.PI) diff += 2 * Math.PI;
      while (diff > Math.PI) diff -= 2 * Math.PI;
      const deg = (r) => f3((r * 180) / Math.PI);
      const r0 = cm(0.45);
      const p = pen(s);
      if (Math.abs(Math.abs(diff) - Math.PI / 2) < 1e-6 && (s.style || {}).right !== false) {
        const r = r0 * 0.7;
        out.marks.push(`draw(${ref(s.args[1])}+${f3(r)}*dir(${deg(a1)})--${ref(s.args[1])}+${f3(r)}*dir(${deg(a1)})+${f3(r)}*dir(${deg(a1 + diff)})--${ref(s.args[1])}+${f3(r)}*dir(${deg(a1 + diff)})${p}); // góc vuông`);
      } else {
        const n = Math.max(1, Math.min(4, st.arcs || 1));
        for (let i = 0; i < n; i++) out.marks.push(`draw(arc(${ref(s.args[1])}, ${f3(r0 + i * cm(0.09))}, ${deg(a1)}, ${deg(a1 + diff)})${p});`);
      }
    } else if (s.type === 'segment_mark') {
      const { A, B } = v;
      const L = G.dist(A, B);
      const u = { x: (B.x - A.x) / L, y: (B.y - A.y) / L }, nn = { x: -u.y, y: u.x };
      const M = G.mid(A, B);
      const kk = Math.max(1, Math.min(4, st.ticks || 1));
      const h = cm(0.13), gap = cm(0.08);
      for (let i = 0; i < kk; i++) {
        const off = (i - (kk - 1) / 2) * gap;
        const c = { x: M.x + off * u.x, y: M.y + off * u.y };
        out.marks.push(`draw(${xy({ x: c.x - h * nn.x, y: c.y - h * nn.y })}--${xy({ x: c.x + h * nn.x, y: c.y + h * nn.y })}${pen(s)});`);
      }
    } else if (v.kind === 'locus') {
      const W = box.x2 - box.x1, inBox = (p) => p && p.x > box.x1 - W && p.x < box.x2 + W && p.y > box.y1 - W && p.y < box.y2 + W;
      let run = [];
      const flush = () => { if (run.length > 1) out.lines.push(`draw(${run.map(xy).join('--')}${pen(s)}); // quỹ tích`); run = []; };
      for (const p of v.closed ? [...v.pts, v.pts[0]] : v.pts) { if (inBox(p)) run.push(p); else flush(); }
      flush();
    } else if (kind === 'point') {
      const dir = st.labelOffset || (autoDirs.get(s.id) ? [autoDirs.get(s.id).x, autoDirs.get(s.id).y] : [1, 1]);
      const ang = f3((Math.atan2(dir[1], dir[0]) * 180) / Math.PI);
      const lbl = st.showLabel !== false && s.name ? `"${texLabel(s.name)}", ` : '';
      // điểm rỗng (bộ đơn sắc): vòng tròn nét viền, ruột trắng
      const c = rgb((st.hollow ? st.color : st.fillColor || st.color) || '#000000');
      out.dots.push(`dot(${lbl}${ref(s.id)}, ${lbl ? `dir(${ang}), ` : ''}${c ? c + ', ' : ''}${st.hollow ? 'FillDraw(white)' : 'Fill'});`);
    }
  }

  const L = [];
  L.push(`// ${doc.title ? doc.title + ' — ' : ''}xuất từ TyphoonDelta Geometry`);
  L.push('// Asymptote thuần; trên AoPS dán giữa [asy] và [/asy]. Đổi kích thước: sửa unitsize.');
  L.push(`unitsize(${f3(unit)}cm);`);
  L.push(`defaultpen(fontsize(10pt)+linewidth(${f3(baseWidth * PT_PER_PX)}));`);
  L.push('dotfactor = 5;');
  const sec = (title, arr) => { if (arr.length) { L.push(`// ${title}`); L.push(...arr); } };
  sec('Toạ độ các điểm', out.pairs);
  sec('Tô nền', out.fills);
  sec('Đường tròn', out.circles);
  sec('Đường thẳng, đoạn thẳng, tia', out.lines);
  sec('Đánh dấu góc, đoạn bằng nhau', out.marks);
  sec('Điểm và nhãn', out.dots);
  return L.join('\n') + '\n';
}
