// Biểu tượng SVG tự vẽ cho thanh công cụ dọc (24×24, nét theo currentColor).

const svg = (body) => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
const dot = (x, y, r = 2.2) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff"/>`;

export const ICONS = {
  move: svg('<path d="M6 3l12 9-5.5 1 3.2 6.2-2.2 1.1-3.2-6.2L6 18z" fill="currentColor" stroke-width="1"/>'),
  point: svg(dot(12, 12, 3.2)),
  circle: svg('<circle cx="12" cy="12" r="8"/>' + dot(12, 12, 1.6) + dot(20, 12, 1.6)),
  line: svg('<path d="M4 19L20 5"/>' + dot(7, 16.4, 1.8) + dot(17, 7.6, 1.8)),
  construct: svg('<path d="M3 18h18M12 18V4"/><path d="M12 15h3v3"/>' + dot(12, 6, 1.8)),
  triangle: svg('<path d="M12 4L3.5 19h17z"/>' + dot(12, 4, 1.8) + dot(3.5, 19, 1.8) + dot(20.5, 19, 1.8)),
  mark: svg('<path d="M4 19h16M4 19L16 6"/><path d="M10 19a6 6 0 0 0-1.8-4.3"/><path d="M8 11.5l2 2M10 9.5l2 2"/>'),
  tools: svg('<path d="M5 4l8 8-8 8z" fill="currentColor" stroke-width="1"/><circle cx="18" cy="7" r="1.4" fill="currentColor"/><circle cx="18" cy="12" r="1.4" fill="currentColor"/><circle cx="18" cy="17" r="1.4" fill="currentColor"/>'),
  undo: svg('<path d="M9 7H4V2"/><path d="M4 7a9 9 0 1 1-1 7"/>'),
  redo: svg('<path d="M15 7h5V2"/><path d="M20 7a9 9 0 1 0 1 7"/>'),
  panel: svg('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M14 4v16"/>'),
  explore: svg('<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5.5 5.5"/>'),
  present: svg('<path d="M7 5l12 7-12 7z"/>'),
  projector: svg('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'),
};
