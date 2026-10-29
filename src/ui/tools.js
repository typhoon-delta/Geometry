// Danh sách công cụ dựng hình. Mỗi công cụ khai báo các đối số cần chọn và cách sinh bước dựng.
//
//   inputs  : kiểu đối tượng cần chọn lần lượt ('point'|'line'|'circle'|'curve'|'obj'|'pl'|'...point')
//   anyOrder: true nếu có thể chọn theo thứ tự bất kỳ (vd đường vuông góc: điểm & đường)
//   hints   : lời nhắc cho từng lần chọn
//   make    : (picks, app) => danh sách bước cần thêm [{type, args, params, name, style}]
//   preview : kiểu xem trước khi đang chọn ('segment'|'line'|'ray'|'circle'|'polygon')

import { STEP_TYPES } from '../core/steps.js';
import { LIBRARY, MENUS } from './library.js';

const T = (id, label, group, icon, inputs, hints, make, extra = {}) => ({ id, label, group, icon, inputs, hints, make, ...extra });
const one = (type, params, name) => (picks) => [{ type, args: picks, params, name }];
/** Đường tròn kèm tâm (tâm là một điểm dựng được, dùng tiếp được). */
// Nếu tâm đã có sẵn (vd đã dựng O trước khi vẽ đường tròn ngoại tiếp) thì không dựng thêm điểm trùng.
// Tâm tự đặt tên O (O₁, O₂… nếu O đã có) – không chiếm các chữ A, B, C, D, K, L… mà đề bài thường dùng.
const withCenter = (type, params, centerName = 'O') => (picks, app) => {
  const out = [{ type, args: picks, params }];
  let c = null;
  try { c = STEP_TYPES[type].compute(picks.map((id) => app.values.get(id)), { ...(STEP_TYPES[type].params || {}), ...(params || {}) }); } catch { c = null; }
  if (!c || !app.existingPointAt(c.c, 0.01)) out.push({ type: 'center', args: ['$0'], name: centerName });
  return out;
};
const TRI = ['Chọn đỉnh thứ nhất', 'Chọn đỉnh thứ hai', 'Chọn đỉnh thứ ba'];
const VTX = ['Chọn đỉnh A (đỉnh đối diện cạnh cần xét)', 'Chọn đỉnh B', 'Chọn đỉnh C'];

export const TOOLS = [
  T('move', 'Chọn / kéo', 'Cơ bản', '↖', [], ['Kéo điểm hoặc nhãn; bấm để chọn đối tượng; kéo nền để dời hình, lăn chuột để phóng to/thu nhỏ'], null),
  T('point', 'Điểm', 'Cơ bản', '•', ['point'], ['Bấm vào chỗ trống: điểm tự do · bấm lên đường/đường tròn: điểm trên đối tượng · bấm gần chỗ cắt nhau: giao điểm'], () => []),
  T('intersect', 'Giao điểm', 'Cơ bản', '✕', ['curve', 'curve'], ['Chọn đường thứ nhất (hoặc bấm ngay chỗ hai đường cắt nhau)', 'Chọn đường thứ hai'], null),
  T('midpoint', 'Trung điểm', 'Cơ bản', '◦', ['point', 'point'], ['Chọn điểm thứ nhất (hoặc bấm vào một đoạn thẳng)', 'Chọn điểm thứ hai'], one('midpoint'), { segmentShortcut: true }),

  T('segment', 'Đoạn thẳng', 'Đường', '—', ['point', 'point'], ['Chọn điểm đầu', 'Chọn điểm cuối'], one('segment'), { preview: 'segment' }),
  T('line', 'Đường thẳng', 'Đường', '⟷', ['point', 'point'], ['Chọn điểm thứ nhất', 'Chọn điểm thứ hai'], one('line'), { preview: 'line' }),
  T('ray', 'Tia', 'Đường', '→', ['point', 'point'], ['Chọn gốc tia', 'Chọn điểm thuộc tia'], one('ray'), { preview: 'ray' }),
  T('perpendicular', 'Đường vuông góc', 'Đường', '⊥', ['point', 'line'], ['Chọn điểm và đường thẳng (thứ tự bất kỳ)', 'Chọn nốt đối tượng còn lại'], one('perpendicular'), { anyOrder: true }),
  T('parallel', 'Đường song song', 'Đường', '∥', ['point', 'line'], ['Chọn điểm và đường thẳng (thứ tự bất kỳ)', 'Chọn nốt đối tượng còn lại'], one('parallel'), { anyOrder: true }),
  T('perp_bisector', 'Trung trực', 'Đường', '⊥̲', ['point', 'point'], ['Chọn điểm thứ nhất (hoặc bấm vào một đoạn thẳng)', 'Chọn điểm thứ hai'], one('perp_bisector'), { segmentShortcut: true }),
  T('angle_bisector', 'Phân giác trong', 'Đường', '∠', ['point', 'point', 'point'], ['Chọn điểm trên cạnh thứ nhất', 'Chọn ĐỈNH góc', 'Chọn điểm trên cạnh thứ hai'], one('angle_bisector')),
  T('ext_bisector', 'Phân giác ngoài', 'Đường', '∠ₑ', ['point', 'point', 'point'], ['Chọn điểm trên cạnh thứ nhất', 'Chọn ĐỈNH góc', 'Chọn điểm trên cạnh thứ hai'], one('angle_bisector', { external: true })),

  T('circle', 'Tâm + điểm', 'Đường tròn', '◯', ['point', 'point'], ['Chọn tâm', 'Chọn một điểm trên đường tròn'], one('circle'), { preview: 'circle' }),
  T('circle_3pts', 'Qua 3 điểm', 'Đường tròn', '⊙', ['point', 'point', 'point'], TRI, withCenter('circle_3pts')),
  T('circle_radius', 'Compa (tâm, bán kính AB)', 'Đường tròn', '⌀', ['point', 'point', 'point'], ['Chọn tâm', 'Chọn đầu mút thứ nhất của bán kính', 'Chọn đầu mút thứ hai'], one('circle_radius')),

  T('reflect', 'Đối xứng', 'Biến hình', '⇋', ['obj', 'pl'], ['Chọn đối tượng cần lấy đối xứng (điểm, đường, đường tròn)', 'Chọn tâm đối xứng (điểm) hoặc trục đối xứng (đường thẳng)'], one('reflect')),
  T('projection', 'Hình chiếu', 'Biến hình', '⊾', ['point', 'line'], ['Chọn điểm và đường thẳng (thứ tự bất kỳ)', 'Chọn nốt đối tượng còn lại'], (p) => [{ type: 'projection', args: p }], { anyOrder: true }),

  T('angle_mark', 'Đánh dấu góc', 'Đánh dấu', '∡', ['point', 'point', 'point'], ['Chọn điểm trên cạnh thứ nhất', 'Chọn ĐỈNH góc', 'Chọn điểm trên cạnh thứ hai'], (p, app) => [{ type: 'angle_mark', args: p, style: { ...app.markStyle('angle') } }]),
  T('segment_mark', 'Đánh dấu đoạn', 'Đánh dấu', '⫽', ['point', 'point'], ['Chọn đầu mút thứ nhất (hoặc bấm vào một đoạn thẳng)', 'Chọn đầu mút thứ hai'], (p, app) => [{ type: 'segment_mark', args: p, style: { ...app.markStyle('segment') } }], { segmentShortcut: true }),
  T('polygon', 'Tô miền đa giác', 'Đánh dấu', '▱', ['...point'], ['Chọn lần lượt các đỉnh; bấm lại đỉnh đầu (hoặc Enter) để kết thúc'], (p, app) => [{ type: 'polygon', args: p, style: { ...app.markStyle('polygon') } }], { preview: 'polygon' }),
];

// Công cụ cơ bản + thư viện "Công cụ" (library.js). Công cụ trùng id dùng chung một định nghĩa.
export const TOOL_BY_ID = Object.fromEntries([...TOOLS, ...LIBRARY].map((t) => [t.id, t]));

/**
 * Thanh công cụ dọc: mỗi nhóm là một biểu tượng; bấm vào là dùng công cụ đang chọn của nhóm, đồng thời mở
 * danh sách các công cụ trong nhóm (nếu có nhiều hơn một) để đổi.
 */
export const TOOLBAR = [
  { id: 'move', label: 'Chọn / kéo', icon: 'move', tools: ['move'] },
  { id: 'point', label: 'Điểm', icon: 'point', tools: ['point', 'intersect', 'midpoint'] },
  { id: 'circle', label: 'Đường tròn', icon: 'circle', tools: ['circle', 'circle_3pts', 'circle_radius'] },
  { id: 'line', label: 'Đoạn, tia, đường thẳng', icon: 'line', tools: ['segment', 'ray', 'line'] },
  { id: 'construct', label: 'Dựng', icon: 'construct', tools: ['perpendicular', 'parallel', 'perp_bisector', 'angle_bisector', 'ext_bisector', 'projection', 'reflect'] },
  { id: 'mark', label: 'Đánh dấu', icon: 'mark', tools: ['angle_mark', 'segment_mark', 'polygon'] },
  { id: 'library', label: 'Công cụ', icon: 'tools', tools: LIBRARY.map((t) => t.id), submenus: MENUS },
];
