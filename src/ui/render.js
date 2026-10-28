// Vẽ hình bằng JSXGraph. JSXGraph CHỈ dùng làm lớp hiển thị (và pan/zoom): toạ độ mọi đối tượng
// do lõi (src/core) tính; các phần tử JSXGraph đọc toạ độ qua hàm từ bảng giá trị hiện tại.

import { kinds } from '../core/model.js';
import { styleOf } from './styles.js';
import { autoLabelDirs } from '../core/labels.js';

export const LABEL_DIST = 13; // px từ tâm điểm tới tâm nhãn

/* global JXG */

const HALO = '#60a5fa';
const RELATION = '#f59e0b';

/** Chuỗi HTML cho nhãn: chữ số cuối thành chỉ số dưới (A1 → A₁). */
export function labelHTML(name) {
  if (!name) return '';
  const esc = name.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const m = /^(.*?)(\d+)('*)$/.exec(esc);
  return m && m[1] ? `${m[1]}<sub>${m[2]}</sub>${m[3]}` : esc;
}

export class Renderer {
  constructor(board) {
    this.board = board;
    this.values = new Map();
    this.els = new Map(); // id → mảng phần tử JSXGraph của đối tượng
    this.extra = []; // phần tử tạm (xem trước, tô sáng quan hệ)
    this.scale = 1; // hệ số phóng nét/chữ (chế độ trình chiếu)
  }

  val(id) {
    return this.values.get(id);
  }

  clear() {
    for (const arr of this.els.values()) for (const e of arr.slice().reverse()) this.board.removeObject(e);
    this.els.clear();
  }

  /**
   * Dựng lại toàn bộ phần tử.
   * opts.visible: Set id được phép hiện (chế độ trình bày) hoặc null = tất cả
   * opts.selected: Set id đang chọn; opts.highlight: Set id tô sáng (kết quả khám phá)
   */
  rebuild(doc, values, opts = {}) {
    const b = this.board;
    b.suspendUpdate();
    this.clear();
    this.values = values;
    this.doc = doc;
    const k = kinds(doc);
    const visible = opts.visible || null;
    const selected = opts.selected || new Set();
    const highlight = opts.highlight || new Set();
    this.autoDirs = autoLabelDirs(doc, values, (s) => !s.hidden && (!visible || visible.has(s.id)));
    this.labelOffsets = new Map();
    // Thứ tự vẽ: miền tô → đường tròn → đường → đánh dấu → điểm (điểm luôn ở trên)
    const order = { polygon: 0, circle: 1, line: 2, mark: 3, point: 4 };
    const steps = doc.steps
      .filter((s) => !s.hidden && (!visible || visible.has(s.id)))
      .map((s) => ({ s, kind: k.get(s.id) }))
      .sort((a, b2) => (order[a.s.type === 'polygon' ? 'polygon' : a.kind] ?? 3) - (order[b2.s.type === 'polygon' ? 'polygon' : b2.kind] ?? 3));
    for (const { s, kind } of steps) {
      const st = styleOf(s, kind);
      const sel = selected.has(s.id);
      const hl = highlight.has(s.id);
      try {
        const arr = this.create(s, kind, st, sel, hl);
        this.els.set(s.id, arr);
      } catch (e) {
        console.warn('Không vẽ được', s, e);
      }
    }
    b.unsuspendUpdate();
    this.refreshVisibility();
  }

  /** Cập nhật toạ độ sau khi kéo (không dựng lại phần tử). */
  update(values) {
    this.values = values;
    this.refreshVisibility();
    this.board.update();
  }

  refreshVisibility() {
    for (const [id, arr] of this.els) {
      const ok = !!this.values.get(id);
      for (const e of arr) {
        if (e._hideAlways) continue;
        if (e.visProp.visible !== ok) e.setAttribute({ visible: ok });
      }
    }
  }

  // ---------- tạo phần tử ----------
  fx(fn) {
    return () => {
      const v = fn();
      return v == null || !Number.isFinite(v) ? NaN : v;
    };
  }

  helperPoint(fx, fy) {
    const p = this.board.create('point', [fx, fy], { visible: false, fixed: true, withLabel: false, name: '' });
    p._hideAlways = true;
    return p;
  }

  create(s, kind, st, sel, hl) {
    const id = s.id;
    const b = this.board;
    const sc = this.scale;
    const color = hl ? RELATION : st.color;
    const width = (st.width || 1.6) * sc * (hl ? 1.8 : 1);
    const common = { fixed: true, highlight: false, withLabel: false, name: '' };
    const out = [];
    const V = () => this.values.get(id);

    if (kind === 'point') {
      const size = (st.size || 3) * sc * (hl ? 1.4 : 1);
      if (sel) {
        out.push(b.create('point', [this.fx(() => V()?.x), this.fx(() => V()?.y)], {
          ...common, size: size + 6 * sc, strokeColor: HALO, fillColor: HALO, fillOpacity: 0.35, strokeOpacity: 0.6,
        }));
      }
      const dir = this.autoDirs?.get(id) || { x: 0.7, y: 0.7 };
      const off = st.labelOffset || [Math.round(dir.x * LABEL_DIST), Math.round(dir.y * LABEL_DIST)];
      this.labelOffsets.set(id, off);
      const p = b.create('point', [this.fx(() => V()?.x), this.fx(() => V()?.y)], {
        ...common,
        name: st.showLabel ? labelHTML(s.name) : '',
        withLabel: !!st.showLabel,
        size,
        face: 'o',
        strokeColor: hl ? RELATION : st.color,
        strokeWidth: 1 * sc,
        fillColor: hl ? RELATION : st.fillColor || st.color,
        label: {
          offset: off.map((v) => v * sc),
          anchorX: 'middle',
          anchorY: 'middle',
          fontSize: Math.round(16 * sc),
          strokeColor: hl ? '#b45309' : st.labelColor || '#111827',
          cssClass: 'pt-label', highlightCssClass: 'pt-label', highlight: false,
        },
      });
      p._stepId = id;
      out.push(p);
      return out;
    }

    if (kind === 'line') {
      const p1 = this.helperPoint(this.fx(() => V()?.p.x), this.fx(() => V()?.p.y));
      const p2 = this.helperPoint(this.fx(() => V() && V().p.x + V().d.x), this.fx(() => V() && V().p.y + V().d.y));
      out.push(p1, p2);
      const subt = s.type === 'segment' ? 'segment' : s.type === 'ray' ? 'ray' : null;
      const sub = subt || this.values.get(id)?.sub || 'line';
      const attrs = {
        ...common,
        straightFirst: sub === 'line',
        straightLast: sub !== 'segment',
        strokeColor: color,
        strokeWidth: width,
        dash: st.dash ? 2 : 0,
        withLabel: !!st.showLabel,
        name: st.showLabel ? labelHTML(s.name) : '',
        label: { fontSize: Math.round(15 * sc), strokeColor: color },
      };
      if (sel) out.push(b.create('line', [p1, p2], { ...attrs, strokeColor: HALO, strokeWidth: width + 7 * sc, strokeOpacity: 0.45, dash: 0, withLabel: false, name: '' }));
      out.push(b.create('line', [p1, p2], attrs));
      return out;
    }

    if (kind === 'circle') {
      const c = this.helperPoint(this.fx(() => V()?.c.x), this.fx(() => V()?.c.y));
      out.push(c);
      const r = () => V()?.r ?? NaN;
      const attrs = {
        ...common,
        strokeColor: color,
        strokeWidth: width,
        dash: st.dash ? 2 : 0,
        fillColor: st.fillColor || st.color,
        fillOpacity: st.fill || 0,
        withLabel: !!st.showLabel,
        name: st.showLabel ? labelHTML(s.name) : '',
        label: { fontSize: Math.round(15 * sc), strokeColor: color },
      };
      if (sel) out.push(b.create('circle', [c, r], { ...attrs, strokeColor: HALO, strokeWidth: width + 7 * sc, strokeOpacity: 0.45, fillOpacity: 0, dash: 0, withLabel: false, name: '' }));
      out.push(b.create('circle', [c, r], attrs));
      return out;
    }

    // ---- đánh dấu ----
    if (s.type === 'polygon') {
      const pts = s.args.map((_, i) => this.helperPoint(this.fx(() => V()?.pts[i].x), this.fx(() => V()?.pts[i].y)));
      out.push(...pts);
      const poly = b.create('polygon', pts, {
        ...common,
        fillColor: st.fillColor || color,
        fillOpacity: sel ? Math.min(1, (st.fill ?? 0.12) + 0.15) : st.fill ?? 0.12,
        borders: { visible: !!st.border, strokeColor: color, strokeWidth: width, highlight: false, fixed: true },
        vertices: { visible: false },
        hasInnerPoints: false,
      });
      out.push(poly);
      return out;
    }

    if (s.type === 'angle_mark' || s.type === 'segment_mark') {
      const curve = b.create('curve', [[0], [0]], {
        ...common, strokeColor: sel ? HALO : color, strokeWidth: width * (sel ? 1.8 : 1),
      });
      const self = this;
      curve.updateDataArray = function () {
        const v = V();
        const pathOut = v ? (s.type === 'angle_mark' ? angleMarkPath(v, st, self.pxToUser(), sc) : segMarkPath(v, st, self.pxToUser(), sc)) : [[], []];
        this.dataX = pathOut[0];
        this.dataY = pathOut[1];
      };
      out.push(curve);
      return out;
    }
    return out;
  }

  /** Số đơn vị người dùng ứng với 1 pixel. */
  pxToUser() {
    return 1 / this.board.unitX;
  }

  // ---------- phần tử tạm ----------
  clearExtra() {
    for (const e of this.extra.slice().reverse()) this.board.removeObject(e);
    this.extra = [];
  }

  addExtra(type, parents, attrs) {
    const e = this.board.create(type, parents, { fixed: true, highlight: false, withLabel: false, name: '', ...attrs });
    this.extra.push(e);
    return e;
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
