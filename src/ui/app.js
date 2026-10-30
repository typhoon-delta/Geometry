// Ứng dụng: giữ tài liệu (danh sách bước dựng), lịch sử hoàn tác, công cụ, chế độ trình bày/trình chiếu.
// Mọi thay đổi hình đi qua commit() → lõi tính lại toạ độ → vẽ lại.

import { addSpecs } from '../core/apply.js';
import { evaluate, makeUpdater, kinds, removeSteps, dependents, newId, nextName, stepById, clone, frames, emptyDoc, describe } from '../core/model.js';
import { STEP_TYPES, argAccepts } from '../core/steps.js';
import * as G from '../core/geom.js';
import { Renderer } from './render.js';
import { CanvasView } from './view.js';
import { TOOL_BY_ID, TOOLBAR } from './tools.js';
import { ICONS } from './icons.js';
import { createMacro, macroTool, validMacro, USER_MENU } from '../core/macro.js';
import { isDraggableType, isShown, PALETTE, setTheme } from '../core/styles.js';
import { confirmDialog, promptDialog, toast } from './dialog.js';
import { renderStepList, renderProps, renderToolOptions } from './panels.js';
import { renameInText } from '../text/markup.js';
import { tabDirty, tabDoc, isEmptyDoc } from './share.js';
import { downloadFile } from './download.js';
import { keyOf } from './shortcuts.js';

const HISTORY_MAX = 200;
const AUX_TOOLS = new Set(['perpendicular', 'parallel', 'perp_bisector', 'angle_bisector', 'ext_bisector', 'angle_line']);

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
    this.markDefaults = { color: null, arcs: 1, ticks: 1, polyColor: null }; // null = màu mặc định của bộ kiểu
    this.theme = loadPref('theme', 'mono');
    setTheme(this.theme);
    this.listeners = { change: [] };
    this.images = new Map(); // ảnh dán vào hình: id → {src, img} (dữ liệu ảnh để ngoài doc → lịch sử hoàn tác gọn)
    this.imageSel = null; // id ảnh đang chọn
    this.typeToRename = true; // gõ chữ khi đang chọn một điểm → đặt tên ngay (xem inlineRename)
    this.fitKey = 'Home'; // phím thu phóng vừa hình
    this.traceIds = new Set(); // đối tượng để lại vết khi kéo (bản 1.7; không lưu vào hình)
    this.clipboard = null; // đối tượng đã chép (Ctrl+C) – dán được sang tab khác
  }

  // ================= khởi tạo =================
  mount() {
    this.view = new CanvasView(document.getElementById('board'));
    this.view.setBoundingBox([-8, 6, 8, -6]);
    this.renderer = new Renderer(this.view);
    this.renderer.trimLines = loadPref('trim', '1') === '1';
    this.initTabs();
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
    this.takeImages(this.doc);
    // hình mới nạp vào tab: chưa gắn với bài nào trong kho, chưa lưu
    if (this.tabs && this.tabs[this.tabIdx] && !keepHistory) Object.assign(this.tabs[this.tabIdx], { kho: null, savedSig: null });
    this.imageSel = null;
    this.selection.clear();
    this.highlight.clear();
    this.relation = null;
    this.cancelTool();
    this.clearTraces(true);
    if (doc.view && Array.isArray(doc.view.bbox)) this.view.setBoundingBox(doc.view.bbox);
    this.refresh();
    this.emit('load');
    this.emit('change');
  }

  // ================= ảnh dán vào hình (bản 1.3) =================
  // doc.images = [{id, x, y, w, h, opacity?, locked?}] – (x, y) là góc trên-trái theo toạ độ hình (y hướng lên),
  // w × h theo đơn vị hình nên ảnh phóng/dời theo hình. Dữ liệu ảnh (data URL) giữ trong this.images; khi lưu tệp /
  // nháp thì gắn vào doc.imageData (withImageData), khi mở thì lấy ra (takeImages).
  registerImage(id, src) {
    if (this.images.has(id) || typeof src !== 'string') return;
    const img = new Image();
    const rec = { src, img, ready: false };
    img.onload = () => { rec.ready = true; this.view?.requestDraw(); };
    img.src = src;
    this.images.set(id, rec);
  }

  takeImages(doc) {
    if (doc && doc.imageData) {
      for (const [id, src] of Object.entries(doc.imageData)) this.registerImage(id, src);
      delete doc.imageData;
    }
  }

  withImageData(doc) {
    const ids = (doc.images || []).map((im) => im.id);
    for (const b of doc.boxes || []) for (const m of String(b.text || '').matchAll(/!\[\]\(img:([A-Za-z0-9_-]+)\)/g)) ids.push(m[1]);
    if (!ids.length) return doc;
    const data = {};
    for (const id of ids) { const r = this.images.get(id); if (r) data[id] = r.src; }
    return { ...doc, imageData: data };
  }

  /** Ảnh (không khoá) tại vị trí màn hình; handle = true nếu trúng ô đổi cỡ ở góc dưới phải. Ảnh trên cùng trước. */
  imageAt(sx, sy) {
    const list = this.doc.images || [];
    for (let i = list.length - 1; i >= 0; i--) {
      const im = list[i];
      if (im.locked) continue;
      const a = this.toScreen({ x: im.x, y: im.y }), b = this.toScreen({ x: im.x + im.w, y: im.y - im.h });
      if (Math.abs(sx - b.x) <= 9 && Math.abs(sy - b.y) <= 9 && this.imageSel === im.id) return { id: im.id, handle: true };
      if (sx >= a.x && sx <= b.x && sy >= a.y && sy <= b.y) return { id: im.id, handle: false };
    }
    return null;
  }

  selectImage(id) {
    this.imageSel = id;
    if (id) this.selection.clear();
    this.refresh();
  }

  /** Kéo ảnh (dời) hoặc kéo ô góc dưới phải (đổi cỡ, giữ tỉ lệ). */
  startImageDrag(e, id, resize) {
    const im = (this.doc.images || []).find((x) => x.id === id);
    if (!im) return;
    const start = JSON.stringify(this.doc);
    const p0 = this.eventPos(e);
    const P0 = this.toUser(p0.sx, p0.sy);
    const o = { x: im.x, y: im.y, w: im.w, h: im.h };
    this.drag = { kind: 'image', id };
    const move = (ev) => {
      const { sx, sy } = this.eventPos(ev);
      const P = this.toUser(sx, sy);
      if (resize) {
        const w = Math.max(20 / this.view.scale, o.w + (P.x - P0.x));
        im.w = w;
        im.h = (w * o.h) / o.w;
      } else {
        im.x = o.x + P.x - P0.x;
        im.y = o.y + P.y - P0.y;
      }
      this.view.requestDraw();
    };
    const up = () => {
      window.removeEventListener('pointermove', move, true);
      window.removeEventListener('pointerup', up, true);
      window.removeEventListener('pointercancel', up, true);
      this.drag = null;
      if (JSON.stringify(this.doc) !== start) { this.pushUndo(start); this.afterChange(); }
    };
    window.addEventListener('pointermove', move, true);
    window.addEventListener('pointerup', up, true);
    window.addEventListener('pointercancel', up, true);
  }

  setImageProp(id, patch) {
    this.commit((doc) => { const im = (doc.images || []).find((x) => x.id === id); if (im) Object.assign(im, patch); });
  }

  deleteImage(id) {
    this.commit((doc) => { doc.images = (doc.images || []).filter((x) => x.id !== id); if (!doc.images.length) delete doc.images; });
    this.imageSel = null;
    this.refresh();
  }

  // ================= nhiều tab hình (bản 1.3) =================
  // Mỗi tab giữ hình, lịch sử hoàn tác/làm lại và khung nhìn riêng. Tab đang mở dùng trực tiếp this.doc,
  // this.undoStack… (như trước); khi đổi tab thì cất vào this.tabs[i] rồi lấy tab kia ra.
  initTabs() {
    this.tabs = [{ doc: this.doc, undo: this.undoStack, redo: this.redoStack, bbox: null, kho: null, savedSig: null }];
    this.closedTabs = []; // hình vừa đóng (để mở lại), tối đa 10
    this.tabIdx = 0;
  }

  stashTab() {
    const t = this.tabs[this.tabIdx];
    Object.assign(t, { doc: this.doc, undo: this.undoStack, redo: this.redoStack, bbox: this.view.getBoundingBox() });
  }

  /** Hiện tab i (đã cất tab đang mở). */
  showTab(i) {
    const t = this.tabs[i];
    this.tabIdx = i;
    this.doc = t.doc;
    this.undoStack = t.undo;
    this.redoStack = t.redo;
    this.selection.clear();
    this.highlight.clear();
    this.relation = null;
    this.imageSel = null;
    this.cancelTool();
    if (t.bbox) this.view.setBoundingBox(t.bbox);
    else if (t.doc.view && Array.isArray(t.doc.view.bbox)) this.view.setBoundingBox(t.doc.view.bbox);
    else this.view.setBoundingBox([-8, 6, 8, -6]);
    this.refresh();
    if (!t.bbox && !t.doc.view && t.doc.steps.length) this.zoomFit();
    this.emit('load');
    this.emit('change');
  }

  switchTab(i) {
    if (i === this.tabIdx || !this.tabs[i]) return;
    this.stashTab();
    this.showTab(i);
  }

  /** Mở một hình ở tab mới (doc = null: hình trống). meta: {kho, savedSig} – bài trong kho mà tab gắn với, chữ ký lần lưu cuối. */
  newTab(doc = null, meta = {}) {
    this.stashTab();
    const d = doc ? clone(doc) : emptyDoc();
    this.takeImages(d);
    this.tabs.push({ doc: d, undo: [], redo: [], bbox: null, kho: meta.kho || null, savedSig: meta.savedSig || null });
    this.showTab(this.tabs.length - 1);
  }

  async closeTab(i) {
    const t = i === this.tabIdx ? { ...this.tabs[i], doc: this.doc } : this.tabs[i];
    // hình đã lưu (tệp/kho) và chưa sửa gì thêm thì đóng luôn; chưa lưu thì hỏi – dù sao vẫn mở lại được
    if (tabDirty(this, i) && !(await confirmDialog('Đóng hình', `Hình <b>${escapeHTML(t.doc.title || 'chưa đặt tên')}</b> có thay đổi chưa lưu ra tệp hay kho. Đóng?<br><span class="note">Lỡ đóng thì vào <i>Tệp › Mở lại hình vừa đóng</i>.</span>`, 'Đóng'))) return;
    this.stashTab();
    if (!isEmptyDoc(t.doc)) {
      this.closedTabs.push({ doc: tabDoc(this, i), kho: t.kho || null, savedSig: t.savedSig || null });
      if (this.closedTabs.length > 10) this.closedTabs.shift();
    }
    const cur = this.tabIdx;
    this.tabs.splice(i, 1);
    if (!this.tabs.length) this.tabs.push({ doc: emptyDoc(), undo: [], redo: [], bbox: null, kho: null, savedSig: null });
    const next = i < cur ? cur - 1 : i === cur ? Math.min(i, this.tabs.length - 1) : cur;
    this.showTab(next);
  }

  /** Tệp › Mở lại hình vừa đóng. */
  reopenTab() {
    const c = this.closedTabs.pop();
    if (!c) return toast('Chưa đóng hình nào trong lần mở trang này');
    this.newTab(c.doc, c);
    toast(`Đã mở lại "${c.doc.title || 'hình vừa đóng'}"`);
  }

  /** Mở hình (tệp, ví dụ, link, kho): dùng tab đang mở nếu nó trống, nếu không thì mở tab mới. meta như newTab. */
  openDoc(doc, meta = {}) {
    if (isEmptyDoc(this.doc)) {
      this.loadDoc(doc);
      Object.assign(this.tabs[this.tabIdx], { kho: meta.kho || null, savedSig: meta.savedSig || null });
      this.emit('saved');
    } else this.newTab(doc, meta);
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
    if (this.imageSel && (this.selection.size || !(this.doc.images || []).some((im) => im.id === this.imageSel))) this.imageSel = null;
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
    return addSpecs(this.doc, specs, { join });
  }

  /** Tên hiển thị của một đối tượng (dùng khi công cụ đặt tên kết quả, vd I_A). */
  name(id) {
    return stepById(this.doc, id)?.name || '';
  }

  /** Tham số số của công cụ đang dùng (góc quay, tỉ số vị tự…), chỉnh ở thẻ tuỳ chọn. */
  opt(key, def) {
    const p = (this.toolParams && this.toolParams[this.toolId]) || {};
    return key in p ? p[key] : def;
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
      theme: this.theme,
      visible: this.visibleSet(),
      selected: this.mode === 'present' ? new Set() : this.selection,
      highlight: this.highlight,
      images: this.images,
      imageSel: this.mode === 'present' ? null : this.imageSel,
    });
    this.renderer.clearExtra();
    this.drawRelationOverlay?.();
    document.getElementById('btn-aux')?.classList.toggle('on', !this.doc.hideAux);
    this.renderPanels();
    this.emit('refresh');
  }

  /** Tô sáng tạm (rê chuột lên tên điểm trong khung chữ); null: trở lại quan hệ đang tô (nếu có). */
  setHover(ids) {
    this.highlight = new Set(ids || (this.relation ? this.relation.ids : []));
    this.refresh();
  }

  /** Số khung trình bày: khung của hình, kéo dài thêm nếu lời giải còn bước ở các khung sau. */
  frameCount() {
    return Math.max(frames(this.doc).length, this.textBoxes ? this.textBoxes.lastFrame() + 1 : 0);
  }

  /** Cập nhật nhanh khi kéo: chỉ tính lại các bước phụ thuộc (nếu có bộ cập nhật), rồi vẽ lại. */
  quickUpdate() {
    if (this.dragUpdater) this.dragUpdater(this.values);
    else this.values = evaluate(this.doc);
    if (this.traceIds.size) this.recordTraces();
    this.renderer.update(this.values);
  }

  // ================= vết (bản 1.7) =================
  /** Bật/tắt để lại vết khi kéo cho đối tượng id (điểm, đường thẳng, đường tròn). */
  toggleTrace(id, on = !this.traceIds.has(id)) {
    if (on) this.traceIds.add(id);
    else { this.traceIds.delete(id); this.renderer.traces?.delete(id); }
    if (on) toast('Kéo một điểm tự do để thấy vết. Xoá vết: Hiển thị › Xoá vết');
    this.renderPanels();
    this.view.requestDraw();
  }

  recordTraces() {
    const tr = this.renderer.traces || (this.renderer.traces = new Map());
    const k = kinds(this.doc);
    for (const id of this.traceIds) {
      const v = this.values.get(id);
      if (!v) continue;
      let rec = tr.get(id);
      if (!rec) tr.set(id, (rec = { kind: k.get(id), items: [] }));
      const last = rec.items[rec.items.length - 1];
      if (rec.kind === 'point') {
        if (last && G.dist(last, v) * this.view.scale < 1.5) continue;
        rec.items.push({ x: v.x, y: v.y });
        if (rec.items.length > 4000) rec.items.shift();
      } else {
        rec.items.push(JSON.parse(JSON.stringify(v)));
        if (rec.items.length > 400) rec.items.shift();
      }
    }
  }

  /** Xoá các vết đã vẽ; all = true: tắt luôn chế độ để lại vết. */
  clearTraces(all = false) {
    if (this.renderer) this.renderer.traces = null;
    if (all) this.traceIds.clear();
    this.view?.requestDraw();
  }

  renderPanels() {
    renderStepList(this);
    renderProps(this);
    renderToolOptions(this);
    for (const id of ['btn-undo', 'menu-undo']) { const b = document.getElementById(id); if (b) b.disabled = !this.undoStack.length; }
    for (const id of ['btn-redo', 'menu-redo']) { const b = document.getElementById(id); if (b) b.disabled = !this.redoStack.length; }
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
    let order = 0;
    for (const s of this.doc.steps) {
      order++;
      if (!isShown(this.doc, s) || (vis && !vis.has(s.id))) continue;
      const v = this.values.get(s.id);
      const kind = k.get(s.id);
      if (!v || kind === 'mark') continue;
      let d = G.distToObject(v, P) / px;
      // đường thẳng/tia đang vẽ "vừa đủ": chỉ phần đang thấy mới bấm trúng
      const rg = kind === 'line' && !this.renderer.ghostLines && this.renderer.lineRanges.get(s.id);
      if (rg) d = G.dist(P, G.pointOn({ ...v, sub: 'line' }, Math.max(rg[0], Math.min(rg[1], G.lineParam(P, v))))) / px;
      if (kind === 'point' && d <= 11 * f) out.push({ id: s.id, kind, d, pri: 0, order });
      else if ((kind === 'line' || kind === 'circle') && d <= 7 * f) out.push({ id: s.id, kind, d, pri: 1, order });
    }
    // đánh dấu (góc, đoạn, miền) – chọn được bằng cách bấm gần
    for (const s of this.doc.steps) {
      if (!isShown(this.doc, s) || (vis && !vis.has(s.id)) || k.get(s.id) !== 'mark') continue;
      const v = this.values.get(s.id);
      if (!v) continue;
      if (v.kind === 'measure') {
        const b = this.renderer.measureBoxes.get(s.id);
        if (b && sx >= b.x && sx <= b.x + b.w && sy >= b.y && sy <= b.y + b.h) out.push({ id: s.id, kind: 'mark', d: 0, pri: -1, measure: true });
        continue;
      }
      const d = markDistance(v, P, px * f) / px;
      if (d <= 9 * f) out.push({ id: s.id, kind: 'mark', d, pri: 2 });
    }
    // gần như cùng khoảng cách (vd hai điểm trùng nhau): đối tượng dựng SAU (vẽ đè lên trên) được chọn trước
    out.sort((a, b) => a.pri - b.pri || (Math.abs(a.d - b.d) < 0.75 ? (b.order || 0) - (a.order || 0) : a.d - b.d));
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

  /** Cặp đường cắt nhau gần chỗ bấm nhất (nhiều cặp cùng chỗ: cặp dựng sau cùng). */
  crossingPair(curves, P) {
    const px = 1 / this.view.scale;
    const cs = curves.slice(0, 5);
    let best = null;
    for (let i = 0; i < cs.length; i++)
      for (let j = i + 1; j < cs.length; j++)
        for (const r of G.intersect(this.values.get(cs[i].id), this.values.get(cs[j].id))) {
          const d = G.dist(r, P) / px, rec = Math.min(cs[i].order || 0, cs[j].order || 0);
          if (!best || d < best.d - 0.75 || (Math.abs(d - best.d) <= 0.75 && rec > best.rec)) best = { d, rec, ids: [cs[i].id, cs[j].id] };
        }
    return best ? best.ids : [curves[0].id, curves[1].id];
  }

  /** Lấy (hoặc tạo) một điểm tại vị trí bấm: điểm có sẵn / giao điểm / điểm trên đường / điểm tự do. */
  /**
   * Chỗ hai đường cắt nhau ngay dưới con trỏ mà CHƯA có điểm (bản 1.6): {a, b, P} hoặc null. Dùng cho công cụ Chọn:
   * bấm vào chỗ cắt là có giao điểm (như Sketchpad), rê chuột tới thì hiện trước một dấu.
   */
  crossingAt(sx, sy, hits = this.hitTest(sx, sy), radius = 9) {
    if (hits.some((h) => h.kind === 'point' && h.d < radius + 3)) return null;
    const curves = hits.filter((h) => h.kind === 'line' || h.kind === 'circle').slice(0, 4);
    if (curves.length < 2) return null;
    const P = this.toUser(sx, sy);
    const px = 1 / this.view.scale;
    let best = null;
    for (let i = 0; i < curves.length; i++)
      for (let j = i + 1; j < curves.length; j++)
        for (const r of G.intersect(this.values.get(curves[i].id), this.values.get(curves[j].id))) {
          const d = G.dist(r, P) / px;
          // a là đường dựng trước (gợi ý đọc "giao điểm của d1 và d2")
          const [u, w] = (curves[i].order || 0) <= (curves[j].order || 0) ? [curves[i], curves[j]] : [curves[j], curves[i]];
          if (d < radius && (!best || d < best.d)) best = { d, a: u.id, b: w.id, P: r };
        }
    if (!best) return null;
    // đã có điểm trùng chỗ cắt (vd điểm bị ẩn nhãn, hay nằm ngoài vùng bấm điểm) → không tạo trùng
    if (this.existingPointAt(best.P, 0.01)) return null;
    return best;
  }

  /** Dấu báo trước "bấm để lấy giao điểm" khi rê chuột tới chỗ cắt (công cụ Chọn). */
  showCrossMark(cross) {
    const key = cross ? `${cross.a}|${cross.b}` : null;
    if (key === this.crossKey) return;
    this.clearCrossMark();
    if (!cross) return;
    this.crossKey = key;
    const P = cross.P;
    this.crossMark = this.renderer.addExtra({ type: 'point', pts: [() => P], style: { color: '#3150d6', fill: '#dfe6ff', size: 7 } });
    const nm = (id) => stepById(this.doc, id)?.name || '';
    this.showHint(`Bấm để lấy giao điểm của ${nm(cross.a)} và ${nm(cross.b)}`);
  }

  clearCrossMark() {
    if (!this.crossMark) return;
    this.renderer.extra = this.renderer.extra.filter((x) => x !== this.crossMark);
    this.crossMark = null;
    this.crossKey = null;
    this.view.requestDraw();
    this.showHint();
  }

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
          // nhiều cặp cắt nhau tại cùng một chỗ (ba đường đồng quy): lấy cặp đường dựng sau cùng – thường là ý người dựng
          const rec = Math.min(curves[i].order || 0, curves[j].order || 0);
          if (d < 14 && (!best || d < best.d - 0.75 || (Math.abs(d - best.d) <= 0.75 && rec > best.rec))) best = { d, rec, a: curves[i].id, b: curves[j].id };
        }
    if (best) return this.createIntersections(best.a, best.b, P)[0] ?? null;
    if (curves.length) {
      const c = curves[0].id;
      const t = G.paramOf(this.values.get(c), P);
      return this.addSteps([{ type: 'point_on', args: [c], params: { t } }])[0];
    }
    const anchors = this.shiftSnap ? this.pickAnchors() : [];
    const Q = anchors.length ? this.angleSnap(P, anchors) : this.snap(P);
    return this.addSteps([{ type: 'free_point', args: [], params: { x: Q.x, y: Q.y } }])[0];
  }

  /**
   * Giữ Shift (bản 1.3): bắt hướng từ một điểm mốc tới P về bội số của 15° (0°, 15°, …, 90°…) – đường nằm ngang,
   * thẳng đứng, nghiêng 45°… thật chính xác. Nhiều mốc: lấy mốc làm P dịch ít nhất. Giữ nguyên khoảng cách tới mốc.
   */
  angleSnap(P, anchors) {
    const step = Math.PI / 12;
    let best = null;
    for (const A of anchors) {
      const r = Math.hypot(P.x - A.x, P.y - A.y);
      if (r < 1e-9) continue;
      const a = Math.round(Math.atan2(P.y - A.y, P.x - A.x) / step) * step;
      const Q = { x: round6(A.x + r * Math.cos(a)), y: round6(A.y + r * Math.sin(a)) };
      // làm tròn 6 chữ số có thể làm lệch hướng: nằm ngang/thẳng đứng thì chép đúng toạ độ của mốc
      if (Math.abs(Math.sin(a)) < 1e-12) Q.y = A.y;
      if (Math.abs(Math.cos(a)) < 1e-12) Q.x = A.x;
      const d = Math.hypot(Q.x - P.x, Q.y - P.y);
      if (!best || d < best.d) best = { d, Q };
    }
    return best ? best.Q : this.snap(P);
  }

  /** Các điểm đã chọn trong lần dùng công cụ hiện tại (mốc để căn hướng khi giữ Shift). */
  pickAnchors() {
    return this.picks.map((id) => this.values.get(id)).filter((v) => v && v.kind === 'point');
  }

  /** Các điểm nối với điểm id bằng một đoạn/tia/đường thẳng đã vẽ (mốc để căn hướng khi kéo với Shift). */
  dragAnchors(id) {
    const out = [];
    for (const s of this.doc.steps) {
      if (!['segment', 'line', 'ray'].includes(s.type) || !s.args.includes(id)) continue;
      const o = this.values.get(s.args[0] === id ? s.args[1] : s.args[0]);
      if (o) out.push(o);
    }
    return out;
  }

  snap(P) {
    if (!this.grid) return { x: round6(P.x), y: round6(P.y) };
    return { x: Math.round(P.x * 2) / 2, y: Math.round(P.y * 2) / 2 };
  }

  // ================= công cụ =================
  setTool(id) {
    this.cancelTool();
    this.toolId = id;
    this.markActiveTool(id);
    this.stage.classList.toggle('tool-active', id !== 'move');
    this.rememberTool(id);
    this.renderer.ghostLines = id !== 'move' && this.mode === 'edit';
    this.view.requestDraw();
    this.showHint();
    renderToolOptions(this);
    renderProps(this);
  }

  /**
   * Gọi công cụ bằng phím tắt / bảng lệnh (bản 1.6). Đang chọn sẵn các đối tượng hợp với công cụ thì DỰNG NGAY trên
   * chúng (chọn trước, dựng sau – như Sketchpad); chọn mới đủ một phần thì dùng làm các lần chọn đầu.
   */
  activateTool(id) {
    const sel = [...this.selection].filter((x) => stepById(this.doc, x));
    this.setTool(id);
    const tool = TOOL_BY_ID[id];
    if (!sel.length || !tool || this.mode !== 'edit') return;
    const k = kinds(this.doc);
    if (tool.id === 'point') return;
    if (tool.id === 'intersect') {
      const cs = sel.filter((x) => k.get(x) === 'line' || k.get(x) === 'circle');
      if (cs.length !== 2 || sel.length !== 2) return;
      this.beginTx();
      const n0 = this.doc.steps.length;
      this.createIntersections(cs[0], cs[1], null);
      this.lastCreatedPoints = this.doc.steps.slice(n0).map((x) => x.id);
      return this.finishTool();
    }
    if (tool.segmentShortcut && sel.length === 1 && stepById(this.doc, sel[0]).type === 'segment') {
      this.beginTx();
      this.picks = [...stepById(this.doc, sel[0]).args];
      return this.picksDone(tool);
    }
    if (tool.inputs[0] === '...point') {
      const pts = sel.filter((x) => k.get(x) === 'point');
      if (pts.length < 3 || pts.length !== sel.length) return;
      this.beginTx();
      this.picks = pts;
      return this.completeTool(tool);
    }
    // ghép theo kiểu đối tượng, giữ thứ tự đã chọn; chọn thừa hoặc không hợp thì thôi (dùng công cụ như thường)
    const rest = [...sel], picks = [];
    for (const t of tool.inputs) {
      const j = rest.findIndex((x) => argAccepts(t, k.get(x)));
      if (j < 0) break;
      picks.push(rest.splice(j, 1)[0]);
    }
    if (rest.length || !picks.length) return;
    this.beginTx();
    this.picks = picks;
    if (picks.length === tool.inputs.length) return this.picksDone(tool);
    this.selection = new Set(picks);
    this.refresh();
    this.startPreview(tool);
    this.showHint();
  }

  cancelTool() {
    this.picks = [];
    this.awaitExtra = false;
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
    if (!msg && this.awaitExtra && t.extraClick) { el.textContent = `${t.label}: ${t.extraClick} · Esc: huỷ`; return; }
    const i = Math.min(this.picks.length, t.hints.length - 1);
    const sel = this.selection.size === 1 && !this.picks.length ? stepById(this.doc, [...this.selection][0]) : null;
    const tip = sel && sel.name && kinds(this.doc).get(sel.id) === 'point' ? ` · Gõ chữ để đặt tên ${sel.name}` : '';
    const shiftTip = this.picks.length && this.toolId !== 'move' && this.pickAnchors().length ? ' · giữ Shift: căn hướng theo bước 15° (nằm ngang, thẳng đứng…)' : '';
    el.textContent = msg || `${t.label}: ${t.hints[i] || ''}${shiftTip}${tip}`;
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

  toolClick(sx, sy, shift = false) {
    this.shiftSnap = shift;
    const tool = TOOL_BY_ID[this.toolId];
    const hits = this.hitTest(sx, sy).filter((h) => h.kind !== 'mark');
    this.beginTx();

    // lần bấm thêm sau khi đã chọn đủ (chọn phía của góc, chỗ đặt điểm trong tam giác)
    if (this.awaitExtra) {
      this.extraPos = this.toUser(sx, sy);
      this.awaitExtra = false;
      return this.completeTool(tool);
    }

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
        const n0 = this.doc.steps.length;
        const [c1, c2] = this.crossingPair(curves, this.toUser(sx, sy));
        this.createIntersections(c1, c2, this.toUser(sx, sy));
        this.lastCreatedPoints = this.doc.steps.slice(n0).map((x) => x.id);
        return this.finishTool();
      }
      const c = curves.find((h) => !this.picks.includes(h.id));
      if (!c) return this.showHint('Hãy bấm vào một đường thẳng hoặc đường tròn');
      this.picks.push(c.id);
      if (this.picks.length === 2) {
        const n0 = this.doc.steps.length;
        this.createIntersections(this.picks[0], this.picks[1], null);
        this.lastCreatedPoints = this.doc.steps.slice(n0).map((x) => x.id);
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
        return this.picksDone(tool);
      }
    }

    const need = this.neededTypes(tool);
    let chosen = hits.find((h) => need.some((t) => argAccepts(t, h.kind)));
    let id = chosen?.id;
    if (!id && need.some((t) => argAccepts(t, 'point'))) id = this.resolvePoint(sx, sy, hits);
    if (!id) return this.showHint(`Hãy chọn ${need.map(typeName).join(' hoặc ')}`);

    if (tool.inputs[0] === '...point') {
      if (this.picks.length >= 3 && id === this.picks[0]) return this.picksDone(tool);
      if (this.picks.includes(id)) return;
      this.picks.push(id);
    } else {
      // công cụ lấy góc/tỉ số trên hình cho phép chọn lại một điểm (vd quay quanh S theo góc ASC)
      if (this.picks.includes(id) && !tool.allowRepeat) return this.showHint('Đối tượng này đã được chọn, hãy chọn đối tượng khác');
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
      if (this.picks.length === tool.inputs.length) return this.picksDone(tool);
    }
    this.selection = new Set(this.picks);
    this.refresh();
    this.startPreview(tool);
    this.showHint();
  }

  /** Điểm vừa dựng nằm ngoài khung nhìn → nhắc cách thu phóng (không tự đổi khung nhìn của người dùng). */
  warnOutOfView() {
    const ids = [...this.selection];
    const out = ids.some((id) => {
      const v = this.values.get(id);
      if (!v || v.kind !== 'point') return false;
      const q = this.toScreen(v);
      return q.x < 0 || q.y < 0 || q.x > this.view.W || q.y > this.view.H;
    });
    if (out) toast('Điểm vừa dựng nằm ngoài khung nhìn – nhấn Home (hoặc Hiển thị › Thu phóng vừa hình) để thấy cả hình', 4200);
  }

  /** Đã chọn đủ đối số: dựng ngay, hoặc (công cụ có extraClick) chờ thêm một lần bấm để chọn phía / vị trí. */
  picksDone(tool) {
    if (!tool.extraClick) return this.completeTool(tool);
    this.awaitExtra = true;
    this.extraPos = null;
    this.selection = new Set(this.picks);
    this.refresh();
    this.startExtraPreview(tool);
    this.showHint();
  }

  completeTool(tool) {
    this.awaitExtra = false;
    const specs = tool.make(this.picks, this);
    let ids = this.addSteps(specs);
    if (tool.after) ids = this.afterTool(tool.after, ids);
    // đường dựng thêm (vuông góc, song song, trung trực, phân giác, góc bằng góc) là đường phụ: nét đứt, ẩn cùng lúc được
    if (AUX_TOOLS.has(tool.id)) for (const id of ids) { const st = stepById(this.doc, id); if (kinds(this.doc).get(id) === 'line') st.aux = true; }
    // chọn sẵn kết quả chính – điểm mới duy nhất nếu có – để gõ tên ngay (không phải đổi công cụ rồi nháy đúp)
    const k = kinds(this.doc);
    const pts = ids.filter((id) => k.get(id) === 'point' && !stepById(this.doc, id).hidden);
    this.selection = new Set(pts.length === 1 ? pts : ids.slice(0, 1));
    // không dựng gì mới vì điểm cần dựng đã có (vd trực tâm H): chọn lại điểm đó và báo
    if (!ids.length && specs.reused && specs.reused.length) {
      this.selection = new Set([specs.reused[specs.reused.length - 1]]);
      toast(`Đã có sẵn trên hình: ${this.name(specs.reused[specs.reused.length - 1])}`);
    }
    this.finishTool();
  }

  finishTool() {
    this.picks = [];
    this.awaitExtra = false;
    this.renderer.clearExtra();
    this.endTx();
    if (this.toolId === 'intersect') this.selection = new Set(this.lastCreatedPoints && this.lastCreatedPoints.length === 1 ? this.lastCreatedPoints : []);
    this.lastCreatedPoints = null;
    this.afterChange();
    this.warnOutOfView();
    this.showHint();
  }

  markStyle(kind) {
    const m = this.markDefaults;
    const c = (x) => (x ? { color: x } : {});
    if (kind === 'angle') return { ...c(m.color), arcs: m.arcs };
    if (kind === 'segment') return { ...c(m.color), ticks: m.ticks };
    return { ...c(m.polyColor) };
  }

  /**
   * Việc làm thêm sau khi công cụ thêm bước (bản 1.7). fixedPoint: bỏ các điểm cố định không tìm được; locus: bỏ nếu
   * điểm chạy không phải điểm trên đường. Trả về danh sách id còn lại.
   */
  afterTool(kind, ids) {
    const vals = evaluate(this.doc);
    const bad = ids.filter((id) => !vals.get(id));
    if (bad.length) this.doc.steps = removeSteps(this.doc, bad).doc.steps;
    const left = ids.filter((id) => !bad.includes(id));
    if (kind === 'fixedPoint') {
      if (!left.length) toast('Không tìm thấy điểm cố định: đường này không đi qua điểm cố định nào khi điểm đã chọn thay đổi (hoặc điểm đó không đổi được)', 5000);
      else toast(left.length === 1 ? `Điểm cố định: ${this.name(left[0])}` : `Có hai điểm cố định: ${left.map((id) => this.name(id)).join(', ')}`);
    } else if (kind === 'locus' && !left.length) {
      toast('Điểm chạy phải là điểm nằm trên một đường (dựng bằng công cụ Điểm bấm lên đường thẳng/đường tròn), và điểm cần vẽ quỹ tích phải phụ thuộc vào nó', 5500);
    }
    return left;
  }

  /** Phía của đường tạo góc theo chỗ chuột (extraPos): cùng phía với chuột so với đường OX. */
  extraFlip(O, X, A, B, C) {
    const [o, x] = [O, X].map((id) => this.values.get(id));
    const P = this.extraPos || this.mouse;
    const a = G.directedAngle(...[A, B, C].map((id) => this.values.get(id))); // độ
    if (!o || !x || a == null) return false;
    const side = (x.x - o.x) * (P.y - o.y) - (x.y - o.y) * (P.x - o.x);
    const sn = Math.sin((a * Math.PI) / 180);
    return Math.abs(sn) > 1e-12 && Math.sign(side) !== Math.sign(sn);
  }

  /** Toạ độ (u, v) của điểm P trong tam giác (A, B, C là id), kẹp vào trong tam giác: u, v ≥ 0, u + v ≤ 1. */
  uvInTriangle([A, B, C], P) {
    const [a, b, c] = [A, B, C].map((id) => this.values.get(id));
    return clampUV(a, b, c, P);
  }

  startExtraPreview(tool) {
    this.renderer.clearExtra();
    const r = this.renderer;
    const v = (id) => () => this.values.get(id);
    if (tool.extraPreview === 'angle_line') {
      const [A, B, C, O, X] = this.picks;
      const dirPt = () => {
        const flip = this.extraFlip(O, X, A, B, C);
        const [o, x, a, b, c] = [O, X, A, B, C].map((id) => this.values.get(id));
        const ang = G.directedAngle(a, b, c);
        return ang == null ? null : G.rotatePoint(x, o, flip ? -ang : ang);
      };
      r.addExtra({ type: 'ray', pts: [v(O), dirPt], style: { color: '#2563eb' } });
    } else if (tool.id === 'point_in') {
      const [A, B, C] = this.picks;
      r.addExtra({ type: 'polyline', pts: [v(A), v(B), v(C), v(A)], style: { color: '#2563eb' } });
      r.addExtra({ type: 'point', pts: [() => {
        const [a, b, c] = [A, B, C].map((id) => this.values.get(id));
        const uv = clampUV(a, b, c, this.mouse);
        return { x: a.x + uv.u * (b.x - a.x) + uv.v * (c.x - a.x), y: a.y + uv.u * (b.y - a.y) + uv.v * (c.y - a.y) };
      }], style: { size: 4 } });
    }
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
        // giữ Shift khi đang dựng: hình xem trước cũng được căn hướng
        if (ev.shiftKey && this.picks.length && this.toolId !== 'move') { const an = this.pickAnchors(); if (an.length) this.mouse = this.angleSnap(this.mouse, an); }
        if ((this.picks.length || this.awaitExtra) && this.renderer.extra.length) this.view.requestDraw();
        const hits = this.hitTest(sx, sy);
        let cursor = '';
        const cross = this.toolId === 'move' && this.mode === 'edit' && !ev.shiftKey ? this.crossingAt(sx, sy, hits) : null;
        this.showCrossMark(cross);
        if (cross) cursor = 'copy';
        else if (this.toolId === 'move' || this.mode === 'present') {
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
      if (h && h.kind === 'point') this.inlineRename(h.id, null);
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
    if (!e.target.closest('#board')) return; // thẻ nổi (thuộc tính, tuỳ chọn) nằm trên bảng vẽ: để chúng tự xử lý
    if (e.button !== undefined && e.button !== 0) return;
    if (document.querySelector('.modal-back')) return;
    this.boardRect = null;
    const { sx, sy } = this.eventPos(e);
    if (sx < 0 || sy < 0 || sx > this.view.W || sy > this.view.H) return;
    if (this.panning) { this.startPan(e); return; } // ngón thứ hai: chụm để phóng
    this.mouse = this.toUser(sx, sy);

    // Alt + bấm: ẩn ngay đối tượng được bấm (đường phụ sau khi đã lấy giao điểm…), công cụ nào cũng được
    if (e.altKey && this.mode === 'edit' && !this.picks.length) {
      const h = this.hitTest(sx, sy)[0];
      if (h) {
        e.stopPropagation();
        e.preventDefault();
        const s = stepById(this.doc, h.id);
        this.selection.delete(h.id);
        this.setStepProp(h.id, 'hidden', true);
        toast(`Đã ẩn ${s.name || 'đối tượng'} – Ctrl+Z để hiện lại`);
        return;
      }
    }

    if (this.redefine) {
      e.stopPropagation();
      e.preventDefault();
      const { id, i, t } = this.redefine;
      let h = this.hitTest(sx, sy).find((x) => x.kind !== 'mark' && argAccepts(t, x.kind) && x.id !== id);
      let nid = h?.id;
      if (!nid && argAccepts(t, 'point')) { this.beginTx(); nid = this.resolvePoint(sx, sy, this.hitTest(sx, sy)); }
      this.redefine = null;
      this.stage.classList.toggle('tool-active', this.toolId !== 'move');
      if (!nid) { this.endTx(); this.refresh(); return this.showHint(); }
      const ok = this.redefineArg(id, i, nid);
      if (this.tx) { if (!ok) this.doc = JSON.parse(this.tx); this.endTx(); }
      this.selection = new Set([id]);
      this.afterChange();
      this.showHint();
      return;
    }

    if (this.toolId !== 'move' && this.mode === 'edit') {
      e.stopPropagation();
      e.preventDefault();
      this.toolClick(sx, sy, e.shiftKey);
      this.shiftSnap = false;
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
    // số đo: kéo để dời chữ
    if (h && h.measure && this.mode === 'edit') {
      e.stopPropagation();
      e.preventDefault();
      const p = step.params || {};
      this.select(h.id, e.shiftKey, false);
      this.startDrag(e, { kind: 'measure', id: h.id, start: JSON.stringify(this.doc), sx, sy, off: [p.dx || 0, p.dy || 0] });
      return;
    }
    if (h && h.kind === 'point' && isDraggableType(step.type)) {
      e.stopPropagation();
      e.preventDefault();
      this.startDrag(e, { kind: 'point', id: h.id, start: JSON.stringify(this.doc) });
      if (this.mode === 'edit') this.select(h.id, e.shiftKey, false);
      return;
    }
    // bấm đúng chỗ hai đường cắt nhau (chưa có điểm): lấy giao điểm luôn, chọn sẵn để gõ tên
    const cross = this.mode === 'edit' && !e.shiftKey ? this.crossingAt(sx, sy, hits) : null;
    if (cross) {
      e.stopPropagation();
      e.preventDefault();
      this.beginTx();
      const ids = this.createIntersections(cross.a, cross.b, this.toUser(sx, sy));
      this.endTx();
      this.clearCrossMark();
      this.selection = new Set(ids.length ? [ids[0]] : []);
      this.afterChange();
      return;
    }
    if (h) {
      e.stopPropagation();
      e.preventDefault();
      if (this.mode === 'edit') this.select(h.id, e.shiftKey);
      return;
    }
    // ảnh dán vào hình (không khoá): chọn, kéo để dời, kéo ô góc để đổi cỡ
    const imh = this.mode === 'edit' ? this.imageAt(sx, sy) : null;
    if (imh) {
      e.stopPropagation();
      e.preventDefault();
      if (this.imageSel !== imh.id) this.selectImage(imh.id);
      this.startImageDrag(e, imh.id, imh.handle);
      return;
    }
    // Ctrl + kéo chỗ trống: chọn vùng (thêm Shift: chọn thêm)
    if ((e.ctrlKey || e.metaKey) && this.mode === 'edit') {
      e.preventDefault();
      this.startMarquee(e, e.shiftKey);
      return;
    }
    // chỗ trống: bỏ chọn, dời hình
    e.preventDefault();
    if (this.mode === 'edit' && (this.selection.size || this.imageSel) && !e.shiftKey) {
      this.selection.clear();
      this.imageSel = null;
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
    const anchors = info.kind === 'point' && step.type === 'free_point' ? this.dragAnchors(info.id) : [];
    const apply = () => {
      if (!pending) return;
      const { sx, sy, shift } = pending;
      pending = null;
      this.mouse = this.toUser(sx, sy);
      if (info.kind === 'measure') {
        const sc = this.projector ? 1.9 : 1;
        step.params = { ...(step.params || {}), dx: round1(info.off[0] + (sx - info.sx) / sc), dy: round1(info.off[1] + (sy - info.sy) / sc) };
        this.view.requestDraw();
        return;
      }
      if (info.kind === 'label') {
        const sc = this.projector ? 1.9 : 1;
        const off = [round1(info.off[0] + (sx - info.sx) / sc), round1(info.off[1] - (sy - info.sy) / sc)];
        step.style = { ...(step.style || {}), labelOffset: off };
        this.renderer.setLabelOffset(info.id, off);
        return;
      }
      const target = { x: this.mouse.x + info.grab.x, y: this.mouse.y + info.grab.y };
      if (step.type === 'free_point') {
        const Q = shift && anchors.length ? this.angleSnap(target, anchors) : this.snap(target);
        step.params = { ...(step.params || {}), x: Q.x, y: Q.y };
      } else if (step.type === 'point_on') {
        const c = this.values.get(step.args[0]);
        if (c) step.params = { ...(step.params || {}), t: round9(G.paramOf(c, target)) };
      } else if (step.type === 'point_in') {
        step.params = { ...(step.params || {}), ...this.uvInTriangle(step.args, target) };
      }
      this.quickUpdate();
    };
    this.view.frameHooks.push(apply);
    const move = (ev) => {
      pending = { ...this.eventPos(ev), shift: ev.shiftKey };
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

  /**
   * Ctrl + kéo: chọn mọi điểm trong khung, cùng các đối tượng dựng hoàn toàn từ những thứ đã chọn (đoạn AB khi A, B
   * trong khung; đường tròn (ABC); đường vuông góc từ A xuống BC…).
   */
  startMarquee(e, additive) {
    const a = this.eventPos(e);
    let b = a;
    const box = () => ({ x1: Math.min(a.sx, b.sx), x2: Math.max(a.sx, b.sx), y1: Math.min(a.sy, b.sy), y2: Math.max(a.sy, b.sy) });
    const P = (f) => () => this.toUser(f().sx, f().sy);
    const corners = [P(() => ({ sx: box().x1, sy: box().y1 })), P(() => ({ sx: box().x2, sy: box().y1 })), P(() => ({ sx: box().x2, sy: box().y2 })), P(() => ({ sx: box().x1, sy: box().y2 }))];
    this.renderer.clearExtra();
    this.renderer.addExtra({ type: 'polyline', pts: [...corners, corners[0]], style: { color: '#2563eb', width: 1 } });
    const move = (ev) => { b = this.eventPos(ev); this.view.requestDraw(); };
    const up = () => {
      window.removeEventListener('pointermove', move, true);
      window.removeEventListener('pointerup', up, true);
      window.removeEventListener('pointercancel', up, true);
      this.renderer.clearExtra();
      const r = box();
      const sel = additive ? new Set(this.selection) : new Set();
      if (r.x2 - r.x1 > 3 || r.y2 - r.y1 > 3) for (const id of this.objectsInBox(r)) sel.add(id);
      this.selection = sel;
      this.refresh();
      if (sel.size) this.showHint(`Đã chọn ${sel.size} đối tượng · Ctrl+H: ẩn · Delete: xoá · Ctrl+C: chép · hoặc gọi một công cụ để dựng trên chúng`);
    };
    window.addEventListener('pointermove', move, true);
    window.addEventListener('pointerup', up, true);
    window.addEventListener('pointercancel', up, true);
  }

  objectsInBox(r) {
    const k = kinds(this.doc);
    const out = new Set();
    for (const s of this.doc.steps) {
      if (!isShown(this.doc, s)) continue;
      const v = this.values.get(s.id);
      if (!v) continue;
      if (k.get(s.id) === 'point') {
        const q = this.toScreen(v);
        if (q.x >= r.x1 && q.x <= r.x2 && q.y >= r.y1 && q.y <= r.y2) out.add(s.id);
      } else if (s.args.length && s.args.every((a) => out.has(a))) out.add(s.id);
    }
    return [...out];
  }

  // ================= chép / dán (bản 1.7) =================
  /** Các bước cần chép: đối tượng đang chọn cùng mọi đối tượng cha của chúng (theo thứ tự dựng). */
  copySelection() {
    const sel = [...this.selection].filter((id) => stepById(this.doc, id));
    if (!sel.length) return null;
    const need = new Set(sel);
    for (let i = this.doc.steps.length - 1; i >= 0; i--) {
      const s = this.doc.steps[i];
      if (need.has(s.id)) for (const a of s.args) need.add(a);
    }
    const steps = clone({ steps: this.doc.steps.filter((s) => need.has(s.id)) }).steps;
    for (const s of steps) delete s.joinPrev;
    this.clipboard = { format: 'hinh-hoc-dong-chep', version: 1, steps, selected: sel, from: this.tabIdx };
    toast(`Đã chép ${sel.length} đối tượng${steps.length > sel.length ? ` (kèm ${steps.length - sel.length} đối tượng cha)` : ''} – Ctrl+V để dán (cả sang tab khác)`);
    return this.clipboard;
  }

  /**
   * Dán: thêm các bước đã chép với id mới. Tên đã có trên hình thì đặt tên mới. Dán vào chính hình vừa chép thì các
   * điểm tự do được dời đi một chút (bản sao tách khỏi hình gốc).
   */
  pasteClip(clip) {
    if (!clip || clip.format !== 'hinh-hoc-dong-chep' || !Array.isArray(clip.steps) || !clip.steps.length) return false;
    const same = clip.from === this.tabIdx && clip.steps.some((s) => stepById(this.doc, s.id)?.type === s.type);
    const map = new Map();
    const k = new Map();
    const before = JSON.stringify(this.doc);
    const added = [];
    const off = same ? 0.08 * this.figureScale() : 0;
    for (const s0 of clip.steps) {
      const def = STEP_TYPES[s0.type];
      if (!def) continue;
      const s = clone(s0);
      s.id = newId(this.doc);
      s.args = s.args.map((a) => map.get(a) ?? a);
      if (s.args.some((a) => !stepById(this.doc, a))) {
        this.doc = JSON.parse(before);
        toast('Không dán được: thiếu đối tượng cha');
        return false;
      }
      if (s.type === 'free_point' && off) s.params = { ...s.params, x: round6(s.params.x + off), y: round6(s.params.y - off) };
      const kind = def.kind === 'same' ? kinds(this.doc).get(s.args[0]) : def.kind;
      if (s.name && this.nameUsed(s.name)) s.name = nextName(this.doc, kind);
      this.doc.steps.push(s);
      map.set(s0.id, s.id);
      k.set(s.id, kind);
      added.push(s.id);
    }
    if (!added.length) return false;
    for (const id of added.slice(1)) stepById(this.doc, id).joinPrev = true;
    this.pushUndo(before);
    this.selection = new Set((clip.selected || []).map((id) => map.get(id)).filter(Boolean));
    this.afterChange();
    toast(`Đã dán ${added.length} đối tượng`);
    return true;
  }

  // ================= sửa đối tượng cha (bản 1.7) =================
  /** Bắt đầu thay đối số thứ i của bước id: lần bấm tiếp theo trên hình chọn đối tượng thay thế. */
  startRedefine(id, i) {
    const s = stepById(this.doc, id);
    if (!s) return;
    const def = STEP_TYPES[s.type];
    const t = def.args[0] === '...point' ? 'point' : def.args[i];
    this.redefine = { id, i, t };
    this.showHint(`Thay ${this.name(s.args[i]) || 'đối tượng'} của ${s.name || 'đối tượng'}: bấm vào ${typeName(t)} thay thế (Esc: huỷ)`);
    this.stage.classList.add('tool-active');
  }

  /** Thay đối số; bước và các bước phụ thuộc được dời xuống sau đối tượng mới nếu cần. */
  redefineArg(id, i, newArg) {
    const s = stepById(this.doc, id);
    if (!s || newArg === id || dependents(this.doc, [id]).has(newArg)) { toast('Không thay được: đối tượng mới phụ thuộc vào chính đối tượng đang sửa'); return false; }
    const k = kinds(this.doc);
    const def = STEP_TYPES[s.type];
    const t = def.args[0] === '...point' ? 'point' : def.args[i];
    if (!argAccepts(t, k.get(newArg))) { toast(`Cần chọn ${typeName(t)}`); return false; }
    this.commit((doc) => {
      stepById(doc, id).args[i] = newArg;
      doc.steps = topoOrder(doc.steps);
    });
    toast(`Đã thay: ${this.name(id) || 'đối tượng'} giờ dựng từ ${this.name(newArg)}`);
    return true;
  }

  select(id, additive = false, rerender = true) {
    this.imageSel = null;
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
    const v = await promptDialog('Đổi tên', s.name, 'Gõ như công thức: I_A → I với chỉ số A, X_{AB} → chỉ số AB, B\' → B phẩy, A1 → A₁.');
    if (v == null) return;
    this.setName(id, v.trim());
  }

  /**
   * Đặt tên ngay trên hình: ô nhập nhỏ hiện cạnh nhãn. Mở bằng cách GÕ CHỮ khi đang chọn một điểm (vd điểm vừa
   * dựng), F2, hoặc nháy đúp. Enter/bấm ra ngoài: lưu; Esc: bỏ.
   */
  inlineRename(id, first = null) {
    const s = stepById(this.doc, id);
    const v = this.values.get(id);
    if (!s || !s.name || !v || this.mode !== 'edit') return;
    document.querySelector('.inline-name')?.remove();
    const inp = document.createElement('input');
    inp.className = 'inline-name';
    inp.type = 'text';
    inp.spellcheck = false;
    inp.value = first ?? s.name;
    inp.title = 'Gõ như công thức: I_A, X_{AB}, B\', A1 → A₁. Enter để lưu, Esc để bỏ.';
    const p = this.toScreen(v);
    const off = this.renderer.labelOffsets.get(id) || [9, 9];
    const sc = this.projector ? 1.9 : 1;
    inp.style.left = Math.max(4, Math.min(this.view.W - 90, p.x + off[0] * sc - 20)) + 'px';
    inp.style.top = Math.max(4, Math.min(this.view.H - 30, p.y - off[1] * sc - 13)) + 'px';
    this.stage.appendChild(inp);
    let done = false;
    const finish = (save) => {
      if (done) return;
      done = true;
      const val = inp.value.trim();
      inp.remove();
      if (save && val) this.setName(id, val);
      this.showHint();
    };
    inp.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') { e.preventDefault(); finish(true); }
      else if (e.key === 'Escape') { e.preventDefault(); finish(false); }
    });
    inp.addEventListener('blur', () => finish(true));
    inp.focus();
    if (first == null) inp.select();
    else inp.setSelectionRange(inp.value.length, inp.value.length);
  }

  /** Đổi tên; nếu tên đã thuộc đối tượng khác thì ĐỔI CHỖ hai tên (vd tam giác vuông dựng ở A mà đề cần vuông ở C). */
  setName(id, name) {
    const s = stepById(this.doc, id);
    if (!name || name === s.name) return false;
    const other = this.doc.steps.find((x) => x.name === name && x.id !== id);
    const old = s.name;
    // đang soạn khung chữ: lưu trước, để chữ trong bộ soạn cũng được đổi tên
    if (this.textBoxes && this.textBoxes.editing) this.textBoxes.stopEdit(true);
    this.commit((doc) => {
      // tên điểm trong các khung chữ (đề, lời giải, ghi chú) đổi theo – cùng một bước hoàn tác
      const k = kinds(doc);
      const pts = doc.steps.filter((x) => k.get(x.id) === 'point' && x.name).map((x) => ({ name: x.name, id: x.id }));
      const ren = new Map([[id, name], ...(other ? [[other.id, old]] : [])]);
      for (const b of doc.boxes || []) b.text = renameInText(b.text, pts, ren);
      if (other) other.name = old;
      s.name = name;
    });
    if (other) toast(`Đã đổi chỗ tên: ${name} ↔ ${old}`);
    return true;
  }

  /** Ctrl+H: ẩn các đối tượng đang chọn (vẫn tính, vẫn dùng để dựng tiếp; hiện lại ở menu Sửa hoặc bảng các bước). */
  hideSelected() {
    const ids = [...this.selection].filter((id) => stepById(this.doc, id));
    if (!ids.length) return toast('Chọn đối tượng cần ẩn trước (công cụ Chọn, bấm vào đối tượng; giữ Shift để chọn nhiều)');
    this.commit((doc) => { for (const id of ids) stepById(doc, id).hidden = true; });
    this.selection.clear();
    this.refresh();
    toast(`Đã ẩn ${ids.length} đối tượng – hiện lại: Sửa › Hiện các đối tượng đã ẩn (Ctrl+Shift+H), hoặc nút ● trong bảng các bước`, 4500);
  }

  /** Hiện lại mọi đối tượng đã ẩn. */
  showHidden() {
    const n = this.doc.steps.filter((s) => s.hidden).length;
    if (!n) return toast('Không có đối tượng nào đang ẩn');
    this.commit((doc) => { for (const s of doc.steps) delete s.hidden; });
    toast(`Đã hiện lại ${n} đối tượng (Ctrl+Z để ẩn lại)`);
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
      this.renderer.ghostLines = false;
    } else this.setTool(this.toolId);
    this.refresh();
    this.showHint();
  }

  gotoFrame(i) {
    const n = this.frameCount();
    this.frameIdx = Math.max(0, Math.min(n - 1, i));
    this.refresh();
  }

  updatePresentBar() {
    const lab = document.getElementById('frame-label');
    if (!lab) return;
    const n = this.frameCount();
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

  setThemeId(id) {
    this.theme = setTheme(id);
    savePref('theme', this.theme);
    this.updateMenuChecks();
    this.refresh();
  }

  /** Hiện/ẩn bảng các bước dựng (mặc định ẩn để dành chỗ cho bảng vẽ). */
  togglePanel(show = !document.body.classList.contains('panel-open'), remember = true) {
    document.body.classList.toggle('panel-open', !!show);
    if (remember) savePref('panel', show ? '1' : '0');
    this.updateMenuChecks();
    setTimeout(() => { this.view.resize(); this.boardRect = null; }, 0);
  }

  updateMenuChecks() {
    document.querySelectorAll('[data-theme]').forEach((b) => b.classList.toggle('on', b.dataset.theme === this.theme));
    document.getElementById('btn-grid')?.classList.toggle('on', this.grid);
    document.getElementById('btn-aux')?.classList.toggle('on', !this.doc.hideAux);
    document.getElementById('btn-trim')?.classList.toggle('on', !!this.renderer?.trimLines);
    document.getElementById('menu-panel')?.classList.toggle('on', document.body.classList.contains('panel-open'));
    document.getElementById('btn-panel')?.classList.toggle('on', document.body.classList.contains('panel-open'));
  }

  /** Hiện/ẩn mọi đường phụ cùng lúc (lưu trong hình: doc.hideAux). */
  toggleAux() {
    const n = this.doc.steps.filter((s) => s.aux).length;
    const hide = !this.doc.hideAux;
    this.commit((doc) => { if (hide) doc.hideAux = true; else delete doc.hideAux; });
    this.updateMenuChecks();
    toast(hide ? `Đã ẩn ${n} đường phụ (Ctrl+Shift+D để hiện lại)` : n ? `Đã hiện ${n} đường phụ` : 'Chưa có đường phụ nào: đường vuông góc, song song, trung trực, phân giác dựng thêm là đường phụ (bỏ chọn ở thẻ thuộc tính để thành đường chính)', 4000);
  }

  toggleGrid() {
    this.grid = !this.grid;
    this.renderer.grid = this.grid;
    this.updateMenuChecks();
    this.view.requestDraw();
  }

  zoomFit() {
    const pts = [];
    const vis = this.visibleSet();
    for (const s of this.doc.steps) {
      if (!isShown(this.doc, s) || (vis && !vis.has(s.id))) continue;
      const v = this.values.get(s.id);
      if (!v) continue;
      if (v.kind === 'point') pts.push(v);
      if (v.kind === 'circle') pts.push({ x: v.c.x - v.r, y: v.c.y - v.r }, { x: v.c.x + v.r, y: v.c.y + v.r });
    }
    for (const im of this.doc.images || []) pts.push({ x: im.x, y: im.y }, { x: im.x + im.w, y: im.y - im.h });
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
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) return;
      const ctrl = e.ctrlKey || e.metaKey;
      // Ctrl+Enter: soạn lời giải (khung chữ), con trỏ ở cuối
      if (ctrl && e.key === 'Enter' && this.mode === 'edit' && this.textBoxes) { e.preventDefault(); this.textBoxes.editSolution(); return; }
      // chuyển tab hình: Alt+1…9 (tab thứ n), Alt+PageUp/PageDown (tab trước/sau) – Ctrl+Tab bị trình duyệt giữ
      if (e.altKey && !ctrl && this.tabs.length > 1) {
        const d = /^Digit([1-9])$/.exec(e.code);
        const n = this.tabs.length;
        if (d) { e.preventDefault(); this.switchTab(Math.min(+d[1], n) - 1); return; }
        if (e.key === 'PageDown' || e.key === 'PageUp') { e.preventDefault(); this.switchTab((this.tabIdx + (e.key === 'PageDown' ? 1 : n - 1)) % n); return; }
      }
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
      // gõ chữ khi đang chọn MỘT điểm (vd điểm vừa dựng) → đặt tên ngay; F2 → sửa tên
      if (!ctrl && !e.altKey && this.selection.size === 1 && !this.picks.length && (e.key === 'F2' || (e.key.length === 1 && /[\p{L}\d_'{}]/u.test(e.key)))) {
        const id = [...this.selection][0];
        if (kinds(this.doc).get(id) === 'point' && stepById(this.doc, id)?.name) {
          e.preventDefault();
          this.inlineRename(id, e.key === 'F2' ? null : e.key);
          return;
        }
      }
      if (e.key === 'Home') { e.preventDefault(); this.zoomFit(); return; }
      if (e.key === 'Escape') {
        if (this.redefine) { this.redefine = null; this.stage.classList.toggle('tool-active', this.toolId !== 'move'); this.showHint(); }
        else if (this.picks.length || this.awaitExtra) this.cancelTool();
        else if (this.toolId !== 'move') this.setTool('move');
        else { this.selection.clear(); this.imageSel = null; this.setRelation(null); }
      } else if (e.key === 'Enter' && this.picks.length >= 3 && TOOL_BY_ID[this.toolId].inputs[0] === '...point') {
        this.completeTool(TOOL_BY_ID[this.toolId]);
      } else if (ctrl && e.shiftKey && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        this.toggleAux();
      } else if (ctrl && (e.key === 'h' || e.key === 'H') && e.shiftKey) {
        e.preventDefault();
        this.showHidden();
      } else if (ctrl && (e.key === 'h' || e.key === 'H') && !e.shiftKey) {
        e.preventDefault();
        this.hideSelected();
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && this.selection.size) {
        e.preventDefault();
        this.deleteSteps([...this.selection]);
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && this.imageSel) {
        e.preventDefault();
        this.deleteImage(this.imageSel);
      }
    });
    // chép / dán đối tượng (bản 1.7): giữ trong bộ nhớ (dán sang tab khác) và ghi JSON vào clipboard (sang cửa sổ khác)
    const editable = (t) => { const tag = (t.tagName || '').toLowerCase(); return tag === 'input' || tag === 'textarea' || t.isContentEditable || !!t.closest?.('.cm-editor'); };
    document.addEventListener('copy', (e) => {
      if (editable(e.target) || document.querySelector('.modal-back') || this.mode !== 'edit' || !this.selection.size) return;
      if (String(window.getSelection?.() || '').trim()) return; // đang bôi đen chữ (lời giải…): để trình duyệt chép chữ
      const clip = this.copySelection();
      if (!clip) return;
      e.preventDefault();
      try { e.clipboardData.setData('text/plain', JSON.stringify(clip)); } catch { /* chỉ giữ trong bộ nhớ */ }
    });
    document.addEventListener('paste', (e) => {
      if (editable(e.target) || document.querySelector('.modal-back') || this.mode !== 'edit') return;
      const items = [...(e.clipboardData?.items || [])];
      if (items.some((it) => it.kind === 'file')) return; // ảnh: images.js
      const text = e.clipboardData ? e.clipboardData.getData('text/plain') : '';
      let clip = null;
      if (text && text.includes('hinh-hoc-dong-chep')) { try { clip = JSON.parse(text); } catch { clip = null; } }
      else if (!text) clip = this.clipboard;
      if (!clip) return;
      e.preventDefault();
      this.pasteClip(clip);
    });
    document.addEventListener('fullscreenchange', () => {
      if (!document.fullscreenElement && this.projector) this.setProjector(false);
    });
  }

  /** Nạp công cụ tự tạo (lưu trong trình duyệt) và gắn vào menu "Công cụ › 7. Công cụ của tôi". */
  loadUserTools() {
    let list = [];
    try { list = JSON.parse(loadPref('tools', '[]')); } catch { list = []; }
    this.userTools = Array.isArray(list) ? list.filter(validMacro) : [];
    for (const id of Object.keys(TOOL_BY_ID)) if (TOOL_BY_ID[id].user) delete TOOL_BY_ID[id];
    for (const d of this.userTools) TOOL_BY_ID[d.id] = macroTool(d);
    const userIds = this.userTools.map((d) => d.id);
    this.toolbarGroups = TOOLBAR.map((g) => (g.id === 'library' ? { ...g, tools: [...g.tools, ...userIds], submenus: [...g.submenus, USER_MENU] } : g));
  }

  saveUserTools() {
    savePref('tools', JSON.stringify(this.userTools));
    this.loadUserTools();
    this.buildToolbar();
    this.markActiveTool(this.toolId);
  }

  async userToolAction(action, arg) {
    if (action === 'create') {
      const r0 = createMacro(this.doc, [...this.selection], 'x');
      if (!r0.ok) return toast(r0.error, 5000);
      const name = await promptDialog('Tạo công cụ mới', '', `Đầu vào: ${r0.tool.inputs.length} (${r0.tool.inputs.map((t) => ({ point: 'điểm', line: 'đường thẳng', circle: 'đường tròn' })[t]).join(', ')}); ${r0.tool.steps.length} bước dựng. Đặt tên cho công cụ:`);
      if (!name || !name.trim()) return;
      r0.tool.label = name.trim();
      this.userTools.push(r0.tool);
      this.saveUserTools();
      toast(`Đã tạo công cụ "${r0.tool.label}" (Công cụ › ${USER_MENU})`, 4000);
    } else if (action === 'delete') {
      const d = this.userTools.find((x) => x.id === arg);
      if (!d || !(await confirmDialog('Xoá công cụ', `Xoá công cụ <b>${escapeHTML(d.label)}</b>?`, 'Xoá'))) return;
      this.userTools = this.userTools.filter((x) => x.id !== arg);
      if (this.toolId === arg) this.setTool('move');
      this.saveUserTools();
    } else if (action === 'export') {
      if (!this.userTools.length) return toast('Chưa có công cụ tự tạo nào');
      downloadFile('cong-cu-cua-toi.json', JSON.stringify({ format: 'hinh-hoc-dong-cong-cu', version: 1, tools: this.userTools }, null, 1), 'application/json');
    } else if (action === 'import') {
      const inp = document.createElement('input');
      inp.type = 'file';
      inp.accept = '.json,application/json';
      inp.onchange = async () => {
        try {
          const data = JSON.parse(await inp.files[0].text());
          const list = (Array.isArray(data) ? data : data.tools || []).filter(validMacro);
          if (!list.length) throw new Error('Tệp không chứa công cụ hợp lệ');
          for (const d of list) { this.userTools = this.userTools.filter((x) => x.id !== d.id); this.userTools.push(d); }
          this.saveUserTools();
          toast(`Đã nhập ${list.length} công cụ`);
        } catch (e) { toast('Không nhập được: ' + e.message, 5000); }
      };
      inp.click();
    }
  }

  buildToolbar() {
    const host = document.getElementById('tools');
    if (!this.toolbarGroups) this.loadUserTools();
    const groups = this.toolbarGroups;
    this.groupCurrent = this.groupCurrent || {};
    for (const g of groups) if (!this.groupCurrent[g.id]) this.groupCurrent[g.id] = g.tools[0];
    host.innerHTML = groups
      .map((g) => {
        const many = g.tools.length > 1 || g.menu;
        const btn = (id) => {
          const t = TOOL_BY_ID[id];
          const kb = keyOf(id);
          return `<button class="tool" data-tool="${id}" title="${escapeHTML(t.label)}${kb ? ` (${kb})` : ''}"><span class="ti">${t.icon}</span><span class="tl">${escapeHTML(t.label)}</span>${kb ? `<kbd>${kb}</kbd>` : ''}</button>`;
        };
        // nhóm có menu con (thư viện "Công cụ"): mỗi mục menu mở ra danh sách công cụ bên phải
        const items = g.submenus
          ? g.submenus.map((m) => {
            const ids = g.tools.filter((id) => TOOL_BY_ID[id].menu === m);
            let list = ids.map(btn).join('');
            if (m === USER_MENU) {
              list = ids.map((id) => `<div class="user-tool">${btn(id)}<button class="tool-del" data-del="${id}" title="Xoá công cụ này">✕</button></div>`).join('') +
                (ids.length ? '<div class="menu-sep"></div>' : '<div class="note" style="padding:4px 8px">Chưa có công cụ nào. Chọn các đối tượng kết quả trên hình (Shift để chọn nhiều, có thể chọn cả đối tượng ban đầu) rồi bấm "Tạo công cụ".</div>') +
                '<button class="tool-action" data-action="create">＋ Tạo công cụ từ các đối tượng đang chọn…</button>' +
                '<button class="tool-action" data-action="export">Xuất các công cụ ra tệp…</button>' +
                '<button class="tool-action" data-action="import">Nhập công cụ từ tệp…</button>';
            }
            return `<div class="sub"><button class="sub-title">${escapeHTML(m)}<span class="caret">›</span></button><div class="sub-pop">${list}</div></div>`;
          }).join('') + (g.extraHTML ? g.extraHTML(this) : '')
          : g.tools.map(btn).join('');
        return `<div class="tb-group" data-group="${g.id}">
          <button class="tb-btn" data-group="${g.id}" title="${escapeHTML(g.label)}">${ICONS[g.icon] || ''}${many ? '<span class="tb-more"></span>' : ''}</button>
          ${many ? `<div class="flyout"><div class="flyout-title">${escapeHTML(g.label)}</div>${items}</div>` : ''}
        </div>`;
      })
      .join('') + '<div id="tb-recent" class="tb-recent" title="Công cụ vừa dùng"></div>';
    this.renderRecent();
    const closeAll = () => host.querySelectorAll('.tb-group.open, .sub.open').forEach((x) => x.classList.remove('open'));
    if (this.toolbarBound) return;
    this.toolbarBound = true;
    // rê chuột qua mục menu con thì mở luôn (như menu thường)
    host.addEventListener('mouseover', (e) => {
      const st = e.target.closest('.sub-title');
      if (!st || st.parentElement.classList.contains('open')) return;
      st.parentElement.parentElement.querySelectorAll('.sub.open').forEach((x) => x.classList.remove('open'));
      st.parentElement.classList.add('open');
    });
    host.onclick = (e) => {
      const act = e.target.closest('[data-action], [data-del]');
      if (act) {
        closeAll();
        this.userToolAction(act.dataset.action || 'delete', act.dataset.del);
        return;
      }
      const rc = e.target.closest('[data-recent]');
      if (rc) { closeAll(); this.setTool(rc.dataset.recent); return; }
      const tb = e.target.closest('.tb-btn');
      const tl = e.target.closest('.tool');
      const st = e.target.closest('.sub-title');
      if (st) {
        const subEl = st.parentElement;
        subEl.parentElement.querySelectorAll('.sub.open').forEach((x) => x !== subEl && x.classList.remove('open'));
        subEl.classList.add('open');
        return;
      }
      if (tl) {
        const g = tl.closest('.tb-group').dataset.group;
        this.groupCurrent[g] = tl.dataset.tool;
        closeAll();
        this.setTool(tl.dataset.tool);
        return;
      }
      if (!tb) return;
      const gEl = tb.closest('.tb-group');
      const g = this.toolbarGroups.find((x) => x.id === tb.dataset.group);
      const wasOpen = gEl.classList.contains('open');
      closeAll();
      if (g.menu) { if (!wasOpen) { gEl.classList.add('open'); g.menu(gEl.querySelector('.flyout'), this, closeAll); } return; }
      if (!g.submenus) this.setTool(this.groupCurrent[g.id]);
      if (g.tools.length > 1 && !wasOpen) gEl.classList.add('open');
    };
    // bấm ra ngoài khi danh sách đang mở: chỉ đóng danh sách (không để lần bấm đó tạo điểm trên hình)
    document.addEventListener('pointerdown', (e) => {
      if (e.target.closest('#tools') || !host.querySelector('.tb-group.open')) return;
      closeAll();
      if (e.target.closest('#board')) { e.stopPropagation(); e.preventDefault(); }
    }, true);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAll(); });
  }

  /** Công cụ vừa dùng (tối đa 6) – hiện ở cuối thanh công cụ dọc, chọn lại bằng MỘT lần bấm. */
  rememberTool(id) {
    if (!this.recentTools) { try { this.recentTools = JSON.parse(loadPref('recent', '[]')); } catch { this.recentTools = []; } }
    if (id !== 'move' && TOOL_BY_ID[id]) {
      this.recentTools = [id, ...this.recentTools.filter((x) => x !== id)].slice(0, 6);
      savePref('recent', JSON.stringify(this.recentTools));
    }
    this.renderRecent();
  }

  renderRecent() {
    const host = document.getElementById('tb-recent');
    if (!host) return;
    const list = (this.recentTools || []).filter((id) => TOOL_BY_ID[id]);
    host.innerHTML = list.map((id) => `<button class="tb-rc${id === this.toolId ? ' active' : ''}" data-recent="${id}" title="${escapeHTML(TOOL_BY_ID[id].label)}">${TOOL_BY_ID[id].icon}</button>`).join('');
    host.style.display = list.length ? '' : 'none';
  }

  /** Đánh dấu công cụ đang dùng trên thanh công cụ. */
  markActiveTool(id) {
    const groups = this.toolbarGroups || TOOLBAR;
    this.groupCurrent ||= {};
    document.querySelectorAll('#tools .tool').forEach((b) => b.classList.toggle('active', b.dataset.tool === id));
    for (const g of groups) {
      const on = g.tools.includes(id) || !!(g.isActive && g.isActive(id));
      if (g.tools.includes(id)) this.groupCurrent[g.id] = id;
      document.querySelector(`#tools .tb-group[data-group="${g.id}"]`)?.classList.toggle('active', on);
    }
  }

  bindButtons() {
    const on = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('click', fn); };
    // biểu tượng các nút trên thanh trên
    for (const [id, ic] of [['btn-undo', 'undo'], ['btn-redo', 'redo'], ['btn-explore', 'explore'], ['btn-present', 'present'], ['btn-projector', 'projector'], ['btn-panel', 'panel']]) {
      const b = document.getElementById(id);
      if (b) b.innerHTML = ICONS[ic];
    }
    // menu thả xuống: bấm để mở, bấm một mục hoặc ra ngoài để đóng
    const menus = [...document.querySelectorAll('#topbar .menu')];
    const closeMenus = () => menus.forEach((m) => m.classList.remove('open'));
    for (const m of menus) {
      m.querySelector('.menu-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        const open = m.classList.contains('open');
        closeMenus();
        if (!open) m.classList.add('open');
      });
      m.querySelector('.menu-pop').addEventListener('click', (e) => { if (e.target.closest('button')) closeMenus(); });
      m.addEventListener('mouseenter', () => { if (menus.some((x) => x.classList.contains('open')) && !m.classList.contains('open')) { closeMenus(); m.classList.add('open'); } });
    }
    document.addEventListener('pointerdown', (e) => {
      if (e.target.closest('#topbar .menu') || !menus.some((m) => m.classList.contains('open'))) return;
      closeMenus();
      if (e.target.closest('#board')) { e.stopPropagation(); e.preventDefault(); }
    }, true);
    on('btn-undo', () => this.undo());
    on('btn-redo', () => this.redo());
    on('menu-undo', () => this.undo());
    on('menu-redo', () => this.redo());
    document.querySelectorAll('[data-theme]').forEach((b) => b.addEventListener('click', () => this.setThemeId(b.dataset.theme)));
    on('btn-panel', () => this.togglePanel());
    on('menu-panel', () => this.togglePanel());
    on('btn-close-panel', () => this.togglePanel(false));
    this.togglePanel(loadPref('panel', '0') === '1', false);
    this.updateMenuChecks();
    on('btn-delete', () => this.deleteSteps([...this.selection]));
    on('btn-hide', () => this.hideSelected());
    on('btn-show-hidden', () => this.showHidden());
    on('btn-grid', () => this.toggleGrid());
    on('btn-aux', () => this.toggleAux());
    on('btn-clear-trace', () => { this.clearTraces(); toast('Đã xoá vết'); });
    on('btn-trim', () => { this.renderer.trimLines = !this.renderer.trimLines; savePref('trim', this.renderer.trimLines ? '1' : '0'); this.updateMenuChecks(); this.refresh(); });
    on('btn-fit', () => this.zoomFit());
    on('btn-present', () => this.setMode(this.mode === 'present' ? 'edit' : 'present'));
    on('btn-projector', () => this.setProjector(!this.projector));
    on('btn-prev', () => this.gotoFrame(this.frameIdx - 1));
    on('btn-next', () => this.gotoFrame(this.frameIdx + 1));
    on('btn-exit-present', () => { if (this.projector) this.setProjector(false); this.setMode('edit'); });
    on('btn-new', () => this.newTab());
    on('btn-unlock-images', () => {
      if (!(this.doc.images || []).some((im) => im.locked)) return toast('Không có ảnh nào đang khoá');
      this.commit((doc) => { for (const im of doc.images) delete im.locked; });
      toast('Đã mở khoá các ảnh – bấm vào ảnh để dời, đổi cỡ');
    });
  }
}

// ---------- tiện ích ----------
function loadPref(key, def) {
  try { return localStorage.getItem('hinh-hoc-dong:' + key) ?? def; } catch { return def; }
}
function savePref(key, v) {
  try { localStorage.setItem('hinh-hoc-dong:' + key, v); } catch { /* bỏ qua */ }
}
const round6 = (v) => Math.round(v * 1e6) / 1e6;
const round9 = (v) => Math.round(v * 1e9) / 1e9;
const round1 = (v) => Math.round(v * 10) / 10;
export const escapeHTML = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function typeName(t) {
  return { point: 'một điểm', line: 'một đường thẳng', circle: 'một đường tròn', curve: 'một đường thẳng/đường tròn', obj: 'một đối tượng', pl: 'một điểm hoặc đường thẳng', '...point': 'một điểm' }[t] || t;
}

/** (u, v) của P theo tam giác abc (P = a + u·ab + v·ac), kẹp vào trong tam giác; P rỗng → trọng tâm. */
function clampUV(a, b, c, P) {
  if (!a || !b || !c || !P) return { u: 1 / 3, v: 1 / 3 };
  const bx = b.x - a.x, by = b.y - a.y, cx = c.x - a.x, cy = c.y - a.y, px = P.x - a.x, py = P.y - a.y;
  const det = bx * cy - by * cx;
  if (Math.abs(det) < 1e-12) return { u: 1 / 3, v: 1 / 3 };
  let u = (px * cy - py * cx) / det, v = (bx * py - by * px) / det;
  u = Math.max(0, u); v = Math.max(0, v);
  if (u + v > 1) { const t = u + v; u /= t; v /= t; }
  return { u: round9(u), v: round9(v) };
}

/** Sắp lại các bước theo thứ tự dựng được (đối số đứng trước), giữ thứ tự cũ nhiều nhất có thể. */
function topoOrder(steps) {
  const done = new Set(), out = [], rest = [...steps];
  while (rest.length) {
    const j = rest.findIndex((s) => s.args.every((a) => done.has(a)));
    if (j < 0) return steps; // không nên xảy ra (đã chặn vòng phụ thuộc)
    const [s] = rest.splice(j, 1);
    done.add(s.id);
    out.push(s);
  }
  return out;
}

function markDistance(v, P, px) {
  if (v.kind === 'angle') return Math.abs(G.dist(v.B, P) - 20 * px);
  if (v.kind === 'segmark') return G.dist(G.mid(v.A, v.B), P);
  if (v.kind === 'polygon') return pointInPolygon(P, v.pts) ? 0 : Infinity;
  if (v.kind === 'locus') {
    let best = Infinity;
    for (let i = 1; i < v.pts.length; i++) {
      const a = v.pts[i - 1], b = v.pts[i];
      if (a && b) best = Math.min(best, G.distToObject({ kind: 'line', sub: 'segment', p: a, d: { x: b.x - a.x, y: b.y - a.y } }, P));
    }
    return best;
  }
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
