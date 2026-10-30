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
  T('move', 'Chọn / kéo', 'Cơ bản', '↖', [], ['Kéo điểm hoặc nhãn (giữ Shift khi kéo: đoạn nối với điểm nằm ngang/thẳng đứng/bước 15°); bấm để chọn đối tượng; kéo nền để dời hình, lăn chuột để phóng to/thu nhỏ'], null),
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

  T('reflect', 'Đối xứng', 'Biến hình', '⇋', ['obj', 'pl'], ['Chọn đối tượng cần lấy đối xứng (điểm, đường, đường tròn)', 'Chọn tâm đối xứng (điểm) hoặc trục đối xứng (đường thẳng)'], (p) => [{ type: 'reflect', args: p, prime: true }]),
  T('projection', 'Hình chiếu', 'Biến hình', '⊾', ['point', 'line'], ['Chọn điểm và đường thẳng (thứ tự bất kỳ)', 'Chọn nốt đối tượng còn lại'], (p) => [{ type: 'projection', args: p }], { anyOrder: true }),

  // ---- bản 1.7 ----
  T('angle_point', 'Điểm trên đường tạo góc bằng góc cho trước', 'Đường', '∠=', ['point', 'point', 'point', 'point', 'point', 'line'],
    ['Góc mẫu: chọn điểm trên cạnh thứ nhất', 'Góc mẫu: chọn ĐỈNH', 'Góc mẫu: chọn điểm trên cạnh thứ hai', 'Chọn đỉnh O của góc cần dựng',
      'Chọn điểm X trên cạnh có sẵn (tia OX)', 'Chọn đường chứa điểm cần dựng – bấm GẦN chỗ điểm cần lấy (để chọn phía)'],
    ([A, B, C, O, X, l], app) => {
      // hai phía của tia OX cho hai điểm: lấy điểm gần chỗ vừa bấm
      const v = [O, X, A, B, C, l].map((id) => app.values.get(id));
      const cand = [false, true].map((flip) => ({ flip, P: STEP_TYPES.angle_point.compute(v, { flip }) }));
      const m = app.mouse;
      const ok = cand.filter((c) => c.P).sort((a, b) => Math.hypot(a.P.x - m.x, a.P.y - m.y) - Math.hypot(b.P.x - m.x, b.P.y - m.y));
      return [{ type: 'angle_point', args: [O, X, A, B, C, l], params: { flip: ok.length ? ok[0].flip : false } }];
    }, { allowRepeat: true }),
  T('angle_line', 'Đường tạo góc bằng góc cho trước', 'Đường', '∠/', ['point', 'point', 'point', 'point', 'point'],
    ['Góc mẫu: chọn điểm trên cạnh thứ nhất', 'Góc mẫu: chọn ĐỈNH', 'Góc mẫu: chọn điểm trên cạnh thứ hai', 'Chọn đỉnh O của góc cần dựng', 'Chọn điểm X trên cạnh có sẵn (tia OX)'],
    ([A, B, C, O, X], app) => [{ type: 'angle_line', args: [O, X, A, B, C], params: { flip: app.extraFlip(O, X, A, B, C) } }],
    { allowRepeat: true, extraClick: 'Rê chuột sang phía muốn dựng rồi bấm', extraPreview: 'angle_line' }),
  T('point_in', 'Điểm trong tam giác', 'Cơ bản', '◬', ['point', 'point', 'point'],
    ['Chọn đỉnh thứ nhất của tam giác', 'Chọn đỉnh thứ hai', 'Chọn đỉnh thứ ba'],
    (p, app) => [{ type: 'point_in', args: p, params: app.uvInTriangle(p, app.extraPos) }],
    { extraClick: 'Bấm vào trong tam giác để đặt điểm (khi kéo, điểm luôn ở trong tam giác)' }),
  T('fixed_point', 'Điểm cố định', 'Quỹ tích', '⊛', ['curve', 'point'],
    ['Chọn đường thẳng/đường tròn thay đổi và điểm thay đổi (điểm tự do, trên đường hoặc trong tam giác) – thứ tự bất kỳ', 'Chọn nốt đối tượng còn lại'],
    (p) => [{ type: 'fixed_point', args: p, params: { which: 0 }, name: 'X' }, { type: 'fixed_point', args: p, params: { which: 1 }, name: 'Y' }],
    { anyOrder: true, after: 'fixedPoint' }),
  T('locus', 'Quỹ tích', 'Quỹ tích', '∿', ['point', 'point'],
    ['Chọn điểm cần vẽ quỹ tích (vd trung điểm N)', 'Chọn điểm chạy (điểm nằm trên một đường, dựng bằng công cụ Điểm bấm lên đường)'],
    (p) => [{ type: 'locus', args: p }], { after: 'locus' }),
  T('measure_len', 'Đo độ dài', 'Đo', '|↔|', ['point', 'point'], ['Chọn điểm thứ nhất (hoặc bấm vào một đoạn thẳng)', 'Chọn điểm thứ hai'], one('measure_len'), { segmentShortcut: true }),
  T('measure_angle', 'Đo góc', 'Đo', '∠°', ['point', 'point', 'point'], ['Chọn điểm trên cạnh thứ nhất', 'Chọn ĐỈNH góc', 'Chọn điểm trên cạnh thứ hai'], one('measure_angle')),
  T('measure_ratio', 'Đo tỉ số AB/CD', 'Đo', 'a/b', ['point', 'point', 'point', 'point'], ['Chọn A', 'Chọn B', 'Chọn C', 'Chọn D (tỉ số AB/CD)'], one('measure_ratio'), { allowRepeat: true }),

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
  { id: 'point', label: 'Điểm', icon: 'point', tools: ['point', 'intersect', 'midpoint', 'point_in'] },
  { id: 'circle', label: 'Đường tròn', icon: 'circle', tools: ['circle', 'circle_3pts', 'circle_radius'] },
  { id: 'line', label: 'Đoạn, tia, đường thẳng', icon: 'line', tools: ['segment', 'ray', 'line'] },
  { id: 'construct', label: 'Dựng', icon: 'construct', tools: ['perpendicular', 'parallel', 'perp_bisector', 'angle_bisector', 'ext_bisector', 'projection', 'reflect', 'angle_point', 'angle_line'] },
  { id: 'mark', label: 'Đánh dấu, đo', icon: 'mark', tools: ['angle_mark', 'segment_mark', 'polygon', 'measure_len', 'measure_angle', 'measure_ratio'] },
  { id: 'locus', label: 'Quỹ tích, điểm cố định', icon: 'locus', tools: ['locus', 'fixed_point'] },
  { id: 'library', label: 'Công cụ', icon: 'tools', tools: LIBRARY.map((t) => t.id), submenus: MENUS },
];
