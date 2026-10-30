// Thêm các bước dựng từ "đặc tả" do công cụ sinh ra (dùng chung cho giao diện và test).
//
// Đặc tả: [{ type, args, params?, name?, style?, hidden? }]. Trong args, '$k' là id của bước thứ k vừa thêm
// trong cùng lần gọi. Các bước sau bước đầu được gộp chung một khung trình bày (joinPrev).

import { kinds, newId, nextName, evaluate } from './model.js';
import { STEP_TYPES } from './steps.js';
import * as G from './geom.js';

export function addSpecs(doc, specs, { join = true } = {}) {
  const ids = [];
  const k = kinds(doc);
  const used = (n) => doc.steps.some((s) => s.name === n);
  specs.forEach((sp, i) => {
    const def = STEP_TYPES[sp.type];
    if (!def) throw new Error('Loại bước không rõ: ' + sp.type);
    const id = newId(doc);
    const args = sp.args.map((a) => (typeof a === 'string' && a.startsWith('$') ? ids[+a.slice(1)] : a));
    const kind = def.kind === 'same' ? k.get(args[0]) : def.kind;
    const step = { id, type: sp.type, args };
    if (sp.params && Object.keys(sp.params).length) step.params = { ...sp.params };
    if (kind !== 'mark') step.name = sp.name && !used(sp.name) ? sp.name : (sp.prime && kind === 'point' && primeName(doc, args[0])) || nextName(doc, kind, sp.name);
    if (sp.style && Object.keys(sp.style).length) step.style = { ...sp.style };
    if (sp.hidden) step.hidden = true;
    if (i > 0 && join) step.joinPrev = true;
    doc.steps.push(step);
    k.set(id, kind);
    ids.push(id);
  });
  return ids;
}

/**
 * Tên cho ảnh của một điểm qua phép biến hình (bản 1.3): tên tạo ảnh thêm dấu phẩy – A → A′, A′ → A″, I_A → I_A′.
 * Tên đã có thì thêm phẩy nữa (tối đa 3); không được thì trả về null (dùng tên tự động như cũ).
 */
export function primeName(doc, srcId) {
  const base = doc.steps.find((s) => s.id === srcId)?.name;
  if (!base) return null;
  const used = new Set(doc.steps.map((s) => s.name));
  for (let n = base + "'"; n.length <= base.length + 3; n += "'") if (!used.has(n)) return n;
  return null;
}

/**
 * Ngữ cảnh tối thiểu để chạy hàm make của một công cụ ngoài giao diện (test, dòng lệnh).
 * Trên giao diện, App cung cấp cùng các hàm này.
 */
export function toolContext(doc, options = {}) {
  const values = evaluate(doc);
  return {
    doc,
    values,
    name: (id) => doc.steps.find((s) => s.id === id)?.name || '',
    opt: (key, def) => (key in options ? options[key] : def),
    markStyle: () => ({}),
    existingPointAt(P, tol = 0.01) {
      const kk = kinds(doc);
      for (const s of doc.steps) {
        const v = values.get(s.id);
        if (kk.get(s.id) === 'point' && v && G.dist(v, P) < Math.max(1e-9, tol * 1e-3)) return s.id;
      }
      return null;
    },
  };
}

/** Chạy một công cụ (theo định nghĩa trong src/ui/tools.js hoặc src/ui/library.js) trên tài liệu. */
export function runTool(doc, tool, picks, options = {}) {
  const specs = tool.make(picks, toolContext(doc, options));
  return addSpecs(doc, specs);
}
