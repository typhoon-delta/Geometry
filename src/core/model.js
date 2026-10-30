// Mô hình dữ liệu: một hình = một DANH SÁCH BƯỚC DỰNG có thứ tự (xem docs/DINH_DANG_JSON.md).
// Module này thuần JS: tính toạ độ từ danh sách bước, quan hệ phụ thuộc, đặt tên, kiểm tra hợp lệ.

import { STEP_TYPES, argAccepts } from './steps.js';
import * as G from './geom.js';

export const FORMAT = 'hinh-hoc-dong';
export const VERSION = 1;

export function emptyDoc() {
  return { format: FORMAT, version: VERSION, title: '', steps: [] };
}

export const stepById = (doc, id) => doc.steps.find((s) => s.id === id);

export function indexOf(doc) {
  const m = new Map();
  doc.steps.forEach((s, i) => m.set(s.id, i));
  return m;
}

/** Loại đối tượng của từng bước ('point'|'line'|'circle'|'mark'). */
export function kinds(doc) {
  const k = new Map();
  for (const s of doc.steps) {
    const def = STEP_TYPES[s.type];
    if (!def) { k.set(s.id, null); continue; }
    k.set(s.id, def.kind === 'same' ? k.get(s.args[0]) || null : def.kind);
  }
  return k;
}

export const paramsOf = (step) => ({ ...(STEP_TYPES[step.type]?.params || {}), ...(step.params || {}) });

/**
 * Tính giá trị mọi đối tượng. overrides: Map id → params thay thế (dùng khi lấy mẫu ngẫu nhiên).
 * Trả về Map id → giá trị (null nếu không xác định).
 */
export function evaluate(doc, overrides = null) {
  const vals = new Map();
  for (const s of doc.steps) vals.set(s.id, computeStep(s, vals, overrides, doc));
  return vals;
}

/** Tính giá trị một bước từ giá trị các bước trước (vals). doc: cần cho các bước "dời thử" (điểm cố định, quỹ tích). */
export function computeStep(s, vals, overrides = null, doc = null) {
  const def = STEP_TYPES[s.type];
  if (!def) return null;
  const variadic = def.args[0] === '...point';
  const argVals = new Array(s.args.length);
  for (let i = 0; i < s.args.length; i++) {
    const a = vals.get(s.args[i]);
    if (!a || !argAccepts(variadic ? '...point' : def.args[i], a.kind)) return null;
    argVals[i] = a;
  }
  const p = overrides && overrides.has(s.id) ? { ...paramsOf(s), ...overrides.get(s.id) } : paramsOf(s);
  let v;
  try {
    v = def.sampler ? (doc ? SAMPLERS[s.type](s, argVals, p, vals, doc, overrides) : null) : def.compute(argVals, p) || null;
  } catch {
    v = null;
  }
  if (v && def.kind !== 'mark' && !valueFinite(v)) v = null;
  return v;
}

/**
 * Bộ cập nhật từng phần: khi chỉ các bước trong `changedIds` đổi tham số (vd điểm đang kéo),
 * chỉ cần tính lại chúng và các bước phụ thuộc. Trả về hàm update(vals) sửa trực tiếp Map giá trị
 * (theo đúng thứ tự dựng). Dùng khi kéo: lập kế hoạch một lần lúc nhấn chuột, gọi mỗi khung hình.
 */
export function makeUpdater(doc, changedIds, { track = false } = {}) {
  const need = dependents(doc, changedIds);
  for (const id of changedIds) need.add(id);
  const plan = doc.steps.filter((s) => need.has(s.id));
  const update = (vals) => {
    for (const s of plan) {
      if (track && TRACKED[s.type]) trackRoot(s, vals);
      vals.set(s.id, computeStep(s, vals, null, doc));
    }
    return vals;
  };
  update.size = plan.length;
  return update;
}

// Bám nghiệm khi kéo (bản 1.8): giao điểm / tiếp điểm có hai nghiệm chọn theo thứ tự chuẩn (which = 0/1); thứ tự này
// có thể đảo khi hình đổi (vd hướng đường thẳng lật lại) làm điểm nhảy sang nghiệm kia. Khi kéo, nếu nghiệm đang chọn
// ở xa vị trí cũ còn nghiệm kia ở sát vị trí cũ thì đổi which (ghi vào hình) – điểm đi liên tục như mắt thấy.
const TRACKED = {
  intersection: (s, vals) => G.intersect(vals.get(s.args[0]), vals.get(s.args[1])),
  tangent_point: (s, vals) => G.tangentPoints(vals.get(s.args[0]), vals.get(s.args[1])),
};

function trackRoot(s, vals) {
  const prev = vals.get(s.id);
  if (!prev) return;
  const roots = TRACKED[s.type](s, vals);
  if (!roots || roots.length !== 2) return;
  const w = paramsOf(s).which || 0;
  const dCur = G.dist(roots[w], prev), dAlt = G.dist(roots[1 - w], prev);
  if (dCur > 3 * dAlt && dCur > 1e-9) s.params = { ...(s.params || {}), which: 1 - w };
}

// ======================= DỜI THỬ (bản 1.7): điểm cố định, quỹ tích =======================
// Các bước này dời thử một điểm thay đổi M rồi tính lại phần hình phụ thuộc vào M. Mọi con số (vị trí dời thử,
// số mẫu, sai số) cố định để lõi Python (lab/core/model.py) tính ra đúng như vậy.
const FIX_OFFS = [[0.31, 0.12], [-0.22, 0.27], [0.17, -0.33], [-0.36, -0.08], [0.05, 0.41], [0.26, -0.14]];
const FIX_UV = [[0.2, 0.2], [0.55, 0.2], [0.2, 0.55], [0.33, 0.33], [0.12, 0.62], [0.6, 0.3]];
const FIX_DT = [0.37, -0.29, 0.61, -0.53, 0.19, -0.71];
const FIX_SEG = [0.15, 0.32, 0.5, 0.68, 0.85, 0.25];

/** Giá trị các bước khi điểm moverId nhận tham số params (chỉ tính lại các bước phụ thuộc, dừng trước bước upto). */
function movedValues(doc, vals, moverId, params, upto, overrides) {
  const local = new Map(vals);
  const ov = new Map(overrides || []);
  ov.set(moverId, params);
  const changed = new Set([moverId]);
  for (const s of doc.steps) {
    if (s.id === upto) break;
    if (s.id === moverId || s.args.some((a) => changed.has(a))) {
      local.set(s.id, computeStep(s, local, ov, doc));
      changed.add(s.id);
    }
  }
  return local;
}

/** Các bộ tham số dời thử của điểm thay đổi M (điểm tự do, điểm trên đối tượng, điểm trong tam giác). */
function trialParams(step, vals, doc, upto) {
  const p = paramsOf(step);
  if (step.type === 'free_point') {
    // độ lớn dời thử: 15% khoảng cách trung bình từ M tới các điểm dựng TRƯỚC bước đang tính (không phụ thuộc đơn
    // vị của hình; chỉ lấy các bước trước để lúc kéo và lúc tính lại toàn bộ cho cùng kết quả)
    let sum = 0, n = 0;
    for (const t of doc.steps) {
      if (t.id === upto) break;
      const v = vals.get(t.id);
      if (t.id !== step.id && v && v.kind === 'point') { sum += Math.hypot(v.x - p.x, v.y - p.y); n++; }
    }
    const sc = 0.15 * (n ? sum / n : 1) || 0.15;
    return FIX_OFFS.map(([dx, dy]) => ({ x: p.x + dx * sc, y: p.y + dy * sc }));
  }
  if (step.type === 'point_in') return FIX_UV.map(([u, v]) => ({ u, v }));
  if (step.type === 'point_on') {
    const host = vals.get(step.args[0]);
    if (!host) return [];
    if (host.kind === 'line' && host.sub === 'segment') return FIX_SEG.map((t) => ({ t }));
    if (host.kind === 'line' && host.sub === 'ray') return FIX_DT.map((d) => ({ t: Math.max(0, p.t) * Math.exp(d) + 0.05 }));
    return FIX_DT.map((d) => ({ t: p.t + d }));
  }
  return [];
}

const distTo = (P, X) => (X.kind === 'line' ? G.distPointLine(P, X) : Math.abs(G.dist(P, X.c) - X.r));

const SAMPLERS = {
  /** Điểm cố định của họ X (đường thẳng/đường tròn) khi M thay đổi. */
  fixed_point(s, [X], p, vals, doc, overrides) {
    const mover = doc.steps.find((t) => t.id === s.args[1]);
    if (!mover) return null;
    const objs = [X];
    for (const tp of trialParams(mover, vals, doc, s.id)) {
      const v = movedValues(doc, vals, mover.id, tp, s.id, overrides).get(s.args[0]);
      if (v && v.kind === X.kind) objs.push(v);
    }
    if (objs.length < 4) return null;
    // ứng viên: giao của hai vị trí khác nhau rõ rệt
    const size = X.kind === 'circle' ? X.r : 1;
    const cand = X.kind === 'line' ? [G.intersectLL(objs[1], objs[2])].filter(Boolean) : G.intersectCC(objs[1], objs[2]);
    const tol = 1e-6 * (1 + size + Math.max(0, ...cand.map((c) => Math.hypot(c.x, c.y))));
    const good = cand.filter((c) => objs.every((o) => distTo(c, o) <= tol)).sort((a, b) => a.x - b.x || a.y - b.y);
    const r = good[p.which || 0];
    return r ? G.pt(r.x, r.y) : null;
  },
  /** Quỹ tích của X khi D chạy trên đường của nó: đường gấp khúc n điểm (null ở chỗ không xác định). */
  locus(s, _args, p, vals, doc, overrides) {
    const D = doc.steps.find((t) => t.id === s.args[1]);
    if (!D || D.type !== 'point_on') return null;
    const host = vals.get(D.args[0]);
    if (!host) return null;
    const n = Math.max(8, Math.min(600, p.n | 0 || 160));
    const t0 = paramsOf(D).t;
    let a, b;
    if (host.kind === 'circle') [a, b] = [0, 2 * Math.PI];
    else if (host.sub === 'segment') [a, b] = [0, 1];
    else if (host.sub === 'ray') [a, b] = [0, Math.max(4, 3 * Math.abs(t0))];
    else [a, b] = [t0 - 3, t0 + 3];
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const t = a + ((b - a) * i) / n;
      const v = movedValues(doc, vals, D.id, { t }, s.id, overrides).get(s.args[0]);
      pts.push(v && v.kind === 'point' ? { x: v.x, y: v.y } : null);
    }
    return { kind: 'locus', pts, closed: host.kind === 'circle' };
  },
};

function valueFinite(v) {
  if (v.kind === 'point') return Number.isFinite(v.x) && Number.isFinite(v.y);
  if (v.kind === 'line') return [v.p.x, v.p.y, v.d.x, v.d.y].every(Number.isFinite);
  if (v.kind === 'circle') return [v.c.x, v.c.y, v.r].every(Number.isFinite);
  return true;
}

/** Tập id các bước phụ thuộc (trực tiếp hoặc gián tiếp) vào các id cho trước, không gồm chính chúng. */
export function dependents(doc, ids) {
  const set = new Set(ids);
  const out = new Set();
  for (const s of doc.steps) {
    if (s.args.some((a) => set.has(a) || out.has(a))) out.add(s.id);
  }
  return out;
}

/** Xoá các bước kèm mọi bước phụ thuộc. Trả về doc mới và danh sách id đã xoá. */
export function removeSteps(doc, ids) {
  const dep = dependents(doc, ids);
  const all = new Set([...ids, ...dep]);
  return { doc: { ...doc, steps: doc.steps.filter((s) => !all.has(s.id)) }, removed: [...all] };
}

export function newId(doc) {
  let max = 0;
  for (const s of doc.steps) {
    const m = /^s(\d+)$/.exec(s.id);
    if (m) max = Math.max(max, +m[1]);
  }
  return 's' + (max + 1);
}

const POINT_LETTERS = 'ABCDEFKLMPQRSTUVXYZJW'.split('');

/** Đặt tên tự động không trùng. preferred: tên mong muốn (vd 'O' cho tâm ngoại tiếp). */
export function nextName(doc, kind, preferred) {
  const used = new Set(doc.steps.map((s) => s.name).filter(Boolean));
  const tryName = (n) => (!used.has(n) ? n : null);
  if (preferred) {
    if (tryName(preferred)) return preferred;
    for (let i = 1; ; i++) if (tryName(preferred + i)) return preferred + i;
  }
  if (kind === 'point') {
    for (const L of POINT_LETTERS) if (tryName(L)) return L;
    for (let i = 1; ; i++) for (const L of POINT_LETTERS) if (tryName(L + i)) return L + i;
  }
  const base = kind === 'line' ? 'd' : kind === 'circle' ? 'ω' : 'm';
  for (let i = 1; ; i++) if (tryName(base + i)) return base + i;
}

/** Kiểm tra hợp lệ (dùng khi mở file/URL). Trả về danh sách lỗi (rỗng nếu hợp lệ). */
export function validate(doc) {
  const errs = [];
  if (!doc || typeof doc !== 'object') return ['Không phải đối tượng JSON'];
  if (doc.format !== FORMAT) errs.push(`Thiếu "format": "${FORMAT}"`);
  if (!Array.isArray(doc.steps)) return [...errs, 'Thiếu danh sách "steps"'];
  // bản 1.4: khung chữ (tuỳ chọn) – đề bài, lời giải, ghi chú
  if (doc.boxes !== undefined) {
    if (!Array.isArray(doc.boxes)) errs.push('"boxes" phải là danh sách');
    else doc.boxes.forEach((b, i) => { if (!b || typeof b.id !== 'string' || typeof (b.text ?? '') !== 'string') errs.push(`Khung chữ ${i + 1}: thiếu id hoặc nội dung`); });
  }
  // bản 1.3: ảnh dán vào hình (tuỳ chọn) – chỉ là trang trí, không tham gia tính toán
  if (doc.images !== undefined) {
    if (!Array.isArray(doc.images)) errs.push('"images" phải là danh sách');
    else doc.images.forEach((im, i) => {
      if (!im || typeof im.id !== 'string' || ![im.x, im.y, im.w, im.h].every(Number.isFinite) || !(im.w > 0) || !(im.h > 0)) errs.push(`Ảnh ${i + 1}: thiếu id hoặc vị trí/kích thước`);
    });
  }
  const seen = new Set();
  const k = new Map();
  for (const [i, s] of doc.steps.entries()) {
    const where = `Bước ${i + 1} (${s && s.id})`;
    if (!s || typeof s.id !== 'string') { errs.push(`${where}: thiếu id`); continue; }
    if (seen.has(s.id)) errs.push(`${where}: id trùng`);
    const def = STEP_TYPES[s.type];
    if (!def) { errs.push(`${where}: loại bước không rõ "${s.type}"`); seen.add(s.id); continue; }
    if (!Array.isArray(s.args)) { errs.push(`${where}: thiếu args`); seen.add(s.id); continue; }
    const variadic = def.args[0] === '...point';
    if (variadic ? s.args.length < 3 : s.args.length !== def.args.length)
      errs.push(`${where}: số đối số sai`);
    s.args.forEach((a, j) => {
      if (!seen.has(a)) errs.push(`${where}: tham chiếu "${a}" chưa được dựng ở bước trước`);
      else {
        const t = variadic ? '...point' : def.args[j];
        if (t && !argAccepts(t, k.get(a))) errs.push(`${where}: đối số "${a}" sai loại`);
      }
    });
    k.set(s.id, def.kind === 'same' ? k.get(s.args[0]) : def.kind);
    seen.add(s.id);
  }
  return errs;
}

/** Bản sao sâu (dùng cho hoàn tác). */
export const clone = (doc) => JSON.parse(JSON.stringify(doc));

/**
 * Chia các bước thành KHUNG trình bày: bước ẩn không tạo khung riêng; bước có joinPrev = true
 * gộp vào khung của bước hiển thị trước nó. Trả về mảng khung, mỗi khung là mảng id.
 */
export function frames(doc) {
  const out = [];
  let pendingHidden = [];
  for (const s of doc.steps) {
    if (s.hidden) { pendingHidden.push(s.id); continue; }
    if (s.joinPrev && out.length) out[out.length - 1].push(...pendingHidden, s.id);
    else out.push([...pendingHidden, s.id]);
    pendingHidden = [];
  }
  if (pendingHidden.length) {
    if (out.length) out[out.length - 1].push(...pendingHidden);
    else out.push(pendingHidden);
  }
  return out;
}

/** Tên hiển thị của đối tượng, tạo từ cách dựng khi phù hợp (vd đường thẳng "AB", đường tròn "(ABC)"). */
export function describe(doc, id) {
  const s = stepById(doc, id);
  if (!s) return id;
  const n = (a) => stepById(doc, a)?.name || a;
  const names = s.args.map(n).join('');
  switch (s.type) {
    case 'line': case 'segment': case 'ray': return names;
    case 'perpendicular': return `${s.name} (⊥ ${describe(doc, s.args[1])} qua ${n(s.args[0])})`;
    case 'parallel': return `${s.name} (∥ ${describe(doc, s.args[1])} qua ${n(s.args[0])})`;
    case 'perp_bisector': return `${s.name} (trung trực ${names})`;
    case 'angle_bisector': return `${s.name} (phân giác ${s.params?.external ? 'ngoài ' : ''}góc ${names})`;
    case 'circle_radius': return `(${n(s.args[0])}, ${n(s.args[1])}${n(s.args[2])})`;
    case 'circle_3pts': case 'circumcircle': return `(${names})`;
    case 'circle': return `(${n(s.args[0])}, ${n(s.args[0])}${n(s.args[1])})`;
    case 'incircle': return `đường tròn nội tiếp ${names}`;
    case 'nine_point_circle': return `đường tròn Euler ${names}`;
    default: return s.name || id;
  }
}
