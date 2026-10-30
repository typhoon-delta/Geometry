// Bộ kiểu hiển thị (theme) và bảng màu.
//
//   'mono'     – Đơn sắc (mặc định): mọi thứ màu đen, nét mảnh ~1px đều nhau, điểm là vòng tròn nhỏ ruột trắng,
//                nhãn serif nghiêng sát điểm – giống bản vẽ Sketchpad / sách chuyên Toán.
//   'textbook' – Sách giáo khoa: màu dịu, điểm tô màu (điểm kéo được tô đỏ/cam), đường tròn đặc biệt có màu.
// Kiểu đặt riêng cho từng đối tượng (step.style) luôn được ưu tiên hơn mặc định của bộ kiểu.

export const THEMES = {
  mono: { id: 'mono', label: 'Đơn sắc', ink: '#000000' },
  textbook: { id: 'textbook', label: 'Sách giáo khoa', ink: '#1f2937' },
};

export const PALETTE = [
  { name: 'Đen', hex: '#111827' },
  { name: 'Xanh dương', hex: '#3b6fb6' },
  { name: 'Đỏ', hex: '#c0504d' },
  { name: 'Xanh lá', hex: '#4e8f5a' },
  { name: 'Cam', hex: '#d9822b' },
  { name: 'Tím', hex: '#7d5ba6' },
  { name: 'Xanh ngọc', hex: '#2f8f9d' },
  { name: 'Xám', hex: '#8a8f98' },
];

const BY_KIND = {
  mono: {
    point: { color: '#000000', fillColor: '#ffffff', size: 3, hollow: true, showLabel: true, labelColor: '#000000' },
    line: { color: '#000000', width: 1, dash: false, showLabel: false },
    circle: { color: '#000000', width: 1, dash: false, fill: 0, showLabel: false },
    mark: { color: '#000000', width: 1 },
  },
  textbook: {
    point: { color: '#1f2937', size: 3.2, showLabel: true, labelColor: '#1f2937' },
    line: { color: '#1f2937', width: 1.4, dash: false, showLabel: false },
    circle: { color: '#1f2937', width: 1.4, dash: false, fill: 0, showLabel: false },
    mark: { color: '#c0504d', width: 1.4 },
  },
};

const BY_TYPE = {
  mono: {
    polygon: { color: '#000000', fill: 0.07 },
    angle_mark: { arcs: 1 },
    segment_mark: { ticks: 1 },
  },
  textbook: {
    free_point: { fillColor: '#c0504d' },
    point_on: { fillColor: '#d9822b' },
    circumcircle: { color: '#3b6fb6' },
    incircle: { color: '#4e8f5a' },
    excircle: { color: '#4e8f5a' },
    nine_point_circle: { color: '#7d5ba6' },
    polygon: { color: '#3b6fb6', fill: 0.12 },
    angle_mark: { color: '#c0504d', arcs: 1 },
    segment_mark: { color: '#c0504d', ticks: 1 },
  },
};

// Đường phụ (bản 1.7): đường dựng thêm để lấy giao điểm, vuông góc… – nét đứt, nhạt hơn đường chính
const AUX = {
  mono: { color: '#4b5563', dash: true },
  textbook: { color: '#8a8f98', dash: true },
};

let current = 'mono';
export const getTheme = () => current;
export function setTheme(id) {
  if (THEMES[id]) current = id;
  return current;
}

/** Kiểu đầy đủ của một bước = mặc định theo loại ⊕ mặc định theo kiểu bước ⊕ style riêng. */
export function styleOf(step, kind, theme = current) {
  const t = BY_KIND[theme] ? theme : 'mono';
  const aux = step.aux && (kind === 'line' || kind === 'circle') ? AUX[t] : null;
  const st = { ...BY_KIND[t][kind || 'mark'], ...(BY_TYPE[t][step.type] || {}), ...(aux || {}), ...(step.style || {}) };
  // điểm đã đổi màu riêng: ruột lấy theo màu đó (bộ đơn sắc vẫn giữ ruột trắng nếu chưa đổi màu)
  if (kind === 'point' && step.style && step.style.color && !step.style.fillColor) {
    st.fillColor = step.style.color;
    st.hollow = false;
  }
  return st;
}

/** Màu "mặc định" của bộ kiểu cho dấu mới (góc, đoạn, miền). */
export function defaultMarkColor(theme = current) {
  return theme === 'mono' ? '#000000' : '#c0504d';
}

/** Đối tượng có được vẽ không: không ẩn, và không phải đường phụ khi đang tắt đường phụ (doc.hideAux). */
export const isShown = (doc, s) => !s.hidden && !(s.aux && doc.hideAux);

export const isDraggableType = (type) => type === 'free_point' || type === 'point_on' || type === 'point_in' || type === 'solve_point';
