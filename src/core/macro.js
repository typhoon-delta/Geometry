// CÔNG CỤ TỰ TẠO (giống "Create New Tool" của Sketchpad): ghi lại một đoạn cách dựng thành công cụ dùng lại.
//
// Người dùng chọn các đối tượng KẾT QUẢ, có thể chọn thêm các đối tượng BAN ĐẦU (đầu vào).
//   - Đối tượng được chọn mà phụ thuộc vào một đối tượng khác cũng được chọn → kết quả.
//   - Còn lại → đầu vào. Nếu chỉ chọn kết quả, đầu vào là các "gốc" (điểm tự do, điểm trên đối tượng…)
//     mà kết quả phụ thuộc vào.
// Công cụ lưu dạng JSON thuần (dịch/chia sẻ được), không chứa toạ độ trừ tham số của bước con.

import { kinds, stepById, describe } from './model.js';
import { STEP_TYPES } from './steps.js';

export const USER_MENU = '7. Công cụ của tôi';

/** Tập id tổ tiên (trực tiếp và gián tiếp) của các id cho trước. */
function ancestors(doc, ids) {
  const out = new Set();
  const stack = [...ids];
  while (stack.length) {
    const s = stepById(doc, stack.pop());
    if (!s) continue;
    for (const a of s.args) if (!out.has(a)) { out.add(a); stack.push(a); }
  }
  return out;
}

const isRoot = (s) => !s.args.length || s.type === 'point_on' || s.type === 'point_in';

/**
 * Tạo dữ liệu công cụ từ các đối tượng đang chọn.
 * @returns {{ok:true, tool}} hoặc {{ok:false, error}}
 */
export function createMacro(doc, selectedIds, label) {
  const k = kinds(doc);
  const sel = selectedIds.filter((id) => stepById(doc, id));
  if (!sel.length) return { ok: false, error: 'Hãy chọn các đối tượng kết quả (giữ Shift để chọn nhiều), có thể chọn thêm các đối tượng ban đầu.' };
  const selSet = new Set(sel);
  let results = sel.filter((id) => [...ancestors(doc, [id])].some((a) => selSet.has(a)));
  let givens = sel.filter((id) => !results.includes(id));
  if (!results.length) { results = sel; givens = []; }
  // các bước cần ghi: tổ tiên của kết quả, dừng ở đầu vào
  const givenSet = new Set(givens);
  const need = new Set();
  const stack = [...results];
  while (stack.length) {
    const id = stack.pop();
    if (need.has(id) || givenSet.has(id)) continue;
    const s = stepById(doc, id);
    if (isRoot(s) && !results.includes(id)) { givenSet.add(id); givens.push(id); continue; } // gốc tự do → thành đầu vào
    need.add(id);
    for (const a of s.args) stack.push(a);
  }
  if (results.some((id) => isRoot(stepById(doc, id)) && !stepById(doc, id).args.length))
    return { ok: false, error: 'Kết quả không được là điểm tự do (điểm tự do chỉ có thể là đầu vào).' };
  const order = new Map(doc.steps.map((s, i) => [s.id, i]));
  givens = [...givenSet].sort((a, b) => order.get(a) - order.get(b));
  const body = [...need].sort((a, b) => order.get(a) - order.get(b));
  if (!body.length) return { ok: false, error: 'Không có bước dựng nào giữa đầu vào và kết quả.' };
  const ref = (id) => (givenSet.has(id) ? 'in:' + givens.indexOf(id) : 'st:' + body.indexOf(id));
  const steps = body.map((id) => {
    const s = stepById(doc, id);
    const out = { type: s.type, args: s.args.map(ref) };
    if (s.params) out.params = { ...s.params };
    if (s.style) out.style = { ...s.style };
    if (results.includes(id)) { out.result = true; if (s.name) out.name = s.name; }
    return out;
  });
  const inputs = givens.map((id) => (k.get(id) === 'point' ? 'point' : k.get(id)));
  const hints = givens.map((id, i) => `Chọn ${inputs[i] === 'point' ? 'điểm' : inputs[i] === 'line' ? 'đường thẳng' : 'đường tròn'} ứng với ${describe(doc, id)} (${i + 1}/${givens.length})`);
  return { ok: true, tool: { id: 'user_' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36), label: label || 'Công cụ mới', inputs, hints, steps } };
}

/** Biến dữ liệu công cụ (JSON) thành định nghĩa công cụ dùng được trong giao diện / runTool. */
export function macroTool(data) {
  return {
    id: data.id,
    label: data.label,
    menu: USER_MENU,
    icon: '★',
    user: true,
    inputs: data.inputs,
    hints: data.hints,
    data,
    make(picks) {
      const map = (a) => (a.startsWith('in:') ? picks[+a.slice(3)] : '$' + a.slice(3));
      return data.steps.map((s) => ({
        type: s.type,
        args: s.args.map(map),
        params: s.params,
        style: s.style,
        name: s.result ? s.name : undefined,
        hidden: !s.result,
      }));
    },
  };
}

/** Kiểm tra dữ liệu công cụ khi nhập từ tệp. */
export function validMacro(d) {
  return d && typeof d.id === 'string' && typeof d.label === 'string' && Array.isArray(d.inputs) && Array.isArray(d.steps) &&
    d.steps.every((s) => STEP_TYPES[s.type] && Array.isArray(s.args) && s.args.every((a) => /^(in|st):\d+$/.test(a)));
}
