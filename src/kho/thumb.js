// Ảnh thu nhỏ của một hình (cho danh sách bài trong kho): vẽ hình ở một bảng vẽ ẩn ngoài màn hình bằng chính bộ vẽ
// của chương trình, thu phóng vừa hình, xuất JPEG nền trắng.
import { CanvasView } from '../ui/view.js';
import { Renderer } from '../ui/render.js';
import { evaluate } from '../core/model.js';

export function renderThumb(doc, { theme = 'mono', trimLines = true, images = null, w = 360, h = 240 } = {}) {
  if (!doc || !doc.steps || !doc.steps.length) return null;
  const host = document.createElement('div');
  host.style.cssText = `position:fixed;left:-20000px;top:0;width:${w}px;height:${h}px;pointer-events:none`;
  document.body.appendChild(host);
  try {
    const view = new CanvasView(host);
    const r = new Renderer(view);
    r.trimLines = trimLines;
    const values = evaluate(doc);
    // khung vừa hình (như "Thu phóng vừa hình")
    const pts = [];
    for (const s of doc.steps) {
      if (s.hidden) continue;
      const v = values.get(s.id);
      if (!v) continue;
      if (v.kind === 'point') pts.push(v);
      if (v.kind === 'circle') pts.push({ x: v.c.x - v.r, y: v.c.y - v.r }, { x: v.c.x + v.r, y: v.c.y + v.r });
    }
    if (!pts.length) return null;
    const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
    let [x1, x2, y1, y2] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const m = Math.max(x2 - x1, y2 - y1, 1) * 0.08;
    [x1, x2, y1, y2] = [x1 - m, x2 + m, y1 - m, y2 + m];
    const per = Math.max((x2 - x1) / w, (y2 - y1) / h);
    const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2;
    view.setBoundingBox([cx - (per * w) / 2, cy + (per * h) / 2, cx + (per * w) / 2, cy - (per * h) / 2]);
    r.setScene(doc, values, { theme, images });
    view.drawNow();
    const out = document.createElement('canvas');
    out.width = w;
    out.height = h;
    const ctx = out.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(view.canvas, 0, 0, w, h);
    return out.toDataURL('image/jpeg', 0.82);
  } catch {
    return null;
  } finally {
    host.remove();
  }
}
