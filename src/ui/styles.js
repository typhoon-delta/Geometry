// Kiểu hiển thị mặc định và bảng màu "sách giáo khoa".

export const PALETTE = [
  { name: 'Đen', hex: '#111827' },
  { name: 'Xanh dương', hex: '#1d4ed8' },
  { name: 'Đỏ', hex: '#dc2626' },
  { name: 'Xanh lá', hex: '#15803d' },
  { name: 'Cam', hex: '#ea580c' },
  { name: 'Tím', hex: '#7e22ce' },
  { name: 'Xanh ngọc', hex: '#0e7490' },
  { name: 'Xám', hex: '#6b7280' },
];

const DEFAULT_BY_TYPE = {
  free_point: { color: '#111827', fillColor: '#dc2626' },
  point_on: { color: '#111827', fillColor: '#ea580c' },
  circumcircle: { color: '#1d4ed8' },
  incircle: { color: '#15803d' },
  nine_point_circle: { color: '#7e22ce' },
  polygon: { color: '#1d4ed8', fill: 0.12 },
  angle_mark: { color: '#dc2626', arcs: 1 },
  segment_mark: { color: '#dc2626', ticks: 1 },
};

const DEFAULT_BY_KIND = {
  point: { color: '#111827', size: 3, showLabel: true },
  line: { color: '#111827', width: 1.6, dash: false, showLabel: false },
  circle: { color: '#111827', width: 1.6, dash: false, fill: 0, showLabel: false },
  mark: { color: '#dc2626', width: 1.6 },
};

/** Kiểu đầy đủ của một bước (mặc định ⊕ style riêng). */
export function styleOf(step, kind) {
  return { ...DEFAULT_BY_KIND[kind || 'mark'], ...(DEFAULT_BY_TYPE[step.type] || {}), ...(step.style || {}) };
}

export const isDraggableType = (type) => type === 'free_point' || type === 'point_on';
