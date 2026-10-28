// Ứng dụng: giữ tài liệu (danh sách bước dựng), lịch sử hoàn tác, công cụ, chế độ trình bày/trình chiếu.
// Mọi thay đổi hình đi qua commit() → lõi tính lại toạ độ → vẽ lại.

import { evaluate, makeUpdater, kinds, removeSteps, dependents, newId, nextName, stepById, clone, frames, emptyDoc, describe } from '../core/model.js';
import { STEP_TYPES, argAccepts } from '../core/steps.js';
import * as G from '../core/geom.js';
import { Renderer } from './render.js';
import { CanvasView } from './view.js';
import { TOOLS, TOOL_BY_ID } from './tools.js';
import { isDraggableType, PALETTE } from './styles.js';
import { confirmDialog, promptDialog, toast } from './dialog.js';
import { renderStepList, renderProps, renderToolOptions } from './panels.js';

const HISTORY_MAX = 200;

export class App {
  constructor() {
    this.doc = emptyDoc();
    this.values = new Map();
    this.undoStack = [];
    this.redoStack = [];
    this.selection = new Set();
    this.highlight = new Set();
    this.toolId = 'move';
    this.picks = [];
    this.tx = null; // ảnh chụp tài liệu khi bắt đầu một thao tác nhiều bước
    this.mode = 'edit'; // 'edit' | 'present'
    this.frameIdx = 0;
    this.projector = false;
    this.grid = false;
    this.mouse = { x: 0, y: 0 };
    this.markDefaults = { color: '#dc2626', arcs: 1, ticks: 1, polyColor: '#1d4ed8' };
    this.listeners = { change: [] };
  }

  // ================= khởi tạo =================
  mount() {
    this.view = new CanvasView(document.getElementById('board'));
    this.view.setBoundingBox([-8, 6, 8, -6]);
    this.renderer = new Renderer(this.view);
    this.stage = document.getElementById('stage');
    this.buildToolbar();
    this.bindPointer();
    this.bindKeys();
    this.bindButtons();
    this.setTool('move');
    this.refresh();
  }

  on(evt, fn) {
    (this.listeners[evt] ||= []).push(fn);
  }

  emit(evt) {
    for (const fn of this.listeners[evt] || []) fn(this);
  }

  // ================= tài liệu & lịch sử =================
  /** Thay toàn bộ tài liệu (mở file, link...). */
  loadDoc(doc, { keepHistory = false } = {}) {
    if (keepHistory) this.pushUndo(JSON.stringify(this.doc));
    else { this.undoStack = []; this.redoStack = []; }
    this.doc = clone(doc);
    this.selection.clear();
    this.highlight.clear();
    this.relation = null;
    this.cancelTool();
    if (doc.view && Array.isArray(doc.view.bbox)) this.view.setBoundingBox(doc.view.bbox);
    this.refresh();
    this.emit('load');
    this.emit('change');
  }

  pushUndo(snapshot) {
    this.undoStack.push(snapshot);
    if (this.undoStack.length > HISTORY_MAX) this.undoStack.shift();
    this.redoStack = [];
  }

  /** Thay đổi tài liệu như một bước hoàn tác được. mutate(doc) sửa trực tiếp doc. */
  commit(mutate) {
    const before = this.tx ?? JSON.stringify(this.doc);
    mutate(this.doc);
    if (!this.tx) this.pushUndo(before);
    this.afterChange();
  }

  afterChange() {
    for (const id of [...this.selection]) if (!stepById(this.doc, id)) this.selection.delete(id);
    if (this.relation && !this.relation.ids.every((id) => stepById(this.doc, id))) { this.relation = null; this.highlight.clear(); }
    this.refresh();
    this.emit('change');
  }

  beginTx() {
    if (!this.tx) this.tx = JSON.stringify(this.doc);
  }

  endTx() {
    if (this.tx) {
      if (this.tx !== JSON.stringify(this.doc)) this.pushUndo(this.tx);
      this.tx = null;
    }
  }

  undo() {
    this.cancelTool();
    if (!this.undoStack.length) return toast('Không còn gì để hoàn tác');
    this.redoStack.push(JSON.stringify(this.doc));
    this.doc = JSON.parse(this.undoStack.pop());
    this.afterChange();
  }

  redo() {
    this.cancelTool();
    if (!this.redoStack.length) return toast('Không còn gì để làm lại');
    this.undoStack.push(JSON.stringify(this.doc));
    this.doc = JSON.parse(this.redoStack.pop());
    this.afterChange();
  }

  /**
   * Thêm các bước từ đặc tả [{type,args,params,name,style}]. Đối số '$k' = id của bước thứ k vừa thêm.
   * Các bước sau bước đầu được gộp chung khung trình bày. Trả về danh sách id.
   */
  addSteps(specs, { join = true } = {}) {
    const ids = [];
    const k = kinds(this.doc);
    specs.forEach((sp, i) => {
      const def = STEP_TYPES[sp.type];
      const id = newId(this.doc);
      const args = sp.args.map((a) => (typeof a === 'string' && a.startsWith('$') ? ids[+a.slice(1)] : a));
      const kind = def.kind === 'same' ? k.get(args[0]) : def.kind;
      const step = { id, type: sp.type, args };
      if (sp.params && Object.keys(sp.params).length) step.params = { ...sp.params };
      if (kind !== 'mark') step.name = sp.name && !this.nameUsed(sp.name) ? sp.name : nextName(this.doc, kind, sp.name);
      if (sp.style) step.style = { ...sp.style };
      if (i > 0 && join) step.joinPrev = true;
      this.doc.steps.push(step);
      k.set(id, kind);
      ids.push(id);
    });
    return ids;
  }

  nameUsed(name, exceptId) {
    return this.doc.steps.some((s) => s.name === name && s.id !== exceptId);
  }

  // ================= tính toán & vẽ =================
  visibleSet() {
    if (this.mode !== 'present') return null;
    const fr = frames(this.doc);
    const set = new Set();
    for (let i = 0; i <= Math.min(this.frameIdx, fr.length - 1); i++) for (const id of fr[i]) set.add(id);
    return set;
  }

  refresh() {
    this.values = evaluate(this.doc);
    this.renderer.scale = this.projector ? 1.9 : 1;
    this.renderer.grid = this.grid;
    this.renderer.setScene(this.doc, this.values, {
      visible: this.visibleSet(),
      selected: this.mode === 'present' ? new Set() : this.selection,
      highlight: this.highlight,
    });
    this.renderer.clearExtra();
    this.drawRelationOverlay?.();
    this.renderPanels();
  }

  /** Cập nhật nhanh khi kéo: chỉ tính lại các bước phụ thuộc (nếu có bộ cập nhật), rồi vẽ lại. */
  quickUpdate() {
    if (this.dragUpdater) this.dragUpdater(this.values);
    else this.values = evaluate(this.doc);
    this.renderer.update(this.values);
  }

  renderPanels() {
    renderStepList(this);
    renderProps(this);
    renderToolOptions(this);
    document.getElementById('btn-undo').disabled = !this.undoStack.length;
    document.getElementById('btn-redo').disabled = !this.redoStack.length;
    this.updatePresentBar();
  }

  // ================= toạ độ & chọn đối tượng =================
  toScreen(P) {
    return this.view.toScreen(P);
  }

  toUser(sx, sy) {
    return this.view.toUser(sx, sy);
  }

  eventPos(e) {
    const r = this.boardRect || (this.boardRect = this.view.canvas.getBoundingClientRect());
    return { sx: e.clientX - r.left, sy: e.clientY - r.top };
  }

  /** Các đối tượng gần vị trí màn hình (sx, sy), điểm trước, rồi theo khoảng cách. */
  hitTest(sx, sy) {
    const vis = this.visibleSet();
    const k = kinds(this.doc);
    const P = this.toUser(sx, sy);
    const px = 1 / this.view.scale;
    const f = this.projector ? 1.6 : 1;
    const out = [];
    for (const s of this.doc.steps) {
      if (s.hidden || (vis && !vis.has(s.id))) continue;
      const v = this.values.get(s.id);
      const kind = k.get(s.id);
      if (!v || kind === 'mark') continue;
      const d = G.distToObject(v, P) / px;
      if (kind === 'point' && d <= 11 * f) out.push({ id: s.id, kind, d, pri: 0 });
      else if ((kind === 'line' || kind === 'circle') && d <= 7 * f) out.push({ id: s.id, kind, d, pri: 1 });
    }
    // đánh dấu (góc, đoạn, miền) – chọn được bằng cách bấm gần
    for (const s of this.doc.steps) {
      if (s.hidden || (vis && !vis.has(s.id)) || k.get(s.id) !== 'mark') continue;
      const v = this.values.get(s.id);
      if (!v) continue;
      const d = markDistance(v, P, px * f) / px;
      if (d <= 9 * f) out.push({ id: s.id, kind: 'mark', d, pri: 2 });
    }
    out.sort((a, b) => a.pri - b.pri || a.d - b.d);
    return out;
  }

  figureScale() {
    let xs = [], ys = [];
    for (const v of this.values.values()) if (v && v.kind === 'point') { xs.push(v.x); ys.push(v.y); }
    if (xs.length < 2) return 10;
    return Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), 1e-6);
  }

  /** Điểm đã có trùng (về số) với P. */
  existingPointAt(P, tolPx = 0.5) {
    const k = kinds(this.doc);
    const tol = Math.max(1e-9 * this.figureScale(), tolPx / this.view.scale);
    for (const s of this.doc.steps) {
      if (k.get(s.id) !== 'point') continue;
      const v = this.values.get(s.id);
      if (v && G.dist(v, P) < tol) return s.id;
    }
    return null;
  }

  /**
   * Tạo giao điểm của hai đường c1, c2. near: toạ độ chuột (chọn nghiệm gần nhất) hoặc null (tạo mọi nghiệm).
   * Nếu một nghiệm trùng điểm đã có thì nghiệm còn lại được dựng bằng "giao điểm thứ hai" (bền vững hơn
   * chọn theo chỉ số). Trả về danh sách id điểm (mới hoặc có sẵn).
   */
  createIntersections(c1, c2, near = null) {
    const v1 = this.values.get(c1), v2 = this.values.get(c2);
    const roots = G.intersect(v1, v2);
    if (!roots.length) { toast('Hai đường này không cắt nhau (ở vị trí hiện tại)'); return []; }
    const existing = roots.map((r) => this.existingPointAt(r, 0.01));
    let idx = roots.map((_, i) => i);
    if (near) idx = [idx.reduce((a, b) => (G.dist(roots[a], near) <= G.dist(roots[b], near) ? a : b))];
    const out = [];
    for (const i of idx) {
      if (existing[i]) { out.push(existing[i]); continue; }
      const other = roots.length === 2 ? existing[1 - i] : null;
      const spec = other ? { type: 'intersection_other', args: [c1, c2, other] } : { type: 'intersection', args: [c1, c2], params: roots.length === 2 ? { which: i } : undefined };
      out.push(...this.addSteps([spec]));
      this.values = evaluate(this.doc);
    }
    return out;
  }

  /** Lấy (hoặc tạo) một điểm tại vị trí bấm: điểm có sẵn / giao điểm / điểm trên đường / điểm tự do. */
  resolvePoint(sx, sy, hits) {
    const pHit = hits.find((h) => h.kind === 'point');
    if (pHit) return pHit.id;
    const P = this.toUser(sx, sy);
    const curves = hits.filter((h) => h.kind === 'line' || h.kind === 'circle').slice(0, 4);
    const px = 1 / this.view.scale;
    let best = null;
    for (let i = 0; i < curves.length; i++)
      for (let j = i + 1; j < curves.length; j++)
        for (const r of G.intersect(this.values.get(curves[i].id), this.values.get(curves[j].id))) {
          const d = G.dist(r, P) / px;
          if (d < 14 && (!best || d < best.d)) best = { d, a: curves[i].id, b: curves[j].id };
        }
    if (best) return this.createIntersections(best.a, best.b, P)[0] ?? null;
    if (curves.length) {
      const c = curves[0].id;
      const t = G.paramOf(this.values.get(c), P);
      return this.addSteps([{ type: 'point_on', args: [c], params: { t } }])[0];
    }
    const Q = this.snap(P);
    return this.addSteps([{ type: 'free_point', args: [], params: { x: Q.x, y: Q.y } }])[0];
  }

  snap(P) {
    if (!this.grid) return { x: round6(P.x), y: round6(P.y) };
    return { x: Math.round(P.x * 2) / 2, y: Math.round(P.y * 2) / 2 };
  }

  // ================= công cụ =================
  setTool(id) {
    this.cancelTool();
    this.toolId = id;
    document.querySelectorAll('.tool').forEach((b) => b.classList.toggle('active', b.dataset.tool === id));
    this.stage.classList.toggle('tool-active', id !== 'move');
    this.showHint();
    renderToolOptions(this);
  }

  cancelTool() {
    this.picks = [];
    this.renderer?.clearExtra();
    if (this.tx) {
      this.endTx();
      this.refresh();
    }
    this.showHint();
  }

  showHint(msg) {
    const el = document.getElementById('hint');
    if (!el) return;
    if (this.mode === 'present') { el.textContent = 'Chế độ trình bày: ← → (hoặc PageUp/PageDown) để chuyển khung. Vẫn kéo được điểm tự do.'; return; }
    const t = TOOL_BY_ID[this.toolId];
    const i = Math.min(this.picks.length, t.hints.length - 1);
    el.textContent = msg || `${t.label}: ${t.hints[i] || ''}`;
  }

  neededTypes(tool) {
    if (tool.inputs[0] === '...point') return ['point'];
    if (!tool.anyOrder) return [tool.inputs[this.picks.length]];
    const k = kinds(this.doc);
    const rem = [...tool.inputs];
    for (const p of this.picks) {
      const j = rem.findIndex((t) => argAccepts(t, k.get(p)));
      if (j >= 0) rem.splice(j, 1);
    }
    return rem;
  }

  toolClick(sx, sy) {
    const tool = TOOL_BY_ID[this.toolId];
    const hits = this.hitTest(sx, sy).filter((h) => h.kind !== 'mark');
    this.beginTx();

    if (tool.id === 'point') {
      const id = this.resolvePoint(sx, sy, hits);
      this.endTx();
      this.selection = new Set(id ? [id] : []);
      this.afterChange();
      return;
    }

    if (tool.id === 'intersect') {
      const curves = hits.filter((h) => h.kind === 'line' || h.kind === 'circle');
      if (!this.picks.length && curves.length >= 2) {
        this.createIntersections(curves[0].id, curves[1].id, this.toUser(sx, sy));
        return this.finishTool();
      }
      const c = curves.find((h) => !this.picks.includes(h.id));
      if (!c) return this.showHint('Hãy bấm vào một đường thẳng hoặc đường tròn');
      this.picks.push(c.id);
      if (this.picks.length === 2) {
        this.createIntersections(this.picks[0], this.picks[1], null);
        return this.finishTool();
      }
      this.selection = new Set(this.picks);
      this.refresh();
      return this.showHint();
    }

    // Bấm vào một đoạn thẳng = chọn hai đầu mút (trung điểm, trung trực, đánh dấu đoạn)
    if (tool.segmentShortcut && !this.picks.length && hits.length && hits[0].kind === 'line') {
      const s = stepById(this.doc, hits[0].id);
      if (s.type === 'segment') {
        this.picks = [...s.args];
        return this.completeTool(tool);
      }
    }

    const need = this.neededTypes(tool);
    let chosen = hits.find((h) => need.some((t) => argAccepts(t, h.kind)));
    let id = chosen?.id;
    if (!id && need.some((t) => argAccepts(t, 'point'))) id = this.resolvePoint(sx, sy, hits);
    if (!id) return this.showHint(`Hãy chọn ${need.map(typeName).join(' hoặc ')}`);

    if (tool.inputs[0] === '...point') {
      if (this.picks.length >= 3 && id === this.picks[0]) return this.completeTool(tool);
      if (this.picks.includes(id)) return;
      this.picks.push(id);
    } else {
      if (this.picks.includes(id)) return this.showHint('Đối tượng này đã được chọn, hãy chọn đối tượng khác');
      this.picks.push(id);
      // sắp lại theo thứ tự khai báo khi cho phép chọn tuỳ thứ tự
      if (tool.anyOrder && this.picks.length === tool.inputs.length) {
        const kk = kinds(this.doc);
        const ordered = [];
        const rest = [...this.picks];
        for (const t of tool.inputs) {
          const j = rest.findIndex((p) => argAccepts(t, kk.get(p)));
          ordered.push(rest.splice(j, 1)[0]);
        }
        this.picks = ordered;
      }
      if (this.picks.length === tool.inputs.length) return this.completeTool(tool);
    }
    this.selection = new Set(this.picks);
    this.refresh();
    this.startPreview(tool);
    this.showHint();
  }

  completeTool(tool) {
    const specs = tool.make(this.picks, this);
    const ids = this.addSteps(specs);
    this.selection = new Set(ids.slice(0, 1));
    this.finishTool();
  }

  finishTool() {
    this.picks = [];
    this.renderer.clearExtra();
    this.endTx();
    if (this.toolId === 'intersect') this.selection.clear();
    this.afterChange();
    this.showHint();
  }

  markStyle(kind) {
    const m = this.markDefaults;
    if (kind === 'angle') return { color: m.color, arcs: m.arcs };
    if (kind === 'segment') return { color: m.color, ticks: m.ticks };
    return { color: m.polyColor, fill: 0.12 };
  }

  startPreview(tool) {
    this.renderer.clearExtra();
    if (!tool.preview || !this.picks.length) return;
    const r = this.renderer;
    const pts = this.picks.map((id) => () => this.values.get(id));
    const mouse = () => this.mouse;
    if (['segment', 'line', 'ray', 'circle'].includes(tool.preview)) r.addExtra({ type: tool.preview, pts: [pts[0], mouse] });
    else if (tool.preview === 'polygon') r.addExtra({ type: 'polyline', pts: [...pts, mouse] });
  }

  // ================= chuột / cảm ứng =================
  bindPointer() {
    const canvas = this.view.canvas;
    const wrap = this.stage;
    const resetRect = () => { this.boardRect = null; };
    window.addEventListener('resize', resetRect);
    window.addEventListener('scroll', resetRect, true);
    this.view.onViewChange(resetRect);
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(resetRect).observe(canvas);
    wrap.addEventListener('pointerdown', (e) => this.onPointerDown(e), true);
    // Di chuột (không kéo): chỉ ghi nhận vị trí; cập nhật con trỏ và hình xem trước một lần mỗi khung
    let hoverPending = false;
    let lastEvent = null;
    wrap.addEventListener('pointermove', (e) => {
      if (this.drag) return;
      lastEvent = e;
      if (hoverPending) return;
      hoverPending = true;
      requestAnimationFrame(() => {
        hoverPending = false;
        if (this.drag || !lastEvent) return;
        const ev = lastEvent;
        const { sx, sy } = this.eventPos(ev);
        this.mouse = this.toUser(sx, sy);
        if (this.picks.length && this.renderer.extra.length) this.view.requestDraw();
        const hits = this.hitTest(sx, sy);
        let cursor = '';
        if (this.toolId === 'move' || this.mode === 'present') {
          const h = hits[0];
          if (h && h.kind === 'point' && isDraggableType(stepById(this.doc, h.id).type)) cursor = 'grab';
          else if (h && this.mode === 'edit') cursor = 'pointer';
          else if (this.mode === 'edit' && this.labelAt(ev)) cursor = 'move';
        } else cursor = hits.length ? 'pointer' : 'crosshair';
        canvas.style.cursor = cursor;
      });
    });
    // Lăn chuột: phóng to/thu nhỏ quanh con trỏ
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const { sx, sy } = this.eventPos(e);
      const dy = e.deltaMode === 1 ? e.deltaY * 30 : e.deltaY;
      this.view.zoomAt(sx, sy, Math.exp(-dy * 0.0015));
    }, { passive: false });
    canvas.addEventListener('dblclick', (e) => {
      if (this.mode === 'present') return;
      const { sx, sy } = this.eventPos(e);
      const h = this.hitTest(sx, sy)[0];
      if (h && h.kind === 'point') this.renameStep(h.id);
    });
  }

  /** Nhãn điểm tại vị trí chuột (để kéo nhãn). */
  labelAt(e) {
    const { sx, sy } = this.eventPos(e);
    for (const [id, b] of this.renderer.labelBoxes) {
      if (sx >= b.x - 2 && sx <= b.x + b.w + 2 && sy >= b.y - 2 && sy <= b.y + b.h + 2) return id;
    }
    return null;
  }

  /** Dời hình bằng cách kéo nền (một ngón/chuột) hoặc chụm hai ngón để phóng (màn hình cảm ứng). */
  startPan(e) {
    const pointers = this.panPointers || (this.panPointers = new Map());
    pointers.set(e.pointerId, this.eventPos(e));
    if (this.panning) return;
    this.panning = true;
    const move = (ev) => {
      if (!pointers.has(ev.pointerId)) return;
      const prev = [...pointers.values()];
      const before = pointers.get(ev.pointerId);
      const now = this.eventPos(ev);
      pointers.set(ev.pointerId, now);
      if (pointers.size >= 2) {
        const [a0, b0] = prev, [a1, b1] = [...pointers.values()];
        const d0 = Math.hypot(a0.sx - b0.sx, a0.sy - b0.sy), d1 = Math.hypot(a1.sx - b1.sx, a1.sy - b1.sy);
        if (d0 > 5) this.view.zoomAt((a1.sx + b1.sx) / 2, (a1.sy + b1.sy) / 2, d1 / d0);
      } else this.view.panBy(now.sx - before.sx, now.sy - before.sy);
    };
    const up = (ev) => {
      pointers.delete(ev.pointerId);
      if (pointers.size) return;
      this.panning = false;
      window.removeEventListener('pointermove', move, true);
      window.removeEventListener('pointerup', up, true);
      window.removeEventListener('pointercancel', up, true);
    };
    window.addEventListener('pointermove', move, true);
    window.addEventListener('pointerup', up, true);
    window.addEventListener('pointercancel', up, true);
  }

  onPointerDown(e) {
    if (e.button !== undefined && e.button !== 0) return;
    if (document.querySelector('.modal-back')) return;
    this.boardRect = null;
    const { sx, sy } = this.eventPos(e);
    if (sx < 0 || sy < 0 || sx > this.view.W || sy > this.view.H) return;
    if (this.panning) { this.startPan(e); return; } // ngón thứ hai: chụm để phóng
    this.mouse = this.toUser(sx, sy);

    if (this.toolId !== 'move' && this.mode === 'edit') {
      e.stopPropagation();
      e.preventDefault();
      this.toolClick(sx, sy);
      return;
    }

    // --- công cụ chọn/kéo ---
    const hits = this.hitTest(sx, sy);
    // nhãn được ưu tiên trừ khi bấm sát tâm điểm
    const lab = this.mode === 'edit' && !(hits[0] && hits[0].kind === 'point' && hits[0].d < 5) ? this.labelAt(e) : null;
    if (lab) {
      e.stopPropagation();
      e.preventDefault();
      const s = stepById(this.doc, lab);
      const off = (s.style && s.style.labelOffset) || this.renderer.labelOffsets.get(lab) || [9, 9];
      this.startDrag(e, { kind: 'label', id: lab, start: JSON.stringify(this.doc), sx, sy, off: [...off] });
      return;
    }
    const h = hits[0];
    const step = h ? stepById(this.doc, h.id) : null;
    if (h && h.kind === 'point' && isDraggableType(step.type)) {
      e.stopPropagation();
      e.preventDefault();
      this.startDrag(e, { kind: 'point', id: h.id, start: JSON.stringify(this.doc) });
      if (this.mode === 'edit') this.select(h.id, e.shiftKey, false);
      return;
    }
    if (h) {
      e.stopPropagation();
      e.preventDefault();
      if (this.mode === 'edit') this.select(h.id, e.shiftKey);
      return;
    }
    // chỗ trống: bỏ chọn, dời hình
    e.preventDefault();
    if (this.mode === 'edit' && this.selection.size && !e.shiftKey) {
      this.selection.clear();
      this.refresh();
    }
    this.startPan(e);
  }

  /**
   * Kéo điểm hoặc nhãn. Sự kiện chuột chỉ ghi lại vị trí mới nhất; việc tính lại và vẽ được gom
   * vào requestAnimationFrame (≤ 1 lần mỗi khung hình) và chỉ tính lại các bước phụ thuộc vào điểm
   * đang kéo. Ghi lịch sử hoàn tác, đặt lại nhãn tự động, lưu nháp… chỉ làm một lần khi thả chuột.
   */
  startDrag(e, info) {
    this.drag = info;
    const step = stepById(this.doc, info.id);
    const P0 = this.values.get(info.id);
    if (info.kind === 'point' && P0) info.grab = { x: P0.x - this.mouse.x, y: P0.y - this.mouse.y };
    if (info.kind === 'point') this.dragUpdater = makeUpdater(this.doc, [info.id]);
    let pending = null;
    const apply = () => {
      if (!pending) return;
      const { sx, sy } = pending;
      pending = null;
      this.mouse = this.toUser(sx, sy);
      if (info.kind === 'label') {
        const sc = this.projector ? 1.9 : 1;
        const off = [round1(info.off[0] + (sx - info.sx) / sc), round1(info.off[1] - (sy - info.sy) / sc)];
        step.style = { ...(step.style || {}), labelOffset: off };
        this.renderer.setLabelOffset(info.id, off);
        return;
      }
      const target = { x: this.mouse.x + info.grab.x, y: this.mouse.y + info.grab.y };
      if (step.type === 'free_point') {
        const Q = this.snap(target);
        step.params = { ...(step.params || {}), x: Q.x, y: Q.y };
      } else if (step.type === 'point_on') {
        const c = this.values.get(step.args[0]);
        if (c) step.params = { ...(step.params || {}), t: round9(G.paramOf(c, target)) };
      }
      this.quickUpdate();
    };
    this.view.frameHooks.push(apply);
    const move = (ev) => {
      pending = this.eventPos(ev);
      this.view.requestDraw();
    };
    const up = () => {
      window.removeEventListener('pointermove', move, true);
      window.removeEventListener('pointerup', up, true);
      window.removeEventListener('pointercancel', up, true);
      apply();
      this.view.frameHooks = this.view.frameHooks.filter((f) => f !== apply);
      this.drag = null;
      this.dragUpdater = null;
      if (JSON.stringify(this.doc) !== info.start) {
        this.pushUndo(info.start);
        this.afterChange();
      }
    };
    window.addEventListener('pointermove', move, true);
    window.addEventListener('pointerup', up, true);
    window.addEventListener('pointercancel', up, true);
  }

  select(id, additive = false, rerender = true) {
    if (additive) {
      if (this.selection.has(id)) this.selection.delete(id);
      else this.selection.add(id);
    } else this.selection = new Set([id]);
    if (rerender) this.refresh();
    else this.renderPanels();
  }

  // ================= sửa đối tượng =================
  async renameStep(id) {
    const s = stepById(this.doc, id);
    if (!s || !s.name) return;
    const v = await promptDialog('Đổi tên', s.name, 'Chữ số ở cuối hiển thị thành chỉ số dưới (A1 → A₁). Có thể dùng dấu phẩy trên: A\'.');
    if (v == null) return;
    this.setName(id, v.trim());
  }

  setName(id, name) {
    const s = stepById(this.doc, id);
    if (!name || name === s.name) return false;
    if (this.nameUsed(name, id)) { toast(`Tên "${name}" đã được dùng`); return false; }
    this.commit(() => { s.name = name; });
    return true;
  }

  setStyle(ids, patch) {
    this.commit((doc) => {
      for (const id of ids) {
        const s = stepById(doc, id);
        if (s) s.style = { ...(s.style || {}), ...patch };
      }
    });
  }

  setStepProp(id, key, value) {
    this.commit((doc) => {
      const s = stepById(doc, id);
      if (!s) return;
      if (value === false || value == null) delete s[key];
      else s[key] = value;
    });
  }

  setParams(id, patch) {
    this.commit((doc) => {
      const s = stepById(doc, id);
      s.params = { ...(s.params || {}), ...patch };
    });
  }

  async deleteSteps(ids) {
    ids = ids.filter((id) => stepById(this.doc, id));
    if (!ids.length) return;
    const dep = [...dependents(this.doc, ids)];
    if (dep.length) {
      const names = dep.map((d) => `<b>${escapeHTML(describe(this.doc, d) || d)}</b>`).join(', ');
      const ok = await confirmDialog('Xoá đối tượng', `Xoá ${ids.map((i) => `<b>${escapeHTML(describe(this.doc, i))}</b>`).join(', ')} sẽ xoá kèm <b>${dep.length}</b> đối tượng phụ thuộc: ${names}.<br>Tiếp tục?`, 'Xoá');
      if (!ok) return;
    }
    this.commit((doc) => {
      const { doc: nd } = removeSteps(doc, ids);
      doc.steps = nd.steps;
    });
    this.selection.clear();
    this.refresh();
  }

  /** Tô sáng một quan hệ do bộ khám phá tìm ra (null để bỏ). */
  setRelation(rel) {
    this.relation = rel;
    this.highlight = new Set(rel ? rel.ids : []);
    this.refresh();
  }

  // ================= trình bày / trình chiếu =================
  setMode(mode) {
    this.cancelTool();
    this.mode = mode;
    document.body.classList.toggle('presenting', mode === 'present');
    if (mode === 'present') {
      this.frameIdx = 0;
      this.selection.clear();
    } else this.setTool(this.toolId);
    this.refresh();
    this.showHint();
  }

  gotoFrame(i) {
    const n = frames(this.doc).length;
    this.frameIdx = Math.max(0, Math.min(n - 1, i));
    this.refresh();
  }

  updatePresentBar() {
    const lab = document.getElementById('frame-label');
    if (!lab) return;
    const n = frames(this.doc).length;
    lab.textContent = n ? `Khung ${Math.min(this.frameIdx + 1, n)} / ${n}` : 'Chưa có bước nào';
    document.getElementById('btn-prev').disabled = this.frameIdx <= 0;
    document.getElementById('btn-next').disabled = this.frameIdx >= n - 1;
  }

  async setProjector(on) {
    this.projector = on;
    document.body.classList.toggle('projector', on);
    try {
      if (on && !document.fullscreenElement) await document.documentElement.requestFullscreen();
      if (!on && document.fullscreenElement) await document.exitFullscreen();
    } catch { /* trình duyệt có thể chặn toàn màn hình – vẫn dùng được kiểu trình chiếu */ }
    setTimeout(() => { this.view.resize(); this.boardRect = null; this.refresh(); }, 80);
  }

  toggleGrid() {
    this.grid = !this.grid;
    this.renderer.grid = this.grid;
    document.getElementById('btn-grid').classList.toggle('on', this.grid);
    this.view.requestDraw();
  }

  zoomFit() {
    const pts = [];
    const vis = this.visibleSet();
    for (const s of this.doc.steps) {
      if (s.hidden || (vis && !vis.has(s.id))) continue;
      const v = this.values.get(s.id);
      if (!v) continue;
      if (v.kind === 'point') pts.push(v);
      if (v.kind === 'circle') pts.push({ x: v.c.x - v.r, y: v.c.y - v.r }, { x: v.c.x + v.r, y: v.c.y + v.r });
    }
    if (!pts.length) return this.view.setBoundingBox([-8, 6, 8, -6]);
    const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
    let [x1, x2, y1, y2] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const m = Math.max(x2 - x1, y2 - y1, 1) * 0.1;
    [x1, x2, y1, y2] = [x1 - m, x2 + m, y1 - m, y2 + m];
    // giữ tỉ lệ 1:1 theo kích thước khung vẽ
    const W = this.view.W, H = this.view.H;
    const per = Math.max((x2 - x1) / W, (y2 - y1) / H);
    const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2;
    this.view.setBoundingBox([cx - (per * W) / 2, cy + (per * H) / 2, cx + (per * W) / 2, cy - (per * H) / 2]);
  }

  // ================= bàn phím & nút =================
  bindKeys() {
    document.addEventListener('keydown', (e) => {
      if (document.querySelector('.modal-back')) return;
      const tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && (e.key === 'z' || e.key === 'Z') && !e.shiftKey) { e.preventDefault(); this.undo(); return; }
      if (ctrl && (e.key === 'y' || e.key === 'Y' || ((e.key === 'z' || e.key === 'Z') && e.shiftKey))) { e.preventDefault(); this.redo(); return; }
      if (this.mode === 'present') {
        if (['ArrowRight', 'PageDown', ' ', 'ArrowDown'].includes(e.key)) { e.preventDefault(); this.gotoFrame(this.frameIdx + 1); }
        else if (['ArrowLeft', 'PageUp', 'ArrowUp'].includes(e.key)) { e.preventDefault(); this.gotoFrame(this.frameIdx - 1); }
        else if (e.key === 'Home') this.gotoFrame(0);
        else if (e.key === 'End') this.gotoFrame(1e9);
        else if (e.key === 'Escape' && !this.projector) this.setMode('edit');
        return;
      }
      if (e.key === 'Escape') {
        if (this.picks.length) this.cancelTool();
        else if (this.toolId !== 'move') this.setTool('move');
        else { this.selection.clear(); this.setRelation(null); }
      } else if (e.key === 'Enter' && this.picks.length >= 3 && TOOL_BY_ID[this.toolId].inputs[0] === '...point') {
        this.completeTool(TOOL_BY_ID[this.toolId]);
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && this.selection.size) {
        e.preventDefault();
        this.deleteSteps([...this.selection]);
      }
    });
    document.addEventListener('fullscreenchange', () => {
      if (!document.fullscreenElement && this.projector) this.setProjector(false);
    });
  }

  buildToolbar() {
    const host = document.getElementById('tools');
    const groups = [];
    for (const t of TOOLS) {
      let g = groups.find((x) => x.name === t.group);
      if (!g) groups.push((g = { name: t.group, tools: [] }));
      g.tools.push(t);
    }
    host.innerHTML = groups
      .map((g) => `<div class="tool-group"><div class="tool-group-name">${g.name}</div><div class="tool-grid">${g.tools
        .map((t) => `<button class="tool" data-tool="${t.id}" title="${t.label}"><span class="ti">${t.icon}</span><span class="tl">${t.label}</span></button>`)
        .join('')}</div></div>`)
      .join('') + '<div id="tool-options"></div>';
    host.addEventListener('click', (e) => {
      const b = e.target.closest('.tool');
      if (b) this.setTool(b.dataset.tool);
    });
  }

  bindButtons() {
    const on = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('click', fn); };
    on('btn-undo', () => this.undo());
    on('btn-redo', () => this.redo());
    on('btn-delete', () => this.deleteSteps([...this.selection]));
    on('btn-grid', () => this.toggleGrid());
    on('btn-fit', () => this.zoomFit());
    on('btn-present', () => this.setMode(this.mode === 'present' ? 'edit' : 'present'));
    on('btn-projector', () => this.setProjector(!this.projector));
    on('btn-prev', () => this.gotoFrame(this.frameIdx - 1));
    on('btn-next', () => this.gotoFrame(this.frameIdx + 1));
    on('btn-exit-present', () => { if (this.projector) this.setProjector(false); this.setMode('edit'); });
    on('btn-new', async () => {
      if (this.doc.steps.length && !(await confirmDialog('Hình mới', 'Xoá hình hiện tại để bắt đầu hình mới? (Có thể hoàn tác bằng Ctrl+Z.)', 'Hình mới'))) return;
      this.commit((doc) => { doc.steps = []; doc.title = ''; });
      this.view.setBoundingBox([-8, 6, 8, -6]);
    });
  }
}

// ---------- tiện ích ----------
const round6 = (v) => Math.round(v * 1e6) / 1e6;
const round9 = (v) => Math.round(v * 1e9) / 1e9;
const round1 = (v) => Math.round(v * 10) / 10;
export const escapeHTML = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function typeName(t) {
  return { point: 'một điểm', line: 'một đường thẳng', circle: 'một đường tròn', curve: 'một đường thẳng/đường tròn', obj: 'một đối tượng', pl: 'một điểm hoặc đường thẳng', '...point': 'một điểm' }[t] || t;
}

function markDistance(v, P, px) {
  if (v.kind === 'angle') return Math.abs(G.dist(v.B, P) - 20 * px);
  if (v.kind === 'segmark') return G.dist(G.mid(v.A, v.B), P);
  if (v.kind === 'polygon') return pointInPolygon(P, v.pts) ? 0 : Infinity;
  return Infinity;
}

function pointInPolygon(P, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i], b = pts[j];
    if ((a.y > P.y) !== (b.y > P.y) && P.x < ((b.x - a.x) * (P.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

export { PALETTE };
