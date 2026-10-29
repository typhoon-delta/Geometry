// Vẽ hình lên canvas (thay cho JSXGraph từ phiên bản 1.1 – xem BAO_CAO.md, mục hiệu năng).
// Toạ độ mọi đối tượng do lõi tính; ở đây chỉ chuyển sang toạ độ màn hình và vẽ.
// Kiểu (màu, nét, cỡ) được tính sẵn một lần trong setScene(); khi kéo điểm chỉ việc vẽ lại.

import { kinds } from '../core/model.js';
import { parseLabel, labelHTML } from '../core/names.js';
import { placeLabels } from '../core/labels.js';
import { styleOf } from '../core/styles.js';
import { trimmedRange } from '../core/geom.js';

export { labelHTML };
// Khoảng cách tâm điểm → tâm nhãn và cỡ chữ nhãn theo bộ kiểu (đơn sắc: nhãn nhỏ, đặt sát điểm)
const LABEL = { mono: { font: 15 }, textbook: { font: 16 } };
export const LABEL_DIST = 11;
const HALO = 'rgba(96,165,250,0.45)';
const RELATION = '#f59e0b';
const GHOST = '#e4e4e7';
const LABEL_FONT = "'Times New Roman', 'Nimbus Roman', 'Liberation Serif', 'TeX Gyre Termes', Times, serif";

export class Renderer {
  constructor(view) {
    this.view = view;
    this.values = new Map();
    this.items = []; // [{s, kind, st, sel, hl}] theo thứ tự vẽ
    this.extra = []; // phần tử tạm: xem trước khi dựng, đường phụ của quan hệ đang tô sáng
    this.scale = 1; // hệ số phóng nét/chữ (chế độ trình chiếu)
    this.grid = false;
    this.trimLines = true; // đường thẳng/tia "vừa đủ" kiểu sách (xem geom.trimmedRange)
    this.ghostLines = false; // đang dựng: vẽ mờ phần kéo dài để thấy (và bấm được) mọi chỗ cắt
    this.lineRanges = new Map(); // id → [t0, t1] khoảng tham số đang vẽ của đường thẳng/tia (để chọn bằng chuột)
    this.labelOffsets = new Map(); // id → [dx, dy] px (y hướng lên), chưa nhân scale
    this.labelBoxes = new Map(); // id → {x, y, w, h} toạ độ màn hình (để kéo nhãn)
    this.drawnIds = new Set();
    view.painter = (ctx, v) => this.draw(ctx, v);
    view.onViewChange(() => this.onViewChange());
  }

  /**
   * Thiết lập cảnh (sau mỗi thay đổi tài liệu, chọn, chế độ…).
   * opts.visible: Set id được hiện (chế độ trình bày) hoặc null = tất cả
   * opts.selected, opts.highlight: Set id
   */
  setScene(doc, values, opts = {}) {
    this.doc = doc;
    this.values = values;
    const k = kinds(doc);
    const visible = opts.visible || null;
    const selected = opts.selected || new Set();
    const highlight = opts.highlight || new Set();
    const theme = (this.theme = opts.theme || 'mono');
    this.imageStore = opts.images || null;
    this.imageSel = opts.imageSel || null;
    const order = { polygon: 0, circle: 1, line: 2, mark: 3, point: 4 };
    const layer = (s, kind) => order[s.type === 'polygon' ? 'polygon' : kind] ?? 3;
    this.items = doc.steps
      .filter((s) => !s.hidden && (!visible || visible.has(s.id)))
      .map((s) => {
        const kind = k.get(s.id);
        return { s, kind, st: styleOf(s, kind, theme), sel: selected.has(s.id), hl: highlight.has(s.id), layer: layer(s, kind) };
      })
      .sort((a, b) => a.layer - b.layer);
    // vị trí nhãn tự động: việc tương đối nặng → chỉ làm ở đây (không làm khi đang kéo)
    this.computeLabels();
    this.view.requestDraw();
  }

  /**
   * Đặt nhãn điểm theo khung chữ thật trên màn hình (placeLabels): tránh đường cắt qua nhãn, nhãn đè điểm
   * (kể cả chính điểm của nó với nhãn rộng như I_A), nhãn đè nhau. Nhãn người dùng đã kéo giữ nguyên.
   * Kết quả là độ dời [dx, dy] (px, y hướng lên, chưa nhân hệ số trình chiếu) như labelOffset.
   */
  computeLabels() {
    const view = this.view, sc = this.scale, V = this.values;
    const fontPx = (LABEL[this.theme] || LABEL.mono).font * sc;
    const ctx = view.ctx;
    const curves = [], pts = [], fixed = [];
    this.labelOffsets = new Map();
    const trimPts = this.trimPoints();
    for (const it of this.items) {
      const v = V.get(it.s.id);
      if (!v) continue;
      if (it.kind === 'line') {
        const seg = lineSeg(view, v, it.s.type === 'segment' ? 'segment' : it.s.type === 'ray' ? 'ray' : v.sub, trimPts);
        if (seg) curves.push({ kind: 'seg', x1: seg[0].x, y1: seg[0].y, x2: seg[1].x, y2: seg[1].y });
      } else if (it.kind === 'circle') {
        const c = view.toScreen(v.c);
        curves.push({ kind: 'circle', cx: c.x, cy: c.y, r: v.r * view.scale });
      }
    }
    for (const it of this.items) {
      if (it.kind !== 'point' || !it.st.showLabel || !it.s.name) continue;
      const v = V.get(it.s.id);
      if (!v) continue;
      const p = view.toScreen(v);
      const m = measureLabel(ctx, it.s.name, fontPx);
      const h = (0.45 + (m.sub ? 0.68 : 0.42)) * fontPx, w = m.w + 1;
      const delta = (m.sub ? 0.115 : -0.015) * fontPx; // tâm khung chữ = tâm dòng chữ (cy) + delta
      if (it.st.labelOffset) {
        const o = it.st.labelOffset;
        this.labelOffsets.set(it.s.id, o);
        const cy = p.y - o[1] * sc;
        fixed.push({ x: p.x + o[0] * sc - w / 2, y: cy + delta - h / 2, w, h });
        continue;
      }
      pts.push({ id: it.s.id, x: p.x, y: p.y, w, h, r: (it.st.size || 3) * sc, delta });
    }
    const res = placeLabels(pts, curves, fixed, { W: view.W, H: view.H, gap: 2 * sc });
    for (const p of pts) {
      const d = res.get(p.id);
      this.labelOffsets.set(p.id, [round1(d.dx / sc), round1(-(d.dy - p.delta) / sc)]);
    }
    this.labelScale = view.scale;
  }

  /** Ảnh dán vào hình: vẽ dưới mọi đối tượng hình học, theo toạ độ hình; ảnh đang chọn có khung và ô đổi cỡ. */
  drawImages(ctx, view) {
    const list = this.doc && this.doc.images;
    if (!list || !list.length || !this.imageStore) return;
    for (const im of list) {
      const rec = this.imageStore.get(im.id);
      const a = view.toScreen({ x: im.x, y: im.y });
      const w = im.w * view.scale, h = im.h * view.scale;
      if (rec && rec.ready) {
        ctx.globalAlpha = im.opacity ?? 1;
        ctx.drawImage(rec.img, a.x, a.y, w, h);
        ctx.globalAlpha = 1;
      }
      if (im.id === this.imageSel) {
        setStroke(ctx, '#2563eb', 1.5, true);
        ctx.strokeRect(a.x, a.y, w, h);
        ctx.setLineDash([]);
        ctx.fillStyle = '#2563eb';
        ctx.fillRect(a.x + w - 5, a.y + h - 5, 10, 10);
      }
    }
  }

  /** Toạ độ màn hình của các điểm đang hiện (để vẽ đường thẳng vừa đủ qua chúng), hoặc null nếu tắt chế độ này. */
  trimPoints() {
    if (!this.trimLines) return null;
    const out = [];
    for (const it of this.items) if (it.kind === 'point') { const v = this.values.get(it.s.id); if (v) out.push(this.view.toScreen(v)); }
    return out;
  }

  /** Phóng to/thu nhỏ làm khoảng cách giữa các đường đổi → đặt lại nhãn (gom lại, không làm mỗi khung). */
  onViewChange() {
    if (!this.labelScale || Math.abs(this.view.scale / this.labelScale - 1) < 0.04) return;
    clearTimeout(this.relabelTimer);
    this.relabelTimer = setTimeout(() => { this.computeLabels(); this.view.requestDraw(); }, 120);
  }

  /** Toạ độ đã đổi (đang kéo): chỉ cần vẽ lại. */
  update(values) {
    this.values = values;
    this.view.requestDraw();
  }

  clearExtra() {
    this.extra = [];
    this.view.requestDraw();
  }

  /** spec: {type:'segment'|'line'|'ray'|'circle'|'circle3'|'point', pts:[() => {x,y}], style} */
  addExtra(spec) {
    this.extra.push(spec);
    this.view.requestDraw();
    return spec;
  }

  setLabelOffset(id, off) {
    this.labelOffsets.set(id, off);
    this.view.requestDraw();
  }

  // ================= vẽ =================
  draw(ctx, view) {
    const sc = this.scale;
    const V = this.values;
    this.drawnIds = new Set();
    this.labelBoxes = new Map();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (this.grid) drawGrid(ctx, view);
    this.drawImages(ctx, view);
    const labels = [];
    const trimPts = this.trimPoints();
    this.lineRanges = new Map();
    for (const it of this.items) {
      const v = V.get(it.s.id);
      if (!v) continue;
      this.drawnIds.add(it.s.id);
      const { s, kind, st, sel, hl } = it;
      const color = hl ? RELATION : st.color;
      const width = (st.width || 1) * sc * (hl ? 1.8 : 1);
      if (kind === 'line') {
        const sub = s.type === 'segment' ? 'segment' : s.type === 'ray' ? 'ray' : v.sub;
        const seg = lineSeg(view, v, sub, trimPts, this.lineRanges, s.id);
        if (this.ghostLines && this.lineRanges.has(s.id)) strokeSeg(ctx, screenLine(view, v, sub), GHOST, 1 * sc, false);
        if (sel) strokeSeg(ctx, seg, HALO, width + 7 * sc, false);
        strokeSeg(ctx, seg, color, width, st.dash);
        if (st.showLabel && s.name) labels.push({ id: s.id, name: s.name, at: segLabelPos(seg, sub), color, off: [0, 10] });
      } else if (kind === 'circle') {
        const c = view.toScreen(v.c), r = v.r * view.scale;
        if (st.fill) fillCircle(ctx, c, r, st.fillColor || st.color, st.fill);
        if (sel) strokeCircle(ctx, c, r, HALO, width + 7 * sc, false);
        strokeCircle(ctx, c, r, color, width, st.dash);
        if (st.showLabel && s.name) labels.push({ id: s.id, name: s.name, at: { x: c.x + r * 0.707, y: c.y - r * 0.707 }, color, off: [8, 8] });
      } else if (s.type === 'polygon') {
        const pts = v.pts.map((p) => view.toScreen(p));
        ctx.beginPath();
        pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
        ctx.closePath();
        ctx.globalAlpha = sel ? Math.min(1, (st.fill ?? 0.12) + 0.15) : st.fill ?? 0.12;
        ctx.fillStyle = st.fillColor || color;
        ctx.fill();
        ctx.globalAlpha = 1;
        if (st.border) { ctx.strokeStyle = color; ctx.lineWidth = width; ctx.setLineDash([]); ctx.stroke(); }
      } else if (s.type === 'angle_mark' || s.type === 'segment_mark') {
        const px = 1 / view.scale;
        const [X, Y] = s.type === 'angle_mark' ? angleMarkPath(v, st, px, sc) : segMarkPath(v, st, px, sc);
        strokePath(ctx, view, X, Y, sel ? '#60a5fa' : color, width * (sel ? 1.8 : 1));
      } else if (kind === 'point') {
        const p = view.toScreen(v);
        const size = (st.size || 3) * sc * (hl ? 1.4 : 1);
        if (sel) { ctx.beginPath(); ctx.arc(p.x, p.y, size + 6 * sc, 0, 2 * Math.PI); ctx.fillStyle = HALO; ctx.fill(); }
        drawPoint(ctx, p, size, hl ? RELATION : st.color, hl ? RELATION : st.fillColor || st.color, sc, st.hollow && !hl);
        if (st.showLabel && s.name) labels.push({ id: s.id, name: s.name, at: p, color: hl ? '#b45309' : st.labelColor || '#111827', off: this.labelOffsets.get(s.id) || [9, 9], point: true });
      }
    }
    for (const e of this.extra) drawExtra(ctx, view, e, sc);
    const fontPx = (LABEL[this.theme] || LABEL.mono).font * sc;
    for (const L of labels) {
      const box = drawLabel(ctx, L.name, L.at.x + L.off[0] * sc, L.at.y - L.off[1] * sc, fontPx, L.color);
      if (L.point) this.labelBoxes.set(L.id, box);
    }
  }
}

const round1 = (v) => Math.round(v * 10) / 10;

// ================= các hàm vẽ =================
function setStroke(ctx, color, width, dash) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.setLineDash(dash ? [6, 4] : []);
}

/** Cắt đường p + t·d theo hình chữ nhật (toạ độ màn hình). tMin = 0 cho tia. */
function clip(p, d, x1, y1, x2, y2, tMin = -Infinity, tMax = Infinity) {
  let t0 = tMin, t1 = tMax;
  for (const [pp, dd, lo, hi] of [[p.x, d.x, x1, x2], [p.y, d.y, y1, y2]]) {
    if (Math.abs(dd) < 1e-12) { if (pp < lo || pp > hi) return null; continue; }
    let a = (lo - pp) / dd, b = (hi - pp) / dd;
    if (a > b) [a, b] = [b, a];
    t0 = Math.max(t0, a);
    t1 = Math.min(t1, b);
  }
  return t0 < t1 ? [t0, t1] : null;
}

function screenLine(view, v, sub) {
  const p = view.toScreen(v.p);
  const q = view.toScreen({ x: v.p.x + v.d.x, y: v.p.y + v.d.y });
  const d = { x: q.x - p.x, y: q.y - p.y };
  const m = 20;
  const r = clip(p, d, -m, -m, view.W + m, view.H + m, sub === 'line' ? -Infinity : 0, sub === 'segment' ? 1 : Infinity);
  if (!r) return null;
  return [{ x: p.x + r[0] * d.x, y: p.y + r[0] * d.y }, { x: p.x + r[1] * d.x, y: p.y + r[1] * d.y }];
}

/**
 * Đoạn màn hình cần vẽ của đường thẳng/tia/đoạn v. Chế độ "vừa đủ" (trimPts ≠ null): đường thẳng/tia chỉ vẽ qua các
 * điểm nằm trên nó, nhô ra 22–70 px mỗi đầu; đường có ít hơn 2 điểm thì vẽ tới mép như cũ. Ghi khoảng tham số đã vẽ
 * vào ranges (để bấm chọn chỉ trúng phần đang thấy).
 */
function lineSeg(view, v, sub, trimPts, ranges = null, id = null) {
  if (trimPts && sub !== 'segment') {
    const p = view.toScreen(v.p), q = view.toScreen({ x: v.p.x + v.d.x, y: v.p.y + v.d.y });
    const d = { x: q.x - p.x, y: q.y - p.y };
    const rg = trimmedRange({ p, d }, sub, trimPts, 0.75, 22, 70);
    if (rg) {
      if (ranges) ranges.set(id, rg);
      const m = 20;
      const r = clip(p, d, -m, -m, view.W + m, view.H + m, rg[0], rg[1]);
      return r ? [{ x: p.x + r[0] * d.x, y: p.y + r[0] * d.y }, { x: p.x + r[1] * d.x, y: p.y + r[1] * d.y }] : null;
    }
  }
  return screenLine(view, v, sub);
}

function strokeSeg(ctx, seg, color, width, dash) {
  if (!seg) return;
  setStroke(ctx, color, width, dash);
  ctx.beginPath();
  ctx.moveTo(seg[0].x, seg[0].y);
  ctx.lineTo(seg[1].x, seg[1].y);
  ctx.stroke();
}

function segLabelPos(seg, sub) {
  if (!seg) return { x: -1e4, y: -1e4 };
  const t = sub === 'segment' ? 0.5 : 0.85;
  return { x: seg[0].x + t * (seg[1].x - seg[0].x), y: seg[0].y + t * (seg[1].y - seg[0].y) };
}

function strokeLine(ctx, view, v, sub, color, width, dash) {
  const seg = screenLine(view, v, sub);
  if (!seg) return;
  setStroke(ctx, color, width, dash);
  ctx.beginPath();
  ctx.moveTo(seg[0].x, seg[0].y);
  ctx.lineTo(seg[1].x, seg[1].y);
  ctx.stroke();
}

function strokeCircle(ctx, c, r, color, width, dash) {
  if (!(r > 0) || r > 1e7) return;
  setStroke(ctx, color, width, dash);
  ctx.beginPath();
  ctx.arc(c.x, c.y, r, 0, 2 * Math.PI);
  ctx.stroke();
}

function fillCircle(ctx, c, r, color, alpha) {
  if (!(r > 0) || r > 1e7) return;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(c.x, c.y, r, 0, 2 * Math.PI);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawPoint(ctx, p, size, stroke, fill, sc, hollow) {
  ctx.beginPath();
  ctx.arc(p.x, p.y, size, 0, 2 * Math.PI);
  ctx.fillStyle = hollow ? '#ffffff' : fill;
  ctx.fill();
  ctx.setLineDash([]);
  ctx.lineWidth = Math.max(1, 1 * sc);
  ctx.strokeStyle = stroke;
  ctx.stroke();
}

/** Đường gấp khúc trong toạ độ hình, ngắt tại NaN. */
function strokePath(ctx, view, X, Y, color, width) {
  setStroke(ctx, color, width, false);
  ctx.beginPath();
  let pen = false;
  for (let i = 0; i < X.length; i++) {
    if (!Number.isFinite(X[i])) { pen = false; continue; }
    const p = view.toScreen({ x: X[i], y: Y[i] });
    if (pen) ctx.lineTo(p.x, p.y);
    else { ctx.moveTo(p.x, p.y); pen = true; }
  }
  ctx.stroke();
}

function drawGrid(ctx, view) {
  if (view.scale < 6) return;
  const [x1, y1, x2, y2] = view.getBoundingBox();
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.setLineDash([]);
  ctx.beginPath();
  for (let x = Math.ceil(x1); x <= x2; x++) { const s = view.toScreen({ x, y: 0 }).x; ctx.moveTo(s, 0); ctx.lineTo(s, view.H); }
  for (let y = Math.ceil(y2); y <= y1; y++) { const s = view.toScreen({ x: 0, y }).y; ctx.moveTo(0, s); ctx.lineTo(view.W, s); }
  ctx.stroke();
}

/**
 * Vẽ nhãn kiểu công thức (serif nghiêng, chỉ số dưới, dấu phẩy) căn giữa tại (cx, cy).
 * Trả về khung bao {x, y, w, h} để bắt chuột.
 */
const labelCache = new Map(); // tên|cỡ chữ → kích thước đã đo (measureText tốn thời gian, chỉ đo một lần)

function measureLabel(ctx, name, fontPx) {
  const key = name + '|' + fontPx;
  let m = labelCache.get(key);
  if (m) return m;
  const { base, sub, primes } = parseLabel(name);
  const subPx = Math.round(fontPx * 0.68);
  m = { base, sub, pr: '′'.repeat(primes), fBase: `italic ${fontPx}px ${LABEL_FONT}`, fPr: `${fontPx}px ${LABEL_FONT}`, fSub: `italic ${subPx}px ${LABEL_FONT}` };
  ctx.font = m.fBase;
  m.wBase = ctx.measureText(base).width;
  ctx.font = m.fPr;
  m.wPr = m.pr ? ctx.measureText(m.pr).width : 0;
  ctx.font = m.fSub;
  m.wSub = sub ? ctx.measureText(sub).width + 1 : 0;
  m.w = m.wBase + m.wPr + m.wSub;
  if (labelCache.size > 2000) labelCache.clear();
  labelCache.set(key, m);
  return m;
}

/**
 * Vẽ nhãn kiểu công thức (serif nghiêng, chỉ số dưới, dấu phẩy) căn giữa tại (cx, cy).
 * Trả về khung bao {x, y, w, h} để bắt chuột.
 */
export function drawLabel(ctx, name, cx, cy, fontPx, color) {
  const m = measureLabel(ctx, name, fontPx);
  const x0 = cx - m.w / 2;
  const baseline = cy + fontPx * 0.33;
  ctx.fillStyle = color;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.font = m.fBase;
  ctx.fillText(m.base, x0, baseline);
  if (m.pr) { ctx.font = m.fPr; ctx.fillText(m.pr, x0 + m.wBase, baseline); }
  if (m.sub) { ctx.font = m.fSub; ctx.fillText(m.sub, x0 + m.wBase + m.wPr + 0.5, baseline + fontPx * 0.22); }
  return { x: x0 - 2, y: cy - fontPx * 0.6, w: m.w + 4, h: fontPx * 1.25 };
}

function drawExtra(ctx, view, e, sc) {
  const P = e.pts.map((f) => f());
  if (P.some((p) => !p || !Number.isFinite(p.x) || !Number.isFinite(p.y))) return;
  const st = { color: '#9ca3af', width: 1.5, dash: true, ...(e.style || {}) };
  const w = st.width * sc;
  if (e.type === 'segment' || e.type === 'line' || e.type === 'ray') {
    const d = { x: P[1].x - P[0].x, y: P[1].y - P[0].y };
    if (Math.hypot(d.x, d.y) < 1e-12) return;
    strokeLine(ctx, view, { p: P[0], d }, e.type, st.color, w, st.dash);
  } else if (e.type === 'circle') {
    strokeCircle(ctx, view.toScreen(P[0]), Math.hypot(P[1].x - P[0].x, P[1].y - P[0].y) * view.scale, st.color, w, st.dash);
  } else if (e.type === 'circle3') {
    const [A, B, C] = P;
    const d = 2 * (A.x * (B.y - C.y) + B.x * (C.y - A.y) + C.x * (A.y - B.y));
    if (Math.abs(d) < 1e-12) return;
    const a2 = A.x * A.x + A.y * A.y, b2 = B.x * B.x + B.y * B.y, c2 = C.x * C.x + C.y * C.y;
    const O = { x: (a2 * (B.y - C.y) + b2 * (C.y - A.y) + c2 * (A.y - B.y)) / d, y: (a2 * (C.x - B.x) + b2 * (A.x - C.x) + c2 * (B.x - A.x)) / d };
    strokeCircle(ctx, view.toScreen(O), Math.hypot(A.x - O.x, A.y - O.y) * view.scale, st.color, w, st.dash);
  } else if (e.type === 'polyline') {
    setStroke(ctx, st.color, w, st.dash);
    ctx.beginPath();
    P.forEach((p, i) => { const q = view.toScreen(p); if (i) ctx.lineTo(q.x, q.y); else ctx.moveTo(q.x, q.y); });
    ctx.stroke();
  } else if (e.type === 'point') {
    drawPoint(ctx, view.toScreen(P[0]), (st.size || 7) * sc, st.color, st.fill || '#fde68a', sc);
  }
}

// Đường vẽ cung góc: arcs cung đồng tâm; góc vuông vẽ ô vuông.
export function angleMarkPath(v, st, px, sc = 1) {
  const { A, B, C } = v;
  const a1 = Math.atan2(A.y - B.y, A.x - B.x);
  let a2 = Math.atan2(C.y - B.y, C.x - B.x);
  let diff = a2 - a1;
  while (diff <= -Math.PI) diff += 2 * Math.PI;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  const X = [], Y = [];
  const r0 = 18 * sc * px * (st.radius || 1);
  const right = Math.abs(Math.abs(diff) - Math.PI / 2) < 1e-6 && st.right !== false;
  if (right) {
    const r = r0 * 0.75;
    const u = { x: Math.cos(a1), y: Math.sin(a1) }, w = { x: Math.cos(a1 + diff), y: Math.sin(a1 + diff) };
    X.push(B.x + r * u.x, B.x + r * (u.x + w.x), B.x + r * w.x);
    Y.push(B.y + r * u.y, B.y + r * (u.y + w.y), B.y + r * w.y);
    return [X, Y];
  }
  const n = Math.max(1, Math.min(4, st.arcs || 1));
  for (let k = 0; k < n; k++) {
    const r = r0 + k * 4 * sc * px;
    const N = 24;
    for (let i = 0; i <= N; i++) {
      const t = a1 + (diff * i) / N;
      X.push(B.x + r * Math.cos(t));
      Y.push(B.y + r * Math.sin(t));
    }
    X.push(NaN);
    Y.push(NaN);
  }
  return [X, Y];
}

// Vạch đánh dấu đoạn bằng nhau: ticks vạch ngắn vuông góc tại trung điểm.
export function segMarkPath(v, st, px, sc = 1) {
  const { A, B } = v;
  const L = Math.hypot(B.x - A.x, B.y - A.y);
  const u = { x: (B.x - A.x) / L, y: (B.y - A.y) / L };
  const n = { x: -u.y, y: u.x };
  const M = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 };
  const k = Math.max(1, Math.min(4, st.ticks || 1));
  const h = 6 * sc * px, gap = 4 * sc * px;
  const X = [], Y = [];
  for (let i = 0; i < k; i++) {
    const off = (i - (k - 1) / 2) * gap;
    const c = { x: M.x + off * u.x, y: M.y + off * u.y };
    X.push(c.x - h * n.x, c.x + h * n.x, NaN);
    Y.push(c.y - h * n.y, c.y + h * n.y, NaN);
  }
  return [X, Y];
}
