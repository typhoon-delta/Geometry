// Danh sách công cụ dựng hình. Mỗi công cụ khai báo các đối số cần chọn và cách sinh bước dựng.
//
//   inputs  : kiểu đối tượng cần chọn lần lượt ('point'|'line'|'circle'|'curve'|'obj'|'pl'|'...point')
//   anyOrder: true nếu có thể chọn theo thứ tự bất kỳ (vd đường vuông góc: điểm & đường)
//   hints   : lời nhắc cho từng lần chọn
//   make    : (picks, app) => danh sách bước cần thêm [{type, args, params, name, style}]
//   preview : kiểu xem trước khi đang chọn ('segment'|'line'|'ray'|'circle'|'polygon')

const T = (id, label, group, icon, inputs, hints, make, extra = {}) => ({ id, label, group, icon, inputs, hints, make, ...extra });
const one = (type, params, name) => (picks) => [{ type, args: picks, params, name }];
const TRI = ['Chọn đỉnh thứ nhất', 'Chọn đỉnh thứ hai', 'Chọn đỉnh thứ ba'];
const VTX = ['Chọn đỉnh A (đỉnh đối diện cạnh cần xét)', 'Chọn đỉnh B', 'Chọn đỉnh C'];

export const TOOLS = [
  T('move', 'Chọn / kéo', 'Cơ bản', '↖', [], ['Kéo điểm tự do (đỏ) hoặc điểm trên đối tượng (cam). Kéo nền để dời hình; lăn chuột để phóng to/thu nhỏ. Kéo nhãn để dời nhãn.'], null),
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
  T('circle_3pts', 'Qua 3 điểm', 'Đường tròn', '⊙', ['point', 'point', 'point'], TRI, one('circle_3pts')),
  T('circle_radius', 'Compa (tâm, bán kính AB)', 'Đường tròn', '⌀', ['point', 'point', 'point'], ['Chọn tâm', 'Chọn đầu mút thứ nhất của bán kính', 'Chọn đầu mút thứ hai'], one('circle_radius')),

  T('reflect', 'Đối xứng', 'Biến hình', '⇋', ['obj', 'pl'], ['Chọn đối tượng cần lấy đối xứng (điểm, đường, đường tròn)', 'Chọn tâm đối xứng (điểm) hoặc trục đối xứng (đường thẳng)'], one('reflect')),
  T('projection', 'Hình chiếu', 'Biến hình', '⊾', ['point', 'line'], ['Chọn điểm và đường thẳng (thứ tự bất kỳ)', 'Chọn nốt đối tượng còn lại'], (p) => [{ type: 'projection', args: p }], { anyOrder: true }),

  T('triangle', 'Tam giác', 'Tam giác', '△', ['point', 'point', 'point'], TRI, ([A, B, C]) => [
    { type: 'segment', args: [A, B] }, { type: 'segment', args: [B, C] }, { type: 'segment', args: [C, A] },
  ], { preview: 'polygon' }),
  T('circumcenter', 'Tâm ngoại tiếp O', 'Tam giác', 'O', ['point', 'point', 'point'], TRI, one('circumcenter', undefined, 'O')),
  T('circumcircle', 'Đường tròn ngoại tiếp', 'Tam giác', '(O)', ['point', 'point', 'point'], TRI, one('circumcircle')),
  T('orthocenter', 'Trực tâm H', 'Tam giác', 'H', ['point', 'point', 'point'], TRI, one('orthocenter', undefined, 'H')),
  T('incenter', 'Tâm nội tiếp I', 'Tam giác', 'I', ['point', 'point', 'point'], TRI, one('incenter', undefined, 'I')),
  T('incircle', 'Đường tròn nội tiếp', 'Tam giác', '(I)', ['point', 'point', 'point'], TRI, one('incircle')),
  T('centroid', 'Trọng tâm G', 'Tam giác', 'G', ['point', 'point', 'point'], TRI, one('centroid', undefined, 'G')),
  T('nine_point_center', 'Tâm Euler N', 'Tam giác', 'N', ['point', 'point', 'point'], TRI, one('nine_point_center', undefined, 'N')),
  T('nine_point_circle', 'Đường tròn Euler', 'Tam giác', '(N)', ['point', 'point', 'point'], TRI, one('nine_point_circle')),
  T('altitude_foot', 'Chân đường cao', 'Tam giác', 'h', ['point', 'point', 'point'], VTX, ([A, B, C]) => [
    { type: 'altitude_foot', args: [A, B, C] },
    { type: 'segment', args: [A, '$0'], style: { dash: true } },
  ]),
  T('incircle_touch', 'Tiếp điểm nội tiếp', 'Tam giác', 'T', ['point', 'point', 'point'], VTX, one('incircle_touch')),
  T('arc_mid_no', 'Điểm giữa cung BC không chứa A', 'Tam giác', '⌒', ['point', 'point', 'point'], VTX, one('arc_midpoint', { contains: false })),
  T('arc_mid_yes', 'Điểm giữa cung BC chứa A', 'Tam giác', '⌒A', ['point', 'point', 'point'], VTX, one('arc_midpoint', { contains: true })),

  T('angle_mark', 'Đánh dấu góc', 'Đánh dấu', '∡', ['point', 'point', 'point'], ['Chọn điểm trên cạnh thứ nhất', 'Chọn ĐỈNH góc', 'Chọn điểm trên cạnh thứ hai'], (p, app) => [{ type: 'angle_mark', args: p, style: { ...app.markStyle('angle') } }]),
  T('segment_mark', 'Đánh dấu đoạn', 'Đánh dấu', '⫽', ['point', 'point'], ['Chọn đầu mút thứ nhất (hoặc bấm vào một đoạn thẳng)', 'Chọn đầu mút thứ hai'], (p, app) => [{ type: 'segment_mark', args: p, style: { ...app.markStyle('segment') } }], { segmentShortcut: true }),
  T('polygon', 'Tô miền đa giác', 'Đánh dấu', '▱', ['...point'], ['Chọn lần lượt các đỉnh; bấm lại đỉnh đầu (hoặc Enter) để kết thúc'], (p, app) => [{ type: 'polygon', args: p, style: { ...app.markStyle('polygon') } }], { preview: 'polygon' }),
];

export const TOOL_BY_ID = Object.fromEntries(TOOLS.map((t) => [t.id, t]));
